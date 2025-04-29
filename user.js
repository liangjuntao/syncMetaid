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