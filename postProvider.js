/**
 * 帖子提供者
 * 负责管理所有帖子数据，包括：
 * 1. 存储新发布的帖子
 * 2. 提供帖子查询功能
 * 3. 维护帖子池
 */

class PostProvider {
  constructor() {
    this.posts = [];
  }
  addPost(post) {
    this.posts.push(post);
  }
  getRecentPosts(count = 20) {
    return this.posts.slice(-count);
  }
  getAllPosts() {
    return this.posts;
  }
}

module.exports = { PostProvider }; 