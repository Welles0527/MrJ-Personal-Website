import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.BIBLE_SCROLL_TEST_URL || 'http://127.0.0.1:4362';
const dataPath = 'public/data/bible/commentary/baibaoshu-20261021';
const bible = JSON.parse(await readFile('public/data/bible/chi-cuv-simp.json', 'utf8'));
let verified = 0;
for (const [key, text] of Object.entries(bible.chapters)) {
  const [book, chapter] = key.split('-');
  const value = JSON.parse(await readFile(`${dataPath}/${book}/${chapter}.json`, 'utf8'));
  assert.equal(value.book, book);
  assert.equal(value.chapter, Number(chapter));
  assert.equal(value.verses.length, text.length);
  for (let i = 0; i < text.length; i++) {
    assert(value.verses[i].length);
    for (const index of value.verses[i]) {
      const section = value.sections[index];
      assert(section.markdown.trim());
      assert(section.start <= i + 1 && section.end >= i + 1);
      if (section.verseNumbers) assert(section.verseNumbers.includes(i + 1));
    }
    verified++;
  }
}
const matthew = JSON.parse(await readFile(`${dataPath}/mat/26.json`, 'utf8'));
assert.deepEqual(matthew.verses[40].map(i => [matthew.sections[i].start, matthew.sections[i].end]), [[40, 44]], 'consecutive scripture quotes share the following explanation');
const proverbs = JSON.parse(await readFile(`${dataPath}/pro/10.json`, 'utf8'));
assert(proverbs.verses[1].every(i => !proverbs.sections[i].verseNumbers || proverbs.sections[i].verseNumbers.includes(2)), 'non-adjacent thematic references must not fill intervening verses');
const proverbs18 = JSON.parse(await readFile(`${dataPath}/pro/18.json`, 'utf8'));
assert(proverbs18.verses[2].every(i => proverbs18.sections[i].kind !== 'chapter'), 'explicit verse quotations take precedence over incomplete thematic heading lists');
console.log(`PASS all ${verified} verse mappings across 1189 chapters`);

const auth = `
export const getRememberedSession = () => null;
export const getCloudSession = async () => null;
export const getCloudDb = () => ({});
export const signInWithPassword = async () => null;
export const signOut = async () => {};
export const startEmailSignUp = async () => {};
export const cloudErrorMessage = (error, fallback) => fallback;
`;
await mkdir('.private', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*site-auth.ts*', route => route.fulfill({ contentType: 'application/javascript', body: auth }));
    let commentaryRequests = 0;
    let failCommentary = true;
    await page.route('**/commentary/baibaoshu-20261021/mat/26.json', async route => {
      commentaryRequests++;
      if (failCommentary) return route.fulfill({ status: 503, body: 'temporary failure' });
      await route.continue();
    });
    await page.route('**/api/bible-translation-genesis-test?**', async route => {
      const verse = new URL(route.request().url()).searchParams.get('verse');
      if (verse === '39') await new Promise(resolve => setTimeout(resolve, 500));
      await route.fulfill({ json: { content: verse === '41' ? '你们要警醒祷告，免得陷入诱惑。你们的心灵虽然愿意，肉体却很软弱。' : `测试译文 26:${verse}`, reference: `马太福音 26:${verse}`, version: 'CCB', source: 'Biblica' } });
    });
    await page.goto(`${base}/officialwebsite/topics/applications/inspiration-station/theology/?book=mat&chapter=26&verse=41`);
    await page.waitForFunction(() => document.querySelectorAll('[data-verse-list] .bible-verse').length === 75);
    await page.waitForTimeout(350);
    assert.equal(commentaryRequests, 0, 'commentary must be loaded on demand');
    const trigger = page.locator('#mat-26-41 [data-action="show-translation"]');
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();
    const popover = page.locator('[data-bible-translation-popover]');
    await page.waitForFunction(() => document.querySelector('[data-bible-commentary-content]').textContent.includes('暂时无法'));
    assert.match(await page.locator('[data-bible-translation-text]').textContent(), /警醒祷告/);
    await page.locator('[data-bible-translation-close]').click();
    failCommentary = false;
    await trigger.click();
    await page.waitForFunction(() => document.querySelector('[data-bible-commentary-content]').textContent.includes('26:40–44'));
    assert.equal(commentaryRequests, 2, 'failed requests must be retryable, including cached translations');
    assert.match(await page.locator('[data-bible-commentary-content]').textContent(), /三次祷告/);
    assert.equal(await page.locator('[data-bible-commentary-content] blockquote').first().evaluate(el => getComputedStyle(el).marginLeft), '0px', 'blockquote must not inherit browser default indentation on mobile');
    assert.match(await page.locator('[data-bible-commentary-source]').getAttribute('href'), /book=Matthew&chapter=26/);
    await popover.hover();
    assert(await popover.isVisible(), 'moving from trigger into the annotation must keep it open');
    const bounds = await popover.boundingBox();
    assert(bounds.x >= 11 && bounds.y >= 11 && bounds.x + bounds.width <= viewport.width - 11 && bounds.y + bounds.height <= viewport.height - 11);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    const scrollBefore = await page.evaluate(() => [scrollY, document.querySelector('[data-verse-list]').scrollTop]);
    await page.locator('[data-bible-translation-body]').hover();
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(200);
    assert.deepEqual(await page.evaluate(() => [scrollY, document.querySelector('[data-verse-list]').scrollTop]), scrollBefore, 'reading commentary must not move the page');
    await page.locator('[data-bible-translation-body]').evaluate(el => { el.scrollTop = 0; });
    await page.screenshot({ path: `.private/bible-commentary-${viewport.width}.png` });
    await page.keyboard.press('Escape');
    assert(!(await popover.isVisible()));
    await page.locator('#mat-26-39 [data-action="show-translation"]').click();
    await page.locator('[data-bible-translation-close]').click();
    await trigger.click();
    await page.waitForTimeout(700);
    assert.match(await page.locator('[data-bible-translation-reference]').textContent(), /26:41/);
    assert.match(await page.locator('[data-bible-commentary-content]').textContent(), /26:40–44/);
    assert.equal(commentaryRequests, 2, 'all verses in a chapter share a cached chapter request');
    await page.evaluate(async () => {
      const { renderCommentary } = await import('/officialwebsite/src/scripts/bible-commentary.ts');
      renderCommentary(document.querySelector('[data-bible-commentary-content]'), [{ start: 1, end: 1, kind: 'verse', title: '安全测试', markdown: '<img src=x onerror="window.badCommentary=true"> **普通文字**' }], 1);
    });
    assert.equal(await page.locator('[data-bible-commentary-content] img').count(), 0);
    assert.equal(await page.evaluate(() => window.badCommentary), undefined);
    assert.deepEqual(errors, []);
    console.log(`PASS ${viewport.width}px: commentary, retry, cached translation, scrolling, close, stale response and text safety`);
    await context.close();
  }
} finally { await browser.close(); }
