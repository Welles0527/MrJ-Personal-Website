import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl = process.env.BIBLE_SCROLL_TEST_URL || 'http://127.0.0.1:4362';
const pageUrl = `${baseUrl}/officialwebsite/topics/applications/inspiration-station/theology/?book=heb&chapter=10&verse=1`;
const authStub = `
  const session = { uid: 'scroll-regression-user', account: 'scroll-regression@example.com' };
  export const getRememberedSession = () => session;
  export const getCloudSession = async () => session;
  export const getCloudDb = () => ({});
  export const signInWithPassword = async () => session;
  export const signOut = async () => undefined;
  export const startEmailSignUp = async () => async () => session;
  export const cloudErrorMessage = (error, fallback) => error?.message || fallback;
`;
const storeStub = `
  const fixture = window.__bibleScrollFixture = {
    loads: 0, saves: 0,
    holdInitial: new URL(location.href).searchParams.has('delay-first-sync'),
    snapshot: {
      lastRead: { book: 'heb', chapter: 10, verse: 1, updatedAt: '2026-10-12T00:00:00.000Z' },
      bookmarks: [], notes: [], readVerses: [], bookStatuses: {}, updatedAt: '2026-10-12T00:00:00.000Z'
    }
  };
  export const createBibleReaderCloudStore = () => ({
    load: async () => {
      fixture.loads++;
      if (fixture.holdInitial && fixture.loads === 1) await new Promise(resolve => { fixture.releaseInitial = resolve; });
      return structuredClone(fixture.snapshot);
    },
    save: async (uid, account, snapshot) => {
      fixture.snapshot = structuredClone(snapshot);
      fixture.saves++;
    }
  });
`;

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.addInitScript(() => {
      const original = window.setInterval.bind(window);
      window.setInterval = (callback, delay, ...args) => {
        if (delay === 15000) {
          window.__refreshBibleFixture = callback;
          return original(() => {}, delay);
        }
        return original(callback, delay, ...args);
      };
    });
    await page.route('**/*site-auth.ts*', route => route.fulfill({ contentType: 'application/javascript', body: authStub }));
    await page.route('**/*bible-reader-cloud-store.ts*', route => route.fulfill({ contentType: 'application/javascript', body: storeStub }));
    await page.goto(pageUrl);
    await page.waitForFunction(() => document.querySelectorAll('[data-verse-list] .bible-verse').length === 39);
    await page.waitForFunction(() => document.querySelector('[data-login-account]')?.textContent === 'scroll-regression@example.com');

    const position = () => page.evaluate(() => ({
      page: scrollY,
      reader: document.querySelector('[data-verse-list]').scrollTop,
      verse: document.querySelector('#heb-10-25').getBoundingClientRect().top,
    }));
    for (const action of ['toggle-bookmark', 'toggle-bookmark', 'toggle-read-verse', 'toggle-read-verse']) {
      const verse = page.locator('#heb-10-25');
      await verse.scrollIntoViewIfNeeded();
      const before = await position();
      const saves = await page.evaluate(() => window.__bibleScrollFixture.saves);
      await verse.locator(`[data-action="${action}"]`).click();
      await page.waitForFunction(previous => window.__bibleScrollFixture.saves > previous, saves);
      const immediate = await position();
      assert.ok(Math.abs(immediate.reader - before.reader) <= 3 && Math.abs(immediate.page - before.page) <= 3,
        `${viewport.width}px ${action}: clicking must not move the reading position`);

      const loads = await page.evaluate(() => {
        const fixture = window.__bibleScrollFixture;
        fixture.snapshot.updatedAt = new Date(Date.now() + 1000).toISOString();
        fixture.snapshot.readVerses = [...new Set([...fixture.snapshot.readVerses, 'heb-10-3'])];
        window.__stableVerseNode = document.querySelector('#heb-10-25');
        window.__refreshBibleFixture();
        return fixture.loads;
      });
      await page.waitForFunction(previous => window.__bibleScrollFixture.loads > previous, loads - 1);
      await page.waitForTimeout(250);
      const after = await position();
      assert.ok(Math.abs(after.reader - immediate.reader) <= 3 && Math.abs(after.page - immediate.page) <= 3,
        `${viewport.width}px ${action}: background refresh moved the reader: ${JSON.stringify({ before: immediate, after })}`);
      assert.equal(await page.evaluate(() => window.__stableVerseNode === document.querySelector('#heb-10-25')), true,
        'background refresh must retain the current verse nodes and focus');
      assert.equal(await page.locator('#heb-10-3 [data-action="toggle-read-verse"]').getAttribute('aria-pressed'), 'true',
        'incoming read-state changes must still update the existing verse buttons');
      if (action === 'toggle-read-verse') {
        assert.equal(await verse.locator('[data-action="toggle-read-verse"]').getAttribute('aria-pressed'),
          await page.evaluate(() => String(window.__bibleScrollFixture.snapshot.readVerses.includes('heb-10-25'))));
      } else {
        assert.equal(await verse.locator('[data-action="toggle-bookmark"]').getAttribute('aria-label'),
          await page.evaluate(() => window.__bibleScrollFixture.snapshot.bookmarks.some(item => item.book === 'heb' && item.chapter === 10 && item.verse === 25) ? '取消收藏' : '收藏'));
      }
      console.log(`PASS ${viewport.width}px ${action}: click and background refresh preserve the viewport`);
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'reader must not overflow horizontally');
    await page.screenshot({ path: `.private/bible-reader-scroll-${viewport.width}.png`, fullPage: false });

    const syncButton = page.locator('.bible-reading-header [data-action="cloud-login"]');
    await syncButton.scrollIntoViewIfNeeded();
    const beforeManualSync = await position();
    const manualLoads = await page.evaluate(() => window.__bibleScrollFixture.loads);
    await syncButton.click();
    await page.waitForFunction(previous => window.__bibleScrollFixture.loads > previous, manualLoads);
    await page.waitForTimeout(250);
    const afterManualSync = await position();
    assert.ok(Math.abs(afterManualSync.reader - beforeManualSync.reader) <= 3 && Math.abs(afterManualSync.page - beforeManualSync.page) <= 3,
      `${viewport.width}px same-account sync must not move the viewport: ${JSON.stringify({ before: beforeManualSync, after: afterManualSync })}`);
    console.log(`PASS ${viewport.width}px same-account sync preserves reading position`);

    await page.evaluate(() => {
      const fixture = window.__bibleScrollFixture;
      fixture.snapshot.lastRead = { book: 'gen', chapter: 1, verse: 1, updatedAt: new Date().toISOString() };
      fixture.snapshot.updatedAt = new Date(Date.now() + 2000).toISOString();
      window.__refreshBibleFixture();
    });
    await page.waitForTimeout(250);
    assert.equal(await page.locator('[data-current-title]').textContent(), '希伯来书 10',
      'another device changing last-read must not navigate this active reader');
    await page.locator('[data-chapter="11"]').click();
    await page.waitForFunction(() => document.querySelector('[data-verse-list] #heb-11-1'));
    assert.equal(await page.locator('[data-current-title]').textContent(), '希伯来书 11', 'explicit chapter navigation still works');

    await page.goto(`${pageUrl}&delay-first-sync=1`);
    await page.waitForFunction(() => document.querySelectorAll('[data-verse-list] .bible-verse').length === 39
      && window.__bibleScrollFixture?.releaseInitial);
    await page.locator('#heb-10-25').scrollIntoViewIfNeeded();
    const beforeAccountRestore = await position();
    await page.evaluate(() => {
      window.__bibleScrollFixture.snapshot.lastRead = { book: 'gen', chapter: 1, verse: 1, updatedAt: new Date().toISOString() };
      window.__bibleScrollFixture.releaseInitial();
    });
    await page.waitForTimeout(250);
    assert.equal(await page.locator('[data-current-title]').textContent(), '希伯来书 10', 'delayed account restoration must not interrupt an active reader');
    const afterAccountRestore = await position();
    assert.ok(Math.abs(afterAccountRestore.reader - beforeAccountRestore.reader) <= 3 && Math.abs(afterAccountRestore.page - beforeAccountRestore.page) <= 3,
      `${viewport.width}px delayed account restoration must preserve the reading viewport`);
    console.log(`PASS ${viewport.width}px delayed account restoration preserves the current chapter and viewport`);
    await context.close();
  }
} finally {
  await browser.close();
}
