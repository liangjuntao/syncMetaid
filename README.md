# syncMetaid

## 项目简介
syncMetaid 是一个基于 MVC 链的链上交互工具，支持批量 UTXO 拆分、MetaID 相关操作（如发帖、评论、点赞等），并内置防风控机制，适合自动化链上批量操作。

## 主要功能
- 批量派生地址并拆分 UTXO
- 构建并广播带有 OP_RETURN 的链上交易（如发帖、评论、点赞）
- 自动休眠防止 API 风控
- 支持自定义助记词、路径

## 依赖环境
- Node.js 16+
- 主要依赖包：
  - mvc-lib
  - bip39
  - bip32
  - tiny-secp256k1
  - axios

安装依赖：
```bash
npm install
```

## 目录结构说明
```
syncMetaid/
  mydata/                # 本地数据目录（无需关注）
  chainOperator.js       # 链上操作相关工具
  commentGenerator.js    # 评论内容生成器
  config.js              # 配置文件
  index.js               # 入口文件
  interactionManager.js  # 交互管理
  mvcChainService.js     # MVC链交互核心逻辑
  postmvc.js             # 发帖/评论/点赞等操作
  postProvider.js        # 发帖服务
  until.js               # 工具函数
  user.js                # 用户相关
  utxoUtil.js            # UTXO 拆分与管理
  weiboCrawler.js        # 微博爬虫
  package.json           # 依赖声明
```

## 用法示例

### 1. 拆分 UTXO
```js
import { UtxoUtil } from './utxoUtil.js';
const mnemonic = '你的助记词';
const util = new UtxoUtil(mnemonic);
await util.splitAllAddressesUtxosToFiveBatch();
```

### 2. 发帖/评论/点赞
```js
import { createAndSendTx } from './mvcChainService.js';
await createAndSendTx({
  mnemonic: '你的助记词',
  path: `m/44'/10001'/0'/0/2`,
  opType: 'create', // 或 comment/like
  protocolPath: '/metaid/post',
  payload: { content: 'Hello MetaID!' }
});
```

## 防风控说明
所有链上操作（如 UTXO 查询、交易广播等）均自动在每次请求前后随机休眠 30~60 秒，降低被 API 风控的风险。

## 免责声明
本项目仅供学习与测试，请勿用于非法用途。 