import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';

const url = 'http://127.0.0.1:4364/officialwebsite/topics/applications/inspiration-station/theology/group-study/';
const html = fs.readFileSync(new URL('../src/pages/topics/applications/inspiration-station/theology/group-study/index.astro', import.meta.url), 'utf8').replace(/<script>[\s\S]*?<\/script>/, '<script type="module" src="/highlight-sync-test.js"></script>');
const source = fs.readFileSync(new URL('../public/topics/applications/inspiration-station/theology/group-study/app.js', import.meta.url), 'utf8').replace(/^import[^\n]+\n/, 'const {getCloudSession,getCloudDb,getRememberedSession,signInWithPassword,signOut}=window.__auth;\n');
const plan = { id: 'existing', title: '原有计划', date: '', leader: '', goal: '原有目标', notes: '第一段重点内容。\n\n第二段原文保持不变。', followup: '下次跟进重点', steps: [], questions: [], resources: [], passages: [], highlights: { notes: ['重点'], followup: ['重点'] } };
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
try {
  for (const width of [1440, 390]) for (const conflict of [false, true]) {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, hasTouch: width === 390 });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await context.addInitScript(plan => {
      const session = { uid: 'owner', account: 'owner@example.test' };
      const key = 'magicj.group-study.v1:account:owner';
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ version: 1, active: plan.id, plans: [plan], cloudBase: { plans: [structuredClone(plan)], revision: 1 } }));
      window.__auth = {
        getRememberedSession: () => session, getCloudSession: async () => session,
        getCloudDb: () => ({ collection: () => ({ doc: () => ({ get: () => window.cloudRead() }), where: query => ({ update: payload => window.cloudWrite(query, payload) }) }) })
      };
    }, plan);
    let record = { _id: 'owner', ownerId: 'owner', bookmarks: [{ id: 'keep' }], groupStudy: { version: 1, plans: [structuredClone(plan)] }, groupStudyRevision: 1 };
    await page.exposeFunction('cloudRead', () => ({ data: [structuredClone(record)] }));
    await page.exposeFunction('cloudWrite', (query, payload) => {
      if (query.groupStudyRevision !== record.groupStudyRevision) return { updated: 0 };
      Object.assign(record, structuredClone(payload)); return { updated: 1 };
    });
    await page.route(url, r => r.fulfill({ contentType: 'text/html', body: html }));
    await page.route('**/highlight-sync-test.js', r => r.fulfill({ contentType: 'text/javascript', body: source }));
    await page.goto(url); await page.getByText(/^已保存到账号云端/).waitFor();
    await page.getByRole('tab', { name: '带走与回应', exact: true }).click();
    const notes = page.locator('[data-meta-editor="notes"] .rich-editor');
    await notes.click();
    await page.keyboard.press('Control+End');
    const caretOffset = () => notes.evaluate(e => { const selection = getSelection(), range = document.createRange(); range.selectNodeContents(e); range.setEnd(selection.anchorNode, selection.anchorOffset); return range.toString().length; });
    const caretBefore = await caretOffset();
    if (conflict) { record.groupStudy.plans[0].goal = '另一设备修改的目标'; record.groupStudyRevision++; }
    const clear = notes.locator('..').getByRole('button', { name: '清除高亮', exact: true });
    await (width === 390 ? clear.tap() : clear.click());
    assert.equal(await notes.locator('mark').count(), 0, 'immediate clear succeeds');
    assert.equal(await caretOffset(), caretBefore, 'clearing must not move the caret to the beginning');
    assert.equal(await notes.innerText(), plan.notes);
    await page.locator('#sync-now').click(); await page.getByText(/^已保存到账号云端/).waitFor();
    assert.equal(await notes.locator('mark').count(), 0, 'cloud sync must not restore the cleared highlight');
    assert.equal(await notes.innerText(), plan.notes, 'paragraphs and original text stay intact');
    assert.deepEqual(record.bookmarks, [{ id: 'keep' }]);
    if (conflict) {
      assert.equal(record.groupStudy.plans.length, 2);
      assert.ok(record.groupStudy.plans.some(p => p.goal === '另一设备修改的目标' && p.highlights.notes.includes('重点')), 'remote changes retained in the other version');
    }
    await page.reload(); await page.getByText(/^已保存到账号云端/).waitFor();
    assert.equal(await notes.locator('mark').count(), 0, 'refresh keeps the cleared version selected');
    assert.equal(await notes.innerText(), plan.notes);
    const local = await page.evaluate(() => JSON.parse(localStorage.getItem('magicj.group-study.v1:account:owner')));
    const active = local.plans.find(p => p.id === local.active);
    assert.deepEqual(active.highlights.notes, ['重点'], 'old browser backup must remain untouched; current state was read from cloud');
    assert.deepEqual(active.highlights.followup, ['重点'], 'other fields keep their highlights');
    await page.locator('#sync-now').click(); await page.getByText(/^已保存到账号云端/).waitFor();
    assert.equal(record.groupStudy.plans.length, conflict ? 2 : 1, 'repeat sync does not create more copies');
    assert.deepEqual(errors, []);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: `D:/UserTemp/huawei/magicj-auth-repair-evidence/group-clear-sync-${width}-${conflict}.png` });
    console.log(`PASS ${width} conflict=${conflict}: clear, sync, active version, refresh, original text and other highlights preserved`);
    await context.close();
  }
} finally { await browser.close(); }
