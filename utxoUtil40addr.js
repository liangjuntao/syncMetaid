const MVC = require('mvc-lib');
const bip39 = require('bip39');
const { BIP32Factory } = require('bip32');
const ecc = require('tiny-secp256k1');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const config = require('./config.js');

// ====== 配置区 ======
const MNEMONIC = config.mnemonic; // 助记词从config.js读取
const DERIVE_PATH = `m/44'/10001'/0'/0/0`; // 衍生路径，可修改
const SPLIT_AMOUNT = 10100000; // 拆分UTXO面额，可修改
// ====================

const bip32 = BIP32Factory(ecc);
const API_BASE = 'https://mvcapi.cyber3.space';
const BROADCAST_API = 'https://mvcapi.cyber3.space/tx/broadcast';
const FEE_PER_BYTE = 10;
const DUST_LIMIT = 546;

async function getKeyPair(mnemonic, derivePath) {
  const seed = await bip39.mnemonicToSeed(mnemonic);
  const root = bip32.fromSeed(seed);
  const child = root.derivePath(derivePath);
  const wif = child.toWIF();
  const key = new MVC.PrivateKey(wif, MVC.Networks.mainnet);
  const address = key.toAddress().toString();
  return { key, address };
}

async function getUtxos(address) {
  const url = `${API_BASE}/address/${address}/utxo`;
  console.log(`[getUtxos] 查询地址: ${address}`);
  const res = await axios.get(url);
  const utxos = res.data;
  function addressToScriptHex(address) {
    const addr = new MVC.Address(address);
    return MVC.Script.buildPublicKeyHashOut(addr).toHex();
  }
  const filtered = Array.isArray(utxos) ? utxos
    .filter(u => Number(u.satoshis) > DUST_LIMIT && u.address === address)
    .map(u => ({
      txId: u.txid,
      outputIndex: u.outIndex,
      address: u.address,
      script: addressToScriptHex(u.address),
      satoshis: Number(u.satoshis)
    })) : [];
  console.log(`[getUtxos] 可用UTXO数量: ${filtered.length}`);
  return filtered;
}

async function splitUtxos(mnemonic, derivePath, splitAmount) {
  const { key, address } = await getKeyPair(mnemonic, derivePath);
  const utxos = await getUtxos(address);
  if (utxos.length === 0) {
    console.log(`[splitUtxo] 地址${address}无可用UTXO`);
    return;
  }
  if (utxos.length > 500) {
    console.log(`[splitUtxo] 地址${address}有${utxos.length}个UTXO，大于500个，跳过`);
    return;
  }
  const total = utxos.reduce((sum, u) => sum + u.satoshis, 0);
  let maxOutputs = Math.floor(total / splitAmount);
  let outputsTotal, change, txSize, fee;
  let finalOutputs = 0;
  while (maxOutputs > 0) {
    outputsTotal = maxOutputs * splitAmount;
    change = total - outputsTotal;
    let tx = new MVC.Transaction().from(utxos);
    for (let j = 0; j < maxOutputs; j++) {
      tx.to(address, splitAmount);
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
    return;
  }
  outputsTotal = finalOutputs * splitAmount;
  change = total - outputsTotal - fee;
  if (change < DUST_LIMIT) change = 0;
  const tx = new MVC.Transaction().from(utxos);
  for (let j = 0; j < finalOutputs; j++) {
    tx.to(address, splitAmount);
  }
  if (change > 0) {
    tx.change(address).feePerKb(FEE_PER_BYTE * 1024).sign(key);
  } else {
    tx.feePerKb(FEE_PER_BYTE * 1024).sign(key);
  }
  const rawTx = tx.serialize();
  try {
    const res = await axios.post(BROADCAST_API, { hex: rawTx });
    console.log(`[splitUtxo] 地址${address} 拆分广播结果:`, res.data);
    // 生成json文件，记录本次拆分产生的utxo详情
    const txid = res.data.txid || res.data.data?.txid;
    const utxoMap = {};
    tx.outputs.forEach((output, idx) => {
      const outAddr = output.script.toAddress(MVC.Networks.mainnet)?.toString();
      if (outAddr === address && output.satoshis === splitAmount) {
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
    // 写入 data/utxocache 目录
    const dir = path.join(__dirname, 'data', 'utxocache');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const fileName = `split_utxos_${address}.json`;
    fs.writeFileSync(path.join(dir, fileName), JSON.stringify(utxoJson, null, 2), 'utf-8');
  } catch (e) {
    console.error(`[splitUtxo] 地址${address} 拆分广播失败:`, e.message);
  }
}

// 直接运行
if (require.main === module) {
  splitUtxos(MNEMONIC, DERIVE_PATH, SPLIT_AMOUNT);
}

module.exports = { splitUtxos }; 