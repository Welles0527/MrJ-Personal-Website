import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const builtPage = path.join(
  projectRoot,
  'dist',
  'topics',
  'applications',
  'inspiration-station',
  'theology',
  'alternative-knowledge',
  'index.html'
);

const html = await readFile(builtPage, 'utf8');

const requiredContent = [
  '圣经名山',
  '圣经献祭',
  '五种献祭，一表看懂差异',
  'age-rankings?view=lifespan',
  'age-rankings?view=accession'
];

requiredContent.forEach((content) => {
  assert.ok(html.includes(content), `另类圣经构建产物缺少：${content}`);
});

assert.ok(!html.includes('ADDRESS RESERVED'), '另类圣经被占位页覆盖');
assert.ok(!html.includes('等待内容接入'), '另类圣经仍显示等待内容接入');

console.log('另类圣经构建回归检查通过：名山、五祭对比和人物排行榜入口均已保留。');
