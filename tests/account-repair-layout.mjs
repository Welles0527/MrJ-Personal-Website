import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base = process.env.ACCOUNT_TEST_BASE_URL || 'http://127.0.0.1:4397/officialwebsite';
const output = 'D:/UserTemp/huawei/magicj-auth-repair-evidence';
fs.mkdirSync(output, { recursive: true });
const routes = ['homepage-root.html','resume/','ai-bookshelf.html','coffee-field-guide-zh.html',
  'topics/applications/inspiration-station/theology/','topics/applications/inspiration-station/theology/group-study/',
  'topics/space/planning/todo/','inspiration-studio.html','family-health.html','stock-tracking/',
  'topics/space/investing/funds/index.html','super-calendar/index.html','topics/space/travel/travel-map/','ai-interview-notes.html'];
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const results = [];
try {
 for (const width of [1440,390]) {
  const context = await browser.newContext({ viewport: { width, height: width === 1440 ? 900 : 844 } });
  const page = await context.newPage();
  for (const [index,route] of routes.entries()) {
   await page.goto(`${base}/${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
   await page.waitForFunction(() => Boolean(window.MagicJAccount), null, { timeout: 20000 });
   await page.evaluate(() => window.MagicJAccount.openLogin());
   await page.locator('#mj-login[open]').waitFor({state:'visible'});
   const result = await page.locator('#mj-login').evaluate(dialog => {
    const r=dialog.getBoundingClientRect(); const style=getComputedStyle(dialog);
    const inputs=[...dialog.querySelectorAll('input')].filter(e=>e.getBoundingClientRect().height);
    return { inBounds:r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight, width:r.width,
     overflow:dialog.scrollWidth>dialog.clientWidth, font:style.fontSize,
     inputs:inputs.every(el=>{const b=el.getBoundingClientRect();return b.left>=r.left&&b.right<=r.right&&b.height>=40;}),
     buttons:[...dialog.querySelectorAll('button')].every(el=>{const b=el.getBoundingClientRect();return el.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2));}) };
   });
   assert.ok(result.inBounds&&!result.overflow&&result.inputs&&result.buttons, `${width} ${route}: ${JSON.stringify(result)}`);
   assert.equal(result.font,'15px');
   await page.locator('#mj-login [name=email]').fill('qa@example.test');
   await page.locator('#mj-login [name=password]').fill('layout-only');
   if ([0,1,2,4].includes(index)) await page.screenshot({ path:`${output}/login-${index}-${width}.png` });
   await page.locator('#mj-login [data-close]').click();
   assert.equal(await page.locator('#mj-login').evaluate(el=>el.open), false);
   const native = await page.locator('#mj-account').getAttribute('data-native');
   if(native==='true') {
    await page.locator('#mj-account-status').evaluate(el=>{el.dataset.error='true';el.textContent='模拟连接失败';});
    assert.equal(await page.locator('#mj-account').isVisible(),false,'errors cannot resurrect a second account bar');
   }
   if(index===4) {
    await page.evaluate(()=>scrollTo(0,450));
    await page.waitForTimeout(200);
    assert.ok(await page.locator('.bible-account-bar').evaluate(el=>el.getBoundingClientRect().bottom<=0),'Bible account bar scrolls away');
    await page.screenshot({path:`${output}/bible-scroll-${width}.png`});
   }
   results.push({width,route,...result});console.log('PASS',width,route);
  }
  await context.close();
 }
 fs.writeFileSync(`${output}/layout.json`,JSON.stringify(results,null,2));
} finally { await browser.close(); }
