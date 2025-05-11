const MVC = require('mvc-lib');
const bip39 = require('bip39');
const { BIP32Factory } = require('bip32');
const ecc = require('tiny-secp256k1');
const axios = require('axios');
const config = require('./config.js');

const bip32 = BIP32Factory(ecc);
const API_BASE = 'https://mvcapi.cyber3.space';
const BROADCAST_API = 'https://mvcapi.cyber3.space/tx/broadcast';
const FEE_PER_BYTE = 3;
const FEE_PER_KB = FEE_PER_BYTE * 1024;

// ====== 配置区 ======
const mnemonic = config.mnemonic; // 从 config.js 读取助记词
// 需要汇总的路径（可自定义添加）
const paths = [
  `m/44'/10001'/0'/0/1`,
  `m/44'/10001'/0'/0/2`,
  `m/44'/10001'/0'/0/3`, 
  `m/44'/10001'/0'/0/4`,
  `m/44'/10001'/0'/0/5`,
  `m/44'/10001'/0'/0/6`,
  `m/44'/10001'/0'/0/7`,
  `m/44'/10001'/0'/0/8`,
  `m/44'/10001'/0'/0/9`,
  `m/44'/10001'/0'/0/10`
  // ... 可继续添加
];
const mainPath = `m/44'/10001'/0'/0/0`;
// ====================

async function getKeyPair(mnemonic, path) {
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
    const addr = new MVC.Address(address);
    return MVC.Script.buildPublicKeyHashOut(addr).toHex();
  }
  return Array.isArray(utxos) ? utxos
    .filter(u => Number(u.satoshis) > 200)
    .map(u => ({
      txId: u.txid,
      outputIndex: u.outIndex,
      address: u.address,
      script: addressToScriptHex(u.address),
      satoshis: Number(u.satoshis)
    })) : [];
}

async function main() {
  // 1. 获取主地址
  const { key: mainKey, address: mainAddress } = await getKeyPair(mnemonic, mainPath);
  console.log('主地址:', mainAddress);

  // 2. 获取所有子地址及其私钥
  const subKeys = [];
  for (const path of paths) {
    const { key, address } = await getKeyPair(mnemonic, path);
    subKeys.push({ key, address });
  }

  // 3. 查询所有子地址UTXO
  let allUtxos = [];
  for (const { address } of subKeys) {
    const utxos = await getUtxos(address);
    allUtxos = allUtxos.concat(utxos);
    console.log(`地址${address} UTXO数量:`, utxos.length);
  }
  if (allUtxos.length === 0) {
    console.log('没有可用UTXO，无需汇总');
    return;
  }

  // 4. 构建汇总交易
  const total = allUtxos.reduce((sum, u) => sum + u.satoshis, 0);
  let tx = new MVC.Transaction().from(allUtxos).to(mainAddress, total);
  // 先估算手续费
  tx.change(mainAddress).feePerKb(FEE_PER_KB);
  const fee = tx.getFee();
  const sendAmount = total - fee;
  if (sendAmount <= 0) {
    console.log('余额不足以支付手续费');
    return;
  }
  tx = new MVC.Transaction().from(allUtxos).to(mainAddress, sendAmount).change(mainAddress).feePerKb(FEE_PER_KB);

  // 5. 用所有子地址私钥签名
  for (const { key } of subKeys) {
    tx.sign(key);
  }

  // 6. 广播交易
  const rawTx = tx.serialize();
  try {
    const res = await axios.post(BROADCAST_API, { hex: rawTx });
    console.log('广播结果:', res.data);
  } catch (e) {
    console.error('广播失败:', e.response ? e.response.data : e.message);
  }
}

main();

module.exports = {}; 