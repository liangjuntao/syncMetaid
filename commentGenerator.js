/**
 * 评论生成器
 * 负责生成随机的评论内容
 * 用于自动化互动时生成评论文本
 */

export class CommentGenerator {
  static generate() {
    const comments = [
      "好帖！", "有趣", "支持", "学习了", "👍", "赞一个", "内容不错", "很棒", "感谢分享", "666"
    ];
    return comments[Math.floor(Math.random() * comments.length)];
  }
} 