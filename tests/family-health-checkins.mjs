import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const source=await fs.readFile(new URL('../public/family-health.html',import.meta.url),'utf8');
for(const [,script] of source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) if(script.trim())new vm.Script(script);
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const errors=[];
try {
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 page.on('pageerror',e=>errors.push(e.message));
 // A fresh browser context owns only synthetic data; external account services are blocked.
 await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 await page.goto(process.env.FAMILY_HEALTH_PREVIEW||'http://127.0.0.1:4366/officialwebsite/family-health.html');
 await page.waitForFunction(()=>typeof state!=='undefined'&&state&&!accountChecking);
 await page.evaluate(async()=>{state=emptyAccountState();ensureFamilyProfiles(state);state.meds=[{id:'qa-med',pid:'dad',name:'测试用药',dose:'每次 1 片，每日 2 次（测试数据）',times:'08:00,20:00',daily:2,stock:20,unit:'片',start:'2026-01-01',status:'active',key:''},{id:'qa-stopped',pid:'dad',name:'已停用测试药',dose:'测试',times:'09:00',daily:1,stock:1,unit:'片',start:'2026-01-01',status:'stopped',key:''},{id:'qa-mom',pid:'mom',name:'另一位家人用药',dose:'测试剂量',times:'10:00',daily:1,stock:1,unit:'片',start:'2026-01-01',status:'active',key:''}];state.settings={navOrder:['dashboard','visits','timeline','meds','reports','notes','admissions','surgery','daily']};await writeDB();render();});
 assert.equal(await page.evaluate(()=>navOrder().indexOf('checkins')),await page.evaluate(()=>navOrder().indexOf('daily')+1));
 await page.locator('.nav-item[data-page=checkins]').click();
 assert.equal(await page.locator('.checkin-card').count(),4);
 await page.locator('[data-key=fingers]').click();
 await page.waitForFunction(()=>!savingArchive&&checkinDone('exercise','fingers'));
 await page.reload();await page.waitForFunction(()=>state&&!accountChecking);
 await page.locator('.nav-item[data-page=checkins]').click();
 assert.equal(await page.locator('[data-key=fingers]').getAttribute('aria-pressed'),'true');
 await page.locator('[data-key=fingers]').click();await page.waitForFunction(()=>!savingArchive);
 assert.equal(await page.locator('[data-key=fingers]').getAttribute('aria-pressed'),'false');
 await page.locator('[data-key=knees]').click();await page.waitForFunction(()=>!savingArchive);
 const oldDay=await page.evaluate(()=>shift(-1));
 await page.locator('#checkin-date').fill(oldDay);await page.locator('#checkin-date').dispatchEvent('change');
 assert.equal(await page.locator('[data-key=knees]').getAttribute('aria-pressed'),'false');
 await page.locator('[data-key=breathing]').click();await page.waitForFunction(()=>!savingArchive);
 await page.locator('[data-action=checkin-today]').click();
 assert.equal(await page.locator('[data-key=knees]').getAttribute('aria-pressed'),'true');
 await page.locator('[data-tab=water]').click();assert.equal(await page.locator('.checkin-card').count(),9);
 assert.deepEqual(await page.locator('.checkin-card strong').allTextContents(),Array.from({length:9},(_,i)=>`第 ${i+1} 次`));
 assert.equal(await page.locator('.checkin-card small').filter({hasText:'每次 200 ml'}).count(),9);assert.equal(/\d{2}:\d{2}/.test(await page.locator('.checkin-panel').innerText()),false);assert.equal(await page.locator('.checkin-tabs .checkin-person-icon').count(),3);
 await page.locator('[data-key="05:00"]').click();await page.waitForFunction(()=>!savingArchive);
 await page.evaluate(()=>{person='mom';render();});assert.equal(await page.locator('[data-key="05:00"]').getAttribute('aria-pressed'),'false');
 await page.evaluate(()=>{person='dad';render();});assert.equal(await page.locator('[data-key="05:00"]').getAttribute('aria-pressed'),'true');
 await page.locator('[data-tab=meds]').click();assert.equal(await page.locator('.checkin-med').count(),1);
 assert.match(await page.locator('.checkin-dose').innerText(),/每次 1 片/);
 await page.locator('[data-action=checkin-med][data-slot="08:00"]').click();await page.waitForFunction(()=>!savingArchive);
 await page.locator('.checkin-med-heading [data-page=meds]').click();
 assert.equal(await page.locator('[data-action=take][data-id=qa-med][data-slot="08:00"]').getAttribute('class'),'check-btn done');
 await page.locator('[data-action=take][data-id=qa-med][data-slot="08:00"]').click();await page.waitForFunction(()=>!savingArchive);
 await page.locator('.nav-item[data-page=checkins]').click();assert.equal(await page.locator('[data-action=checkin-med][data-slot="08:00"]').getAttribute('aria-pressed'),'false');
 await page.locator('[data-action=checkin-schedule]').click();
 await page.locator('#checkin-schedule-form [name=count]').fill('3');await page.locator('#checkin-schedule-form [name=count]').press('Tab');
 await page.locator('[name=slot]').nth(2).fill('22:00');
 await page.locator('[form=checkin-schedule-form]').click();await page.waitForFunction(()=>!savingArchive&&state.meds[0].times==='08:00,20:00,22:00');
 assert.equal(await page.locator('[data-action=checkin-med]').count(),3);
 assert.equal(await page.evaluate(()=>state.meds[0].daily),2); // Never reinterpret stock consumption as dose count.
 await page.locator('[data-action=checkin-schedule]').click();await page.locator('[name=slot]').nth(1).fill('08:00');
 await page.locator('[form=checkin-schedule-form]').click();await page.waitForFunction(()=>document.querySelector('#form-error')?.textContent.includes('不能重复'));
 assert.equal(await page.evaluate(()=>state.meds[0].times),'08:00,20:00,22:00');
 await page.locator('.modal [data-action=close]').first().click();
 await page.evaluate(async()=>{await mutate(()=>{state.meds[0].status='stopped';});});assert.equal(await page.locator('.checkin-med').count(),0);
 await page.evaluate(async()=>{await mutate(()=>{state.meds[0].status='active';});});
 // Backup roundtrip and validation include check-in history.
 assert.equal(await page.evaluate(()=>{const raw={format:'jiaan-family-health-backup',schema:1,data:structuredClone(state),attachments:[]};const restored=validateBackup(raw);return JSON.stringify(restored.state.settings.dailyCheckins)===JSON.stringify(state.settings.dailyCheckins);}),true);
 assert.equal(await page.evaluate(()=>{const raw={format:'jiaan-family-health-backup',schema:1,data:structuredClone(state),attachments:[]};raw.data.settings.dailyCheckins[0].key='invalid';try{validateBackup(raw);return false;}catch{return true;}}),true);
 // Simulated persistence failure must roll back and allow retry.
 await page.locator('[data-tab=exercise]').click();
 await page.evaluate(()=>{window.checkinOriginalWrite=writeDB;writeDB=async()=>{throw Error('测试保存失败');};});
 await page.locator('[data-key=stretch]').click();await page.waitForFunction(()=>!savingArchive&&document.querySelector('#toast').textContent==='测试保存失败');
 assert.equal(await page.evaluate(()=>checkinDone('exercise','stretch')),false);
 assert.equal(await page.locator('[data-key=stretch]').isEnabled(),true);
 await page.evaluate(()=>{writeDB=window.checkinOriginalWrite;});
 await page.locator('[data-key=stretch]').click();await page.waitForFunction(()=>!savingArchive&&checkinDone('exercise','stretch'));
 // Custom exercise settings: save, cancel, notes, account member isolation and backup.
 await page.locator('[data-action=exercise-settings]').click();
 await page.locator('[name=exerciseNote]').first().fill('缓慢张开手掌，再握拳。\n按自己的节奏练习。');
 await page.locator('[data-action=exercise-add]').click();
 await page.locator('[name=exerciseName]').last().fill('散步');
 await page.locator('[name=exerciseNote]').last().fill('饭后慢走 <10分钟> & 记录感受');
 await page.locator('[form=exercise-settings-form]').click();
 await page.waitForFunction(()=>!savingArchive&&checkinExercises().length===5);
 assert.equal(await page.locator('.checkin-card').count(),5);
 assert.match(await page.locator('.checkin-card').first().innerText(),/缓慢张开手掌/);
 const custom=page.locator('.checkin-card').filter({hasText:'散步'});
 assert.match(await custom.innerText(),/饭后慢走 <10分钟> & 记录感受/);
 await custom.click();await page.waitForFunction(()=>!savingArchive);
 const customId=await custom.getAttribute('data-key');
 assert.equal(await custom.getAttribute('aria-pressed'),'true');
 await page.locator('[data-action=exercise-settings]').click();
 await page.locator('[name=exerciseName]').last().fill('散步练习');
 await page.locator('[form=exercise-settings-form]').click();
 await page.waitForFunction(()=>!savingArchive&&checkinExercises().some(x=>x.name==='散步练习'));
 assert.equal(await page.locator(`[data-key="${customId}"]`).getAttribute('aria-pressed'),'true');
 await page.locator('[data-action=exercise-settings]').click();
 await page.locator('[data-action=exercise-add]').click();
 await page.locator('[name=exerciseName]').last().fill('散步练习');
 await page.locator('[form=exercise-settings-form]').click();
 await page.waitForFunction(()=>document.querySelector('#form-error')?.textContent.includes('不能重复'));
 await page.locator('.modal [data-action=close]').first().click();
 assert.equal(await page.locator('.checkin-card').count(),5);
 await page.evaluate(()=>{person='mom';render();});
 assert.equal(await page.locator('.checkin-card').count(),4);
 assert.equal(await page.locator('.exercise-note').count(),0);
 await page.evaluate(()=>{person='dad';render();});
 assert.equal(await page.evaluate(()=>{const raw={format:'jiaan-family-health-backup',schema:1,data:structuredClone(state),attachments:[]};const restored=validateBackup(raw);return restored.state.settings.dailyExercises.dad.length===5&&restored.state.settings.dailyCheckins.some(r=>r.key.startsWith('exercise-'));}),true);
 await page.reload();await page.waitForFunction(()=>state&&!accountChecking);
 await page.locator('.nav-item[data-page=checkins]').click();
 assert.equal(await page.locator('.checkin-card').count(),5);
 assert.equal(await page.locator(`[data-key="${customId}"]`).getAttribute('aria-pressed'),'true');
 assert.match(await page.locator('.checkin-card').first().innerText(),/缓慢张开手掌/);
 // All sections and the schedule dialog at required viewport sizes.
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:width===1440?900:844});
  for(const tab of ['exercise','water','meds']){
   await page.locator(`[data-tab=${tab}]`).click();await page.waitForTimeout(220);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${width}/${tab} overflow`);
   const box=await page.locator('.checkin-panel').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1);
   await page.screenshot({path:`D:/UserTemp/huawei/family-checkins-${tab}-${width}.png`,fullPage:true});
  }
  await page.locator('[data-tab=exercise]').click();
  await page.locator('[data-action=exercise-settings]').click();await page.waitForTimeout(180);
  const exerciseBox=await page.locator('.modal').boundingBox();assert.ok(exerciseBox.x>=0&&exerciseBox.x+exerciseBox.width<=width+1);
  assert.equal(await page.locator('.modal').evaluate(el=>el.scrollWidth>el.clientWidth),false);
  await page.screenshot({path:`D:/UserTemp/huawei/family-checkins-exercise-settings-${width}.png`});
  await page.locator('.modal [data-action=close]').first().click();
  await page.locator('[data-tab=meds]').click();
  await page.locator('[data-action=checkin-schedule]').click();await page.waitForTimeout(180);
  const box=await page.locator('.modal').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1);
  await page.screenshot({path:`D:/UserTemp/huawei/family-checkins-settings-${width}.png`});
  await page.locator('.modal [data-action=close]').first().click();
  if(width===390){await page.locator('[data-action=mobile-nav]').click();await page.locator('.nav-item[data-page=checkins]').click();assert.equal(await page.evaluate(()=>mobileOpen),false);}
 }
 await page.reload();await page.waitForFunction(()=>state&&!accountChecking);
 assert.equal(await page.evaluate(()=>state.meds[0].times),'08:00,20:00,22:00');
 assert.equal(await page.evaluate(()=>state.settings.dailyCheckins.some(r=>r.key==='stretch')),true);
 // Per-member check-in categories and exercise selection use the actual settings form.
 await page.setViewportSize({width:390,height:844});
 await page.locator('[data-action=mobile-nav]').click();await page.locator('.nav-item[data-page=checkins]').click();
 await page.locator('[data-action=checkin-choices]').click();
 await page.locator('[name=category][value=water]').uncheck();
 await page.locator('[name=category][value=meds]').uncheck();
 for(const id of ['knees','breathing','stretch'])await page.locator(`[name=exerciseId][value="${id}"]`).uncheck();
 await page.locator('[form=checkin-choices-form]').click();
 await page.waitForFunction(()=>!savingArchive&&checkinChoices().categories.length===1);
 assert.equal(await page.locator('.checkin-tab').count(),1);
 assert.equal(await page.locator('.checkin-card').count(),2);
 assert.equal(await page.locator(`[data-key="${customId}"]`).getAttribute('aria-pressed'),'true');
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:width===1440?900:844});
  await page.waitForTimeout(180);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:`D:/UserTemp/huawei/family-checkins-selected-${width}.png`,fullPage:true});
  await page.locator('[data-action=checkin-choices]').click();await page.waitForTimeout(180);
  const bounds=await page.locator('.modal').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width+1);
  assert.equal(await page.locator('.modal').evaluate(el=>el.scrollWidth>el.clientWidth),false);
  await page.screenshot({path:`D:/UserTemp/huawei/family-checkins-choices-${width}.png`});
  await page.locator('.modal [data-action=close]').first().click();
 }
 // Switch using the existing family selector, which returns to overview.
 await page.locator('[data-action=mobile-nav]').click();
 await page.locator('#family-person-filter').selectOption('mom');
 await page.locator('[data-action=mobile-nav]').click();await page.locator('.nav-item[data-page=checkins]').click();
 assert.equal(await page.locator('.checkin-tab').count(),3);
 assert.equal(await page.locator('.checkin-card').count(),4);
 await page.locator('[data-action=checkin-choices]').click();
 await page.locator('[name=category][value=exercise]').uncheck();await page.locator('[name=category][value=meds]').uncheck();
 await page.locator('[form=checkin-choices-form]').click();await page.waitForFunction(()=>!savingArchive&&checkinTab==='water');
 assert.equal(await page.locator('.checkin-card').count(),9);
 assert.equal(await page.locator('.checkin-card.is-done').count(),0);
 await page.reload();await page.waitForFunction(()=>state&&!accountChecking);
 await page.locator('[data-action=mobile-nav]').click();await page.locator('.nav-item[data-page=checkins]').click();
 assert.equal(await page.locator('.checkin-card').count(),2);
 assert.equal(await page.locator(`[data-key="${customId}"]`).getAttribute('aria-pressed'),'true');
 assert.deepEqual(await page.evaluate(()=>checkinChoices('mom').categories),['water']);
 // Disable everything without losing stored records, then restore selection.
 const recordsBefore=await page.evaluate(()=>JSON.stringify(state.settings.dailyCheckins));
 await page.locator('[data-action=checkin-choices]').click();await page.locator('[name=category][value=exercise]').uncheck();
 await page.locator('[form=checkin-choices-form]').click();await page.waitForFunction(()=>!savingArchive&&checkinChoices().categories.length===0);
 assert.equal(await page.locator('.checkin-tab').count(),0);
 assert.match(await page.locator('.checkin-panel').innerText(),/尚未选择打卡项目/);
 assert.equal(await page.evaluate(()=>JSON.stringify(state.settings.dailyCheckins)),recordsBefore);
 await page.locator('[data-action=checkin-choices]').click();await page.locator('[name=category][value=exercise]').check();
 await page.locator('[name=exerciseId][value=knees]').check();
 await page.locator('[form=checkin-choices-form]').click();await page.waitForFunction(()=>!savingArchive&&checkinChoices().categories.length===1);
 assert.equal(await page.locator('[data-key=knees]').getAttribute('aria-pressed'),'true');
 assert.equal(await page.evaluate(()=>{const raw={format:'jiaan-family-health-backup',schema:1,data:structuredClone(state),attachments:[]};return JSON.stringify(validateBackup(raw).state.settings.dailyCheckinChoices)===JSON.stringify(state.settings.dailyCheckinChoices);}),true);
 assert.equal(await page.evaluate(()=>{const raw={format:'jiaan-family-health-backup',schema:1,data:structuredClone(state),attachments:[]};raw.data.settings.dailyCheckinChoices.dad.exerciseIds.push('missing-exercise');try{validateBackup(raw);return false;}catch{return true;}}),true);
 assert.deepEqual(errors,[]);
 console.log('PASS: syntax, navigation, exercise/water (9 x 200 ml, no time labels, human icons), dates, member isolation, reload persistence, medication linkage, frequency settings, stopped medication, backup, custom exercise names/notes and saved check-in stability, failed-save rollback, per-member category/exercise selection, hidden record restoration, desktop/mobile layouts.');
} finally {await browser.close();}
