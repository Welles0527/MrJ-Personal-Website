import { cloudErrorMessage, getCloudDb, getCloudSession, signInWithPassword, startEmailSignUp } from './site-auth';
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

type DailyPrayer = {
  theme: string;
  title: string;
  reference: string;
  prayer: string;
};

type BibleData = {
  books: BibleBook[];
  samples: Record<string, ChapterSample>;
  features: FeaturePage[];
  prayers: DailyPrayer[];
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
  readVerses?: string[];
  updatedAt: string;
};

type ReadingProgressSummary = {
  read: number;
  total: number;
};

type RenderOptions = {
  updateLastRead?: boolean;
};

type TranslationPayload = {
  id: string;
  reference: string;
  content: string;
  version: string;
  bibleId: string;
  source?: string;
};

type BookReadingStatus = 'reading' | 'read' | 'none';

type CloudResult<T> = {
  data?: T;
  error?: { message?: string } | null;
};

const STORAGE_KEY = 'mywebsite.bible-reader.v1';
const DAILY_PRAYER_KEY = 'mywebsite.bible-daily-prayer.v1';
const READ_VERSES_KEY = 'mywebsite.bible-read-verses.v1';
const BOOK_STATUS_KEY = 'mywebsite.bible-book-status.v1';
const READING_THEME_KEY = 'mywebsite.bible-reading-theme.v1';
const SPEECH_RATE_KEY = 'mywebsite.bible-speech-rate.v1';
const SPEECH_RATES = [1, 1.2, 1.5, 2, 3];
const COLLECTION = 'officialWebsiteBibleReaderState';

const nowIso = () => new Date().toISOString();
const chapterKey = (book: string, chapter: number) => `${book}-${chapter}`;
const verseKey = (book: string, chapter: number, verse: number) => `${book}-${chapter}-${verse}`;
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
    return true;
  } catch {
    return false;
  }
};

