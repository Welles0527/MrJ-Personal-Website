import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';
const require = createRequire(import.meta.url);
const { createHandler } = require('../cloudfunctions/referee-likes/index.js');
const votes = new Map();
const collection = {
  doc: id => ({ set: async value => votes.set(id, value) }),
  where: filter => {
    const rows = () => [...votes.values()].filter(row => Object.entries(filter).every(([key, value]) => row[key] === value));
    return { count: async () => ({ total: rows().length }), limit: () => ({ get: async () => ({ data: rows() }) }) };
  },
  aggregate: () => ({ group: () => ({ limit: () => ({ end: async () => {
    const counts = {};
    for (const row of votes.values()) counts[row.refereeId] = (counts[row.refereeId] || 0) + 1;
    return { data: Object.entries(counts).map(([_id, count]) => ({ _id, count })) };
  } }) }) })
};
const handler = createHandler({ collection: () => collection, command: { aggregate: { sum: () => 1 } } }, () => 'isolated-browser');
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
try {
  for (const [width, height] of [[1440, 900], [390, 844]]) {
    votes.clear();
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => localStorage.setItem('cue-calendar-tour-v1', '1'));
    await page.route('**/cloudbase.full.js', route => route.fulfill({ contentType: 'application/javascript', body:
      'window.cloudbase={init:()=>({auth:()=>({getSession:async()=>({data:{session:{access_token:"expired-test"}}}),refreshSession:async()=>({data:{session:{access_token:"renewed-test"}}})})})};' }));
    await page.route('**/cloud-live-scores.js', route => route.fulfill({ contentType: 'application/javascript', body: 'window.CUE_LOAD_CLOUD_SCORES=async()=>({});' }));
    let loseResponse = false;
    await page.route('**/web?env=*', async route => {
      const request = route.request().postDataJSON();
      assert.equal(request.function_name, 'referee-likes');
      if (request.access_token === 'expired-test') return route.fulfill({ json: { code: 'ACCESS_TOKEN_EXPIRED' } });
      const event = JSON.parse(request.request_data);
      const result = await handler(event);
      if (loseResponse && event.action === 'like') {
        loseResponse = false;
        return route.fulfill({ status: 503, body: 'Simulated lost response after saving' });
      }
      return route.fulfill({ json: { data: { response_data: JSON.stringify(result) } } });
    });
    await page.goto(process.env.SNOOKER_PREVIEW || 'http://127.0.0.1:8776/snooker-calendar/index.html?theme=neon&view=year', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-nav="records"]', { state: 'attached' });
    await page.evaluate(() => { state.nav = 'records'; render(); });
    assert.equal(await page.locator('main h1').textContent(), '荣誉纪录');
    assert.equal(await page.locator('.record-podium-card').count(), 3);
    assert.equal(await page.locator('.record-row').count(), 7);
    for (const photo of await page.locator('.record-panel img').all()) {
      await photo.scrollIntoViewIfNeeded();
      await photo.evaluate(img => img.decode());
      assert(await photo.evaluate(img => img.naturalWidth > 0 && !img.currentSrc.includes('placeholder')));
    }
    const champion = await page.locator('.champion').boundingBox();
    const runner = await page.locator('.runner-up').boundingBox();
    assert(width > 680 ? champion.x > runner.x && champion.y < runner.y : champion.y < runner.y);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: `.private/records-restored-${width}.png`, fullPage: true });
    await page.evaluate(() => { state.nav = 'referees'; render(); });
    const button = page.locator('[data-referee-like="zheng-weili"]');
    await button.waitFor();
    await page.waitForFunction(() => !document.querySelector('[data-referee-like="zheng-weili"]').disabled);
    await page.locator('#referee-search').fill('郑伟利');
    for (let count = 1; count <= 2; count++) {
      await button.click();
      await page.waitForFunction(expected => document.querySelector('[data-referee-like="zheng-weili"] span').textContent === String(expected), count);
      assert(await button.isEnabled());
    }
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.evaluate(() => { state.nav = 'referees'; render(); });
    await page.waitForFunction(() => document.querySelector('[data-referee-like="zheng-weili"] span').textContent === '2');
    await page.locator('#referee-search').fill('郑伟利');
    loseResponse = true;
    await button.click();
    await page.getByText('点赞未能确认保存，请重试；重复请求不会重复计数。', { exact: true }).waitFor();
    await button.click();
    await page.waitForFunction(() => document.querySelector('[data-referee-like="zheng-weili"] span').textContent === '3');
    assert.equal(votes.size, 3);
    await button.click();
    await page.waitForFunction(() => document.querySelector('[data-referee-like="zheng-weili"] span').textContent === '4');
    assert.equal(votes.size, 4);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: `.private/repeat-likes-${width}.png`, fullPage: true });
    console.log(`PASS ${width}: 10 real photos, podium layout, repeated likes, refresh persistence, expired-token recovery, lost-response replay, no overflow/errors`);
    await context.close();
  }
} finally { await browser.close(); }
