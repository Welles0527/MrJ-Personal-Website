import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const width of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 900 } });
    await page.addInitScript(() => localStorage.setItem('magicj.home-intro.seen', '1'));
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.env.HOMEPAGE_THEME_URL || 'http://127.0.0.1:4326/');
    const state = () => page.evaluate(() => ({
      dark: document.documentElement.classList.contains('dark'),
      background: getComputedStyle(document.body).backgroundColor,
      pressed: document.querySelector('.theme-toggle').getAttribute('aria-pressed'),
    }));
    const original = await state();
    await page.locator('.theme-toggle').click();
    const changed = await state();
    assert.notEqual(changed.dark, original.dark, `${width}: theme button changes root state`);
    assert.notEqual(changed.background, original.background, `${width}: visible background changes`);
    assert.equal(changed.pressed, String(changed.dark));
    await page.waitForTimeout(500);
    const actions = await page.locator('.hero-actions').evaluate(element => {
      const links = [element.querySelector('div > a'), element.querySelector('a.mrj-outline')];
      return links.map(link => ({ color: getComputedStyle(link).color, border: getComputedStyle(link).borderTopColor }));
    });
    assert.deepEqual(actions[0], actions[1], `${width}: secondary actions stay equally readable`);
    await page.screenshot({ path: `${process.env.TEMP}/homepage-theme-${width}.png` });
    await page.reload();
    assert.equal((await state()).dark, changed.dark, `${width}: reload keeps selected theme`);
    await page.locator('.theme-toggle').focus();
    await page.keyboard.press('Enter');
    assert.equal((await state()).dark, original.dark, `${width}: keyboard restores theme`);
    await page.locator('#projects').scrollIntoViewIfNeeded();
    if (width === 390) await page.locator('.projects-nav-toggle').click();
    await page.locator('.theme-toggle').click();
    assert.equal((await state()).dark, changed.dark, `${width}: project navigation theme still works`);
    assert.deepEqual(errors, []);
    console.log('PASS', width, 'light/dark, visible change, persistence, keyboard and project menu');
    await page.close();
  }
} finally {
  await browser.close();
}
