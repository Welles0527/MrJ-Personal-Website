import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';

const url = 'http://127.0.0.1:4326/';
const previousHtml = execFileSync('git', ['show', '92c5d32:public/homepage-root.html'], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const measurements = page => page.evaluate(() => {
  const box = selector => {
    const r = document.querySelector(selector).getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  };
  return {
    navigation: box('#main-navigation'),
    photo: box('.hero-photo-stack > div'),
    story: box('.hero-story'),
    actions: box('.hero-actions'),
    stats: box('.hero-stats'),
    hint: box(innerWidth < 768 ? '.hero-scroll-hint' : '.project-scroll-cue'),
    hintTransform: getComputedStyle(document.querySelector(innerWidth < 768 ? '.hero-scroll-hint' : '.project-scroll-cue')).transform,
    projects: box('#projects'),
    backHidden: getComputedStyle(document.querySelector('.site-page-back')).display === 'none',
    overflow: document.documentElement.scrollWidth > innerWidth,
  };
});
try {
  for (const [width, height] of [[390, 844], [619, 1105], [375, 667], [700, 900], [1440, 900]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(() => localStorage.setItem('magicj.home-intro.seen', '1'));
    await page.route(url, route => route.fulfill({ status: 200, contentType: 'text/html', body: previousHtml }));
    await page.goto(url);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1500);
    const before = await measurements(page);
    await page.unroute(url);
    await page.goto(url);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1500);
    const after = await measurements(page);
    assert.equal(after.overflow, false, `${width}: no horizontal overflow`);
    assert.equal(after.backHidden, width < 768, `${width}: only mobile back button is hidden`);
    const offset = transform => transform === 'none' ? 0 : Number(transform.split(',').at(-1).replace(')', ''));
    assert.equal(offset(after.hintTransform) - offset(before.hintTransform), 24, `${width}: cue moves down 24px`);
    for (const key of ['photo', 'story', 'actions', 'stats', 'projects']) {
      for (const dimension of ['x', 'y', 'width', 'height']) assert.ok(Math.abs(after[key][dimension] - before[key][dimension]) < 1, `${width}: preserve ${key}.${dimension}`);
    }
    if (width < 768) {
      assert.ok(Math.abs(after.navigation.x + after.navigation.width / 2 - width / 2) < 1, `${width}: mobile navigation is centered`);
      assert.ok(after.navigation.x + after.navigation.width <= width, `${width}: navigation fits`);
    } else assert.deepEqual(after.navigation, before.navigation, 'desktop navigation unchanged');
    await page.screenshot({ path: `${process.env.TEMP}/homepage-nav-layout-${width}.png` });
    const cue = page.locator(width < 768 ? '.hero-scroll-hint' : '.project-scroll-cue');
    await cue.click();
    await page.waitForFunction(() => document.querySelector('#projects').getBoundingClientRect().top < 180);
    if (width < 768) {
      await page.locator('.projects-nav-toggle').click();
      await page.locator('#main-navigation').waitFor({ state: 'visible' });
      assert.equal(await page.locator('.projects-nav-toggle').getAttribute('aria-expanded'), 'true');
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.projects-nav-toggle').getAttribute('aria-expanded'), 'false');
    }
    console.log(`PASS ${width}x${height}: alignment, back visibility, cue offset, preserved layout and navigation`);
    await page.close();
  }
} finally { await browser.close(); }
