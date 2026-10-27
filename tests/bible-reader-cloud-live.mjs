// Writes only a new, disposable document under the independent QA account.
import {chromium} from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const credentials=JSON.parse(fs.readFileSync(process.env.ACCOUNT_TEST_CREDENTIALS,'utf8'));
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try {
 const page=await browser.newPage();
 await page.route('**/__cloud-live-check',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>QA</title>'}));
 await page.goto('http://127.0.0.1:4417/officialwebsite/__cloud-live-check');
 const result=await page.evaluate(async credentials=>{
  const auth=await import('/officialwebsite/src/scripts/site-auth.ts');
  const {createBibleReaderCloudStore}=await import('/officialwebsite/src/scripts/bible-reader-cloud-store.ts');
  const session=await auth.signInWithPassword(credentials.email,credentials.password);
  if(session.account==='49001422@qq.com')throw new Error('Personal account prohibited for write test');
  const collection=auth.getCloudDb().collection('officialWebsiteBibleReaderState');
  const id='auth-repair-qa-'+crypto.randomUUID();const ref=collection.doc(id);
  const store=createBibleReaderCloudStore({getDocumentRef:()=>({get:()=>ref.get(),set:p=>ref.set(p),update:p=>ref.update(p),updateIfUnchanged:(p,v)=>collection.where({_id:id,updatedAt:v}).update(p)})});
  let created=false;
  try {
   await store.load(session.uid);
   const now=new Date().toISOString();const snapshot={lastRead:{book:'heb',chapter:5,verse:1,updatedAt:now},bookmarks:[],notes:[],readVerses:['heb-5-1'],bookStatuses:{heb:'reading'},updatedAt:now};
   await store.save(session.uid,session.account,snapshot);created=true;
   await store.save(session.uid,session.account,{...snapshot,readVerses:['heb-5-1','heb-5-2'],updatedAt:new Date().toISOString()});
   const read=await store.load(session.uid);
   return {savedAndReadBack:read.readVerses.length===2};
  } finally {
   if(created){const removed=await ref.remove();if(removed.code||removed.error)throw new Error('QA document cleanup failed');}
  }
 },credentials);
 assert.equal(result.savedAndReadBack,true);console.log('PASS real CloudBase creation, conditional update, complete readback; QA document removed');
} finally {await browser.close();}
