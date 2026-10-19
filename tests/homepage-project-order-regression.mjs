import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const expected = ['travel', 'bible', 'resume', 'calendar', 'tools', 'funds'];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 900 } });
    await page.addInitScript(() => localStorage.setItem('magicj.home-intro.seen', '1'));
    await page.goto('http://127.0.0.1:4326/');
    const cards = page.locator('#projects .feature-card');
    await cards.first().waitFor();
    assert.deepEqual(await cards.evaluateAll(elements => elements.map(e => e.dataset.project)), expected);
    assert.deepEqual(await cards.locator('.feature-index').allTextContents(), ['01', '02', '03', '04', '05', '06']);
    const boxes = await cards.evaluateAll(elements => elements.map(e => {
      const r = e.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height, href: e.getAttribute('href') };
    }));
    assert.ok(boxes.every(b => b.href && Math.abs(b.width - b.height) < 2));
    assert.ok(width === 1440 ? boxes[1].x > boxes[0].x && boxes[2].y > boxes[0].y : boxes.every((b, i) => !i || b.y > boxes[i - 1].y));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    for (const index of [0, 2, 4]) {
      await cards.nth(index).scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${process.env.TEMP}/project-order-${width}-${index}.png` });
    }
    await cards.first().locator('.project-like').click();
    assert.equal(await cards.first().locator('.project-like').getAttribute('aria-pressed'), 'true');
    console.log(`PASS ${width}: order, numbering, placement, square cards, links and likes`);
    await page.close();
  }
} finally { await browser.close(); }
