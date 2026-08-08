import './BibleTextStatistics.css';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';

const basePath = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;

type Testament = 'old' | 'new';

type BookDefinition = {
  slug: string;
  name: string;
  shortName: string;
  testament: Testament;
};

type BiblePayload = {
  version: {
    id: string;
    label: string;
  };
  generatedAt?: string;
  chapterCount: number;
  verseCount: number;
  chapters: Record<string, string[]>;
};

type ChapterStat = {
  chapter: number;
  verses: number;
  characters: number;
};

type BookStat = BookDefinition & {
  chapters: number;
  verses: number;
  characters: number;
  chapterStats: ChapterStat[];
};

const oldTestamentBooks: BookDefinition[] = [
  ['gen', '创世记', '创'], ['exo', '出埃及记', '出'], ['lev', '利未记', '利'], ['num', '民数记', '民'],
  ['deu', '申命记', '申'], ['jos', '约书亚记', '书'], ['jdg', '士师记', '士'], ['rut', '路得记', '得'],
  ['1sa', '撒母耳记上', '撒上'], ['2sa', '撒母耳记下', '撒下'], ['1ki', '列王纪上', '王上'], ['2ki', '列王纪下', '王下'],
  ['1ch', '历代志上', '代上'], ['2ch', '历代志下', '代下'], ['ezr', '以斯拉记', '拉'], ['neh', '尼希米记', '尼'],
  ['est', '以斯帖记', '斯'], ['job', '约伯记', '伯'], ['psa', '诗篇', '诗'], ['pro', '箴言', '箴'],
  ['ecc', '传道书', '传'], ['sng', '雅歌', '歌'], ['isa', '以赛亚书', '赛'], ['jer', '耶利米书', '耶'],
  ['lam', '耶利米哀歌', '哀'], ['ezk', '以西结书', '结'], ['dan', '但以理书', '但'], ['hos', '何西阿书', '何'],
  ['jol', '约珥书', '珥'], ['amo', '阿摩司书', '摩'], ['oba', '俄巴底亚书', '俄'], ['jon', '约拿书', '拿'],
  ['mic', '弥迦书', '弥'], ['nam', '那鸿书', '鸿'], ['hab', '哈巴谷书', '哈'], ['zep', '西番雅书', '番'],
  ['hag', '哈该书', '该'], ['zec', '撒迦利亚书', '亚'], ['mal', '玛拉基书', '玛']
].map(([slug, name, shortName]) => ({ slug, name, shortName, testament: 'old' as const }));

const newTestamentBooks: BookDefinition[] = [
  ['mat', '马太福音', '太'], ['mrk', '马可福音', '可'], ['luk', '路加福音', '路'], ['jhn', '约翰福音', '约'],
  ['act', '使徒行传', '徒'], ['rom', '罗马书', '罗'], ['1co', '哥林多前书', '林前'], ['2co', '哥林多后书', '林后'],
  ['gal', '加拉太书', '加'], ['eph', '以弗所书', '弗'], ['php', '腓立比书', '腓'], ['col', '歌罗西书', '西'],
  ['1th', '帖撒罗尼迦前书', '帖前'], ['2th', '帖撒罗尼迦后书', '帖后'], ['1ti', '提摩太前书', '提前'], ['2ti', '提摩太后书', '提后'],
  ['tit', '提多书', '多'], ['phm', '腓利门书', '门'], ['heb', '希伯来书', '来'], ['jas', '雅各书', '雅'],
  ['1pe', '彼得前书', '彼前'], ['2pe', '彼得后书', '彼后'], ['1jn', '约翰一书', '约一'], ['2jn', '约翰二书', '约二'],
  ['3jn', '约翰三书', '约三'], ['jud', '犹大书', '犹'], ['rev', '启示录', '启']
].map(([slug, name, shortName]) => ({ slug, name, shortName, testament: 'new' as const }));

const allBooks = [...oldTestamentBooks, ...newTestamentBooks];
const numberFormatter = new Intl.NumberFormat('zh-CN');

function countCharacters(text: string) {
  return Array.from(text.replace(/\s/gu, '')).length;
}

