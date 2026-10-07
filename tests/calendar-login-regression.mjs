import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const origin = process.env.CALENDAR_PREVIEW_ORIGIN || 'http://127.0.0.1:4321';
const url = `${origin}/officialwebsite/super-calendar/index.html#life`;
const sessionKey = 'mywebsite.site-auth-session.v1';
const fixtureKey = 'calendar-regression-fixture';
const session = { uid: 'calendar-regression-user', account: 'calendar-test@example.com' };
const authStub = `
let checks = 0;
const fixture = () => JSON.parse(localStorage.getItem('${fixtureKey}'));
const cloudbase = { init: () => ({ database: () => ({}), auth: () => ({
  getSession: async () => {
    await new Promise(resolve => setTimeout(resolve, 30));
    return { data: { session: ++checks < 3 || !fixture().signedIn ? null : { sub: '${session.uid}', user: { uid: '${session.uid}', email: '${session.account}' } } } };
  },
  signInWithPassword: async () => {
    const value = fixture(); value.signedIn = true;
    localStorage.setItem('${fixtureKey}', JSON.stringify(value));
    return { data: { user: { uid: '${session.uid}', email: '${session.account}' } } };
  },
  signOut: async () => {
    const value = fixture(); value.signedIn = false;
    localStorage.setItem('${fixtureKey}', JSON.stringify(value));
  }
}) }) };
`;
const cloudStub = `
export { getCloudSession, getRememberedSession, signInWithPassword, signOut } from '/officialwebsite/src/scripts/site-auth.ts';
export const loadCloudTodos = async () => {
  const fixture = JSON.parse(localStorage.getItem('${fixtureKey}'));
  if (fixture.failLoad) throw new Error('synthetic load failure');
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date());
  return { todos: [{ id: 'calendar-regression-task', title: fixture.title, date, category: 'life', placement: 'weekly',
    important: true, completed: false, note: '登录恢复验收', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }], requestId: 'fixture' };
};
export const watchCloudTodos = () => ({ capacity: 100, pageCount: 1, close() {} });
export const upgradeCloudTodoVersions = async () => 0;
`;

const browser = await chromium.launch({ channel: 'chrome', headless: true });
await mkdir('tmp/calendar-login-verification', { recursive: true });
try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport });
    await context.addInitScript(({ sessionKey, fixtureKey, session }) => {
      if (location.hostname !== '127.0.0.1') return;
      if (!localStorage.getItem(fixtureKey)) {
        localStorage.setItem(fixtureKey, JSON.stringify({ signedIn: true, title: '自动恢复的计划', failLoad: false }));
        localStorage.setItem(sessionKey, JSON.stringify({ ...session, expiresAt: Date.now() + 60000 }));
      }
    }, { sessionKey, fixtureKey, session });
    await context.route('**/*site-auth.ts*', async route => {
      const response = await route.fetch();
      const body = (await response.text()).replace(/^import cloudbase from [^;]+;/m, authStub);
      await route.fulfill({ response, body });
    });
    await context.route('**/*todo-cloud.ts*', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: cloudStub }));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    const week = page.frameLocator('#life-week-frame');
    const task = title => week.locator('.todo-item-title').filter({ hasText: title }).first();
    await task('自动恢复的计划').waitFor({ state: 'visible' });
    assert.equal(await week.locator('[data-login-modal]').evaluate(dialog => dialog.open), false);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await task('自动恢复的计划').waitFor({ state: 'visible' });

    // A failed initial load followed by renewal of the SAME uid must recover the iframe.
    await page.evaluate(key => {
      const value = JSON.parse(localStorage.getItem(key)); value.failLoad = true;
      localStorage.setItem(key, JSON.stringify(value));
    }, fixtureKey);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await week.locator('[data-auth-status]').filter({ hasText: '同步失败' }).waitFor({ state: 'attached' });
    await page.evaluate(({ fixtureKey, sessionKey }) => {
      const value = JSON.parse(localStorage.getItem(fixtureKey)); value.failLoad = false;
      localStorage.setItem(fixtureKey, JSON.stringify(value));
      const remembered = JSON.parse(localStorage.getItem(sessionKey)); remembered.expiresAt += 60000;
      localStorage.setItem(sessionKey, JSON.stringify(remembered));
    }, { fixtureKey, sessionKey });
    await task('自动恢复的计划').waitFor({ state: 'visible' });
    await page.evaluate(key => {
      const value = JSON.parse(localStorage.getItem(key)); value.title = '同步后的计划';
      localStorage.setItem(key, JSON.stringify(value));
    }, fixtureKey);
    await page.locator('[data-calendar-sync]').click();
    await task('同步后的计划').waitFor({ state: 'visible' });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'outer page must fit the viewport');
    assert.equal(await week.locator('html').evaluate(element => element.scrollWidth <= innerWidth), true, 'weekly iframe must fit its viewport');
    await page.screenshot({ path: `tmp/calendar-login-verification/${viewport.width}x${viewport.height}.png`, fullPage: true });

    await page.locator('[data-calendar-login]').click();
    const account = page.frameLocator('#calendar-account-dialog iframe');
    await account.locator('#auth-logout').click();
    await task('同步后的计划').waitFor({ state: 'detached' });
    await account.locator('input[name=email]').fill(session.account);
    await account.locator('input[name=password]').fill('synthetic-test-password');
    await account.locator('button[type=submit]').click();
    await task('同步后的计划').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#calendar-account-dialog').evaluate(dialog => dialog.open), false);
    assert.deepEqual(errors, []);
    console.log(`PASS ${viewport.width}x${viewport.height}: delayed restore, reload, same-account renewal, sync, logout, login, overflow`);
    await context.close();
  }
} finally { await browser.close(); }
