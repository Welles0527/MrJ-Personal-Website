type CommentarySection = {
  start: number;
  end: number;
  verseNumbers?: number[];
  title: string;
  markdown: string;
  kind: 'verse' | 'passage' | 'chapter';
};
type CommentaryChapter = {
  book: string;
  chapter: number;
  sourceUrl: string;
  sections: CommentarySection[];
  verses: number[][];
};

const chapters = new Map<string, Promise<CommentaryChapter>>();

export async function loadVerseCommentary(book: string, chapter: number, verse: number) {
  const key = `${book}-${chapter}`;
  let pending = chapters.get(key);
  if (!pending) {
    const base = import.meta.env.BASE_URL.replace(/\/$/, '');
    pending = fetch(`${base}/data/bible/commentary/baibaoshu-20261021/${book}/${chapter}.json`, {
      signal: AbortSignal.timeout(15000)
    }).then(async response => {
      if (!response.ok) throw new Error('注解暂时无法载入');
      const value = await response.json() as CommentaryChapter;
      if (value.book !== book || value.chapter !== chapter || !Array.isArray(value.sections) || !Array.isArray(value.verses)) {
        throw new Error('注解章节不匹配');
      }
      return value;
    });
    chapters.set(key, pending);
    pending.catch(() => { if (chapters.get(key) === pending) chapters.delete(key); });
  }
  const payload = await pending;
  const sections = payload.verses[verse - 1]?.map(index => payload.sections[index]);
  if (!sections?.length || sections.some(s => !s || !s.markdown || s.start > verse || s.end < verse || (s.verseNumbers && !s.verseNumbers.includes(verse)))) {
    throw new Error('暂无对应经文注解');
  }
  return { sections, sourceUrl: payload.sourceUrl };
}

// Build DOM nodes rather than interpreting source HTML. Imported text cannot inject scripts.
export function renderCommentary(container: HTMLElement, sections: CommentarySection[], chapter: number) {
  const fragment = document.createDocumentFragment();
  for (const section of sections) {
    const numbers = section.verseNumbers || Array.from({ length: section.end - section.start + 1 }, (_, i) => section.start + i);
    const ranges: string[] = [];
    for (let i = 0; i < numbers.length; i++) {
      const first = numbers[i];
      while (numbers[i + 1] === numbers[i] + 1) i++;
      ranges.push(first === numbers[i] ? String(first) : `${first}–${numbers[i]}`);
    }
    const label = document.createElement('p');
    label.className = 'bible-commentary-range';
    label.textContent = section.kind === 'chapter'
      ? `${chapter}章 · 本章注解（原文未单独标出本节）`
      : `${chapter}:${ranges.join('、')} · ${numbers.length === 1 ? '本节注解' : '合并注解'}`;
    fragment.append(label);
    const title = document.createElement('h4');
    title.textContent = section.title;
    fragment.append(title);
    for (const block of section.markdown.split(/\n\s*\n/)) {
      if (!block.trim() || /^[-*_]{3,}$/.test(block.trim())) continue;
      const heading = /^#{1,6}\s/.test(block);
      const quote = /^>/.test(block);
      const node = document.createElement(heading ? 'h4' : quote ? 'blockquote' : 'p');
      const text = block.replace(/^#{1,6}\s+/gm, '').replace(/^>\s?/gm, '')
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
      for (const part of text.split(/(\*\*[^*]+\*\*)/g)) {
        if (part.startsWith('**') && part.endsWith('**')) {
          const strong = document.createElement('strong');
          strong.textContent = part.slice(2, -2);
          node.append(strong);
        } else {
          node.append(document.createTextNode(part.replace(/\*([^*\n]+)\*/g, '$1')));
        }
      }
      fragment.append(node);
    }
  }
  container.replaceChildren(fragment);
}
