import MVC from 'mvc-lib';
import bip39 from 'bip39';
import { BIP32Factory } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import axios from 'axios';

const bip32 = BIP32Factory(ecc);
const FEE_PER_BYTE = 10;
const FEE_PER_KB = FEE_PER_BYTE * 1024;
const API_BASE = 'https://mvcapi.cyber3.space';
const BROADCAST_API = 'https://mvcapi.cyber3.space/tx/broadcast';
const AMOUNT_PER_ADDR = 1700000000; // 每个目标地址分配的聪数
const ALL_ADDRESS_COUNT = 0;

export class MvcBatchTransfer {
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
    console.log(`[getUtxos] 获取地址: ${address} 的UTXO`);
    const url = `${API_BASE}/address/${address}/utxo`;
    const res = await axios.get(url);
    const utxos = res.data;
    function addressToScriptHex(address) {
      const addr = new MVC.Address(address);
      return MVC.Script.buildPublicKeyHashOut(addr).toHex();
    }
    return Array.isArray(utxos) ? utxos
      .filter(u => Number(u.satoshis) > 546)
      .map(u => ({
        txId: u.txid,
        outputIndex: u.outIndex,
        address: u.address,
        script: addressToScriptHex(u.address),
        satoshis: Number(u.satoshis)
      })) : [];
  }

  async batchTransfer() {
    // 1. 恢复主地址
    const mainPath = `m/44'/236'/0'/0/0`;
    const { key, address } = await this.getKeyPair(mainPath);
    console.log(`[batchTransfer] 主地址: ${address}`);

    // 2. 派生目标地址
    const targets = [];
    for (let i = 0; i <= ALL_ADDRESS_COUNT; i++) {
      const path = `m/44'/236'/0'/0/${i}`;
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
    return res.data;
  }
}

// 用法示例：
const mnemonic = ' '; 
const util = new MvcBatchTransfer(mnemonic);
util.batchTransfer().then(console.log).catch(console.error); 