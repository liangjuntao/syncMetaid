/**
 * 批量点赞评论模块
 * 针对指定的帖子ID和用户批次，执行批量点赞和评论操作
 */

import { ChainOperator } from './chainOperator.js';
import { CommentGenerator } from './commentGenerator.js';
import { errorLog, randomSleerp } from './util.js';
import { createUsers } from './user.js';
import config from './config.js';

export class LikeAndCommentManager {
  constructor() {
    // 使用config中的助记词和派生路径创建用户
    this.users = createUsers(config.derivationPaths);
    console.log(`已创建 ${this.users.length} 个用户实例`);
  }

  /**
   * 执行批量点赞评论
   * @param {string[]} postIds - 目标帖子ID数组
   * @param {Object} options - 配置选项
   * @param {number} options.minDelay - 最小延迟时间(ms)，默认5000
   * @param {number} options.maxDelay - 最大延迟时间(ms)，默认10000
   * @param {boolean} options.skipCommented - 是否跳过已评论的用户，默认false
   * @param {boolean} options.randomOrder - 是否随机打乱帖子顺序，默认true
   */
  async batchLikeAndComment(postIds, options = {}) {
    const {
      minDelay = 1000,
      maxDelay = 2000,
      skipCommented = false,
      randomOrder = false
    } = options;

    let successCount = 0;
    let failCount = 0;

    // 如果需要随机顺序，打乱帖子顺序
    const targetPosts = randomOrder ? this.shuffleArray([...postIds]) : postIds;

    console.log(`开始批量点赞评论任务，目标帖子数量：${targetPosts.length}，用户数量：${this.users.length}`);

    for (const postId of targetPosts) {
      console.log(`\n开始处理帖子：${postId}`);
      
      for (const user of this.users) {
        try {
          // 随机延迟，避免操作过于频繁
          //await randomSleerp(minDelay);

          // 生成随机评论
          const comment = CommentGenerator.generate();
          
          // 先评论
          console.log(`用户 ${user.id} 开始评论...`);
          await ChainOperator.comment(user, postId, comment);
          console.log(`用户 ${user.id} 评论成功：${comment}`);

          // 评论后短暂延迟
          //await randomSleerp(2000);

          // 再点赞
          //console.log(`用户 ${user.id} 开始点赞...`);
          //await ChainOperator.like(user, postId);
          //console.log(`用户 ${user.id} 点赞成功`);

          // 标记该用户已与此帖子互动
          //user.markInteracted(postId);
          
          successCount++;
        } catch (error) {
          failCount++;
          errorLog(`用户 ${user.id} 互动失败:`, error);
          console.error('详细错误信息:', error.message);
          if (error.response) {
            console.error('响应状态:', error.response.status);
            console.error('响应数据:', error.response.data);
          }
          // 失败后较长延迟，避免频繁失败
          await randomSleerp(30000, 60000);
        }
      }
    }

    console.log(`\n批量点赞评论任务完成，成功：${successCount}，失败：${failCount}`);
    return { successCount, failCount };
  }

  /**
   * Fisher-Yates 洗牌算法
   * @param {Array} array 要打乱的数组
   * @returns {Array} 打乱后的数组
   */
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}

// 执行批量操作
const manager = new LikeAndCommentManager();
const postIds = ["7252e6fe73ff9682ffb7f66b20a2585f5ef5de53ee8a3da17618c9f46ce07641i0"];
for (let index = 0; index < 100000; index++) {
  await manager.batchLikeAndComment(postIds, {
    minDelay: 1000,
  maxDelay: 2000,
    skipCommented: true,
    randomOrder: true
  });
}

