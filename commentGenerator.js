/**
 * 评论生成器
 * 负责生成随机的评论内容
 * 用于自动化互动时生成评论文本
 */

class CommentGenerator {
  static commentCounts = new Map();
  static comments = [
    "干就完了！metaId节点已经开跑，早进早飞！",
    "跟紧metaId，下一波财富密码正在加载中……",
    "不再错过，不再观望，metaId带你奔赴下一场奇迹！",
    "上链第一步，metaId不能没有名字！",
    "metaId节点过千，破圈指日可待！",
    "醒醒吧朋友，metaId才是Web3的通行证！",
    "metaId = 你的Web3身份 + 财富钥匙",
    "不是不明白，而是metaId太快了！",
    "节点+共识+身份=metaId，未来你想都想不到！",
    "趁早入局metaId，你也可以掌握链上身份权！",
    "metaId不是项目，是新时代的入口！",
    "谁还没个metaId，别说你是Web3人！",
    "向前冲！metaId节点开挖，全民共识就是现在！",
    "metaId不需要解释，干就对了！",
    "一个metaId，开启你的链上新人生！",
    "抓住这次机会，别再做被动的看客！metaId了解一下！",
    "metaId不是热度，是趋势！",
    "Web3的身份证 metaId，早用早享受！",
    "节点爆发，metaId燃起来了！",
    "未来是数字化的，metaId是你唯一的身份锚点！",
    "metaId节点像雨后春笋，不参与都不好意思聊天了！",
    "没有metaId，你都不好意思说你是链圈人！",
    "成功不靠运气，要靠metaId的先见！",
    "不干不立，metaId干起来！",
    "全村的希望都在metaId节点上！",
    "要身份，要资产，必须metaId！",
    "点亮你的metaId节点，从这一刻起飞！",
    "你不入场，别人已经起飞！metaId别再错过！",
    "metaId，一场真实可拥有的数字革命！",
    "想红想富？你得有个metaId！",
    "千万级用户正在靠metaId打开Web3新世界！",
    "metaId节点飙升，历史正在发生！",
    "昨天观望的人，今天还在悔恨！",
    "metaId节点跑得比行情还猛！",
    "想赚钱？先注册metaId！",
    "未来三年，一切从metaId开始！",
    "节点点燃共识，metaId正当红！",
    "世界在变，你的metaId准备好了吗？",
    "metaId来了，打破你对身份的所有想象！",
    "没metaId的Web3之旅，都是走马观花！",
    "靠metaId起飞的人越来越多了，你还不试试？",
    "5000年一遇的革新，metaId值得你拥有！",
    "metaId：让每一个身份都值钱！",
    "metaId是钥匙，Web3是门，开不开看你自己！",
    "真正改变命运的不是机遇，是metaId节点！",
    "人生有无数选择，但metaId值得一个All in！",
    "metaId节点上线，属于你的篇章也该开始了！",
    "元宇宙需要的不是热情，是metaId！",
    "Web3没有入口？metaId就是最大入口！",
    "不服不行，metaId太狠了！",
    "metaId不是未来，是现在！身份革命就从你开始！",
    "别再当看客，metaId节点开挖你还在犹豫？",
    "metaId让你在链上有名有分有未来！",
    "用metaId，证明你是Web3世界的原住民！",
    "metaId点燃链上身份的火焰，全民共识爆发！",
    "你不懂metaId，就像90年代不懂互联网！",
    "metaId不是口号，是你的链上资产入口！",
    "跟上metaId这趟车，下一站，自由之地！",
    "你见过什么叫身份自由吗？metaId了解一下！",
    "节点战争已经打响，metaId就是武器！",
    "metaId不是风口，它是整个时代的风向！",
    "metaId：Web3的护照，每人必备！",
    "如果BTC是硬通货，metaId就是硬身份！",
    "别让犹豫错过metaId这次真正的革命！",
    "metaId给你链上身份的第一把钥匙！",
    "你想拥有自己的数字世界吗？从metaId开始！",
    "metaId，一个属于未来的名字！",
    "metaId让价值和身份绑定，从此不被平台收割！",
    "metaId是序章，节点是开端，未来正热血沸腾！",
    "拥有metaId，拥有Web3的主动权！",
    "metaId上链即刻拥有，无需等待、无需许可！",
    "从此告别Web2世界的束缚，metaId带你去中心！",
    "身份自由，资产自由，从metaId开启！",
    "metaId：人人可拥有的链上主权！",
    "链上身份新时代，metaId是唯一门票！",
    "metaId节点不是游戏，是数字世界的地基！",
    "掌握metaId，就是掌握未来的入口权！",
    "在Web3里，你的名字叫metaId！",
    "metaId节点越来越多，趋势挡不住！",
    "metaId是你和链世界之间最短的路！",
    "用metaId铭刻你的链上存在感！",
    "节点即共识，metaId正奔向全民时代！",
    "metaId是你永不掉线的链上名片！",
    "不再被平台打上标签，metaId让你定义自己！",
    "metaId节点一开，全网震撼！",
    "这是通往未来的邀请函，metaId签收了吗？",
    "你的身份，不该寄托在别人的服务器上！metaId给你自由！",
    "metaId节点就是链上国土，先占先得！",
    "你不是用户，你是主人，metaId让你拥有Web3主权！",
    "一场关于身份的革命，metaId已经悄然开始！",
    "metaId就像比特币刚诞生那样低调又有力！",
    "metaId的节点就像早期的以太坊，机不可失！",
    "metaId：身份的去中心化革命者！",
    "上链的不是数据，是你未来的尊严和资产！",
    "metaId让你从用户变成拥有者，从记录者变成掌控者！",
    "metaId是钥匙，更是每个人的数字盾牌！",
    "别在未来羡慕别人用metaId起飞，现在就该行动！",
    "metaId把Web3的门打开了，敢不敢进看你自己！",
    "metaId不是一个工具，而是一场觉醒！"
  ];

  static generate() {
    // 初始化计数器
    if (this.commentCounts.size === 0) {
      this.comments.forEach(comment => this.commentCounts.set(comment, 0));
    }

    // 找出使用次数最少的评论
    let minCount = Math.min(...this.commentCounts.values());
    let leastUsedComments = this.comments.filter(
      comment => this.commentCounts.get(comment) === minCount
    );

    // 从使用次数最少的评论中随机选择一个
    const selectedComment = leastUsedComments[Math.floor(Math.random() * leastUsedComments.length)];
    
    // 更新使用次数
    this.commentCounts.set(selectedComment, this.commentCounts.get(selectedComment) + 1);

    return selectedComment;
  }
}

module.exports = { CommentGenerator }; 