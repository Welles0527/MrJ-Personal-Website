import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 900 } });
    await page.addInitScript(() => localStorage.setItem('magicj.home-intro.seen', '1'));
    await page.goto('http://127.0.0.1:4326/');
    const contact = page.locator('.front-contact');
    await contact.scrollIntoViewIfNeeded();
    assert.equal(await contact.locator('.eyebrow').count(), 0);
    assert.equal(await contact.locator('a.mrj-outline').count(), 0);
    assert.equal(await contact.locator('h2').textContent(), '让想法，发生。');
    assert.equal(await contact.locator('button.contact-button').count(), 1);
    assert.equal(await contact.locator('.station-entry').getAttribute('href'), '/officialwebsite/workstation.html');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await contact.screenshot({ path: `${process.env.TEMP}/homepage-contact-${width}.png` });
    await contact.locator('button.contact-button').click();
    const dialog = page.locator('.site-contact-dialog');
    await dialog.waitFor({ state: 'visible' });
    const bounds = await dialog.boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width);
    await dialog.locator('.site-contact-close').click();
    assert.equal(await dialog.evaluate(e => e.open), false);
    console.log(`PASS ${width}: requested elements removed, other content preserved, QR opens and closes`);
    await page.close();
  }
} finally { await browser.close(); }
