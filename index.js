import { createUsers } from './user.js';
import { PostProvider } from './postProvider.js';
import { InteractionManager } from './interactionManager.js';
import { ChainOperator } from './chainOperator.js';
import config from './config.js';

// 初始化用户和帖子池
const users = createUsers(config.derivationPaths);
const postProvider = new PostProvider();
const interactionManager = new InteractionManager(users, postProvider, config);

// 定时发帖（链上）
global.postTimer = setInterval(async () => {
  for (const user of users) {
    const content = `test_${Math.random().toString(36).slice(2, 8)}`;
    try {
      const txResult = await ChainOperator.post(user, content);
      let postId = txResult?.txid ? `${txResult.txid}i0` : `post_${user.id}_${Date.now()}`;
      const post = {
        id: postId,
        author: user.id,
        content,
        time: Date.now()
      };
      postProvider.addPost(post);
      user.ownPosts.add(postId);
      console.log(`[${user.id}] 发帖（链上）：${content}，txid: ${txResult?.txid || '未知txid'}，inscription id: ${postId}`);
    } catch (e) {
      console.error(`[${user.id}] 发帖失败:`, e.message);
    }
  }
}, config.postInterval);

// 定时互动
global.interactTimer = setInterval(async () => {
  await interactionManager.runBatchInteraction();
}, config.interactInterval);

console.log('自动互动机器人已启动...'); 