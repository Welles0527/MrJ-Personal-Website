import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.PHOTO_WALL_BASE_URL || 'http://127.0.0.1:4322/officialwebsite';
const outputDirectory = path.resolve('tmp/photo-wall-qa');
await mkdir(outputDirectory, { recursive: true });

const browserCandidates = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];
const executablePath = browserCandidates.find((candidate) => existsSync(candidate));
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });

const assertNoHorizontalOverflow = async () => {
  const widths = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  assert.ok(widths.scrollWidth <= widths.clientWidth + 1, `Horizontal overflow: ${JSON.stringify(widths)}`);
};

try {
  const indexResponse = await page.goto(`${baseUrl}/topics/space/travel/photo-wall/`, { waitUntil: 'networkidle' });
  assert.equal(indexResponse?.status(), 200);
  assert.equal(await page.locator('.album-card').count(), 1);
  assert.match(await page.locator('.album-card').innerText(), /牙买加/);
  assert.match(await page.locator('.album-card').innerText(), /450 张照片/);
  await assertNoHorizontalOverflow();
  await page.screenshot({ path: path.join(outputDirectory, 'desktop-index.png'), fullPage: true });

  await page.locator('.album-card').click();
  await page.waitForURL('**/photo-wall/jamaica**');
  assert.equal((await page.locator('.home-link').innerText()).trim(), 'J先生个人空间');
  assert.equal(await page.locator('.home-link').getAttribute('href'), '/officialwebsite/');
  assert.equal(await page.locator('.photo-card').count(), 450);
  assert.equal(await page.locator('.photo-card:not([hidden])').count(), 450);
  assert.match(await page.locator('h1').innerText(), /牙买加/);
  await assertNoHorizontalOverflow();

  const expectedYearCounts = { 2003: 53, 2004: 68, 2005: 329 };
  for (const [year, count] of Object.entries(expectedYearCounts)) {
    await page.locator(`.filter-button[data-filter="${year}"]`).click();
    assert.equal(await page.locator('.photo-card:not([hidden])').count(), count);
    assert.equal((await page.locator('.visible-count').innerText()).trim(), `显示 ${count} 张`);
  }

  await page.locator('.filter-button[data-filter="all"]').click();
  await page.locator('.photo-card').first().click();
  await page.waitForFunction(() => document.querySelector('#lightbox')?.open === true);
  assert.equal((await page.locator('#lightbox-position').innerText()).trim(), '1 / 450');
  await page.locator('.lightbox-next').click();
  assert.equal((await page.locator('#lightbox-position').innerText()).trim(), '2 / 450');
  await page.locator('.lightbox-close').click();
  assert.equal(await page.locator('#lightbox').evaluate((dialog) => dialog.open), false);
  await page.screenshot({ path: path.join(outputDirectory, 'desktop-album.png'), fullPage: false });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}/topics/space/travel/photo-wall/jamaica/`, { waitUntil: 'networkidle' });
  assert.equal(await page.locator('.photo-card').count(), 450);
  await assertNoHorizontalOverflow();
  await page.locator('.photo-card').first().click();
  const controls = ['.lightbox-close', '.lightbox-previous', '.lightbox-next'];
  for (const selector of controls) {
    const box = await page.locator(selector).boundingBox();
    assert.ok(box, `${selector} is not visible`);
    assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= 390 && box.y + box.height <= 844, `${selector} is outside the viewport`);
  }
  await page.screenshot({ path: path.join(outputDirectory, 'mobile-lightbox.png'), fullPage: false });
  await page.locator('.lightbox-close').click();
  await page.screenshot({ path: path.join(outputDirectory, 'mobile-album.png'), fullPage: false });

  console.log(JSON.stringify({
    index: 'ok',
    albumPhotos: 450,
    filters: expectedYearCounts,
    lightbox: 'ok',
    desktopViewport: '1440x900',
    mobileViewport: '390x844',
    horizontalOverflow: 0,
    screenshots: outputDirectory,
  }, null, 2));
} finally {
  await browser.close();
}
