import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const url=process.env.BIBLE_URL||'http://127.0.0.1:4389/officialwebsite/topics/applications/inspiration-station/theology/?book=mat&chapter=23&verse=1';
const cases=[
  {voices:[{name:'Chinese Female',lang:'zh-CN'},{name:'Microsoft Yunyang Online',lang:'zh-CN'}],expected:'Microsoft Yunyang Online'},
  {voices:[{name:'Chinese Female',lang:'zh-CN'},{name:'Chinese Male',lang:'zh-CN'}],expected:'Chinese Male'},
  {voices:[{name:'Microsoft Kangkang',lang:'zh-CN'}],expected:'Microsoft Kangkang'},
  {voices:[{name:'Chinese Female',lang:'zh-CN'}],expected:null},
  {voices:[{name:'Default Chinese',lang:'zh-CN'},{name:'English Male',lang:'en-US'}],expected:null},
  {voices:[],expected:null}
];
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{for(const width of [1440,390])for(const test of cases){
  const context=await browser.newContext({viewport:{width,height:width===1440?900:844},hasTouch:width===390});
  await context.addInitScript(voices=>{
    window.__spoken=[];
    Object.defineProperty(window,'SpeechSynthesisUtterance',{value:class {constructor(text){this.text=text;}}});
    Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>voices,speak:u=>window.__spoken.push({voice:u.voice?.name,text:u.text}),cancel(){},pause(){},resume(){}}});
  },test.voices);
  await context.route('**/src/scripts/site-auth.ts*',r=>r.fulfill({contentType:'application/javascript',body:`export const getCloudSession=async()=>null;export const getRememberedSession=()=>null;export const getCloudDb=()=>({});export const cloudErrorMessage=(e,f)=>f;export const signOut=async()=>{};export const signInWithPassword=async()=>null;export const startEmailSignUp=async()=>null;`}));
  let requests=0;
  await context.route('**/api/bible-tts',r=>{requests++;return r.fulfill({status:503,body:'unavailable'});});
  const p=await context.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
  assert.equal((await p.goto(url,{waitUntil:'networkidle'})).status(),200);
  await p.waitForFunction(()=>document.querySelector('[data-bible-search-status]')?.textContent.includes('1189'));
  await p.locator('[data-action="read-chapter"]').click();await p.waitForTimeout(250);
  assert.equal(requests,2,'cloud male is retried before fallback');
  const spoken=await p.evaluate(()=>window.__spoken);
  assert.equal(spoken.length,test.expected?1:0);
  if(test.expected)assert.equal(spoken[0].voice,test.expected);
  else assert.match(await p.locator('[data-bible-toast]').innerText(),/没有可用的中文男声/);
  assert.deepEqual(errors,[]);
  console.log('PASS '+width+' '+(test.expected||'no male: stop, never use female/default'));
  await context.close();
}}finally{await browser.close();}
