import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base = process.env.ACCOUNT_TEST_BASE_URL || 'http://127.0.0.1:4424/officialwebsite';
const output = process.env.BACKUP_TEST_OUTPUT || 'D:/UserTemp/huawei/magicj-backup-evidence-20261028';
const routes = ['homepage-root.html','about.html','workstation.html','resume/','ai-bookshelf.html','coffee-field-guide-zh.html','coffee-order/',
  'topics/applications/inspiration-station/theology/','topics/applications/inspiration-station/theology/group-study/',
  'topics/space/planning/todo/','inspiration-studio.html','family-health.html','stock-tracking/','worship/',
  'topics/space/investing/funds/index.html','super-calendar/index.html#life','topics/space/travel/travel-map/','tools/dianping-favorites/'];
routes.push(...["books/quantum-dice.html","demos/bible-knowledge-demo/index.html","demos/bible-library-demo/index.html","demos/home-dark/index.html","demos/home-role-grid/index.html","j-water-loading-05639c577589.html","logo-motion/bavi-shanghai/logo_motion.html"]);
const browser = await chromium.launch({channel:'chrome',headless:true});
const results=[];
try {
  for (const width of [1440,390]) {
    const context = await browser.newContext({viewport:{width,height:width===1440?900:844}});
    const page = await context.newPage();
    // Native modules may open login asynchronously after the reminder mounts.
    // Close the real login using its visible cancel button before interacting.
    await page.addLocatorHandler(page.locator('#mj-login[open]'), async dialog => {
      await dialog.locator('[data-close]').click();
    });
    await page.clock.setFixedTime(new Date('2026-11-02T02:00:00Z'));
    for (const route of routes) {
      console.log('CHECK',width,route);
      await page.goto(base+'/'+route,{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>window.MagicJAccount);
      await page.evaluate(()=>{
        document.querySelectorAll('dialog[open]:not(.mj-backup-reminder)').forEach(dialog=>dialog.close());
        if (!document.querySelector('.mj-backup-reminder[open]')) {
          localStorage.removeItem('magicj.all-cloud-backup.reminded-monday.v1'); window.dispatchEvent(new Event('focus'));
        }
      });
      const dialog=page.locator('.mj-backup-reminder[open]');
      await dialog.waitFor({state:'visible',timeout:10000});
      const box=await dialog.boundingBox();
      assert.ok(box&&box.x>=0&&box.y>=0&&box.x+box.width<=width&&box.y+box.height<=(width===1440?900:844),route+' reminder bounds');
      assert.ok((await dialog.innerText()).includes('赞美诗歌'));
      if (route==='homepage-root.html'||route.startsWith('super-calendar')) await page.screenshot({path:output+`/reminder-${route.startsWith('super')?'calendar':'home'}-${width}.png`});
      await dialog.locator('[data-later]').click();
      await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
      assert.equal(await page.locator('.mj-backup-reminder[open]').count(),0,'Monday dedup');
      results.push({width,route,reminder:true,bounds:true});
    }
    await page.goto(base+'/about.html',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.MagicJAccount);
    assert.equal(await page.locator('.mj-backup-reminder[open]').count(),0,'Cross-page dedup');
    await context.close();
  }
  const context=await browser.newContext(),page=await context.newPage();
  await page.clock.install({time:new Date('2026-11-01T15:59:30Z')});
  await page.goto(base+'/about.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.MagicJAccount);
  assert.equal(await page.locator('.mj-backup-reminder[open]').count(),0,'Sunday has no reminder');
  await page.evaluate(()=>{const dialog=document.createElement('dialog');dialog.id='qa-editing';document.body.append(dialog);dialog.showModal();});
  await page.clock.fastForward(61000);
  assert.equal(await page.locator('.mj-backup-reminder[open]').count(),0,'Do not interrupt another dialog');
  await page.evaluate(()=>{document.querySelector('#qa-editing').close();window.dispatchEvent(new Event('focus'));});
  await page.locator('.mj-backup-reminder[open]').waitFor();
  await page.locator('.mj-backup-reminder [data-later]').click();
  await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));
  await page.clock.setSystemTime(new Date('2026-11-08T15:59:30Z'));
  await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
  await page.clock.fastForward(61000);
  await page.locator('.mj-backup-reminder[open]').waitFor();
  await page.locator('.mj-backup-reminder [data-later]').click();
  await page.clock.setSystemTime(new Date('2026-11-15T15:59:30Z'));
  await page.evaluate(()=>Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'}));
  await page.clock.fastForward(61000);
  assert.equal(await page.locator('.mj-backup-reminder[open]').count(),0,'Hidden tab defers notification');
  await page.evaluate(()=>{delete document.visibilityState;document.dispatchEvent(new Event('visibilitychange'));});
  await page.locator('.mj-backup-reminder[open]').waitFor();
  results.push({crossMidnight:true,bfcacheNextWeek:true,editingDialogDeferred:true,visibleAgain:true});
  await context.close();
  fs.writeFileSync(output+'/reminder-results.json',JSON.stringify(results,null,2));
  console.log('PASS',results.length,'route/viewport and Beijing midnight/BFCache scenarios');
} finally { await browser.close(); }
