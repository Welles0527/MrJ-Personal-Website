const STORAGE_KEY = 'mywebsite.bible-reader.v1';
const BIBLE_URL = '/officialwebsite/data/bible/chi-cuv-simp.json';

const books = {
  gen: '创世记', exo: '出埃及记', lev: '利未记', num: '民数记', deu: '申命记', jos: '约书亚记',
  jdg: '士师记', rut: '路得记', '1sa': '撒母耳记上', '2sa': '撒母耳记下', '1ki': '列王纪上', '2ki': '列王纪下',
  '1ch': '历代志上', '2ch': '历代志下', ezr: '以斯拉记', neh: '尼希米记', est: '以斯帖记', job: '约伯记',
  psa: '诗篇', pro: '箴言', ecc: '传道书', sng: '雅歌', isa: '以赛亚书', jer: '耶利米书', lam: '耶利米哀歌',
  ezk: '以西结书', dan: '但以理书', hos: '何西阿书', jol: '约珥书', amo: '阿摩司书', oba: '俄巴底亚书',
  jon: '约拿书', mic: '弥迦书', nam: '那鸿书', hab: '哈巴谷书', zep: '西番雅书', hag: '哈该书', zec: '撒迦利亚书',
  mal: '玛拉基书', mat: '马太福音', mrk: '马可福音', luk: '路加福音', jhn: '约翰福音', act: '使徒行传',
  rom: '罗马书', '1co': '哥林多前书', '2co': '哥林多后书', gal: '加拉太书', eph: '以弗所书', php: '腓立比书',
  col: '歌罗西书', '1th': '帖撒罗尼迦前书', '2th': '帖撒罗尼迦后书', '1ti': '提摩太前书', '2ti': '提摩太后书',
  tit: '提多书', phm: '腓利门书', heb: '希伯来书', jas: '雅各书', '1pe': '彼得前书', '2pe': '彼得后书',
  '1jn': '约翰一书', '2jn': '约翰二书', '3jn': '约翰三书', jud: '犹大书', rev: '启示录'
};

const seedRecords = [
  { book: 'gen', chapter: 1, verse: 1, bookmark: true, note: '创造的开端不是混乱，而是神主动的工作。今天的计划也应从祂的主权开始。', updatedAt: '2026-07-29T08:20:00+08:00', fallback: '起初神创造天地。' },
  { book: 'exo', chapter: 3, verse: 14, bookmark: false, note: '神的名字提醒我：祂的同在不依赖环境，也不被我的理解限制。', updatedAt: '2026-07-27T21:05:00+08:00', fallback: '神对摩西说：我是自有永有的。' },
  { book: 'psa', chapter: 23, verse: 1, bookmark: true, note: '缺乏感常来自我只看见资源，却忘记牧者。', updatedAt: '2026-07-31T07:42:00+08:00', fallback: '（大卫的诗）耶和华是我的牧者，我必不至缺乏。' },
  { book: 'psa', chapter: 119, verse: 105, bookmark: true, note: '', updatedAt: '2026-07-23T06:30:00+08:00', fallback: '你的话是我脚前的灯，是我路上的光。' },
  { book: 'mat', chapter: 5, verse: 9, bookmark: false, note: '使人和睦不是回避分歧，而是主动把真理、恩典与关系重新连接。', updatedAt: '2026-07-25T22:18:00+08:00', fallback: '使人和睦的人有福了！因为他们必称为神的儿子。' },
  { book: 'jhn', chapter: 3, verse: 16, bookmark: true, note: '', updatedAt: '2026-07-20T09:15:00+08:00', fallback: '神爱世人，甚至将他的独生子赐给他们。' },
  { book: 'rom', chapter: 12, verse: 1, bookmark: true, note: '活祭不是一次性的热心，而是把身体、时间与选择持续交给神。', updatedAt: '2026-07-30T19:40:00+08:00', fallback: '所以弟兄们，我以神的慈悲劝你们，将身体献上，当作活祭。' },
  { book: 'heb', chapter: 12, verse: 1, bookmark: false, note: '今天要辨认的重担：过度比较，以及对结果的控制。', updatedAt: '2026-07-28T23:11:00+08:00', fallback: '就当放下各样的重担，脱去容易缠累我们的罪，存心忍耐，奔那摆在我们前头的路程。' }
];