const readBookStatuses = () => {
  try {
    const raw = window.localStorage.getItem(BOOK_STATUS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {} as Record<string, BookReadingStatus>;
    return Object.fromEntries(Object.entries(parsed).filter((item): item is [string, BookReadingStatus] => item[1] === 'reading' || item[1] === 'read' || item[1] === 'none'));
  } catch {
    return {} as Record<string, BookReadingStatus>;
  }
};

const writeBookStatuses = (statuses: Record<string, BookReadingStatus>) => {
  try {
    window.localStorage.setItem(BOOK_STATUS_KEY, JSON.stringify(statuses));
    return true;
  } catch {
    return false;
  }
};

const readReadingTheme = () => {
  try {
    const savedTheme = window.localStorage.getItem(READING_THEME_KEY);
    return savedTheme ? savedTheme === 'dark' : true;
  } catch {
    return true;
  }
};

const writeReadingTheme = (isDark: boolean) => {
  try {
    window.localStorage.setItem(READING_THEME_KEY, isDark ? 'dark' : 'light');
    return true;
  } catch {
    return false;
  }
};

const readSpeechRate = () => {
  try {
    const savedRate = Number(window.localStorage.getItem(SPEECH_RATE_KEY));
    return SPEECH_RATES.includes(savedRate) ? savedRate : 1;
  } catch {
    return 1;
  }
};

const writeSpeechRate = (rate: number) => {
  try {
    window.localStorage.setItem(SPEECH_RATE_KEY, String(rate));
    return true;
  } catch {
    return false;
  }
};

const assertCloudResult = <T>(result: CloudResult<T>, fallback: string) => {
  if (!result) throw new Error(fallback);
  if (result.error) throw new Error(result.error.message || fallback);
  return result.data;
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
  const bookmarkTotal = get<HTMLElement>('[data-bookmark-total]');
  const librarySearchInput = get<HTMLInputElement>('[data-library-search]');
  const librarySearchStatus = get<HTMLElement>('[data-library-search-status]');
  const noteSectionList = get<HTMLElement>('[data-note-section-list]');
  const readerNoteToggle = get<HTMLButtonElement>('[data-action="toggle-reader-notes"]');
  const noteTotal = get<HTMLElement>('[data-note-total]');
  const noteModal = get<HTMLDialogElement>('[data-note-modal]');
  const noteForm = get<HTMLFormElement>('[data-note-form]');
  const noteReference = get<HTMLElement>('[data-note-ref]');
  const noteVerse = get<HTMLElement>('[data-note-verse]');
  const noteText = get<HTMLTextAreaElement>('[data-note-text]');
  const noteStatus = get<HTMLElement>('[data-note-status]');
  const deleteNoteButton = get<HTMLButtonElement>('[data-action="delete-note"]');
  const bookStatusModal = get<HTMLDialogElement>('[data-book-status-modal]');
  const bookStatusTitle = get<HTMLElement>('[data-book-status-title]');
  const bookStatusOptions = [...root.querySelectorAll<HTMLButtonElement>('[data-book-reading-status]')];
  const directory = get<HTMLElement>('[data-bible-directory]');
  const loginModal = get<HTMLDialogElement>('[data-login-modal]');
  const loginForm = get<HTMLFormElement>('[data-login-form]');
  const verifyField = get<HTMLElement>('[data-verify-field]');
  const loginStatus = get<HTMLElement>('[data-login-status]');
  const cloudLoginButton = root.querySelector<HTMLButtonElement>('[data-action="cloud-login"]');
  const readChapterButton = get<HTMLButtonElement>('[data-action="read-chapter"]');
  const replayChapterButton = get<HTMLButtonElement>('[data-action="replay-chapter"]');
  const stopReadingButton = get<HTMLButtonElement>('[data-action="stop-reading"]');
  const speechRateSelect = get<HTMLSelectElement>('[data-speech-rate]');
  const loginAccount = root.querySelector<HTMLElement>('[data-login-account]');
  const readingSyncStatus = root.querySelector<HTMLElement>('[data-reading-sync-status]');
  const toast = get<HTMLElement>('[data-bible-toast]');
  const groupGuide = root.querySelector<HTMLElement>('[data-group-guide]');
  const prayerDate = get<HTMLElement>('[data-prayer-date]');
  const prayerTheme = get<HTMLElement>('[data-prayer-theme]');
  const prayerTitle = get<HTMLElement>('[data-prayer-title]');
  const prayerText = get<HTMLElement>('[data-prayer-text]');
  const prayerReference = get<HTMLElement>('[data-prayer-reference]');
  const prayerCount = get<HTMLElement>('[data-prayer-count]');
  const readingProgress = root.querySelector<HTMLElement>('[data-reading-progress]');
  const readingThemeToggle = root.querySelector<HTMLButtonElement>('[data-action="toggle-reading-theme"]');
  const translationPopover = get<HTMLElement>('[data-bible-translation-popover]');
  const translationReference = get<HTMLElement>('[data-bible-translation-reference]');
  const translationText = get<HTMLElement>('[data-bible-translation-text]');
  const translationSource = get<HTMLElement>('[data-bible-translation-source]');

  const params = new URLSearchParams(window.location.search);
  root.classList.toggle('is-direct-reader', params.has('book'));
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
  let bookStatuses = readBookStatuses();
  let isDarkReading = readReadingTheme();
  let speechRate = readSpeechRate();
  speechRateSelect.value = String(speechRate);
  const expandedBookmarkBooks = new Set<string>();
  const expandedBookmarkGroups = new Set<string>();
  const expandedNoteBooks = new Set<string>();
  const expandedNoteGroups = new Set<string>();
  const setReadingSyncStatus = (message: string, status = 'idle') => {
    if (!readingSyncStatus) return;
    readingSyncStatus.textContent = message;
    readingSyncStatus.dataset.status = status;
  };
  const mergeCloudReadVerses = (cloudState: ReaderState | null) => {
    if (!cloudState?.readVerses?.length) return;
    readVerses = new Set([...readVerses, ...cloudState.readVerses]);
  };
  let session: CloudSession | null = null;
  let automaticCloudSyncEnabled = true;
  let verifySignUp: ((verificationCode: string) => Promise<CloudSession>) | null = null;
  let toastTimer: number | undefined;
  let syncTimer: number | undefined;
  let fullTextStatus: 'loading' | 'ready' | 'failed' = data.fullTextUrl ? 'loading' : 'ready';
  let activeNoteTarget: { book: string; chapter: number; verse: number; verseText: string } | null = null;
  let activeUtterance: SpeechSynthesisUtterance | null = null;
  let activeAudio: HTMLAudioElement | null = null;
  let activeAudioUrl: string | null = null;
  let activeSpeechController: AbortController | null = null;
  let speechRequestToken = 0;
  let lastSpeechText = '';
  let activeBookStatusSlug: string | null = null;
  let pendingBookSlug: string | null = null;
  let bookClickTimer: number | undefined;
  let translationHoverTimer: number | undefined;
  let activeTranslationVerse: HTMLElement | null = null;
  let translationRequestToken = 0;
  let currentPrayerIndex = 0;
  const translationCache = new Map<string, TranslationPayload>();
  const speechAudioCache = new Map<string, Blob>();

  const renderLoginState = (nextSession: CloudSession | null) => {
    loginStatus.textContent = nextSession ? `已登录：${nextSession.account}` : '未登录时会先保存到本机浏览器。';
    if (cloudLoginButton) cloudLoginButton.textContent = nextSession ? '已登录同步' : '登录同步';
    if (loginAccount) {
      loginAccount.hidden = !nextSession;
      loginAccount.textContent = nextSession?.account ?? '';
      loginAccount.title = nextSession?.account ?? '';
    }
  };

  const markCloudSyncUnavailable = (error?: unknown) => {
    automaticCloudSyncEnabled = false;
    const detail = cloudErrorMessage(error, '云端同步失败。');
    setReadingSyncStatus(`${detail} 请重试。`, 'error');
    if (!session) {
      renderLoginState(null);
      return;
    }
    loginStatus.textContent = `已登录：${session.account}；${detail}`;
    if (cloudLoginButton) cloudLoginButton.textContent = '重试同步';
  };

  window.addEventListener('site-auth-change', (event) => {
    session = event instanceof CustomEvent ? event.detail as CloudSession | null : null;
    automaticCloudSyncEnabled = Boolean(session);
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
      renderAll(Number(new URLSearchParams(window.location.search).get('verse') || '') || undefined, { updateLastRead: false });
    } catch {
      fullTextStatus = 'failed';
      searchStatus.textContent = '全文数据加载失败，当前只显示已内置示例章节。';
      renderAll(Number(new URLSearchParams(window.location.search).get('verse') || '') || undefined, { updateLastRead: false });
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

  const cacheSyncedState = () => {
    const stateSaved = writeLocalState(state);
    const versesSaved = writeReadVerses(readVerses);
    const cached = stateSaved && versesSaved;
    setReadingSyncStatus(cached ? '已同步到云端和本地。' : '云端已保存，本地缓存更新失败。', cached ? 'saved' : 'error');
    return cached;
  };

  const persist = (message?: string) => {
    state.updatedAt = nowIso();
    if (!session) {
      writeLocalState(state);
      if (message) notify(message);
      return;
    }
    if (!automaticCloudSyncEnabled) {
      setReadingSyncStatus('云端同步不可用，请重试后再保存。', 'error');
      return;
    }
    window.clearTimeout(syncTimer);
    syncTimer = window.setTimeout(() => {
      syncCloudState()
        .then(() => {
          const cached = cacheSyncedState();
          if (message) notify(cached ? message : '云端已保存，但本地缓存更新失败。');
        })
        .catch(markCloudSyncUnavailable);
    }, 450);
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

  const renderReadingTheme = () => {
    root.classList.toggle('is-dark-reader', isDarkReading);
    if (!readingThemeToggle) return;
    readingThemeToggle.textContent = isDarkReading ? '浅色阅读' : '深色阅读';
    readingThemeToggle.setAttribute('aria-pressed', String(isDarkReading));
    readingThemeToggle.title = isDarkReading ? '切换浅色阅读模式' : '切换深色阅读模式';
  };

  const toggleReadingTheme = () => {
    isDarkReading = !isDarkReading;
    const saved = writeReadingTheme(isDarkReading);
    renderReadingTheme();
    notify(saved ? `${isDarkReading ? '深色' : '浅色'}阅读模式已启用。` : '阅读模式已切换，但当前浏览器无法长期保存。');
  };

  const renderBooks = () => {
    const books = data.books.filter((book) => book.testament === selectedTestament);
    bookList.classList.toggle('is-grid', viewMode === 'grid');
    bookList.classList.toggle('is-list', viewMode === 'list');
    bookList.innerHTML = books.map((book) => {
      const savedStatus = bookStatuses[book.slug];
      const status = savedStatus === 'none' ? undefined : savedStatus;
      const progress = getProgressSummary(book.slug);
      const completed = fullTextStatus === 'ready' && progress.total > 0 && progress.read >= progress.total;
      const effectiveStatus = completed ? 'read' : status;
      const classes = [book.slug === currentBook ? 'is-active' : '', effectiveStatus ? `is-status-${effectiveStatus}` : ''].filter(Boolean).join(' ');
      const statusText = effectiveStatus === 'reading' ? '在读' : effectiveStatus === 'read' ? '已读' : '未设置状态';
      const statusMarker = effectiveStatus === 'reading'
        ? '<span class="bible-book-status-marker bible-book-status-marker-reading" title="在读" aria-label="在读"><img src="/officialwebsite/images/bible-reading-status-icon.png?v=20260714" alt="" aria-hidden="true"></span>'
        : effectiveStatus === 'read'
          ? '<span class="bible-book-status-marker bible-book-status-marker-read" title="已读完" aria-label="已读完">✓</span>'
          : '';
      return `
      <button type="button" class="${classes}" data-book="${book.slug}" title="双击设置阅读状态" aria-label="${escapeHtml(book.title)}，${statusText}，双击设置阅读状态">
        ${statusMarker}
        <strong>${escapeHtml(book.shortName)}</strong>
        <span>${escapeHtml(book.title)}</span>
      </button>
    `;
    }).join('');
  };

  const openBookStatusModal = (bookSlug: string) => {
    const book = bookBySlug(bookSlug);
    if (!book) return;
    activeBookStatusSlug = book.slug;
    bookStatusTitle.textContent = `${book.title}阅读状态`;
    const currentStatus = bookStatuses[book.slug];
    bookStatusOptions.forEach((button) => {
      const selected = button.dataset.bookReadingStatus === currentStatus;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    bookStatusModal.showModal();
  };

  const setBookReadingStatus = (status: BookReadingStatus) => {
    if (!activeBookStatusSlug) return;
    const book = bookBySlug(activeBookStatusSlug);
    if (!book) return;
    bookStatuses = { ...bookStatuses, [book.slug]: status };
    const saved = writeBookStatuses(bookStatuses);
    renderBooks();
    bookStatusModal.close();
    const message = status === 'none'
      ? `${book.title}已取消阅读标记。`
      : `${book.title}已标记为${status === 'reading' ? '在读' : '已读'}。`;
    notify(saved ? message : `${book.title}状态已更新，但当前浏览器无法长期保存。`);
  };

  const selectBook = (bookSlug: string) => {
    const nextBook = bookBySlug(bookSlug);
    if (!nextBook) return;
    const lastPosition = state.lastRead.book === nextBook.slug ? state.lastRead : null;
    stopSpeech(true);
    currentBook = nextBook.slug;
    currentChapter = Math.min(Math.max(lastPosition?.chapter ?? 1, 1), nextBook.chapters);
    selectedTestament = nextBook.testament;
    directory.classList.remove('is-open');
    renderAll(lastPosition?.verse ?? 1);
  };

  const handleBookCardClick = (bookSlug: string) => {
    if (bookClickTimer && pendingBookSlug === bookSlug) {
      window.clearTimeout(bookClickTimer);
      bookClickTimer = undefined;
      pendingBookSlug = null;
      openBookStatusModal(bookSlug);
      return;
    }

    window.clearTimeout(bookClickTimer);
    pendingBookSlug = bookSlug;
    bookClickTimer = window.setTimeout(() => {
      bookClickTimer = undefined;
      pendingBookSlug = null;
      selectBook(bookSlug);
    }, 320);
  };

  const renderChapters = () => {
    const book = currentBookInfo();
    chapterList.innerHTML = Array.from({ length: book.chapters }, (_, index) => {
      const chapter = index + 1;
      const progress = getProgressSummary(book.slug, chapter);
      const complete = progress.total > 0 && progress.read >= progress.total;
      const classes = [chapter === currentChapter ? 'is-active' : '', complete ? 'is-complete' : ''].filter(Boolean).join(' ');
      return `<button type="button" class="${classes}" data-chapter="${chapter}" aria-label="${escapeHtml(book.title)} ${chapter}章${complete ? '，已读完' : ''}">${chapter}</button>`;
    }).join('');
    window.setTimeout(() => {
      const activeChapter = chapterList.querySelector<HTMLButtonElement>('.is-active');
      if (!activeChapter) return;
      const maxScrollLeft = chapterList.scrollWidth - chapterList.clientWidth;
      const chapterLeft = activeChapter.getBoundingClientRect().left - chapterList.getBoundingClientRect().left + chapterList.scrollLeft;
      const centeredLeft = chapterLeft - (chapterList.clientWidth - activeChapter.offsetWidth) / 2;
      chapterList.scrollTo({
        left: Math.min(maxScrollLeft, Math.max(0, centeredLeft)),
        behavior: 'smooth'
      });
    }, 0);
  };

  const updateUrl = (verse?: number) => {
    const next = new URL(window.location.href);
    next.searchParams.set('book', currentBook);
    next.searchParams.set('chapter', String(currentChapter));
    root.classList.add('is-direct-reader');
    if (verse) next.searchParams.set('verse', String(verse));
    else next.searchParams.delete('verse');
    window.history.replaceState({}, '', next);
  };

  const renderLastRead = () => {
    const savedBook = bookBySlug(state.lastRead.book);
    lastRead.textContent = `${savedBook?.title ?? state.lastRead.book} ${state.lastRead.chapter}章${state.lastRead.verse ? ` ${state.lastRead.verse}节` : ''}`;
  };

  const setLastRead = (verse?: number) => {
    state.lastRead = { book: currentBook, chapter: currentChapter, verse, updatedAt: nowIso() };
    renderLastRead();
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

  const updateReadingProgress = () => {
    if (!readingProgress) return;
    const summaries = [
      getProgressSummary(),
      getProgressSummary(currentBook),
      getProgressSummary(currentBook, currentChapter)
    ];
    const items = [...readingProgress.querySelectorAll<HTMLElement>('.bible-reading-progress-item')];
    if (items.length !== summaries.length) {
      renderReadingProgress();
      return;
    }
    items.forEach((item, index) => {
      const summary = summaries[index];
      const percent = item.querySelector<HTMLElement>('dt strong');
      const bar = item.querySelector<HTMLElement>('.bible-reading-progress-bar > span');
      const detail = item.querySelector<HTMLElement>('dd small');
      if (percent) percent.textContent = formatPercent(summary);
      if (bar) bar.style.width = `${progressWidth(summary)}%`;
      if (detail) detail.textContent = summary.total
        ? `已读 ${formatCharCount(summary.read)} / ${formatCharCount(summary.total)} 字`
        : '正文尚未载入';
    });
  };

  const noteForVerse = (book: string, chapter: number, verse: number) =>
    state.notes.find((item) => item.book === book && item.chapter === chapter && item.verse === verse);

  const normalizeLibrarySearch = (value: string) =>
    value.trim().toLocaleLowerCase().replace(/\s+/g, '').replace(/[－—–]/g, '-');

  const compactLibrarySearch = (value: string) => normalizeLibrarySearch(value).replace(/[-_./:：,，章节目]/g, '');

  const getLibrarySearchKeyword = () => librarySearchInput.value.trim();

  const libraryItemMatchesSearch = (item: Bookmark | Note, keyword: string) => {
    const book = bookBySlug(item.book);
    const normalized = normalizeLibrarySearch(keyword);
    const compact = compactLibrarySearch(keyword);
    if (!normalized) return true;

    const verseText = data.samples[chapterKey(item.book, item.chapter)]?.verses[item.verse - 1] ?? '';
    const candidates = [
      item.text,
      verseText,
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
    const haystack = candidates.map(normalizeLibrarySearch).join(' ');
    const compactHaystack = candidates.map(compactLibrarySearch).join(' ');
    return haystack.includes(normalized) || compactHaystack.includes(compact);
  };

  const updateLibrarySearchStatus = () => {
    const keyword = getLibrarySearchKeyword();
    if (!keyword) {
      librarySearchStatus.textContent = '可按卷名、章节、节号、经文或笔记搜索。';
      return;
    }
    const bookmarkMatches = state.bookmarks.filter((item) => libraryItemMatchesSearch(item, keyword)).length;
    const noteMatches = state.notes.filter((item) => libraryItemMatchesSearch(item, keyword)).length;
    librarySearchStatus.textContent = `找到 ${bookmarkMatches} 条收藏、${noteMatches} 条笔记。`;
  };

  const sortedBookmarks = () => state.bookmarks
    .slice()
    .sort((first, second) => {
      const firstBook = data.books.findIndex((book) => book.slug === first.book);
      const secondBook = data.books.findIndex((book) => book.slug === second.book);
      return firstBook - secondBook || first.chapter - second.chapter || first.verse - second.verse;
    });

  const scrollToTargetVerse = (targetVerse: number) => {
    window.setTimeout(() => {
      const target = root.querySelector<HTMLElement>(`#${CSS.escape(verseKey(currentBook, currentChapter, targetVerse))}`);
      if (!target) return;
      const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
      if (window.matchMedia('(max-width: 760px)').matches) {
        target.scrollIntoView({ block: 'center', behavior });
        return;
      }

      const verseBounds = verseList.getBoundingClientRect();
      const targetBounds = target.getBoundingClientRect();
      const visibleTop = Math.max(0, verseBounds.top);
      const visibleBottom = Math.min(window.innerHeight, verseBounds.bottom);
      const visibleCenter = visibleBottom > visibleTop
        ? (visibleTop + visibleBottom) / 2
        : verseBounds.top + Math.min(verseList.clientHeight, window.innerHeight) / 2;
      const targetCenter = (targetBounds.top + targetBounds.bottom) / 2;
      const maxScrollTop = verseList.scrollHeight - verseList.clientHeight;
      const centeredTop = verseList.scrollTop + targetCenter - visibleCenter;
      verseList.scrollTo({
        top: Math.min(maxScrollTop, Math.max(0, centeredTop)),
        behavior
      });
    }, 80);
  };

  const hideTranslationPopover = () => {
    window.clearTimeout(translationHoverTimer);
    translationHoverTimer = undefined;
    translationRequestToken += 1;
    activeTranslationVerse?.classList.remove('is-translation-active');
    activeTranslationVerse = null;
    translationPopover.hidden = true;
  };

  const positionTranslationPopover = (verseElement: HTMLElement) => {
    if (translationPopover.hidden) return;
    const viewportPadding = 12;
    const width = Math.min(430, window.innerWidth - viewportPadding * 2);
    translationPopover.style.width = `${width}px`;
    const verseBounds = verseElement.getBoundingClientRect();
    const popoverHeight = translationPopover.offsetHeight;
    const left = Math.min(
      window.innerWidth - width - viewportPadding,
      Math.max(viewportPadding, verseBounds.left + Math.min(42, Math.max(0, verseBounds.width - width)))
    );
    const below = verseBounds.bottom + 8;
    const top = below + popoverHeight <= window.innerHeight - viewportPadding
      ? below
      : Math.max(viewportPadding, verseBounds.top - popoverHeight - 8);
    translationPopover.style.left = `${left}px`;
    translationPopover.style.top = `${top}px`;
  };

  const translationEndpoint = (book: string, chapter: number, verse: number) => {
    const query = new URLSearchParams({ book: book.toUpperCase(), chapter: String(chapter), verse: String(verse) });
    return `https://www.magicj.cn/api/bible-translation-genesis-test?${query.toString()}`;
  };

  const showTranslationPopover = async (verseElement: HTMLElement) => {
    const verse = Number(verseElement.dataset.verse || '');
    const sample = currentSample();
    if (!verse || !sample) return;

    const book = sample.book;
    const chapter = sample.chapter;
    const key = verseKey(book, chapter, verse);
    const requestToken = ++translationRequestToken;
    activeTranslationVerse?.classList.remove('is-translation-active');
    activeTranslationVerse = verseElement;
    activeTranslationVerse.classList.add('is-translation-active');
    translationReference.textContent = `${sample.title}:${verse}`;
    translationText.textContent = '正在载入译文…';
    translationSource.textContent = 'CCB · Biblica';
    translationPopover.hidden = false;
    positionTranslationPopover(verseElement);

    const cached = translationCache.get(key);
    if (cached) {
      translationReference.textContent = cached.reference || `${sample.title}:${verse}`;
      translationText.textContent = cached.content;
      positionTranslationPopover(verseElement);
      return;
    }

    try {
      const response = await fetch(translationEndpoint(book, chapter, verse), { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json() as TranslationPayload;
      if (!payload?.content?.trim()) throw new Error('empty translation');
      translationCache.set(key, payload);
      if (requestToken !== translationRequestToken || activeTranslationVerse !== verseElement) return;
      translationReference.textContent = payload.reference || `${sample.title}:${verse}`;
      translationText.textContent = payload.content.trim();
      translationSource.textContent = `${payload.version || 'CCB'} · ${payload.source || 'Biblica'}`;
      positionTranslationPopover(verseElement);
    } catch {
      if (requestToken !== translationRequestToken || activeTranslationVerse !== verseElement) return;
      translationText.textContent = '暂时无法载入译文，请稍后重试。';
      translationSource.textContent = 'CCB · Biblica';
      positionTranslationPopover(verseElement);
    }
  };

  const renderVerses = (targetVerse?: number, options: RenderOptions = {}) => {
    hideTranslationPopover();
    const updateLastRead = options.updateLastRead ?? true;
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
      if (updateLastRead) setLastRead(targetVerse);
      else renderLastRead();
      return;
    }

    verseList.innerHTML = sample.verses.map((text, index) => {
      const verse = index + 1;
      const key = verseKey(sample.book, sample.chapter, verse);
      const active = targetVerse === verse ? ' is-target' : '';
      const read = isReadVerse(sample.book, sample.chapter, verse);
      const noted = Boolean(noteForVerse(sample.book, sample.chapter, verse));
      return `
        <section class="bible-verse${active}${read ? ' is-read' : ''}${noted ? ' has-note' : ''}" id="${key}" data-verse="${verse}">
          <div class="bible-verse-main">
            <span class="bible-verse-number">${verse}</span>
            <p class="bible-verse-text">${escapeHtml(text)}</p>
          </div>
          <div class="bible-verse-actions" data-verse-actions="${verse}">
            <button type="button" data-action="toggle-bookmark" data-verse="${verse}" title="${isBookmarked(sample.book, sample.chapter, verse) ? '取消收藏' : '收藏'}" aria-label="${isBookmarked(sample.book, sample.chapter, verse) ? '取消收藏' : '收藏'}">${isBookmarked(sample.book, sample.chapter, verse) ? '★' : '☆'}</button>
            <button class="bible-verse-read-action" type="button" data-action="toggle-read-verse" data-verse="${verse}" title="标记阅读" aria-label="切换本节阅读状态" aria-pressed="${read}">✓</button>
            <button class="bible-verse-translation-link" type="button" data-action="show-translation" data-verse="${verse}" aria-label="查看 CCB 当代译本">译</button>
          </div>
        </section>
      `;
    }).join('');

    if (targetVerse) {
      scrollToTargetVerse(targetVerse);
    }
    if (updateLastRead) setLastRead(targetVerse);
    else renderLastRead();
  };

  const renderBookmarks = () => {
    const keyword = getLibrarySearchKeyword();
    bookmarkTotal.textContent = `${state.bookmarks.length} 条`;
    let html = '<p>还没有收藏经文。</p>';
    if (!state.bookmarks.length) {
      bookmarkList.innerHTML = html;
      if (bookmarkSectionList) bookmarkSectionList.innerHTML = '<p>还没有收藏经文。进入微读圣经后点击经文右侧星标。</p>';
      updateLibrarySearchStatus();
      return;
    }
    const visibleBookmarks = sortedBookmarks().filter((item) => libraryItemMatchesSearch(item, keyword));
    if (!visibleBookmarks.length) {
      html = '<p>没有找到匹配的收藏经文。</p>';
      bookmarkList.innerHTML = html;
      if (bookmarkSectionList) bookmarkSectionList.innerHTML = html;
      updateLibrarySearchStatus();
      return;
    }

    const grouped = new Map<string, Map<number, Bookmark[]>>();
    visibleBookmarks.forEach((item) => {
      const chapters = grouped.get(item.book) ?? new Map<number, Bookmark[]>();
      chapters.set(item.chapter, [...(chapters.get(item.chapter) ?? []), item]);
      grouped.set(item.book, chapters);
    });

    const bookGrid = [...grouped.entries()].map(([bookSlug, chapters]) => {
      const book = bookBySlug(bookSlug);
      const expanded = Boolean(keyword) || expandedBookmarkBooks.has(bookSlug);
      const total = [...chapters.values()].reduce((sum, items) => sum + items.length, 0);
      return `
        <button class="bible-library-card" type="button" data-action="toggle-bookmark-book" data-book-key="${escapeHtml(bookSlug)}" aria-expanded="${expanded}">
          <strong>${escapeHtml(book?.title ?? bookSlug)}</strong>
          <small>${total} 条</small>
        </button>
      `;
    }).join('');

    const branches = [...grouped.entries()].map(([bookSlug, chapters]) => {
      const book = bookBySlug(bookSlug);
      const bookExpanded = Boolean(keyword) || expandedBookmarkBooks.has(bookSlug);
      if (!bookExpanded) return '';
      const chapterGrid = [...chapters.entries()].map(([chapter, items]) => {
        const key = `${bookSlug}-${chapter}`;
        const expanded = Boolean(keyword) || expandedBookmarkGroups.has(key);
        return `
          <button class="bible-library-card" type="button" data-action="toggle-bookmark-group" data-group-key="${escapeHtml(key)}" aria-expanded="${expanded}">
            <strong>${chapter}章</strong>
            <small>${items.length} 条</small>
          </button>
        `;
      }).join('');
      const chapterEntries = [...chapters.entries()].map(([chapter, items]) => {
        const key = `${bookSlug}-${chapter}`;
        const expanded = Boolean(keyword) || expandedBookmarkGroups.has(key);
        if (!expanded) return '';
        const itemsHtml = items.map((item) => `
          <button type="button" data-goto-book="${item.book}" data-goto-chapter="${item.chapter}" data-goto-verse="${item.verse}">
            <strong>${escapeHtml(book?.title ?? item.book)} ${item.chapter}:${item.verse}</strong><br>
            ${escapeHtml(item.text)}
          </button>
        `).join('');
        return `<div class="bible-collapsible-group-content" data-bookmark-group-content="${escapeHtml(key)}">${itemsHtml}</div>`;
      }).join('');
      return `
        <section class="bible-library-branch" data-bookmark-book="${escapeHtml(bookSlug)}">
          <h4>${escapeHtml(book?.title ?? bookSlug)}</h4>
          <div class="bible-library-grid">${chapterGrid}</div>
          ${chapterEntries}
        </section>
      `;
    }).join('');

    html = `<div class="bible-library-grid">${bookGrid}</div>${branches}`;

    bookmarkList.innerHTML = html;
    if (bookmarkSectionList) bookmarkSectionList.innerHTML = html;
    updateLibrarySearchStatus();
  };

  const sortedNotes = () => state.notes
    .slice()
    .sort((first, second) => {
      const firstBook = data.books.findIndex((book) => book.slug === first.book);
      const secondBook = data.books.findIndex((book) => book.slug === second.book);
      return firstBook - secondBook || first.chapter - second.chapter || first.verse - second.verse;
    });

  const formatExportDate = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN');
  };

  const downloadExcel = (filename: string, title: string, headers: string[], rows: string[][]) => {
    const tableRows = [headers, ...rows].map((row, rowIndex) => `
      <tr>${row.map((cell) => `<${rowIndex === 0 ? 'th' : 'td'}>${escapeHtml(cell)}</${rowIndex === 0 ? 'th' : 'td'}>`).join('')}</tr>
    `).join('');
    const workbook = `<!doctype html><html><head><meta charset="utf-8"><style>
      body{font-family:Arial,"Microsoft YaHei",sans-serif;color:#222}h2{color:#8b6518}table{border-collapse:collapse}th,td{border:1px solid #cfc6b7;padding:6px 10px;vertical-align:top}th{background:#f2dfad;color:#38250d}td{mso-number-format:"\\@"}
    </style></head><body><h2>${escapeHtml(title)}</h2><table>${tableRows}</table></body></html>`;
    const blob = new Blob([`\ufeff${workbook}`], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const exportBookmarks = () => {
    if (!state.bookmarks.length) {
      notify('还没有可导出的经文收藏。');
      return;
    }
    const rows = sortedBookmarks().map((item, index) => {
      const book = bookBySlug(item.book);
      return [
        String(index + 1),
        book?.title ?? item.book,
        String(item.chapter),
        String(item.verse),
        item.text,
        formatExportDate(item.createdAt),
        formatExportDate(item.updatedAt)
      ];
    });
    downloadExcel(
      `经文收藏-${new Date().toISOString().slice(0, 10)}.xls`,
      '经文收藏',
      ['序号', '卷名', '章', '节', '经文', '收藏时间', '更新时间'],
      rows
    );
    notify(`已导出 ${rows.length} 条经文收藏。`);
  };

  const exportNotes = () => {
    if (!state.notes.length) {
      notify('还没有可导出的笔记。');
      return;
    }
    const rows = sortedNotes().map((item, index) => {
      const book = bookBySlug(item.book);
      const sample = data.samples[chapterKey(item.book, item.chapter)];
      return [
        String(index + 1),
        book?.title ?? item.book,
        String(item.chapter),
        String(item.verse),
        sample?.verses[item.verse - 1] ?? '',
        item.text,
        formatExportDate(item.createdAt),
        formatExportDate(item.updatedAt)
      ];
    });
    downloadExcel(
      `我的笔记-${new Date().toISOString().slice(0, 10)}.xls`,
      '我的笔记',
      ['序号', '卷名', '章', '节', '经文', '笔记', '创建时间', '更新时间'],
      rows
    );
    notify(`已导出 ${rows.length} 条笔记。`);
  };

  const renderNotes = () => {
    const keyword = getLibrarySearchKeyword();
    noteTotal.textContent = `${state.notes.length} 条`;
    if (!state.notes.length) {
      noteSectionList.innerHTML = '<p>还没有笔记。</p>';
      updateLibrarySearchStatus();
      return;
    }

    const visibleNotes = sortedNotes().filter((item) => libraryItemMatchesSearch(item, keyword));
    if (!visibleNotes.length) {
      noteSectionList.innerHTML = '<p>没有找到匹配的笔记。</p>';
      updateLibrarySearchStatus();
      return;
    }

    const grouped = new Map<string, Map<number, Note[]>>();
    visibleNotes.forEach((item) => {
      const chapters = grouped.get(item.book) ?? new Map<number, Note[]>();
      chapters.set(item.chapter, [...(chapters.get(item.chapter) ?? []), item]);
      grouped.set(item.book, chapters);
    });

    const bookGrid = [...grouped.entries()].map(([bookSlug, chapters]) => {
      const book = bookBySlug(bookSlug);
      const expanded = Boolean(keyword) || expandedNoteBooks.has(bookSlug);
      const total = [...chapters.values()].reduce((sum, items) => sum + items.length, 0);
      return `
        <button class="bible-library-card" type="button" data-action="toggle-note-book" data-book-key="${escapeHtml(bookSlug)}" aria-expanded="${expanded}">
          <strong>${escapeHtml(book?.title ?? bookSlug)}</strong>
          <small>${total} 条</small>
        </button>
      `;
    }).join('');

    const branches = [...grouped.entries()].map(([bookSlug, chapters]) => {
      const book = bookBySlug(bookSlug);
      const bookExpanded = Boolean(keyword) || expandedNoteBooks.has(bookSlug);
      if (!bookExpanded) return '';
      const chapterGrid = [...chapters.entries()].map(([chapter, items]) => {
        const key = `${bookSlug}-${chapter}`;
        const expanded = Boolean(keyword) || expandedNoteGroups.has(key);
        return `
          <button class="bible-library-card" type="button" data-action="toggle-note-group" data-group-key="${escapeHtml(key)}" aria-expanded="${expanded}">
            <strong>${chapter}章</strong>
            <small>${items.length} 条</small>
          </button>
        `;
      }).join('');
      const chapterEntries = [...chapters.entries()].map(([chapter, items]) => {
        const key = `${bookSlug}-${chapter}`;
        const expanded = Boolean(keyword) || expandedNoteGroups.has(key);
        if (!expanded) return '';
        const itemsHtml = items.map((item) => `
          <button type="button" data-action="open-note" data-note-book="${item.book}" data-note-chapter="${item.chapter}" data-note-verse="${item.verse}">
            <strong>${escapeHtml(book?.title ?? item.book)} ${item.chapter}:${item.verse}</strong>
            <span>${escapeHtml(item.text)}</span>
          </button>
        `).join('');
        return `<div class="bible-collapsible-group-content" data-note-group-content="${escapeHtml(key)}">${itemsHtml}</div>`;
      }).join('');
      return `
        <section class="bible-library-branch" data-note-book="${escapeHtml(bookSlug)}">
          <h4>${escapeHtml(book?.title ?? bookSlug)}</h4>
          <div class="bible-library-grid">${chapterGrid}</div>
          ${chapterEntries}
        </section>
      `;
    }).join('');

    noteSectionList.innerHTML = `<div class="bible-library-grid">${bookGrid}</div>${branches}`;
    updateLibrarySearchStatus();
  };

  const toggleReaderBookmarks = () => {
    if (!readerBookmarkToggle) return;
    const expanded = readerBookmarkToggle.getAttribute('aria-expanded') === 'true';
    if (!expanded) renderBookmarks();
    readerBookmarkToggle.setAttribute('aria-expanded', String(!expanded));
    bookmarkList.hidden = expanded;
  };

  const toggleReaderNotes = () => {
    const expanded = readerNoteToggle.getAttribute('aria-expanded') === 'true';
    readerNoteToggle.setAttribute('aria-expanded', String(!expanded));
    noteSectionList.hidden = expanded;
  };

  const prayerDateKey = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const prayerIndexForDate = () => {
    const today = new Date();
    const seed = today.getFullYear() * 372 + (today.getMonth() + 1) * 31 + today.getDate();
    return data.prayers.length ? seed % data.prayers.length : 0;
  };

  const readPrayerIndex = () => {
    const date = prayerDateKey();
    try {
      const saved = JSON.parse(window.localStorage.getItem(DAILY_PRAYER_KEY) || '{}') as { date?: string; index?: number };
      if (saved.date === date && Number.isInteger(saved.index) && Number(saved.index) >= 0 && Number(saved.index) < data.prayers.length) {
        return Number(saved.index);
      }
    } catch {
      // Use the date-based prayer when local storage is unavailable or invalid.
    }
    return prayerIndexForDate();
  };

  const writePrayerIndex = (index: number) => {
    try {
      window.localStorage.setItem(DAILY_PRAYER_KEY, JSON.stringify({ date: prayerDateKey(), index }));
    } catch {
      notify('今日祷告暂时无法保存到浏览器。');
    }
  };

  const renderPrayer = (index: number, persist = false) => {
    if (!data.prayers.length) return;
    currentPrayerIndex = (index + data.prayers.length) % data.prayers.length;
    const prayer = data.prayers[currentPrayerIndex];
    prayerDate.textContent = new Intl.DateTimeFormat('zh-CN', {
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    }).format(new Date());
    prayerTheme.textContent = prayer.theme;
    prayerTitle.textContent = prayer.title;
    prayerText.textContent = prayer.prayer;
    prayerReference.textContent = prayer.reference;
    prayerCount.textContent = `${currentPrayerIndex + 1} / ${data.prayers.length}`;
    if (persist) writePrayerIndex(currentPrayerIndex);
  };

  const refreshPrayer = () => {
    if (data.prayers.length < 2) return;
    const offset = 1 + Math.floor(Math.random() * (data.prayers.length - 1));
    renderPrayer(currentPrayerIndex + offset, true);
    notify('已换一篇祷告。');
  };

  const renderAll = (targetVerse?: number, options: RenderOptions = {}) => {
    selectedTestament = currentBookInfo().testament;
    renderBooks();
    renderChapters();
    renderVerses(targetVerse, options);
    renderReadingProgress();
    renderBookmarks();
    renderNotes();
  };

  const gotoReference = (book: string, chapter: number, verse?: number) => {
    const nextBook = bookBySlug(book);
    if (!nextBook) return;
    stopSpeech(true);
    currentBook = book;
    currentChapter = Math.min(Math.max(chapter, 1), nextBook.chapters);
    selectedTestament = nextBook.testament;
    searchResults.hidden = true;
    directory.classList.remove('is-open');
    renderAll(verse);
  };

  const resumeSelectedBook = () => {
    if (fullTextStatus === 'loading') {
      notify('圣经全文正在载入，请稍后继续阅读。');
      return;
    }
    if (fullTextStatus === 'failed') {
      notify('圣经全文载入失败，暂时无法恢复阅读位置。');
      return;
    }

    const book = currentBookInfo();
    let nextUnread: { chapter: number; verse: number } | null = null;
    for (let chapter = 1; chapter <= book.chapters; chapter += 1) {
      const sample = data.samples[chapterKey(currentBook, chapter)];
      if (!sample) continue;
      const verseIndex = sample.verses.findIndex((_, index) => !isReadVerse(currentBook, chapter, index + 1));
      if (verseIndex < 0) continue;
      nextUnread = { chapter, verse: verseIndex + 1 };
      break;
    }

    if (!nextUnread) {
      notify(`${book.title}已经全部读完。`);
      return;
    }

    gotoReference(currentBook, nextUnread.chapter, nextUnread.verse);
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

  const renderSpeechControls = (isSpeaking: boolean) => {
    readChapterButton.textContent = isSpeaking ? '正在朗读' : '朗读本章';
    readChapterButton.setAttribute('aria-pressed', String(isSpeaking));
    replayChapterButton.disabled = !lastSpeechText;
    stopReadingButton.disabled = !isSpeaking;
  };

  const releaseActiveAudio = () => {
    if (activeAudio) {
      activeAudio.pause();
      activeAudio.removeAttribute('src');
      activeAudio.load();
      activeAudio = null;
    }
    if (activeAudioUrl) {
      URL.revokeObjectURL(activeAudioUrl);
      activeAudioUrl = null;
    }
  };

  const stopSpeech = (clearReplay = false) => {
    speechRequestToken += 1;
    activeSpeechController?.abort();
    activeSpeechController = null;
    releaseActiveAudio();
    if ('speechSynthesis' in window) {
      activeUtterance = null;
      window.speechSynthesis.cancel();
    }
    if (clearReplay) lastSpeechText = '';
    renderSpeechControls(false);
  };

  const speakWithBrowserVoice = (text: string, requestToken: number) => {
    if (!('speechSynthesis' in window)) {
      notify('当前浏览器不支持语音朗读。');
      renderSpeechControls(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    activeUtterance = utterance;
    utterance.lang = 'zh-CN';
    utterance.rate = 0.92 * speechRate;
    utterance.onend = () => {
      if (activeUtterance !== utterance || requestToken !== speechRequestToken) return;
      activeUtterance = null;
      renderSpeechControls(false);
    };
    utterance.onerror = () => {
      if (activeUtterance !== utterance || requestToken !== speechRequestToken) return;
      activeUtterance = null;
      renderSpeechControls(false);
      notify('朗读中断，请重新播放。');
    };
    renderSpeechControls(true);
    window.speechSynthesis.speak(utterance);
  };

  const speechEndpoint = () => {
    const isLocal = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
    return isLocal ? 'http://127.0.0.1:9000/api/bible-tts' : '/api/bible-translation';
  };

  const rememberSpeechAudio = (text: string, audio: Blob) => {
    speechAudioCache.delete(text);
    speechAudioCache.set(text, audio);
    while (speechAudioCache.size > 3) {
      const oldest = speechAudioCache.keys().next().value;
      if (!oldest) break;
      speechAudioCache.delete(oldest);
    }
  };

  const speak = async (text: string) => {
    stopSpeech();
    lastSpeechText = text;
    const requestToken = speechRequestToken;
    renderSpeechControls(true);

    try {
      let audioBlob = speechAudioCache.get(text);
      if (!audioBlob) {
        const controller = new AbortController();
        activeSpeechController = controller;
        const response = await fetch(speechEndpoint(), {
          method: 'POST',
          headers: {
            Accept: 'audio/mpeg',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ text }),
          signal: controller.signal
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        audioBlob = await response.blob();
        if (!audioBlob.size || !audioBlob.type.startsWith('audio/')) throw new Error('invalid audio');
        rememberSpeechAudio(text, audioBlob);
      }
      if (requestToken !== speechRequestToken) return;

      activeSpeechController = null;
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.playbackRate = speechRate;
      audio.preservesPitch = true;
      activeAudio = audio;
      activeAudioUrl = audioUrl;
      audio.onended = () => {
        if (activeAudio !== audio || requestToken !== speechRequestToken) return;
        releaseActiveAudio();
        renderSpeechControls(false);
      };
      audio.onerror = () => {
        if (activeAudio !== audio || requestToken !== speechRequestToken) return;
        releaseActiveAudio();
        notify('云端男声播放失败，已改用本机朗读。');
        speakWithBrowserVoice(text, requestToken);
      };
      await audio.play();
    } catch (error) {
      if ((error as Error)?.name === 'AbortError' || requestToken !== speechRequestToken) return;
      activeSpeechController = null;
      releaseActiveAudio();
      notify('云端男声暂不可用，已改用本机朗读。');
      speakWithBrowserVoice(text, requestToken);
    }
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
    const bookmarked = isBookmarked(sample.book, sample.chapter, verse);
    const bookmarkButton = root.querySelector<HTMLButtonElement>(
      `#${CSS.escape(verseKey(sample.book, sample.chapter, verse))} [data-action="toggle-bookmark"]`
    );
    if (bookmarkButton) {
      const label = bookmarked ? '取消收藏' : '收藏';
      bookmarkButton.textContent = bookmarked ? '★' : '☆';
      bookmarkButton.title = label;
      bookmarkButton.setAttribute('aria-label', label);
    }
    bookmarkTotal.textContent = `${state.bookmarks.length} 条`;
    updateLibrarySearchStatus();
    if (!bookmarkList.hidden || (bookmarkSectionList && bookmarkSectionList.offsetParent !== null)) {
      renderBookmarks();
    }
  };

  const toggleReadVerse = (verse: number, trigger: HTMLElement) => {
    if (!session) {
      setReadingSyncStatus('请先登录，阅读进度才会保存到云端。', 'error');
      notify('请先登录后再保存阅读进度。');
      return;
    }
    if (!automaticCloudSyncEnabled) {
      setReadingSyncStatus('云端同步不可用，请先重试同步。', 'error');
      notify('云端同步不可用，阅读进度未保存。');
      return;
    }

    const key = verseKey(currentBook, currentChapter, verse);
    const nextReadVerses = new Set(readVerses);
    const nextRead = !nextReadVerses.has(key);

    if (nextRead) nextReadVerses.add(key);
    else nextReadVerses.delete(key);

    readVerses = nextReadVerses;
    writeReadVerses(readVerses);
    const verseElement = root.querySelector<HTMLElement>(`#${CSS.escape(key)}`);
    verseElement?.classList.toggle('is-read', nextRead);
    trigger.setAttribute('aria-pressed', String(nextRead));
    updateReadingProgress();
    const chapterButton = chapterList.querySelector<HTMLButtonElement>(`[data-chapter="${currentChapter}"]`);
    const chapterProgress = getProgressSummary(currentBook, currentChapter);
    const chapterComplete = chapterProgress.total > 0 && chapterProgress.read >= chapterProgress.total;
    chapterButton?.classList.toggle('is-complete', chapterComplete);
    chapterButton?.setAttribute('aria-label', `${currentBookInfo().title} ${currentChapter}章${chapterComplete ? '，已读完' : ''}`);
    persist();
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
    const result = await db.collection(COLLECTION).where({ ownerId }).get() as CloudResult<Array<ReaderState & { _id?: string; ownerId?: string }>>;
    const item = assertCloudResult(result, '读取云端阅读进度失败。')?.[0];
    if (!item?.lastRead) return null;
    return {
      lastRead: item.lastRead,
      bookmarks: Array.isArray(item.bookmarks) ? item.bookmarks : [],
      notes: Array.isArray(item.notes) ? item.notes : [],
      readVerses: Array.isArray(item.readVerses) ? item.readVerses.filter((verse: unknown): verse is string => typeof verse === 'string') : [],
      updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : nowIso()
    };
  };

  const syncCloudState = async (nextReadVerses = readVerses) => {
    if (!session) return;
    const db = getCloudDb();
    const payload = { ...state, readVerses: [...nextReadVerses], ownerId: session.uid };
    const result = await db.collection(COLLECTION).doc(session.uid).set(payload) as CloudResult<unknown>;
    assertCloudResult(result, '保存云端阅读进度失败。');
  };

  const synchronizeCloudSession = async (nextSession: CloudSession, options: { notifySuccess?: boolean; closeLogin?: boolean } = {}) => {
    session = nextSession;
    automaticCloudSyncEnabled = true;
    renderLoginState(session);
    setReadingSyncStatus('正在读取云端阅读进度…', 'saving');

    const cloudState = await loadCloudState(session.uid);
    if (cloudState) {
      state = mergeState(state, cloudState);
      mergeCloudReadVerses(cloudState);
      currentBook = state.lastRead.book;
      currentChapter = state.lastRead.chapter;
      selectedTestament = currentBookInfo().testament;
    }

    state.updatedAt = nowIso();
    setReadingSyncStatus('正在保存云端同步结果…', 'saving');
    await syncCloudState();
    const cached = cacheSyncedState();
    renderAll(state.lastRead.verse);
    setReadingSyncStatus(cached ? '已同步到云端和本地。' : '云端已保存，本地缓存更新失败。', cached ? 'saved' : 'error');
    if (options.notifySuccess) notify(cached ? '已登录并同步阅读数据。' : '云端已保存，但本地缓存更新失败。');
    if (options.closeLogin && loginModal.open) loginModal.close();
  };

  const finishLogin = async (nextSession: CloudSession) => {
    try {
      await synchronizeCloudSession(nextSession, { notifySuccess: true, closeLogin: true });
    } catch (error) {
      markCloudSyncUnavailable(error);
      loginStatus.textContent = '已登录，但云端同步失败，请点击“重试同步”。';
    }
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

  verseList.addEventListener('pointerover', (event) => {
    if (event.pointerType && event.pointerType !== 'mouse') return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const trigger = target.closest<HTMLElement>('[data-action="show-translation"]');
    if (!trigger || (event.relatedTarget instanceof Node && trigger.contains(event.relatedTarget))) return;
    const verseElement = trigger.closest<HTMLElement>('.bible-verse[data-verse]');
    if (!verseElement) return;
    window.clearTimeout(translationHoverTimer);
    translationHoverTimer = window.setTimeout(() => {
      translationHoverTimer = undefined;
      void showTranslationPopover(verseElement);
    }, 2000);
  });

  verseList.addEventListener('pointerout', (event) => {
    if (event.pointerType && event.pointerType !== 'mouse') return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const trigger = target.closest<HTMLElement>('[data-action="show-translation"]');
    if (!trigger || (event.relatedTarget instanceof Node && trigger.contains(event.relatedTarget))) return;
    hideTranslationPopover();
  });

  verseList.addEventListener('scroll', () => {
    if (activeTranslationVerse) positionTranslationPopover(activeTranslationVerse);
  }, { passive: true });
  window.addEventListener('resize', () => {
    if (activeTranslationVerse) positionTranslationPopover(activeTranslationVerse);
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
    if (trigger.dataset.book) handleBookCardClick(trigger.dataset.book);
    if (trigger.dataset.chapter) {
      stopSpeech(true);
      currentChapter = Number(trigger.dataset.chapter);
      renderAll(1);
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
    if (trigger.dataset.action === 'toggle-reader-notes') toggleReaderNotes();
    if (trigger.dataset.action === 'export-bookmarks') exportBookmarks();
    if (trigger.dataset.action === 'export-notes') exportNotes();
    if (trigger.dataset.action === 'toggle-reading-theme') toggleReadingTheme();
    if (trigger.dataset.action === 'refresh-prayer') refreshPrayer();
    if (trigger.dataset.action === 'toggle-bookmark-book' && trigger.dataset.bookKey) {
      const key = trigger.dataset.bookKey;
      if (expandedBookmarkBooks.has(key)) expandedBookmarkBooks.delete(key);
      else expandedBookmarkBooks.add(key);
      renderBookmarks();
    }
    if (trigger.dataset.action === 'toggle-bookmark-group' && trigger.dataset.groupKey) {
      const key = trigger.dataset.groupKey;
      if (expandedBookmarkGroups.has(key)) expandedBookmarkGroups.delete(key);
      else expandedBookmarkGroups.add(key);
      renderBookmarks();
    }
    if (trigger.dataset.action === 'toggle-note-book' && trigger.dataset.bookKey) {
      const key = trigger.dataset.bookKey;
      if (expandedNoteBooks.has(key)) expandedNoteBooks.delete(key);
      else expandedNoteBooks.add(key);
      renderNotes();
    }
    if (trigger.dataset.action === 'toggle-note-group' && trigger.dataset.groupKey) {
      const key = trigger.dataset.groupKey;
      if (expandedNoteGroups.has(key)) expandedNoteGroups.delete(key);
      else expandedNoteGroups.add(key);
      renderNotes();
    }
    if (trigger.dataset.action === 'cloud-login') {
      const activeSession = session;
      if (activeSession) {
        setReadingSyncStatus('正在重试云端同步…', 'saving');
        synchronizeCloudSession(activeSession, { notifySuccess: true })
          .catch(markCloudSyncUnavailable);
      } else {
        loginModal.showModal();
      }
    }
    if (trigger.dataset.action === 'close-login') loginModal.close();
    if (trigger.dataset.action === 'close-note') noteModal.close();
    if (trigger.dataset.action === 'close-book-status') bookStatusModal.close();
    if (trigger.dataset.action === 'set-book-status') {
      const status = trigger.dataset.bookReadingStatus;
      if (status === 'reading' || status === 'read' || status === 'none') setBookReadingStatus(status);
    }
    if (trigger.dataset.action === 'delete-note') deleteActiveNote();
    if (trigger.dataset.action === 'start-signup') startSignUp();
    if (trigger.dataset.action === 'copy-group-guide') {
      const guideText = groupGuide?.innerText.trim();
      if (!guideText || !navigator.clipboard) notify('当前浏览器暂不支持复制。');
      else navigator.clipboard.writeText(guideText).then(() => notify('小组提纲已复制。')).catch(() => notify('复制失败，请手动选择文字。'));
    }
    if (trigger.dataset.action === 'read-chapter') {
      const sample = currentSample();
      const book = sample ? bookBySlug(sample.book) : undefined;
      if (sample) void speak(`${book?.title || sample.title}，第${sample.chapter}章。${sample.verses.join('')}`);
      else notify('该章正文暂未导入，无法朗读。');
    }
    if (trigger.dataset.action === 'replay-chapter' && lastSpeechText) void speak(lastSpeechText);
    if (trigger.dataset.action === 'resume-reading') resumeSelectedBook();
    if (trigger.dataset.action === 'stop-reading') {
      stopSpeech();
      notify('已停止朗读。');
    }
    const verse = Number(trigger.dataset.verse || '');
    if (verse && trigger.dataset.action === 'toggle-bookmark') toggleBookmark(verse);
    if (verse && trigger.dataset.action === 'toggle-read-verse') void toggleReadVerse(verse, trigger);
    if (verse && trigger.dataset.action === 'show-translation') {
      const verseElement = trigger.closest<HTMLElement>('.bible-verse[data-verse]');
      if (!verseElement) return;
      if (activeTranslationVerse === verseElement && !translationPopover.hidden) hideTranslationPopover();
      else void showTranslationPopover(verseElement);
    }
  });

  searchInput.addEventListener('input', runSearch);
  speechRateSelect.addEventListener('change', () => {
    const nextRate = Number(speechRateSelect.value);
    if (!SPEECH_RATES.includes(nextRate)) {
      speechRateSelect.value = String(speechRate);
      return;
    }
    speechRate = nextRate;
    const saved = writeSpeechRate(speechRate);
    if (activeAudio) activeAudio.playbackRate = speechRate;
    if (activeUtterance) activeUtterance.rate = 0.92 * speechRate;
    notify(saved ? `朗读倍速已切换至 ${speechRate} 倍。` : `朗读倍速已切换至 ${speechRate} 倍，但当前浏览器无法长期保存。`);
  });
  librarySearchInput.addEventListener('input', () => {
    renderBookmarks();
    renderNotes();
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
      await synchronizeCloudSession(nextSession);
    })
    .catch(markCloudSyncUnavailable);

  indexReadingProgress();
  renderReadingTheme();
  renderPrayer(readPrayerIndex());
  renderAll(Number(params.get('verse') || '') || undefined, { updateLastRead: false });
  void loadFullBibleText();
}
