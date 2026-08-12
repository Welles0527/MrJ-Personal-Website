import assert from 'node:assert/strict';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { dev } from 'astro';
import { chromium } from 'playwright';

const projectRoot = path.resolve(process.cwd());
const routePath = '/officialwebsite/daily-radio/';
const briefingId = 'stocks-research-603507';

const findFreePort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.unref();
  server.on('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    server.close(() => resolve(address.port));
  });
});

const waitForServer = async (url) => {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await delay(250);
  }
  throw new Error(`Timed out waiting for ${url}.`);
};

const port = await findFreePort();
const pageUrl = `http://127.0.0.1:${port}${routePath}?drawer-regression=1`;
const server = await dev({
  root: projectRoot,
  server: { host: '127.0.0.1', port },
  logLevel: 'silent'
});

let browser;
try {
  await waitForServer(pageUrl);
  browser = await chromium.launch({
    channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(pageUrl, { waitUntil: 'networkidle' });
  await page.evaluate((currentId) => {
    localStorage.setItem('daily-radio.preferences.v1', JSON.stringify({
      onboardingComplete: true,
      selectedChannels: ['stocks'],
      listenMinutes: 60,
      voice: 'HsiaoChen｜女声',
      playlistOrder: [],
      currentId
    }));
  }, briefingId);
  await page.reload({ waitUntil: 'networkidle' });

  const coreAssetVersions = await page.evaluate(() => ({
    styles: document.querySelector('link[href*="styles.css"]')?.href || '',
    components: document.querySelector('script[src*="components.js"]')?.src || '',
    app: document.querySelector('script[src*="app.js"]')?.src || ''
  }));
  for (const [asset, url] of Object.entries(coreAssetVersions)) {
    assert.ok(new URL(url).searchParams.has('v'), `${asset} 核心资源必须带版本号以避免浏览器继续使用旧缓存`);
  }

  const card = page.locator(`[data-brief-id="${briefingId}"]`);
  await card.locator('[data-action="open-brief"]').click();

  const drawer = page.locator('.detail-drawer');
  await drawer.waitFor({ state: 'visible' });
  const initialControls = await page.evaluate(() => {
    const drawerElement = document.querySelector('.detail-drawer');
    const nextButton = document.querySelector('.detail-drawer [data-action="next-brief"]');
    const progressTrack = document.querySelector('.detail-drawer [data-drawer-progress]');
    const drawerRect = drawerElement?.getBoundingClientRect();
    const nextRect = nextButton?.getBoundingClientRect();
    const progressRect = progressTrack?.getBoundingClientRect();
    return {
      nextInInitialView: Boolean(
        drawerRect && nextRect &&
        nextRect.top >= drawerRect.top &&
        nextRect.bottom <= drawerRect.bottom
      ),
      progressHeight: progressRect?.height || 0
    };
  });
  assert.equal(initialControls.nextInInitialView, true, '下一条按钮应在详情弹框首屏可见');
  assert.ok(initialControls.progressHeight >= 10, `进度条轨道应清晰可见，实际高度 ${initialControls.progressHeight}px`);
  await drawer.locator('[data-action="play-item"]').click();
  await drawer.waitFor({ state: 'visible' });
  await drawer.evaluate((element) => { globalThis.__dailyRadioDrawerNode = element; });
  await page.waitForTimeout(1_500);

  const result = await page.evaluate(() => ({
    nodeStable: document.querySelector('.detail-drawer') === globalThis.__dailyRadioDrawerNode,
    paragraphCount: document.querySelectorAll('.transcript-copy p').length,
    drawerVisible: Boolean(document.querySelector('.detail-drawer')),
    progressPercent: Number.parseInt(document.querySelector('[data-drawer-progress-percent]')?.textContent || '0', 10),
    nextButtonVisible: Boolean(document.querySelector('[data-action="next-brief"]')?.getClientRects().length)
  }));

  assert.equal(result.drawerVisible, true, '详情抽屉应保持打开');
  assert.equal(result.nodeStable, true, '播放进度更新不得重建详情抽屉 DOM');
  assert.ok(result.paragraphCount >= 8, `个股研读应分段显示，实际只有 ${result.paragraphCount} 段`);
  assert.ok(result.progressPercent > 0, `详情播放进度应前进，实际为 ${result.progressPercent}%`);
  assert.equal(result.nextButtonVisible, true, '详情抽屉应显示下一条按钮');

  await page.locator('[data-action="next-brief"]').click();
  await page.waitForTimeout(500);
  const nextResult = await page.evaluate(() => ({
    briefingId: document.querySelector('.detail-drawer')?.dataset.drawerBriefId,
    paragraphCount: document.querySelectorAll('.transcript-copy p').length,
    playing: document.querySelector('.detail-drawer [data-action="play-item"]')?.textContent.includes('暂停')
  }));
  assert.equal(nextResult.briefingId, 'stocks-research-301026', '下一条应按正式个股研读顺序跳转');
  assert.ok(nextResult.paragraphCount >= 8, '跳转后正文仍应分段显示');
  assert.equal(nextResult.playing, true, '播放中跳转下一条后应继续播放');
  console.log(`每日电台详情抽屉回归通过：DOM 稳定，进度 ${result.progressPercent}%，正文 ${result.paragraphCount} 段，下一条跳转正常。`);
} finally {
  await browser?.close();
  await server.stop();
}
