import MVC from 'mvc-lib';
import bip39 from 'bip39';
import { BIP32Factory } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { fetchHotSearchList, fetchHotWeibos } from './weiboCrawler.js';
const { Script, Address, crypto } = MVC;

// ====== 1. 配置区 ======
const MNEMONIC = 'choose family measure filter fly tool live donor dune depend pave you'; // TODO: 替换为你的助记词
const NETWORK = 'mainnet'; // 主网
const API_BASE = 'https://mvcapi.cyber3.space';
const FEE_PER_BYTE = 2; // 推荐主网最低费率，单位：satoshi/byte
const FEE_PER_KB = FEE_PER_BYTE * 1024; // mvc-lib需要sat/KB
const BROADCAST_API = 'https://mvcapi.cyber3.space/tx/broadcast';

// MetaID协议数据
const metaidPayload = {
  content: "一杯敬过往，兄弟你可还好？",
  contentType: "text/plain",
  createTime: Date.now(),
  quoteTx: ""
};

const bip32 = BIP32Factory(ecc);

console.log('bip32:', bip32);
console.log('MVC.Address:', MVC.Address);

// ====== 2. 助记词转私钥和地址 ======
async function getKeyPairFromMnemonic(mnemonic) {
  const seed = await bip39.mnemonicToSeed(mnemonic);
  const root = bip32.fromSeed(seed);
  // MVC主网默认路径 m/44'/376'/0'/0/0
  const child = root.derivePath("m/44'/10001'/0'/0/0");
  const wif = child.toWIF();
  const key = new MVC.PrivateKey(wif, MVC.Networks.mainnet);
  const address = key.toAddress().toString();
  console.log('生成的钱包地址:', address);
  return { key, address };
}

// ====== 3. 查询UTXO ======
async function getUtxos(address) {
  const url = `${API_BASE}/address/${address}/utxo`;
  console.log('API :', url);
  const res = await axios.get(url);
  console.log('API原始返回:', res.data);
  const utxos = res.data;

  function addressToScriptHex(address) {
    const addr = new Address(address);
    return Script.buildPublicKeyHashOut(addr).toHex();
  }

  const mapped = Array.isArray(utxos) ? utxos
    .filter(u => Number(u.satoshis) > 546)
    .map(u => ({
      txId: u.txid,
      outputIndex: u.outIndex,
      address: u.address,
      script: u.scriptPubKey || addressToScriptHex(u.address),
      satoshis: Number(u.satoshis)
    })) : [];
  console.log('映射后的UTXO:', mapped);
  return mapped;
}

// ====== 4. 构造MetaID协议OP_RETURN脚本 ======
function buildMetaidScript(payload) {
  const script = new Script();
  const metaidBuf = Buffer.from('metaid');
  console.log('metaid Buffer:', metaidBuf, 'hex:', metaidBuf.toString('hex'));
  script.add('OP_FALSE');
  script.add('OP_RETURN');
  script.add(metaidBuf);
  script.add(Buffer.from('create'));
  script.add(Buffer.from('bc1p.fun:/protocols/simplebuzz'));
  script.add(Buffer.from([0])); // 加密类型 0
  script.add(Buffer.from([0])); // 版本 0
  script.add(Buffer.from('application/json;utf-8'));
  script.add(Buffer.from(JSON.stringify(payload)));
  return script;
}

// ====== 5. 构造并签名交易 ======
async function createAndSendTx(payload) {
  const { key, address } = await getKeyPairFromMnemonic(MNEMONIC);
  const utxos = await getUtxos(address);
  console.log('查询到的UTXO:', utxos);

  if (!utxos || utxos.length === 0) {
    throw new Error('没有可用UTXO，请先充值');
  }

  // 选第一个UTXO
  const utxo = utxos[0];

  // 构造交易
  const tx = new MVC.Transaction()
    .from([{
      txId: utxo.txId,
      outputIndex: utxo.outputIndex,
      address: address,
      script: utxo.script,
      satoshis: utxo.satoshis
    }])
    .addOutput(new MVC.Transaction.Output({
      script: buildMetaidScript(payload),
      satoshis: 0
    }))
    .change(address) // 找零
    .feePerKb(FEE_PER_KB); // 手续费

  // 打印所有输出
  tx.outputs.forEach((out, idx) => {
    console.log(`output[${idx}]:`, {
      satoshis: out.satoshis,
      scriptType: out.script.classify() || 'unknown',
      scriptHex: out.script.toHex()
    });
  });

  console.log('预计找零金额:', tx.getChangeOutput() ? tx.getChangeOutput().satoshis : '无找零');

  tx.sign(key);

  // 广播交易
  const rawTx = tx.serialize();
  const res = await axios.post(BROADCAST_API, { hex: rawTx });
  console.log('广播结果:', res.data);
  return res.data;
}

// ====== 采集数量配置 ======
const HOT_SEARCH_LIMIT = 5; // 只采集前2个热搜
const WEIBO_LIMIT = 5;      // 每个热搜只采集2条微博

// ====== 定时任务配置 ======
const INTERVAL_MS = 60 * 10000; // 每小时执行一次，测试时可改为 60*1000 表示每分钟

// ====== 定时主流程 ======
async function syncHotWeiboToMVC() {
  try {
    console.log(`[${new Date().toLocaleString()}] 开始同步微博热搜...`);
    const hotList = await fetchHotSearchList();
    console.log(`获取到热搜词条数量: ${hotList.length}`);
    for (const hot of hotList.slice(0, HOT_SEARCH_LIMIT)) { // 只抓前N个热搜
      console.log(`处理热搜词: ${hot.keyword}`);
      const weibos = await fetchHotWeibos(hot.link);
      console.log(`  获取到微博数量: ${weibos.length}`);
      for (const weibo of weibos.slice(0, WEIBO_LIMIT)) { // 每个热搜只抓M条微博
        const payload = {
          content: weibo.text,
          contentType: "text/plain",
          createTime: Date.now(),
          source: "weibo-hotsearch",
          keyword: hot.keyword
        };
        // 写入链上
        await createAndSendTx(payload);
      }
    }
    console.log(`[${new Date().toLocaleString()}] 本轮同步完成`);
  } catch (err) {
    console.error('同步热搜微博失败:', err);
  }
}

// ====== 定时器 ======
setInterval(syncHotWeiboToMVC, INTERVAL_MS);
// 启动时立即执行一次
syncHotWeiboToMVC();

// ====== 6. 执行主流程 ======
// createAndSendTx(metaidPayload)
//   .then(res => console.log('链上写入成功:', res))
//   .catch(err => console.error('写入失败:', err));