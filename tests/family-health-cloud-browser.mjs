import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { memoryDatabase } from './family-health-cloud.mjs';
const { createHandler } = createRequire(import.meta.url)('../cloudfunctions/family-health/index.js');
const url = 'http://127.0.0.1:4366/officialwebsite/family-health.html';
const html = (await fs.readFile(new URL('../public/family-health.html', import.meta.url), 'utf8')).replace("const LOCAL_PREVIEW=['localhost','127.0.0.1','[::1]'].includes(location.hostname);", 'const LOCAL_PREVIEW=false;');
const cloud = await fs.readFile(new URL('../public/family-health-cloud.js', import.meta.url), 'utf8');
const db = memoryDatabase(), errors = [];
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
try {
  async function open(uid) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.exposeFunction('testHealthRPC', createHandler(db, () => ({ uid })));
    await page.route('**/family-health.html', route => route.fulfill({ contentType: 'text/html', body: html }));
    await page.route('**/family-health-cloud.js', route => route.fulfill({ contentType: 'text/javascript', body: cloud }));
    await page.route('**/family-health-auth.js', route => route.fulfill({ contentType: 'text/javascript', body: `window.FamilyHealthAuth={getSession:async()=>({uid:${JSON.stringify(uid)},account:${JSON.stringify(uid+'@example.test')}}),callCloudFunction:async(name,event)=>({result:await window.testHealthRPC(event)}),signOut:async()=>{}};window.dispatchEvent(new Event('family-health-auth-ready'));` }));
    await page.goto(url); await page.locator('.storage-mini').waitFor();
    return page;
  }
  const a = await open('test-a');
  assert.equal(await a.evaluate(() => state.events.length), 0, 'No production demo seed');
  await a.evaluate(async () => {
    await mutate(() => { state.events.push({ id: 'actual-input', pid: 'dad', type: 'symptom', date: '2026-10-27', title: '输入保存验收', content: '用户填写的内容', conditionId: '' }); state.reports.push({ id: 'actual-report', pid: 'dad', title: '附件验收', date: '2026-10-27', kind: '其他资料', summary: '原件保留', fileId: 'actual-file', mime: 'image/png', fileName: 'original.png', size: 68, demo: false }); }, [{ id: 'actual-file', name: 'original.png', blob: new Blob([Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='), c => c.charCodeAt(0))], { type: 'image/png' }) }]);
  });
  assert.match(await a.locator('.storage-mini').innerText(), /云端已保存 v1/);
  await a.reload(); await a.locator('.storage-mini').waitFor();
  assert.equal(await a.evaluate(() => state.events[0].content), '用户填写的内容');
  const device = await open('test-a');
  assert.equal(await device.evaluate(() => state.events[0].title), '输入保存验收');
  await device.evaluate(() => navigate('reports'));
  await device.locator('.report-thumb img').waitFor();
  assert.equal(await device.locator('.report-thumb img').evaluate(img => img.complete && img.naturalWidth > 0), true);
  await a.evaluate(() => backupModal());
  const downloadPromise = a.waitForEvent('download'); await a.locator('[data-action=export-backup]').click();
  const download = await downloadPromise, backup = JSON.parse(await fs.readFile(await download.path(), 'utf8'));
  assert.equal(backup.source, 'cloud'); assert.equal(backup.accountUid, 'test-a'); assert.equal(backup.attachments.length, 1);
  assert.equal(backup.data.events[0].content, '用户填写的内容');
  await a.locator('#modal-root [data-action=close]').first().click();
  for (const width of [1440, 390]) {
    await a.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
    await a.evaluate(() => settingsModal());
    assert.ok(await a.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Page overflow');
    assert.ok(await a.locator('.modal').evaluate(el => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight; }), 'Modal overflow');
    await a.screenshot({ path: '.private/family-cloud-' + width + '.png' });
    await a.locator('#modal-root [data-action=close]').first().click();
  }
  const other = await open('test-b');
  assert.equal(await other.evaluate(() => state.events.length + state.reports.length), 0);
  await assert.rejects(other.evaluate(() => exportBackup()), /尚无档案/);
  await a.evaluate(() => mutate(() => state.events[0].content = '较新记录'));
  const failure = await device.evaluate(async () => { try { await mutate(() => state.events[0].content = '旧设备覆盖'); return ''; } catch (error) { return error.message; } });
  assert.match(failure, /其他页面/);
  await assert.rejects(device.evaluate(() => exportBackup()), /未确认保存/);
  await a.reload(); await a.locator('.storage-mini').waitFor();
  assert.equal(await a.evaluate(() => state.events[0].content), '较新记录');
  assert.deepEqual(errors, []);
  console.log('PASS browser cloud save/reload, cross-device load, image rendering, download contents, other-account empty, conflict, 1440/390 modal layout');
} finally { await browser.close(); }

