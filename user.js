/**
 * 用户管理模块
 * 负责用户相关的功能，包括：
 * 1. 创建用户实例
 * 2. 记录用户的互动历史
 * 3. 管理用户的发帖记录
 * 4. 维护用户的派生路径信息
 */

export class User {
  constructor(id, mnemonic) {
    this.id = id;
    this.mnemonic = mnemonic;
    this.interactedPosts = new Set();
    this.ownPosts = new Set();
  }
  hasInteracted(postId) {
    return this.interactedPosts.has(postId);
  }
  markInteracted(postId) {
    this.interactedPosts.add(postId);
  }
}

export function createUsers(mnemonics) {
  return mnemonics.map((mnemonic, idx) => new User(`user${idx + 1}`, mnemonic));
} 