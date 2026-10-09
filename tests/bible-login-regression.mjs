import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const authStub = `
const session = { uid: 'login-regression-user', account: '49001422@qq.com' };
let signedIn = false;
export const getCloudSession = async () => signedIn ? session : null;
export const getRememberedSession = () => signedIn ? session : null;
export const signInWithPassword = async () => {
  signedIn = true;
  window.dispatchEvent(new CustomEvent('site-auth-change', { detail: session }));
  return session;
};
export const cloudErrorMessage = (error, fallback) => error?.message || fallback;
export const signOut = async () => { signedIn = false; };
export const startEmailSignUp = async () => { throw new Error('not used'); };
export const getCloudDb = () => ({ collection: () => ({
  doc: () => ({ get: () => new Promise(resolve => setTimeout(() => resolve({ error: { message: '模拟同步失败' } }), 1500)),
    update: () => { throw new Error('Unexpected write'); }, set: () => { throw new Error('Unexpected write'); } }),
  where: () => ({ limit: () => ({ get: async () => ({ data: [] }) }) })
}) });
`;
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route(/\/src\/scripts\/site-auth\.ts(?:\?|$)/, route => route.fulfill({ contentType: 'application/javascript', body: authStub }));
    await page.goto('http://127.0.0.1:4331/officialwebsite/topics/applications/inspiration-station/theology?book=heb&chapter=8&verse=1', { waitUntil: 'domcontentloaded' });
    await page.locator('.bible-verse-text').first().waitFor();
    await page.locator('[data-action="cloud-login"]').first().click();
    await page.locator('[data-login-form] input[name="email"]').fill('49001422@qq.com');
    await page.locator('[data-login-form] input[name="password"]').fill('test-password');
    await page.locator('[data-login-submit]').click();
    await page.waitForFunction(() => !document.querySelector('[data-login-modal]').open, { timeout: 800 });
    assert.equal(await page.locator('[data-login-account]').textContent(), '49001422@qq.com');
    await page.waitForFunction(() => document.querySelector('[data-reading-sync-status]').textContent.includes('模拟同步失败'));
    assert.equal(await page.locator('[data-login-modal]').evaluate(dialog => dialog.open), false, '同步失败不能重新打开登录弹窗');
    assert.ok((await page.locator('[data-action="cloud-login"]').first().textContent()).includes('重试同步'));
    assert.deepEqual(errors, []);
    console.log(`PASS ${viewport.width}x${viewport.height}: authenticated login closes immediately; sync failure stays separate`);
    await page.close();
  }
} finally {
  await browser.close();
}
