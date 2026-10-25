import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const url = process.env.GROUP_URL || 'http://127.0.0.1:4373/officialwebsite/topics/applications/inspiration-station/theology/group-study/';
const seed = { version: 1, active: 'existing', plans: [{ id: 'existing', title: '已有查经计划', date: '2026-10-27', leader: '已有带领人', goal: '已有目标', notes: '已有分享和代祷，不可删除', followup: '已有下次跟进，不可删除', steps: [{ id: 's', title: '原有流程', minutes: 5, content: '已有重点内容', highlights: ['重点'], focus: true }], questions: [{ id: 'q', text: '原有问题', answer: '已有讨论记录', focus: true }], resources: [{ id: 'r', type: '文章', title: '原有资料', url: 'https://example.com/study' }], passages: [] }] };
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 } });
    await context.addInitScript(seed => { if (!localStorage.getItem('magicj.group-study.v1')) localStorage.setItem('magicj.group-study.v1', JSON.stringify(seed)); }, seed);
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(url);
    assert.deepEqual(await page.getByRole('tab').allTextContents(), ['聚会信息', '查考经文', '视频与资料', '流程安排', '问题互动', '带走与回应']);
    await page.getByRole('tab', { name: '问题互动', exact: true }).click();
    assert.equal(await page.locator('[role=tabpanel]:visible').count(), 1);
    assert.equal(await page.locator('#discussion').isVisible(), true);
    assert.equal(await page.locator('#response').isVisible(), false);
    assert.equal(await page.getByRole('textbox', { name: '问题 1', exact: true }).innerText(), seed.plans[0].questions[0].text);
    assert.equal(await page.getByRole('textbox', { name: '问题 1 的讨论记录', exact: true }).innerText(), seed.plans[0].questions[0].answer);
    await page.getByRole('tab', { name: '带走与回应', exact: true }).click();
    assert.equal(await page.locator('[role=tabpanel]:visible').count(), 1);
    assert.equal(await page.locator('#discussion').isVisible(), false);
    const notes = page.locator('[data-meta-editor="notes"] .rich-editor');
    const followup = page.locator('[data-meta-editor="followup"] .rich-editor');
    assert.equal(await notes.innerText(), seed.plans[0].notes);
    assert.equal(await followup.innerText(), seed.plans[0].followup);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('magicj.group-study.v1')));
    assert.deepEqual(saved.plans, seed.plans, 'all previously stored fields are unchanged by splitting panels');
    await page.screenshot({ path: `.private/group-response-${width}.png` });
    await notes.fill('已有分享和代祷，不可删除；新增回应');
    await followup.fill('已有下次跟进，不可删除；新增跟进');
    await page.getByRole('tab', { name: '问题互动', exact: true }).click();
    await page.getByRole('tab', { name: '带走与回应', exact: true }).click();
    await page.reload();
    assert.equal(await page.getByRole('tab', { name: '带走与回应', exact: true }).getAttribute('aria-selected'), 'true');
    assert.equal(await notes.innerText(), '已有分享和代祷，不可删除；新增回应');
    assert.equal(await followup.innerText(), '已有下次跟进，不可删除；新增跟进');
    await page.locator('.backup-details summary').click();
    const pending = page.waitForEvent('download'); await page.locator('#export').click();
    const stream = await (await pending).createReadStream(); let exported = ''; for await (const part of stream) exported += part.toString();
    const backup = JSON.parse(exported).plans[0];
    assert.equal(backup.notes, await notes.innerText()); assert.equal(backup.followup, await followup.innerText());
    for (const key of ['questions', 'steps', 'resources', 'passages']) assert.deepEqual(backup[key], seed.plans[0][key]);
    await page.locator('.backup-details summary').click();
    await page.goto(url + '#discussion');
    assert.equal(await page.getByRole('tab', { name: '问题互动', exact: true }).getAttribute('aria-selected'), 'true', 'old discussion links still work');
    await page.screenshot({ path: `.private/group-interaction-${width}.png` });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    console.log(`PASS ${width}: six independent panels, old question/answer/notes/followup preservation, editing/reload/export, legacy discussion link and no overflow/errors`);
    await context.close();
  }
} finally { await browser.close(); }
