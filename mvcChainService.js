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

const MVC = require('mvc-lib');
const bip39 = require('bip39');
const { BIP32Factory } = require('bip32');
const ecc = require('tiny-secp256k1');
const axios = require('axios');
const { errorLog, randomSleerp } = require('./util.js');
const {
  MVC_RPC_HOST,
  MVC_RPC_USER,
  MVC_RPC_PASSWORD,
  MVC_BROADCAST_TYPE
} = require('./config.js');

const { Script, Address } = MVC;
const API_BASE = 'https://mvcapi.cyber3.space';
const FEE_PER_BYTE = 2;
const FEE_PER_KB = FEE_PER_BYTE * 1024;
const BROADCAST_API = 'https://mvcapi.cyber3.space/tx/broadcast';
const bip32 = BIP32Factory(ecc);

const BROADCAST_TYPE_API = 'api';
const BROADCAST_TYPE_RPC = 'rpc';

async function getKeyPairFromMnemonicAndPath(mnemonic, path) {
  const seed = await bip39.mnemonicToSeed(mnemonic);
  const root = bip32.fromSeed(seed);
  const child = root.derivePath(path);
  const wif = child.toWIF();
  const key = new MVC.PrivateKey(wif, MVC.Networks.mainnet);
  const address = key.toAddress().toString();
  return { key, address };
}

async function getUtxos(address) {
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

function buildMetaidScript(opType, protocolPath, payload) {
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
  if (typeof payload === 'string') {
    script.add(Buffer.from(payload));
  } else {
    script.add(Buffer.from(JSON.stringify(payload)));
  }
  return script;
}

async function broadcastTx(rawTx, { broadcastType = BROADCAST_TYPE_API, rpcUrl, rpcUser, rpcPass } = {}) {
  if (broadcastType === BROADCAST_TYPE_API) {
    const res = await axios.post(BROADCAST_API, { hex: rawTx });
    return res.data;
  } else if (broadcastType === BROADCAST_TYPE_RPC) {
    const res = await axios.post(
      rpcUrl,
      {
        method: 'sendrawtransaction',
        params: [rawTx],
        id: 1,
        jsonrpc: '2.0'
      },
      {
        auth: {
          username: rpcUser,
          password: rpcPass
        }
      }
    );
    return res.data;
  } else {
    throw new Error('不支持的广播方式');
  }
}

async function createAndSendTx({
  mnemonic, path, opType, protocolPath, payload,
  broadcastType = MVC_BROADCAST_TYPE,
  rpcUrl = MVC_RPC_HOST,
  rpcUser = MVC_RPC_USER,
  rpcPass = MVC_RPC_PASSWORD
}) {
  const { key, address } = await getKeyPairFromMnemonicAndPath(mnemonic, path);
  const utxos = await getUtxos(address);
  if (!utxos || utxos.length === 0) {
    throw new Error('没有可用UTXO，请先充值');
  }
  const index = Math.floor(Math.random() * utxos.length);
  console.log(`[createAndSendTx] ${path} ，utxo总量: ${utxos.length}，随机选择UTXO索引: ${index}`);
  const utxo = utxos[index];
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
      satoshis: 1
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
  const res = await broadcastTx(rawTx, { broadcastType, rpcUrl, rpcUser, rpcPass });
  let txid;
  if (broadcastType === BROADCAST_TYPE_API) {
    txid = res.txid || res.result || res;
    //console.log('[createAndSendTx] API广播返回:', res);
  } else if (broadcastType === BROADCAST_TYPE_RPC) {
    txid = res.result;
    // console.log('[createAndSendTx] RPC广播返回:', res);
  } else {
    txid = res;
    // console.log('[createAndSendTx] 广播返回:', res);
  }
  return txid;
}

// 新增：只构造不广播
async function createMetaidTx({
  mnemonic, path, opType, protocolPath, payload, utxo
}) {
  const { key, address } = await getKeyPairFromMnemonicAndPath(mnemonic, path);
  let useUtxo = utxo;
  if (!useUtxo) {
    const utxos = await getUtxos(address);
    if (!utxos || utxos.length === 0) {
      throw new Error('没有可用UTXO，请先充值');
    }
    const index = Math.floor(Math.random() * utxos.length);
    useUtxo = utxos[index];
  }
  const tx = new MVC.Transaction()
    .from([{
      txId: useUtxo.txId,
      outputIndex: useUtxo.outputIndex,
      address: address,
      script: useUtxo.script,
      satoshis: useUtxo.satoshis
    }])
    .addOutput(new MVC.Transaction.Output({
      script: MVC.Script.buildPublicKeyHashOut(address),
      satoshis: 1
    }))
    .addOutput(new MVC.Transaction.Output({
      script: buildMetaidScript(opType, protocolPath, payload),
      satoshis: 0
    }))
    .change(address)
    .feePerKb(FEE_PER_KB);
  tx.sign(key);
  const rawTx = tx.serialize();
  return { rawTx, tx };
}

module.exports = {
  getKeyPairFromMnemonicAndPath,
  getUtxos,
  buildMetaidScript,
  createAndSendTx,
  createMetaidTx
}; 