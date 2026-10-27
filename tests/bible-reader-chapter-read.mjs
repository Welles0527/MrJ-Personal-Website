import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const url=process.env.BIBLE_URL||'http://127.0.0.1:4389/officialwebsite/topics/applications/inspiration-station/theology/?book=gen&chapter=1';
const auth=`export const getRememberedSession=()=>window.__signedIn?{uid:'chapter-test',account:'chapter@example.test'}:null;
export const getCloudSession=async()=>getRememberedSession();
export const cloudErrorMessage=(e,f)=>e?.message||f;
export const signInWithPassword=async()=>getRememberedSession();
export const signOut=async()=>{};export const startEmailSignUp=async()=>{};
export const getCloudDb=()=>({collection:()=>({doc:()=>({get:async()=>({data:structuredClone(window.__cloud)}),update:async p=>{window.__cloud={...window.__cloud,...structuredClone(p)};window.__writes++;localStorage.setItem('__chapterTestCloud',JSON.stringify(window.__cloud));return {updated:1}},set:async p=>{window.__cloud=structuredClone(p);window.__writes++;localStorage.setItem('__chapterTestCloud',JSON.stringify(window.__cloud));return {data:{updated:1}}}}),where:()=>({limit:()=>({get:async()=>({data:[]})})})})});`;
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try {
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:width===1440?900:844},hasTouch:width===390});
  await context.addInitScript(()=>{window.__signedIn=true;window.__writes=0;window.__cloud={ownerId:'chapter-test',lastRead:{book:'gen',chapter:1,verse:1,updatedAt:'2026-01-01T00:00:00Z'},updatedAt:'2026-01-01T00:00:00Z',readVerses:['gen-1-1','exo-1-1'],bookStatuses:{},bookmarks:[],notes:[],groupStudy:{plans:[{id:'keep'}]}};});
  await context.route('**/src/scripts/site-auth.ts*',r=>r.fulfill({contentType:'application/javascript',body:auth}));
  await context.addInitScript(()=>{const saved=localStorage.getItem('__chapterTestCloud');if(saved)window.__cloud=JSON.parse(saved);});
  const p=await context.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
  const response=await p.goto(url,{waitUntil:'networkidle',timeout:60000});assert.equal(response.status(),200);
  await p.waitForFunction(()=>document.querySelector('[data-bible-search-status]')?.textContent.includes('1189'));
  const chapter=n=>p.locator('[data-chapter-list] [data-chapter="'+n+'"]');
  await chapter(2).click();await p.waitForTimeout(550);
  assert.equal(await chapter(2).getAttribute('class'),'is-active');
  assert.equal(await p.locator('[data-action="toggle-read-verse"][aria-pressed="true"]').count(),0,'single click must not mark read');
  if(width===390){await chapter(2).tap();await p.waitForTimeout(70);await chapter(2).tap();}else await chapter(2).dblclick();
  await p.waitForTimeout(850);
  assert.equal(await p.locator('[data-action="toggle-read-verse"]').count(),25);
  assert.equal(await p.locator('[data-action="toggle-read-verse"][aria-pressed="true"]').count(),25);
  assert.match(await chapter(2).getAttribute('class'),/is-complete/);
  let cloud=await p.evaluate(()=>window.__cloud);
  assert.equal(cloud.readVerses.length,27);assert.ok(cloud.readVerses.includes('exo-1-1'));assert.ok(cloud.readVerses.includes('gen-1-1'));
  assert.deepEqual(cloud.groupStudy,{plans:[{id:'keep'}]});
  await chapter(2).dblclick();await p.waitForTimeout(650);assert.equal((await p.evaluate(()=>window.__cloud.readVerses)).length,27,'repeated double click must not clear or duplicate');
  await chapter(3).dblclick();await p.waitForTimeout(700);assert.equal(await p.locator('[data-action="toggle-read-verse"][aria-pressed="true"]').count(),24,'double click another chapter');
  await p.locator('[data-action="toggle-read-verse"]').first().click();await p.waitForTimeout(700);assert.equal(await p.locator('[data-action="toggle-read-verse"][aria-pressed="true"]').count(),23);
  await p.screenshot({path:'.private/chapter-read-'+width+'.png'});
  assert.deepEqual(errors,[]);
  await p.reload({waitUntil:'networkidle'});await p.waitForTimeout(700);await chapter(2).click();await p.waitForTimeout(500);
  assert.equal(await p.locator('[data-action="toggle-read-verse"][aria-pressed="true"]').count(),25,'cloud readback after reload');
  await p.evaluate(()=>{window.__signedIn=false;window.dispatchEvent(new CustomEvent('site-auth-change',{detail:null}));});
  // A fresh logged-out page must not mark a chapter or write cloud records.
  await p.reload({waitUntil:'networkidle'}); // init script resets fixture; explicitly route auth as logged out next.
  await context.route('**/src/scripts/site-auth.ts*',r=>r.fulfill({contentType:'application/javascript',body:auth.replace('window.__signedIn?', 'false?')}));
  await p.reload({waitUntil:'networkidle'});await p.waitForTimeout(500);await chapter(1).dblclick();await p.waitForTimeout(550);
  assert.equal(await p.locator('[data-action="toggle-read-verse"][aria-pressed="true"]').count(),0);
  assert.equal(await p.evaluate(()=>window.__writes),0);
  console.log('PASS '+width+': single/double/touch, all verses, other chapters, idempotence, individual uncheck, reload, logged-out guard');
  await context.close();
 }
} finally {await browser.close();}
