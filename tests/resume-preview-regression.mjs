import assert from 'node:assert/strict';
import { chromium, devices } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const width of [320, 390, 430, 1440]) {
    const context = await browser.newContext(width < 768 ? { ...devices['iPhone 13'], viewport: { width, height: 844 } } : { viewport: { width, height: 900 } });
    const page = await context.newPage();
    await page.addInitScript(() => localStorage.setItem('magicj.home-intro.seen', '1'));
    await page.goto(process.env.RESUME_PREVIEW_URL || 'http://127.0.0.1:4326/');
    await page.locator('[data-project="resume"]').scrollIntoViewIfNeeded();
    for (const language of ['zh-CN', 'en', 'zh-CN']) {
      await page.waitForFunction(language => {
        const paper = document.querySelector('.resume-paper');
        return paper.lang === language && getComputedStyle(paper).opacity === '1';
      }, language, { timeout: 15000 });
      const result = await page.locator('.resume-paper').evaluate(paper => {
        const bounds = paper.getBoundingClientRect();
        const entries = [...paper.querySelectorAll('.resume-paper-entry')];
        return {
          gaps: entries.map(entry => entry.querySelector('small').getBoundingClientRect().top - entry.querySelector('strong').getBoundingClientRect().bottom),
          between: entries.slice(1).map((entry, index) => entry.getBoundingClientRect().top - entries[index].querySelector('small').getBoundingClientRect().bottom),
          fits: entries.every(entry => entry.querySelector('small').getBoundingClientRect().bottom <= bounds.bottom),
          overflow: paper.scrollHeight - paper.clientHeight,
        };
      });
      if (width < 768) {
        assert.ok(result.gaps.every(gap => gap >= .5), `${width}/${language}: title/role separation ${result.gaps}`);
        assert.ok(result.between.every(gap => gap >= .5), `${width}/${language}: entries must not overlap`);
        assert.ok(result.fits && result.overflow <= 1, `${width}/${language}: all text fits on paper`);
      }
      console.log('PASS', width, language, JSON.stringify(result));
    }
    await page.screenshot({ path: `${process.env.TEMP}/resume-preview-${width}.png` });
    await context.close();
  }
} finally {
  await browser.close();
}
