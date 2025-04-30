/**
 * 链上操作工具类
 * 负责处理所有链上写入操作，包括：
 * 1. 发帖（post）：将帖子内容写入链上
 * 2. 评论（comment）：对指定帖子进行评论
 * 3. 点赞（like）：对指定帖子进行点赞
 * 所有操作都通过 MetaID 协议进行
 */

import config from './config.js';
import { createAndSendTx } from './mvcChainService.js';
import { errorLog } from './util.js';

export class ChainOperator {
  static async comment(user, postId, content) {
    // 评论链上写入
    const payload = {
      content,
      contentType: 'text/plain',
      commentTo: postId
    };
    const protocolPath = `${config.protocolId}${config.protocolPaths.comment}`;
    const txResult = await createAndSendTx({
      mnemonic: config.mnemonic,
      path: user.mnemonic, // 这里user.mnemonic实际存储的是派生路径
      opType: 'comment',
      protocolPath,
      payload
    });
    const txid = txResult?.txid || '未知txid';
    errorLog(`[${user.id}] 评论链上写入成功，评论tx: ${txid}`);
    return txResult;
  }
  static async like(user, postId) {
    // 点赞链上写入
    const payload = {
      isLike: '1',
      likeTo: postId
    };
    const protocolPath = `${config.protocolId}${config.protocolPaths.like}`;
    const txResult = await createAndSendTx({
      mnemonic: config.mnemonic,
      path: user.mnemonic, // 这里user.mnemonic实际存储的是派生路径
      opType: 'create',
      protocolPath,
      payload
    });
    const txid = txResult?.txid || '未知txid';
    errorLog(`[${user.id}] 点赞链上写入成功，点赞tx: ${txid}`);
    return txResult;
  }
  static async post(user, content) {
    // 发帖链上写入
    const payload = {
      content,
      contentType: 'text/plain'
    };
    const protocolPath = `${config.protocolId}${config.protocolPaths.post}`;
    return createAndSendTx({
      mnemonic: config.mnemonic,
      path: user.mnemonic, // 这里user.mnemonic实际存储的是派生路径
      opType: 'create',
      protocolPath,
      payload
    });
  }
} 