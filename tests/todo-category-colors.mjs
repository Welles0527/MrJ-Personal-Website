import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const url = process.env.TODO_COLOR_URL || 'http://127.0.0.1:4327/officialwebsite/topics/space/planning/todo';
const colors = { life: 'rgb(140, 221, 239)', health: 'rgb(67, 245, 116)', other: 'rgb(244, 206, 105)', study: 'rgb(217, 0, 54)', work: 'rgb(164, 137, 252)' };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
// An isolated browser and mocked cloud module: never write to real user data.
await page.route('**/*todo-cloud.ts*', route => route.fulfill({ contentType: 'application/javascript', body: `
const session = {uid:'color-test', account:'color-test@example.invalid'};
const todos = [];
export const getRememberedSession = () => session;
export const getCloudSession = async () => session;
export const loadCloudTodos = async () => ({todos:[...todos]});
export const watchCloudTodos = () => ({close(){}});
export const upgradeCloudTodoVersions = async () => 0;
export const upsertCloudTodo = async (uid,todo,expected,confirmed) => {
 const index=todos.findIndex(item=>item.id===todo.id);
 if(index<0) todos.push(todo); else todos[index]=todo;
 confirmed?.(); return {todo};
};
` }));
const modal = page.locator('[data-todo-modal]');
const form = page.locator('[data-todo-form]');
try {
  await page.goto(url);
  await page.getByText('color-test@example.invalid', { exact: false }).first().waitFor();
  for (const category of Object.keys(colors)) {
    await page.locator('[data-action="open-create"][data-date]').first().click();
    await form.locator('[name="title"]').fill(`分类测试 ${category}`);
    await form.locator('[name="category"]').selectOption(category);
    await form.locator('button[type="submit"]').click();
    await modal.waitFor({ state: 'hidden' });
  }
  const screenshotDirectory = path.join(tmpdir(), 'todo-category-colors');
  await mkdir(screenshotDirectory, { recursive: true });
  await page.locator('[data-action="open-create"][data-placement="weekly"]').click();
  await form.locator('[name="title"]').fill('每周运动测试');
  await form.locator('[name="category"]').selectOption('health');
  await form.locator('button[type="submit"]').click();
  await modal.waitFor({state:'hidden'});
  for (const viewport of [{width:1440,height:900},{width:390,height:844}]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(400);
    for (let i=0;i<3;i++) {
      const theme = await page.locator('[data-theme-toggle]').getAttribute('data-theme-current');
      const dayColumn = page.locator('.todo-board-section .todo-day-column').first();
      assert.equal(await dayColumn.evaluate(el=>getComputedStyle(el).borderTopWidth), '1px', `${theme}: day column border`);
      assert.notEqual(await dayColumn.evaluate(el=>getComputedStyle(el).borderTopColor), 'rgba(0, 0, 0, 0)', `${theme}: day column border color`);
      assert.equal(await page.locator('.todo-overview-item[data-task-category="health"]').evaluate(el=>getComputedStyle(el).backgroundColor),colors.health);
      for (const [category, color] of Object.entries(colors)) {
        const card = page.locator(`.todo-item[data-task-category="${category}"]`).first();
        assert.equal(await card.evaluate(el=>getComputedStyle(el).backgroundColor), color, `${theme}: ${category}`);
        assert.equal(await card.locator('.todo-item-title').evaluate(el=>getComputedStyle(el).color), category==='study'?'rgb(255, 255, 255)':'rgb(23, 33, 43)');
      }
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), 'page overflow');
      await page.screenshot({path:path.join(screenshotDirectory, `${viewport.width}-${theme}.png`),fullPage:true});
      await page.locator('[data-theme-toggle]').click();
      await page.waitForTimeout(400);
    }
  }
  await page.setViewportSize({width:1440,height:900});
  const life = page.locator('.todo-item[data-task-category="life"]').first();
  const id = await life.getAttribute('data-todo-id');
  await life.dblclick();
  await form.locator('[name="category"]').selectOption('study');
  await form.locator('button[type="submit"]').click();
  await modal.waitFor({state:'hidden'});
  const updated=page.locator(`.todo-item[data-todo-id="${id}"]`);
  assert.equal(await updated.getAttribute('data-task-category'),'study');
  assert.equal(await updated.evaluate(el=>getComputedStyle(el).backgroundColor),colors.study);
  await updated.hover();
  await page.waitForTimeout(200);
  assert.equal(await updated.evaluate(el=>getComputedStyle(el).backgroundColor),colors.study);
  await updated.locator('.todo-checkbox').check();
  await page.waitForFunction(id=>document.querySelector(`.todo-item[data-todo-id="${id}"]`)?.classList.contains('is-completed'), id);
  assert.equal(await updated.locator('.todo-item-title').evaluate(el=>getComputedStyle(el).color),'rgb(255, 255, 255)');
  console.log('PASS: five category backgrounds, three themes, desktop/mobile, category edit; cloud mocked.');
} finally { await browser.close(); }
