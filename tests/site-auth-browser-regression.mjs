import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import ts from 'typescript';
import { chromium } from 'playwright';
import { build } from 'esbuild';

const base = process.env.SITE_AUTH_TEST_URL || 'http://127.0.0.1:4362';
const bibleUrl = `${base}/officialwebsite/topics/applications/inspiration-station/theology/?book=heb&chapter=10&verse=1`;
const todoUrl = `${base}/officialwebsite/topics/space/planning/todo`;
const key = 'mywebsite.site-auth-session.v1';
const identity = { uid: 'shared-sync-fixture', account: 'shared-sync@example.test' };
const source = await readFile(new URL('../src/scripts/site-auth.ts', import.meta.url), 'utf8');
const authModule = ts.transpileModule(source.replace("import cloudbase from '@cloudbase/js-sdk';", 'const cloudbase = window.__fixtureCloudbase;'), {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 }
}).outputText;
const standaloneModules = new Map();
for (const [url, entry] of [
  ['/officialwebsite/inspiration-studio-cloud.js', 'src/scripts/inspiration-studio-cloud.ts'],
  ['/officialwebsite/topics/space/investing/funds/fund-preferences-cloud.js', 'src/scripts/fund-dashboard-preferences.ts']
]) {
  const result = await build({ entryPoints: [entry], bundle: true, write: false, format: 'iife', platform: 'browser', target: 'es2022', plugins: [{
    name: 'fixture-sdk-boundary', setup(builder) {
      builder.onResolve({ filter: /^@cloudbase\/js-sdk$/ }, () => ({ path: 'sdk', namespace: 'fixture' }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export default window.__fixtureCloudbase;', loader: 'js' }));
    }
  }] });
  standaloneModules.set(url, result.outputFiles[0].text);
}

function installFixture({ identity, key, initialFailure }) {
  if (location.protocol !== 'http:') return;
  if (!localStorage.getItem('sync-fixture-initialised')) {
    localStorage.setItem('sync-fixture-initialised', 'yes');
    localStorage.setItem(key, JSON.stringify({ ...identity, expiresAt: Date.now() + 86400000 }));
    localStorage.setItem('sync-fixture-owner', identity.uid);
  }
  const fixture = window.__syncFixture = { offline: initialFailure, expired: false, checks: 0, refreshes: 0, reads: 0, writes: 0, failures: 0, intervals: {} };
  const interval = window.setInterval.bind(window);
  window.setInterval = (callback, delay, ...args) => {
    if ([15000, 30000, 60000].includes(delay)) {
      (fixture.intervals[delay] ||= []).push(callback);
      return interval(() => {}, delay);
    }
    return interval(callback, delay, ...args);
  };
  const session = () => ({ user: { id: localStorage.getItem('sync-fixture-owner'), email: identity.account }, expires_at: Date.now() / 1000 + (fixture.expired ? -1 : 3600) });
  const check = () => { if (fixture.offline) { fixture.failures++; throw new Error('fixture network unavailable'); } };
  const recordKey = name => `sync-fixture-record:${name}`;
  const initialBible = { _id: identity.uid, _openid: identity.uid, ownerId: identity.uid, lastRead: { book: 'heb', chapter: 10, verse: 1, updatedAt: '2026-10-01T00:00:00Z' }, bookmarks: [], notes: [], readVerses: [], bookStatuses: {}, updatedAt: '2026-10-01T00:00:00Z' };
  if (!localStorage.getItem(recordKey('officialWebsiteBibleReaderState'))) localStorage.setItem(recordKey('officialWebsiteBibleReaderState'), JSON.stringify(initialBible));
  const db = {
    command: { remove: () => undefined },
    collection(name) {
      const current = () => name === 'officialWebsiteTodos' ? [] : JSON.parse(localStorage.getItem(recordKey(name)) || 'null');
      const query = {
        where() { return this; }, limit() { return this; }, skip() { return this; },
        async get() { check(); fixture.reads++; const value = current(); return { data: Array.isArray(value) ? value : value ? [value] : [] }; },
        watch() { return { close() {} }; },
        doc() {
          return {
            async get() { check(); fixture.reads++; return { data: current() }; },
            async set(payload) { check(); fixture.writes++; localStorage.setItem(recordKey(name), JSON.stringify(payload)); return { data: {}, updated: 1 }; },
            async update(payload) { return this.set({ ...current(), ...payload }); }
          };
        }
      };
      return query;
    }
  };
  window.__fixtureCloudbase = { init: () => ({
    database: () => db,
    callFunction: async () => ({ result: {} }),
    auth: () => ({
      async getSession() { fixture.checks++; check(); return { data: { session: localStorage.getItem('sync-fixture-owner') ? session() : null } }; },
      async refreshSession() { check(); fixture.refreshes++; fixture.expired = false; return { data: { session: session() } }; },
      async signOut() { localStorage.removeItem('sync-fixture-owner'); }
    })
  }) };
  window.cloudbase = window.__fixtureCloudbase;
}

const browser = await chromium.launch({ channel: 'chrome', headless: true });
await mkdir('.private', { recursive: true });
try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    await context.addInitScript(installFixture, { identity, key, initialFailure: false });
    await context.route('**/*site-auth.ts*', route => route.fulfill({ contentType: 'application/javascript', body: authModule }));
    for (const [url, body] of standaloneModules) await context.route(`**${url}*`, route => route.fulfill({ contentType: 'application/javascript', body }));
    const reader = await context.newPage();
    const errors = [];
    reader.on('pageerror', error => errors.push(error.message));
    await reader.goto(bibleUrl);
    await reader.waitForFunction(() => document.querySelector('[data-login-account]')?.textContent === 'shared-sync@example.test');
    await reader.locator('#heb-10-25').scrollIntoViewIfNeeded();
    const position = () => reader.evaluate(() => ({ y: scrollY, reader: document.querySelector('[data-verse-list]').scrollTop }));
    const before = await position();
    await reader.evaluate(() => { window.__stableVerse = document.querySelector('#heb-10-25'); window.__syncFixture.expired = true; window.__syncFixture.intervals[60000].forEach(fn => fn()); });
    await reader.waitForFunction(() => window.__syncFixture.refreshes === 1);
    await reader.evaluate(() => { window.__syncFixture.offline = true; window.__syncFixture.intervals[15000].forEach(fn => fn()); });
    await reader.waitForFunction(() => document.querySelector('[data-reading-sync-status]')?.textContent.includes('network')
      || [...document.querySelectorAll('[data-action="cloud-login"]')].some(node => node.textContent === '重试同步'));
    assert.equal(await reader.locator('dialog[open]').count(), 0, 'background failure must not open login');
    await reader.evaluate(() => { window.__syncFixture.offline = false; window.dispatchEvent(new Event('online')); });
    await reader.waitForFunction(() => [...document.querySelectorAll('[data-action="cloud-login"]')].some(node => node.textContent === '同步账号'));
    await reader.locator('#heb-10-25 [data-action="toggle-read-verse"]').click();
    await reader.waitForFunction(() => window.__syncFixture.writes > 0);
    // Fail a real write, then verify reconnect uploads that edit before loading stale cloud data.
    await reader.evaluate(() => { window.__syncFixture.offline = true; });
    await reader.locator('#heb-10-25 [data-action="toggle-bookmark"]').click();
    await reader.waitForFunction(() => [...document.querySelectorAll('[data-action="cloud-login"]')].some(node => node.textContent === '重试同步'));
    await reader.evaluate(() => { window.__syncFixture.offline = false; window.dispatchEvent(new Event('online')); });
    await reader.waitForFunction(() => JSON.parse(localStorage.getItem('sync-fixture-record:officialWebsiteBibleReaderState')).bookmarks.some(item => item.verse === 25));
    const after = await position();
    assert.ok(Math.abs(before.y - after.y) <= 3 && Math.abs(before.reader - after.reader) <= 3, 'renewal and recovery must retain reading position');
    assert.equal(await reader.evaluate(() => window.__stableVerse === document.querySelector('#heb-10-25')), true);
    assert.equal(await reader.locator('dialog[open]').count(), 0);
    await reader.screenshot({ path: `.private/shared-sync-bible-${viewport.width}.png` });

    const todo = await context.newPage();
    todo.on('pageerror', error => errors.push(error.message));
    await todo.goto(todoUrl);
    await todo.waitForFunction(() => document.querySelector('[data-auth-status]')?.textContent.includes('已同步'));
    assert.equal(await todo.locator('[data-login-modal][open]').count(), 0, 'shared account must restore on another page');
    await todo.evaluate(() => { window.__syncFixture.expired = true; window.__syncFixture.intervals[60000].forEach(fn => fn()); });
    await todo.waitForFunction(() => window.__syncFixture.refreshes > 0);
    assert.equal(await todo.locator('[data-login-modal][open]').count(), 0, 'token refresh must not open a login form');
    await todo.evaluate(() => { window.__syncFixture.offline = true; window.dispatchEvent(new Event('focus')); });
    await todo.waitForFunction(() => document.querySelector('[data-auth-status]')?.textContent.includes('失败'));
    assert.equal(await todo.locator('[data-login-modal][open]').count(), 0);
    await todo.evaluate(() => { window.__syncFixture.offline = false; window.dispatchEvent(new Event('online')); });
    await todo.waitForFunction(() => document.querySelector('[data-auth-status]')?.textContent.includes('已同步'));
    await todo.screenshot({ path: `.private/shared-sync-todo-${viewport.width}.png` });

    const calendar = await context.newPage();
    await calendar.goto(`${base}/officialwebsite/super-calendar/index.html`);
    await calendar.waitForFunction(() => document.querySelector('[data-calendar-login]')?.textContent === 'shared-sync@example.test');
    const calendarFrame = calendar.frames().find(frame => frame.url().includes('calendar-source=1'));
    assert.ok(calendarFrame, 'calendar must use the shared Personal Plan account bridge');
    await calendarFrame.evaluate(() => { window.__syncFixture.expired = true; window.__syncFixture.intervals[60000].forEach(fn => fn()); });
    await calendarFrame.waitForFunction(() => window.__syncFixture.refreshes === 1);
    await calendarFrame.evaluate(() => { window.__syncFixture.offline = true; window.__syncFixture.intervals[30000].forEach(fn => fn()); });
    await calendarFrame.waitForFunction(() => window.__syncFixture.failures > 0);
    assert.equal(await calendar.locator('#calendar-account-dialog[open]').count(), 0);
    await calendarFrame.evaluate(() => { window.__syncFixture.offline = false; window.__syncFixture.intervals[30000].forEach(fn => fn()); });
    assert.equal(await calendar.locator('[data-calendar-login]').first().textContent(), identity.account);
    await calendar.screenshot({ path: `.private/shared-sync-calendar-${viewport.width}.png` });

    const studio = await context.newPage();
    await studio.goto(`${base}/officialwebsite/inspiration-studio.html`);
    await studio.waitForFunction(() => document.getElementById('studioAccount')?.textContent === 'shared-sync@example.test');
    await studio.evaluate(() => { window.__syncFixture.expired = true; window.__syncFixture.intervals[60000].forEach(fn => fn()); });
    await studio.waitForFunction(() => window.__syncFixture.refreshes === 1);
    assert.equal(await studio.locator('#studioLogin[open]').count(), 0);

    const funds = await context.newPage();
    await funds.goto(`${base}/officialwebsite/topics/space/investing/funds/index.html`);
    await funds.waitForFunction(() => window.FundPreferenceCloud && window.FundNotesCloud);
    assert.equal(await funds.evaluate(async () => (await window.FundNotesCloud.getSession()).uid), identity.uid);
    await funds.evaluate(() => { window.__syncFixture.expired = true; window.__syncFixture.intervals[60000].forEach(fn => fn()); });
    await funds.waitForFunction(() => window.__syncFixture.refreshes === 1);
    assert.equal(await funds.evaluate(async () => (await window.FundPreferenceCloud.load()).ownerId), identity.uid);

    const stocks = await context.newPage();
    await stocks.goto(`${base}/officialwebsite/stock-tracking/`);
    await stocks.waitForFunction(() => window.StockTrackingSharedAuth);
    assert.equal(await stocks.evaluate(async () => (await window.StockTrackingSharedAuth.getCloudSession()).uid), identity.uid);
    await stocks.evaluate(() => { window.__syncFixture.expired = true; window.__syncFixture.intervals[60000].forEach(fn => fn()); });
    await stocks.waitForFunction(() => window.__syncFixture.refreshes === 1);
    console.log(`PASS ${viewport.width}px calendar iframe, standalone studio, fund preferences/notes, stock account bridge`);

    await todo.evaluate(async () => { const auth = await import('/officialwebsite/src/scripts/site-auth.ts'); await auth.signOut(); });
    await reader.waitForFunction(() => document.querySelector('[data-login-account]')?.hidden);
    assert.equal(await reader.locator('dialog[open]').count(), 0, 'explicit cross-tab logout must not force a modal');
    assert.equal(await todo.locator('[data-login-modal][open]').count(), 0);
    assert.deepEqual(errors, [], 'no uncaught browser errors');
    console.log(`PASS ${viewport.width}px shared SDK renewal, Bible read/write recovery, retained viewport, Todo recovery, cross-tab logout`);
    await context.close();

    const offlineContext = await browser.newContext({ viewport });
    await offlineContext.addInitScript(installFixture, { identity, key, initialFailure: true });
    await offlineContext.route('**/*site-auth.ts*', route => route.fulfill({ contentType: 'application/javascript', body: authModule }));
    const offlineTodo = await offlineContext.newPage();
    await offlineTodo.goto(todoUrl);
    await offlineTodo.waitForFunction(() => document.querySelector('[data-auth-status]')?.textContent.includes('暂时无法同步'));
    assert.equal(await offlineTodo.locator('[data-login-modal][open]').count(), 0, 'startup outage must not force existing users to sign in');
    await offlineTodo.evaluate(() => { window.__syncFixture.offline = false; window.dispatchEvent(new Event('online')); });
    await offlineTodo.waitForFunction(() => document.querySelector('[data-auth-status]')?.textContent.includes('已同步'));
    const offlineReader = await offlineContext.newPage();
    await offlineReader.goto(bibleUrl);
    await offlineReader.waitForFunction(() => window.__syncFixture.failures >= 3);
    await offlineReader.locator('#heb-10-25').scrollIntoViewIfNeeded();
    const offlinePosition = await offlineReader.evaluate(() => scrollY);
    await offlineReader.evaluate(() => { window.__syncFixture.offline = false; window.dispatchEvent(new Event('online')); });
    await offlineReader.waitForFunction(() => document.querySelector('[data-login-account]')?.textContent === 'shared-sync@example.test'
      && [...document.querySelectorAll('[data-action="cloud-login"]')].some(node => node.textContent === '同步账号'));
    assert.equal(await offlineReader.locator('dialog[open]').count(), 0);
    assert.ok(Math.abs(offlinePosition - await offlineReader.evaluate(() => scrollY)) <= 3, 'startup recovery must not interrupt active reading');
    console.log(`PASS ${viewport.width}px startup outage recovers automatically without login UI`);
    await offlineContext.close();
  }
} finally { await browser.close(); }