const elements = {
  tabs: [...document.querySelectorAll('[data-type]')],
  search: document.querySelector('[data-search]'),
  bookList: document.querySelector('[data-book-list]'),
  bookHeading: document.querySelector('[data-book-heading]'),
  chapter: document.querySelector('[data-chapter]'),
  verse: document.querySelector('[data-verse]'),
  reset: document.querySelector('[data-reset]'),
  resetLocation: document.querySelector('[data-reset-location]'),
  export: document.querySelector('[data-export]'),
  list: document.querySelector('[data-record-list]'),
  count: document.querySelector('[data-result-count]'),
  source: document.querySelector('[data-source]'),
  total: document.querySelector('[data-total]'),
  bookmarks: document.querySelector('[data-bookmarks]'),
  notes: document.querySelector('[data-notes]'),
  toast: document.querySelector('[data-toast]'),
  tabCounts: Object.fromEntries([...document.querySelectorAll('[data-tab-count]')]
    .map((item) => [item.dataset.tabCount, item])),
  sidebar: document.querySelector('[data-sidebar]'),
  sidebarOpen: document.querySelector('[data-sidebar-open]'),
  sidebarClose: document.querySelector('[data-sidebar-close]'),
  sidebarBackdrop: document.querySelector('[data-sidebar-backdrop]')
};

const filter = { type: 'all', query: '', book: 'all', chapter: 'all', verse: 'all' };
let records = [];
let visibleRecords = [];
let bibleChapters = {};
let toastTimer;

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const normalize = (value = '') => String(value).toLowerCase().replace(/[\s，。、“”‘’：；！!？?]/g, '');
const bookName = (slug) => books[slug] || slug.toUpperCase();
const recordKey = (item) => `${item.book}-${Number(item.chapter)}-${Number(item.verse)}`;
const verseText = (item) => bibleChapters[`${item.book}-${item.chapter}`]?.[item.verse - 1] || item.verseText || item.fallback || '暂未载入这节经文。';

function readLocalRecords() {
  try {
    const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!state || (!Array.isArray(state.bookmarks) && !Array.isArray(state.notes))) return [];
    const merged = new Map();
    (state.bookmarks || []).forEach((item) => {
      if (!item?.book || !item.chapter || !item.verse) return;
      merged.set(recordKey(item), {
        book: item.book,
        chapter: Number(item.chapter),
        verse: Number(item.verse),
        bookmark: true,
        note: '',
        verseText: item.text || '',
        updatedAt: item.updatedAt || item.createdAt || ''
      });
    });
    (state.notes || []).forEach((item) => {
      if (!item?.book || !item.chapter || !item.verse) return;
      const key = recordKey(item);
      const current = merged.get(key) || {
        book: item.book,
        chapter: Number(item.chapter),
        verse: Number(item.verse),
        bookmark: false,
        note: '',
        verseText: '',
        updatedAt: ''
      };
      current.note = item.text || '';
      if (Date.parse(item.updatedAt || item.createdAt || '') > Date.parse(current.updatedAt || '')) current.updatedAt = item.updatedAt || item.createdAt;
      merged.set(key, current);
    });
    return [...merged.values()].filter((item) => item.bookmark || item.note);
  } catch {
    return [];
  }
}

function formatDate(value) {
  if (!value || Number.isNaN(Date.parse(value))) return '未记录日期';
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
}

function showToast(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  toastTimer = setTimeout(() => { elements.toast.hidden = true; }, 2600);
}

function matchesLibraryContext(item) {
  if (filter.type === 'bookmark' && !item.bookmark) return false;
  if (filter.type === 'note' && !item.note) return false;
  if (!filter.query) return true;
  const haystack = normalize(`${bookName(item.book)} ${item.chapter} ${item.verse} ${verseText(item)} ${item.note}`);
  return haystack.includes(normalize(filter.query));
}

