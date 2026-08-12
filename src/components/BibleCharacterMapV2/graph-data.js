/**
 * @typedef {"person" | "event" | "place" | "book" | "group"} EntityType
 * @typedef {"exact" | "approximate" | "range" | "unknown"} TimePrecision
 * @typedef {"explicit" | "inferred" | "traditional" | "disputed"} EvidenceLevel
 *
 * @typedef {Object} GraphEntity
 * @property {string} id
 * @property {EntityType} type
 * @property {string} nameZh
 * @property {string} nameEn
 * @property {string[]} aliases
 * @property {string[]} eraIds
 * @property {{start: number | null, end: number | null, display: string, precision: TimePrecision}} time
 * @property {string} summary
 * @property {string[]} tags
 * @property {string | null} image
 * @property {string[]} scriptures
 * @property {Record<string, string>} facts
 *
 * @typedef {Object} GraphRelation
 * @property {string} id
 * @property {string} sourceId
 * @property {string} targetId
 * @property {keyof typeof RELATION_TYPES} type
 * @property {string} label
 * @property {"directed" | "undirected"} direction
 * @property {string[]} scriptures
 * @property {EvidenceLevel} evidenceLevel
 * @property {string} note
 */

export const ERAS = [
  { id: "creation", label: "创世时期", range: "4000-3000 BC", start: -4000, end: -3000, color: "#dcebd8" },
  { id: "flood", label: "洪水时期", range: "2400-2100 BC", start: -2400, end: -2100, color: "#d9e9ef" },
  { id: "patriarchs", label: "列祖时期", range: "2100-1876 BC", start: -2100, end: -1876, color: "#f6dfd3" },
  { id: "exodus", label: "出埃及时期", range: "1526-1406 BC", start: -1526, end: -1406, color: "#dfe9d4" },
  { id: "judges", label: "征服迦南时期", range: "1406-1350 BC", start: -1406, end: -1350, color: "#f8e8bd" },
  { id: "tribes", label: "士师时期", range: "1350-1050 BC", start: -1350, end: -1050, color: "#f4d7cb" },
  { id: "united", label: "统一王国时期", range: "1050-930 BC", start: -1050, end: -930, color: "#e5edf4" },
  { id: "divided", label: "分裂王国时期", range: "930-586 BC", start: -930, end: -586, color: "#f9e5b8" },
  { id: "exile", label: "被掳时期", range: "586-538 BC", start: -586, end: -538, color: "#e5d9ef" },
  { id: "return", label: "归回时期", range: "538-400 BC", start: -538, end: -400, color: "#dbe9f4" },
  { id: "new-testament", label: "新约时期", range: "4 BC-100 AD", start: -4, end: 100, color: "#eadcf2" },
];

export const RELATION_TYPES = {
  family: { label: "家庭关系", color: "#f08a24", dash: "0" },
  kingship: { label: "君王/继承", color: "#58a05a", dash: "0" },
  mentor: { label: "师徒/属灵关系", color: "#8653db", dash: "0" },
  peer: { label: "同工/好友", color: "#3778c2", dash: "0" },
  conflict: { label: "冲突/敌对", color: "#ef4444", dash: "7 6" },
  participation: { label: "事件参与", color: "#ec4b87", dash: "0" },
  record: { label: "经文记载", color: "#3d77c7", dash: "4 5" },
  other: { label: "其他关系", color: "#7e8fa7", dash: "3 5" },
};

export const EVIDENCE_LABELS = {
  explicit: "明文记载",
  inferred: "合理推断",
  traditional: "传统观点",
  disputed: "存在争议",
};

