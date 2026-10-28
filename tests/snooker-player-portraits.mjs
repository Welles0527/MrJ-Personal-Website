import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.SNOOKER_PREVIEW || 'http://127.0.0.1:8776/snooker-calendar/index.html';
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
try {
  const context = await browser.newContext();
  await context.addInitScript(() => localStorage.setItem('cue-calendar-tour-v1', '1'));
  await context.route('**/cloud-live-scores.js', route => route.fulfill({ contentType: 'application/javascript', body: 'window.CUE_LOAD_CLOUD_SCORES=async()=>null;' }));
  await context.route('**/cloudbase.full.js', route => route.fulfill({ contentType: 'application/javascript', body: '' }));
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + '?theme=neon&view=year', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.CUE_GET_EVENT_PLAYERS?.('shenzhen').length > 0);
  const inventory = await page.evaluate(() => ({
    years: Object.keys(rankingYears), urls: [...new Set(Object.values(playerPhotos))],
    entrants: [...new Set(Object.keys(CUE_LIVE_SCORES.events).flatMap(id => CUE_GET_EVENT_PLAYERS(id).map(player => player.en)))],
    unresolved: Object.values(rankingYears).flatMap(year => year.players).filter(name => !CUE_PLAYER_PHOTO(name)),
  }));
  assert.deepEqual(inventory.unresolved, []);
  const failures = await page.evaluate(async urls => {
    const failures = [];
    let index = 0;
    await Promise.all(Array.from({ length: 5 }, async () => {
      while (index < urls.length) {
        const url = urls[index++];
        const img = new Image();
        img.referrerPolicy = 'no-referrer';
        img.src = url;
        let timer;
        try {
          await Promise.race([img.decode(), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('image timeout')), 20000); })]);
          if (!img.naturalWidth) throw new Error('empty image');
        } catch (error) { failures.push({ url, error: error.message }); }
        finally { clearTimeout(timer); }
      }
    }));
    return failures;
  }, inventory.urls);
  assert.deepEqual(failures, []);
  console.log(`PASS all ${inventory.urls.length} portrait files decoded as real images`);
  for (const year of inventory.years) {
    await page.evaluate(year => { state.nav = 'rankings'; state.rankingYear = Number(year); render(); }, year);
    assert.equal(await page.locator('.rank-avatar img').count(), 16, `year ${year}`);
    await page.locator('.rank-avatar img').evaluateAll(images => Promise.all(images.map(img => { img.loading = 'eager'; return img.decode(); })));
    assert.equal(await page.locator('.rank-avatar img').evaluateAll(images => images.every(img => img.naturalWidth > 0 && !img.src.includes('placeholder'))), true);
    await page.evaluate(() => { applyOfficialPlayerPhotos(); applyOfficialPlayerPhotos(); });
    assert.equal(await page.locator('.rank-avatar img').count(), 16, 'photo application is idempotent');
  }
  assert.equal(await page.evaluate(names => names.every(name => Boolean(CUE_PLAYER_PHOTO(name))), inventory.entrants), true);
  assert.equal(await page.evaluate(() => CUE_PLAYER_PHOTO("Ronnie O'Sullivan") === CUE_PLAYER_PHOTO('Ronnie O’Sullivan') &&
    CUE_PLAYER_PHOTO('Artemijs Žižins') === CUE_PLAYER_PHOTO('Artemijs Zizins') && !CUE_PLAYER_PHOTO('Winner of Match 123')), true);
  for (const [width, height] of [[1440, 900], [390, 844]]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => { state.nav = 'rankings'; state.rankingYear = 2024; render(); });
    await page.locator('.rank-avatar img').evaluateAll(images => Promise.all(images.map(img => { img.loading = 'eager'; return img.decode(); })));
    await page.getByRole('listitem').filter({ hasText: 'Gary Wilson' }).scrollIntoViewIfNeeded();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `.private/rank-portraits-${width}.png` });
    const credits = page.getByRole('link', { name: '头像来源与授权 ↗' });
    assert.equal(await credits.count(), 1);
    assert.equal(await credits.getAttribute('href'), './assets/portraits/credits.html');
  }
  await page.goto(new URL('./assets/portraits/credits.html', base).href, { waitUntil: 'domcontentloaded' });
  await page.locator('article img').evaluateAll(images => Promise.all(images.map(img => img.decode())));
  assert.equal(await page.locator('article').count(), 10);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: '.private/historical-portraits-credits.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log(`PASS ${inventory.urls.length} real images decoded; ${inventory.years.length} ranking years have 16 photos each; ${inventory.entrants.length} named event entrants covered; aliases, repeated rendering, desktop/mobile and credits verified`);
} finally { await browser.close(); }
