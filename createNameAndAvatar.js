const config = require('./config.js');
const { ChainOperator } = require('./chainOperator.js');
const { errorLog, randomSleerp } = require('./util.js');
const fs = require('fs');

// 用户自定义的名字数组
const names = [
  '星河滚烫','云朵味的你','月亮不营业','橘子汽水','奶味软萌','小熊不吃鱼','七秒记忆鱼','暖暖的风','藏进星星的梦','不靠谱少女','柠檬精上身','晚安喵小姐','花间一壶酒','雨打梨花深闭门','魅影幽兰','她在冷风中等你','干净的你','胡萝卜星人','热可可不加糖','月色温柔','爱笑的眼睛','风中摇曳的猫','蘑菇头小仙女','青柠味的梦','诗酒趁年华','她与猫与梦','云深不知处','笑忘书','冷月无声','奶茶少女','嘟嘟嘴的糖','薄荷味拥抱','半盏清茶','白日梦想家','山茶花未眠','夏日的风铃','喜你成疾','一梦南柯','她在云端看星星','黑猫警长的前女友'
];

async function batchCreateNames() {
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    // 每个名字用不同的派生路径
    const user = {
      mnemonic: config.mnemonic,
      derivationPath: config.derivationPaths[i],
      id: `user_${i+1}`
    };
    try {
      await randomSleerp(5000);
      const result = await ChainOperator.createName(user, name);
      console.log(`名字“${name}”创建成功，txid: ${result?.txid || '未知txid'}`);
    } catch (e) {
      await randomSleerp(10000);
      console.error(`名字“${name}”创建失败:`, e);
    }
  }
}

async function batchCreateAvatars() {
  errorLog('开始批量创建头像');
  const basePath = 'C:/Users/18625/Desktop/metaso';
  const total = 39;
  for (let i = 1; i <= total; i++) {
    // 文件名补零 01, 02 ... 39
    const idx = i.toString().padStart(2, '0');
    const filePath = `${basePath}/${idx}.png`;
    const user = {
      mnemonic: config.mnemonic,
      derivationPath: config.derivationPaths[i-1],
      id: `user_${i}`
    };
    try {
      if (!fs.existsSync(filePath)) {
        console.error(`文件不存在: ${filePath}`);
        continue;
      }
      const imageBuffer = fs.readFileSync(filePath);
      if (!Buffer.isBuffer(imageBuffer)) {
        console.error(`读取的不是Buffer: ${filePath}`);
        continue;
      }
      const result = await ChainOperator.createAvatar(user, imageBuffer);
      console.log(`头像“${filePath}”创建成功，txid: ${result?.txid || '未知txid'}`);
      await randomSleerp(10000);
    } catch (e) {
      await randomSleerp(10000);
      console.error(`头像“${filePath}”创建失败:`, e);
    }
  }
}

// 取消自动执行名字批量创建，改为手动调用
// batchCreateNames();

// 执行批量头像上传
batchCreateAvatars();

module.exports = {}; 