function createBookStats(payload: BiblePayload): BookStat[] {
  return allBooks.map((book) => {
    const chapterStats = Object.entries(payload.chapters)
      .filter(([key]) => key.startsWith(`${book.slug}-`))
      .map(([key, verses]) => ({
        chapter: Number(key.slice(book.slug.length + 1)),
        verses: verses.length,
        characters: verses.reduce((total, verse) => total + countCharacters(verse), 0)
      }))
      .sort((a, b) => a.chapter - b.chapter);

    return {
      ...book,
      chapters: chapterStats.length,
      verses: chapterStats.reduce((total, chapter) => total + chapter.verses, 0),
      characters: chapterStats.reduce((total, chapter) => total + chapter.characters, 0),
      chapterStats
    };
  });
}

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function heatLevel(chapters: number) {
  if (chapters <= 3) return 0;
  if (chapters <= 5) return 1;
  if (chapters <= 10) return 2;
  if (chapters <= 20) return 3;
  if (chapters <= 30) return 4;
  if (chapters <= 50) return 5;
  return 6;
}

function barStyle(value: number, maximum: number): CSSProperties {
  return { '--bts-bar-width': `${Math.max(2.5, (value / maximum) * 100)}%` } as CSSProperties;
}

function sumStats(books: BookStat[], key: 'chapters' | 'verses' | 'characters') {
  return books.reduce((total, book) => total + book[key], 0);
}

function BookGroup({ title, books, activeSlug, onSelect }: {
  title: string;
  books: BookStat[];
  activeSlug: string | null;
  onSelect: (slug: string) => void;
}) {
  return (
    <section className="bts-book-group" aria-labelledby={`bts-${books[0]?.testament}-title`}>
      <h3 id={`bts-${books[0]?.testament}-title`}>{title}</h3>
      <div className="bts-book-list">
        {books.map((book, index) => (
          <button
            key={book.slug}
            type="button"
            className={activeSlug === book.slug ? 'is-selected' : ''}
            aria-pressed={activeSlug === book.slug}
            onClick={() => onSelect(book.slug)}
          >
            <span className={`bts-book-dot dot-${index % 10}`} aria-hidden="true" />
            <span>{book.name}</span>
            <strong>{book.chapters}章</strong>
          </button>
        ))}
      </div>
    </section>
  );
}

