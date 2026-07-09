import { getCloudDb, getCloudSession, getRememberedSession, signInWithPassword, startEmailSignUp } from './site-auth';
import type { CloudSession } from './site-auth';

type BibleBook = {
  slug: string;
  title: string;
  shortName: string;
  chapters: number;
  testament: '旧约' | '新约';
};

type ChapterSample = {
  book: string;
  chapter: number;
  title: string;
  verses: string[];
};

type FeaturePage = {
  id: string;
  title: string;
  eyebrow: string;
  quote: string;
  reference: string;
  summary: string;
  action: string;
  href: string;
  status: string;
  image: string;
  artA: string;
  artB: string;
  artC: string;
};

type BibleData = {
  books: BibleBook[];
  samples: Record<string, ChapterSample>;
  features: FeaturePage[];
  fullTextUrl?: string;
  versionLabel?: string;
};

type BibleTextPayload = {
  version?: {
    label?: string;
    license?: string;
    source?: string;
  };
  chapterCount?: number;
  verseCount?: number;
  chapters: Record<string, string[]>;
};

type LastRead = {
  book: string;
  chapter: number;
  verse?: number;
  updatedAt: string;
};

type Bookmark = {
  id: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
  createdAt: string;
  updatedAt: string;
};

type Note = {
  id: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
  createdAt: string;
  updatedAt: string;
};

type ReaderState = {
  lastRead: LastRead;
  bookmarks: Bookmark[];
  notes: Note[];
  updatedAt: string;
};

type ReadingProgressSummary = {
  read: number;
  total: number;
};

const STORAGE_KEY = 'mywebsite.bible-reader.v1';
const DAILY_PLAN_KEY = 'mywebsite.bible-daily-plan.v1';
const READ_VERSES_KEY = 'mywebsite.bible-read-verses.v1';
const COLLECTION = 'officialWebsiteBibleReaderState';

const nowIso = () => new Date().toISOString();
const chapterKey = (book: string, chapter: number) => `${book}-${chapter}`;
const verseKey = (book: string, chapter: number, verse: number) => `${book}-${chapter}-${verse}`;
const bibleComTcvChapterUrl = (book: string, chapter: number) =>
  `https://www.bible.com/zh-TW/bible/3283/${book.toUpperCase()}.${chapter}.TCV2019T`;
