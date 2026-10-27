import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const base='http://127.0.0.1:4417/officialwebsite/topics/applications/inspiration-station/theology/';
const auth=`export const getCloudSession=async()=>window.__owner;export const getRememberedSession=()=>window.__owner;export const cloudErrorMessage=(e,f)=>e?.message||f;export const signInWithPassword=getCloudSession;export const startEmailSignUp=async()=>getCloudSession;export const signOut=async()=>{};
 export const getCloudDb=()=>({collection:()=>({doc:()=>({get:async()=>{await window.__gate;return {data:structuredClone(window.__cloud)}},set:async p=>{window.__writes++;window.__cloud=structuredClone(p);return {data:{}}},update:async p=>{window.__writes++;Object.assign(window.__cloud,structuredClone(p));return {updated:1}}}),where:q=>({limit:()=>({get:async()=>({data:[]})}),update:async p=>{if(q.updatedAt!==window.__cloud.updatedAt)return {updated:0};window.__writes++;Object.assign(window.__cloud,structuredClone(p));return {updated:1}}})})});`;
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try {
 for(const width of [1440,390]) {
  const context=await browser.newContext({viewport:{width,height:width===1440?900:844}});
  await context.addInitScript(()=>{
   window.__owner={uid:'reader-qa',account:'qa@example.test'};window.__writes=0;
   window.__gate=new Promise(resolve=>window.__release=resolve);
   window.__cloud={ownerId:'reader-qa',lastRead:{book:'heb',chapter:5,verse:1,updatedAt:'2026-10-01T00:00:00Z'},bookmarks:[],notes:[],readVerses:['heb-5-1'],bookStatuses:{heb:'reading'},updatedAt:'2026-10-01T00:00:00Z'};
   localStorage.setItem('mywebsite.bible-reader.v1',JSON.stringify({readVerses:['gen-1-1'],updatedAt:'2099-01-01'}));
  });
  await context.route('**/src/scripts/site-auth.ts*',r=>r.fulfill({contentType:'application/javascript',body:auth}));
  await context.route('**/account-entry.js*',r=>r.fulfill({contentType:'application/javascript',body:''}));
  const page=await context.newPage();await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('[data-chapter-list] [data-chapter="2"]',{state:'attached'});
  await page.locator('[data-chapter-list] [data-chapter="2"]').dispatchEvent('click');
  await page.waitForTimeout(900);
  assert.equal(await page.evaluate(()=>window.__writes),0,'loading cannot write defaults');
  await page.evaluate(()=>window.__release());
  await page.waitForFunction(()=>document.querySelector('[data-reading-sync-status]')?.dataset.status==='saved');
  assert.match(await page.locator('[data-current-title]').innerText(),/希伯来书\s*5/,'cloud reading position must win over initial viewport');
  assert.equal(await page.evaluate(()=>window.__writes),0,'loading does not save');
  await page.locator('[data-action=toggle-read-verse][data-verse="2"]').dispatchEvent('click');
  await page.waitForFunction(()=>window.__cloud.readVerses.includes('heb-5-2'));
  await page.waitForFunction(()=>document.querySelector('[data-reading-sync-status]')?.dataset.status==='saved');
  assert.deepEqual(await page.evaluate(()=>window.__cloud.readVerses),['heb-5-1','heb-5-2']);
  await page.evaluate(()=>{window.__cloud.readVerses.push('heb-5-3');window.__cloud.updatedAt='2099-01-01T00:00:00Z';});
  await page.locator('[data-action=toggle-read-verse][data-verse="4"]').dispatchEvent('click');
  await page.waitForFunction(()=>document.querySelector('[data-reading-sync-status]')?.dataset.status==='error');
  assert.ok(await page.evaluate(()=>window.__cloud.readVerses.includes('heb-5-3')&&!window.__cloud.readVerses.includes('heb-5-4')),'stale page must not overwrite another device');
  console.log('PASS',width,'delayed load, cloud resume, stale cache ignored, actual UI save/readback, concurrent write blocked');
  await context.close();
 }
} finally {await browser.close();}
