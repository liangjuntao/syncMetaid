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
const mainPath = `m/44'/236'/0'/0/0`;

// 默认收款地址和金额（请根据实际情况修改）
const DEFAULT_TO_ADDRESS = '1E8FoFSF62MjRMXHuXFpwqGVYGT2Hbt2GG';
const DEFAULT_AMOUNT = 110000000; // 单位：聪

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
    .filter(u => Number(u.satoshis) > 546)
    .map(u => ({
      txId: u.txid,
      outputIndex: u.outIndex,
      address: u.address,
      script: addressToScriptHex(u.address),
      satoshis: Number(u.satoshis)
    })) : [];
}

async function sendToOne(toAddress, amount) {
  const mnemonic = config.mnemonic;
  const { key, address } = await getKeyPair(mnemonic, mainPath);
  console.log('主钱包地址:', address);
  if (!toAddress || !amount) {
    console.log('用法: node 1send1.js 收款地址 金额(聪)');
    return;
  }
  if (toAddress === address) {
    console.log('收款地址不能为主钱包地址');
    return;
  }
  const utxos = await getUtxos(address);
  if (!utxos.length) {
    console.log('主钱包无可用UTXO');
    return;
  }
  const total = utxos.reduce((sum, u) => sum + u.satoshis, 0);
  if (total < amount) {
    console.log('余额不足');
    return;
  }
  let tx = new MVC.Transaction().from(utxos).to(toAddress, amount);
  tx.change(address).feePerKb(FEE_PER_KB);
  const fee = tx.getFee();
  const sendAmount = amount;
  if (total < sendAmount + fee) {
    console.log('余额不足以支付手续费');
    return;
  }
  tx = new MVC.Transaction().from(utxos).to(toAddress, sendAmount).change(address).feePerKb(FEE_PER_KB);
  tx.sign(key);
  const rawTx = tx.serialize();
  try {
    const res = await axios.post(BROADCAST_API, { hex: rawTx });
    console.log('广播结果:', res.data);
  } catch (e) {
    console.error('广播失败:', e.response ? e.response.data : e.message);
  }
}

// 命令行用法: node 1send1.js 收款地址 金额(聪)
if (require.main === module) {
  const [, , toAddress, amount] = process.argv;
  const finalToAddress = toAddress || DEFAULT_TO_ADDRESS;
  const finalAmount = amount ? Number(amount) : DEFAULT_AMOUNT;
  sendToOne(finalToAddress, finalAmount);
}

module.exports = { sendToOne }; 