import { ChainOperator } from './chainOperator.js';
import { CommentGenerator } from './commentGenerator.js';

export class InteractionManager {
  constructor(users, postProvider, config) {
    this.users = users;
    this.postProvider = postProvider;
    this.config = config;
  }

  async runBatchInteraction() {
    const now = new Date().toLocaleString();
    console.log(`【互动任务】${now} 开始批量互动`);
    const posts = this.postProvider.getRecentPosts(this.config.batchPostCount);
    let hasInteraction = false;
    for (const user of this.users) {
      for (const post of posts) {
        if (post.author !== user.id && !user.hasInteracted(post.id)) {
          hasInteraction = true;
          const comment = CommentGenerator.generate();
          await ChainOperator.comment(user, post.id, comment);
          await ChainOperator.like(user, post.id);
          user.markInteracted(post.id);
        }
      }
    }
    if (!hasInteraction) {
      console.log(`【互动任务】${now} 没有可互动的内容`);
    }
  }
} 