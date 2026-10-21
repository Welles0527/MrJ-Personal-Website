import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';

// Import the user's local archive; no network requests or paraphrasing.
const input = process.argv[2];
if (!input) throw new Error('Usage: node scripts/import-bible-commentary.mjs <detail-json>');
const root = resolve(import.meta.dirname, '..');
const records = JSON.parse(await readFile(input, 'utf8'));
const component = await readFile(join(root, 'src/components/BibleTheologyPage.astro'), 'utf8');
const bookSlugs = new Map([...component.matchAll(/\['([a-z0-9]{3})', '([^']+)', '[^']+', \d+\]/g)].map(m => [m[2], m[1]]));
const bible = JSON.parse(await readFile(join(root, 'public/data/bible/chi-cuv-simp.json'), 'utf8'));
const destination = join(root, 'public/data/bible/commentary/baibaoshu-20261021');
assert.equal(bookSlugs.size, 66);
assert.equal(records.length, 1189);

function range(text, chapter, count) {
  const normalized = text.replace(/[：]/g, ':').replace(/[–—－~～]/g, '-').replace(/(\d)\s*[上下]/g, '$1');
  const list = normalized.match(/[（(]节\s*([\d\s,，、-]+)[）)]/);
  if (list) {
    const numbers = list[1].split(/[,，、]/).flatMap(item => {
      const part = item.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
      if (!part) return [];
      const start = Number(part[1]);
      const end = Number(part[2] || part[1]);
      if (start < 1 || end < start || end > 200) return [];
      return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    });
    const verseNumbers = [...new Set(numbers)].sort((a, b) => a - b);
    if (verseNumbers.length) return { start: verseNumbers[0], end: verseNumbers.at(-1), verseNumbers };
  }
  const m = normalized.match(/(\d+):(\d+)[a-c]?(?:\s*-\s*(?:(\d+):)?(\d+)[a-c]?)?/i);
  if (!m) return null;
  const firstChapter = Number(m[1]);
  const lastChapter = Number(m[3] || m[1]);
  if (chapter < firstChapter || chapter > lastChapter) return null;
  const start = firstChapter === chapter ? Number(m[2]) : 1;
  const end = lastChapter === chapter ? Number(m[4] || m[2]) : count;
  if (start < 1 || end < start || start > count || end > 200) return null;
  return { start, end };
}

const summary = { source: 'https://baibaoshu.net', snapshot: '2026-10-21', chapters: 0, verses: 0, verse: 0, passage: 0, chapter: 0, chapterFallbacks: [] };
const seen = new Set();
for (const record of records) {
  const book = bookSlugs.get(record.bookChinese);
  const key = `${book}-${record.chapter}`;
  const count = bible.chapters[key]?.length;
  assert(count && !seen.has(key), `Invalid chapter ${key}`);
  seen.add(key);
  const candidates = [];
  // A few source chapters flatten headings onto one line. Restore structural newlines only.
  const markdownSource = record.markdown.replace(/ +(?=## |>(?: +)\*\*\d+[:：])/g, '\n\n');
  const headings = [...markdownSource.matchAll(/^##\s+(.+)$/gm)];
  for (let h = 0; h < headings.length; h++) {
    const heading = headings[h];
    const title = heading[1].trim();
    const parentRange = range(title, record.chapter, count);
    const body = markdownSource.slice(heading.index + heading[0].length, headings[h + 1]?.index).trim();
    if (!body) continue;
    if (parentRange) candidates.push({ ...parentRange, title, markdown: body, kind: 'passage' });
    // Only leading, explicitly labelled scripture quotations count as verse boundaries.
    // Cross-references inside explanatory prose must never change the verse mapping.
    const quotes = [...body.matchAll(/^>\s*\*\*(\d+[:：][\d a-c:：–—－~～-]+)\*\*[^\n]*$/gm)];
    let groupStart = null;
    let groupVerses = [];
    for (let q = 0; q < quotes.length; q++) {
      const quote = quotes[q];
      const quoteRange = range(quote[1], record.chapter, count);
      if (!quoteRange || (parentRange && !parentRange.verseNumbers && (quoteRange.start < parentRange.start || quoteRange.end > parentRange.end))) {
        groupStart = null;
        groupVerses = [];
        continue;
      }
      groupStart ??= quote.index;
      for (let v = quoteRange.start; v <= quoteRange.end; v++) groupVerses.push(v);
      const tail = body.slice(quote.index, quotes[q + 1]?.index).trim();
      // Consecutive quotations may share the explanation that follows them (e.g. Matt 26:40–44).
      if (!tail.split('\n').some(line => line.trim() && !line.startsWith('>'))) continue;
      const verseNumbers = [...new Set(groupVerses)].sort((a, b) => a - b);
      candidates.push({ start: verseNumbers[0], end: verseNumbers.at(-1), verseNumbers, title,
        markdown: body.slice(groupStart, quotes[q + 1]?.index).trim(), kind: 'verse' });
      groupStart = null;
      groupVerses = [];
    }
  }
  const fallback = { start: 1, end: count, title: `${record.bookChinese} ${record.chapter}章`, markdown: record.markdown, kind: 'chapter' };
  const sections = [];
  const indices = new Map();
  const verses = [];
  const chapterFallback = [];
  for (let verse = 1; verse <= count; verse++) {
    const matching = candidates.filter(s => s.verseNumbers ? s.verseNumbers.includes(verse) : s.start <= verse && s.end >= verse);
    matching.sort((a, b) => (a.end - a.start) - (b.end - b.start) || Number(b.kind === 'verse') - Number(a.kind === 'verse'));
    const best = matching[0] || fallback;
    const selected = matching.length ? matching.filter(s => s.kind === best.kind && s.end - s.start === best.end - best.start) : [fallback];
    verses.push(selected.map(s => {
      if (!indices.has(s)) { indices.set(s, sections.length); sections.push(s); }
      return indices.get(s);
    }));
    summary[best.kind]++;
    if (best.kind === 'chapter') chapterFallback.push(verse);
  }
  const payload = { book, chapter: record.chapter, sourceUrl: record.sourceUrl, sections, verses };
  await mkdir(join(destination, book), { recursive: true });
  await writeFile(join(destination, book, `${record.chapter}.json`), JSON.stringify(payload) + '\n');
  summary.chapters++;
  summary.verses += count;
  if (chapterFallback.length) summary.chapterFallbacks.push({ book, chapter: record.chapter, verses: chapterFallback });
}
assert.equal(seen.size, Object.keys(bible.chapters).length);
await writeFile(join(destination, 'coverage.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({ ...summary, chapterFallbacks: summary.chapterFallbacks.length }));
