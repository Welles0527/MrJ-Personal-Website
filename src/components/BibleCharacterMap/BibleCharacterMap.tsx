import './BibleCharacterMap.css';

import { useMemo, useState, type CSSProperties } from 'react';

const basePath = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
const POSTER_WIDTH = 1024;
const POSTER_HEIGHT = 1536;

type CharacterKind =
  | 'christ'
  | 'patriarch'
  | 'royal'
  | 'prophet'
  | 'woman'
  | 'apostle'
  | 'missionary'
  | 'judge'
  | 'priest'
  | 'ordinary';

type Testament = 'old' | 'center' | 'new';

type Character = {
  id: string;
  name: string;
  x: number;
  y: number;
  kind: CharacterKind;
  testament: Testament;
  era: string;
  role: string;
  summary: string;
  themes: string[];
  scripture: string;
  size?: 'small' | 'normal' | 'major' | 'core';
  promise?: boolean;
  orbit?: boolean;
};

type EraLabel = {
  id: string;
  title: string;
  x: number;
  y: number;
  side: 'old' | 'new';
};

type RelationType = 'promise' | 'discipleship' | 'coworker';

type Relation = {
  id: string;
  from: string;
  to: string;
  type: RelationType;
  path?: string;
};

const oldEraLabels: EraLabel[] = [
  { id: 'creation', title: '创世\n时代', x: 74, y: 288, side: 'old' },
  { id: 'patriarchs', title: '族长\n时代', x: 74, y: 484, side: 'old' },
  { id: 'exodus', title: '出埃及\n时期', x: 74, y: 666, side: 'old' },
  { id: 'judges', title: '士师\n时代', x: 74, y: 848, side: 'old' },
  { id: 'kings', title: '君王\n时代', x: 74, y: 1008, side: 'old' },
  { id: 'prophets', title: '先知\n时代', x: 74, y: 1164, side: 'old' },
  { id: 'return', title: '归回\n时代', x: 74, y: 1304, side: 'old' }
];

const newEraLabels: EraLabel[] = [
  { id: 'gospels', title: '福音\n书', x: 950, y: 316, side: 'new' },
  { id: 'disciples', title: '十二\n门徒', x: 950, y: 620, side: 'new' },
  { id: 'early-church', title: '初代\n教会', x: 950, y: 884, side: 'new' },
  { id: 'letters', title: '宣教与\n书信', x: 950, y: 1162, side: 'new' }
];

