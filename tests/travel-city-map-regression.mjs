import assert from 'node:assert/strict';
import { access, readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve(import.meta.dirname, '..');
const readJson = async file => JSON.parse(await readFile(path.join(root, file), 'utf8'));
const index = await readJson('src/data/travel-city-map.json');
const albums = await readJson('src/data/travel-2018-albums.json');
for (const name of ['coffee-latte-art-album', 'jamaica-photo-album', 'japan-kanto-2015-album', 'sanya-2016-album']) albums.push(await readJson(`src/data/${name}.json`));
const originals = new Map();
for (const album of albums) for (const photo of album.photos) {
  if (!originals.has(photo.id)) originals.set(photo.id, { ...photo, albumSlugs: [] });
  originals.get(photo.id).albumSlugs.push(album.album.slug);
}
const manifests = new Map();
const located = new Set();
for (const city of index.cities) {
  const manifest = await readJson(`public${city.photosPath}`);
  assert.equal(manifest.id, city.id);
  assert.equal(manifest.photos.length, city.count);
  assert(manifest.photos.some(photo => photo.src === city.cover));
  for (const photo of manifest.photos) {
    const original = originals.get(photo.id);
    assert(original, `Unknown photo: ${photo.id}`);
    assert(!located.has(photo.id), `Photo duplicated between cities: ${photo.id}`);
    located.add(photo.id);
    assert.equal(photo.src, original.src);
    assert.deepEqual(photo.albumSlugs, original.albumSlugs);
    assert(photo.width > 0 && photo.height > 0);
    await access(path.join(root, 'public', photo.src));
  }
  manifests.set(city.id, manifest);
}
assert.equal(originals.size, index.totalPhotos);
assert.equal(located.size, index.locatedPhotos);
assert.equal(originals.size - located.size, index.unlocatedPhotos);
assert.equal(index.albumPhotoCount, albums.reduce((sum, item) => sum + item.photos.length, 0));
for (const album of albums) {
  const link = index.albums.find(item => item.slug === album.album.slug);
  assert.equal(link.count, album.photos.length);
  assert.equal(link.unlocatedCount, album.photos.filter(photo => !located.has(photo.id)).length);
}
const sf = index.cities.find(city => city.originalName === 'San Francisco');
const la = index.cities.find(city => city.originalName === 'Los Angeles');
const goreme = index.cities.find(city => city.originalName === 'Göreme');
assert.equal(sf.count, 289);
assert.equal(la.count, 206);
assert(goreme.albumSlugs.includes('turkey-2019'));
assert.equal(index.albums.find(album => album.slug === 'turkey-2019').count, 1656);
console.log(`PASS data: ${index.cities.length} cities, ${located.size} located, ${index.unlocatedPhotos} preserved in original albums`);

const base = (process.env.TRAVEL_TEST_BASE || 'http://127.0.0.1:4325/officialwebsite').replace(/\/$/, '');
const output = process.env.TRAVEL_TEST_OUTPUT;
if (output) await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' });
const report = { data: { cities: index.cities.length, located: located.size, unlocated: index.unlocatedPhotos }, checks: [], pageErrors: [] };
try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const label = `${viewport.width}x${viewport.height}`;
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.on('pageerror', error => report.pageErrors.push({ viewport: label, message: error.message }));
    const capture = async name => {
      await page.evaluate(() => { window.__travelQaReadySince = 0; });
      await page.waitForFunction(() => {
        const ready = [...document.querySelectorAll('img')].filter(img => {
          const box = img.getBoundingClientRect();
          return box.width && box.height && box.top < innerHeight && box.bottom > 0 && box.left < innerWidth && box.right > 0;
        }).every(img => img.complete && img.naturalWidth > 0) && !document.querySelector('[data-loading]:not([hidden])');
        if (!ready) window.__travelQaReadySince = 0;
        else if (!window.__travelQaReadySince) window.__travelQaReadySince = performance.now();
        return ready && performance.now() - window.__travelQaReadySince > 1500;
      }, null, { timeout: 60000 });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${name}: horizontal overflow`);
      if (output) await page.screenshot({ path: path.join(output, `city-${name}-${label}.png`) });
      report.checks.push(`${name} ${label}`);
      console.log(`PASS ${name} ${label}`);
    };
    await page.goto(`${base}/topics/space/travel/travel-map/`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-atlas][data-ready="true"]').waitFor({ timeout: 60000 });
    await page.locator('[data-loading]').waitFor({ state: 'hidden', timeout: 60000 });
    assert.equal(await page.locator('[data-album-row]').count(), index.cities.length);
    const cluster = page.locator('[data-pin].is-cluster:visible').first();
    assert(await cluster.count());
    const clusterState = await cluster.getAttribute('style');
    const clusterId = await cluster.getAttribute('data-pin');
    await capture('overview-3d');
    await cluster.click();
    await page.waitForFunction(({ id, previous }) => { const pin = document.querySelector(`[data-pin="${id}"]`); return pin.hidden || pin.getAttribute('style') !== previous; }, { id: clusterId, previous: clusterState });
    await page.locator('[data-home]').click();

    await page.locator('[data-city-search]').fill('旧金山');
    assert.equal(await page.locator('[data-album-row]:visible').count(), 1);
    await page.locator(`[data-focus="${sf.id}"]`).click();
    assert.equal(await page.locator('[data-selection-count]').textContent(), '289 张照片');
    assert.equal(await page.locator('[data-selection-title]').textContent(), '旧金山');
    await capture('sf-3d');
    await page.locator('[data-selection-open]').click();
    await page.waitForFunction(count => document.querySelectorAll('[data-city-photo-grid] button').length === count, sf.count);
    const gallery = page.locator('[data-city-gallery]');
    assert(await gallery.isVisible());
    const bounds = await gallery.boundingBox();
    assert(bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= viewport.width + 1 && bounds.y + bounds.height <= viewport.height + 1);
    assert.deepEqual(await page.locator('[data-city-photo-grid] img').evaluateAll(images => images.map(img => new URL(img.src).pathname.replace(/^\/officialwebsite/, ''))), manifests.get(sf.id).photos.map(photo => photo.src));
    await page.waitForFunction(() => [...document.querySelectorAll('[data-city-photo-grid] img')].filter(img => { const box = img.getBoundingClientRect(); return box.top < innerHeight && box.bottom > 0; }).every(img => img.complete && img.naturalWidth > 0));
    assert(await page.locator('[data-city-source-links] a[href$="/california-2019/"]').count());
    await capture('gallery');
    await page.locator('[data-city-photo-grid] button').first().click();
    await page.locator('[data-city-photo-next]').click();
    assert((await page.locator('[data-city-photo-caption]').textContent()).endsWith('2 / 289'));
    await page.keyboard.press('ArrowLeft');
    assert((await page.locator('[data-city-photo-caption]').textContent()).endsWith('1 / 289'));
    await page.waitForFunction(() => document.querySelector('[data-city-photo-image]').complete && document.querySelector('[data-city-photo-image]').naturalWidth > 0);
    await capture('photo');
    await page.keyboard.press('Escape');
    assert(!(await page.locator('[data-city-photo-view]').isVisible()));
    assert(await gallery.isVisible());
    await page.locator('[data-city-gallery-close]').click();
    assert(!(await gallery.isVisible()));

    await page.locator('[data-mode="2d"]').click();
    assert.equal(await page.locator('[data-mode="2d"]').getAttribute('aria-pressed'), 'true');
    await page.locator(`[data-focus="${sf.id}"]`).click();
    await capture('sf-flat');
    await page.locator(`[data-city-open="${sf.id}"]`).click();
    assert.equal(await page.locator('[data-city-photo-grid] button').count(), sf.count);
    await page.locator('[data-city-gallery-close]').click();
    await page.locator('[data-city-search]').fill('格雷梅');
    await page.locator(`[data-focus="${goreme.id}"]`).click();
    assert.equal(await page.locator('[data-selection-count]').textContent(), `${goreme.count.toLocaleString()} 张照片`);
    await capture('turkey-flat');
    await page.locator('[data-selection-open]').click();
    await page.waitForFunction(count => document.querySelectorAll('[data-city-photo-grid] button').length === count, goreme.count);
    assert(await page.locator('[data-city-source-links] a[href$="/turkey-2019/"]').count());
    await page.locator('[data-city-gallery-close]').click();

    await page.locator('[data-city-search]').fill('');
    for (const region of ['domestic', 'international']) {
      await page.locator(`[data-album-filter="${region}"]`).click();
      assert.equal(await page.locator('[data-album-row]:visible').count(), index.cities.filter(city => (city.country === '中国') === (region === 'domestic')).length);
      assert.equal(await page.locator(`[data-album-row]:visible:not([data-region="${region}"])`).count(), 0);
    }
    await page.locator('[data-album-filter="all"]').click();
    await page.locator('[data-city-search]').fill('no-matching-city-123');
    assert(await page.locator('[data-empty-cities]').isVisible());
    await page.waitForFunction(() => [...document.querySelectorAll('[data-pin]')].every(pin => pin.hidden));
    await page.locator('[data-city-search]').fill('Los Angeles');
    assert.equal(await page.locator('[data-album-row]:visible').count(), 1);
    const unavailable = route => route.fulfill({ status: 503, body: 'Unavailable' });
    await page.route(`**${la.photosPath}`, unavailable);
    await page.locator(`[data-city-open="${la.id}"]`).click();
    await page.waitForFunction(() => document.querySelector('[data-city-gallery-status]').textContent.includes('暂时无法加载'));
    assert(await page.locator('[data-city-source-links] a').count());
    await page.locator('[data-city-gallery-close]').click();
    await page.unroute(`**${la.photosPath}`, unavailable);
    await page.locator(`[data-city-open="${la.id}"]`).click();
    await page.waitForFunction(count => document.querySelectorAll('[data-city-photo-grid] button').length === count, la.count);
    await page.locator('[data-city-gallery-close]').click();
    await page.locator('.original-albums summary').click();
    assert.equal(await page.locator('.original-albums a').count(), albums.length);
    await capture('filters-original-albums');
    await page.locator('.original-albums a[href$="/turkey-2019/"]').click();
    await page.waitForURL('**/photo-wall/turkey-2019/');
    assert.equal(await page.locator('.photo-card').count(), 1656);
    assert.equal(await page.locator('.day-section').count(), 13);
    await page.waitForFunction(() => document.querySelector('.hero-cover img')?.naturalWidth > 0);
    await capture('turkey-album');
    await context.close();
  }
  assert.deepEqual(report.pageErrors, []);
  report.status = 'PASS';
} catch (error) {
  report.status = 'FAIL';
  report.error = error.stack;
  throw error;
} finally {
  if (output) await writeFile(path.join(output, 'travel-city-qa-results.json'), JSON.stringify(report, null, 2));
  await browser.close();
}
