import { build } from 'esbuild';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
const auth = `
export const getRememberedSession=()=>window.session;
export const getCloudSession=async()=>{if(window.expired)throw Object.assign(Error('会话失效'),{code:'SITE_AUTH_REQUIRED'});return window.session};
export const signInWithPassword=async(email)=>{window.logins++;window.expired=false;window.session={uid:'qa',account:email};window.dispatchEvent(new CustomEvent('site-auth-change',{detail:window.session}));return window.session};
export const signOut=async()=>{window.logouts++;window.session=null;window.dispatchEvent(new CustomEvent('site-auth-change',{detail:null}))};
export const startEmailSignUp=async()=>{},startPasswordReset=async()=>{},completePasswordReset=async()=>{};`;
const bundle=await build({stdin:{contents:"import {mountAccountToolbar} from './src/scripts/account-toolbar'; mountAccountToolbar();",resolveDir:process.cwd()},bundle:true,write:false,format:'iife',plugins:[{name:'boundary',setup(b){b.onResolve({filter:/\/(site-auth|all-cloud-backup|weekly-backup-reminder|cloud-backup|project-brand)$/},a=>({path:a.path.split('/').pop(),namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path==='site-auth'?auth:'export const exportAllCloudBackup=async()=>{},mountWeeklyBackupReminder=()=>{},readCloudBackup=async()=>{},createProjectBrand=()=>null,mountProjectBrand=()=>{};'}))}}]});
const server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/entry.js'?'application/javascript; charset=utf-8':'text/html; charset=utf-8');res.end(req.url==='/entry.js'?bundle.outputFiles[0].text:`<!doctype html><html><body><button data-calendar-login>qa@example.test</button><a data-site-auth-login href='/officialwebsite/topics/space/planning/todo'>登录</a><input id='draft' value='未保存内容'><script>window.session={uid:'qa',account:'qa@example.test'};window.logins=0;window.logouts=0;</script><script src='/entry.js'></script></body></html>`)});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const width of [1440,390]){const page=await browser.newPage({viewport:{width,height:width===1440?900:844}});const url=`http://127.0.0.1:${server.address().port}/calendar`;await page.goto(url);await page.waitForSelector('#mj-account[data-auth=signed-in]',{state:'attached'});
await page.locator('[data-calendar-login]').click();assert.equal(await page.locator('#mj-login').evaluate(d=>d.open),true,'signed-in native entry must open the current-page account dialog');
await page.evaluate(()=>MagicJAccount.register({beforeLeave:async()=>{throw Error('有未保存草稿')},sync:async()=>{if(window.expired)throw Object.assign(Error('失效'),{code:'SITE_AUTH_REQUIRED'})}}));
await page.locator('#mj-login [name=email]').fill('qa@example.test');await page.locator('#mj-login [name=password]').fill('fixture-password');await page.locator('#mj-login [type=submit]').click();await page.waitForFunction(()=>window.logins===1);assert.equal(await page.locator('#draft').inputValue(),'未保存内容');
await page.locator('[data-calendar-login]').click();await page.locator('#mj-login [data-account-logout]').click();await page.waitForFunction(()=>document.querySelector('#mj-login [role=alert]').textContent.includes('未保存'));assert.equal(await page.evaluate(()=>window.logouts),0,'unsaved draft must block destructive logout');
await page.evaluate(()=>MagicJAccount.register({beforeLeave:async()=>{}}));await page.locator('#mj-login [data-account-logout]').click();await page.waitForFunction(()=>window.logouts===1);assert.equal(await page.evaluate(()=>window.session),null);
await page.locator('#mj-login [data-close]').click();await page.locator('[data-site-auth-login]').click();assert.equal(page.url(),url);assert.equal(await page.locator('#mj-login').evaluate(d=>d.open),true);
await page.evaluate(()=>{window.session={uid:'qa',account:'qa@example.test'};window.expired=true;});await page.locator('#mj-login [data-close]').click();await page.evaluate(()=>document.querySelector('#mj-account [data-sync]').click());await page.waitForFunction(()=>document.querySelector('#mj-login').open);
const box=await page.locator('#mj-login').boundingBox();assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=width);if(process.env.ACCOUNT_DIALOG_EVIDENCE){fs.mkdirSync(process.env.ACCOUNT_DIALOG_EVIDENCE,{recursive:true});await page.screenshot({path:process.env.ACCOUNT_DIALOG_EVIDENCE+`/dialog-${width}.png`})}
await page.locator('#mj-login [data-account-logout]').click();await page.waitForFunction(()=>window.logouts===2);assert.equal(await page.evaluate(()=>window.session),null,'expired initial state must not disable the dialog logout');
await page.evaluate(()=>{window.expired=false;window.session={uid:'qa',account:'qa@example.test'};const frame=document.createElement('iframe');frame.src='/child';document.body.append(frame)});

await page.waitForFunction(()=>document.querySelector('iframe').contentWindow?.MagicJAccount);
await page.evaluate(()=>MagicJAccount.openLogin());
await page.frames()[1].evaluate(()=>MagicJAccount.register({beforeLeave:async()=>{throw Error('周历草稿未保存')},sync:async()=>{throw Error('读取云端失败')}}));
await page.locator('#mj-login [data-account-logout]').click();await page.waitForFunction(()=>document.querySelector('#mj-login [role=alert]').textContent.includes('周历草稿'));assert.equal(await page.evaluate(()=>window.logouts),2);
await page.locator('#mj-login [data-account-sync]').click();await page.waitForFunction(()=>document.querySelector('#mj-login [role=alert]').textContent.includes('读取云端失败'));assert.doesNotMatch(await page.locator('#mj-login [role=alert]').innerText(),/同步完成/);
await page.locator('#mj-login [data-close]').click();await page.frameLocator('iframe').locator('[data-calendar-login]').click();await page.locator('#mj-login[open]').waitFor();assert.equal(await page.frameLocator('iframe').locator('#mj-login').evaluate(d=>d.open),false);assert.equal(page.url(),url);
await page.close();}console.log('PASS current-page entry, same-account recovery with draft, guarded logout, expired sync, iframe propagation and desktop/mobile');}finally{await browser.close();await new Promise(r=>server.close(r))}



