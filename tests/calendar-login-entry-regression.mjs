import { chromium } from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const base = process.env.CALENDAR_TEST_BASE || 'http://127.0.0.1:4421/officialwebsite';
const credentials = JSON.parse(fs.readFileSync(process.env.ACCOUNT_TEST_CREDENTIALS, 'utf8'));
const evidence = process.env.CALENDAR_TEST_EVIDENCE;
const browser = await chromium.launch({ channel: 'chrome' });
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: width === 1440 ? 900 : 844 } });
    const page = await context.newPage();
    await page.goto(`${base}/super-calendar/#life?view=month`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!window.MagicJAccount);
    // A click during the async account check must not open the legacy iframe.
    await page.locator('#mj-account').evaluate(el => delete el.dataset.auth);
    await page.locator('[data-calendar-login]').click();
    const login = page.locator('#mj-login');
    await login.waitFor({ state: 'visible' });
    assert.equal(await page.locator('#calendar-account-dialog').evaluate(el => el.open), false);
    const bounds = await login.boundingBox();
    assert.ok(bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= width);
    assert.equal(await login.evaluate(el => el.scrollWidth > el.clientWidth), false);
    if (evidence) await page.screenshot({ path: `${evidence}/calendar-login-${width}.png` });
    await login.locator('[name=email]').fill(credentials.email);
    await login.locator('[name=password]').fill(credentials.password);
    await login.locator('[type=submit]').click();
    await login.waitFor({ state: 'hidden', timeout: 45000 });
    for (const suffix of ['', 'index.html']) {
      if (suffix) await page.goto(`${base}/super-calendar/${suffix}#life?view=month`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(email => document.querySelector('[data-calendar-login]')?.textContent === email, credentials.email, { timeout: 45000 });
      const frame = page.frameLocator('#calendar-account-dialog iframe');
      await frame.locator('#auth-account').waitFor({ state: 'attached', timeout: 30000 });
      assert.equal(await frame.locator('[data-todo-app]').count(), 0, 'bridge must replace the Todo shell');
      await page.locator('[data-calendar-login]').click();
      const account = page.locator('#calendar-account-dialog');
      await account.waitFor({ state: 'visible' });
      const box = await account.boundingBox();
      assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= width && box.y + box.height <= (width === 1440 ? 900 : 844));
      assert.ok(Math.abs(box.x + box.width / 2 - width / 2) <= 2, 'account dialog must be centered');
      assert.equal(await frame.locator('h2').innerText(), '网站账号');
      assert.equal(await frame.locator('#auth-logout').isVisible(), true);
      if (evidence) await page.screenshot({ path: `${evidence}/calendar-account-${width}.png` });
      await page.locator('#calendar-account-close').click();
      console.log(`PASS ${width} ${suffix || '/'} actual native login, bridge and account dialog`);
    }
    await page.locator('[data-calendar-login]').click();
    await page.frameLocator('#calendar-account-dialog iframe').locator('#auth-logout').click();
    await page.waitForFunction(() => !document.querySelector('#calendar-account-dialog').open && document.querySelector('#mj-account')?.dataset.auth === 'guest', null, { timeout: 30000 });
    await context.close();
  }
} finally { await browser.close(); }