const characters: Character[] = [
  {
    id: 'adam',
    name: '亚当',
    x: 172,
    y: 236,
    kind: 'ordinary',
    testament: 'old',
    era: '创世时代',
    role: '人类始祖',
    summary: '创世叙事中的第一人，开启创造、堕落与救赎盼望的线索。',
    themes: ['创造', '堕落', '盼望'],
    scripture: '创世记 1-3章'
  },
  {
    id: 'eve',
    name: '夏娃',
    x: 256,
    y: 236,
    kind: 'woman',
    testament: 'old',
    era: '创世时代',
    role: '人类始祖',
    summary: '创世叙事中的第一位女性，与亚当共同承载人类起源与应许起点。',
    themes: ['起初', '家庭', '应许'],
    scripture: '创世记 2-3章'
  },
  {
    id: 'noah',
    name: '挪亚',
    x: 340,
    y: 236,
    kind: 'ordinary',
    testament: 'old',
    era: '创世时代',
    role: '洪水中的义人',
    summary: '在洪水叙事中蒙恩，与神立约，成为审判之后重新开始的记号。',
    themes: ['方舟', '审判', '立约'],
    scripture: '创世记 6-9章'
  },
  {
    id: 'abraham',
    name: '亚伯拉罕',
    x: 172,
    y: 432,
    kind: 'patriarch',
    testament: 'old',
    era: '族长时代',
    role: '应许之约的承受者',
    summary: '蒙召离开本地本族，成为应许线与信心传统的关键起点。',
    themes: ['应许', '信心', '立约'],
    scripture: '创世记 12-22章',
    size: 'major',
    promise: true
  },
  {
    id: 'isaac',
    name: '以撒',
    x: 256,
    y: 432,
    kind: 'patriarch',
    testament: 'old',
    era: '族长时代',
    role: '应许之子',
    summary: '承接亚伯拉罕之约，使家谱应许继续向前推进。',
    themes: ['承接', '顺服', '应许'],
    scripture: '创世记 21-27章',
    promise: true
  },
  {
    id: 'jacob',
    name: '雅各',
    x: 340,
    y: 432,
    kind: 'patriarch',
    testament: 'old',
    era: '族长时代',
    role: '以色列十二支派之父',
    summary: '后被称为以色列，承接族长线索并形成支派叙事。',
    themes: ['以色列', '支派', '祝福'],
    scripture: '创世记 25-35章',
    promise: true
  },
  {
    id: 'judah',
    name: '犹大',
    x: 256,
    y: 522,
    kind: 'patriarch',
    testament: 'old',
    era: '族长时代',
    role: '君王支派线索',
    summary: '雅各祝福中承载君王权杖的支派线索，连接大卫与弥赛亚盼望。',
    themes: ['支派', '权杖', '家谱'],
    scripture: '创世记 49章',
    promise: true
  },
  {
    id: 'joseph-old',
    name: '约瑟',
    x: 172,
    y: 522,
    kind: 'patriarch',
    testament: 'old',
    era: '族长时代',
    role: '保全家族者',
    summary: '在埃及经历苦难与升高，保全雅各家族并推动出埃及背景形成。',
    themes: ['苦难', '护理', '饶恕'],
    scripture: '创世记 37-50章'
  },
  {
    id: 'moses',
    name: '摩西',
    x: 172,
    y: 620,
    kind: 'prophet',
    testament: 'old',
    era: '出埃及时期',
    role: '出埃及领袖',
    summary: '带领以色列出埃及，领受律法，成为旧约叙事中的核心先知与中保人物。',
    themes: ['拯救', '律法', '旷野'],
    scripture: '出埃及记'
  },
  {
    id: 'aaron',
    name: '亚伦',
    x: 256,
    y: 620,
    kind: 'priest',
    testament: 'old',
    era: '出埃及时期',
    role: '祭司职分代表',
    summary: '与摩西同工，承载祭司体系与会幕敬拜的早期线索。',
    themes: ['祭司', '会幕', '同工'],
    scripture: '出埃及记 28章'
  },
  {
    id: 'joshua',
    name: '约书亚',
    x: 340,
    y: 620,
    kind: 'judge',
    testament: 'old',
    era: '出埃及时期',
    role: '进入应许地的领袖',
    summary: '接续摩西，带领以色列进入并分配应许之地。',
    themes: ['承接', '争战', '应许地'],
    scripture: '约书亚记'
  },
  {
    id: 'deborah',
    name: '底波拉',
    x: 172,
    y: 796,
    kind: 'woman',
    testament: 'old',
    era: '士师时代',
    role: '士师与先知',
    summary: '在士师时代兴起，带领百姓脱离压迫，显出信心与判断。',
    themes: ['士师', '勇气', '得胜'],
    scripture: '士师记 4-5章'
  },
  {
    id: 'gideon',
    name: '基甸',
    x: 256,
    y: 796,
    kind: 'judge',
    testament: 'old',
    era: '士师时代',
    role: '被呼召的士师',
    summary: '在软弱中被呼召，带领以色列经历神主动施行的拯救。',
    themes: ['呼召', '软弱', '拯救'],
    scripture: '士师记 6-8章'
  },
  {
    id: 'ruth',
    name: '路得',
    x: 172,
    y: 884,
    kind: 'woman',
    testament: 'old',
    era: '士师时代',
    role: '忠信与家谱见证',
    summary: '以忠信进入以色列共同体，并成为大卫家谱中的重要女性人物。',
    themes: ['忠信', '归属', '家谱'],
    scripture: '路得记'
  },
  {
    id: 'samuel',
    name: '撒母耳',
    x: 256,
    y: 884,
    kind: 'prophet',
    testament: 'old',
    era: '士师时代',
    role: '士师、先知与膏立者',
    summary: '连接士师与君王时代，膏立扫罗与大卫。',
    themes: ['先知', '膏立', '转折'],
    scripture: '撒母耳记上'
  },
  {
    id: 'saul',
    name: '扫罗',
    x: 172,
    y: 970,
    kind: 'royal',
    testament: 'old',
    era: '君王时代',
    role: '以色列第一位君王',
    summary: '以色列王政开端中的复杂人物，显明王权与顺服之间的张力。',
    themes: ['王权', '顺服', '失落'],
    scripture: '撒母耳记上 9-15章'
  },
  {
    id: 'david',
    name: '大卫',
    x: 256,
    y: 970,
    kind: 'royal',
    testament: 'old',
    era: '君王时代',
    role: '大卫之约的君王',
    summary: '以色列核心君王，承载弥赛亚家谱与国度盼望。',
    themes: ['君王', '诗篇', '弥赛亚盼望'],
    scripture: '撒母耳记下 7章',
    size: 'major',
    promise: true
  },
  {
    id: 'solomon',
    name: '所罗门',
    x: 340,
    y: 970,
    kind: 'royal',
    testament: 'old',
    era: '君王时代',
    role: '智慧与圣殿君王',
    summary: '建造圣殿，象征以色列王国荣光，也显出智慧与败落的张力。',
    themes: ['智慧', '圣殿', '王国'],
    scripture: '列王纪上 1-11章'
  },
  {
    id: 'elijah',
    name: '以利亚',
    x: 172,
    y: 1123,
    kind: 'prophet',
    testament: 'old',
    era: '先知时代',
    role: '呼召百姓归回的先知',
    summary: '在偶像崇拜时代作先知见证，呼召以色列回转归向神。',
    themes: ['先知', '火', '回转'],
    scripture: '列王纪上 17-19章'
  },
  {
    id: 'isaiah',
    name: '以赛亚',
    x: 256,
    y: 1123,
    kind: 'prophet',
    testament: 'old',
    era: '先知时代',
    role: '弥赛亚盼望的先知',
    summary: '以审判与安慰的信息指向受苦仆人与未来救赎盼望。',
    themes: ['圣洁', '安慰', '仆人'],
    scripture: '以赛亚书'
  },
  {
    id: 'jeremiah',
    name: '耶利米',
    x: 172,
    y: 1208,
    kind: 'prophet',
    testament: 'old',
    era: '先知时代',
    role: '新约应许的先知',
    summary: '在国破家亡前后传讲审判与新约盼望。',
    themes: ['审判', '眼泪', '新约'],
    scripture: '耶利米书 31章'
  },
  {
    id: 'daniel',
    name: '但以理',
    x: 256,
    y: 1208,
    kind: 'prophet',
    testament: 'old',
    era: '先知时代',
    role: '被掳中的见证者',
    summary: '在异邦帝国中忠信见证，并承载国度异象。',
    themes: ['异象', '忠信', '国度'],
    scripture: '但以理书'
  },
  {
    id: 'ezra',
    name: '以斯拉',
    x: 172,
    y: 1282,
    kind: 'priest',
    testament: 'old',
    era: '归回时代',
    role: '律法教师',
    summary: '带领归回群体重建律法生活与信仰秩序。',
    themes: ['律法', '归回', '更新'],
    scripture: '以斯拉记'
  },
  {
    id: 'nehemiah',
    name: '尼希米',
    x: 256,
    y: 1282,
    kind: 'ordinary',
    testament: 'old',
    era: '归回时代',
    role: '重建城墙者',
    summary: '推动耶路撒冷城墙重建，体现祷告、治理与群体更新。',
    themes: ['重建', '祷告', '治理'],
    scripture: '尼希米记'
  },
  {
    id: 'esther',
    name: '以斯帖',
    x: 340,
    y: 1282,
    kind: 'woman',
    testament: 'old',
    era: '归回时代',
    role: '保守百姓的王后',
    summary: '在危机中被摆上，成为神保守百姓的关键人物。',
    themes: ['保守', '勇气', '时机'],
    scripture: '以斯帖记'
  },
  {
    id: 'jesus',
    name: '耶稣基督',
    x: 512,
    y: 768,
    kind: 'christ',
    testament: 'center',
    era: '中心',
    role: '应许、救赎与教会的中心',
    summary: '旧约应许在祂里面汇聚，新约见证从祂展开。',
    themes: ['应许', '救赎', '弥赛亚', '教会'],
    scripture: '四福音书',
    size: 'core',
    promise: true
  },
  {
    id: 'mary',
    name: '马利亚',
    x: 686,
    y: 236,
    kind: 'woman',
    testament: 'new',
    era: '福音书',
    role: '耶稣母亲',
    summary: '以顺服回应呼召，见证耶稣降生与早期教会等候。',
    themes: ['顺服', '降生', '等候'],
    scripture: '路加福音 1-2章'
  },
  {
    id: 'joseph-nt',
    name: '约瑟',
    x: 770,
    y: 236,
    kind: 'ordinary',
    testament: 'new',
    era: '福音书',
    role: '耶稣地上家庭的守护者',
    summary: '在耶稣降生叙事中顺服神的引导，保护家庭。',
    themes: ['顺服', '保护', '家庭'],
    scripture: '马太福音 1-2章'
  },
  {
    id: 'john-baptist',
    name: '施洗约翰',
    x: 854,
    y: 236,
    kind: 'prophet',
    testament: 'new',
    era: '福音书',
    role: '预备道路者',
    summary: '呼召悔改，指向那位将要来的基督。',
    themes: ['预备', '悔改', '见证'],
    scripture: '约翰福音 1章'
  },
  {
    id: 'peter',
    name: '彼得',
    x: 686,
    y: 344,
    kind: 'apostle',
    testament: 'new',
    era: '福音书',
    role: '使徒与教会见证者',
    summary: '被耶稣呼召，从软弱到坚固，成为初代教会重要见证人。',
    themes: ['呼召', '见证', '牧养'],
    scripture: '马太福音 16章',
    size: 'major'
  },
  {
    id: 'john',
    name: '约翰',
    x: 770,
    y: 344,
    kind: 'apostle',
    testament: 'new',
    era: '福音书',
    role: '使徒与见证作者',
    summary: '亲近耶稣的门徒之一，见证道成肉身、十字架与复活。',
    themes: ['爱', '见证', '道成肉身'],
    scripture: '约翰福音',
    size: 'major'
  },
  {
    id: 'mary-magdalene',
    name: '抹大拉',
    x: 854,
    y: 344,
    kind: 'woman',
    testament: 'new',
    era: '福音书',
    role: '复活见证人',
    summary: '在福音书中见证主的服事、十字架与复活清晨。',
    themes: ['跟随', '复活', '见证'],
    scripture: '约翰福音 20章'
  },
  {
    id: 'twelve-disciples',
    name: '十二门徒',
    x: 770,
    y: 632,
    kind: 'apostle',
    testament: 'new',
    era: '十二门徒',
    role: '被呼召与差遣的群体',
    summary: '围绕耶稣被呼召、跟随、学习并被差遣，成为复活见证的群体。',
    themes: ['呼召', '跟随', '差遣'],
    scripture: '马太福音 10章',
    size: 'major',
    orbit: true
  },
  {
    id: 'stephen',
    name: '司提反',
    x: 686,
    y: 844,
    kind: 'apostle',
    testament: 'new',
    era: '初代教会',
    role: '初代教会殉道见证人',
    summary: '以智慧与圣灵作见证，成为初代教会重要殉道者。',
    themes: ['见证', '殉道', '圣灵'],
    scripture: '使徒行传 6-7章'
  },
  {
    id: 'philip',
    name: '腓利',
    x: 770,
    y: 844,
    kind: 'apostle',
    testament: 'new',
    era: '初代教会',
    role: '福音传讲者',
    summary: '在撒马利亚和旷野路上作福音见证。',
    themes: ['福音', '引导', '见证'],
    scripture: '使徒行传 8章'
  },
  {
    id: 'barnabas',
    name: '巴拿巴',
    x: 854,
    y: 844,
    kind: 'missionary',
    testament: 'new',
    era: '初代教会',
    role: '劝慰之子与宣教同工',
    summary: '扶持保罗，参与安提阿与外邦宣教。',
    themes: ['劝慰', '同工', '宣教'],
    scripture: '使徒行传 11-15章'
  },
  {
    id: 'paul',
    name: '保罗',
    x: 770,
    y: 1024,
    kind: 'missionary',
    testament: 'new',
    era: '宣教与书信',
    role: '外邦使徒与书信作者',
    summary: '从逼迫者转为使徒，推动外邦宣教并牧养众教会。',
    themes: ['宣教', '恩典', '教会'],
    scripture: '使徒行传 9章',
    size: 'major'
  },
  {
    id: 'timothy',
    name: '提摩太',
    x: 676,
    y: 1107,
    kind: 'missionary',
    testament: 'new',
    era: '宣教与书信',
    role: '保罗年轻同工',
    summary: '与保罗同工，并在教会牧养与传承中承担责任。',
    themes: ['传承', '牧养', '同工'],
    scripture: '提摩太前后书'
  },
  {
    id: 'titus',
    name: '提多',
    x: 860,
    y: 1107,
    kind: 'missionary',
    testament: 'new',
    era: '宣教与书信',
    role: '教会治理同工',
    summary: '参与外邦教会服事，承担教会秩序与牧养任务。',
    themes: ['治理', '牧养', '同工'],
    scripture: '提多书'
  },
  {
    id: 'luke',
    name: '路加',
    x: 770,
    y: 1182,
    kind: 'missionary',
    testament: 'new',
    era: '宣教与书信',
    role: '福音书与使徒行传作者',
    summary: '记录耶稣生平与初代教会扩展，常与保罗行程相连。',
    themes: ['记录', '医治', '宣教'],
    scripture: '路加福音；使徒行传'
  },
  {
    id: 'mark',
    name: '马可',
    x: 680,
    y: 1240,
    kind: 'missionary',
    testament: 'new',
    era: '宣教与书信',
    role: '福音书作者与同工',
    summary: '与初代宣教网络相连，后来成为有益的同工。',
    themes: ['记录', '恢复', '同工'],
    scripture: '马可福音；提摩太后书 4章'
  },
  {
    id: 'aquila',
    name: '亚居拉',
    x: 860,
    y: 1240,
    kind: 'missionary',
    testament: 'new',
    era: '宣教与书信',
    role: '帐棚制造者与同工',
    summary: '与百基拉一同接待、教导并参与宣教网络。',
    themes: ['家庭', '教导', '同工'],
    scripture: '使徒行传 18章'
  },
  {
    id: 'priscilla',
    name: '百基拉',
    x: 770,
    y: 1292,
    kind: 'woman',
    testament: 'new',
    era: '宣教与书信',
    role: '教导与接待的同工',
    summary: '与亚居拉并肩服事，帮助亚波罗更准确明白主道。',
    themes: ['教导', '家庭', '同工'],
    scripture: '使徒行传 18章'
  }
];

