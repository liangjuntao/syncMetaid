/**
 * 工具函数模块
 * 提供通用的工具函数，包括：
 * 1. 错误日志记录（errorLog）
 * 2. 随机休眠功能（randomSleerp）
 * 3. 基础的休眠功能（sleep）
 */

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function errorLog(data) {
    const now = new Date().toLocaleString();
    console.log(now + '：' + data);
}

export async function randomSleerp(sleepTime){
    const randomMs = sleepTime + Math.floor(Math.random() * sleepTime); // 5~10秒
    errorLog(`[randomSleerp] 休眠${randomMs / 1000}秒...`);
    await sleep(randomMs);
}
