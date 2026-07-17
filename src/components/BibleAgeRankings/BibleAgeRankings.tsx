import './BibleAgeRankings.css';

import { useState, type CSSProperties } from 'react';

const basePath = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;

type RankView = 'lifespan' | 'accession';

type RankingRow = {
  rank: number;
  name: string;
  value: number;
  context: string;
  badge: string;
  reference: string;
  note?: string;
  isVariant?: boolean;
};

type SourceNote = {
  name: string;
  value: string;
  reason: string;
  reference: string;
};

const lifespanRanking: RankingRow[] = [
  { rank: 1, name: '玛土撒拉', value: 969, context: '洪水前族长', badge: '经文明说终年', reference: '创世记 5:27' },
  { rank: 2, name: '雅列', value: 962, context: '洪水前族长', badge: '经文明说终年', reference: '创世记 5:20' },
  { rank: 3, name: '挪亚', value: 950, context: '洪水时代', badge: '经文明说终年', reference: '创世记 9:29' },
  { rank: 4, name: '亚当', value: 930, context: '始祖', badge: '经文明说终年', reference: '创世记 5:5' },
  { rank: 5, name: '塞特', value: 912, context: '洪水前族长', badge: '经文明说终年', reference: '创世记 5:8' },
  { rank: 6, name: '该南', value: 910, context: '洪水前族长', badge: '经文明说终年', reference: '创世记 5:14' },
  { rank: 7, name: '以挪士', value: 905, context: '洪水前族长', badge: '经文明说终年', reference: '创世记 5:11' },
  { rank: 8, name: '玛勒列', value: 895, context: '洪水前族长', badge: '经文明说终年', reference: '创世记 5:17' },
  { rank: 9, name: '拉麦（挪亚之父）', value: 777, context: '洪水前族长', badge: '经文明说终年', reference: '创世记 5:31', note: '不是该隐后代中创世记 4 章的拉麦。' },
  { rank: 10, name: '闪', value: 600, context: '挪亚之子', badge: '由经文数字相加', reference: '创世记 11:10-11', note: '100 岁生亚法撒，之后又活 500 年。' },
  { rank: 11, name: '希伯', value: 464, context: '闪的后代', badge: '由经文数字相加', reference: '创世记 11:16-17', note: '34 岁生法勒，之后又活 430 年。' },
  { rank: 12, name: '亚法撒', value: 438, context: '闪的后代', badge: '由经文数字相加', reference: '创世记 11:12-13', note: '35 岁生沙拉，之后又活 403 年。' },
  { rank: 13, name: '沙拉', value: 433, context: '闪的后代', badge: '由经文数字相加', reference: '创世记 11:14-15', note: '30 岁生希伯，之后又活 403 年。' },
  { rank: 14, name: '以诺', value: 365, context: '洪水前族长', badge: '经文明说一生年日', reference: '创世记 5:23-24', note: '经文说神将他取去，没有按通常方式记“死了”。' },
  { rank: 15, name: '法勒', value: 239, context: '闪的后代', badge: '由经文数字相加', reference: '创世记 11:18-19', note: '30 岁生拉吴，之后又活 209 年。' },
  { rank: 16, name: '拉吴', value: 239, context: '闪的后代', badge: '由经文数字相加', reference: '创世记 11:20-21', note: '32 岁生西鹿，之后又活 207 年。' },
  { rank: 17, name: '西鹿', value: 230, context: '闪的后代', badge: '由经文数字相加', reference: '创世记 11:22-23', note: '30 岁生拿鹤，之后又活 200 年。' },
  { rank: 18, name: '他拉', value: 205, context: '亚伯拉罕之父', badge: '经文明说终年', reference: '创世记 11:32' },
  { rank: 19, name: '以撒', value: 180, context: '族长', badge: '经文明说终年', reference: '创世记 35:28' },
  { rank: 20, name: '亚伯拉罕', value: 175, context: '族长', badge: '经文明说一生年日', reference: '创世记 25:7' },
  { rank: 21, name: '拿鹤（他拉之父）', value: 148, context: '闪的后代', badge: '由经文数字相加', reference: '创世记 11:24-25', note: '29 岁生他拉，之后又活 119 年。' },
  { rank: 22, name: '雅各', value: 147, context: '族长／以色列', badge: '经文明说年日', reference: '创世记 47:28' },
  { rank: 23, name: '以实玛利', value: 137, context: '亚伯拉罕之子', badge: '经文明说一生年岁', reference: '创世记 25:17' },
  { rank: 24, name: '利未', value: 137, context: '雅各之子', badge: '经文明说一生岁数', reference: '出埃及记 6:16' },
  { rank: 25, name: '暗兰', value: 137, context: '摩西与亚伦之父', badge: '经文明说一生岁数', reference: '出埃及记 6:20' },
  { rank: 26, name: '哥辖', value: 133, context: '利未之子', badge: '经文明说一生岁数', reference: '出埃及记 6:18' },
  { rank: 27, name: '耶何耶大', value: 130, context: '犹大大祭司', badge: '经文明说死时年龄', reference: '历代志下 24:15' },
  { rank: 28, name: '撒拉', value: 127, context: '族长之妻', badge: '经文明说一生岁数', reference: '创世记 23:1', note: '圣经中少数明确记载寿数的女性。' },
  { rank: 29, name: '亚伦', value: 123, context: '大祭司', badge: '经文明说死时年龄', reference: '民数记 33:39' },
  { rank: 30, name: '摩西', value: 120, context: '先知／领袖', badge: '经文明说死时年龄', reference: '申命记 34:7' },
  { rank: 31, name: '约瑟', value: 110, context: '雅各之子', badge: '经文明说死时年龄', reference: '创世记 50:26' },
  { rank: 32, name: '约书亚', value: 110, context: '以色列领袖', badge: '经文明说死时年龄', reference: '约书亚记 24:29' },
  { rank: 33, name: '以利', value: 98, context: '祭司／士师', badge: '死前明确年龄', reference: '撒母耳记上 4:15,18', note: '15 节记 98 岁，18 节记随即死亡。' }
];

