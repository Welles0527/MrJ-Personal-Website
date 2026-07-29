import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const projectRoot = path.resolve(process.env.TODO_MODAL_PROJECT_ROOT || process.cwd());
const routePath = '/officialwebsite/topics/space/planning/todo';
const serverOutput = [];
const projectRequire = createRequire(path.join(projectRoot, 'package.json'));
const astroCli = path.join(path.dirname(projectRequire.resolve('astro/package.json')), 'astro.js');

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
    if (child.exitCode !== null) {
      throw new Error(`Astro dev server exited early.\n${serverOutput.join('')}`);
    }
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await delay(250);
  }
  throw new Error(`Timed out waiting for ${url}.\n${serverOutput.join('')}`);
};

const cloudStub = `
  const session = { uid: 'todo-modal-regression-user', account: 'modal-regression@example.com' };
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const stored = [];
  globalThis.__todoModalRegression = { calls: 0, confirmed: 0, failures: 0 };

  export const getRememberedSession = () => session;
  export const getCloudSession = async () => session;
  export const signInWithPassword = async () => session;
  export const signOut = async () => undefined;
  export const startEmailSignUp = async () => async () => session;
  export const loadCloudTodos = async () => ({ todos: [...stored], requestId: 'load-regression' });
  export const watchCloudTodos = () => ({ pageCount: 1, capacity: 100, close: () => undefined });
  export const upgradeCloudTodoVersions = async () => 0;
  export const removeCloudTodo = async () => undefined;

  export const upsertCloudTodo = async (ownerId, todo, expectedUpdatedAt, onMutationConfirmed) => {
    globalThis.__todoModalRegression.calls += 1;
    await wait(1200);
    if (todo.title.includes('FAIL')) {
      globalThis.__todoModalRegression.failures += 1;
      throw new Error('synthetic pre-confirmation failure');
    }
    const index = stored.findIndex((item) => item.id === todo.id);
    if (index >= 0) stored[index] = todo;
    else stored.push(todo);
    onMutationConfirmed?.();
    globalThis.__todoModalRegression.confirmed += 1;
    return {
      ownerId,
      taskId: todo.id,
      createdAt: todo.createdAt,
      updatedAt: todo.updatedAt,
      requestId: 'save-regression',
      verificationRequestId: 'verify-regression',
      todo
    };
  };
`;

const submitTask = async (page, title) => {
  const modal = page.locator('[data-todo-modal]');
  await page.locator('[data-action="open-create"][data-date]').first().click();
  await modal.waitFor({ state: 'visible' });
  await page.locator('[data-todo-form] input[name="title"]').fill(title);
  await page.locator('[data-todo-form] button[type="submit"]').click();
  await page.waitForTimeout(150);
  return { modal, openAfterSubmit: await modal.evaluate((dialog) => dialog.open) };
};

const port = await findFreePort();
const pageUrl = `http://127.0.0.1:${port}${routePath}?todo-modal-regression=1`;
const server = spawn(process.execPath, [astroCli, 'dev', '--host', '127.0.0.1', '--port', String(port), '--strictPort', '--force'], {
  cwd: projectRoot,
  env: { ...process.env, BROWSER: 'none' },
  stdio: ['ignore', 'pipe', 'pipe']
});
server.stdout.on('data', (chunk) => serverOutput.push(chunk.toString()));
server.stderr.on('data', (chunk) => serverOutput.push(chunk.toString()));

