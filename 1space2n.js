const MVC = require('mvc-lib');
const bip39 = require('bip39');
const { BIP32Factory } = require('bip32');
const ecc = require('tiny-secp256k1');
const axios = require('axios');
const config = require('./config.js');
const fs = require('fs');
const path = require('path');

const bip32 = BIP32Factory(ecc);
const FEE_PER_BYTE = 3;
const FEE_PER_KB = FEE_PER_BYTE * 1024;
const API_BASE = 'https://mvcapi.cyber3.space';
const BROADCAST_API = 'https://mvcapi.cyber3.space/tx/broadcast';
const AMOUNT_PER_ADDR = 2000; // 每个目标地址分配的聪数，可根据实际需求调整
const ALL_ADDRESS_COUNT = 10;
const UTXO_SPLIT_AMOUNT = 400;
const DUST_LIMIT = 546;

class Space2N {
  constructor(mnemonic) {
    this.mnemonic = mnemonic;
  }

  async getKeyPair(path) {
    const seed = await bip39.mnemonicToSeed(this.mnemonic);
    const root = bip32.fromSeed(seed);
    const child = root.derivePath(path);
    const wif = child.toWIF();
    const key = new MVC.PrivateKey(wif, MVC.Networks.mainnet);
    const address = key.toAddress().toString();
    return { key, address };
  }

  async getUtxos(address) {
    const url = `${API_BASE}/address/${address}/utxo`;
    const res = await axios.get(url);
    const utxos = res.data;
    function addressToScriptHex(address) {
      const addr = new MVC.Address(address);
      return MVC.Script.buildPublicKeyHashOut(addr).toHex();
    }
    return Array.isArray(utxos) ? utxos
      .filter(u => Number(u.satoshis) > DUST_LIMIT)
      .map(u => ({
        txId: u.txid,
        outputIndex: u.outIndex,
        address: u.address,
        script: addressToScriptHex(u.address),
        satoshis: Number(u.satoshis)
      })) : [];
  }

  async batchTransferFrom0ToN() {
    // 1. 派生主地址
    const mainPath = `m/44'/10001'/0'/0/0`;
    const { key, address } = await this.getKeyPair(mainPath);
    console.log(`[batchTransfer] 主地址: ${address}`);

    // 2. 派生目标地址
    const targets = [];
    for (let i = 1; i <= ALL_ADDRESS_COUNT; i++) {
      const path = `m/44'/10001'/0'/0/${i}`;
      const { address: toAddr } = await this.getKeyPair(path);
      targets.push(toAddr);
    }

    // 3. 获取主地址UTXO
    const utxos = await this.getUtxos(address);
    if (!utxos.length) throw new Error('主地址无可用UTXO');

    // 4. 构建批量转账交易（多个输出）
    const tx = new MVC.Transaction().from(utxos);
    for (const toAddr of targets) {
      tx.to(toAddr, AMOUNT_PER_ADDR);
    }
    tx.change(address)
      .feePerKb(FEE_PER_KB)
      .sign(key);

    // 5. 广播交易
    const rawTx = tx.serialize();
    const res = await axios.post(BROADCAST_API, { hex: rawTx });
    console.log('[batchTransfer] 广播结果:', res.data);

    // 6. 解析交易输出，返回每个目标地址的UTXO信息
    const txid = res.data.txid || res.data.data?.txid;
    const outputs = tx.outputs.map((output, idx) => {
      const address = output.script.toAddress(MVC.Networks.mainnet)?.toString();
      return {
        txId: txid,
        outputIndex: idx,
        address,
        script: output.script.toHex(),
        satoshis: output.satoshis
      };
    });
    // 只保留目标地址的输出
    const targetUtxos = outputs.filter(o => targets.includes(o.address));
    return targetUtxos;
  }