const accessionRanking: RankingRow[] = [
  { rank: 1, name: '约阿施', value: 7, context: '在位 40 年 · 粗略期末年龄 47 岁', badge: '明确', reference: '列王纪下 11:21；12:1' },
  { rank: 2, name: '约西亚', value: 8, context: '在位 31 年 · 粗略期末年龄 39 岁', badge: '明确', reference: '列王纪下 22:1' },
  { rank: 3, name: '玛拿西', value: 12, context: '在位 55 年 · 粗略期末年龄 67 岁', badge: '明确', reference: '列王纪下 21:1' },
  { rank: 4, name: '亚撒利雅／乌西雅', value: 16, context: '在位 52 年 · 粗略期末年龄 68 岁', badge: '明确', reference: '列王纪下 15:2' },
  { rank: 5, name: '约雅斤', value: 18, context: '在位 3 月 · 粗略期末年龄 18.25 岁', badge: '抄本差异', reference: '列王纪下 24:8', note: '历代志下 36:9 作 8 岁，并记作王三个月零十天。', isVariant: true },
  { rank: 6, name: '亚哈斯', value: 20, context: '在位 16 年 · 粗略期末年龄 36 岁', badge: '明确', reference: '列王纪下 16:2' },
  { rank: 7, name: '西底家', value: 21, context: '在位 11 年 · 粗略期末年龄 32 岁', badge: '明确', reference: '列王纪下 24:18' },
  { rank: 8, name: '亚哈谢（犹大王）', value: 22, context: '在位 1 年 · 粗略期末年龄 23 岁', badge: '抄本差异', reference: '列王纪下 8:26', note: '历代志下 22:2 作 42 岁。', isVariant: true },
  { rank: 9, name: '亚们', value: 22, context: '在位 2 年 · 粗略期末年龄 24 岁', badge: '明确', reference: '列王纪下 21:19' },
  { rank: 10, name: '约哈斯', value: 23, context: '在位 3 月 · 粗略期末年龄 23.25 岁', badge: '明确', reference: '列王纪下 23:31' },
  { rank: 11, name: '亚玛谢', value: 25, context: '在位 29 年 · 粗略期末年龄 54 岁', badge: '明确', reference: '列王纪下 14:2' },
  { rank: 12, name: '约坦', value: 25, context: '在位 16 年 · 粗略期末年龄 41 岁', badge: '明确', reference: '列王纪下 15:33' },
  { rank: 13, name: '希西家', value: 25, context: '在位 29 年 · 粗略期末年龄 54 岁', badge: '明确', reference: '列王纪下 18:2' },
  { rank: 14, name: '约雅敬', value: 25, context: '在位 11 年 · 粗略期末年龄 36 岁', badge: '明确', reference: '列王纪下 23:36' },
  { rank: 15, name: '大卫', value: 30, context: '在位 40 年 · 粗略期末年龄 70 岁', badge: '明确', reference: '撒母耳记下 5:4-5', note: '约 70 岁为直接加总，但经文没有一句直接写“大卫享年 70 岁”。' },
  { rank: 16, name: '约兰（犹大王）', value: 32, context: '在位 8 年 · 粗略期末年龄 40 岁', badge: '明确', reference: '列王纪下 8:17' },
  { rank: 17, name: '约沙法', value: 35, context: '在位 25 年 · 粗略期末年龄 60 岁', badge: '明确', reference: '列王纪上 22:42' },
  { rank: 18, name: '伊施波设', value: 40, context: '在位 2 年 · 粗略期末年龄 42 岁', badge: '明确', reference: '撒母耳记下 2:10' },
  { rank: 19, name: '罗波安', value: 41, context: '在位 17 年 · 粗略期末年龄 58 岁', badge: '明确', reference: '列王纪上 14:21' }
];

