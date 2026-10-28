import assert from 'node:assert/strict';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { chromium } from 'playwright';

const root = path.resolve('public');
const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/officialwebsite/api/home-visits') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end('{"count":1234}');
    return;
  }
  const relative = pathname === '/' ? 'homepage-root.html' : pathname.replace(/^\/officialwebsite\//, '').replace(/^\//, '');
  const file = path.resolve(root, relative);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  try {
    const data = await readFile(file);
    const mime = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }[path.extname(file)];
    res.writeHead(200, { 'Content-Type': mime || 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const position = page => page.evaluate(() => {
  const counter = document.querySelector('.home-visit-counter').getBoundingClientRect();
  const intro = document.querySelector('.hero-intro').getBoundingClientRect();
  const nav = document.querySelector('#main-navigation').getBoundingClientRect();
  return { x: counter.left, y: counter.top, bottom: counter.bottom, documentTop: counter.top + scrollY, introLeft: intro.left, navBottom: nav.bottom, visible: getComputedStyle(document.querySelector('.home-visit-counter')).visibility === 'visible' };
});
const aligned = async page => {
  const p = await position(page);
  assert(p.visible, 'Counter should be visible at the top of the homepage');
  assert(p.y >= 0 && p.y < 80, 'Counter should actually be inside the top of the viewport');
  assert(Math.abs(p.x - p.introLeft) < 2, 'Counter should retain its original left alignment');
  assert(Math.abs(p.bottom - p.navBottom) < 2, 'Counter should retain its original top alignment');
  return p;
};
try {
  for (const [width, height, resizedWidth] of [[1440, 900, 390], [888, 884, 1440], [390, 844, 888]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    const page = await context.newPage();
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.locator('#home-loader').waitFor({ state: 'hidden' });
    await page.waitForTimeout(3300);
    const initial = await aligned(page);
    await page.locator('[data-project-gallery]').first().scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('.universe-header').classList.contains('projects-nav'));
    await page.setViewportSize({ width: width + 1, height });
    await page.waitForTimeout(200);
    assert(Math.abs((await position(page)).documentTop - initial.documentTop) < 2, 'Resizing in projects must not move the counter down the document');
    await page.evaluate(() => scrollTo({ top: 300, behavior: 'instant' }));
    await page.waitForFunction(() => !document.querySelector('.universe-header').classList.contains('projects-nav'));
    await page.waitForTimeout(200);
    assert(Math.abs((await position(page)).documentTop - initial.documentTop) < 2, 'Returning partway through the hero must not add scroll offset');
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await aligned(page);
    await page.locator('[data-project-gallery]').first().scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('.universe-header').classList.contains('projects-nav'));
    await page.setViewportSize({ width: resizedWidth, height });
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(300);
    await aligned(page);
    await page.setViewportSize({ width, height });
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(200);
    await aligned(page);
    await page.screenshot({ path: path.join(os.tmpdir(), `magicj-counter-fixed-${width}.png`) });
    await page.locator('.visit-label').click();
    await page.locator('.visit-settings').waitFor({ state: 'visible' });
    await page.locator('.visit-settings input').check();
    assert.equal(await page.evaluate(() => localStorage.getItem('magicj.visit.exclude')), '1');
    await page.getByRole('button', { name: '完成', exact: true }).click();
    await page.goto(base + '/#projects', { waitUntil: 'domcontentloaded' });
    await page.locator('#home-loader').waitFor({ state: 'hidden' });
    await page.waitForTimeout(3300);
    await page.setViewportSize({ width: width + 1, height });
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(300);
    await aligned(page);
    console.log(`${width}x${height}: scroll, resize, breakpoint changes, return to top, direct project entry, and settings passed`);
    await context.close();
  }
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
