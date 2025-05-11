const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

// 获取微博热搜榜单
module.exports.fetchHotSearchList = async function fetchHotSearchList() {
  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: 'C:\\_devData\\cursor\\syncMetaid\\mydata',
    executablePath: 'C:\\Users\\18625\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--proxy-server=http://127.0.0.1:7890']
  });
  const page = await browser.newPage();
  await page.goto('https://s.weibo.com/top/summary', { waitUntil: 'networkidle2', timeout: 60000 });

  // 等待榜单table加载
  await page.waitForSelector('table');

  const hotList = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('table tbody tr'));
    return rows.map(row => {
      const a = row.querySelector('td a');
      return a ? { keyword: a.innerText.trim(), link: a.href } : null;
    }).filter(Boolean);
  });

  await browser.close();
  return hotList;
}

// 用 puppeteer 获取某个热搜词下的热门微博
module.exports.fetchHotWeibos = async function fetchHotWeibos(hotSearchUrl) {
  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: 'C:\\_devData\\cursor\\syncMetaid\\mydata',
    executablePath: 'C:\\Users\\18625\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--proxy-server=http://127.0.0.1:7890']
  });
  const page = await browser.newPage();
  await page.goto(hotSearchUrl, { waitUntil: 'networkidle2', timeout: 60000 });

  // 等待微博内容加载
  await page.waitForSelector('.card-wrap', { timeout: 20000 });

  if (page.url().includes('passport.weibo.com/sso/signin')) {
    console.log('请在弹出的浏览器中手动登录微博，然后按任意键继续...');
    await new Promise(resolve => process.stdin.once('data', resolve));
  }

  const weibos = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.card-wrap .content .txt')).map(el => {
      // 获取 HTML，替换 <br> 为换行，再去除多余 HTML 标签
      let html = el.innerHTML.replace(/<br\s*\/?>/gi, '\n');
      let text = html.replace(/<[^>]+>/g, '').replace(/\n{2,}/g, '\n').trim();
      return { text };
    });
  });

  await browser.close();
  return weibos;
} 