const lifespanNotes: SourceNote[] = [
  { name: '约伯', value: '140 年', reason: '约伯记 42:16 只说苦难结束后又活 140 年；没有写他此前已经多少岁，因此不能把 140 当作总寿数。', reference: '约伯记 42:16' },
  { name: '大卫', value: '约 70 岁（推算）', reason: '30 岁登基、作王 40 年，通常推算约 70 岁；但圣经没有直接写“大卫享年 70 岁”。', reference: '撒母耳记下 5:4-5；列王纪上 2:10' },
  { name: '伊施波设', value: '约 42 岁（推算）', reason: '40 岁登基、作王 2 年；古代包容计年可能造成误差。', reference: '撒母耳记下 2:10；4:7' },
  { name: '女先知亚拿', value: '84 岁或寡居 84 年', reason: '路加福音 2:37 的语法与译本有分歧。', reference: '路加福音 2:36-37' },
  { name: '耶稣', value: '去世年龄未明说', reason: '常说约 33 岁是根据传道年限推算，不是经文直接给出的年龄。', reference: '路加福音 2:42；3:23' }
];

const accessionNotes: SourceNote[] = [
  lifespanNotes[1],
  lifespanNotes[2],
  { name: '亚哈谢', value: '22 岁／42 岁', reason: '列王纪下作 22 岁，历代志下的马所拉文本作 42 岁；通常视为抄写数字问题。', reference: '列王纪下 8:26；历代志下 22:2' },
  { name: '约雅斤', value: '18 岁／8 岁', reason: '列王纪下作 18 岁；历代志下的马所拉文本作 8 岁。', reference: '列王纪下 24:8；历代志下 36:9' },
  { name: '扫罗', value: '登基年龄无法确定', reason: '撒母耳记上 13:1 的希伯来文本数字残缺，因此不放入确定排行。', reference: '撒母耳记上 13:1；使徒行传 13:21' }
];

const viewCopy = {
  lifespan: {
    title: '圣经人物寿命排名',
    eyebrow: 'LIFESPAN',
    description: '收录经文明确记载的一生年日、去世年龄，或可直接相加得到的总寿数。',
    valueLabel: '寿数',
    notes: lifespanNotes
  },
  accession: {
    title: '君王登基年龄排名',
    eyebrow: 'ACCESSION AGE',
    description: '按经文所记登基年龄由低到高排列；粗略期末年龄仅作计算参考。',
    valueLabel: '登基年龄',
    notes: accessionNotes
  }
} as const;

