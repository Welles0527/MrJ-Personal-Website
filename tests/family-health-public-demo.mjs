import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
const root=fileURLToPath(new URL('../public/',import.meta.url));
const html=await fs.readFile(path.join(root,'family-health.html'),'utf8');
for(const [,script] of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))if(script.trim())new vm.Script(script);
const authStub=`window.qa={session:null,calls:[],archives:{},failSession:false,failLoad:false,deferUid:null,resolveLoad:null};
window.FamilyHealthAuth={
 getSession:async()=>{if(qa.failSession)throw Error('TEST_SESSION_UNAVAILABLE');return qa.session;},
 signOut:async()=>{qa.session=null;window.dispatchEvent(new Event('site-auth-change'));},
 callCloudFunction:async(name,data)=>{const uid=qa.session?.uid;qa.calls.push({name,action:data.action,uid,demo:data.snapshot?.state?.settings?.publicDemo===true});if(qa.failLoad)throw Error('TEST_CLOUD_UNAVAILABLE');if(data.action==='load'){const state=qa.archives[uid];if(qa.deferUid===uid)await new Promise(r=>{qa.resolveLoad=r;});return {result:{ok:true,uid,revision:state?1:0,snapshot:state?{state:structuredClone(state),files:[]}:null}};}if(data.action==='save'){qa.archives[uid]=structuredClone(data.snapshot.state);return {result:{ok:true,uid,revision:2}};}throw Error('Unexpected mock action');}
};window.dispatchEvent(new Event('family-health-auth-ready'));`;
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const url='https://family-health-demo.test/officialwebsite/family-health.html';
async function demoPage(options={}){
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 if(options.blockStorage)await page.addInitScript(()=>{IDBFactory.prototype.open=function(){throw Error('Blocked storage');};});
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url());if(u.hostname!=='family-health-demo.test')return route.abort();
  if(u.pathname.endsWith('/family-health-auth.js'))return options.noAuth?route.abort():route.fulfill({contentType:'application/javascript',body:authStub});
  const relative=decodeURIComponent(u.pathname).replace(/^\/officialwebsite\//,'');
  if(relative.includes('..'))return route.abort();
  try{const body=await fs.readFile(path.join(root,relative));await route.fulfill({body,contentType:relative.endsWith('.html')?'text/html; charset=utf-8':relative.endsWith('.js')?'application/javascript':relative.endsWith('.webp')?'image/webp':'application/octet-stream'});}catch{await route.fulfill({status:404,body:'Not found'});}
 });
 await page.goto(url,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>typeof demoMode!=='undefined'&&demoMode&&state&&!accountChecking);
 return {page,errors};
}
try{
 const {page,errors}=await demoPage();
 assert.equal(await page.locator('.demo-banner').count(),0);assert.equal(await page.locator('.overview-title').textContent(),'健康总览（虚构资料）');
 assert.equal(await page.evaluate(()=>LOCAL_PREVIEW),false);
 assert.equal(await page.evaluate(()=>qa.calls.length),0);
 assert.equal(await page.locator('.topbar a.account-signout').getAttribute('target'),null);
 const summary=await page.evaluate(()=>({profiles:state.profiles.length,conditions:state.conditions.length,events:state.events.length,meds:state.meds.length,reports:state.reports.length,notes:state.notes.length,logs:state.logs.length,trash:state.trash.length,valid:!!validateBackup({format:'jiaan-family-health-backup',schema:1,source:'public-demo',data:structuredClone(state),attachments:[]})}));
 assert.equal(summary.profiles,4);assert.equal(summary.valid,true);
 for(const key of ['conditions','events','meds','reports','notes','logs','trash'])assert.ok(summary[key]>0,key);
 assert.equal(await page.evaluate(()=>['dad','mom','self','wife'].every(pid=>['visit','symptom','admission','surgery'].every(type=>state.events.some(e=>e.pid===pid&&e.type===type))&&state.events.some(e=>e.pid===pid&&e.dailyRecord))),true);
 // Every original section renders on both required viewport sizes; screenshots contain synthetic fixtures only.
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:width===1440?900:844});assert.equal(await page.evaluate(()=>Number(getComputedStyle(document.documentElement).zoom)),width===1440?0.9:1);
  for(const section of ['dashboard','profiles','visits','timeline','meds','reports','notes','admissions','surgery','daily','checkins','trash','drugs']){
   await page.evaluate(section=>navigate(section),section);await page.waitForTimeout(120);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${section}/${width} overflow`);
   assert.ok((await page.locator('.content').innerText()).length>100);
   if(['dashboard','admissions','daily','checkins'].includes(section))await page.screenshot({path:`D:/UserTemp/huawei/family-public-demo-${section}-${width}.png`,fullPage:true});
  }
 }
 await page.setViewportSize({width:1440,height:900});
 await page.evaluate(()=>navigate('reports'));await page.locator('[data-action=view-report]').first().click();
 assert.match(await page.locator('.modal').innerText(),/非真实检查报告/);
 await page.locator('.modal [data-action=close]').first().click();
 await page.evaluate(()=>navigate('checkins'));await page.locator('[data-key=knees]').click();
 await page.waitForFunction(()=>!savingArchive&&checkinDone('exercise','knees'));
 assert.equal(await page.evaluate(()=>qa.calls.length),0);
 await page.reload();await page.waitForFunction(()=>demoMode&&state&&!accountChecking);await page.evaluate(()=>navigate('checkins'));
 assert.equal(await page.locator('[data-key=knees]').getAttribute('aria-pressed'),'true');
 assert.equal(await page.evaluate(()=>qa.calls.length),0);
 const demoExport=await page.evaluate(()=>({format:'jiaan-family-health-backup',schema:1,source:'public-demo',data:structuredClone(state),attachments:[]}));
 assert.equal(await page.evaluate(()=>{try{validateBackup({format:'jiaan-family-health-backup',schema:1,data:emptyAccountState(),attachments:[]});return false;}catch(e){return e.message.includes('演示模式只能');}}),true);
 // Auth failures leave a clearly labelled demo, never an empty or silently substituted account view.
 await page.evaluate(async()=>{qa.failSession=true;await refreshAccount();});
 assert.match(await page.locator('.footer').innerText(),/无法读取账号云端档案/);
 assert.equal(await page.evaluate(()=>cloudArchive),null);
 await page.evaluate(async()=>{qa.failSession=false;qa.session={uid:'qa-a',account:'account-a@test.invalid'};qa.failLoad=true;await refreshAccount();});
 assert.equal(await page.evaluate(()=>demoMode),true);
 assert.match(await page.locator('.footer').innerText(),/不是你的账号记录/);
 // A successful authenticated read replaces every demo record; an empty account remains empty.
 await page.evaluate(async()=>{qa.failLoad=false;qa.calls=[];const a=emptyAccountState();a.settings.demo=true;a.profiles[0].name='账号A测试档案';qa.archives['qa-a']=a;await refreshAccount();});
 assert.equal(await page.evaluate(()=>demoMode),false);assert.equal(await page.locator('.demo-banner').count(),0);await page.evaluate(()=>navigate('dashboard'));assert.equal(await page.locator('.overview-title').textContent(),'健康总览');
 assert.equal(await page.evaluate(()=>state.profiles[0].name),'账号A测试档案');assert.equal(await page.evaluate(()=>state.events.length),0);
 assert.equal(await page.evaluate(()=>qa.calls.some(c=>c.action==='save')),false);
 assert.equal(await page.evaluate(raw=>{try{validateBackup(raw);return false;}catch(e){return e.message.includes('演示备份');}},demoExport),true);
 await page.evaluate(async()=>{await mutate(()=>{state.profiles[0].remark='账号A独立保存测试';});});
 assert.equal(await page.evaluate(()=>qa.calls.filter(c=>c.action==='save').length),1);
 assert.equal(await page.evaluate(()=>qa.calls.some(c=>c.demo)),false);
 await page.evaluate(async()=>{qa.session={uid:'qa-empty',account:'empty@test.invalid'};await refreshAccount();});
 assert.equal(await page.evaluate(()=>demoMode),false);assert.equal(await page.evaluate(()=>state.events.length),0);
 assert.equal(await page.evaluate(()=>state.settings.demo),false);
 // A late response from one account must not overwrite the next account.
 await page.evaluate(()=>{qa.session={uid:'qa-a',account:'account-a@test.invalid'};qa.deferUid='qa-a';void refreshAccount();});
 await page.waitForFunction(()=>typeof qa.resolveLoad==='function');
 await page.evaluate(()=>{const b=emptyAccountState();b.profiles[0].name='账号B测试档案';qa.archives['qa-b']=b;qa.session={uid:'qa-b',account:'account-b@test.invalid'};window.dispatchEvent(new Event('site-auth-change'));qa.deferUid=null;qa.resolveLoad();});
 await page.waitForFunction(()=>!accountChecking&&!demoMode&&currentAccount?.uid==='qa-b');
 assert.equal(await page.evaluate(()=>state.profiles[0].name),'账号B测试档案');
 await page.locator('[data-action=account-signout]').click();
 await page.waitForFunction(()=>!accountChecking&&demoMode);
 assert.equal(await page.evaluate(()=>state.profiles[0].name),'林远（演示）');
 assert.equal(await page.evaluate(()=>checkinDone('exercise','knees')),true);
 assert.equal(await page.evaluate(()=>JSON.stringify(state).includes('账号A独立保存测试')),false);
 assert.equal(await page.evaluate(()=>qa.calls.filter(c=>c.action==='save').length),1);
 assert.equal(await page.evaluate(()=>qa.calls.some(c=>c.demo)),false);
 await page.locator('.manager[data-action=settings]').click();await page.locator('[data-action=reset-public-demo]').click();await page.waitForFunction(()=>!savingArchive&&!checkinDone('exercise','knees'));
 assert.deepEqual(errors,[]);
 await page.close();
 // Guest UI remains available even when auth script or IndexedDB is unavailable.
 for(const options of [{noAuth:true},{blockStorage:true}]){
  const {page:p,errors:e}=await demoPage(options);
  assert.equal(await p.locator('.health-tiles .health-tile').count(),8);
  await p.evaluate(()=>navigate('checkins'));await p.locator('[data-key=knees]').click();await p.waitForFunction(()=>!savingArchive&&checkinDone('exercise','knees'));
  if(options.blockStorage)assert.match(await p.locator('.footer').innerText(),/未允许保存/);
  assert.deepEqual(e,[]);await p.close();
 }
 console.log('PASS: public guest samples in every section; desktop/mobile; demo-only persistence; reports and check-ins; missing auth SDK/blocked storage; login/logout; empty account; failed cloud load; account-switch race; zero demo cloud writes; bidirectional backup isolation.');
 console.log('Synthetic sample counts:',JSON.stringify(summary));
}finally{await browser.close();}
