import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { memoryDatabase } from './family-health-cloud.mjs';
const { createHandler } = createRequire(import.meta.url)('../cloudfunctions/family-health/index.js');
const base = 'http://127.0.0.1:4366/officialwebsite/';
const html = (await fs.readFile(new URL('../public/family-health.html', import.meta.url), 'utf8')).replace("const LOCAL_PREVIEW=['localhost','127.0.0.1','[::1]'].includes(location.hostname);", 'const LOCAL_PREVIEW=false;');
const db = memoryDatabase(), errors = [];
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
try {
  async function open(uid) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
    const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
    await page.exposeFunction('testHealthRPC', createHandler(db, () => ({ uid })));
    await page.route('**/family-health.html', route => route.fulfill({ contentType: 'text/html', body: html }));
    await page.route('**/family-health-auth.js', route => route.fulfill({ contentType: 'text/javascript', body: `window.FamilyHealthAuth={getSession:async()=>({uid:'${uid}',account:'${uid}@example.test'}),callCloudFunction:async(n,e)=>({result:await window.testHealthRPC(e)})};window.dispatchEvent(new Event('family-health-auth-ready'));` }));
    await page.goto(base + 'family-health.html'); await page.locator('.storage-mini').waitFor(); return page;
  }
  const page = await open('care-test-a');
  await page.evaluate(async () => mutate(() => state.events.push({ id: 'father-preserve', pid: 'dad', type: 'symptom', date: '2026-10-26', title: 'Keep existing', content: 'Unchanged' })));
  await page.evaluate(() => navigate('admissions'));
  await page.locator('.heading-actions [data-action=add-admission]').click();
  await page.locator('#care-form [name=title]').fill('住院安排验收');
  await page.locator('#care-form [name=hospital]').fill('测试医院');
  await page.locator('#care-form [name=admissionDate]').fill('2026-11-05T10:00');
  // Exercise the user-supplied Excel only when explicitly supplied, otherwise a portable CSV fixture.
  if (process.env.CARE_CHECKLIST_XLSX) await page.locator('#care-import').setInputFiles(process.env.CARE_CHECKLIST_XLSX);
  else await page.locator('#care-import').setInputFiles({ name: 'checklist.csv', mimeType: 'text/csv', buffer: Buffer.from('序号,类别,物品或事项,准备状态\n1,资料,住院通知,待准备\n2,用品,水杯,待确认') });
  await page.locator('[data-care=apply-import]').click();
  const itemCount = await page.locator('.care-item-edit').count(); assert.equal(itemCount, process.env.CARE_CHECKLIST_XLSX ? 22 : 2);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
    assert.equal(await page.evaluate(() => document.querySelector('.modal').scrollWidth <= document.querySelector('.modal').clientWidth + 1), true);
    await page.screenshot({ path: `.private/care-form-${width}.png` });
  }
  await page.locator('[form=care-form]').click(); await page.locator('#care-form').waitFor({ state: 'detached' });
  const admissionId = await page.evaluate(() => state.events.find(e => e.type === 'admission').id);
  await page.locator('[data-care-check]').first().check();
  await page.waitForFunction(() => !savingArchive);
  await page.reload(); await page.locator('.storage-mini').waitFor(); await page.evaluate(() => navigate('admissions'));
  assert.equal(await page.locator('[data-care-check]').first().isChecked(), true);
  await page.locator('[data-care=new-surgery]').click();
  await page.locator('#care-form [name=title]').fill('测试手术');
  await page.locator('#care-form [name=surgeryDate]').fill('2026-11-06T09:00');
  await page.locator('#care-pre').fill('术前需确认的事项');
  await page.locator('#care-pre').evaluate(el => { el.focus(); el.setSelectionRange(0, 2); });
  await page.locator('[data-target=care-pre]').click();
  assert.equal(await page.locator('#care-form .care-text-preview mark').innerText(), '术前');
  await page.locator('#care-post').fill('术后记录');
  await page.locator('[name=files-pre]').setInputFiles({ name: 'pre.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nTest document') });
  await page.locator('[name=files-post]').setInputFiles([
    { name: 'after.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: Buffer.from([80,75,3,4,0,0,0,0]) },
    { name: 'after.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from([80,75,3,4,0,0,0,0]) }
  ]);
  await page.locator('[form=care-form]').click(); await page.locator('#care-form').waitFor({ state: 'detached' });
  await page.evaluate(() => navigate('surgery'));
  assert.equal(await page.locator('.care-phase mark').innerText(), '术前');
  const surgeryId = await page.evaluate(() => state.events.find(e => e.type === 'surgery').id);
  assert.equal(await page.evaluate(() => state.reports.length), 3);
  await page.locator('[data-care=progress]').click();
  await page.locator('#record-form [name=title]').fill('术后进展');
  await page.locator('#record-form [name=content]').fill('测试记录');
  await page.locator('[form=record-form]').click(); await page.locator('#record-form').waitFor({ state: 'detached' });
  assert.equal(await page.evaluate(() => state.events.find(e => e.title === '术后进展').visitEventId), surgeryId);
  const backup = await page.evaluate(async () => cloudArchive.exportArchive());
  assert.equal(backup.attachments.length, 3);
  assert.equal(await page.evaluate(raw => validateBackup(raw).files.length, backup), 3);
  assert.equal(backup.data.events.find(e => e.id === 'father-preserve').content, 'Unchanged');
  const other = await open('care-test-b'); assert.equal(await other.evaluate(() => state.events.length), 0);
  const fresh = await open('care-test-a'); assert.equal(await fresh.evaluate(() => state.events.filter(e => CARE_TYPES.includes(e.type)).length), 2);
  await page.evaluate(id => moveToTrash('event', id), admissionId);
  assert.equal(await page.evaluate(() => state.reports.length), 0);
  assert.equal(await page.evaluate(() => state.events.length), 1);
  await page.evaluate(() => restoreTrash(state.trash[0].id));
  assert.equal(await page.evaluate(() => state.reports.length), 3);
  await page.evaluate(() => navigate('admissions'));
  const downloadPromise = page.waitForEvent('download'); await page.locator('[data-care=mobile-export]').click();
  const download = await downloadPromise, mobile = await fs.readFile(await download.path(), 'utf8');
  const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  mobilePage.on('pageerror', e => errors.push(e.message));
  await mobilePage.route('**/checklist.html', route => route.fulfill({ contentType: 'text/html', body: mobile }));
  await mobilePage.goto(base + 'checklist.html');
  assert.equal(await mobilePage.locator('input:checked').count(), 0);
  await mobilePage.locator('input').first().check(); await mobilePage.reload();
  assert.equal(await mobilePage.locator('input:checked').count(), 1);
  const savedPromise = mobilePage.waitForEvent('download'); await mobilePage.locator('#save').click();
  const saved = await fs.readFile(await (await savedPromise).path(), 'utf8');
  assert.match(saved, /"ready":true/);
  const reopened = await browser.newPage();
  await reopened.route('**/saved.html', route => route.fulfill({ contentType: 'text/html', body: saved }));
  await reopened.goto(base + 'saved.html');
  assert.equal(await reopened.locator('#list input').count(), itemCount, 'Saved HTML must not duplicate rows');
  assert.equal(await reopened.locator('#list input:checked').count(), 1);
  const progressPromise = mobilePage.waitForEvent('download'); await mobilePage.locator('#progress').click();
  await page.locator('[data-care-progress]').setInputFiles(await (await progressPromise).path());
  await page.locator('#care-confirm-progress').click(); await page.waitForFunction(() => !savingArchive);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
    for (const screen of ['admissions', 'surgery', 'timeline']) {
      await page.evaluate(screen => navigate(screen), screen);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, screen + ' overflow');
      await page.screenshot({ path: `.private/care-${screen}-${width}.png` });
    }
  }
  assert.deepEqual(errors, []);
  console.log('PASS checklist import, highlight, 3 attachment types, atomic cloud save, fresh account export, other-account isolation, recycle/restore links, mobile saved HTML/progress and desktop/mobile layout');
} finally { await browser.close(); }
