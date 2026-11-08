import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { build } from 'esbuild';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

// The launcher provides the protected credential through stdin only; never persist it.
let input='';for await(const chunk of process.stdin)input+=chunk;
const credential=JSON.parse(input);input='';
console.log('Credential received in memory; preparing browser test');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const entry=`import { mountAccountToolbar } from './src/scripts/account-toolbar';
import { mountCalendarFavoriteCloud } from './src/scripts/calendar-favorites-cloud';
import { getCloudDb,getCloudSession,signInWithPassword } from './src/scripts/site-auth';
window.__favoriteLiveAuth={getCloudDb,getCloudSession,signInWithPassword};
const start=()=>{mountAccountToolbar();mountCalendarFavoriteCloud();};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();`;
const bundle=await build({stdin:{contents:entry,resolveDir:root,loader:'ts'},bundle:true,write:false,format:'iife',platform:'browser',target:'es2022'});
const script=bundle.outputFiles[0].text;
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--renderer-process-limit=1','--disable-gpu']});
console.log('Browser launched');
const created=[];let uid='';let passed=false;const qaKeys=[];
const evidence=process.env.SNOOKER_QA_EVIDENCE;
try {
  async function device(width) {
    const ctx=await browser.newContext({viewport:{width,height:width===1440?900:844}});
    await ctx.route('**/*',r=>{
      if(r.request().url().includes('/account-entry.js'))return r.fulfill({body:script,contentType:'text/javascript'});
      if(['image','font'].includes(r.request().resourceType())||r.request().url().includes('cloudbase.full.js'))return r.abort();
      return r.continue();
    });
    await ctx.addInitScript(()=>localStorage.setItem('cue-calendar-tour-v1','1'));
    const p=await ctx.newPage();
    p.on('console',message=>{if(message.text().startsWith('FAVORITE_SYNC:'))console.log(message.text());});
    await p.goto('http://127.0.0.1:4516/officialwebsite/super-calendar/index.html#home',{waitUntil:'domcontentloaded'});
    await p.waitForFunction(()=>window.__favoriteLiveAuth);
    await p.evaluate(()=>{new MutationObserver(()=>{const n=document.querySelector('#snooker-favorites-cloud-status');if(n?.dataset.status==='error')console.log('FAVORITE_SYNC: '+n.textContent);}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['data-status']});});
    console.log('Device page ready',width);
    await p.evaluate(async ({account,password})=>{await Promise.race([window.__favoriteLiveAuth.signInWithPassword(account,password),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Login request timed out')),30000))]);},credential);
    console.log('Device logged in',width);
    const settled=await p.waitForFunction(()=>{const node=document.querySelector('#snooker-favorites-cloud-status');return ['cloud','error'].includes(node?.dataset.status)?{mode:node.dataset.status,message:node.textContent}:false;},null,{timeout:30000});
    const syncState=await settled.jsonValue();
    if(syncState.mode!=='cloud')throw Error(syncState.message);
    return {ctx,p};
  }
  const a=await device(1440);
  uid=await a.p.evaluate(async()=> (await window.__favoriteLiveAuth.getCloudSession()).uid);
  // Use synthetic favorite IDs in the dedicated new collection, never touch actual favorites.
  const id='cloud-qa-'+Date.now();
  qaKeys.push('match:'+id);
  await a.p.evaluate(id=>{
    const values=JSON.parse(localStorage.getItem('cue-match-favorites')||'{}');
    values[id]={eventId:'international',eventName:'云同步验收',matchId:id,date:'2026-11-08',clock:'10:00',home:'双端验收A',away:'双端验收B'};
    localStorage.setItem('cue-match-favorites',JSON.stringify(values));window.dispatchEvent(new Event('snooker-favorites-local-change'));
  },id);
  await a.p.waitForFunction(()=>['cloud','error'].includes(document.querySelector('#snooker-favorites-cloud-status')?.dataset.status));
  if(await a.p.locator('#snooker-favorites-cloud-status').getAttribute('data-status')==='error') {
    throw Error(await a.p.locator('#snooker-favorites-cloud-status').innerText());
  }
  const b=await device(390);
  assert(await b.p.evaluate(id=>!!JSON.parse(localStorage.getItem('cue-match-favorites')||'{}')[id],id));
  assert(await b.p.evaluate(id=>SuperCalendarHome.entries().some(e=>e.id==='cue-match:'+id),id));
  await b.p.evaluate(()=>{state.view='month';state.month=10;state.year=2026;render();});
  assert((await b.p.locator('[data-date="2026-11-08"]').innerText()).includes('双端验收A'));
  if(evidence)await b.p.screenshot({path:path.join(evidence,'snooker-cloud-real-mobile.png')});
  await b.p.evaluate(id=>{const values=JSON.parse(localStorage.getItem('cue-match-favorites')||'{}');delete values[id];localStorage.setItem('cue-match-favorites',JSON.stringify(values));window.dispatchEvent(new Event('snooker-favorites-local-change'));},id);
  await b.p.waitForFunction(()=>document.querySelector('#snooker-favorites-cloud-status')?.dataset.status==='cloud');
  await a.p.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await a.p.waitForFunction(id=>!JSON.parse(localStorage.getItem('cue-match-favorites')||'{}')[id],id);
  assert(!await a.p.evaluate(id=>SuperCalendarHome.entries().some(e=>e.id==='cue-match:'+id),id));
  // Exercise the real tournament favorite button with an isolated synthetic fixture.
  const tournamentId=id+'-tournament';qaKeys.push('tournament:'+tournamentId);
  await a.p.goto('http://127.0.0.1:4516/officialwebsite/snooker-calendar/index.html',{waitUntil:'domcontentloaded'});
  await a.p.locator('#snooker-favorites-cloud-status[data-status="cloud"]').waitFor();
  await a.p.evaluate(id=>{
    const template=events.find(e=>e.start?.startsWith('2026-11'));
    events.push({...template,id,name:'云同步按钮验收',start:'2026-11-08',end:'2026-11-08'});
    state.nav='schedule';state.statuses=new Set(['upcoming','live','ended']);render();
  },tournamentId);
  await a.p.locator(`[data-save="${tournamentId}"]`).click();
  await a.p.locator('#snooker-favorites-cloud-status[data-status="cloud"]').waitFor();
  await b.p.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await b.p.waitForFunction(id=>JSON.parse(localStorage.getItem('cue-favorites')||'[]').includes(id),tournamentId);
  assert(await b.p.evaluate(id=>SuperCalendarHome.entries().some(e=>e.id==='cue:'+id),tournamentId));
  await a.p.locator(`[data-save="${tournamentId}"]`).click();
  await a.p.locator('#snooker-favorites-cloud-status[data-status="cloud"]').waitFor();
  await b.p.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await b.p.waitForFunction(id=>!JSON.parse(localStorage.getItem('cue-favorites')||'[]').includes(id),tournamentId);
  const own=await a.p.evaluate(async keys=>{
    const data=await window.__favoriteLiveAuth.getCloudDb().collection('officialWebsiteSnookerFavorites').where({ownerId:(await window.__favoriteLiveAuth.getCloudSession()).uid}).limit(100).get();
    if(data.error)throw new Error('Cloud query failed');
    return data.data.filter(x=>keys.includes(x.key)).map(x=>x._id);
  },qaKeys);
  created.push(...own);assert(created.length>=4);
  assert(await a.p.evaluate(async operationId=>{
    const db=window.__favoriteLiveAuth.getCloudDb();
    async function denied(request) {try{const response=await request();return !!(response.code||response.error);}catch{return true;}}
    return await denied(()=>db.collection('officialWebsiteSnookerFavorites').where({ownerId:'cloud-qa-foreign-owner'}).get())
      && await denied(()=>db.collection('officialWebsiteSnookerFavorites').doc(operationId).update({schema:1}));
  },created[0]),'foreign-owner reads and operation updates must be denied');
  assert(!await a.p.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
  assert(!await b.p.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
  if(evidence)await a.p.screenshot({path:path.join(evidence,'snooker-cloud-real-desktop.png')});
  await b.ctx.close();await a.ctx.close();passed=true;
  console.log('PASS real CloudBase: same account, two isolated devices, favorite round-trip, summary display, cancellation propagation, foreign-owner read denied, immutable operation update denied, desktop/mobile');
} finally {
  await browser.close();
  // Remove only this run's exact synthetic operation IDs through the administrator CLI.
  if(qaKeys.length && uid) {
    const cli=String.raw`C:\Users\huawei\AppData\Roaming\npm\node_modules\@cloudbase\cli\bin\cloudbase`;
    const env={...process.env};for(const key of ['HTTP_PROXY','HTTPS_PROXY','ALL_PROXY'])delete env[key];
    const command=[{TableName:'officialWebsiteSnookerFavorites',CommandType:'DELETE',Command:JSON.stringify({delete:'officialWebsiteSnookerFavorites',deletes:[{q:{key:{$in:qaKeys},ownerId:uid},limit:0}]})}];
    const cleanup=spawnSync(process.execPath,[cli,'db','nosql','execute','-e','magicj-web-d5g9yvowj6862f7a2','--command',JSON.stringify(command),'--json'],{env,encoding:'utf8',timeout:30000});
    if(cleanup.status!==0||cleanup.stdout?.includes('"error":'))throw Error('Synthetic test cleanup requires attention');
  }
  if(evidence)fs.writeFileSync(path.join(evidence,'snooker-cloud-real-result.json'),JSON.stringify({passed,operationCount:created.length,syntheticRecordsCleaned:created.length>0},null,2));
}
