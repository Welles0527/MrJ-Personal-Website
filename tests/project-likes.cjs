const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { createHandler } = require('../cloudfunctions/home-visits/index.js');

(async () => {
  assert.equal(typeof createHandler, 'function', 'The public endpoint must expose persistent project likes, not just browser-local 0/1 state');
  const rows = new Map([['home', { count: 17 }]]);
  const db = {
    command: { inc: value => value },
    collection: name => {
      assert.equal(name, 'site_metrics');
      return {
        doc: id => ({
          set: async value => { rows.set(id, value); },
          get: async () => ({ data: rows.has(id) ? [rows.get(id)] : [] }),
          update: async value => { const row = rows.get(id); if (!row) return { updated: 0 }; row.count += value.count; return { updated: 1 }; }
        }),
        where: filter => ({ count: async () => ({ total: [...rows.values()].filter(row => Object.entries(filter).every(([key, value]) => row[key] === value)).length }) })
      };
    }
  };
  const handle = createHandler(db);
  const call = async event => { const result = await handle(event); return { status: result.statusCode, ...JSON.parse(result.body) }; };
  const list = () => call({ httpMethod: 'GET', queryStringParameters: { metric: 'project-likes' } });
  const like = (projectId, requestId) => call({ httpMethod: 'POST', queryStringParameters: { metric: 'project-likes' }, body: JSON.stringify({ projectId, requestId }) });
  let result = await list(); assert.equal(result.status, 200); assert.equal(result.counts.travel, 0); assert.equal(Object.keys(result.counts).length, 6);
  const first = randomUUID();
  await Promise.all(Array.from({ length: 8 }, () => like('travel', first)));
  assert.equal((await list()).counts.travel, 1, 'Concurrent replay of one click must only add one');
  await Promise.all(Array.from({ length: 6 }, () => like('travel', randomUUID())));
  assert.equal((await list()).counts.travel, 7, 'Distinct clicks must accumulate');
  assert.equal((await like('bible', randomUUID())).count, 1);
  assert.equal((await list()).counts.travel, 7);
  assert.equal((await like('made-up', randomUUID())).status, 400);
  assert.equal((await like('travel', 'invalid')).status, 400);
  assert.equal((await call({ httpMethod: 'POST', queryStringParameters: { metric: 'project-likes' }, body: '{' })).status, 400);
  assert.equal((await call({ httpMethod: 'POST', queryStringParameters: { metric: 'unknown' } })).status, 400);
  assert.equal((await call({ httpMethod: 'DELETE', queryStringParameters: { metric: 'project-likes' } })).status, 405);
  assert.equal((await call({ httpMethod: 'GET' })).count, 17);
  assert.equal((await call({ httpMethod: 'POST' })).count, 18);
  assert.equal((await list()).counts.travel, 7, 'Page views must not change likes');
  const broken = createHandler({ collection() { throw Error('database unavailable'); } });
  assert.equal((await broken({ httpMethod: 'GET', queryStringParameters: { metric: 'project-likes' } })).statusCode, 503);
  assert.equal(rows.get('home').count, 18);
  console.log('PASS six persistent project counts, distinct clicks, concurrent idempotent replay, project isolation, validation, database failure, and unchanged visit counting');
  const http = require('node:http');
  const fs = require('node:fs/promises');
  const path = require('node:path');
  const { chromium } = require('playwright');
  const publicRoot = path.resolve(__dirname, '../public');
  let failNextPost = false;
  let delayNextList = false;
  const posts = [];
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/officialwebsite/api/home-visits') {
      const chunks = []; for await (const chunk of req) chunks.push(chunk);
      const body = Buffer.concat(chunks).toString();
      if (req.method === 'POST' && url.searchParams.get('metric') === 'project-likes') posts.push(JSON.parse(body));
      const result = await handle({ httpMethod: req.method, queryStringParameters: Object.fromEntries(url.searchParams), body });
      if (req.method === 'POST' && failNextPost) { failNextPost = false; res.writeHead(503, { 'Content-Type': 'application/json' }); res.end('{"error":"Simulated acknowledgement failure after commit"}'); return; }
      if (req.method === 'GET' && delayNextList && url.searchParams.has('metric')) { delayNextList = false; await new Promise(resolve => setTimeout(resolve, 1000)); }
      res.writeHead(result.statusCode, result.headers); res.end(result.body); return;
    }
    const relative = url.pathname === '/' ? 'homepage-root.html' : url.pathname.replace(/^\/officialwebsite\//, '').replace(/^\//, '');
    const file = path.resolve(publicRoot, relative);
    if (!file.startsWith(publicRoot + path.sep)) { res.writeHead(403); res.end(); return; }
    try {
      const mime = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }[path.extname(file)];
      const data = await fs.readFile(file); res.writeHead(200, { 'Content-Type': mime || 'application/octet-stream' }); res.end(data);
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const [width, height] of [[1440, 900], [390, 844]]) {
      const context = await browser.newContext({ viewport: { width, height } });
      await context.addInitScript(() => { localStorage.setItem('magicj.visit.exclude', '1'); localStorage.setItem('mrj-project-likes', '{"travel":true}'); });
      await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
      const page = await context.newPage();
      const before = (await list()).counts.travel;
      await page.goto(base, { waitUntil: 'domcontentloaded' });
      await page.locator('#home-loader').waitFor({ state: 'hidden' });
      const button = page.locator('[data-project="travel"] .project-like');
      const count = button.locator('.project-like-count');
      await page.waitForFunction(value => document.querySelector('[data-project="travel"] .project-like-count').textContent === String(value), before);
      for (let i = 1; i <= 2; i++) { await button.click(); await page.waitForFunction(value => document.querySelector('[data-project="travel"] .project-like-count').textContent === String(value), before + i); }
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForFunction(value => document.querySelector('[data-project="travel"] .project-like-count').textContent === String(value), before + 2);
      failNextPost = true;
      await button.click();
      await page.waitForFunction(() => document.querySelector('.project-like-hint').textContent.includes('尚未确认'));
      assert.equal(await count.textContent(), String(before + 2));
      assert.equal((await list()).counts.travel, before + 3);
      const lost = posts.at(-1);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await button.click();
      await page.waitForFunction(() => document.querySelector('[data-project="travel"] .project-like').getAttribute('aria-busy') === 'false');
      assert.equal(posts.at(-1).requestId, lost.requestId, 'Reload must preserve the unconfirmed click ID');
      assert.equal((await list()).counts.travel, before + 3, 'A replay after a lost response must not add a second vote');
      delayNextList = true;
      await page.evaluate(() => window.dispatchEvent(new Event('focus')));
      await page.waitForTimeout(100);
      await button.click();
      await page.waitForFunction(value => document.querySelector('[data-project="travel"] .project-like-count').textContent === String(value), before + 4);
      await page.waitForTimeout(1100);
      assert.equal(await count.textContent(), String(before + 4), 'A stale list response must not replace a newly confirmed count');
      await page.evaluate(() => { Storage.prototype.setItem = () => { throw Error('Storage blocked'); }; });
      await button.click();
      await page.waitForFunction(value => document.querySelector('[data-project="travel"] .project-like-count').textContent === String(value), before + 5);
      const second = await browser.newContext({ viewport: { width, height } });
      await second.addInitScript(() => localStorage.setItem('magicj.visit.exclude', '1'));
      await second.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
      const other = await second.newPage(); await other.goto(base, { waitUntil: 'domcontentloaded' });
      await other.waitForFunction(value => document.querySelector('[data-project="travel"] .project-like-count').textContent === String(value), before + 5);
      if (process.env.PROJECT_LIKES_EVIDENCE_DIR) {
        await button.scrollIntoViewIfNeeded();
        await page.locator('[data-project="travel"]').screenshot({ path: path.join(process.env.PROJECT_LIKES_EVIDENCE_DIR, `fixed-${width}.png`) });
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.equal(rows.get('home').count, 18, 'Likes must not increment page views');
      await second.close(); await context.close();
      console.log(`PASS ${width}x${height}: real page clicks, persistence, another browser, lost response replay, stale reads, blocked local storage, and layout`);
    }
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error.stack); process.exit(1); });
