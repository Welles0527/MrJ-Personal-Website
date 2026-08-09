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
const statisticsSource = await readFile(
  path.join(projectRoot, 'src', 'components', 'BibleTextStatistics', 'BibleTextStatistics.tsx'),
  'utf8'
);

const requiredContent = [
  '圣经名山',
  '圣经献祭',
  '五种献祭，一表看懂差异',
  'age-rankings?view=lifespan',
  'age-rankings?view=accession',
  'bible-text-statistics/',
  '圣经文字'
];

requiredContent.forEach((content) => {
  assert.ok(html.includes(content), `另类圣经构建产物缺少：${content}`);
});

assert.ok(!html.includes('ADDRESS RESERVED'), '另类圣经被占位页覆盖');
assert.ok(!html.includes('等待内容接入'), '另类圣经仍显示等待内容接入');
assert.ok(statisticsSource.includes('全部66卷书'), '圣经文字分布未标明全部66卷书');
assert.ok(!statisticsSource.includes('.slice(0, 20)'), '圣经文字分布仍限制为前20卷书');

console.log('另类圣经构建回归检查通过：名山、五祭对比、人物排行榜与全部66卷文字分布均已保留。');
