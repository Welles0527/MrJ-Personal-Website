import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const projectRoot = path.resolve(process.env.WORSHIP_PROJECT_ROOT || process.cwd());
const projectRequire = createRequire(path.join(projectRoot, 'package.json'));
const astroCli = path.join(path.dirname(projectRequire.resolve('astro/package.json')), 'astro.js');
const serverOutput = [];

const findFreePort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.unref();
  server.on('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    server.close(() => resolve(address.port));
  });
});

const stopProcessTree = (child) => {
  if (!child || child.exitCode !== null) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    return;
  }
  child.kill('SIGTERM');
};

const waitForServer = async (url, child) => {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Astro exited early.\n${serverOutput.join('')}`);
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await delay(250);
  }
  throw new Error(`Timed out waiting for ${url}.\n${serverOutput.join('')}`);
};

const port = await findFreePort();
const pageUrl = `http://127.0.0.1:${port}/officialwebsite/worship/?playback-regression=1`;
const server = spawn(process.execPath, [astroCli, 'dev', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
  cwd: projectRoot,
  env: { ...process.env, BROWSER: 'none' },
  stdio: ['ignore', 'pipe', 'pipe']
});
server.stdout.on('data', (chunk) => serverOutput.push(chunk.toString()));
server.stderr.on('data', (chunk) => serverOutput.push(chunk.toString()));

let browser;
try {
  await waitForServer(pageUrl, server);
  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript(() => {
    localStorage.setItem('worship:playlist', JSON.stringify([
      'catalog:盛晓玫::依然爱我',
      'catalog:盛晓玫::想起你'
    ]));
  });
  await page.route('https://www.youtube-nocookie.com/embed/**', async (route) => {
    const requestedUrl = new URL(route.request().url());
    const requestedVideoId = requestedUrl.pathname.split('/').pop();
    const staleVideoId = requestedVideoId === 'uSHI-9s4dTU' ? 'AE7RhcMjgWA' : requestedVideoId;
    await route.fulfill({
      status: 200,
      contentType: 'text/html; charset=utf-8',
      body: `<!doctype html><script>
        setTimeout(() => parent.postMessage(JSON.stringify({
          event: 'infoDelivery',
          info: { playerState: 1, videoData: { video_id: '${staleVideoId}' } }
        }), '*'), 20);
      </script>`
    });
  });

  await page.goto(pageUrl, { waitUntil: 'networkidle' });
  await page.locator('[data-artist-filter="盛晓玫"]').first().click();
  await page.locator('button.song-title-button[data-play="依然爱我"][data-artist="盛晓玫"]').click();
  await page.waitForTimeout(200);

  assert.equal(
    await page.locator('#nowTitle').innerText(),
    '依然爱我',
    'a stale playlist callback must not replace the song the user clicked'
  );
  assert.equal(
    await page.locator('#playerTitle').innerText(),
    '依然爱我',
    'bottom player metadata must remain aligned with the clicked song'
  );
  const iframeUrl = new URL(await page.locator('#mediaPlayer').getAttribute('src'));
  assert.equal(
    iframeUrl.searchParams.get('playlist'),
    'uSHI-9s4dTU,AE7RhcMjgWA',
    'the embedded sequence must begin with the clicked song before its queued successor'
  );
  assert.equal(await page.locator('#featureHeroTitle').innerText(), '依然爱我', 'hero title must follow the playing song');
  assert.equal(await page.locator('#featureHeroArtist').innerText(), '盛晓玫', 'hero artist must follow the playing song');
  assert.match(
    await page.locator('#featureAlbumImage').getAttribute('src'),
    /uSHI-9s4dTU/,
    'hero artwork must use the selected song video thumbnail'
  );
  assert.equal(
    await page.locator('#mediaPlayer').evaluate(node => Boolean(node.closest('.feature-media-card'))),
    true,
    'the actual video player must render inside the top feature area'
  );
  const featureLayout = await page.evaluate(() => {
    const media = document.querySelector('.feature-media-card')?.getBoundingClientRect();
    const copy = document.querySelector('.feature-copy')?.getBoundingClientRect();
    return media && copy ? { mediaLeft: media.left, mediaRight: media.right, copyLeft: copy.left } : null;
  });
  assert.ok(featureLayout, 'the top player and song information panels must both render');
  assert.ok(
    featureLayout.mediaLeft < featureLayout.copyLeft && featureLayout.mediaRight <= featureLayout.copyLeft,
    'desktop layout must keep the video and song information in separate, non-overlapping panels'
  );
  assert.equal(
    await page.locator('#queuePanel .media-player-shell').count(),
    0,
    'the right queue must no longer contain the actual video player'
  );
  assert.equal(
    await page.locator('.feature-lyrics-card').count(),
    0,
    'the removed hero lyrics panel must not be rendered'
  );
  assert.match(
    await page.locator('#queueCoverImage').getAttribute('src'),
    /uSHI-9s4dTU/,
    'the right queue must show the selected song cover'
  );
} finally {
  await browser?.close();
  stopProcessTree(server);
}
