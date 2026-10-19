import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const destination = 'https://www.magicj.cn/officialwebsite/super-calendar/index.html#life';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 } });
    await context.route('https://www.magicj.cn/officialwebsite/super-calendar/index.html*', route => route.fulfill({ status: 200, contentType: 'text/html', body: '<title>Navigation destination check</title>' }));
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4326/officialwebsite/workstation.html');
    const card = page.locator('.station-node').filter({ has: page.locator('strong', { hasText: /^个人计划$/ }) });
    await card.waitFor();
    assert.equal(await card.getAttribute('href'), destination);
    assert.equal(await card.locator('small').textContent(), '安排每一天的优先事项');
    assert.equal(await page.locator('.station-node').count(), 8);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `${process.env.TEMP}/workstation-plan-link-${width}.png` });
    const [popup] = await Promise.all([page.waitForEvent('popup'), card.click()]);
    await popup.waitForLoadState('domcontentloaded');
    assert.equal(popup.url(), destination);
    console.log(`PASS ${width}: personal plan opens the exact calendar URL including #life`);
    await context.close();
  }
} finally { await browser.close(); }