let browser;
try {
  await waitForServer(pageUrl, server);
  browser = await chromium.launch({
    channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const browserDiagnostics = [];
  page.on('console', (message) => {
    if (message.type() === 'error') browserDiagnostics.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => browserDiagnostics.push(`pageerror: ${error.message}`));
  page.on('requestfailed', (request) => browserDiagnostics.push(`requestfailed: ${request.url()} ${request.failure()?.errorText || ''}`));
  page.on('request', (request) => {
    if (request.url().includes('todo-cloud')) browserDiagnostics.push(`todo-cloud request: ${request.url()}`);
  });
  await page.route('**/*todo-cloud.ts*', (route) => route.fulfill({
    status: 200,
    contentType: 'application/javascript; charset=utf-8',
    body: cloudStub
  }));
  await page.goto(pageUrl, { waitUntil: 'networkidle' });
  try {
    await page.waitForFunction(() => document.body.textContent.includes('modal-regression@example.com'));
  } catch (error) {
    const pageText = (await page.locator('body').innerText()).slice(0, 1200);
    throw new Error([
      error.message,
      `Page text: ${pageText}`,
      `Browser diagnostics: ${browserDiagnostics.join(' | ') || 'none'}`,
      `Server output: ${serverOutput.join('').slice(-2000)}`
    ].join('\n'));
  }

  const success = await submitTask(page, 'MODAL SUCCESS REGRESSION');
  assert.equal(success.openAfterSubmit, false, 'valid submit must close before the delayed cloud response');
  await page.waitForTimeout(1300);
  assert.match(await page.locator('body').innerText(), /MODAL SUCCESS REGRESSION/, 'confirmed task must remain visible');

  await page.locator('[data-action="open-search"]').click();
  const searchModal = page.locator('[data-search-modal]');
  await searchModal.waitFor({ state: 'visible' });
  await page.locator('[data-search-input]').fill('MDLSCC');
  await page.waitForFunction(() => document.querySelectorAll('[data-search-results] .todo-search-item').length === 1);
  const searchResultText = await page.locator('[data-search-results]').innerText();
  assert.match(searchResultText, /MODAL SUCCESS REGRESSION/, 'fuzzy search must find a task by non-contiguous title characters');
  assert.match(searchResultText, /创建于 \d{4}年\d{1,2}月\d{1,2}日 \d{2}:\d{2}/, 'search result must show the task creation time');
  if (process.env.TODO_SEARCH_SCREENSHOT_DIR) {
    const screenshotDir = path.resolve(process.env.TODO_SEARCH_SCREENSHOT_DIR);
    await mkdir(screenshotDir, { recursive: true });
    await page.screenshot({ path: path.join(screenshotDir, 'todo-search-desktop.png') });
    await page.locator('[data-action="close-search"]').click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('[data-action="open-sidebar"]').click();
    await page.locator('[data-action="open-search"]').click();
    await page.waitForTimeout(220);
    await page.locator('[data-search-input]').fill('MDLSCC');
    await page.waitForFunction(() => document.querySelectorAll('[data-search-results] .todo-search-item').length === 1);
    await page.screenshot({ path: path.join(screenshotDir, 'todo-search-mobile.png') });
    await page.locator('[data-action="close-search"]').click();
    await page.setViewportSize({ width: 1440, height: 900 });
  } else {
    await page.locator('[data-action="close-search"]').click();
  }

  await page.locator('[data-action="open-search"]').click();
  await page.locator('[data-search-input]').fill('MDLSCC');
  await page.waitForFunction(() => document.querySelectorAll('[data-search-results] .todo-search-item').length === 1);
  const searchHit = page.locator('[data-search-results] .todo-search-item');
  assert.equal(await searchHit.count(), 1, 'search must return one clickable task result');
  const targetDate = await searchHit.getAttribute('data-todo-date');
  assert.match(targetDate || '', /^\d{4}-\d{2}-\d{2}$/, 'dated search result must expose its target date');
  await searchHit.click();
  assert.equal(await searchModal.evaluate((dialog) => dialog.open), false, 'clicking a dated search result must close the search modal');
  await page.waitForFunction((date) => document.querySelector(`.todo-day-column[data-drop-date="${date}"]`)?.classList.contains('is-located'), targetDate);
  assert.equal(
    await page.locator(`.todo-day-column[data-drop-date="${targetDate}"].is-selected`).count(),
    1,
    'clicking a search result must select and reveal its task date'
  );
  if (process.env.TODO_SEARCH_SCREENSHOT_DIR) {
    await page.screenshot({
      path: path.join(path.resolve(process.env.TODO_SEARCH_SCREENSHOT_DIR), 'todo-search-located.png')
    });
  }

  const failure = await submitTask(page, 'MODAL FAIL REGRESSION');
  assert.equal(failure.openAfterSubmit, false, 'failed cloud save must not keep the modal open');
  await page.waitForTimeout(1300);
  assert.equal(await failure.modal.evaluate((dialog) => dialog.open), false, 'failed cloud save must not reopen the modal');
  assert.doesNotMatch(await page.locator('body').innerText(), /MODAL FAIL REGRESSION/, 'unconfirmed task must be rolled back');

  const counters = await page.evaluate(() => globalThis.__todoModalRegression);
  assert.deepEqual(counters, { calls: 2, confirmed: 1, failures: 1 });
  console.log('Todo modal, search, and date-location regression test passed.');
} finally {
  await browser?.close();
  stopProcessTree(server);
}
