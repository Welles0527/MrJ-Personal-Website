import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import path from 'node:path';

const base = process.env.SNOOKER_SUMMARY_URL || 'http://127.0.0.1:4517/officialwebsite/';
const browser = await chromium.launch({channel:'chrome', headless:true});
try {
  for (const width of [1440,390]) {
    const context = await browser.newContext({viewport:{width,height:width===1440?900:844}});
    // Keep QA independent of live account, weather and match-score requests.
    await context.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
    await context.addInitScript(() => localStorage.setItem('cue-calendar-tour-v1','1'));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base+'super-calendar/index.html#home', {waitUntil:'domcontentloaded'});
    await page.waitForFunction(() => window.SuperCalendarHome?.entries().filter(e=>e.category==='斯诺克').length===32);
    const source = await page.evaluate(() => window.CUE_TOURNAMENTS.map(({id,name,start,end})=>({id:'cue:'+id,name,start,end})));
    const summary = () => page.evaluate(() => SuperCalendarHome.entries().filter(e=>e.category==='斯诺克').map(({id,name,start,end})=>({id,name,start,end})).sort((a,b)=>a.id.localeCompare(b.id)));
    const expected = source.toSorted((a,b)=>a.id.localeCompare(b.id));
    assert.deepEqual(await summary(), expected, 'all tournaments without favorites');
    assert.deepEqual(expected.find(e=>e.id==='cue:international'), {id:'cue:international',name:'国际锦标赛',start:'2026-10-31',end:'2026-11-07'});
    // Legacy favorites and individual matches must no longer feed the summary.
    await page.evaluate(() => {
      localStorage.setItem('cue-favorites',JSON.stringify(['international']));
      localStorage.setItem('cue-match-favorites',JSON.stringify({fixture:{eventId:'international',home:'QA Player A',away:'QA Player B',date:'2026-11-01',clock:'12:00'}}));
      localStorage.setItem('super-calendar-sports-favorites',JSON.stringify({legacy:{category:'斯诺克',name:'QA legacy',start:'2026-11-01',end:'2026-11-01'}}));
      state.page='home'; state.year=2026; state.view='month'; state.category='全部'; render();
    });
    assert.deepEqual(await summary(), expected);
    // Verify all dates, including both ends, across every month of the source year.
    for(let month=0;month<12;month++) {
      const cells = await page.evaluate(month => {
        state.month=month;render();
        return [...document.querySelectorAll('.summary-day[data-date]')].filter(el=>el.dataset.date).map(el=>({date:el.dataset.date,names:[...el.querySelectorAll('.summary-event')].map(e=>e.textContent.trim())}));
      },month);
      for(const cell of cells) {
        for(const tournament of source) assert.equal(cell.names.includes(tournament.name), tournament.start<=cell.date && cell.date<=tournament.end, `${tournament.name} on ${cell.date}`);
        assert(!cell.names.some(name=>/QA Player|QA legacy/.test(name)));
      }
    }
    await page.evaluate(()=>{state.view='year';render();});
    const annual = await page.evaluate(()=>[...document.querySelectorAll('.summary-annual [data-date]')].map(el=>({date:el.dataset.date,label:el.getAttribute('aria-label'),icons:el.querySelectorAll('.summary-type-icon').length,text:el.textContent.trim()})));
    for(const cell of annual) for(const tournament of source.filter(e=>e.start<=cell.date && cell.date<=e.end)) {
      assert(cell.label.includes(tournament.name));
      assert(cell.icons>0);
      assert(!cell.text.includes(tournament.name),'annual view uses icons, not event text');
    }
    if(process.env.SNOOKER_QA_EVIDENCE) await page.screenshot({path:path.join(process.env.SNOOKER_QA_EVIDENCE,`snooker-all-annual-${width}.png`)});
    await page.evaluate(()=>{localStorage.removeItem('cue-favorites');localStorage.removeItem('cue-match-favorites');localStorage.removeItem('super-calendar-sports-favorites');state.view='month';state.month=10;render();});
    assert.deepEqual(await summary(),expected,'clearing favorites does not remove tournaments');
    assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
    if(width===390) await page.locator('[data-date="2026-11-02"]').scrollIntoViewIfNeeded();
    if(process.env.SNOOKER_QA_EVIDENCE) await page.screenshot({path:path.join(process.env.SNOOKER_QA_EVIDENCE,`snooker-all-summary-${width}.png`)});
    await page.locator('[data-date="2026-11-01"] .summary-event').filter({hasText:'国际锦标赛'}).click();
    await page.waitForURL(url=>url.hash==='#sports');
    await page.goto(base+'snooker-calendar/index.html',{waitUntil:'domcontentloaded'});
    assert.deepEqual(await page.evaluate(()=>events.map(({id,name,start,end})=>({id:'cue:'+id,name,start,end})).sort((a,b)=>a.id.localeCompare(b.id))),expected,'dedicated calendar shares identical schedule');
    await page.evaluate(()=>{state.nav='schedule';state.statuses=new Set(['upcoming','live','ended']);render();});
    const favorite=page.locator('[data-save]').first();
    const id=await favorite.getAttribute('data-save');
    await favorite.click();
    assert(await page.evaluate(id=>state.favorites.has(id),id));
    await page.locator(`[data-save="${id}"]`).first().click();
    assert(!await page.evaluate(id=>state.favorites.has(id),id));
    assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
    if(process.env.SNOOKER_QA_EVIDENCE) await page.screenshot({path:path.join(process.env.SNOOKER_QA_EVIDENCE,`snooker-all-dedicated-${width}.png`)});
    assert.deepEqual(errors,[]);
    await context.close();
  }
  console.log('PASS: 32 shared tournaments; every date in all 12 months; cross-month boundaries; icon-only year; no favorite/match dependence; dedicated favorite toggle; 1440x900 and 390x844');
} finally {await browser.close();}
