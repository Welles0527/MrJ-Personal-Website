import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { memoryDatabase } from './family-health-cloud.mjs';
const { createHandler } = createRequire(import.meta.url)('../cloudfunctions/family-health/index.js');
const url = 'http://127.0.0.1:4366/officialwebsite/family-health.html';
const html = (await fs.readFile(new URL('../public/family-health.html', import.meta.url), 'utf8')).replace("const LOCAL_PREVIEW=['localhost','127.0.0.1','[::1]'].includes(location.hostname);", 'const LOCAL_PREVIEW=false;');
const cloud = await fs.readFile(new URL('../public/family-health-cloud.js', import.meta.url), 'utf8');
const db = memoryDatabase(), errors = [];
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
try {
  async function open(uid) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.exposeFunction('testHealthRPC', createHandler(db, () => ({ uid })));
    await page.route('**/family-health.html', route => route.fulfill({ contentType: 'text/html', body: html }));
    await page.route('**/family-health-cloud.js', route => route.fulfill({ contentType: 'text/javascript', body: cloud }));
    await page.route('**/family-health-auth.js', route => route.fulfill({ contentType: 'text/javascript', body: `window.FamilyHealthAuth={getSession:async()=>({uid:${JSON.stringify(uid)},account:${JSON.stringify(uid+'@example.test')}}),callCloudFunction:async(name,event)=>({result:await window.testHealthRPC(event)}),signOut:async()=>{}};window.dispatchEvent(new Event('family-health-auth-ready'));` }));
    await page.goto(url); await page.locator('.storage-mini').waitFor();
    return page;
  }
  const a=await open('auto-visit-test');
  await a.evaluate(async()=>{await mutate(()=>state.events.push({id:'auto-record',pid:'dad',date:today(),type:'visit',title:'自动同步验收',hospital:'医院',content:'原始内容'}));navigate('visits');});
  const input=a.locator('#visit-process-auto-record');
  assert.equal(await a.getByRole('button',{name:'保存过程',exact:true}).count(),0);
  const text=Array.from({length:40},(_,i)=>'第'+i+'行完整显示').join('\n');
  await input.fill(text);await a.waitForFunction(()=>!visitDrafts.size&&!visitSyncBusy);
  assert.equal(await input.evaluate(el=>el.scrollHeight<=el.clientHeight+2),true);
  assert.equal(await input.evaluate(el=>document.activeElement===el),true);
  assert.equal(await a.evaluate(()=>state.events.find(e=>e.id==='auto-record').visitNotes),text);
  await a.reload();await a.locator('.storage-mini').waitFor();await a.evaluate(()=>navigate('visits'));
  assert.equal(await input.inputValue(),text);
  for(const width of [1440,390]){await a.setViewportSize({width,height:width===1440?900:844});await a.evaluate(()=>{mobileOpen=false;render();});assert.equal(await input.evaluate(el=>el.scrollHeight<=el.clientHeight+2),true);await input.scrollIntoViewIfNeeded();await a.screenshot({path:'.private/auto-visit-'+width+'.png'});assert.equal(await a.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);}
  await a.evaluate(()=>{cloudArchive.save=async()=>{throw Error('模拟断网')};});
  await input.fill('失败后保留的文字');await a.waitForFunction(()=>Boolean(visitSyncError));
  assert.equal(await input.inputValue(),'失败后保留的文字');assert.equal(await a.evaluate(()=>visitDrafts.get('auto-record')),'失败后保留的文字');
  assert.match(await a.locator('.visit-sync-status').innerText(),/同步失败/);
  assert.deepEqual(errors,[]);console.log('PASS autosave cloud/reload, full 40 lines, focus retained, failed save draft/status, desktop/mobile');
} finally { await browser.close(); }
