import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const url = process.env.BIBLE_URL || 'http://127.0.0.1:4391/officialwebsite/topics/applications/inspiration-station/theology/?book=mat&chapter=23&verse=1';
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: width === 1440 ? 900 : 844 } });
    await context.addInitScript(() => {
      const NativeAudio = window.Audio;
      window.__ttsAudio = [];
      window.__nativeSpeechCalls = 0;
      window.Audio = class extends NativeAudio {
        constructor(...args) { super(...args); window.__ttsAudio.push(this); }
      };
      window.speechSynthesis.speak = () => { window.__nativeSpeechCalls++; };
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const responses = [];
    page.on('response', response => {
      if (response.request().method() === 'POST' && /\/api\/bible-(tts|translation)(?:\?|$)/.test(response.url())) responses.push(response);
    });
    assert.equal((await page.goto(url, { waitUntil: 'networkidle' })).status(), 200);
    await page.waitForFunction(() => document.querySelector('[data-bible-search-status]')?.textContent.includes('1189'));
    await page.locator('[data-action="read-chapter"]').click();
    await page.waitForFunction(() => window.__ttsAudio.some(audio => audio.currentTime > 0.2 && !audio.paused && audio.duration > 0), { timeout: 30000 });
    assert.ok(responses.length > 0);
    for (const response of responses) {
      assert.equal(response.status(), 200);
      assert.match(response.headers()['content-type'], /audio\/mpeg/);
      assert.equal(response.headers()['x-tts-voice'], 'zh-CN-YunyangNeural');
    }
    await page.locator('[data-action="toggle-speech-pause"]').click();
    await page.waitForFunction(() => window.__ttsAudio.every(audio => audio.paused));
    await page.locator('[data-action="toggle-speech-pause"]').click();
    await page.waitForFunction(() => window.__ttsAudio.some(audio => !audio.paused && audio.currentTime > 0.3));
    const audioState = await page.evaluate(() => ({ nativeCalls: window.__nativeSpeechCalls, duration: window.__ttsAudio[0].duration }));
    assert.equal(audioState.nativeCalls, 0, 'real cloud audio, not device fallback');
    await page.locator('[data-chapter="24"]').click();
    await page.waitForFunction(() => window.__ttsAudio.every(audio => audio.paused));
    assert.deepEqual(errors, []);
    console.log(`PASS ${width}: Yunyang MP3 decoded and playing, pause/resume/stop, no device fallback (${audioState.duration}s)`);
    await context.close();
  }
} finally { await browser.close(); }