function renderBookOptions() {
  const contextRecords = records.filter(matchesLibraryContext);
  const counts = contextRecords.reduce((result, item) => {
    result.set(item.book, (result.get(item.book) || 0) + 1);
    return result;
  }, new Map());
  const available = Object.keys(books).filter((book) => counts.has(book));
  const option = (book, label, count) => `<button class="book-option${filter.book === book ? ' is-active' : ''}" type="button" data-book-option="${escapeHtml(book)}" aria-pressed="${filter.book === book}"><span>${escapeHtml(label)}</span><small>${count} 条</small></button>`;
  elements.bookList.innerHTML = option('all', '全部经卷', contextRecords.length)
    + available.map((book) => option(book, bookName(book), counts.get(book))).join('');
  elements.bookHeading.textContent = filter.book === 'all' ? '全部经卷' : bookName(filter.book);
}

function updateChapterOptions() {
  const chapters = [...new Set(records
    .filter((item) => matchesLibraryContext(item) && (filter.book === 'all' || item.book === filter.book))
    .map((item) => item.chapter))].sort((a, b) => a - b);
  elements.chapter.innerHTML = '<option value="all">全部章节</option>' + chapters
    .map((chapter) => `<option value="${chapter}">第 ${chapter} 章</option>`).join('');
  if (filter.chapter !== 'all' && !chapters.includes(Number(filter.chapter))) filter.chapter = 'all';
  elements.chapter.value = filter.chapter;
}

function updateVerseOptions() {
  const verses = [...new Set(records
    .filter((item) => matchesLibraryContext(item)
      && (filter.book === 'all' || item.book === filter.book)
      && (filter.chapter === 'all' || item.chapter === Number(filter.chapter)))
    .map((item) => item.verse))].sort((a, b) => a - b);
  elements.verse.innerHTML = '<option value="all">全部节</option>' + verses
    .map((verse) => `<option value="${verse}">第 ${verse} 节</option>`).join('');
  if (filter.verse !== 'all' && !verses.includes(Number(filter.verse))) filter.verse = 'all';
  elements.verse.value = filter.verse;
}

function updateLocationOptions() {
  updateChapterOptions();
  updateVerseOptions();
}

function matchesFilter(item) {
  if (!matchesLibraryContext(item)) return false;
  if (filter.book !== 'all' && item.book !== filter.book) return false;
  if (filter.chapter !== 'all' && item.chapter !== Number(filter.chapter)) return false;
  if (filter.verse !== 'all' && item.verse !== Number(filter.verse)) return false;
  return true;
}

function typeBadges(item) {
  const bookmark = `<span class="record-type"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z" /></svg>经文收藏</span>`;
  const note = `<span class="record-type"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5" /></svg>我的笔记</span>`;
  return `${item.bookmark ? bookmark : ''}${item.note ? note : ''}`;
}

function renderRecord(item, index) {
  return `<article class="record-card">
    <div class="record-index">
      <span class="record-number">${String(index + 1).padStart(2, '0')}</span>
      <h3 class="record-location"><span>${escapeHtml(bookName(item.book))}</span><strong>${item.chapter}:${item.verse}</strong></h3>
    </div>
    <div class="record-body">
      <div class="record-head"><div class="record-types">${typeBadges(item)}</div><time class="record-date">更新于 ${formatDate(item.updatedAt)}</time></div>
      <blockquote class="verse-text">${escapeHtml(verseText(item))}</blockquote>
      ${item.note ? `<div class="note-block"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5" /></svg><strong>我的笔记</strong><p>${escapeHtml(item.note)}</p></div>` : ''}
    </div>
  </article>`;
}

function render() {
  visibleRecords = records.filter(matchesFilter)
    .sort((a, b) => Date.parse(b.updatedAt || '') - Date.parse(a.updatedAt || ''));
  elements.count.textContent = `共 ${visibleRecords.length} 段经文`;
  elements.export.disabled = visibleRecords.length === 0;
  if (!visibleRecords.length) {
    elements.list.innerHTML = `<div class="empty-state"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4M8.5 11h5" /></svg><h3>没有找到匹配内容</h3><p>尝试更换经卷、章节或搜索关键词。</p></div>`;
    return;
  }
  elements.list.innerHTML = visibleRecords.map(renderRecord).join('');
}