type BibleAgeRankingsProps = {
  initialView: RankView;
};

function getBarStyle(value: number, maximum: number): CSSProperties {
  return { '--ranking-bar-width': `${Math.max(6, (value / maximum) * 100)}%` } as CSSProperties;
}

function getInitialView(fallback: RankView): RankView {
  if (typeof window === 'undefined') return fallback;
  return new URLSearchParams(window.location.search).get('view') === 'accession' ? 'accession' : 'lifespan';
}

export default function BibleAgeRankings({ initialView }: BibleAgeRankingsProps) {
  const [activeView, setActiveView] = useState<RankView>(() => getInitialView(initialView));
  const rows = activeView === 'lifespan' ? lifespanRanking : accessionRanking;
  const maximum = Math.max(...rows.map((row) => row.value));
  const copy = viewCopy[activeView];

  const selectView = (nextView: RankView) => {
    setActiveView(nextView);
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set('view', nextView);
    window.history.replaceState(null, '', nextUrl);
  };

  return (
    <main className="age-rankings-page">
      <section className="age-rankings-shell" aria-labelledby="age-rankings-title">
        <div className="age-rankings-toolbar">
          <a className="age-rankings-back" href={`${basePath}topics/applications/inspiration-station/theology#bible-people`}>
            返回圣经人物
          </a>
          <p>资料依据：圣经人物年龄排行表</p>
        </div>

        <header className="age-rankings-header">
          <p>{copy.eyebrow}</p>
          <h1 id="age-rankings-title">圣经人物年龄排行</h1>
          <span>{copy.description}</span>
        </header>

        <div className="age-rankings-tabs" aria-label="排行榜类型">
          <button type="button" className={activeView === 'lifespan' ? 'is-selected' : ''} aria-pressed={activeView === 'lifespan'} onClick={() => selectView('lifespan')}>
            圣经寿命排名
          </button>
          <button type="button" className={activeView === 'accession' ? 'is-selected' : ''} aria-pressed={activeView === 'accession'} onClick={() => selectView('accession')}>
            登基年龄排名
          </button>
        </div>

        <section className="age-ranking-card" aria-labelledby="ranking-card-title">
          <div className="age-ranking-card-heading">
            <div>
              <p>{copy.eyebrow}</p>
              <h2 id="ranking-card-title">{copy.title}</h2>
            </div>
            <span>{rows.length} 条记录</span>
          </div>

          <div className="age-ranking-chart" role="list" aria-label={copy.title}>
            {rows.map((row) => (
              <article className="age-ranking-row" role="listitem" key={`${activeView}-${row.name}`}>
                <strong className="age-ranking-place">{row.rank}</strong>
                <div className="age-ranking-person">
                  <h3>{row.name}</h3>
                  <p>{row.context}</p>
                  {row.note ? <small>{row.note}</small> : null}
                </div>
                <div className="age-ranking-measure">
                  <div className="age-ranking-bar" aria-hidden="true"><span style={getBarStyle(row.value, maximum)} /></div>
                  <strong>{row.value} 岁</strong>
                </div>
                <div className="age-ranking-source">
                  <span className={row.isVariant ? 'is-variant' : ''}>{row.badge}</span>
                  <small>{row.reference}</small>
                </div>
              </article>
            ))}
          </div>

          <section className="age-ranking-notes" aria-labelledby="ranking-notes-title">
            <div>
              <p>争议与推算</p>
              <h2 id="ranking-notes-title">阅读时请保留这些口径</h2>
            </div>
            <ul>
              {copy.notes.map((note) => (
                <li key={note.name}>
                  <strong>{note.name} · {note.value}</strong>
                  <p>{note.reason}</p>
                  <small>{note.reference}</small>
                </li>
              ))}
            </ul>
          </section>
        </section>
      </section>
    </main>
  );
}