const relations: Relation[] = [
  { id: 'promise-abraham-isaac', from: 'abraham', to: 'isaac', type: 'promise', path: 'M 172 432 L 256 432' },
  { id: 'promise-isaac-jacob', from: 'isaac', to: 'jacob', type: 'promise', path: 'M 256 432 L 340 432' },
  { id: 'promise-jacob-judah', from: 'jacob', to: 'judah', type: 'promise', path: 'M 340 432 C 340 476, 300 522, 256 522' },
  { id: 'promise-judah-david', from: 'judah', to: 'david', type: 'promise', path: 'M 256 522 C 400 590, 404 900, 256 970' },
  { id: 'promise-david-jesus', from: 'david', to: 'jesus', type: 'promise', path: 'M 256 970 C 380 946, 430 830, 512 768' },
  { id: 'disciple-jesus-peter', from: 'jesus', to: 'peter', type: 'discipleship' },
  { id: 'disciple-jesus-john', from: 'jesus', to: 'john', type: 'discipleship' },
  { id: 'disciple-jesus-twelve', from: 'jesus', to: 'twelve-disciples', type: 'discipleship' },
  { id: 'disciple-paul-timothy', from: 'paul', to: 'timothy', type: 'discipleship' },
  { id: 'disciple-paul-titus', from: 'paul', to: 'titus', type: 'discipleship' },
  { id: 'coworker-paul-barnabas', from: 'paul', to: 'barnabas', type: 'coworker' },
  { id: 'coworker-paul-luke', from: 'paul', to: 'luke', type: 'coworker' },
  { id: 'coworker-aquila-priscilla', from: 'aquila', to: 'priscilla', type: 'coworker' }
];

