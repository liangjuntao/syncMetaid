import MVC from 'mvc-lib';
import bip39 from 'bip39';
import { BIP32Factory } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import axios from 'axios';

const bip32 = BIP32Factory(ecc);
const API_BASE = 'https://mvcapi.cyber3.space';
const BROADCAST_API = 'https://mvcapi.cyber3.space/tx/broadcast';
const FEE_PER_BYTE = 10;
const FEE_PER_KB = FEE_PER_BYTE * 1024;

export class UtxoUtil {
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
    console.log(`[getKeyPair] path: ${path}, address: ${address}`);
    return { key, address };
  }

  async getAddresses() {
    // 派生 m/44'/10001'/0'/0/2-9 共8个地址
    const addresses = [];
    for (let i = 2; i <= 9; i++) {
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

  // 优化：手动预留较多矿工费，找零金额小于600聪则全部给矿工，保证输入=输出+fee
  async splitAllAddressesUtxosToFiveBatch() {
    const addresses = await this.getAddresses();
    for (let i = 2; i <= 9; i++) {
      const addr = addresses[i - 2];
      const { key } = await this.getKeyPair(`m/44'/10001'/0'/0/${i}`);
      const utxos = await this.getUtxos(addr);
      if (utxos.length === 0) {
        console.log(`[splitAllAddressesUtxosToFiveBatch] 地址${addr}无可用UTXO`);
        continue;
      }
      const total = utxos.reduce((sum, u) => sum + u.satoshis, 0);
      if (total < 3005) {
        console.log(`[splitAllAddressesUtxosToFiveBatch] 地址${addr} UTXO总额不足以拆分5份`);
        continue;
      }
      // 预留较多矿工费
      let fee = 2000; // 初始fee
      const perAmount = Math.floor((total - fee) / 5);
      const outputsTotal = perAmount * 5;
      let change = total - outputsTotal - fee;
      if (change < 600) {
        // 找零太小，全部给矿工，fee自动补足
        fee = total - outputsTotal;
        change = 0;
      }
      const tx = new MVC.Transaction().from(utxos);
      for (let j = 0; j < 5; j++) {
        tx.to(addr, perAmount);
      }
      if (change > 0) {
        tx.to(addr, change);
      }
      tx.fee(fee).sign(key);
      const rawTx = tx.serialize();
      try {
        console.log(`[splitAllAddressesUtxosToFiveBatch] 广播地址${addr}的拆分交易...`);
        const res = await axios.post(BROADCAST_API, { hex: rawTx });
        console.log(`[splitAllAddressesUtxosToFiveBatch] 广播结果:`, res.data);
      } catch (e) {
        console.error(`[splitAllAddressesUtxosToFiveBatch] 广播失败:`, e.message);
      }
    }
  }

  async splitUtxoToFive(address, key) {
    console.log(`[splitUtxoToFive] 开始拆分，地址: ${address}`);
    // 获取可用utxo
    const utxos = await this.getUtxos(address);
    if (!utxos.length) throw new Error('无可用UTXO');
    // 选取第一个utxo
    const utxo = utxos[0];
    console.log(`[splitUtxoToFive] 选中UTXO:`, utxo);
    if (utxo.satoshis < 3005) throw new Error('UTXO余额不足以拆分5份（每份>600聪）');
    // 计算每份金额
    const perAmount = Math.floor(utxo.satoshis / 5);
    console.log(`[splitUtxoToFive] 每份金额: ${perAmount}`);
    // 构建交易
    const tx = new MVC.Transaction().from([utxo]);
    for (let i = 0; i < 5; i++) {
      tx.to(address, perAmount);
    }
    tx.change(address)
      .feePerKb(FEE_PER_KB)
      .sign(key);
    // 广播
    const rawTx = tx.serialize();
    console.log(`[splitUtxoToFive] 广播交易...`);
    const res = await axios.post(BROADCAST_API, { hex: rawTx });
    console.log(`[splitUtxoToFive] 广播结果:`, res.data);
    return res.data;
  }
}

// 用法示例：
const mnemonic = '...';
const util = new UtxoUtil(mnemonic);
await util.splitAllAddressesUtxosToFiveBatch(); 