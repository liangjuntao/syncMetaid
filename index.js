/**
 * 主程序入口
 * 负责整个应用的启动和协调，包括：
 * 1. 初始化各个模块（用户、帖子池等）
 * 2. 执行发帖任务（按批次发帖）
 * 3. 执行互动任务（评论和点赞）
 * 4. 控制整体流程
 */

import { createUsers } from './user.js';
import { PostProvider } from './postProvider.js';
import { InteractionManager } from './interactionManager.js';
import { ChainOperator } from './chainOperator.js';
import config from './config.js';
import { errorLog,randomSleerp} from './util.js';

// 初始化用户和帖子池
const users = createUsers(config.derivationPaths);
const postProvider = new PostProvider();
const interactionManager = new InteractionManager(users, postProvider, config);

errorLog('初始化完成');

// 发帖批次数量，可根据需要调整
const batchCount = 1; // 例如发1批

(async () => {
  for (let batch = 0; batch < batchCount; batch++) {
    errorLog(`【发帖批次】第${batch + 1}批开始`);
    for (const user of users) {
      const content = `metaId`;
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
        errorLog(`[${user.id}] 发帖：${content}，txid: ${txResult?.txid || '未知txid'}`);
      } catch (e) {
        errorLog(`[${user.id}] 发帖失败: ${e && (e.stack || e.message || e)}`);
        await randomSleerp(5000);
      }
      await randomSleerp(1000);

    }
    errorLog(`【发帖批次】第${batch + 1}批结束`);
  }
  errorLog(`所有批次发帖完成！`);

  // 执行10次批量互动
  for (let index = 0; index < 1000 ; index++) {
    try {
      errorLog(`【互动任务】第${index + 1}次开始`);
      // 发帖全部完成后，执行一次批量互动
      errorLog(`【互动任务】开始批量互动`);
      await interactionManager.runBatchInteraction();
      errorLog(`【互动任务】批量互动完成`);
      errorLog(`【互动任务】第${index + 1}次结束`);
    } catch (e) {
      errorLog(`【互动任务】批量互动失败:`, e);
    }
  }
})();

errorLog(`自动互动机器人已启动...`); 