const legendItems = [
  { type: 'promise', title: '家谱 / 应许线', detail: '亚伯拉罕 → 以撒 → 雅各 → 犹大 → 大卫 → 耶稣基督' },
  { type: 'discipleship', title: '门徒 / 传承', detail: '跟随、差遣与牧养传递' },
  { type: 'coworker', title: '同工 / 关联', detail: '初代教会与宣教网络' },
  { type: 'conflict', title: '冲突 / 对立', detail: '仅在图例中说明' }
] as const;

const kindLabel: Record<CharacterKind, string> = {
  christ: '中心',
  patriarch: '族长',
  royal: '君王',
  prophet: '先知',
  woman: '女性',
  apostle: '使徒',
  missionary: '宣教',
  judge: '士师',
  priest: '祭司',
  ordinary: '人物'
};

const characterById = new Map(characters.map((character) => [character.id, character]));

function getPointStyle(item: Pick<Character, 'x' | 'y'>): CSSProperties {
  return {
    '--x': `${(item.x / POSTER_WIDTH) * 100}%`,
    '--y': `${(item.y / POSTER_HEIGHT) * 100}%`
  } as CSSProperties;
}

function makeCurve(relation: Relation) {
  if (relation.path) {
    return relation.path;
  }

  const from = characterById.get(relation.from);
  const to = characterById.get(relation.to);

  if (!from || !to) {
    return '';
  }

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const bend = relation.type === 'coworker' ? 0.28 : 0.42;

  return `M ${from.x} ${from.y} C ${from.x + dx * bend} ${from.y + dy * 0.08}, ${to.x - dx * bend} ${to.y - dy * 0.08}, ${to.x} ${to.y}`;
}

