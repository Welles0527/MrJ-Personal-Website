import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.ACCOUNT_LAYOUT_BASE_URL||'http://127.0.0.1:4370/officialwebsite';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  const context=await browser.newContext({viewport});const page=await context.newPage();
  for(const file of ['homepage-root.html','about.html','workstation.html']){
   await page.goto(base+'/'+file,{waitUntil:'domcontentloaded',timeout:20000});
   await page.waitForSelector('#mj-account');
   await page.waitForFunction(()=>{
    const bar=document.querySelector('#mj-account').getBoundingClientRect(),nav=document.querySelector('.universe-header .main-nav').getBoundingClientRect();
    return nav.top>=bar.bottom+10;
   },null,{timeout:10000});
   // The homepage's entrance animation temporarily owns the top layer.
   await page.waitForFunction(()=>{
    const link=document.querySelector('.universe-header .main-nav a'),rect=link.getBoundingClientRect();
    return document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2)?.closest('.main-nav');
   },null,{timeout:15000});
   const check=()=>page.evaluate(()=>{
    const bar=document.querySelector('#mj-account').getBoundingClientRect(),nav=document.querySelector('.universe-header .main-nav').getBoundingClientRect();
    const link=document.querySelector('.universe-header .main-nav a');const r=link.getBoundingClientRect();
    return {gap:nav.top-bar.bottom,navVisible:!!document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('.main-nav'),overflow:document.documentElement.scrollWidth>innerWidth};
   });
   let result=await check();assert.ok(result.gap>=10&&result.navVisible,file+' first-visit nav must be below account bar and clickable');assert.equal(result.overflow,false,file+' page overflow');
   await page.evaluate(()=>{document.querySelector('#mj-account').dataset.auth='signed-in';document.querySelector('#mj-account-status').textContent='已登录 · an-account-with-a-long-address@example.test';});
   await page.waitForTimeout(150);result=await check();assert.ok(result.gap>=10&&result.navVisible,file+' wrapped account row');
   if(file==='homepage-root.html')await page.screenshot({path:`D:/UserTemp/huawei/account-nav-spacing-${viewport.width}.png`});
   await page.evaluate(()=>{document.querySelector('#mj-account').dataset.auth='guest';});
   await page.waitForTimeout(100);
   await page.locator('#mj-account summary').click();assert.equal(await page.locator('#mj-login').evaluate(d=>d.open),true);await page.locator('#mj-login [data-close]').click();
   await page.evaluate(()=>scrollTo({top:200,behavior:'instant'}));await page.waitForTimeout(150);
   if(file==='homepage-root.html')assert.equal(await page.evaluate(()=>parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--mj-account-visible-height'))),0,'No extra navigation gap after homepage account bar scrolls away');
   await page.evaluate(()=>scrollTo(0,0));
  }
  await context.close();
 }
 console.log('PASS 1440/390 fresh visitor, three pages, account wrapping, clickable navigation/login, no overflow, scroll spacing reset');
}finally{await browser.close();}
