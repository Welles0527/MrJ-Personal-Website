import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';

const url = process.env.TODO_CACHE_TEST_URL || 'http://127.0.0.1:4332/officialwebsite/topics/space/planning/todo';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
// Exercise both the updated worker and an already-installed legacy worker.
const legacyWorker = execFileSync('git', ['show', 'c29f804:public/sw.js'], { encoding: 'utf8' });
const proxy = createServer(async (request, response) => {
  try {
    if (request.url.split('?')[0].endsWith('/sw.js')) {
      response.writeHead(200, { 'Content-Type': 'application/javascript', 'Cache-Control': 'no-store' });
      response.end(legacyWorker);
      return;
    }
    const upstream = await fetch(new URL(request.url, url));
    response.writeHead(upstream.status, { 'Content-Type': upstream.headers.get('content-type') || 'application/octet-stream' });
    response.end(Buffer.from(await upstream.arrayBuffer()));
  } catch {
    response.writeHead(502);
    response.end();
  }
});
await new Promise(resolve => proxy.listen(0, '127.0.0.1', resolve));
try {
 for (const testUrl of [url, `http://127.0.0.1:${proxy.address().port}${new URL(url).pathname}`]) {
  const page = await browser.newPage();
  await page.goto(testUrl);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(() => document.querySelector('[data-login-message]')?.textContent.includes('首次使用'));
  const poisoned = await page.evaluate(async () => {
    const key = (await caches.keys()).find(name => name.startsWith('j-space-assets-'));
    const cache = await caches.open(key);
    const request = (await cache.keys()).find(request => /\/site-auth\.[^/]+\.js$/.test(request.url));
    if (!request) throw new Error('Missing cached auth dependency');
    await cache.put(request, new Response('<!doctype html><title>stale fallback</title>', { headers: { 'Content-Type': 'text/html' } }));
    localStorage.setItem('todo-cache-regression-sentinel', 'preserve');
    return request.url;
  });
  await page.reload();
  await page.waitForFunction(() => document.querySelector('[data-login-message]')?.textContent.includes('首次使用'), null, { timeout: 15000 });
  assert.equal(await page.evaluate(() => localStorage.getItem('todo-cache-regression-sentinel')), 'preserve');
  // Recovery may evict the broken response; a missing entry is also safe.
  const type = await page.evaluate(async url => (await caches.match(url))?.headers.get('content-type'), poisoned);
  assert.ok(type === undefined || /javascript/.test(type), 'HTML must not survive in the auth script cache');
  console.log('Production build recovers from cached HTML at shared auth JS URL; local data preserved.');
  await page.close();
 }
 const offlineContext = await browser.newContext({ serviceWorkers: 'block' });
 const offlinePage = await offlineContext.newPage();
 let navigations = 0;
 offlinePage.on('framenavigated', frame => { if (frame === offlinePage.mainFrame()) navigations += 1; });
 await offlinePage.route('**/*todo-cloud*.js', route => route.abort('failed'));
 await offlinePage.goto(url);
 await offlinePage.waitForFunction(() => sessionStorage.getItem('mywebsite.todo-module-recovery.v1'));
 await offlinePage.waitForTimeout(2000);
 assert.equal(navigations, 2, 'persistent module failures must cause only one recovery reload');
 assert.equal(await offlinePage.locator('[data-action="forgot-password"]').isEnabled(), true);
 await offlineContext.close();
 console.log('Persistent network failure does not cause a reload loop.');
} finally {
  await browser.close();
  proxy.closeAllConnections();
  await new Promise(resolve => proxy.close(resolve));
}