function resetFilters() {
  filter.type = 'all';
  filter.query = '';
  filter.book = 'all';
  filter.chapter = 'all';
  filter.verse = 'all';
  elements.search.value = '';
  elements.tabs.forEach((tab) => {
    const active = tab.dataset.type === 'all';
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-pressed', String(active));
  });
  renderBookOptions();
  updateLocationOptions();
  render();
}

function resetLocationFilters() {
  filter.chapter = 'all';
  filter.verse = 'all';
  updateLocationOptions();
  render();
}

function setSidebar(open) {
  elements.sidebar.classList.toggle('is-open', open);
  elements.sidebarBackdrop.classList.toggle('is-visible', open);
  elements.sidebarOpen.setAttribute('aria-expanded', String(open));
  document.body.classList.toggle('sidebar-open', open);
}

function csvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

function exportVisible() {
  if (!visibleRecords.length) return;
  const rows = [['类型', '经卷', '章节', '节', '经文', '笔记', '更新时间']];
  visibleRecords.forEach((item) => rows.push([
    [item.bookmark ? '收藏' : '', item.note ? '笔记' : ''].filter(Boolean).join(' + '),
    bookName(item.book), item.chapter, item.verse, verseText(item), item.note, formatDate(item.updatedAt)
  ]));
  const csv = '\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `微读圣经-收藏与笔记-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast(`已导出 ${visibleRecords.length} 段经文`);
}

elements.tabs.forEach((tab) => tab.addEventListener('click', () => {
  filter.type = tab.dataset.type;
  elements.tabs.forEach((item) => {
    const active = item === tab;
    item.classList.toggle('is-active', active);
    item.setAttribute('aria-pressed', String(active));
  });
  renderBookOptions();
  updateLocationOptions();
  render();
}));

elements.search.addEventListener('input', () => {
  filter.query = elements.search.value.trim();
  renderBookOptions();
  updateLocationOptions();
  render();
});
elements.bookList.addEventListener('click', (event) => {
  const option = event.target.closest('[data-book-option]');
  if (!option) return;
  filter.book = option.dataset.bookOption;
  filter.chapter = 'all';
  filter.verse = 'all';
  renderBookOptions();
  updateLocationOptions();
  render();
  if (window.matchMedia('(max-width: 920px)').matches) setSidebar(false);
});
elements.chapter.addEventListener('change', () => {
  filter.chapter = elements.chapter.value;
  filter.verse = 'all';
  updateVerseOptions();
  render();
});
elements.verse.addEventListener('change', () => { filter.verse = elements.verse.value; render(); });
elements.reset.addEventListener('click', resetFilters);
elements.resetLocation.addEventListener('click', resetLocationFilters);
elements.export.addEventListener('click', exportVisible);
elements.sidebarOpen.addEventListener('click', () => setSidebar(true));
elements.sidebarClose.addEventListener('click', () => setSidebar(false));
elements.sidebarBackdrop.addEventListener('click', () => setSidebar(false));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') setSidebar(false);
});

async function init() {
  const localRecords = readLocalRecords();
  records = localRecords.length ? localRecords : seedRecords;
  elements.source.textContent = localRecords.length ? '已载入本机资料' : 'Demo 示例数据';
  try {
    const response = await fetch(BIBLE_URL);
    if (!response.ok) throw new Error('Bible data unavailable');
    bibleChapters = (await response.json()).chapters || {};
  } catch {
    showToast('经文资料暂未载入，当前显示备用文本');
  }
  elements.total.textContent = records.length;
  elements.bookmarks.textContent = records.filter((item) => item.bookmark).length;
  elements.notes.textContent = records.filter((item) => item.note).length;
  elements.tabCounts.all.textContent = records.length;
  elements.tabCounts.bookmark.textContent = records.filter((item) => item.bookmark).length;
  elements.tabCounts.note.textContent = records.filter((item) => item.note).length;
  renderBookOptions();
  updateLocationOptions();
  render();
}

init();