const createId = () => typeof crypto !== 'undefined' && 'randomUUID' in crypto
  ? crypto.randomUUID()
  : `bible-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const readLocalState = (fallback: ReaderState): ReaderState => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<ReaderState>;
    if (!parsed || !parsed.lastRead || !Array.isArray(parsed.bookmarks) || !Array.isArray(parsed.notes)) return fallback;
    return {
      lastRead: parsed.lastRead,
      bookmarks: parsed.bookmarks.filter((item): item is Bookmark => Boolean(item?.id && item.book && item.chapter && item.verse)),
      notes: parsed.notes.filter((item): item is Note => Boolean(item?.id && item.book && item.chapter && item.verse)),
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : fallback.updatedAt
    };
  } catch {
    return fallback;
  }
};

const writeLocalState = (state: ReaderState) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
};

const readReadVerses = () => {
  try {
    const raw = window.localStorage.getItem(READ_VERSES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []);
  } catch {
    return new Set<string>();
  }
};

const writeReadVerses = (readVerses: Set<string>) => {
  try {
    window.localStorage.setItem(READ_VERSES_KEY, JSON.stringify([...readVerses]));
  } catch {
    // Reading state is a local convenience; the UI can still work without persistence.
  }
};

const mergeState = (local: ReaderState, cloud: ReaderState): ReaderState => {
  const bookmarks = new Map<string, Bookmark>();
  [...local.bookmarks, ...cloud.bookmarks].forEach((item) => {
    const current = bookmarks.get(item.id);
    if (!current || Date.parse(item.updatedAt) >= Date.parse(current.updatedAt)) bookmarks.set(item.id, item);
  });

  const notes = new Map<string, Note>();
  [...local.notes, ...cloud.notes].forEach((item) => {
    const current = notes.get(item.id);
    if (!current || Date.parse(item.updatedAt) >= Date.parse(current.updatedAt)) notes.set(item.id, item);
  });

  const localReadTime = Date.parse(local.lastRead.updatedAt);
  const cloudReadTime = Date.parse(cloud.lastRead.updatedAt);
  const updatedAt = Date.parse(local.updatedAt) >= Date.parse(cloud.updatedAt) ? local.updatedAt : cloud.updatedAt;

  return {
    lastRead: cloudReadTime > localReadTime ? cloud.lastRead : local.lastRead,
    bookmarks: [...bookmarks.values()].sort((first, second) => Date.parse(second.updatedAt) - Date.parse(first.updatedAt)),
    notes: [...notes.values()].sort((first, second) => Date.parse(second.updatedAt) - Date.parse(first.updatedAt)),
    updatedAt
  };
};

export function mountBibleReader(root: HTMLElement, data: BibleData) {
  const get = <T extends Element>(selector: string) => {
    const element = root.querySelector<T>(selector);
    if (!element) throw new Error(`圣经页面缺少必要节点：${selector}`);
    return element;
  };

  const featureBook = get<HTMLElement>('[data-feature-book]');
  const featureNav = [...root.querySelectorAll<HTMLButtonElement>('[data-feature-target]')];
  const featureTitle = get<HTMLElement>('[data-feature-title]');
  const featureEyebrow = get<HTMLElement>('[data-feature-eyebrow]');
  const featureQuote = get<HTMLElement>('[data-feature-quote]');
  const featureReference = get<HTMLElement>('[data-feature-reference]');
  const featureSummary = get<HTMLElement>('[data-feature-summary]');
  const featureAction = get<HTMLAnchorElement>('[data-feature-action]');
  const featureArt = get<HTMLElement>('[data-feature-art]');
  const featureImage = get<HTMLImageElement>('[data-feature-image]');
  const featureStatus = get<HTMLElement>('[data-feature-status]');
  const featureCount = get<HTMLElement>('[data-feature-count]');
  const bookList = get<HTMLElement>('[data-book-list]');
  const chapterList = get<HTMLElement>('[data-chapter-list]');
  const verseList = get<HTMLElement>('[data-verse-list]');
  const searchInput = get<HTMLInputElement>('[data-bible-search]');
  const searchStatus = get<HTMLElement>('[data-bible-search-status]');
  const searchResults = get<HTMLElement>('[data-search-results]');
  const currentTitle = get<HTMLElement>('[data-current-title]');
  const lastRead = get<HTMLElement>('[data-last-read]');
  const bookmarkList = get<HTMLElement>('[data-bookmark-list]');
  const bookmarkSectionList = root.querySelector<HTMLElement>('[data-bookmark-section-list]');
  const readerBookmarkToggle = root.querySelector<HTMLButtonElement>('[data-action="toggle-reader-bookmarks"]');
  const readerBookmarkSearch = root.querySelector<HTMLElement>('[data-reader-bookmark-search]');
  const bookmarkSearchInputs = [...root.querySelectorAll<HTMLInputElement>('[data-bookmark-search]')];
  const bookmarkSearchStatuses = [...root.querySelectorAll<HTMLElement>('[data-bookmark-search-status]')];
  const noteSectionList = get<HTMLElement>('[data-note-section-list]');
  const noteModal = get<HTMLDialogElement>('[data-note-modal]');
  const noteForm = get<HTMLFormElement>('[data-note-form]');
  const noteReference = get<HTMLElement>('[data-note-ref]');
  const noteVerse = get<HTMLElement>('[data-note-verse]');
  const noteText = get<HTMLTextAreaElement>('[data-note-text]');
  const noteStatus = get<HTMLElement>('[data-note-status]');
  const deleteNoteButton = get<HTMLButtonElement>('[data-action="delete-note"]');
  const directory = get<HTMLElement>('[data-bible-directory]');
  const loginModal = get<HTMLDialogElement>('[data-login-modal]');
  const loginForm = get<HTMLFormElement>('[data-login-form]');
  const verifyField = get<HTMLElement>('[data-verify-field]');
  const loginStatus = get<HTMLElement>('[data-login-status]');
  const cloudLoginButton = root.querySelector<HTMLButtonElement>('[data-action="cloud-login"]');
  const loginAccount = root.querySelector<HTMLElement>('[data-login-account]');
  const toast = get<HTMLElement>('[data-bible-toast]');
  const groupGuide = root.querySelector<HTMLElement>('[data-group-guide]');
  const dailySteps = [...root.querySelectorAll<HTMLInputElement>('[data-daily-step]')];
  const dailyProgress = root.querySelector<HTMLElement>('[data-daily-progress]');
  const readingProgress = root.querySelector<HTMLElement>('[data-reading-progress]');

  const params = new URLSearchParams(window.location.search);
  const requestedBook = params.get('book') || 'gen';
  const requestedChapter = Number(params.get('chapter') || '1');
  const fallbackBook = data.books.some((book) => book.slug === requestedBook) ? requestedBook : 'gen';
  const fallbackChapter = Number.isFinite(requestedChapter) && requestedChapter > 0 ? requestedChapter : 1;
  const fallbackState: ReaderState = {
    lastRead: { book: fallbackBook, chapter: fallbackChapter, verse: Number(params.get('verse') || '') || undefined, updatedAt: nowIso() },
    bookmarks: [],
    notes: [],
    updatedAt: nowIso()
  };

  let currentFeature = 0;
  let selectedTestament: '旧约' | '新约' = data.books.find((book) => book.slug === fallbackBook)?.testament ?? '旧约';
  let viewMode: 'grid' | 'list' = 'grid';
  let currentBook = fallbackBook;
  let currentChapter = fallbackChapter;
  let state = readLocalState(fallbackState);
  let readVerses = readReadVerses();
  let session: CloudSession | null = null;
  let verifySignUp: ((verificationCode: string) => Promise<CloudSession>) | null = null;
  let toastTimer: number | undefined;
  let syncTimer: number | undefined;
  let fullTextStatus: 'loading' | 'ready' | 'failed' = data.fullTextUrl ? 'loading' : 'ready';
  let activeNoteTarget: { book: string; chapter: number; verse: number; verseText: string } | null = null;

  const renderLoginState = (nextSession: CloudSession | null) => {
    loginStatus.textContent = nextSession ? `已登录：${nextSession.account}` : '未登录时会先保存到本机浏览器。';
    if (cloudLoginButton) cloudLoginButton.textContent = nextSession ? '已登录同步' : '登录同步';
    if (loginAccount) {
      loginAccount.hidden = !nextSession;
      loginAccount.textContent = nextSession?.account ?? '';
      loginAccount.title = nextSession?.account ?? '';
    }
  };

  const rememberedSession = getRememberedSession();
  if (rememberedSession) {
    session = rememberedSession;
    renderLoginState(session);
  }

  window.addEventListener('site-auth-change', (event) => {
    session = event instanceof CustomEvent ? event.detail as CloudSession | null : null;
    renderLoginState(session);
  });

  if (!params.get('book') && state.lastRead.book) {
    currentBook = state.lastRead.book;
    currentChapter = state.lastRead.chapter;
    selectedTestament = data.books.find((book) => book.slug === currentBook)?.testament ?? selectedTestament;
  }

  const bookBySlug = (slug: string) => data.books.find((book) => book.slug === slug);
  const currentBookInfo = () => bookBySlug(currentBook) ?? data.books[0];
  const currentSample = () => data.samples[chapterKey(currentBook, currentChapter)];
  const countTextChars = (text: string) => Array.from(text.replace(/\s+/g, '')).length;
  let verseCharCounts = new Map<string, number>();

  const indexReadingProgress = () => {
    verseCharCounts = new Map();
    Object.values(data.samples).forEach((sample) => {
      sample.verses.forEach((text, index) => {
        verseCharCounts.set(verseKey(sample.book, sample.chapter, index + 1), countTextChars(text));
      });
    });
  };

  const sampleFromFullText = (key: string, verses: string[]): ChapterSample | null => {
    const [book, chapterText] = key.split('-');
    const chapter = Number(chapterText);
    const bookInfo = bookBySlug(book);
    if (!bookInfo || !Number.isFinite(chapter) || chapter < 1 || !Array.isArray(verses)) return null;
    return {
      book,
      chapter,
      title: `${bookInfo.title} ${chapter}`,
      verses: verses.filter((text): text is string => typeof text === 'string' && Boolean(text.trim()))
    };
  };

  const loadFullBibleText = async () => {
    if (!data.fullTextUrl) return;
    try {
      const response = await fetch(data.fullTextUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json() as BibleTextPayload;
      const samples = Object.entries(payload.chapters ?? {}).reduce<Record<string, ChapterSample>>((nextSamples, [key, verses]) => {
        const sample = sampleFromFullText(key, verses);
        if (sample) nextSamples[key] = sample;
        return nextSamples;
      }, {});
      if (!Object.keys(samples).length) throw new Error('empty bible text payload');

      data.samples = { ...data.samples, ...samples };
      fullTextStatus = 'ready';
      const label = payload.version?.label ?? data.versionLabel ?? '和合本';
      data.versionLabel = label;
      indexReadingProgress();
      searchStatus.textContent = `已载入${label}全文：${Object.keys(samples).length}章。`;
      renderAll(Number(new URLSearchParams(window.location.search).get('verse') || '') || undefined);
    } catch {
      fullTextStatus = 'failed';
      searchStatus.textContent = '全文数据加载失败，当前只显示已内置示例章节。';
      renderAll(Number(new URLSearchParams(window.location.search).get('verse') || '') || undefined);
    }
  };

  const notify = (message: string) => {
    toast.textContent = message;
    toast.hidden = false;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.hidden = true;
    }, 2600);
  };

  const persist = (message?: string) => {
    state.updatedAt = nowIso();
    writeLocalState(state);
    if (message) notify(message);
    if (session) {
      window.clearTimeout(syncTimer);
      syncTimer = window.setTimeout(() => {
        syncCloudState().catch(() => notify('云端同步暂不可用，已保存在本机浏览器。'));
      }, 450);
    }
  };

  const setFeature = (index: number) => {
    const normalized = (index + data.features.length) % data.features.length;
    const page = data.features[normalized];
    currentFeature = normalized;
    featureBook.classList.remove('is-turning');
    void featureBook.offsetWidth;
    featureBook.classList.add('is-turning');
    featureTitle.textContent = page.title;
    featureEyebrow.textContent = page.eyebrow;
    featureQuote.textContent = page.quote;
    featureReference.textContent = page.reference;
    featureSummary.textContent = page.summary;
    featureAction.textContent = page.action;
    featureAction.href = page.href;
    featureImage.src = page.image;
    featureStatus.textContent = page.status;
    featureArt.dataset.artId = page.id;
    featureArt.style.setProperty('--art-a', page.artA);
    featureArt.style.setProperty('--art-b', page.artB);
    featureArt.style.setProperty('--art-c', page.artC);
    featureCount.textContent = `${normalized + 1} / ${data.features.length}`;
    featureNav.forEach((button) => button.classList.toggle('is-active', Number(button.dataset.featureTarget) === normalized));
  };

  const renderBooks = () => {
    const books = data.books.filter((book) => book.testament === selectedTestament);
    bookList.classList.toggle('is-grid', viewMode === 'grid');
    bookList.classList.toggle('is-list', viewMode === 'list');
    bookList.innerHTML = books.map((book) => `
      <button type="button" class="${book.slug === currentBook ? 'is-active' : ''}" data-book="${book.slug}">
        <strong>${escapeHtml(book.shortName)}</strong>
        <span>${escapeHtml(book.title)}</span>
      </button>
    `).join('');
  };

  const renderChapters = () => {
    const book = currentBookInfo();
    chapterList.innerHTML = Array.from({ length: book.chapters }, (_, index) => {
      const chapter = index + 1;
      return `<button type="button" class="${chapter === currentChapter ? 'is-active' : ''}" data-chapter="${chapter}" aria-label="${escapeHtml(book.title)} ${chapter}章">${chapter}</button>`;
    }).join('');
  };

  const updateUrl = (verse?: number) => {
    const next = new URL(window.location.href);
    next.searchParams.set('book', currentBook);
    next.searchParams.set('chapter', String(currentChapter));
    if (verse) next.searchParams.set('verse', String(verse));
    else next.searchParams.delete('verse');
    window.history.replaceState({}, '', next);
  };

  const setLastRead = (verse?: number) => {
    state.lastRead = { book: currentBook, chapter: currentChapter, verse, updatedAt: nowIso() };
    lastRead.textContent = `${currentBookInfo().title} ${currentChapter}章${verse ? ` ${verse}节` : ''}`;
    persist();
  };

  const isBookmarked = (book: string, chapter: number, verse: number) =>
    state.bookmarks.some((item) => item.book === book && item.chapter === chapter && item.verse === verse);

  const isReadVerse = (book: string, chapter: number, verse: number) =>
    readVerses.has(verseKey(book, chapter, verse));

  const getProgressSummary = (book?: string, chapter?: number): ReadingProgressSummary => {
    return Object.values(data.samples).reduce<ReadingProgressSummary>((summary, sample) => {
      if (book && sample.book !== book) return summary;
      if (chapter && sample.chapter !== chapter) return summary;

      sample.verses.forEach((text, index) => {
        const verse = index + 1;
        const key = verseKey(sample.book, sample.chapter, verse);
        const chars = verseCharCounts.get(key) ?? countTextChars(text);
        summary.total += chars;
        if (readVerses.has(key)) summary.read += chars;
      });
      return summary;
    }, { read: 0, total: 0 });
  };

  const formatPercent = ({ read, total }: ReadingProgressSummary) => {
    if (!total) return '0%';
    const value = (read / total) * 100;
    const digits = value > 0 && value < 1 ? 2 : 1;
    return `${value.toFixed(digits)}%`;
  };

  const progressWidth = ({ read, total }: ReadingProgressSummary) =>
    total ? Math.min(100, Math.max(0, (read / total) * 100)).toFixed(2) : '0';

  const formatCharCount = (count: number) => count.toLocaleString('zh-CN');

  const renderProgressItem = (label: string, summary: ReadingProgressSummary) => {
    const detail = summary.total
      ? `已读 ${formatCharCount(summary.read)} / ${formatCharCount(summary.total)} 字`
      : '正文尚未载入';
    return `
      <div class="bible-reading-progress-item">
        <dt><span>${escapeHtml(label)}</span><strong>${formatPercent(summary)}</strong></dt>
        <dd>
          <span class="bible-reading-progress-bar" aria-hidden="true"><span style="width: ${progressWidth(summary)}%"></span></span>
          <small>${detail}</small>
        </dd>
      </div>
    `;
  };

  const renderReadingProgress = () => {
    if (!readingProgress) return;
    const book = currentBookInfo();
    const note = fullTextStatus === 'loading'
      ? '全文载入中，暂按已载入章节统计。'
      : fullTextStatus === 'failed'
        ? '全文载入失败，当前仅按已载入章节统计。'
        : `按${data.versionLabel ?? '当前经文'}字数统计。`;

    readingProgress.innerHTML = `
      <dl class="bible-reading-progress-list">
        ${renderProgressItem('总进度', getProgressSummary())}
        ${renderProgressItem(`${book.title}进度`, getProgressSummary(currentBook))}
        ${renderProgressItem(`${currentChapter}章进度`, getProgressSummary(currentBook, currentChapter))}
      </dl>
      <p class="bible-reading-progress-note">${escapeHtml(note)}</p>
    `;
  };

  const noteForVerse = (book: string, chapter: number, verse: number) =>
    state.notes.find((item) => item.book === book && item.chapter === chapter && item.verse === verse);

  const normalizeBookmarkSearch = (value: string) =>
    value.trim().toLocaleLowerCase().replace(/\s+/g, '').replace(/[－—–]/g, '-');

  const compactBookmarkSearch = (value: string) => normalizeBookmarkSearch(value).replace(/[-_./:：,，章节目]/g, '');

  const getBookmarkSearchKeyword = () => bookmarkSearchInputs.find((input) => input.value.trim())?.value.trim() ?? '';

  const setBookmarkSearchStatus = (message: string) => {
    bookmarkSearchStatuses.forEach((status) => {
      status.textContent = message;
    });
  };

  const bookmarkMatchesSearch = (item: Bookmark, keyword: string) => {
    const book = bookBySlug(item.book);
    const normalized = normalizeBookmarkSearch(keyword);
    const compact = compactBookmarkSearch(keyword);
    if (!normalized) return true;

    const candidates = [
      item.text,
      item.book,
      `${item.book}-${item.chapter}-${item.verse}`,
      `${item.book}${item.chapter}:${item.verse}`,
      `${item.chapter}:${item.verse}`,
      `${item.chapter}章${item.verse}节`,
      book?.title ?? '',
      book?.shortName ?? '',
      `${book?.title ?? item.book}-${item.chapter}-${item.verse}`,
      `${book?.shortName ?? item.book}-${item.chapter}-${item.verse}`,
      `${book?.title ?? item.book}${item.chapter}:${item.verse}`,
      `${book?.shortName ?? item.book}${item.chapter}:${item.verse}`
    ];
    const haystack = candidates.map(normalizeBookmarkSearch).join(' ');
    const compactHaystack = candidates.map(compactBookmarkSearch).join(' ');
    return haystack.includes(normalized) || compactHaystack.includes(compact);
  };

  const renderVerses = (targetVerse?: number) => {
    const sample = currentSample();
    const book = currentBookInfo();
    currentTitle.textContent = `${book.title} ${currentChapter}`;
    updateUrl(targetVerse);

    if (!sample) {
      const message = fullTextStatus === 'loading'
        ? '正在载入和合本全文，稍后会自动显示本章。'
        : '本章全文暂未可用；请检查经文数据文件是否加载成功。';
      verseList.innerHTML = `
        <div class="bible-placeholder">
          <div>
            <strong>${escapeHtml(book.title)} ${currentChapter}章</strong>
            <p>${message}</p>
          </div>
        </div>
      `;
      setLastRead();
      return;
    }

    verseList.innerHTML = sample.verses.map((text, index) => {
      const verse = index + 1;
      const key = verseKey(sample.book, sample.chapter, verse);
      const active = targetVerse === verse ? ' is-target' : '';
      const read = isReadVerse(sample.book, sample.chapter, verse);
      const noted = Boolean(noteForVerse(sample.book, sample.chapter, verse));
      const translationUrl = bibleComTcvChapterUrl(sample.book, sample.chapter);
      return `
        <section class="bible-verse${active}${read ? ' is-read' : ''}${noted ? ' has-note' : ''}" id="${key}" data-verse="${verse}" title="双击添加或编辑笔记">
          <div class="bible-verse-main">
            <span class="bible-verse-number">${verse}</span>
            <p class="bible-verse-text">${escapeHtml(text)}</p>
          </div>
          <div class="bible-verse-actions" data-verse-actions="${verse}">
            <button type="button" data-action="toggle-bookmark" data-verse="${verse}" title="${isBookmarked(sample.book, sample.chapter, verse) ? '取消收藏' : '收藏'}" aria-label="${isBookmarked(sample.book, sample.chapter, verse) ? '取消收藏' : '收藏'}">${isBookmarked(sample.book, sample.chapter, verse) ? '★' : '☆'}</button>
            <button class="bible-verse-read-action" type="button" data-action="toggle-read-verse" data-verse="${verse}" title="标记阅读" aria-label="切换本节阅读状态" aria-pressed="${read}">✓</button>
            <a class="bible-verse-translation-link" href="${escapeHtml(translationUrl)}" target="_blank" rel="noopener noreferrer" title="打开 TCV2019T 参考译文" aria-label="打开 TCV2019T 参考译文">译</a>
          </div>
        </section>
      `;
    }).join('');

    if (targetVerse) {
      window.setTimeout(() => root.querySelector(`#${CSS.escape(verseKey(currentBook, currentChapter, targetVerse))}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 80);
      setLastRead(targetVerse);
    } else {
      setLastRead();
    }
  };

  const renderBookmarks = () => {
    const keyword = getBookmarkSearchKeyword();
    let html = '<p>还没有收藏经文。</p>';
    if (!state.bookmarks.length) {
      bookmarkList.innerHTML = html;
      if (bookmarkSectionList) bookmarkSectionList.innerHTML = '<p>还没有收藏经文。进入微读圣经后点击经文右侧星标。</p>';
      setBookmarkSearchStatus('还没有收藏经文。');
      return;
    }
    const visibleBookmarks = state.bookmarks.filter((item) => bookmarkMatchesSearch(item, keyword));
    if (!visibleBookmarks.length) {
      html = '<p>没有找到匹配的收藏经文。</p>';
      bookmarkList.innerHTML = html;
      if (bookmarkSectionList) bookmarkSectionList.innerHTML = html;
      setBookmarkSearchStatus(`没有找到“${keyword}”。`);
      return;
    }

    const grouped = new Map<string, Bookmark[]>();
    visibleBookmarks
      .slice()
      .sort((first, second) => {
        const firstBook = data.books.findIndex((book) => book.slug === first.book);
        const secondBook = data.books.findIndex((book) => book.slug === second.book);
        return firstBook - secondBook || first.chapter - second.chapter || first.verse - second.verse;
      })
      .forEach((item) => {
        const key = `${item.book}-${item.chapter}`;
        grouped.set(key, [...(grouped.get(key) ?? []), item]);
      });

    html = [...grouped.entries()].map(([key, items]) => {
      const first = items[0];
      const book = bookBySlug(first.book);
      const itemsHtml = items.map((item) => `
        <button type="button" data-goto-book="${item.book}" data-goto-chapter="${item.chapter}" data-goto-verse="${item.verse}">
          <strong>${escapeHtml(book?.title ?? item.book)} ${item.chapter}:${item.verse}</strong><br>
          ${escapeHtml(item.text)}
        </button>
      `).join('');
      return `
        <section class="bible-bookmark-group" data-bookmark-group="${escapeHtml(key)}">
          <h4>${escapeHtml(book?.title ?? first.book)} ${first.chapter}章</h4>
          ${itemsHtml}
        </section>
      `;
    }).join('');

    bookmarkList.innerHTML = html;
    if (bookmarkSectionList) bookmarkSectionList.innerHTML = html;
    setBookmarkSearchStatus(keyword ? `找到 ${visibleBookmarks.length} 条收藏。` : `共 ${state.bookmarks.length} 条收藏。`);
  };

  const sortedNotes = () => state.notes
    .slice()
    .sort((first, second) => {
      const firstBook = data.books.findIndex((book) => book.slug === first.book);
      const secondBook = data.books.findIndex((book) => book.slug === second.book);
      return firstBook - secondBook || first.chapter - second.chapter || first.verse - second.verse;
    });

  const renderNotes = () => {
    if (!state.notes.length) {
      noteSectionList.innerHTML = '<p>还没有笔记。</p>';
      return;
    }

    const grouped = new Map<string, Note[]>();
    sortedNotes().forEach((item) => {
      const key = `${item.book}-${item.chapter}`;
      grouped.set(key, [...(grouped.get(key) ?? []), item]);
    });

    noteSectionList.innerHTML = [...grouped.entries()].map(([key, items]) => {
      const first = items[0];
      const book = bookBySlug(first.book);
      const itemsHtml = items.map((item) => `
        <button type="button" data-action="open-note" data-note-book="${item.book}" data-note-chapter="${item.chapter}" data-note-verse="${item.verse}">
          <strong>${escapeHtml(book?.title ?? item.book)} ${item.chapter}:${item.verse}</strong>
          <span>${escapeHtml(item.text)}</span>
        </button>
      `).join('');
      return `
        <section class="bible-bookmark-group" data-note-group="${escapeHtml(key)}">
          <h4>${escapeHtml(book?.title ?? first.book)} ${first.chapter}章</h4>
          ${itemsHtml}
        </section>
      `;
    }).join('');
  };

  const toggleReaderBookmarks = () => {
    if (!readerBookmarkToggle) return;
    const expanded = readerBookmarkToggle.getAttribute('aria-expanded') === 'true';
    readerBookmarkToggle.setAttribute('aria-expanded', String(!expanded));
    if (readerBookmarkSearch) readerBookmarkSearch.hidden = expanded;
    bookmarkList.hidden = expanded;
  };

  const readDailyPlan = () => {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(DAILY_PLAN_KEY) || '[]');
      return Array.isArray(parsed) ? parsed.map(Boolean) : [];
    } catch {
      return [];
    }
  };

  const writeDailyPlan = () => {
    const values = dailySteps.map((input) => input.checked);
    try {
      window.localStorage.setItem(DAILY_PLAN_KEY, JSON.stringify(values));
    } catch {
      notify('读经计划进度暂时无法保存。');
    }
  };

  const renderDailyPlan = () => {
    const values = readDailyPlan();
    dailySteps.forEach((input, index) => {
      input.checked = Boolean(values[index]);
      input.closest('.bible-daily-item')?.classList.toggle('is-done', input.checked);
    });
    if (dailyProgress) {
      const completed = dailySteps.filter((input) => input.checked).length;
      dailyProgress.textContent = `${completed} / ${dailySteps.length}`;
    }
  };

  const renderAll = (targetVerse?: number) => {
    selectedTestament = currentBookInfo().testament;
    renderBooks();
    renderChapters();
    renderVerses(targetVerse);
    renderReadingProgress();
    renderBookmarks();
    renderNotes();
  };

  const gotoReference = (book: string, chapter: number, verse?: number) => {
    const nextBook = bookBySlug(book);
    if (!nextBook) return;
    currentBook = book;
    currentChapter = Math.min(Math.max(chapter, 1), nextBook.chapters);
    selectedTestament = nextBook.testament;
    searchResults.hidden = true;
    directory.classList.remove('is-open');
    renderAll(verse);
  };

  const aliases = data.books
    .flatMap((book) => [
      { alias: book.title, priority: 1 },
      { alias: book.shortName, priority: 2 },
      { alias: book.slug, priority: 3 },
      { alias: book.title.slice(0, 2), priority: 4 },
      { alias: book.title.slice(0, 1), priority: 5 }
    ].map((item) => ({ alias: item.alias.toLocaleLowerCase(), book: book.slug, priority: item.priority })))
    .filter((item, index, list) => item.alias && list.findIndex((next) => next.alias === item.alias && next.book === item.book) === index)
    .sort((first, second) => second.alias.length - first.alias.length || first.priority - second.priority);

  const parseReference = (raw: string) => {
    const value = raw.trim().toLocaleLowerCase().replace(/\s+/g, '').replace(/[－—–]/g, '-').replace(/^第/, '');
    if (!value) return null;
    for (const item of aliases) {
      if (!value.startsWith(item.alias)) continue;
      const rest = value.slice(item.alias.length).replace(/^[-_./:：,，]+/, '').replace(/^第/, '');
      const match = rest.match(/^(\d+)(?:章)?(?:[-_./:：,，]+|第)?(\d+)?(?:节)?/);
      if (!match) continue;
      return { book: item.book, chapter: Number(match[1]), verse: match[2] ? Number(match[2]) : undefined };
    }
    return null;
  };

  const runSearch = () => {
    const keyword = searchInput.value.trim();
    searchResults.innerHTML = '';
    if (!keyword) {
      searchResults.hidden = true;
      searchStatus.textContent = '可搜关键词，也可输入创-1-2、创世-1-2、约3:16。';
      return;
    }

    const reference = parseReference(keyword);
    if (reference) {
      const hasChapter = Boolean(data.samples[chapterKey(reference.book, reference.chapter)]);
      searchStatus.textContent = hasChapter ? '已定位经文引用。' : '引用已识别，但该章正文暂未导入。';
      gotoReference(reference.book, reference.chapter, reference.verse);
      return;
    }

    const normalized = keyword.toLocaleLowerCase();
    const matches = Object.values(data.samples).flatMap((sample) => sample.verses
      .map((text, index) => ({ sample, text, verse: index + 1 }))
      .filter((item) => item.text.toLocaleLowerCase().includes(normalized)));

    searchStatus.textContent = `找到 ${matches.length} 条经文结果。`;
    searchResults.hidden = false;
    searchResults.innerHTML = matches.length ? matches.map((item) => {
      const book = bookBySlug(item.sample.book);
      return `
        <button type="button" data-goto-book="${item.sample.book}" data-goto-chapter="${item.sample.chapter}" data-goto-verse="${item.verse}">
          <strong>${escapeHtml(book?.title ?? item.sample.book)} ${item.sample.chapter}:${item.verse}</strong>
          <span>${escapeHtml(item.text)}</span>
        </button>
      `;
    }).join('') : '<p>当前收录经文中没有找到匹配内容。</p>';
  };

  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) {
      notify('当前浏览器不支持语音朗读。');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN';
    utterance.rate = 0.92;
    window.speechSynthesis.speak(utterance);
  };

  const toggleBookmark = (verse: number) => {
    const sample = currentSample();
    if (!sample) return;
    const existing = state.bookmarks.find((item) => item.book === sample.book && item.chapter === sample.chapter && item.verse === verse);
    if (existing) {
      state.bookmarks = state.bookmarks.filter((item) => item.id !== existing.id);
      persist('已取消收藏。');
    } else {
      const time = nowIso();
      state.bookmarks = [{
        id: createId(),
        book: sample.book,
        chapter: sample.chapter,
        verse,
        text: sample.verses[verse - 1],
        createdAt: time,
        updatedAt: time
      }, ...state.bookmarks];
      persist('经文已收藏。');
    }
    renderAll(verse);
  };

  const toggleReadVerse = (verse: number, trigger: HTMLElement) => {
    const key = verseKey(currentBook, currentChapter, verse);
    const verseElement = root.querySelector<HTMLElement>(`#${CSS.escape(key)}`);
    const nextRead = !readVerses.has(key);

    if (nextRead) readVerses.add(key);
    else readVerses.delete(key);

    writeReadVerses(readVerses);
    verseElement?.classList.toggle('is-read', nextRead);
    trigger.setAttribute('aria-pressed', String(nextRead));
    renderReadingProgress();
  };

  const openNoteEditor = (book: string, chapter: number, verse: number) => {
    const bookInfo = bookBySlug(book);
    const sample = data.samples[chapterKey(book, chapter)];
    const verseText = sample?.verses[verse - 1] ?? '';
    if (!bookInfo || !verseText) {
      notify('本节经文尚未载入，暂时不能添加笔记。');
      return;
    }

    const existing = noteForVerse(book, chapter, verse);
    activeNoteTarget = { book, chapter, verse, verseText };
    noteReference.textContent = `${bookInfo.title} ${chapter}:${verse}`;
    noteVerse.textContent = verseText;
    noteText.value = existing?.text ?? '';
    noteStatus.textContent = existing ? '正在编辑已保存的笔记。' : '笔记会先保存在本机浏览器。';
    deleteNoteButton.hidden = !existing;
    noteModal.showModal();
    window.setTimeout(() => noteText.focus(), 60);
  };

  const saveActiveNote = () => {
    if (!activeNoteTarget) return;
    const text = noteText.value.trim();
    if (!text) {
      noteStatus.textContent = '请输入笔记内容。';
      return;
    }

    const existing = noteForVerse(activeNoteTarget.book, activeNoteTarget.chapter, activeNoteTarget.verse);
    const time = nowIso();
    if (existing) {
      state.notes = state.notes.map((item) => item.id === existing.id ? { ...item, text, updatedAt: time } : item);
    } else {
      state.notes = [{
        id: createId(),
        book: activeNoteTarget.book,
        chapter: activeNoteTarget.chapter,
        verse: activeNoteTarget.verse,
        text,
        createdAt: time,
        updatedAt: time
      }, ...state.notes];
    }

    persist('笔记已保存。');
    noteModal.close();
    renderAll(activeNoteTarget.verse);
  };

  const deleteActiveNote = () => {
    if (!activeNoteTarget) return;
    const existing = noteForVerse(activeNoteTarget.book, activeNoteTarget.chapter, activeNoteTarget.verse);
    if (!existing) {
      noteModal.close();
      return;
    }

    state.notes = state.notes.filter((item) => item.id !== existing.id);
    persist('笔记已删除。');
    noteModal.close();
    renderAll(activeNoteTarget.verse);
  };

  const loadCloudState = async (ownerId: string): Promise<ReaderState | null> => {
    const db = getCloudDb();
    const result = await db.collection(COLLECTION).where({ ownerId }).get();
    const item = result?.data?.[0];
    if (!item?.lastRead) return null;
    return {
      lastRead: item.lastRead,
      bookmarks: Array.isArray(item.bookmarks) ? item.bookmarks : [],
      notes: Array.isArray(item.notes) ? item.notes : [],
      updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : nowIso()
    };
  };

  const syncCloudState = async () => {
    if (!session) return;
    const db = getCloudDb();
    const payload = { ...state, ownerId: session.uid };
    const result = await db.collection(COLLECTION).where({ ownerId: session.uid }).get();
    const existing = result?.data?.[0];
    if (existing?._id) await db.collection(COLLECTION).doc(existing._id).set(payload);
    else await db.collection(COLLECTION).add(payload);
  };

  const finishLogin = async (nextSession: CloudSession) => {
    session = nextSession;
    renderLoginState(session);
    const cloudState = await loadCloudState(session.uid);
    if (cloudState) state = mergeState(state, cloudState);
    persist('已登录并同步阅读数据。');
    await syncCloudState();
    renderAll(state.lastRead.verse);
    if (loginModal.open) loginModal.close();
  };

  const startSignUp = async () => {
    const form = new FormData(loginForm);
    const email = String(form.get('email') || '').trim();
    const password = String(form.get('password') || '');
    if (!email || !password) {
      loginStatus.textContent = '请先填写邮箱和密码。';
      return;
    }
    try {
      verifySignUp = await startEmailSignUp(email, password);
      verifyField.hidden = false;
      loginStatus.textContent = '验证码已发送，请输入验证码后点击登录。';
    } catch (error) {
      loginStatus.textContent = error instanceof Error ? error.message : '注册失败，请稍后重试。';
    }
  };

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(loginForm);
    const email = String(form.get('email') || '').trim();
    const password = String(form.get('password') || '');
    const verificationCode = String(form.get('verificationCode') || '').trim();
    try {
      if (verifySignUp) {
        if (!verificationCode) {
          loginStatus.textContent = '请输入邮箱验证码。';
          return;
        }
        await finishLogin(await verifySignUp(verificationCode));
        verifySignUp = null;
        return;
      }
      await finishLogin(await signInWithPassword(email, password));
    } catch (error) {
      loginStatus.textContent = error instanceof Error ? error.message : '登录失败，请检查邮箱和密码。';
    }
  });

  noteForm.addEventListener('submit', (event) => {
    event.preventDefault();
    saveActiveNote();
  });

  verseList.addEventListener('dblclick', (event) => {
    const target = event.target;
    if (!(target instanceof Element) || target.closest('.bible-verse-actions')) return;
    const verseElement = target.closest<HTMLElement>('.bible-verse[data-verse]');
    const verse = Number(verseElement?.dataset.verse || '');
    if (verse) openNoteEditor(currentBook, currentChapter, verse);
  });

  root.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const trigger = target.closest<HTMLElement>('[data-feature-target], [data-feature-prev], [data-feature-next], [data-book], [data-chapter], [data-testament], [data-view-mode], [data-action], [data-goto-book]');
    if (!trigger) return;

    if (trigger.dataset.featureTarget) setFeature(Number(trigger.dataset.featureTarget));
    if (trigger.hasAttribute('data-feature-prev')) setFeature(currentFeature - 1);
    if (trigger.hasAttribute('data-feature-next')) setFeature(currentFeature + 1);
    if (trigger.dataset.testament === '旧约' || trigger.dataset.testament === '新约') {
      selectedTestament = trigger.dataset.testament;
      root.querySelectorAll('[data-testament]').forEach((button) => button.classList.toggle('is-active', button === trigger));
      renderBooks();
    }
    if (trigger.dataset.viewMode === 'grid' || trigger.dataset.viewMode === 'list') {
      viewMode = trigger.dataset.viewMode;
      root.querySelectorAll('[data-view-mode]').forEach((button) => button.classList.toggle('is-active', button === trigger));
      renderBooks();
    }
    if (trigger.dataset.book) {
      const nextBook = bookBySlug(trigger.dataset.book);
      if (nextBook) {
        currentBook = nextBook.slug;
        currentChapter = 1;
        selectedTestament = nextBook.testament;
        directory.classList.remove('is-open');
        renderAll();
      }
    }
    if (trigger.dataset.chapter) {
      currentChapter = Number(trigger.dataset.chapter);
      renderAll();
    }
    if (trigger.dataset.gotoBook && trigger.dataset.gotoChapter) {
      gotoReference(trigger.dataset.gotoBook, Number(trigger.dataset.gotoChapter), Number(trigger.dataset.gotoVerse || '') || undefined);
    }
    if (trigger.dataset.action === 'open-note' && trigger.dataset.noteBook && trigger.dataset.noteChapter && trigger.dataset.noteVerse) {
      const noteBook = trigger.dataset.noteBook;
      const noteChapter = Number(trigger.dataset.noteChapter);
      const noteVerseNumber = Number(trigger.dataset.noteVerse);
      gotoReference(noteBook, noteChapter, noteVerseNumber);
      window.setTimeout(() => openNoteEditor(noteBook, noteChapter, noteVerseNumber), 120);
    }
    if (trigger.dataset.action === 'toggle-directory') directory.classList.toggle('is-open');
    if (trigger.dataset.action === 'toggle-reader-bookmarks') toggleReaderBookmarks();
    if (trigger.dataset.action === 'cloud-login') {
      const activeSession = session;
      if (activeSession) {
        syncCloudState()
          .then(() => {
            renderLoginState(activeSession);
            notify('已使用当前登录同步阅读数据。');
          })
          .catch(() => {
            loginStatus.textContent = `已登录：${activeSession.account}；云同步暂不可用。`;
          });
      } else {
        loginModal.showModal();
      }
    }
    if (trigger.dataset.action === 'close-login') loginModal.close();
    if (trigger.dataset.action === 'close-note') noteModal.close();
    if (trigger.dataset.action === 'delete-note') deleteActiveNote();
    if (trigger.dataset.action === 'start-signup') startSignUp();
    if (trigger.dataset.action === 'copy-group-guide') {
      const guideText = groupGuide?.innerText.trim();
      if (!guideText || !navigator.clipboard) notify('当前浏览器暂不支持复制。');
      else navigator.clipboard.writeText(guideText).then(() => notify('小组提纲已复制。')).catch(() => notify('复制失败，请手动选择文字。'));
    }
    if (trigger.dataset.action === 'read-chapter') {
      const sample = currentSample();
      if (sample) speak(`${sample.title}。${sample.verses.map((text, index) => `${index + 1}节，${text}`).join('')}`);
      else notify('该章正文暂未导入，无法朗读。');
    }
    const verse = Number(trigger.dataset.verse || '');
    if (verse && trigger.dataset.action === 'toggle-bookmark') toggleBookmark(verse);
    if (verse && trigger.dataset.action === 'toggle-read-verse') toggleReadVerse(verse, trigger);
  });

  searchInput.addEventListener('input', runSearch);
  bookmarkSearchInputs.forEach((input) => {
    input.addEventListener('input', () => {
      bookmarkSearchInputs.forEach((nextInput) => {
        if (nextInput !== input) nextInput.value = input.value;
      });
      renderBookmarks();
    });
  });
  dailySteps.forEach((input) => {
    input.addEventListener('change', () => {
      input.closest('.bible-daily-item')?.classList.toggle('is-done', input.checked);
      writeDailyPlan();
      renderDailyPlan();
    });
  });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') setFeature(currentFeature - 1);
    if (event.key === 'ArrowRight') setFeature(currentFeature + 1);
  });

  getCloudSession()
    .then(async (nextSession) => {
      if (!nextSession) {
        renderLoginState(session);
        return;
      }
      session = nextSession;
      renderLoginState(session);
      const cloudState = await loadCloudState(session.uid);
      if (cloudState) {
        state = mergeState(state, cloudState);
        writeLocalState(state);
        currentBook = state.lastRead.book;
        currentChapter = state.lastRead.chapter;
        renderAll(state.lastRead.verse);
      }
    })
    .catch(() => {
      loginStatus.textContent = session ? `已登录：${session.account}；云同步暂不可用。` : '云同步暂不可用；当前使用本机保存。';
    });

  indexReadingProgress();
  renderDailyPlan();
  renderAll(state.lastRead.verse);
  void loadFullBibleText();
}
