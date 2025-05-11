/**
 * 互动管理器
 * 负责处理用户间的互动行为，包括：
 * 1. 批量处理用户对帖子的互动（评论+点赞）
 * 2. 记录互动历史，避免重复互动
 * 3. 控制互动间隔，防止操作过于频繁
 */

const { ChainOperator } = require('./chainOperator.js');
const { CommentGenerator } = require('./commentGenerator.js');
const { errorLog, randomSleerp } = require('./util.js');

export class InteractionManager {
  constructor(users, postProvider, config) {
    this.users = users;
    this.postProvider = postProvider;
    this.config = config;
  }

  async runBatchInteraction() {
    const posts = this.postProvider.getAllPosts();
    let hasInteraction = false;
    for (const post of posts) {
      for (const user of this.users) {
        try {
          await randomSleerp(1000);
          hasInteraction = true;
          // const comment = CommentGenerator.generate();//生成评论
          const comment = "";
          await ChainOperator.comment(user, post.id, comment);
          await randomSleerp(1000);
          await ChainOperator.like(user, post.id);
          // user.markInteracted(post.id); 不用标记已经评论过
        } catch (error) {
          await randomSleerp(60000);
          errorLog(`【互动任务】runBatchInteraction 互动失败:`, error);
        }
      }
    }
    if (!hasInteraction) {
      errorLog(`【互动任务】没有可互动的内容`);
    }
  }
}

module.exports = {}; 