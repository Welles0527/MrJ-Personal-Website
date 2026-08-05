import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.PHOTO_WALL_BASE_URL || 'http://127.0.0.1:4322/officialwebsite';
const outputDirectory = path.resolve('tmp/photo-wall-qa');
const expectedAlbumCount = 2154;
const expectedEventCounts = {
  大事记: 1466,
  小事记: 358,
  Jamaica标志性照片: 34,
  前期考察: 196,
  其他: 100,
};
const expectedCategoryCounts = { people: 1125, scenery: 1029 };
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
  assert.match(await page.locator('.album-card').innerText(), new RegExp(`${expectedAlbumCount} 张照片`));
  await assertNoHorizontalOverflow();
  await page.screenshot({ path: path.join(outputDirectory, 'desktop-index.png'), fullPage: true });

  await page.locator('.album-card').click();
  await page.waitForURL('**/photo-wall/jamaica**');
  assert.equal((await page.locator('.home-link').innerText()).trim(), 'J先生个人空间');
  assert.equal(await page.locator('.home-link').getAttribute('href'), '/officialwebsite/');
  assert.equal(await page.locator('.photo-card').count(), expectedAlbumCount);
  assert.equal(await page.locator('.photo-card:not([hidden])').count(), expectedAlbumCount);
  assert.equal(await page.locator('.chapter-section').count(), 58);
  assert.match(await page.locator('.hero h1').innerText(), /牙买加/);
  assert.deepEqual(
    await page.locator('.filter-button[data-filter-group="event"]:not([data-filter-value="all"])').evaluateAll((buttons) =>
      buttons.map((button) => button.getAttribute('data-filter-value')),
    ),
    Object.keys(expectedEventCounts),
  );
  await assertNoHorizontalOverflow();

  for (const [event, count] of Object.entries(expectedEventCounts)) {
    await page.locator(`.filter-button[data-filter-group="event"][data-filter-value="${event}"]`).click();
    assert.equal(await page.locator('.photo-card:not([hidden])').count(), count);
    assert.equal((await page.locator('.visible-count').innerText()).trim(), `显示 ${count} 张`);
  }

  await page.locator('.filter-button[data-filter-group="event"][data-filter-value="all"]').click();
  for (const [category, count] of Object.entries(expectedCategoryCounts)) {
    await page.locator(`.filter-button[data-filter-group="category"][data-filter-value="${category}"]`).click();
    assert.equal(await page.locator('.photo-card:not([hidden])').count(), count);
  }

  await page.locator('.filter-button[data-filter-group="category"][data-filter-value="people"]').click();
  await page.locator('.filter-button[data-filter-group="event"][data-filter-value="大事记"]').click();
  assert.equal(await page.locator('.photo-card:not([hidden])').count(), 828);
  await page.locator('.filter-button[data-filter-group="event"][data-filter-value="all"]').click();
  await page.locator('.filter-button[data-filter-group="category"][data-filter-value="all"]').click();
  await page.locator('.photo-card:not([hidden])').first().click();
  await page.waitForFunction(() => document.querySelector('#lightbox')?.open === true);
  assert.equal((await page.locator('#lightbox-position').innerText()).trim(), `1 / ${expectedAlbumCount}`);
  assert.match(await page.locator('#lightbox-chapter').innerText(), /Jamaica标志性照片/);
  assert.equal((await page.locator('#lightbox-file').innerText()).trim(), '01.jpg');
  await page.locator('.lightbox-next').click();
  assert.equal((await page.locator('#lightbox-position').innerText()).trim(), `2 / ${expectedAlbumCount}`);
  await page.locator('.lightbox-close').click();
  assert.equal(await page.locator('#lightbox').evaluate((dialog) => dialog.open), false);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: path.join(outputDirectory, 'desktop-album.png'), fullPage: false });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}/topics/space/travel/photo-wall/jamaica/`, { waitUntil: 'domcontentloaded' });
  await page.locator('.photo-card').first().waitFor();
  assert.equal(await page.locator('.photo-card').count(), expectedAlbumCount);
  await assertNoHorizontalOverflow();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator('.photo-card').first().click();
  await page.waitForFunction(() => {
    const image = document.querySelector('#lightbox-image');
    return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0;
  });
  const controls = ['.lightbox-close', '.lightbox-previous', '.lightbox-next'];
  for (const selector of controls) {
    const box = await page.locator(selector).boundingBox();
    assert.ok(box, `${selector} is not visible`);
    assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= 390 && box.y + box.height <= 844, `${selector} is outside the viewport`);
  }
  await page.screenshot({ path: path.join(outputDirectory, 'mobile-lightbox.png'), fullPage: false });
  await page.locator('.lightbox-close').click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: path.join(outputDirectory, 'mobile-album.png'), fullPage: false });

  console.log(JSON.stringify({
    index: 'ok',
    albumPhotos: expectedAlbumCount,
    eventFilters: expectedEventCounts,
    categoryFilters: expectedCategoryCounts,
    combinedFilter: { event: '大事记', category: 'people', count: 828 },
    lightbox: 'ok',
    desktopViewport: '1440x900',
    mobileViewport: '390x844',
    horizontalOverflow: 0,
    screenshots: outputDirectory,
  }, null, 2));
} finally {
  await browser.close();
}