function getRelatedIds(focusId: string) {
  return relations.reduce((set, relation) => {
    if (relation.from === focusId) {
      set.add(relation.to);
    }

    if (relation.to === focusId) {
      set.add(relation.from);
    }

    return set;
  }, new Set<string>());
}

function matchCharacter(character: Character, query: string, testamentFilter: string, kindFilter: string) {
  const normalizedQuery = query.trim().toLowerCase();
  const matchesQuery =
    !normalizedQuery ||
    [character.name, character.era, character.role, character.scripture, ...character.themes].some((item) =>
      item.toLowerCase().includes(normalizedQuery)
    );
  const matchesTestament = testamentFilter === 'all' || character.testament === testamentFilter;
  const matchesKind = kindFilter === 'all' || character.kind === kindFilter;

  return matchesQuery && matchesTestament && matchesKind;
}

function getCharacterNameLines(character: Character) {
  if (character.kind === 'christ' || character.orbit || character.name.length <= 2) {
    return [character.name];
  }

  const firstLineLength = character.name.length > 4 ? 3 : 2;
  return [character.name.slice(0, firstLineLength), character.name.slice(firstLineLength)];
}

function CharacterNode({
  character,
  focusId,
  relatedIds,
  searchMatchedIds,
  onHover,
  onLeave,
  onSelect
}: {
  character: Character;
  focusId: string;
  relatedIds: Set<string>;
  searchMatchedIds: Set<string>;
  onHover: (id: string) => void;
  onLeave: () => void;
  onSelect: (character: Character) => void;
}) {
  const isActive = focusId === character.id;
  const isRelated = relatedIds.has(character.id);
  const hasSearch = searchMatchedIds.size > 0;
  const isSearchMatch = searchMatchedIds.has(character.id);
  const isDimmed = Boolean((focusId && !isActive && !isRelated) || (hasSearch && !isSearchMatch && !isActive && !isRelated));

  return (
    <button
      type="button"
      className={[
        'poster-node',
        `kind-${character.kind}`,
        `size-${character.size ?? 'normal'}`,
        character.promise ? 'is-promise-node' : '',
        character.orbit ? 'is-orbit-node' : '',
        isActive ? 'is-active' : '',
        isRelated ? 'is-related' : '',
        isSearchMatch ? 'is-search-match' : '',
        isDimmed ? 'is-dimmed' : ''
      ].join(' ')}
      style={getPointStyle(character)}
      onMouseEnter={() => onHover(character.id)}
      onMouseLeave={onLeave}
      onFocus={() => onHover(character.id)}
      onBlur={onLeave}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(character);
      }}
      aria-label={`查看${character.name}`}
    >
      <span className="poster-node-medal">
        <span className="poster-node-label poster-node-label-full">
          {getCharacterNameLines(character).map((line) => (
            <span key={line} className="poster-node-line">{line}</span>
          ))}
        </span>
        <span className="poster-node-label poster-node-label-short" aria-hidden="true">
          {character.name.slice(0, 2)}
        </span>
        {character.kind === 'christ' && <small>弥赛亚</small>}
      </span>
    </button>
  );
}