/** @type {GraphEntity[]} */
export const GRAPH_ENTITIES = [
  {
    id: "david", type: "person", nameZh: "大卫", nameEn: "David", aliases: ["耶西的儿子", "以色列王"],
    eraIds: ["united"], time: { start: -1040, end: -970, display: "约公元前1040年 - 约970年", precision: "approximate" },
    summary: "以色列联合王国第二位王，诗人、战士，也是弥赛亚家谱中的关键人物。", tags: ["君王", "诗人", "战士"],
    image: "/portraits/david.png", scriptures: ["撒母耳记上 16-31章", "撒母耳记下 1-24章", "诗篇", "历代志上 10-29章"],
    facts: { 职位: "以色列王", 父亲: "耶西", 母亲: "撒母耳记未具名", 主要成就: "统一以色列各支派，定都耶路撒冷" },
  },
  {
    id: "samuel", type: "person", nameZh: "撒母耳", nameEn: "Samuel", aliases: ["先知撒母耳"],
    eraIds: ["tribes", "united"], time: { start: -1105, end: -1015, display: "约公元前1105年 - 1015年", precision: "approximate" },
    summary: "以色列最后一位士师，也是膏立扫罗与大卫的先知。", tags: ["先知", "士师"], image: "/portraits/samuel.png",
    scriptures: ["撒母耳记上 1-25章"], facts: { 身份: "先知、士师", 母亲: "哈拿", 关联: "膏立大卫" },
  },
  {
    id: "nathan", type: "person", nameZh: "拿单", nameEn: "Nathan", aliases: ["先知拿单"],
    eraIds: ["united"], time: { start: -1010, end: -950, display: "约公元前11-10世纪", precision: "range" },
    summary: "大卫王宫廷中的先知，曾直面指出大卫的罪。", tags: ["先知", "顾问"], image: "/portraits/nathan.png",
    scriptures: ["撒母耳记下 7章", "撒母耳记下 12章"], facts: { 身份: "先知", 事奉时期: "大卫王与所罗门王早期", 关联: "劝诫大卫" },
  },
  {
    id: "jesse", type: "person", nameZh: "耶西", nameEn: "Jesse", aliases: ["伯利恒人耶西"],
    eraIds: ["tribes", "united"], time: { start: -1100, end: -1010, display: "约公元前11世纪", precision: "approximate" },
    summary: "伯利恒人，大卫的父亲，弥赛亚家谱的重要先祖。", tags: ["家族", "伯利恒"], image: "/portraits/jesse.png",
    scriptures: ["撒母耳记上 16章", "路得记 4:22"], facts: { 身份: "伯利恒人", 儿子: "大卫等八子", 家系: "犹大支派" },
  },
  {
    id: "saul", type: "person", nameZh: "扫罗", nameEn: "Saul", aliases: ["基士的儿子"],
    eraIds: ["united"], time: { start: -1075, end: -1010, display: "约公元前1075年 - 1010年", precision: "approximate" },
    summary: "以色列联合王国第一位王，后期与大卫关系决裂。", tags: ["君王", "战士"], image: "/portraits/saul.png",
    scriptures: ["撒母耳记上 9-31章"], facts: { 职位: "以色列第一位王", 父亲: "基士", 儿子: "约拿单" },
  },
  {
    id: "jonathan", type: "person", nameZh: "约拿单", nameEn: "Jonathan", aliases: ["扫罗之子"],
    eraIds: ["united"], time: { start: -1055, end: -1010, display: "约公元前11世纪", precision: "approximate" },
    summary: "扫罗的长子，也是大卫忠诚的盟友与挚友。", tags: ["王子", "战士", "好友"], image: "/portraits/jonathan.png",
    scriptures: ["撒母耳记上 13-31章"], facts: { 身份: "以色列王子", 父亲: "扫罗", 挚友: "大卫" },
  },
  {
    id: "michal", type: "person", nameZh: "米甲", nameEn: "Michal", aliases: ["扫罗之女"],
    eraIds: ["united"], time: { start: -1045, end: -990, display: "约公元前11-10世纪", precision: "range" },
    summary: "扫罗的女儿，大卫的妻子，曾帮助大卫逃离扫罗。", tags: ["王女", "配偶"], image: "/portraits/michal.png",
    scriptures: ["撒母耳记上 18-19章", "撒母耳记下 6章"], facts: { 父亲: "扫罗", 配偶: "大卫", 关联: "帮助大卫逃亡" },
  },
  {
    id: "bathsheba", type: "person", nameZh: "拔示巴", nameEn: "Bathsheba", aliases: ["拔书亚", "乌利亚之妻"],
    eraIds: ["united"], time: { start: -1030, end: -960, display: "约公元前11-10世纪", precision: "range" },
    summary: "大卫的妻子、所罗门的母亲，晚年参与王位继承安排。", tags: ["王后", "母亲"], image: "/portraits/bathsheba.png",
    scriptures: ["撒母耳记下 11-12章", "列王纪上 1-2章"], facts: { 配偶: "大卫", 儿子: "所罗门", 父亲: "以连" },
  },
  {
    id: "solomon", type: "person", nameZh: "所罗门", nameEn: "Solomon", aliases: ["耶底底亚"],
    eraIds: ["united"], time: { start: -990, end: -931, display: "约公元前990年 - 931年", precision: "approximate" },
    summary: "大卫与拔示巴之子，以智慧和建造圣殿闻名。", tags: ["君王", "智慧", "圣殿"], image: "/portraits/solomon.png",
    scriptures: ["列王纪上 1-11章", "历代志下 1-9章"], facts: { 职位: "以色列王", 父亲: "大卫", 母亲: "拔示巴" },
  },
  {
    id: "absalom", type: "person", nameZh: "押沙龙", nameEn: "Absalom", aliases: ["大卫之子押沙龙"],
    eraIds: ["united"], time: { start: -1015, end: -975, display: "约公元前11-10世纪", precision: "range" },
    summary: "大卫的儿子，因叛乱夺权而与父亲兵戎相见。", tags: ["王子", "叛乱"], image: "/portraits/absalom.png",
    scriptures: ["撒母耳记下 13-19章"], facts: { 身份: "以色列王子", 父亲: "大卫", 结局: "叛乱中阵亡" },
  },
  {
    id: "goliath", type: "person", nameZh: "歌利亚", nameEn: "Goliath", aliases: ["迦特人歌利亚"],
    eraIds: ["united"], time: { start: null, end: -1025, display: "约公元前11世纪", precision: "approximate" },
    summary: "非利士迦特的勇士，在以拉谷之战中被年轻的大卫击败。", tags: ["非利士", "战士"], image: "/portraits/goliath.png",
    scriptures: ["撒母耳记上 17章"], facts: { 身份: "非利士勇士", 来自: "迦特", 对手: "大卫" },
  },
  {
    id: "elah-battle", type: "event", nameZh: "以拉谷之战", nameEn: "Battle of the Valley of Elah", aliases: ["大卫击败歌利亚"],
    eraIds: ["united"], time: { start: -1025, end: -1025, display: "约公元前11世纪", precision: "approximate" },
    summary: "以色列与非利士人在以拉谷对阵，大卫击败歌利亚。", tags: ["战役", "非利士"], image: null,
    scriptures: ["撒母耳记上 17章"], facts: { 地点: "以拉谷", 阵营: "以色列与非利士", 结果: "大卫击败歌利亚" },
  },
  {
    id: "book-1sam17", type: "book", nameZh: "撒母耳记上 17章", nameEn: "1 Samuel 17", aliases: ["大卫与歌利亚"],
    eraIds: ["united"], time: { start: -1025, end: -1025, display: "记载统一王国早期事件", precision: "approximate" },
    summary: "记载大卫在以拉谷迎战并击败歌利亚的核心经文章节。", tags: ["历史书", "经文"], image: null,
    scriptures: ["撒母耳记上 17:1-58"], facts: { 卷别: "旧约历史书", 章节: "第17章", 主题: "大卫与歌利亚" },
  },
];

