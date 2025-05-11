/**
 * 批量点赞评论模块
 * 针对指定的帖子ID和用户批次，执行批量点赞和评论操作
 */

const { ChainOperator } = require('./chainOperator.js');
const { CommentGenerator } = require('./commentGenerator.js');
const { errorLog, randomSleerp } = require('./util.js');
const { createUsers } = require('./user.js');
const config = require('./config.js');

class LikeAndCommentManager {
  constructor() {
    // 使用config中的助记词和派生路径创建用户
    this.users = createUsers(config.derivationPaths);
    console.log(`已创建 ${this.users.length} 个用户实例`);
  }

  /**
   * 执行批量点赞评论（先构造所有交易，再慢慢广播）
   * @param {string[]} postIds - 目标帖子ID数组
   * @param {Object} options - 配置选项
   * @param {number} options.batchCount - 构造批次数，默认1
   * @param {number} options.minDelay - 最小延迟时间(ms)，默认5000
   * @param {number} options.maxDelay - 最大延迟时间(ms)，默认10000
   * @param {boolean} options.skipCommented - 是否跳过已评论的用户，默认false
   * @param {boolean} options.randomOrder - 是否随机打乱帖子顺序，默认true
   */
  async batchLikeAndComment(postIds, options = {}) {
    const {
      batchCount = 1,
      minDelay = 1000,
      maxDelay = 2000,
      skipCommented = false,
      randomOrder = false
    } = options;

    let successCount = 0;
    let failCount = 0;

    // 直接使用postIds，不再洗牌
    const targetPosts = postIds;

    console.log(`开始批量点赞评论任务，目标帖子数量：${targetPosts.length}，用户数量：${this.users.length}，批次数：${batchCount}`);

    // 1. 先为每个用户获取一次utxos
    const userUtxoMap = new Map();
    for (const user of this.users) {
      const { getUtxos } = require('./mvcChainService.js');
      const utxos = await getUtxos(user.address || user.getAddress?.() || user.deriveAddress?.());
      userUtxoMap.set(user, utxos ? [...utxos] : []);
    }

    // 2. 批量构造所有评论/点赞交易
    const txList = [];
    for (let batch = 0; batch < batchCount; batch++) {
      for (const postId of targetPosts) {
        for (const user of this.users) {
          try {
            // 取出一个utxo
            const utxos = userUtxoMap.get(user);
            if (!utxos || utxos.length === 0) throw new Error('用户UTXO已用完');
            const utxo = utxos.shift();
            // 只构造点赞交易（如需评论同理）
            const { rawTx: likeTx } = await ChainOperator.likeTx(user, postId, utxo);
            txList.push({ rawTx: likeTx, user, postId });
          } catch (error) {
            failCount++;
            errorLog(`用户 ${user.id} 构造点赞交易失败:`, error);
          }
        }
      }
    }

    // 3. 逐个广播交易
    for (const txObj of txList) {
      try {
        // 广播交易
        const res = await this.broadcastRawTx(txObj.rawTx);
        console.log(`用户 ${txObj.user.id} 评论广播成功，txid: ${res.txid || res.result || res}`);
        successCount++;
        // 可选：延迟
        await randomSleerp(minDelay, maxDelay);
      } catch (error) {
        failCount++;
        errorLog(`用户 ${txObj.user.id} 广播评论交易失败:`, error);
        await randomSleerp(30000, 60000);
      }
    }

    console.log(`\n批量点赞评论任务完成，成功：${successCount}，失败：${failCount}`);
    return { successCount, failCount };
  }

  /**
   * 广播原始交易
   */
  async broadcastRawTx(rawTx) {
    // 直接调用mvcChainService的broadcastTx
    const { broadcastTx } = require('./mvcChainService.js');
    return await broadcastTx(rawTx, {});
  }
}

// 执行批量操作
const manager = new LikeAndCommentManager();
const postIds = ["7252e6fe73ff9682ffb7f66b20a2585f5ef5de53ee8a3da17618c9f46ce07641i0"];
manager.batchLikeAndComment(postIds, {
  batchCount: 1000,
  minDelay: 1000,
  maxDelay: 2000,
  skipCommented: true,
  randomOrder: true
});

module.exports.LikeAndCommentManager = LikeAndCommentManager;

