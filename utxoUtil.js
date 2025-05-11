const MVC = require('mvc-lib');
const bip39 = require('bip39');
const { BIP32Factory } = require('bip32');
const ecc = require('tiny-secp256k1');
const axios = require('axios');
const { errorLog, randomSleerp } = require('./util.js');
const {
  MVC_STARTING_BLOCK_HEIGHT,
  MVC_RPC_HOST,
  MVC_RPC_USER,
  MVC_RPC_PASSWORD,
  MVC_ZMQPUBRAWTX,
  MVC_BROADCAST_TYPE
} = require('./config.js');
const config = require('./config.js');

const bip32 = BIP32Factory(ecc);
const API_BASE = 'https://mvcapi.cyber3.space';
const BROADCAST_API = 'https://mvcapi.cyber3.space/tx/broadcast';
const FEE_PER_BYTE = 3 ;
const FEE_PER_KB = FEE_PER_BYTE * 1024;
const ALL_ADDRESS_COUNT = 10;

// 单个UTXO拆分金额常量
const UTXO_SPLIT_AMOUNT = 400;

const BROADCAST_TYPE_API = 'api';
const BROADCAST_TYPE_RPC = 'rpc';

class UtxoUtil {
  constructor(mnemonic, options = {}) {
    this.mnemonic = mnemonic;
    this.broadcastType = options.broadcastType || BROADCAST_TYPE_API;
    this.rpcUrl = options.rpcUrl;
    this.rpcUser = options.rpcUser;
    this.rpcPass = options.rpcPass;
  }

  async getKeyPair(path) {
    const seed = await bip39.mnemonicToSeed(this.mnemonic);
    const root = bip32.fromSeed(seed);
    const child = root.derivePath(path);
    const wif = child.toWIF();
    const key = new MVC.PrivateKey(wif, MVC.Networks.mainnet);
    const address = key.toAddress().toString();
    console.log(`[getKeyPair] path: ${path}, address: ${address}`);
    return { key, address };
  }

  async getAddresses() {
    const addresses = [];
    for (let i = 1; i <= ALL_ADDRESS_COUNT; i++) {
      const path = `m/44'/10001'/0'/0/${i}`;
      const { address } = await this.getKeyPair(path);
      addresses.push(address);
    }
    console.log(`[getAddresses] 派生地址:`, addresses);
    return addresses;
  }

  async getUtxos(address) {
    const url = `${API_BASE}/address/${address}/utxo`;
    console.log(`[getUtxos] 查询地址: ${address}`);
    const res = await axios.get(url);
    const utxos = res.data;
    function addressToScriptHex(address) {
      const addr = new MVC.Address(address);
      return MVC.Script.buildPublicKeyHashOut(addr).toHex();
    }
    const filtered = Array.isArray(utxos) ? utxos
      .filter(u => Number(u.satoshis) > 600 && u.address === address)
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

  async broadcastTx(rawTx) {
    if (this.broadcastType === BROADCAST_TYPE_API) {
      const res = await axios.post(BROADCAST_API, { hex: rawTx });
      return res.data;
    } else if (this.broadcastType === BROADCAST_TYPE_RPC) {
      const res = await axios.post(
        this.rpcUrl,
        {
          method: 'sendrawtransaction',
          params: [rawTx],
          id: 1,
          jsonrpc: '2.0'
        },
        {
          auth: {
            username: this.rpcUser,
            password: this.rpcPass
          }
        }
      );
      return res.data;
    } else {
      throw new Error('不支持的广播方式');
    }
  }

  async splitAllAddressesUtxosToFiveBatch() {
    const addresses = await this.getAddresses();
    for (let i = 1; i <= ALL_ADDRESS_COUNT; i++) {
      const addr = addresses[i - 1];
      const { key } = await this.getKeyPair(`m/44'/10001'/0'/0/${i}`);
      const utxos = await this.getUtxos(addr);
      if (utxos.length === 0) {
        console.log(`[splitAllAddressesUtxosToFiveBatch] 地址${addr}无可用UTXO`);
        continue;
      }
      if(utxos.length > 500){
        console.log(`[splitAllAddressesUtxosToFiveBatch] 地址${addr}有${utxos.length}个UTXO，大于500个，跳过`);
        continue;
      }
      const total = utxos.reduce((sum, u) => sum + u.satoshis, 0);
      // 动态估算手续费，按交易体积和费率
      let maxOutputs = Math.floor(total / UTXO_SPLIT_AMOUNT);
      let outputsTotal, change, txSize, fee;
      let finalOutputs = 0;
      const DUST_LIMIT = 546;
      while (maxOutputs > 0) {
        outputsTotal = maxOutputs * UTXO_SPLIT_AMOUNT;
        change = total - outputsTotal;
        // 构造未签名交易估算体积
        let tx = new MVC.Transaction().from(utxos);
        for (let j = 0; j < maxOutputs; j++) {
          tx.to(addr, UTXO_SPLIT_AMOUNT);
        }
        if (change > 0) tx.to(addr, change);
        // 估算体积
        if (typeof tx._estimateSize === 'function') {
          txSize = tx._estimateSize();
        } else {
          // 粗略估算：输入数*148+输出数*34+10
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
        console.log(`[splitAllAddressesUtxosToFiveBatch] 地址${addr} 余额不足以拆分`);
        continue;
      }
      outputsTotal = finalOutputs * UTXO_SPLIT_AMOUNT;
      change = total - outputsTotal - fee;
      if (change < DUST_LIMIT) change = 0;
      // 正式构造交易
      const tx = new MVC.Transaction().from(utxos);
      for (let j = 0; j < finalOutputs; j++) {
        tx.to(addr, UTXO_SPLIT_AMOUNT);
      }
      if (change > 0) {
        tx.change(addr).sign(key); // 自动找零和手续费
      } else {
        tx.sign(key); // 没有找零，手续费为剩余全部
      }
      const rawTx = tx.serialize();
      console.log(`[splitAllAddressesUtxosToFiveBatch] rawTx:`, rawTx);
      try {
        console.log(`[splitAllAddressesUtxosToFiveBatch] 广播地址${addr}的拆分交易...`);
        const res = await this.broadcastTx(rawTx);
        console.log(`[splitAllAddressesUtxosToFiveBatch] 广播结果:`, res);
      } catch (e) {
        console.error(`[splitAllAddressesUtxosToFiveBatch] 广播失败:`, e.message);
      }
      //await randomSleerp(10000);
    }
  }
}

// 用法示例：
const util = new UtxoUtil(config.mnemonic, {
  broadcastType: MVC_BROADCAST_TYPE,
  rpcUrl: MVC_RPC_HOST,
  rpcUser: MVC_RPC_USER,
  rpcPass: MVC_RPC_PASSWORD
});
// 或
// const util = new UtxoUtil(mnemonic, { broadcastType: BROADCAST_TYPE_API });
await util.splitAllAddressesUtxosToFiveBatch();

module.exports = { UtxoUtil }; 