function RelationLines({ focusId, relatedIds }: { focusId: string; relatedIds: Set<string> }) {
  const focusCharacter = characterById.get(focusId);

  return (
    <svg className="poster-relations" viewBox={`0 0 ${POSTER_WIDTH} ${POSTER_HEIGHT}`} aria-hidden="true">
      <defs>
        <filter id="posterGoldGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {relations.map((relation) => {
        const active = focusId
          ? relation.from === focusId || relation.to === focusId || Boolean(focusCharacter?.promise && relation.type === 'promise')
          : false;
        const related =
          focusId && (relatedIds.has(relation.from) || relatedIds.has(relation.to) || relation.from === focusId || relation.to === focusId);
        const muted = Boolean(focusId && !active && !related);

        return (
          <path
            key={relation.id}
            className={[
              'poster-relation',
              `line-${relation.type}`,
              active ? 'is-active' : '',
              muted ? 'is-muted' : ''
            ].join(' ')}
            d={makeCurve(relation)}
          />
        );
      })}
    </svg>
  );
}

function InfoPanel({
  selectedCharacter,
  filteredCharacters,
  query,
  testamentFilter,
  kindFilter,
  onQueryChange,
  onTestamentChange,
  onKindChange,
  onSelect,
  onClose
}: {
  selectedCharacter: Character | null;
  filteredCharacters: Character[];
  query: string;
  testamentFilter: string;
  kindFilter: string;
  onQueryChange: (value: string) => void;
  onTestamentChange: (value: string) => void;
  onKindChange: (value: string) => void;
  onSelect: (character: Character) => void;
  onClose: () => void;
}) {
  const character = selectedCharacter ?? characterById.get('jesus')!;

  return (
    <aside className="query-panel" aria-label="人物图谱查询">
      <div className="query-panel-heading">
        <div className="query-panel-title-row">
          <p>人物图谱查询</p>
          <button type="button" onClick={onClose}>关闭</button>
        </div>
        <h2>{character.name}</h2>
        <span>{character.role}</span>
      </div>

      <label className="search-box">
        <span>搜索人物 / 时代 / 主题</span>
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="例如：大卫、先知、宣教"
        />
      </label>

      <div className="filter-row" aria-label="筛选">
        <button type="button" className={testamentFilter === 'all' ? 'is-selected' : ''} onClick={() => onTestamentChange('all')}>
          全部
        </button>
        <button type="button" className={testamentFilter === 'old' ? 'is-selected' : ''} onClick={() => onTestamentChange('old')}>
          旧约
        </button>
        <button type="button" className={testamentFilter === 'new' ? 'is-selected' : ''} onClick={() => onTestamentChange('new')}>
          新约
        </button>
      </div>

      <div className="filter-row filter-kind" aria-label="类型筛选">
        {[
          ['all', '全部类型'],
          ['royal', '君王'],
          ['prophet', '先知'],
          ['woman', '女性'],
          ['missionary', '宣教']
        ].map(([value, label]) => (
          <button key={value} type="button" className={kindFilter === value ? 'is-selected' : ''} onClick={() => onKindChange(value)}>
            {label}
          </button>
        ))}
      </div>

      <section className="character-detail">
        <dl>
          <div>
            <dt>时代</dt>
            <dd>{character.era}</dd>
          </div>
          <div>
            <dt>类型</dt>
            <dd>{kindLabel[character.kind]}</dd>
          </div>
          <div>
            <dt>主题</dt>
            <dd>{character.themes.join(' / ')}</dd>
          </div>
          <div>
            <dt>经文线索</dt>
            <dd>{character.scripture}</dd>
          </div>
          <div>
            <dt>说明</dt>
            <dd>{character.summary}</dd>
          </div>
        </dl>
      </section>

      <section className="result-list">
        <div>
          <h3>查询结果</h3>
          <span>{filteredCharacters.length} 人</span>
        </div>
        <div className="result-scroll">
          {filteredCharacters.map((item) => (
            <button key={item.id} type="button" onClick={() => onSelect(item)} className={item.id === character.id ? 'is-selected' : ''}>
              <strong>{item.name}</strong>
              <span>{item.era} · {kindLabel[item.kind]}</span>
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}

export default function BibleCharacterMap() {
  const [activeId, setActiveId] = useState('');
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [testamentFilter, setTestamentFilter] = useState('all');
  const [kindFilter, setKindFilter] = useState('all');
  const selectedId = selectedCharacter?.id ?? '';
  const focusId = activeId || selectedId;
  const relatedIds = useMemo(() => getRelatedIds(focusId), [focusId]);
  const filteredCharacters = useMemo(
    () => characters.filter((character) => matchCharacter(character, query, testamentFilter, kindFilter)),
    [kindFilter, query, testamentFilter]
  );
  const searchMatchedIds = useMemo(() => {
    if (!panelOpen || (!query.trim() && testamentFilter === 'all' && kindFilter === 'all')) {
      return new Set<string>();
    }

    return new Set(filteredCharacters.map((character) => character.id));
  }, [filteredCharacters, kindFilter, panelOpen, query, testamentFilter]);

  const selectCharacter = (character: Character) => {
    setSelectedCharacter(character);
    setPanelOpen(true);
  };

  const closePanel = () => {
    setPanelOpen(false);
    setSelectedCharacter(null);
  };

  return (
    <section className="character-map-page">
      <main className="poster-experience">
        <nav className="map-toolbar" aria-label="图谱操作">
          <a className="character-map-back" href={`${basePath}topics/applications/inspiration-station/theology#bible-people`}>
            返回圣经人物
          </a>
          <button type="button" className="query-trigger" onClick={() => setPanelOpen(true)}>
            人物查询
          </button>
        </nav>

        <section className="poster-card" aria-label="圣经人物图谱海报">
          <div
            className="poster-map"
            onMouseLeave={() => setActiveId('')}
            onClick={closePanel}
          >
            <div className="poster-title">
              <h1>圣经人物图谱</h1>
              <p>旧约与新约重要人物关系示意</p>
            </div>

            <div className="testament-seal old-seal">旧约人物</div>
            <div className="testament-seal new-seal">新约人物</div>

            {[...oldEraLabels, ...newEraLabels].map((label) => (
              <div key={label.id} className={`era-plaque ${label.side}`} style={getPointStyle(label)}>
                {label.title.split('\n').map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </div>
            ))}

            <RelationLines focusId={focusId} relatedIds={relatedIds} />

            {characters.map((character) => (
              <CharacterNode
                key={character.id}
                character={character}
                focusId={focusId}
                relatedIds={relatedIds}
                searchMatchedIds={searchMatchedIds}
                onHover={setActiveId}
                onLeave={() => setActiveId('')}
                onSelect={selectCharacter}
              />
            ))}

            <footer className="poster-legend" aria-label="关系图例">
              {legendItems.map((item) => (
                <article key={item.type}>
                  <div>
                    <h3>{item.title}</h3>
                  </div>
                </article>
              ))}
            </footer>
          </div>
        </section>
      </main>

      {panelOpen && (
        <div className="query-layer">
          <button type="button" className="query-backdrop" onClick={closePanel} aria-label="关闭人物查询" />
          <InfoPanel
            selectedCharacter={selectedCharacter}
            filteredCharacters={filteredCharacters}
            query={query}
            testamentFilter={testamentFilter}
            kindFilter={kindFilter}
            onQueryChange={setQuery}
            onTestamentChange={setTestamentFilter}
            onKindChange={setKindFilter}
            onSelect={selectCharacter}
            onClose={closePanel}
          />
        </div>
      )}
    </section>
  );
}
