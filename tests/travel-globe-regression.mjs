import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium, devices } from 'playwright';

const url = process.env.TRAVEL_GLOBE_URL || 'http://127.0.0.1:4326/officialwebsite/topics/space/travel/travel-map/';
const output = process.env.TRAVEL_GLOBE_OUTPUT || path.join(os.tmpdir(), 'magicj-travel-globe-qa');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless: true });
try {
  for (const scenario of ['mobile-slow-imagery', 'mobile-without-webgl', 'mobile-normal', 'desktop-normal']) {
    const mobile = scenario.startsWith('mobile');
    const context = await browser.newContext(mobile ? { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } } : { viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    let heldRequests = 0;
    let releaseMetadata;
    const metadataGate = new Promise(resolve => { releaseMetadata = resolve; });
    try {
      if (scenario === 'mobile-slow-imagery') {
        await page.route(requestUrl => requestUrl.href.includes('services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer'), async route => {
          heldRequests++;
          await metadataGate;
          await route.abort().catch(() => {});
        });
      }
      if (scenario === 'mobile-without-webgl') {
        await page.addInitScript(() => {
          const original = HTMLCanvasElement.prototype.getContext;
          HTMLCanvasElement.prototype.getContext = function (type, ...args) {
            return /^(webgl2?|experimental-webgl)$/.test(type) ? null : original.call(this, type, ...args);
          };
        });
      }
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      assert.equal(response.status(), 200);
      assert.ok((await response.text()).includes('正在展开3D相册，首次加载较慢，请耐心等待。'));
      const firstAlbum = page.locator('.album-focus').first();
      await (mobile ? firstAlbum.tap({ timeout: 5000 }) : firstAlbum.click({ timeout: 5000 }));
      assert.equal(await page.locator('[data-selection]').isVisible(), true, `${scenario}: album preview must work independently of map initialization`);
      const album = await page.locator('#cesium-albums').evaluate(element => JSON.parse(element.textContent)[0]);
      assert.equal(await page.locator('[data-selection-title]').textContent(), album.name);
      assert.equal(new URL(await page.locator('[data-selection-link]').getAttribute('href'), url).pathname, new URL(album.href, url).pathname);
      await page.waitForFunction(() => ['true', 'fallback'].includes(document.querySelector('[data-atlas]')?.dataset.ready), undefined, { timeout: 10000 });
      const flatButton = page.locator('[data-mode="2d"]');
      await (mobile ? flatButton.tap({ timeout: 5000 }) : flatButton.click({ timeout: 5000 }));
      assert.equal(await flatButton.getAttribute('aria-pressed'), 'true');
      if (scenario === 'mobile-without-webgl') {
        assert.equal(await page.locator('[data-atlas]').getAttribute('data-ready'), 'fallback');
        assert.equal(await page.locator('[data-fallback-map]').isVisible(), true);
        assert.equal(await page.locator('#cesium-globe').isVisible(), false);
        assert.equal(await page.locator('.cesium-widget-errorPanel').isVisible(), false);
        await page.waitForFunction(() => [...document.querySelectorAll('.fallback-earth>img')].every(image => image.complete && image.naturalWidth > 0));
        await page.locator(`.fallback-pin[data-focus="${album.id}"]`).tap({ timeout: 5000 });
        assert.equal(await page.locator('[data-selection]').isVisible(), true);
      } else {
        assert.equal(await page.locator('[data-atlas]').getAttribute('data-ready'), 'true');
        const globeButton = page.locator('[data-mode="3d"]');
        await (mobile ? globeButton.tap({ timeout: 5000 }) : globeButton.click({ timeout: 5000 }));
        assert.equal(await globeButton.getAttribute('aria-pressed'), 'true');
        assert.equal(await page.locator('#cesium-globe canvas').count(), 1);
      }
      if (scenario === 'mobile-slow-imagery') assert.ok(heldRequests > 0, 'Satellite metadata must still be delayed while local globe and controls work');
      await firstAlbum.scrollIntoViewIfNeeded();
      await (mobile ? firstAlbum.tap({ timeout: 5000 }) : firstAlbum.click({ timeout: 5000 }));
      assert.equal(await page.locator('[data-selection]').isVisible(), true);
      await page.locator('.world').scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(output, `travel-${scenario}.png`) });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      if (scenario === 'mobile-normal') {
        await page.locator('[data-selection-link]').tap({ timeout: 5000 });
        await page.waitForURL('**/photo-wall/**');
        assert.ok(page.url().includes('/photo-wall/'), 'The selected album must open');
      }
      assert.deepEqual(errors, [], scenario);
      console.log(`PASS ${scenario}: map controls and album preview respond`);
    } finally {
      releaseMetadata();
      await context.close();
    }
  }
} finally {
  await browser.close();
}
