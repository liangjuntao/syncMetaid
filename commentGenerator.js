export class CommentGenerator {
  static generate() {
    const comments = [
      "好帖！", "有趣", "支持", "学习了", "👍", "赞一个", "内容不错", "很棒", "感谢分享", "666"
    ];
    return comments[Math.floor(Math.random() * comments.length)];
  }
} 