/**
 * 用户管理模块
 * 负责用户相关的功能，包括：
 * 1. 创建用户实例
 * 2. 记录用户的互动历史
 * 3. 管理用户的发帖记录
 * 4. 维护用户的派生路径信息
 */

const config = require('./config.js');

class User {
  /**
   * 创建用户实例
   * @param {string} id - 用户ID
   * @param {string} mnemonic - 助记词或派生路径
   * @param {string} [derivationPath] - 派生路径（如果第二个参数是助记词）
   */
  constructor(id, mnemonic, derivationPath) {
    this.id = id;
    this.mnemonic = mnemonic;
    this.derivationPath = derivationPath || mnemonic; // 如果没有提供derivationPath，则使用mnemonic作为路径
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

/**
 * 创建用户列表
 * @param {string[]} paths - 派生路径数组
 * @param {string} [mnemonic] - 可选的助记词，如果不提供则使用config中的助记词
 * @returns {User[]} 用户实例数组
 */
function createUsers(paths, mnemonic = config.mnemonic) {
  return paths.map((path, idx) => 
    new User(`user${idx + 1}`, mnemonic, path)
  );
}

module.exports = { User, createUsers }; 