  async splitAllAddressesUtxosToBatch(utxoList) {
    // utxoList: [{txId, outputIndex, address, script, satoshis}]
    // 按地址分组
    const utxosByAddr = {};
    if (Array.isArray(utxoList)) {
      for (const utxo of utxoList) {
        if (!utxosByAddr[utxo.address]) utxosByAddr[utxo.address] = [];
        utxosByAddr[utxo.address].push(utxo);
      }
    }
    for (let i = 1; i <= ALL_ADDRESS_COUNT; i++) {
      const pathStr = `m/44'/10001'/0'/0/${i}`;
      const { key, address } = await this.getKeyPair(pathStr);
      let utxos = utxosByAddr[address] || [];
      // 如果没有传入utxoList，则走网络查询
      if (utxos.length === 0) {
        utxos = await this.getUtxos(address);
      }
      if (utxos.length === 0) {
        console.log(`[splitUtxo] 地址${address}无可用UTXO`);
        continue;
      }
      if (utxos.length > 500) {
        console.log(`[splitUtxo] 地址${address}有${utxos.length}个UTXO，大于500个，跳过`);
        continue;
      }
      const total = utxos.reduce((sum, u) => sum + u.satoshis, 0);
      let maxOutputs = Math.floor(total / UTXO_SPLIT_AMOUNT);
      let outputsTotal, change, txSize, fee;
      let finalOutputs = 0;
      while (maxOutputs > 0) {
        outputsTotal = maxOutputs * UTXO_SPLIT_AMOUNT;
        change = total - outputsTotal;
        let tx = new MVC.Transaction().from(utxos);
        for (let j = 0; j < maxOutputs; j++) {
          tx.to(address, UTXO_SPLIT_AMOUNT);
        }
        if (change > 0) tx.to(address, change);
        if (typeof tx._estimateSize === 'function') {
          txSize = tx._estimateSize();
        } else {
          txSize = utxos.length * 148 + (maxOutputs + (change > 0 ? 1 : 0)) * 34 + 10;
        }
        fee = Math.ceil(txSize * FEE_PER_BYTE);
        if (change >= fee) {
          finalOutputs = maxOutputs;
          break;
        }
        maxOutputs--;
      }
      if (finalOutputs === 0) {
        console.log(`[splitUtxo] 地址${address} 余额不足以拆分`);
        continue;
      }
      outputsTotal = finalOutputs * UTXO_SPLIT_AMOUNT;
      change = total - outputsTotal - fee;
      if (change < DUST_LIMIT) change = 0;
      const tx = new MVC.Transaction().from(utxos);
      for (let j = 0; j < finalOutputs; j++) {
        tx.to(address, UTXO_SPLIT_AMOUNT);
      }
      if (change > 0) {
        tx.change(address).sign(key);
      } else {
        tx.sign(key);
      }
      const rawTx = tx.serialize();
      try {
        const res = await axios.post(BROADCAST_API, { hex: rawTx });
        console.log(`[splitUtxo] 地址${address} 拆分广播结果:`, res.data);
        // 1. 先拿到txid
        const txid = res.data.txid || res.data.data?.txid;
        // 2. 分组
        const utxoMap = {};
        tx.outputs.forEach((output, idx) => {
          const outAddr = output.script.toAddress(MVC.Networks.mainnet)?.toString();
          if (outAddr === address && output.satoshis === UTXO_SPLIT_AMOUNT) {
            if (!utxoMap[txid]) {
              utxoMap[txid] = {
                txid: txid,
                amount: output.satoshis,
                script: output.script.toHex(),
                utxos: []
              };
            }
            utxoMap[txid].utxos.push({
              index: idx,
              used: false
            });
          }
        });
        const utxoJson = Object.values(utxoMap);
        // 3. 写入文件
        const dir = path.join(__dirname, 'data', 'utxocache');
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        const fileName = `${address}.json`;
        fs.writeFileSync(path.join(dir, fileName), JSON.stringify(utxoJson, null, 2), 'utf-8');
      } catch (e) {
        console.error(`[splitUtxo] 地址${address} 拆分广播失败:`, e.message);
      }
    }
  }
}

// 用法示例：
(async () => {
  const util = new Space2N(config.mnemonic);
  try {
    const utxos = await util.batchTransferFrom0ToN();
    await util.splitAllAddressesUtxosToBatch(utxos);
  } catch (e) {
    console.error('执行失败:', e.message);
  }
})();

module.exports = { Space2N }; 