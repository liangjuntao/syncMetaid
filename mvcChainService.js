import MVC from 'mvc-lib';
import bip39 from 'bip39';
import { BIP32Factory } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import axios from 'axios';

const { Script, Address } = MVC;
const API_BASE = 'https://mvcapi.cyber3.space';
const FEE_PER_BYTE = 2;
const FEE_PER_KB = FEE_PER_BYTE * 1024;
const BROADCAST_API = 'https://mvcapi.cyber3.space/tx/broadcast';
const TX_DETAIL_API = 'https://mvcapi.cyber3.space/tx';
const bip32 = BIP32Factory(ecc);

// 日志工具类，自动带时间戳
class Log {
  static info(...args) {
    const now = new Date().toISOString();
    console.log(`[${now}]`, ...args);
  }
}

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
  // 访问api前随机休眠30~60秒，防风控
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const randomMs = 10000 + Math.floor(Math.random() * 10000); // 30~60秒
  Log.info(`[getUtxos] 休眠${randomMs / 1000}秒...`);
  await sleep(randomMs);
  const url = `${API_BASE}/address/${address}/utxo`;
  const res = await axios.get(url);
  const utxos = res.data;
  function addressToScriptHex(address) {
    const addr = new Address(address);
    return Script.buildPublicKeyHashOut(addr).toHex();
  }
  return Array.isArray(utxos) ? utxos
    .filter(u => Number(u.satoshis) > 546)
    .map(u => ({
      txId: u.txid,
      outputIndex: u.outIndex,
      address: u.address,
      script: u.scriptPubKey || addressToScriptHex(u.address),
      satoshis: Number(u.satoshis)
    })) : [];
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

export async function getOpReturnVout(txid) {
  // 查询链上交易详情，返回OP_RETURN的vout编号
  const url = `${TX_DETAIL_API}/${txid}`;
  const res = await axios.get(url);
  const outputs = res.data?.vout || res.data?.outputs || [];
  for (let i = 0; i < outputs.length; i++) {
    const out = outputs[i];
    // 兼容不同区块浏览器返回结构
    const script = out.scriptPubKey?.asm || out.scriptPubKey || out.script || '';
    if (script.includes('OP_RETURN')) {
      return i;
    }
  }
  throw new Error('未找到OP_RETURN输出');
}

export async function createAndSendTx({mnemonic, path, opType, protocolPath, payload}) {
  // 广播前随机休眠30~60秒，防风控
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const randomMs = 10000 + Math.floor(Math.random() * 10000); // 30~60秒
  Log.info(`[createAndSendTx] 休眠${randomMs / 1000}秒...`);
  await sleep(randomMs);
  
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