import { chromium } from 'playwright';
import fs from 'node:fs';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const context=await browser.newContext();
await context.route('**/*',route=>{const u=new URL(route.request().url());return ['127.0.0.1','localhost'].includes(u.hostname)?route.continue():route.abort();});
const page=await context.newPage();
await page.clock.install({time:new Date('2026-11-02T02:00:00Z')});
for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
 await page.setViewportSize(viewport);
 await page.goto('http://127.0.0.1:4370/officialwebsite/homepage-root.html',{waitUntil:'domcontentloaded'});
 if(viewport.width===390){await page.evaluate(()=>{localStorage.removeItem('magicj.all-cloud-backup.reminded-monday.v1')});await page.reload({waitUntil:'domcontentloaded'});}
 await page.waitForSelector('.mj-backup-reminder[open]');
 const box=await page.locator('.mj-backup-reminder').boundingBox();
 if(!box||box.x<0||box.x+box.width>viewport.width||box.y<0||box.y+box.height>viewport.height)throw new Error('Reminder overflow');
 await page.screenshot({path:`D:/UserTemp/huawei/magicj-backup-reminder-${viewport.width}.png`});
 await page.getByRole('button',{name:'稍后再说'}).click();
 await page.goto('http://127.0.0.1:4370/officialwebsite/about.html',{waitUntil:'domcontentloaded'});
 await page.waitForSelector('#mj-account');
 if(await page.locator('.mj-backup-reminder[open]').count())throw new Error('Duplicate reminder on another page');
 await page.locator('#mj-account [data-login]').click();
 await page.waitForSelector('#mj-login[open]');
 await page.screenshot({path:`D:/UserTemp/huawei/magicj-backup-login-${viewport.width}.png`});
 await page.locator('#mj-login [data-close]').click();
}
await browser.close();console.log('PASS desktop/mobile reminder bounds, dismiss, cross-page deduplication, login modal buttons');
