import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
const auth=fs.readFileSync(new URL('./bible-reader-chapter-read.mjs',import.meta.url),'utf8').match(/const auth=`([\s\S]*?)`;/)[1];
const url=process.env.BIBLE_URL||'http://127.0.0.1:4389/officialwebsite/topics/applications/inspiration-station/theology/?book=mat&chapter=23&verse=1';
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{for(const width of [1440,390]){
 const context=await browser.newContext({viewport:{width,height:width===1440?900:844}});
 await context.addInitScript(()=>{window.__signedIn=true;window.__writes=0;window.__cloud={ownerId:'chapter-test',lastRead:{book:'mat',chapter:23,verse:1,updatedAt:'2026-01-01T00:00:00Z'},updatedAt:'2026-01-01T00:00:00Z',readVerses:[],bookStatuses:{},bookmarks:[],notes:[]};});
 await context.route('**/src/scripts/site-auth.ts*',r=>r.fulfill({contentType:'application/javascript',body:auth}));
 const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 assert.equal((await p.goto(url,{waitUntil:'networkidle',timeout:60000})).status(),200);
 const account=p.locator('[data-login-account]'),status=p.locator('[data-reading-sync-status]'),theme=p.locator('[data-action="toggle-reading-theme"]');
 await account.waitFor({state:'visible'});await status.waitFor({state:'visible'});
 assert.equal(await account.count(),1);assert.equal(await status.count(),1);
 assert.equal(await p.locator('.bible-account-bar [data-login-account]').count(),0);
 for(const mode of ['dark','light']){
  await theme.scrollIntoViewIfNeeded();
  const a=await account.boundingBox(),s=await status.boundingBox(),t=await theme.boundingBox();
  assert.ok(a.y+a.height<=t.y+1,'account above theme controls');assert.ok(s.y+s.height<=t.y+1,'sync above theme controls');
  assert.ok(a.x>=0&&a.x+a.width<=width+1,'account within viewport');assert.ok(s.x>=0&&s.x+s.width<=width+1,'status within viewport');
  await p.screenshot({path:'.private/reader-status-'+width+'-'+mode+'.png'});
  await theme.click();
 }
 await p.locator('[data-speech-rate]').selectOption('1.2');assert.equal(await p.locator('[data-speech-rate]').inputValue(),'1.2');
 await status.evaluate(el=>{el.textContent='云端同步暂时不可用，请检查网络后重试，当前阅读位置保持不变。';el.dataset.status='error';});
 const errorBox=await status.boundingBox(),controls=await theme.boundingBox();assert.ok(errorBox.y+errorBox.height<=controls.y+1,'long error does not overlap controls');
 assert.ok(errorBox.x+errorBox.width<=width+1);
 assert.deepEqual(errors,[]);
 console.log('PASS '+width+': single live status above controls, light/dark, no clipping, long errors, controls clickable');
 await context.close();
}}finally{await browser.close();}