export default function BibleTextStatistics() {
  const [payload, setPayload] = useState<BiblePayload | null>(null);
  const [loadError, setLoadError] = useState('');
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${basePath}data/bible/chi-cuv-simp.json`)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<BiblePayload>;
      })
      .then((data) => {
        if (!cancelled) setPayload(data);
      })
      .catch(() => {
        if (!cancelled) setLoadError('圣经统计数据暂时无法读取，请稍后刷新页面。');
      });
    return () => { cancelled = true; };
  }, []);

  const bookStats = useMemo(() => payload ? createBookStats(payload) : [], [payload]);

  const dashboard = useMemo(() => {
    if (!bookStats.length) return null;
    const oldBooks = bookStats.filter((book) => book.testament === 'old');
    const newBooks = bookStats.filter((book) => book.testament === 'new');
    const topBooks = [...bookStats].sort((a, b) => b.characters - a.characters).slice(0, 20);
    const allChapters = bookStats.flatMap((book) => book.chapterStats.map((chapter) => ({ ...chapter, book })));
    const longestChapter = [...allChapters].sort((a, b) => b.characters - a.characters)[0];
    const shortestChapter = [...allChapters].sort((a, b) => a.characters - b.characters)[0];
    const oneChapterBooks = bookStats.filter((book) => book.chapters === 1);
    const totalCharacters = sumStats(bookStats, 'characters');
    const totalVerses = sumStats(bookStats, 'verses');

    return {
      oldBooks,
      newBooks,
      topBooks,
      oneChapterBooks,
      longestChapter,
      shortestChapter,
      totalChapters: sumStats(bookStats, 'chapters'),
      totalVerses,
      totalCharacters,
      oldChapters: sumStats(oldBooks, 'chapters'),
      newChapters: sumStats(newBooks, 'chapters'),
      oldVerses: sumStats(oldBooks, 'verses'),
      newVerses: sumStats(newBooks, 'verses'),
      oldCharacters: sumStats(oldBooks, 'characters'),
      newCharacters: sumStats(newBooks, 'characters'),
      averagePerChapter: Math.round(totalCharacters / sumStats(bookStats, 'chapters')),
      averagePerVerse: Math.round(totalCharacters / totalVerses)
    };
  }, [bookStats]);

  if (loadError) {
    return <main className="bts-page"><p className="bts-status is-error">{loadError}</p></main>;
  }

  if (!payload || !dashboard) {
    return <main className="bts-page"><p className="bts-status">正在整理 66 卷圣经统计数据…</p></main>;
  }

  const selectedBook = bookStats.find((book) => book.slug === activeSlug) ?? bookStats[0];
  const maximumCharacters = dashboard.topBooks[0]?.characters ?? 1;
  const mostChapters = [...bookStats].sort((a, b) => b.chapters - a.chapters)[0];

  const selectBook = (slug: string) => {
    setActiveSlug(slug);
    window.requestAnimationFrame(() => {
      document.querySelector('#bts-chapter-detail')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  const showAllBooks = () => {
    setActiveSlug(null);
    document.querySelector('#bts-heatmap')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <main className="bts-page">
      <section className="bts-shell" aria-labelledby="bts-title">
        <header className="bts-header">
          <div className="bts-title-mark" aria-hidden="true">
            <img src={`${basePath}images/bible-reading-status-icon.png`} alt="" width="72" height="72" />
          </div>
          <div>
            <p>ALTERNATIVE BIBLE · 圣经数据观察</p>
            <h1 id="bts-title">圣经章节与文字统计</h1>
            <span>探索每卷书、每章和每节的详细统计信息</span>
          </div>
          <a href={`${basePath}topics/applications/inspiration-station/theology/alternative-knowledge/`}>返回另类圣经</a>
        </header>

        <div className="bts-dashboard">
          <aside className="bts-sidebar" aria-label="选择书卷">
            <div className="bts-sidebar-top">
              <h2>选择书卷</h2>
              <button type="button" className={activeSlug === null ? 'is-selected' : ''} aria-pressed={activeSlug === null} onClick={() => setActiveSlug(null)}>
                <span aria-hidden="true">66</span>
                <strong>全部书卷</strong>
              </button>
            </div>
            <div className="bts-sidebar-scroll">
              <BookGroup title="旧约（39卷）" books={dashboard.oldBooks} activeSlug={activeSlug} onSelect={selectBook} />
              <BookGroup title="新约（27卷）" books={dashboard.newBooks} activeSlug={activeSlug} onSelect={selectBook} />
            </div>
            <button className="bts-compare-button" type="button" onClick={showAllBooks}>对比全部书卷</button>
            <div className="bts-source-note">
              <span>数据来源：中文和合本简体</span>
              <span>统计版本：{payload.version.label || payload.version.id}</span>
            </div>
          </aside>

          <div className="bts-main">
            <section className="bts-kpis" aria-label="圣经统计总览">
              <article>
                <span>BOOKS</span>
                <div><strong>66</strong><p>总书卷数</p><small>39 旧约 + 27 新约</small></div>
              </article>
              <article>
                <span>CHAPTERS</span>
                <div><strong>{formatNumber(dashboard.totalChapters)}</strong><p>总章节数</p><small>{formatNumber(dashboard.oldChapters)} 旧约 + {formatNumber(dashboard.newChapters)} 新约</small></div>
              </article>
              <article>
                <span>VERSES</span>
                <div><strong>{formatNumber(dashboard.totalVerses)}</strong><p>总节数</p><small>{formatNumber(dashboard.oldVerses)} 旧约 + {formatNumber(dashboard.newVerses)} 新约</small></div>
              </article>
              <article>
                <span>TEXT</span>
                <div><strong>{formatNumber(dashboard.totalCharacters)}</strong><p>总文字数</p><small>{formatNumber(dashboard.oldCharacters)} 旧约 + {formatNumber(dashboard.newCharacters)} 新约</small></div>
              </article>
            </section>

            <div className="bts-overview-grid">
              <section className="bts-panel bts-heatmap-panel" id="bts-heatmap" aria-labelledby="bts-heatmap-title">
                <header><h2 id="bts-heatmap-title">各书卷章节数热力图</h2><p>颜色越亮表示该书卷章节数越多</p></header>
                <div className="bts-heatmap-row">
                  <span>旧约</span>
                  <div className="bts-heatmap-books">
                    {dashboard.oldBooks.map((book) => (
                      <button key={book.slug} type="button" className={`level-${heatLevel(book.chapters)} ${activeSlug === book.slug ? 'is-selected' : ''}`} onClick={() => selectBook(book.slug)} aria-label={`${book.name}，${book.chapters}章`}>
                        <strong>{book.shortName}</strong><span>{book.chapters}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="bts-heatmap-row">
                  <span>新约</span>
                  <div className="bts-heatmap-books">
                    {dashboard.newBooks.map((book) => (
                      <button key={book.slug} type="button" className={`level-${heatLevel(book.chapters)} ${activeSlug === book.slug ? 'is-selected' : ''}`} onClick={() => selectBook(book.slug)} aria-label={`${book.name}，${book.chapters}章`}>
                        <strong>{book.shortName}</strong><span>{book.chapters}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="bts-heat-legend" aria-label="章节数量色阶">
                  <span>少</span>{[0, 1, 2, 3, 4, 5, 6].map((level) => <i key={level} className={`level-${level}`} />)}<span>多</span>
                </div>
              </section>

              <section className="bts-panel bts-bars-panel" aria-labelledby="bts-bars-title">
                <header><h2 id="bts-bars-title">各书卷文字数分布</h2><p>按文字数由高到低排名的前20卷书</p></header>
                <div className="bts-bars" role="list">
                  {dashboard.topBooks.map((book) => (
                    <button key={book.slug} type="button" role="listitem" onClick={() => selectBook(book.slug)}>
                      <span>{book.name}</span>
                      <i><b style={barStyle(book.characters, maximumCharacters)} /></i>
                      <strong>{formatNumber(book.characters)}</strong>
                    </button>
                  ))}
                </div>
                <div className="bts-axis"><span>0</span><span>{formatNumber(Math.round(maximumCharacters / 2))}</span><span>{formatNumber(maximumCharacters)}</span></div>
                <small>文字数</small>
              </section>

              <aside className="bts-insights" aria-label="关键词洞察与快速统计">
                <section className="bts-panel">
                  <h2>关键词洞察</h2>
                  <article className="insight-one"><span>1</span><div><strong>章节最多的书卷</strong><p>{mostChapters.name}共有 {mostChapters.chapters} 章</p></div></article>
                  <article className="insight-two"><span>2</span><div><strong>章节最少的书卷</strong><p>{dashboard.oneChapterBooks.map((book) => book.shortName).join('、')}均为 1 章</p></div></article>
                  <article className="insight-three"><span>3</span><div><strong>平均每章文字数</strong><p>整本圣经平均每章约 {formatNumber(dashboard.averagePerChapter)} 个字符</p></div></article>
                </section>
                <section className="bts-panel bts-quick-stats">
                  <h2>快速统计</h2>
                  <dl>
                    <div><dt>最长的章节</dt><dd>{dashboard.longestChapter.book.shortName} {dashboard.longestChapter.chapter}（{formatNumber(dashboard.longestChapter.characters)}字）</dd></div>
                    <div><dt>最短的章节</dt><dd>{dashboard.shortestChapter.book.shortName} {dashboard.shortestChapter.chapter}（{formatNumber(dashboard.shortestChapter.characters)}字）</dd></div>
                    <div><dt>平均每节文字数</dt><dd>约 {formatNumber(dashboard.averagePerVerse)} 个字符</dd></div>
                  </dl>
                </section>
              </aside>
            </div>

            <section className="bts-panel bts-detail-panel" id="bts-chapter-detail" aria-labelledby="bts-detail-title">
              <header><h2 id="bts-detail-title">章节详情预览 · {selectedBook.name}</h2><p>查看{selectedBook.name}各章节文字统计</p></header>
              <div className="bts-detail-scroll">
                <table>
                  <tbody>
                    <tr><th scope="row">章节</th>{selectedBook.chapterStats.map((chapter) => <th scope="col" key={`chapter-${chapter.chapter}`}>{chapter.chapter}</th>)}</tr>
                    <tr><th scope="row">节数</th>{selectedBook.chapterStats.map((chapter) => <td key={`verses-${chapter.chapter}`}>{chapter.verses}</td>)}</tr>
                    <tr><th scope="row">文字数</th>{selectedBook.chapterStats.map((chapter) => <td key={`characters-${chapter.chapter}`}>{formatNumber(chapter.characters)}</td>)}</tr>
                  </tbody>
                </table>
              </div>
            </section>

            <footer className="bts-method-note">文字数按当前和合本简体文本统计：移除空白、保留标点；不同译本或标点版本会有差异。</footer>
          </div>
        </div>
      </section>
    </main>
  );
}
