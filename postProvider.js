export class PostProvider {
  constructor() {
    this.posts = [];
  }
  addPost(post) {
    this.posts.push(post);
  }
  getRecentPosts(count = 20) {
    return this.posts.slice(-count);
  }
} 