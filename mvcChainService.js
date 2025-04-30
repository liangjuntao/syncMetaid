/**
 * MVC链服务
 * 提供底层的区块链交互功能，包括：
 * 1. 通过助记词和路径生成密钥对
 * 2. 获取地址的UTXO信息
 * 3. 构建MetaID协议的脚本
 * 4. 创建和发送交易到链上
 * 
 * 这是最底层的链上操作封装，被 ChainOperator 调用
 */

import MVC from 'mvc-lib';
import bip39 from 'bip39';
import { BIP32Factory } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import axios from 'axios';
import { errorLog, randomSleerp } from './util.js';

const { Script, Address } = MVC;
const API_BASE = 'https://mvcapi.cyber3.space';
const FEE_PER_BYTE = 2;
const FEE_PER_KB = FEE_PER_BYTE * 1024;
const BROADCAST_API = 'https://mvcapi.cyber3.space/tx/broadcast';
const bip32 = BIP32Factory(ecc);

export async function getKeyPairFromMnemonicAndPath(mnemonic, path) {
  const seed = await bip39.mnemonicToSeed(mnemonic);
  const root = bip32.fromSeed(seed);
  const child = root.derivePath(path);
  const wif = child.toWIF();
  const key = new MVC.PrivateKey(wif, MVC.Networks.mainnet);
  const address = key.toAddress().toString();
  return { key, address };
}

export async function getUtxos(address) {
  const url = `${API_BASE}/address/${address}/utxo`;
  const res = await axios.get(url);
  const utxos = res.data;
  function addressToScriptHex(address) {
    const addr = new Address(address);
    return Script.buildPublicKeyHashOut(addr).toHex();
  }
  const filteredUtxos = Array.isArray(utxos) ? utxos
    .filter(u => Number(u.satoshis) > 546)
    .map(u => ({
      txId: u.txid,
      outputIndex: u.outIndex,
      address: u.address,
      script: u.scriptPubKey || addressToScriptHex(u.address),
      satoshis: Number(u.satoshis)
    })) : [];
  return filteredUtxos;
}

export function buildMetaidScript(opType, protocolPath, payload) {
  const script = new Script();
  const metaidBuf = Buffer.from('metaid');
  script.add('OP_FALSE');
  script.add('OP_RETURN');
  script.add(metaidBuf);
  script.add(Buffer.from(opType)); // "create" | "comment" | "like"
  script.add(Buffer.from(protocolPath)); // 由调用方传入
  script.add(Buffer.from([0])); // 加密类型 0
  script.add(Buffer.from('1.0.0')); // 版本 1.0.0
  script.add(Buffer.from('text/plain;utf-8'));
  script.add(Buffer.from(JSON.stringify(payload)));
  return script;
}

export async function createAndSendTx({mnemonic, path, opType, protocolPath, payload}) {
  const { key, address } = await getKeyPairFromMnemonicAndPath(mnemonic, path);
  const utxos = await getUtxos(address);
  if (!utxos || utxos.length === 0) {
    throw new Error('没有可用UTXO，请先充值');
  }
  const utxo = utxos[0];
  const tx = new MVC.Transaction()
    .from([{
      txId: utxo.txId,
      outputIndex: utxo.outputIndex,
      address: address,
      script: utxo.script,
      satoshis: utxo.satoshis
    }])
    // 先添加P2PKH 1聪输出（第0个输出）
    .addOutput(new MVC.Transaction.Output({
      script: MVC.Script.buildPublicKeyHashOut(address),
      satoshis: 546
    }))
    // 再添加OP_RETURN输出（第1个输出）
    .addOutput(new MVC.Transaction.Output({
      script: buildMetaidScript(opType, protocolPath, payload),
      satoshis: 0
    }))
    .change(address)
    .feePerKb(FEE_PER_KB);
  tx.sign(key);
  const rawTx = tx.serialize();
  const res = await axios.post(BROADCAST_API, { hex: rawTx });
  return res.data;
} 