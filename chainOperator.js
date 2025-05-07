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
    const txid = await createAndSendTx({
      mnemonic: user.mnemonic,
      path: user.derivationPath,
      opType: 'create',
      protocolPath,
      payload
    });
    errorLog(`[${user.id}] 评论链上写入成功，评论tx: ${txid || '未知txid'}`);
    return { txid };
  }
  static async like(user, postId) {
    // 点赞链上写入
    const payload = {
      isLike: '1',
      likeTo: postId
    };
    const protocolPath = `${config.protocolId}${config.protocolPaths.like}`;
    const txid = await createAndSendTx({
      mnemonic: user.mnemonic,
      path: user.derivationPath,
      opType: 'create',
      protocolPath,
      payload
    });
    errorLog(`[${user.id}] 点赞链上写入成功，点赞tx: ${txid || '未知txid'}`);
    return { txid };
  }
  static async post(user, content) {
    // 发帖链上写入
    const payload = {
      content,
      contentType: 'text/plain'
    };
    const protocolPath = `${config.protocolId}${config.protocolPaths.post}`;
    const txid = await createAndSendTx({
      mnemonic: user.mnemonic,
      path: user.derivationPath,
      opType: 'create',
      protocolPath,
      payload
    });
    return { txid };
  }
  static async createName(user, name) {
    // 名字链上写入（数据体直接为字符串，去除引号）
    const payload = typeof name === 'string' ? name : String(name); // 保证为原始字符串
    const protocolPath = config.protocolPaths.name; // 只用路径
    const txResult = await createAndSendTx({
      mnemonic: user.mnemonic,
      path: user.derivationPath, // 使用正确的属性名
      opType: 'create',
      protocolPath,
      payload
    });
    const txid = txResult?.txid || '未知txid';
    errorLog(`[${user.id}] 名字链上写入成功，tx: ${txid}`);
    return txResult;
  }
  static async createAvatar(user, imageBuffer) {
    // 头像链上写入，数据体为图片二进制
    const payload = imageBuffer; // Buffer 类型
    const protocolPath = config.protocolPaths.avatar;
    const txResult = await createAndSendTx({
      mnemonic: user.mnemonic,
      path: user.derivationPath,
      opType: 'create',
      protocolPath,
      payload
    });
    const txid = txResult?.txid || '未知txid';
    errorLog(`[${user.id}] 头像链上写入成功，tx: ${txid}`);
    return txResult;
  }
} 