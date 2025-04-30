/**
 * 互动管理器
 * 负责处理用户间的互动行为，包括：
 * 1. 批量处理用户对帖子的互动（评论+点赞）
 * 2. 记录互动历史，避免重复互动
 * 3. 控制互动间隔，防止操作过于频繁
 */

import { ChainOperator } from './chainOperator.js';
import { CommentGenerator } from './commentGenerator.js';
import { errorLog, randomSleerp } from './util.js';

export class InteractionManager {
  constructor(users, postProvider, config) {
    this.users = users;
    this.postProvider = postProvider;
    this.config = config;
  }

  async runBatchInteraction() {
    const posts = this.postProvider.getAllPosts();
    let hasInteraction = false;
    for (const user of this.users) {
      for (const post of posts) {
        await randomSleerp(5000);
        hasInteraction = true;
        const comment = CommentGenerator.generate();
        await ChainOperator.comment(user, post.id, comment);
        await randomSleerp(5000);
        await ChainOperator.like(user, post.id);
        user.markInteracted(post.id);
      }
    }
    if (!hasInteraction) {
      errorLog(`【互动任务】没有可互动的内容`);
    }
  }
} 