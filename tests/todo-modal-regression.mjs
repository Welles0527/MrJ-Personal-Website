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
const astroPackagePath = projectRequire.resolve('astro/package.json');
const astroPackage = projectRequire(astroPackagePath);
const astroBin = typeof astroPackage.bin === 'string' ? astroPackage.bin : astroPackage.bin?.astro;
if (!astroBin) throw new Error('Astro CLI entrypoint is missing from astro/package.json.');
const astroCli = path.resolve(path.dirname(astroPackagePath), astroBin);
const astroStartsInBackground = Number.parseInt(astroPackage.version, 10) >= 7;

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
    if (child && child.exitCode !== null) {
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
  export const startPasswordReset = async () => 'reset-regression';
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
const serverArgs = [astroCli, 'dev', '--host', '127.0.0.1', '--port', String(port), '--strictPort', '--force'];
if (astroStartsInBackground) serverArgs.push('--background');
const server = spawn(process.execPath, serverArgs, {
  cwd: projectRoot,
  env: { ...process.env, BROWSER: 'none' },
  stdio: ['ignore', 'pipe', 'pipe']
});
server.stdout.on('data', (chunk) => serverOutput.push(chunk.toString()));
server.stderr.on('data', (chunk) => serverOutput.push(chunk.toString()));

let browser;
try {
  await waitForServer(pageUrl, astroStartsInBackground ? null : server);
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
  let todoCloudRequestCount = 0;
  await page.route('**/*todo-cloud.ts*', async (route) => {
    todoCloudRequestCount += 1;
    if (todoCloudRequestCount === 1) {
      await route.abort('failed');
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript; charset=utf-8',
      body: cloudStub
    });
  });
  await page.goto(pageUrl, { waitUntil: 'networkidle' });
  await page.locator('[data-login-modal]').waitFor({ state: 'visible' });
  await page.locator('[data-login-form] input[name="email"]').fill('retry-regression@example.com');
  await page.locator('[data-action="forgot-password"]').click();
  await page.waitForTimeout(1000);
  assert.ok(todoCloudRequestCount >= 2, `cloud module loading must retry after its first request fails; requests=${todoCloudRequestCount}; message=${await page.locator('[data-login-message]').innerText()}`);
  assert.match(await page.locator('#todo-login-title').innerText(), /重置密码/, 'forgot-password must continue after the failed cloud module request');
  await page.reload({ waitUntil: 'networkidle' });
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

  assert.equal(await page.locator('.todo-brand strong').innerText(), 'J先生の超级日历', 'Todo brand name must use the requested title');
  assert.equal(await page.locator('.todo-brand div span').innerText(), '超级日历', 'Todo brand subtitle must use the requested title');
  assert.match(await page.locator('.todo-brand-mark img').getAttribute('src') || '', /todo-calendar\.svg$/, 'sidebar brand must use the transparent calendar icon asset');
  assert.match(await page.locator('.todo-title-cup img').getAttribute('src') || '', /todo-cup\.svg$/, 'Todo heading must use the cup icon asset');

  const themeToggle = page.locator('[data-theme-toggle]');
  assert.equal(await themeToggle.getAttribute('data-theme-current'), 'dark', 'default Todo theme must remain dark');
  await themeToggle.click();
  assert.equal(await themeToggle.getAttribute('data-theme-current'), 'noir-amber', 'dark theme must cycle to noir amber');
  assert.equal(await page.locator('html.theme-noir-amber').count(), 1, 'noir amber theme must set its root class');
  assert.equal(
    await page.evaluate(() => localStorage.getItem('mywebsite.todo-theme.v1')),
    'noir-amber',
    'noir amber selection must persist'
  );
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.body.textContent.includes('modal-regression@example.com'));
  assert.equal(await themeToggle.getAttribute('data-theme-current'), 'noir-amber', 'noir amber theme must survive reload');
  await themeToggle.click();
  assert.equal(await themeToggle.getAttribute('data-theme-current'), 'light', 'noir amber theme must cycle to light');
  await themeToggle.click();
  assert.equal(await themeToggle.getAttribute('data-theme-current'), 'dark', 'light theme must cycle back to dark');

  await page.locator('[data-action="open-template"]').click();
  const templateModal = page.locator('[data-template-modal]');
  await templateModal.waitFor({ state: 'visible' });
  assert.equal(
    await page.locator('[data-action="export-backup"] + [data-action="open-template"]').count(),
    1,
    'weekly template entry must appear immediately after Excel backup'
  );
  await page.locator('[data-template-form] input[name="templateTitle"]').fill('WEEKLY TEMPLATE REGRESSION');
  await page.locator('[data-template-form] .todo-template-everyday').click();
  assert.equal(await page.locator('[data-template-form] input[name="templateWeekdays"]:checked').count(), 7, 'everyday checkbox must select all seven weekdays');
  await page.locator('[data-template-form] select[name="templateCategory"]').selectOption('life');
  await page.locator('[data-template-form] button[type="submit"]').click();
  await page.waitForFunction(() => document.querySelector('[data-template-list]')?.textContent.includes('WEEKLY TEMPLATE REGRESSION'));
  assert.match(await page.locator('[data-template-list]').innerText(), /每天[\s\S]*WEEKLY TEMPLATE REGRESSION/, 'saved template must retain all seven weekdays');

  await page.locator('.todo-template-item', { hasText: 'WEEKLY TEMPLATE REGRESSION' }).getByRole('button', { name: '编辑' }).click();
  assert.equal(await page.locator('[data-template-form] input[name="templateWeekdays"]:checked').count(), 7, 'editing an everyday template must restore all weekday selections');
  assert.equal(await page.locator('[data-template-form] input[name="templateEveryday"]').isChecked(), true, 'editing an everyday template must restore the everyday checkbox');
  await page.locator('[data-template-form] input[name="templateTitle"]').fill('WEEKLY TEMPLATE UPDATED');
  await page.locator('[data-template-form] button[type="submit"]').click();
  await page.waitForFunction(() => document.querySelector('[data-template-list]')?.textContent.includes('WEEKLY TEMPLATE UPDATED'));
  assert.doesNotMatch(await page.locator('[data-template-list]').innerText(), /WEEKLY TEMPLATE REGRESSION/, 'template editing must replace the previous title');

  await page.locator('[data-template-form] input[name="templateTitle"]').fill('TEMP TEMPLATE TO DELETE');
  await page.locator('[data-template-form] .todo-template-weekday-option').nth(0).click();
  await page.locator('[data-template-form] .todo-template-weekday-option').nth(1).click();
  await page.locator('[data-template-form] button[type="submit"]').click();
  await page.waitForFunction(() => document.querySelector('[data-template-list]')?.textContent.includes('TEMP TEMPLATE TO DELETE'));
  const disposableTemplate = page.locator('.todo-template-item', { hasText: 'TEMP TEMPLATE TO DELETE' });
  await disposableTemplate.getByRole('button', { name: '移除' }).click();
  await disposableTemplate.getByRole('button', { name: '确认移除' }).click();
  await page.waitForFunction(() => !document.querySelector('[data-template-list]')?.textContent.includes('TEMP TEMPLATE TO DELETE'));
  assert.equal(await disposableTemplate.count(), 0, 'confirmed template removal must remove the item from the active template');

  if (process.env.TODO_SEARCH_SCREENSHOT_DIR) {
    const screenshotDir = path.resolve(process.env.TODO_SEARCH_SCREENSHOT_DIR);
    await mkdir(screenshotDir, { recursive: true });
    await templateModal.evaluate((dialog) => { dialog.scrollTop = 0; });
    await page.screenshot({ path: path.join(screenshotDir, 'todo-template-desktop.png') });
    await page.locator('[data-action="close-template"]').first().click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('[data-action="open-template"]').click();
    await templateModal.evaluate((dialog) => { dialog.scrollTop = 0; });
    await page.screenshot({ path: path.join(screenshotDir, 'todo-template-mobile.png') });
    const mobileTemplateBox = await templateModal.boundingBox();
    assert.ok(mobileTemplateBox && mobileTemplateBox.y >= 0 && mobileTemplateBox.y + mobileTemplateBox.height <= 844, 'mobile template modal must stay within the viewport');
    await page.locator('[data-action="close-template"]').first().click();
    await page.screenshot({ path: path.join(screenshotDir, 'todo-brand-mobile.png') });
    await page.locator('[data-action="open-sidebar"]').click();
    await page.waitForTimeout(220);
    assert.equal(await page.locator('.todo-brand strong').isVisible(), true, 'mobile sidebar must expose the requested brand title');
    await page.screenshot({ path: path.join(screenshotDir, 'todo-brand-mobile-sidebar.png') });
    await page.locator('[data-action="close-sidebar"]').click();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.locator('[data-action="open-template"]').click();
  }

  const weekDates = await page.locator('.todo-day-column').evaluateAll((columns) => columns.map((column) => column.getAttribute('data-drop-date')));
  assert.equal(weekDates.length, 7, 'selected week must expose seven dated columns');
  weekDates.forEach((date) => assert.match(date || '', /^\d{4}-\d{2}-\d{2}$/, 'every selected weekday must expose a valid date'));
  await page.locator('[data-action="import-template"]').click();
  await page.waitForFunction((dates) => dates.every((date) => document.querySelector(`.todo-day-column[data-drop-date="${date}"]`)?.textContent.includes('WEEKLY TEMPLATE UPDATED')), weekDates);
  for (const date of weekDates) {
    assert.equal(
      await page.locator(`.todo-day-column[data-drop-date="${date}"] .todo-item`, { hasText: 'WEEKLY TEMPLATE UPDATED' }).count(),
      1,
      'everyday template import must create one task on each weekday'
    );
  }
  await page.locator('[data-action="import-template"]').click();
  await page.waitForTimeout(150);
  for (const date of weekDates) {
    assert.equal(
      await page.locator(`.todo-day-column[data-drop-date="${date}"] .todo-item`, { hasText: 'WEEKLY TEMPLATE UPDATED' }).count(),
      1,
      're-importing the same everyday template into the same week must not duplicate tasks'
    );
  }
  await page.locator('[data-action="close-template"]').last().click();

  const aiInspirationTrigger = page.locator('[data-action="open-ai-inspiration"]');
  assert.equal(await aiInspirationTrigger.count(), 1, 'AI inspiration entry must appear in the weekly overview header');
  assert.equal(await page.locator('[data-sidebar-lanes]').count(), 0, 'AI inspiration lanes must not remain in the sidebar navigation');
  await aiInspirationTrigger.click();
  const aiModal = page.locator('[data-ai-modal]');
  await aiModal.waitFor({ state: 'visible' });
  assert.equal(await aiModal.locator('[data-drop-placement="ai-life"]').count(), 1, 'AI life lane must be available in the inspiration dialog');
  assert.equal(await aiModal.locator('[data-drop-placement="ai-investing"]').count(), 1, 'AI investing lane must be available in the inspiration dialog');
  await aiModal.locator('[data-action="open-create"][data-placement="ai-life"]').click();
  const todoModal = page.locator('[data-todo-modal]');
  await todoModal.waitFor({ state: 'visible' });
  assert.equal(await todoModal.locator('select[name="placement"]').inputValue(), 'ai-life', 'AI dialog add action must open an AI life task form');
  await todoModal.locator('[data-action="close-form"]').first().click();
  assert.equal(await aiModal.evaluate((dialog) => dialog.open), false, 'opening the AI task form must close the inspiration dialog');

  await aiInspirationTrigger.click();
  await aiModal.locator('[data-action="open-create"][data-placement="ai-life"]').click();
  await todoModal.locator('[data-todo-form] input[name="title"]').fill('AI INSPIRATION REGRESSION');
  await todoModal.locator('[data-todo-form] button[type="submit"]').click();
  await page.waitForTimeout(1300);
  await aiInspirationTrigger.click();
  await aiModal.waitFor({ state: 'visible' });
  assert.equal(await aiModal.getByText('AI INSPIRATION REGRESSION', { exact: true }).count(), 1, 'AI inspiration add action must persist the new item');
  await aiModal.locator('details.todo-overview-menu').first().locator('summary').click();
  await aiModal.locator('[data-action="edit-todo"]').click();
  await todoModal.waitFor({ state: 'visible' });
  await todoModal.locator('[data-todo-form] input[name="title"]').fill('AI INSPIRATION UPDATED');
  await todoModal.locator('[data-todo-form] button[type="submit"]').click();
  await page.waitForTimeout(1300);
  await aiInspirationTrigger.click();
  await aiModal.waitFor({ state: 'visible' });
  assert.equal(await aiModal.getByText('AI INSPIRATION UPDATED', { exact: true }).count(), 1, 'AI inspiration edit action must persist the updated item');
  assert.equal(await aiModal.getByText('AI INSPIRATION REGRESSION', { exact: true }).count(), 0, 'AI inspiration edit action must replace the previous title');
  await aiModal.locator('[data-action="close-ai-inspiration"]').click();

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.setViewportSize({ width: 390, height: 844 });
  await aiInspirationTrigger.click();
  const mobileAiModal = page.locator('[data-ai-modal]');
  await mobileAiModal.waitFor({ state: 'visible' });
  const mobileAiBox = await mobileAiModal.boundingBox();
  assert.ok(mobileAiBox && mobileAiBox.y >= 0 && mobileAiBox.y + mobileAiBox.height <= 844, 'mobile AI inspiration modal must stay within the viewport');
  if (process.env.TODO_SEARCH_SCREENSHOT_DIR) {
    const screenshotDir = path.resolve(process.env.TODO_SEARCH_SCREENSHOT_DIR);
    await mkdir(screenshotDir, { recursive: true });
    await page.screenshot({ path: path.join(screenshotDir, 'todo-ai-mobile.png') });
  }
  await mobileAiModal.locator('[data-action="close-ai-inspiration"]').click();
  await page.setViewportSize({ width: 1440, height: 900 });

  const success = await submitTask(page, 'MODAL SUCCESS REGRESSION');
  assert.equal(success.openAfterSubmit, false, 'valid submit must close before the delayed cloud response');
  await page.waitForTimeout(1300);
  assert.match(await page.locator('body').innerText(), /MODAL SUCCESS REGRESSION/, 'confirmed task must remain visible');
  assert.equal(await page.locator('[data-sync-retry]').isHidden(), true, 'a confirmed first save must not expose the retry sync action');

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
  assert.deepEqual(counters, { calls: 15, confirmed: 14, failures: 1 });
  console.log('Todo modal, weekly template, search, and date-location regression test passed.');
} finally {
  await browser?.close();
  if (astroStartsInBackground) {
    spawnSync(process.execPath, [astroCli, 'dev', 'stop'], { cwd: projectRoot, stdio: 'ignore' });
  } else {
    stopProcessTree(server);
  }
}