/** @type {GraphRelation[]} */
export const GRAPH_RELATIONS = [
  { id: "samuel-david", sourceId: "samuel", targetId: "david", type: "mentor", label: "膏立", direction: "directed", scriptures: ["撒母耳记上 16:13"], evidenceLevel: "explicit", note: "撒母耳奉耶和华之命膏立大卫。" },
  { id: "nathan-david", sourceId: "nathan", targetId: "david", type: "mentor", label: "劝诫", direction: "directed", scriptures: ["撒母耳记下 12:7-14"], evidenceLevel: "explicit", note: "拿单以比喻指出大卫的罪。" },
  { id: "jesse-david", sourceId: "jesse", targetId: "david", type: "family", label: "父亲", direction: "directed", scriptures: ["撒母耳记上 16:10-13"], evidenceLevel: "explicit", note: "耶西是大卫的父亲。" },
  { id: "michal-david", sourceId: "michal", targetId: "david", type: "family", label: "妻子", direction: "undirected", scriptures: ["撒母耳记上 18:27"], evidenceLevel: "explicit", note: "米甲是大卫的第一位妻子。" },
  { id: "bathsheba-david", sourceId: "bathsheba", targetId: "david", type: "family", label: "妻子", direction: "undirected", scriptures: ["撒母耳记下 11:27"], evidenceLevel: "explicit", note: "拔示巴后来成为大卫的妻子。" },
  { id: "david-solomon", sourceId: "david", targetId: "solomon", type: "family", label: "父亲", direction: "directed", scriptures: ["撒母耳记下 12:24"], evidenceLevel: "explicit", note: "所罗门是大卫与拔示巴的儿子。" },
  { id: "david-absalom", sourceId: "david", targetId: "absalom", type: "family", label: "父亲", direction: "directed", scriptures: ["撒母耳记下 3:3"], evidenceLevel: "explicit", note: "押沙龙是大卫的第三个儿子。" },
  { id: "jonathan-david", sourceId: "jonathan", targetId: "david", type: "peer", label: "好友", direction: "undirected", scriptures: ["撒母耳记上 18:1-4"], evidenceLevel: "explicit", note: "约拿单与大卫立约，彼此相爱。" },
  { id: "saul-david", sourceId: "saul", targetId: "david", type: "conflict", label: "敌对", direction: "directed", scriptures: ["撒母耳记上 18:8-12"], evidenceLevel: "explicit", note: "扫罗因嫉妒而追杀大卫。" },
  { id: "saul-jonathan", sourceId: "saul", targetId: "jonathan", type: "family", label: "父亲", direction: "directed", scriptures: ["撒母耳记上 14:49"], evidenceLevel: "explicit", note: "约拿单是扫罗的儿子。" },
  { id: "david-goliath", sourceId: "david", targetId: "goliath", type: "conflict", label: "击败", direction: "directed", scriptures: ["撒母耳记上 17:49-51"], evidenceLevel: "explicit", note: "大卫用甩石机弦击倒歌利亚。" },
  { id: "david-elah", sourceId: "david", targetId: "elah-battle", type: "participation", label: "参与", direction: "directed", scriptures: ["撒母耳记上 17:40-50"], evidenceLevel: "explicit", note: "大卫代表以色列迎战歌利亚。" },
  { id: "goliath-elah", sourceId: "goliath", targetId: "elah-battle", type: "participation", label: "参与", direction: "directed", scriptures: ["撒母耳记上 17:4-11"], evidenceLevel: "explicit", note: "歌利亚代表非利士阵营挑战以色列。" },
  { id: "elah-book", sourceId: "elah-battle", targetId: "book-1sam17", type: "record", label: "记载", direction: "directed", scriptures: ["撒母耳记上 17:1-58"], evidenceLevel: "explicit", note: "该事件完整记载于撒母耳记上第17章。" },
];

export const ENTITY_BY_ID = Object.fromEntries(GRAPH_ENTITIES.map((entity) => [entity.id, entity]));
