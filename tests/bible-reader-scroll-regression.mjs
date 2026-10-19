import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl = process.env.BIBLE_SCROLL_TEST_URL || 'http://127.0.0.1:4362';
const pageUrl = `${baseUrl}/officialwebsite/topics/applications/inspiration-station/theology/?book=heb&chapter=10&verse=1`;
const authStub = `
  let session = new URL(location.href).searchParams.has('signed-out') ? null
    : { uid: 'scroll-regression-user', account: 'scroll-regression@example.com' };
  export const getRememberedSession = () => session;
  export const getCloudSession = async () => session;
  export const getCloudDb = () => ({});
  export const signInWithPassword = async () => {
    session = { uid: 'scroll-regression-user', account: 'scroll-regression@example.com' };
    return session;
  };
  export const signOut = async () => {
    window.__bibleSignOutCalls = (window.__bibleSignOutCalls || 0) + 1;
    session = null;
    window.dispatchEvent(new CustomEvent('site-auth-change', { detail: null }));
  };
  export const startEmailSignUp = async () => async () => session;
  export const cloudErrorMessage = (error, fallback) => error?.message || fallback;
`;
const storeStub = `
  const fixture = window.__bibleScrollFixture = {
    loads: 0, saves: 0,
    holdInitial: new URL(location.href).searchParams.has('delay-first-sync'),
    snapshot: {
      lastRead: new URL(location.href).searchParams.has('foreign-last-read')
        ? { book: 'mat', chapter: 20, verse: 1, updatedAt: '2026-10-12T00:00:00.000Z' }
        : { book: 'heb', chapter: 10, verse: 1, updatedAt: '2026-10-12T00:00:00.000Z' },
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
    for (const explicitChapter of [true, false]) {
      const coldContext = await browser.newContext({ viewport, reducedMotion: 'reduce' });
      const coldPage = await coldContext.newPage();
      let releaseFullText;
      const fullTextGate = new Promise(resolve => { releaseFullText = resolve; });
      await coldPage.route('**/*site-auth.ts*', route => route.fulfill({ contentType: 'application/javascript', body: authStub }));
      await coldPage.route('**/*bible-reader-cloud-store.ts*', route => route.fulfill({ contentType: 'application/javascript', body: storeStub }));
      await coldPage.route('**/data/bible/chi-cuv-simp.json', async route => {
        await fullTextGate;
        await route.continue();
      });
      const target = explicitChapter
        ? `${pageUrl.replace('verse=1', 'verse=25')}&foreign-last-read=1`
        : `${baseUrl}/officialwebsite/topics/applications/inspiration-station/theology/?foreign-last-read=1`;
      await coldPage.goto(target, { waitUntil: 'domcontentloaded' });
      await coldPage.waitForFunction(() => document.querySelector('[data-reading-sync-status]')?.dataset.status === 'saved');
      releaseFullText();
      const expectedBook = explicitChapter ? 'heb' : 'mat';
      const expectedChapter = explicitChapter ? '10' : '20';
      const expectedVerse = explicitChapter ? '25' : '1';
      await coldPage.waitForFunction(() => document.querySelector('[data-verse-list] .bible-verse'));
      assert.equal(await coldPage.locator('[data-current-title]').textContent(), explicitChapter ? '希伯来书 10' : '马太福音 20',
        'cold account restoration must honor explicit links, but resume cloud progress when no book is requested');
      const currentUrl = new URL(coldPage.url());
      assert.equal(currentUrl.searchParams.get('book'), expectedBook);
      assert.equal(currentUrl.searchParams.get('chapter'), expectedChapter);
      assert.equal(currentUrl.searchParams.get('verse'), expectedVerse);
      assert.equal(await coldPage.locator(`#${expectedBook}-${expectedChapter}-${expectedVerse}`).getAttribute('class').then(value => value.includes('is-target')), true,
        'full-text loading must preserve the requested verse');
      console.log(`PASS ${viewport.width}px cold restore: ${explicitChapter ? 'explicit chapter and verse retained' : 'cloud reading position resumed'}`);
      await coldContext.close();
    }
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

    const syncButton = page.locator('.bible-account-bar [data-action="cloud-login"]');
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
    await page.waitForTimeout(250);
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
      `${viewport.width}px delayed account restoration must preserve the reading viewport: ${JSON.stringify({ before: beforeAccountRestore, after: afterAccountRestore })}`);
    console.log(`PASS ${viewport.width}px delayed account restoration preserves the current chapter and viewport`);

    const homeUrl = `${baseUrl}/officialwebsite/topics/applications/inspiration-station/theology/`;
    await page.goto(homeUrl);
    await page.waitForFunction(() => document.querySelector('[data-login-account]')?.textContent === 'scroll-regression@example.com');
    assert.equal(await page.locator('[data-action="cloud-login"]').count(), 1, 'only one sync entry may remain');
    assert.equal(await page.locator('.bible-reading-header [data-action="cloud-login"]').count(), 0);
    assert.equal(await page.getByText('J-Space', { exact: true }).count(), 0);
    assert.equal(await page.locator('[data-action="cloud-logout"]').isVisible(), true);
    await page.waitForTimeout(250);
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: `.private/bible-account-toolbar-home-${viewport.width}.png` });
    const controls = await page.locator('.bible-account-controls').boundingBox();
    assert.ok(controls && controls.x + controls.width <= viewport.width && controls.y < 30, 'account controls must be in the top-right toolbar');
    const toolbarHeight = await page.locator('.bible-account-bar').evaluate(node => node.getBoundingClientRect().height);
    await page.evaluate(() => {
      document.querySelector('[data-reading-sync-status]').textContent = '暂时无法核实登录会话，将自动重试。请稍后重试。'.repeat(4);
      scrollTo(0, 800);
    });
    await page.waitForTimeout(250);
    assert.equal(await page.locator('.bible-account-bar').evaluate(node => node.getBoundingClientRect().height), toolbarHeight,
      'sync messages must not resize the toolbar or move the reading position');
    assert.ok(await page.locator('.bible-account-bar').evaluate(node => Math.abs(node.getBoundingClientRect().top) <= 1),
      'account controls must remain available while reading');
    const toolbarLayout = await page.locator('.bible-account-bar').evaluate(node => {
      const bar = node.getBoundingClientRect();
      return [...node.querySelectorAll('.bible-account-controls button, .bible-account-controls a')].map(button => {
        const rect = button.getBoundingClientRect();
        return { label: button.textContent.trim(), top: rect.top, bottom: rect.bottom, barTop: bar.top, barBottom: bar.bottom };
      });
    });
    assert.ok(toolbarLayout.every(rect => rect.top >= rect.barTop && rect.bottom <= rect.barBottom),
      `toolbar buttons must not be clipped: ${JSON.stringify(toolbarLayout)}`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `.private/bible-account-toolbar-reader-${viewport.width}.png` });

    await page.locator('[data-action="cloud-logout"]').click();
    await page.waitForFunction(() => document.querySelector('[data-action="cloud-logout"]').hidden);
    assert.equal(await page.evaluate(() => window.__bibleSignOutCalls), 1);
    assert.equal(await page.locator('[data-login-account]').isHidden(), true);
    assert.equal(await syncButton.textContent(), '账号登录');
    assert.equal(await page.locator('[data-login-modal]').evaluate(node => node.open), false, 'logout must not automatically open a login dialog');
    await syncButton.click();
    await page.locator('[data-login-form] input[name="email"]').fill('scroll-regression@example.com');
    await page.locator('[data-login-form] input[name="password"]').fill('fixture-only-password');
    await page.locator('[data-login-form] button[type="submit"]').click();
    await page.waitForFunction(() => !document.querySelector('[data-login-modal]').open && !document.querySelector('[data-action="cloud-logout"]').hidden);
    assert.equal(await syncButton.textContent(), '同步账号');
    assert.equal(await page.locator('.bible-account-bar').evaluate(node => node.getBoundingClientRect().height), toolbarHeight);
    console.log(`PASS ${viewport.width}px single sticky account toolbar, logout, login and stable layout`);
    await context.close();

    const guestContext = await browser.newContext({ viewport });
    await guestContext.route('**/*site-auth.ts*', route => route.fulfill({ contentType: 'application/javascript', body: authStub }));
    const workstationUrl = `${baseUrl}/officialwebsite/workstation.html`;
    const guestUrl = `${homeUrl}?signed-out=1`;
    await guestContext.route('**/workstation.html', route => route.fulfill({ contentType: 'text/html', body: `<a id="open-bible" href="${guestUrl}">Open Bible</a>` }));
    const guest = await guestContext.newPage();
    await guest.goto(guestUrl);
    await guest.waitForSelector('[data-action="cloud-login"]');
    assert.equal(await guest.locator('[data-action="cloud-logout"]').isHidden(), true);
    await guest.locator('[data-action="cloud-login"]').click();
    assert.equal(await guest.locator('[data-login-modal]').evaluate(node => node.open), true);
    await guest.locator('[data-action="close-login"]').click();
    await guest.locator('[data-action="go-back"]').click();
    await guest.waitForURL(workstationUrl);
    await guest.locator('#open-bible').click();
    await guest.waitForURL(guestUrl);
    await guest.locator('[data-action="go-back"]').click();
    await guest.waitForURL(workstationUrl);
    console.log(`PASS ${viewport.width}px guest login, direct-entry fallback and same-site back navigation`);
    await guestContext.close();
  }
} finally {
  await browser.close();
}
