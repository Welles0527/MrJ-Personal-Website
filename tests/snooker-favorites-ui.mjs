import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import path from 'node:path';
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
  for(const width of [1440,390]) {
    const context=await browser.newContext({viewport:{width,height:width===1440?900:844}});
    await context.addInitScript(()=>localStorage.setItem('cue-calendar-tour-v1','1'));
    const page=await context.newPage();
    page.on('pageerror',error=>console.log('Page error:',error.message));
    await page.goto('http://127.0.0.1:4516/officialwebsite/snooker-calendar/index.html',{waitUntil:'domcontentloaded'});
    await page.locator('#snooker-favorites-cloud-status[data-status="local"]').waitFor({state:'attached'});
    await page.evaluate(()=>{state.nav='schedule';state.statuses=new Set(['upcoming','live','ended']);render();});
    const button=page.locator('[data-save]').first();
    const id=await button.getAttribute('data-save');
    await button.click();
    assert(await page.evaluate(id=>JSON.parse(localStorage.getItem('cue-favorites')||'[]').includes(id),id));
    assert(await page.evaluate(id=>!!JSON.parse(localStorage.getItem('snooker.cloud-favorites.v1:account:guest')||'{}').projected?.['tournament:'+id],id));
    assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
    if(process.env.SNOOKER_QA_EVIDENCE)await page.screenshot({path:path.join(process.env.SNOOKER_QA_EVIDENCE,'snooker-cloud-ui-'+width+'.png')});
    await page.goto('http://127.0.0.1:4516/officialwebsite/super-calendar/index.html#home',{waitUntil:'domcontentloaded'});
    await page.locator('#snooker-favorites-cloud-status[data-status="local"]').waitFor();
    await page.waitForFunction(id=>SuperCalendarHome.entries().some(e=>e.id==='cue:'+id),id);
    await page.locator('[data-view="month"]').first().click();
    await page.locator('#snooker-favorites-cloud-status[data-status="local"]').waitFor();
    assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
    if(process.env.SNOOKER_QA_EVIDENCE)await page.screenshot({path:path.join(process.env.SNOOKER_QA_EVIDENCE,'snooker-cloud-summary-ui-'+width+'.png')});
    await context.close();
  }
  console.log('PASS UI: actual generated bundle, favorite button and guest cache, summary entry, status after rerender, 1440x900 and 390x844');
} finally {await browser.close();}
