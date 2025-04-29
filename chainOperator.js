import config from './config.js';
import { createAndSendTx } from './mvcChainService.js';

export class ChainOperator {
  static async comment(user, postId, content) {
    // 评论链上写入
    const payload = {
      content,
      contentType: 'text/plain',
      commentTo: postId
    };
    const txResult = await createAndSendTx({
      mnemonic: config.mnemonic,
      path: user.mnemonic, // 这里user.mnemonic实际存储的是派生路径
      opType: 'comment',
      protocolPath: '1FdityKmBAWVrmEm7mavajCGBwj5jHmVDR:/protocols/paycomment',
      payload
    });
    const txid = txResult?.txid || '未知txid';
    console.log(`[${user.id}] 评论链上写入成功，评论tx: ${txid}`);
    return txResult;
  }
  static async like(user, postId) {
    // 点赞链上写入
    const payload = {
      isLike: '1',
      likeTo: postId
    };
    const txResult = await createAndSendTx({
      mnemonic: config.mnemonic,
      path: user.mnemonic, // 这里user.mnemonic实际存储的是派生路径
      opType: 'create',
      protocolPath: '1FdityKmBAWVrmEm7mavajCGBwj5jHmVDR:/protocols/paylike',
      payload
    });
    const txid = txResult?.txid || '未知txid';
    console.log(`[${user.id}] 点赞链上写入成功，点赞tx: ${txid}`);
    return txResult;
  }
  static async post(user, content) {
    // 发帖链上写入
    const payload = {
      content,
      contentType: 'text/plain'
    };
    return createAndSendTx({
      mnemonic: config.mnemonic,
      path: user.mnemonic, // 这里user.mnemonic实际存储的是派生路径
      opType: 'create',
      protocolPath: '1FdityKmBAWVrmEm7mavajCGBwj5jHmVDR:/protocols/simplebuz',
      payload
    });
  }
} 