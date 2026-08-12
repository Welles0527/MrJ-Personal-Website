import {
  ERAS,
  RELATION_TYPES,
  EVIDENCE_LABELS,
  GRAPH_ENTITIES as DAVID_ENTITIES,
  GRAPH_RELATIONS as DAVID_RELATIONS,
} from "./graph-data.js";
import { withBasePath } from "./asset-paths.js";

export { ERAS, RELATION_TYPES, EVIDENCE_LABELS };

export const CORE_PERSON_IDS = [
  "adam",
  "eve",
  "noah",
  "abraham",
  "sarah",
  "isaac",
  "rebekah",
  "jacob",
  "judah",
  "joseph",
  "moses",
  "aaron",
  "joshua",
  "deborah",
  "gideon",
  "ruth",
  "samuel",
  "saul",
  "david",
  "jonathan",
  "solomon",
  "elijah",
  "elisha",
  "isaiah",
  "jeremiah",
  "daniel",
  "esther",
  "ezra",
  "nehemiah",
  "job",
  "mary",
  "joseph-nazareth",
  "john-baptist",
  "jesus",
  "peter",
  "andrew",
  "james",
  "john",
  "matthew",
  "mary-magdalene",
  "stephen",
  "philip",
  "barnabas",
  "paul",
  "timothy",
  "titus",
  "luke",
  "mark",
];

const person = ({ id, nameZh, nameEn, aliases = [], eraIds, start, end, display, summary, tags, image, scriptures, facts }) => ({
  id,
  type: "person",
  nameZh,
  nameEn,
  aliases,
  eraIds,
  time: { start, end, display, precision: "approximate" },
  summary,
  tags,
  image,
  scriptures,
  facts,
});

const context = ({ id, type, nameZh, nameEn, aliases = [], eraIds, start, end = start, display, summary, tags, scriptures, facts }) => ({
  id,
  type,
  nameZh,
  nameEn,
  aliases,
  eraIds,
  time: { start, end, display, precision: start === end ? "approximate" : "range" },
  summary,
  tags,
  image: null,
  scriptures,
  facts,
});

const relation = (id, sourceId, targetId, type, label, scriptures, note, options = {}) => ({
  id,
  sourceId,
  targetId,
  type,
  label,
  direction: options.direction ?? "directed",
  scriptures,
  evidenceLevel: options.evidenceLevel ?? "explicit",
  note,
});

const CORE_PEOPLE = [
  person({
    id: "adam", nameZh: "亚当", nameEn: "Adam", aliases: ["首先的人"], eraIds: ["creation"], start: -4000, end: -3000, display: "创世时期（传统年代框架）",
    summary: "《创世记》记载的首先之人，是人类共同始祖叙事的核心人物。", tags: ["始祖", "伊甸园"], image: "/portraits/adam.png",
    scriptures: ["创世记 1-5章", "罗马书 5:12-21"], facts: { 身份: "首先的人", 配偶: "夏娃", 居所: "伊甸园" },
  }),
  person({
    id: "noah", nameZh: "挪亚", nameEn: "Noah", aliases: ["拉麦之子"], eraIds: ["flood"], start: -2400, end: -2300, display: "洪水时期（约数）",
    summary: "在洪水叙事中建造方舟、保存家族，并领受彩虹之约的义人。", tags: ["义人", "方舟", "立约"], image: "/portraits/noah.png",
    scriptures: ["创世记 5-10章", "希伯来书 11:7"], facts: { 父亲: "拉麦", 儿子: "闪、含、雅弗", 关联: "方舟与洪水" },
  }),
  person({
    id: "abraham", nameZh: "亚伯拉罕", nameEn: "Abraham", aliases: ["亚伯兰", "信心之父"], eraIds: ["patriarchs"], start: -2100, end: -1900, display: "约公元前21-20世纪",
    summary: "以色列列祖之一，因信回应呼召并领受关于土地、后裔和万国的应许。", tags: ["列祖", "信心", "立约"], image: "/portraits/abraham.png",
    scriptures: ["创世记 11-25章", "罗马书 4章"], facts: { 原名: "亚伯兰", 配偶: "撒拉", 儿子: "以撒" },
  }),
  person({
    id: "joseph", nameZh: "约瑟", nameEn: "Joseph", aliases: ["雅各之子约瑟"], eraIds: ["patriarchs"], start: -1915, end: -1805, display: "约公元前19世纪",
    summary: "雅各之子，被卖到埃及后成为治理者，并在饥荒中保存家族。", tags: ["列祖", "埃及", "治理者"], image: "/portraits/joseph.png",
    scriptures: ["创世记 30:22-24", "创世记 37-50章"], facts: { 父亲: "雅各", 母亲: "拉结", 职位: "埃及治理者" },
  }),
  person({
    id: "moses", nameZh: "摩西", nameEn: "Moses", aliases: ["暗兰之子"], eraIds: ["exodus"], start: -1526, end: -1406, display: "约公元前1526-1406年",
    summary: "带领以色列人出埃及、在西奈山领受律法的先知与领袖。", tags: ["先知", "领袖", "律法"], image: "/portraits/moses.png",
    scriptures: ["出埃及记", "利未记", "民数记", "申命记"], facts: { 身份: "先知与领袖", 兄长: "亚伦", 姐姐: "米利暗" },
  }),
  person({
    id: "elijah", nameZh: "以利亚", nameEn: "Elijah", aliases: ["提斯比人以利亚"], eraIds: ["divided"], start: -910, end: -850, display: "约公元前9世纪",
    summary: "北国时期的重要先知，在迦密山见证耶和华的权能。", tags: ["先知", "北国", "迦密山"], image: "/portraits/samuel.png",
    scriptures: ["列王纪上 17-19章", "列王纪下 1-2章"], facts: { 身份: "先知", 活动区域: "北国以色列", 门徒: "以利沙" },
  }),
  person({
    id: "jesus", nameZh: "耶稣", nameEn: "Jesus", aliases: ["拿撒勒人耶稣", "基督"], eraIds: ["new-testament"], start: -4, end: 30, display: "约公元前4年 - 公元30年",
    summary: "新约福音书的中心人物，宣讲天国，并经历受难与复活。", tags: ["基督", "教师", "救主"], image: "/portraits/nathan.png",
    scriptures: ["马太福音", "马可福音", "路加福音", "约翰福音"], facts: { 出生地: "伯利恒", 成长地: "拿撒勒", 主要活动: "加利利与犹太" },
  }),
  person({
    id: "peter", nameZh: "彼得", nameEn: "Peter", aliases: ["西门彼得", "矶法"], eraIds: ["new-testament"], start: 1, end: 64, display: "约公元1-64年",
    summary: "耶稣十二门徒之一，早期耶路撒冷教会的重要使徒。", tags: ["使徒", "门徒", "渔夫"], image: "/portraits/jonathan.png",
    scriptures: ["四福音书", "使徒行传 1-12章", "彼得前书"], facts: { 原名: "西门", 兄弟: "安得烈", 身份: "十二使徒之一" },
  }),
  person({
    id: "paul", nameZh: "保罗", nameEn: "Paul", aliases: ["扫罗", "大数人扫罗"], eraIds: ["new-testament"], start: 5, end: 67, display: "约公元5-67年",
    summary: "归信后向外邦人宣讲福音、建立教会并撰写多封新约书信的使徒。", tags: ["使徒", "宣教士", "书信作者"], image: "/portraits/absalom.png",
    scriptures: ["使徒行传 9-28章", "罗马书至腓利门书"], facts: { 出生地: "大数", 身份: "外邦人的使徒", 原名: "扫罗" },
  }),
];

const EXPANDED_PEOPLE = [
  person({ id: "eve", nameZh: "夏娃", nameEn: "Eve", aliases: ["众生之母"], eraIds: ["creation"], start: -4000, end: -3000, display: "创世时期（传统年代框架）", summary: "《创世记》记载的首先的女人，与亚当共同生活在伊甸园。", tags: ["始祖", "伊甸园"], image: "/portraits/michal.png", scriptures: ["创世记 2:18-25", "创世记 3章"], facts: { 身份: "首先的女人", 配偶: "亚当", 称号: "众生之母" } }),
  person({ id: "sarah", nameZh: "撒拉", nameEn: "Sarah", aliases: ["撒莱"], eraIds: ["patriarchs"], start: -2065, end: -1928, display: "约公元前21-20世纪", summary: "亚伯拉罕的妻子、以撒的母亲，与亚伯拉罕一同领受应许。", tags: ["列祖", "应许"], image: "/portraits/bathsheba.png", scriptures: ["创世记 11:29-23:20", "希伯来书 11:11"], facts: { 原名: "撒莱", 配偶: "亚伯拉罕", 儿子: "以撒" } }),
  person({ id: "isaac", nameZh: "以撒", nameEn: "Isaac", aliases: ["应许之子"], eraIds: ["patriarchs"], start: -2066, end: -1886, display: "约公元前21-19世纪", summary: "亚伯拉罕与撒拉之子，以色列列祖之一，也是雅各与以扫的父亲。", tags: ["列祖", "应许"], image: "/portraits/jesse.png", scriptures: ["创世记 21-35章"], facts: { 父亲: "亚伯拉罕", 母亲: "撒拉", 配偶: "利百加" } }),
  person({ id: "rebekah", nameZh: "利百加", nameEn: "Rebekah", aliases: ["彼土利之女"], eraIds: ["patriarchs"], start: -2030, end: -1880, display: "约公元前20-19世纪", summary: "以撒的妻子、雅各与以扫的母亲，在列祖家族叙事中居于关键位置。", tags: ["列祖", "家庭"], image: "/portraits/michal.png", scriptures: ["创世记 24-27章"], facts: { 父亲: "彼土利", 配偶: "以撒", 儿子: "以扫、雅各" } }),
  person({ id: "jacob", nameZh: "雅各", nameEn: "Jacob", aliases: ["以色列"], eraIds: ["patriarchs"], start: -2006, end: -1859, display: "约公元前20-19世纪", summary: "以撒之子，后名以色列；十二个儿子的家族发展为以色列十二支派。", tags: ["列祖", "以色列"], image: "/portraits/abraham.png", scriptures: ["创世记 25-49章"], facts: { 父亲: "以撒", 别名: "以色列", 儿子: "十二支派先祖" } }),
  person({ id: "judah", nameZh: "犹大", nameEn: "Judah", aliases: ["雅各之子犹大"], eraIds: ["patriarchs"], start: -1900, end: -1800, display: "约公元前19世纪", summary: "雅各的第四子，犹大支派的先祖；王权应许与大卫家系由此展开。", tags: ["支派", "家谱"], image: "/portraits/david.png", scriptures: ["创世记 29:35", "创世记 49:8-12", "路得记 4:18-22"], facts: { 父亲: "雅各", 母亲: "利亚", 后裔: "大卫家系" } }),
  person({ id: "aaron", nameZh: "亚伦", nameEn: "Aaron", aliases: ["大祭司亚伦"], eraIds: ["exodus"], start: -1529, end: -1407, display: "约公元前16-15世纪", summary: "摩西的哥哥、以色列首任大祭司，在出埃及与旷野时期协助摩西。", tags: ["祭司", "出埃及"], image: "/portraits/aaron.png", scriptures: ["出埃及记 4:14-16", "出埃及记 28章", "民数记 20:22-29"], facts: { 兄弟: "摩西", 职分: "大祭司", 姐姐: "米利暗" } }),
  person({ id: "joshua", nameZh: "约书亚", nameEn: "Joshua", aliases: ["嫩的儿子约书亚"], eraIds: ["exodus", "judges"], start: -1500, end: -1375, display: "约公元前15-14世纪", summary: "摩西的助手与继承者，带领以色列人进入迦南。", tags: ["领袖", "征服迦南"], image: "/portraits/jonathan.png", scriptures: ["出埃及记 17:8-16", "民数记 27:18-23", "约书亚记"], facts: { 父亲: "嫩", 师长: "摩西", 使命: "带领进入迦南" } }),
  person({ id: "deborah", nameZh: "底波拉", nameEn: "Deborah", aliases: ["女先知底波拉"], eraIds: ["tribes"], start: -1250, end: -1170, display: "约公元前13-12世纪", summary: "士师时期的女先知与士师，召集巴拉抵抗西西拉。", tags: ["士师", "先知"], image: "/portraits/michal.png", scriptures: ["士师记 4-5章"], facts: { 身份: "女先知、士师", 同工: "巴拉", 对手: "西西拉" } }),
  person({ id: "gideon", nameZh: "基甸", nameEn: "Gideon", aliases: ["耶路巴力"], eraIds: ["tribes"], start: -1200, end: -1120, display: "约公元前12世纪", summary: "士师时期蒙召带领少数勇士击败米甸人的士师。", tags: ["士师", "勇士"], image: "/portraits/goliath.png", scriptures: ["士师记 6-8章"], facts: { 别名: "耶路巴力", 父亲: "约阿施", 对手: "米甸人" } }),
  person({ id: "ruth", nameZh: "路得", nameEn: "Ruth", aliases: ["摩押女子路得"], eraIds: ["tribes"], start: -1150, end: -1070, display: "约公元前12-11世纪", summary: "忠于拿俄米并归入以色列的摩押女子，成为大卫的曾祖母。", tags: ["信实", "家谱"], image: "/portraits/bathsheba.png", scriptures: ["路得记", "马太福音 1:5"], facts: { 婆婆: "拿俄米", 配偶: "波阿斯", 后裔: "大卫" } }),
  person({ id: "elisha", nameZh: "以利沙", nameEn: "Elisha", aliases: ["沙法的儿子"], eraIds: ["divided"], start: -890, end: -800, display: "约公元前9世纪", summary: "以利亚的门徒与继承者，在北国以色列继续先知事奉。", tags: ["先知", "北国"], image: "/portraits/samuel.png", scriptures: ["列王纪上 19:19-21", "列王纪下 2-13章"], facts: { 师长: "以利亚", 父亲: "沙法", 活动区域: "北国以色列" } }),
  person({ id: "isaiah", nameZh: "以赛亚", nameEn: "Isaiah", aliases: ["亚摩斯的儿子以赛亚"], eraIds: ["divided"], start: -760, end: -680, display: "约公元前8-7世纪", summary: "在犹大多位君王时期事奉的先知，宣告审判、盼望与弥赛亚应许。", tags: ["先知", "犹大"], image: "/portraits/nathan.png", scriptures: ["以赛亚书 1:1", "以赛亚书 6章", "以赛亚书 40-55章"], facts: { 父亲: "亚摩斯", 活动地: "耶路撒冷", 书卷: "以赛亚书" } }),
  person({ id: "jeremiah", nameZh: "耶利米", nameEn: "Jeremiah", aliases: ["希勒家的儿子"], eraIds: ["divided", "exile"], start: -650, end: -570, display: "约公元前7-6世纪", summary: "犹大亡国前后的先知，呼吁悔改并宣告新约的盼望。", tags: ["先知", "被掳"], image: "/portraits/nathan.png", scriptures: ["耶利米书 1章", "耶利米书 31:31-34"], facts: { 父亲: "希勒家", 家乡: "亚拿突", 书卷: "耶利米书" } }),
  person({ id: "daniel", nameZh: "但以理", nameEn: "Daniel", aliases: ["伯提沙撒"], eraIds: ["exile"], start: -620, end: -530, display: "约公元前7-6世纪", summary: "被掳到巴比伦后在多朝宫廷任职，并持守信仰的犹太人。", tags: ["先知", "被掳", "异象"], image: "/portraits/joseph.png", scriptures: ["但以理书 1-12章"], facts: { 别名: "伯提沙撒", 活动地: "巴比伦", 同伴: "哈拿尼雅、米沙利、亚撒利雅" } }),
  person({ id: "esther", nameZh: "以斯帖", nameEn: "Esther", aliases: ["哈大沙"], eraIds: ["return"], start: -500, end: -430, display: "约公元前5世纪", summary: "波斯王后，在民族危机中为犹太人代求并促成拯救。", tags: ["王后", "勇气"], image: "/portraits/michal.png", scriptures: ["以斯帖记"], facts: { 原名: "哈大沙", 养父: "末底改", 身份: "波斯王后" } }),
  person({ id: "ezra", nameZh: "以斯拉", nameEn: "Ezra", aliases: ["文士以斯拉"], eraIds: ["return"], start: -500, end: -430, display: "约公元前5世纪", summary: "归回时期的祭司与文士，教导律法并推动群体更新。", tags: ["文士", "祭司", "归回"], image: "/portraits/samuel.png", scriptures: ["以斯拉记 7-10章", "尼希米记 8章"], facts: { 身份: "祭司、文士", 使命: "教导律法", 活动地: "耶路撒冷" } }),
  person({ id: "nehemiah", nameZh: "尼希米", nameEn: "Nehemiah", aliases: ["哈迦利亚的儿子"], eraIds: ["return"], start: -480, end: -410, display: "约公元前5世纪", summary: "波斯王酒政，回到耶路撒冷主持重建城墙并推动群体改革。", tags: ["省长", "重建"], image: "/portraits/jonathan.png", scriptures: ["尼希米记 1-13章"], facts: { 父亲: "哈迦利亚", 职分: "酒政、犹大省长", 工程: "重建城墙" } }),
  person({ id: "job", nameZh: "约伯", nameEn: "Job", aliases: ["乌斯人约伯"], eraIds: ["patriarchs"], start: -2000, end: -1500, display: "年代不详（传统置于列祖时期）", summary: "乌斯地的义人，在巨大苦难中与朋友辩论并寻求神的回答。", tags: ["智慧文学", "苦难"], image: "/portraits/abraham.png", scriptures: ["约伯记 1-42章"], facts: { 居所: "乌斯地", 身份: "完全正直的人", 主题: "苦难与信仰" } }),
  person({ id: "mary", nameZh: "马利亚", nameEn: "Mary", aliases: ["耶稣的母亲马利亚"], eraIds: ["new-testament"], start: -20, end: 45, display: "约公元前1世纪末至公元1世纪", summary: "耶稣的母亲，在福音书的降生叙事与早期门徒群体中出现。", tags: ["耶稣母亲", "门徒"], image: "/portraits/bathsheba.png", scriptures: ["路加福音 1-2章", "约翰福音 19:25-27", "使徒行传 1:14"], facts: { 配偶: "约瑟", 儿子: "耶稣", 家乡: "拿撒勒" } }),
  person({ id: "joseph-nazareth", nameZh: "约瑟", nameEn: "Joseph of Nazareth", aliases: ["拿撒勒的约瑟", "马利亚的丈夫"], eraIds: ["new-testament"], start: -25, end: 20, display: "约公元前1世纪末至公元1世纪初", summary: "马利亚的丈夫，照料童年耶稣的义人和木匠。", tags: ["义人", "木匠"], image: "/portraits/jesse.png", scriptures: ["马太福音 1-2章", "路加福音 2章"], facts: { 配偶: "马利亚", 职业: "木匠", 居所: "拿撒勒" } }),
  person({ id: "john-baptist", nameZh: "施洗约翰", nameEn: "John the Baptist", aliases: ["撒迦利亚的儿子约翰"], eraIds: ["new-testament"], start: -5, end: 29, display: "约公元前5年至公元29年", summary: "在旷野宣讲悔改并为耶稣施洗的先知性人物。", tags: ["先知", "施洗"], image: "/portraits/goliath.png", scriptures: ["马太福音 3章", "路加福音 1章", "约翰福音 1:19-36"], facts: { 父亲: "撒迦利亚", 母亲: "以利沙伯", 使命: "预备主的道路" } }),
  person({ id: "andrew", nameZh: "安得烈", nameEn: "Andrew", aliases: ["西门彼得的兄弟"], eraIds: ["new-testament"], start: 1, end: 60, display: "公元1世纪", summary: "耶稣十二使徒之一、彼得的兄弟，最早跟从耶稣的门徒之一。", tags: ["使徒", "渔夫"], image: "/portraits/jonathan.png", scriptures: ["约翰福音 1:35-42", "马可福音 1:16-18"], facts: { 兄弟: "彼得", 职业: "渔夫", 身份: "十二使徒之一" } }),
  person({ id: "james", nameZh: "雅各", nameEn: "James son of Zebedee", aliases: ["西庇太的儿子雅各", "大雅各"], eraIds: ["new-testament"], start: 1, end: 44, display: "公元1世纪", summary: "耶稣十二使徒之一、约翰的兄弟，属于最亲近的三位门徒。", tags: ["使徒", "门徒"], image: "/portraits/saul.png", scriptures: ["马可福音 1:19-20", "马可福音 5:37", "使徒行传 12:2"], facts: { 父亲: "西庇太", 兄弟: "约翰", 身份: "十二使徒之一" } }),
  person({ id: "john", nameZh: "约翰", nameEn: "John", aliases: ["使徒约翰", "西庇太的儿子约翰"], eraIds: ["new-testament"], start: 1, end: 95, display: "公元1世纪", summary: "耶稣十二使徒之一、雅各的兄弟，在福音书与早期教会中具有重要地位。", tags: ["使徒", "见证人"], image: "/portraits/jonathan.png", scriptures: ["马可福音 1:19-20", "约翰福音 19:26-27", "使徒行传 3-4章"], facts: { 父亲: "西庇太", 兄弟: "雅各", 身份: "十二使徒之一" } }),
  person({ id: "matthew", nameZh: "马太", nameEn: "Matthew", aliases: ["利未", "税吏马太"], eraIds: ["new-testament"], start: 1, end: 70, display: "公元1世纪", summary: "蒙耶稣呼召离开税关、成为十二使徒之一的税吏。", tags: ["使徒", "税吏"], image: "/portraits/joseph.png", scriptures: ["马太福音 9:9-13", "马太福音 10:3"], facts: { 别名: "利未", 原职业: "税吏", 身份: "十二使徒之一" } }),
  person({ id: "mary-magdalene", nameZh: "抹大拉的马利亚", nameEn: "Mary Magdalene", aliases: ["抹大拉马利亚"], eraIds: ["new-testament"], start: 1, end: 60, display: "公元1世纪", summary: "跟随耶稣的女门徒，也是福音书中复活清晨的重要见证人。", tags: ["门徒", "复活见证"], image: "/portraits/michal.png", scriptures: ["路加福音 8:1-3", "约翰福音 20:1-18"], facts: { 来自: "抹大拉", 身份: "耶稣的门徒", 见证: "空墓与复活" } }),
  person({ id: "stephen", nameZh: "司提反", nameEn: "Stephen", aliases: ["殉道者司提反"], eraIds: ["new-testament"], start: 1, end: 34, display: "公元1世纪", summary: "耶路撒冷教会选立的七人之一，成为《使徒行传》记载的首位殉道者。", tags: ["执事", "殉道者"], image: "/portraits/nathan.png", scriptures: ["使徒行传 6-7章"], facts: { 身份: "七人之一", 特点: "满有信心和圣灵", 结局: "殉道" } }),
  person({ id: "philip", nameZh: "腓利", nameEn: "Philip the Evangelist", aliases: ["传福音的腓利"], eraIds: ["new-testament"], start: 1, end: 70, display: "公元1世纪", summary: "耶路撒冷教会七人之一，后来在撒马利亚和旷野传福音。", tags: ["传福音者", "执事"], image: "/portraits/jonathan.png", scriptures: ["使徒行传 6:1-6", "使徒行传 8章", "使徒行传 21:8"], facts: { 身份: "七人之一、传福音者", 活动地: "撒马利亚、凯撒利亚", 事迹: "向埃提阿伯太监传讲" } }),
  person({ id: "barnabas", nameZh: "巴拿巴", nameEn: "Barnabas", aliases: ["约瑟", "劝慰子"], eraIds: ["new-testament"], start: 1, end: 65, display: "公元1世纪", summary: "早期教会领袖和宣教同工，接纳保罗并与他开展首次宣教旅程。", tags: ["宣教士", "同工"], image: "/portraits/jesse.png", scriptures: ["使徒行传 4:36-37", "使徒行传 9:26-27", "使徒行传 13-15章"], facts: { 原名: "约瑟", 出身: "塞浦路斯利未人", 同工: "保罗、马可" } }),
  person({ id: "timothy", nameZh: "提摩太", nameEn: "Timothy", aliases: ["保罗属灵的儿子"], eraIds: ["new-testament"], start: 17, end: 80, display: "公元1世纪", summary: "路司得的年轻同工，长期参与保罗的宣教与教会牧养。", tags: ["同工", "牧者"], image: "/portraits/solomon.png", scriptures: ["使徒行传 16:1-5", "提摩太前书 1:2", "提摩太后书"], facts: { 母亲: "友尼基", 外祖母: "罗以", 师长: "保罗" } }),
  person({ id: "titus", nameZh: "提多", nameEn: "Titus", aliases: ["保罗的同伴"], eraIds: ["new-testament"], start: 15, end: 80, display: "公元1世纪", summary: "保罗信任的外邦同工，受托处理哥林多事务并在克里特设立长老。", tags: ["同工", "牧者"], image: "/portraits/saul.png", scriptures: ["加拉太书 2:1-3", "哥林多后书 7-8章", "提多书 1:4-5"], facts: { 出身: "希腊人", 师长: "保罗", 事奉地: "克里特" } }),
  person({ id: "luke", nameZh: "路加", nameEn: "Luke", aliases: ["亲爱的医生"], eraIds: ["new-testament"], start: 1, end: 80, display: "公元1世纪", summary: "保罗的同工和医生，传统上被视为《路加福音》与《使徒行传》的作者。", tags: ["医生", "作者", "同工"], image: "/portraits/joseph.png", scriptures: ["歌罗西书 4:14", "腓利门书 24", "提摩太后书 4:11"], facts: { 职业: "医生", 同工: "保罗", 传统关联: "路加福音、使徒行传" } }),
  person({ id: "mark", nameZh: "马可", nameEn: "Mark", aliases: ["约翰马可"], eraIds: ["new-testament"], start: 10, end: 75, display: "公元1世纪", summary: "巴拿巴的亲属，参与早期宣教并后来成为保罗和彼得的同工。", tags: ["同工", "作者"], image: "/portraits/jonathan.png", scriptures: ["使徒行传 12:12", "使徒行传 13:5-13", "提摩太后书 4:11", "彼得前书 5:13"], facts: { 别名: "约翰马可", 亲属: "巴拿巴", 同工: "彼得、保罗" } }),
];

const CONTEXT_ENTITIES = [
  context({ id: "creation-event", type: "event", nameZh: "创造", nameEn: "Creation", eraIds: ["creation"], start: -4000, display: "创世之初", summary: "神创造天地与人类的创世叙事。", tags: ["创世", "受造"], scriptures: ["创世记 1-2章"], facts: { 主旨: "天地与人类受造" } }),
  context({ id: "fall-event", type: "event", nameZh: "人类堕落", nameEn: "The Fall", eraIds: ["creation"], start: -4000, display: "创世之初", summary: "亚当与夏娃违背命令、离开伊甸园的叙事。", tags: ["试探", "罪"], scriptures: ["创世记 3章"], facts: { 地点: "伊甸园" } }),
  context({ id: "eden", type: "place", nameZh: "伊甸园", nameEn: "Garden of Eden", eraIds: ["creation"], start: -4000, display: "创世之初", summary: "创世记中亚当与夏娃最初居住的园子。", tags: ["园子", "创世"], scriptures: ["创世记 2-3章"], facts: { 性质: "创世叙事地点" } }),
  context({ id: "first-family", type: "group", nameZh: "始祖家庭", nameEn: "First Family", eraIds: ["creation"], start: -4000, end: -3000, display: "创世时期", summary: "亚当、夏娃及其后裔所构成的最早家庭叙事。", tags: ["家庭", "始祖"], scriptures: ["创世记 4-5章"], facts: { 成员: "亚当、夏娃及其后裔" } }),
  context({ id: "book-genesis-early", type: "book", nameZh: "创世记 1-5章", nameEn: "Genesis 1-5", eraIds: ["creation"], start: -4000, end: -3000, display: "记载创世时期", summary: "记载创造、堕落与早期人类世系。", tags: ["摩西五经", "创世"], scriptures: ["创世记 1:1-5:32"], facts: { 卷别: "摩西五经" } }),

  context({ id: "flood-event", type: "event", nameZh: "大洪水", nameEn: "The Flood", eraIds: ["flood"], start: -2350, display: "洪水时期（约数）", summary: "挪亚一家进入方舟并经过洪水的核心事件。", tags: ["洪水", "方舟"], scriptures: ["创世记 6-8章"], facts: { 结果: "挪亚一家得以保存" } }),
  context({ id: "ararat", type: "place", nameZh: "亚拉腊山地", nameEn: "Mountains of Ararat", eraIds: ["flood"], start: -2350, display: "洪水时期（约数）", summary: "洪水消退后方舟停靠的山地。", tags: ["山地", "方舟"], scriptures: ["创世记 8:4"], facts: { 关联: "方舟停靠" } }),
  context({ id: "noah-family", type: "group", nameZh: "挪亚一家", nameEn: "Noah's Family", eraIds: ["flood"], start: -2400, end: -2250, display: "洪水时期", summary: "挪亚、妻子、三个儿子及儿媳组成的家庭。", tags: ["家庭", "方舟"], scriptures: ["创世记 7:7"], facts: { 成员数: "八人" } }),
  context({ id: "book-genesis-flood", type: "book", nameZh: "创世记 6-9章", nameEn: "Genesis 6-9", eraIds: ["flood"], start: -2350, display: "记载洪水时期", summary: "记载方舟、洪水与洪水后的立约。", tags: ["摩西五经", "洪水"], scriptures: ["创世记 6:1-9:29"], facts: { 卷别: "摩西五经" } }),

  context({ id: "abraham-call", type: "event", nameZh: "蒙召与立约", nameEn: "Call and Covenant", eraIds: ["patriarchs"], start: -2090, display: "约公元前21世纪", summary: "亚伯拉罕离开本地并领受应许。", tags: ["呼召", "立约"], scriptures: ["创世记 12:1-3", "创世记 15章"], facts: { 起点: "吾珥与哈兰", 目的地: "迦南" } }),
  context({ id: "moriah-event", type: "event", nameZh: "献以撒", nameEn: "Binding of Isaac", eraIds: ["patriarchs"], start: -2020, display: "约公元前21-20世纪", summary: "亚伯拉罕在摩利亚地经历信心试验。", tags: ["信心", "试验"], scriptures: ["创世记 22章"], facts: { 地点: "摩利亚地" } }),
  context({ id: "canaan", type: "place", nameZh: "迦南", nameEn: "Canaan", eraIds: ["patriarchs"], start: -2100, end: -1876, display: "列祖时期", summary: "亚伯拉罕蒙召前往并寄居的应许之地。", tags: ["应许之地", "列祖"], scriptures: ["创世记 12:5-9"], facts: { 关联: "亚伯拉罕寄居" } }),
  context({ id: "covenant-family", type: "group", nameZh: "应许家族", nameEn: "Covenant Family", eraIds: ["patriarchs"], start: -2100, end: -1800, display: "列祖时期", summary: "由亚伯拉罕、以撒、雅各及其后裔展开的家族。", tags: ["家族", "应许"], scriptures: ["创世记 17:1-8"], facts: { 主要世系: "亚伯拉罕、以撒、雅各" } }),
  context({ id: "book-genesis-patriarchs", type: "book", nameZh: "创世记 12-25章", nameEn: "Genesis 12-25", eraIds: ["patriarchs"], start: -2100, end: -1900, display: "记载列祖时期", summary: "集中记载亚伯拉罕的蒙召、旅程与立约。", tags: ["摩西五经", "列祖"], scriptures: ["创世记 12:1-25:11"], facts: { 主角: "亚伯拉罕" } }),

  context({ id: "joseph-egypt", type: "event", nameZh: "被卖到埃及", nameEn: "Joseph Sold into Egypt", eraIds: ["patriarchs"], start: -1898, display: "约公元前19世纪", summary: "约瑟被兄长卖出，随后被带到埃及。", tags: ["埃及", "苦难"], scriptures: ["创世记 37章"], facts: { 起点: "迦南", 终点: "埃及" } }),
  context({ id: "famine-reunion", type: "event", nameZh: "饥荒中团聚", nameEn: "Family Reunion in Famine", eraIds: ["patriarchs"], start: -1876, display: "约公元前19世纪", summary: "约瑟在饥荒中与兄长相认，并接全家到埃及。", tags: ["饥荒", "和好"], scriptures: ["创世记 42-47章"], facts: { 地点: "埃及" } }),
  context({ id: "egypt", type: "place", nameZh: "埃及", nameEn: "Egypt", eraIds: ["patriarchs", "exodus"], start: -1900, end: -1400, display: "列祖至出埃及时期", summary: "约瑟任职、以色列人寄居并后来离开的地区。", tags: ["帝国", "寄居地"], scriptures: ["创世记 39-50章", "出埃及记 1-14章"], facts: { 关联人物: "约瑟、摩西" } }),
  context({ id: "tribes-israel", type: "group", nameZh: "以色列十二支派", nameEn: "Twelve Tribes of Israel", eraIds: ["patriarchs"], start: -1900, end: -1800, display: "列祖时期", summary: "由雅各众子家族发展而来的十二支派。", tags: ["支派", "家族"], scriptures: ["创世记 49章"], facts: { 祖先: "雅各的十二个儿子" } }),
  context({ id: "book-genesis-joseph", type: "book", nameZh: "创世记 37-50章", nameEn: "Genesis 37-50", eraIds: ["patriarchs"], start: -1900, end: -1800, display: "记载约瑟时期", summary: "记载约瑟从被卖到治理埃及并与家人团聚。", tags: ["摩西五经", "约瑟"], scriptures: ["创世记 37:1-50:26"], facts: { 主角: "约瑟" } }),

  context({ id: "exodus-event", type: "event", nameZh: "出埃及", nameEn: "The Exodus", eraIds: ["exodus"], start: -1446, display: "约公元前15世纪", summary: "摩西带领以色列人离开埃及的核心事件。", tags: ["拯救", "逾越节"], scriptures: ["出埃及记 5-15章"], facts: { 起点: "埃及", 领袖: "摩西" } }),
  context({ id: "sinai-covenant", type: "event", nameZh: "西奈立约", nameEn: "Sinai Covenant", eraIds: ["exodus"], start: -1446, display: "约公元前15世纪", summary: "以色列人在西奈山领受诫命并与神立约。", tags: ["律法", "立约"], scriptures: ["出埃及记 19-24章"], facts: { 地点: "西奈山" } }),
  context({ id: "sinai", type: "place", nameZh: "西奈山", nameEn: "Mount Sinai", eraIds: ["exodus"], start: -1446, display: "出埃及时期", summary: "摩西领受律法、以色列人立约的山地。", tags: ["山地", "律法"], scriptures: ["出埃及记 19章"], facts: { 关联: "十诫与立约" } }),
  context({ id: "israel-people", type: "group", nameZh: "出埃及的以色列人", nameEn: "Israelites of the Exodus", eraIds: ["exodus"], start: -1446, end: -1406, display: "出埃及时期", summary: "在摩西带领下离开埃及并行经旷野的群体。", tags: ["以色列", "旷野"], scriptures: ["出埃及记 12:31-42"], facts: { 领袖: "摩西" } }),
  context({ id: "book-torah", type: "book", nameZh: "出埃及记—申命记", nameEn: "Exodus-Deuteronomy", eraIds: ["exodus"], start: -1526, end: -1406, display: "记载出埃及时期", summary: "记载摩西的呼召、出埃及、旷野与律法传统。", tags: ["摩西五经", "律法"], scriptures: ["出埃及记", "利未记", "民数记", "申命记"], facts: { 卷别: "摩西五经" } }),

  context({ id: "carmel-event", type: "event", nameZh: "迦密山对决", nameEn: "Contest on Mount Carmel", eraIds: ["divided"], start: -870, display: "约公元前9世纪", summary: "以利亚在迦密山与巴力先知公开对决。", tags: ["先知", "对决"], scriptures: ["列王纪上 18章"], facts: { 地点: "迦密山" } }),
  context({ id: "transfiguration", type: "event", nameZh: "登山变像", nameEn: "Transfiguration", eraIds: ["new-testament"], start: 29, display: "约公元29年", summary: "耶稣登山变像，摩西与以利亚显现并与他谈话。", tags: ["福音书", "显荣"], scriptures: ["马太福音 17:1-8"], facts: { 参与者: "耶稣、摩西、以利亚及三位门徒" } }),
  context({ id: "carmel", type: "place", nameZh: "迦密山", nameEn: "Mount Carmel", eraIds: ["divided"], start: -870, display: "分裂王国时期", summary: "以利亚与巴力先知对决的山地。", tags: ["山地", "北国"], scriptures: ["列王纪上 18:19-40"], facts: { 关联: "迦密山对决" } }),
  context({ id: "northern-kingdom", type: "group", nameZh: "北国以色列", nameEn: "Northern Kingdom of Israel", eraIds: ["divided"], start: -930, end: -722, display: "公元前930-722年", summary: "以利亚主要事奉所在的北方王国。", tags: ["王国", "以色列"], scriptures: ["列王纪上 12章以后"], facts: { 首都: "撒马利亚（后期）" } }),
  context({ id: "book-kings-elijah", type: "book", nameZh: "列王纪上 17章—列王纪下 2章", nameEn: "1 Kings 17-2 Kings 2", eraIds: ["divided"], start: -910, end: -850, display: "记载以利亚时期", summary: "集中记载以利亚的事奉与升天。", tags: ["历史书", "先知"], scriptures: ["列王纪上 17-19章", "列王纪下 1-2章"], facts: { 主角: "以利亚" } }),

  context({ id: "crucifixion", type: "event", nameZh: "十字架受难", nameEn: "Crucifixion", eraIds: ["new-testament"], start: 30, display: "约公元30年", summary: "耶稣在耶路撒冷被钉十字架。", tags: ["受难", "耶路撒冷"], scriptures: ["马太福音 27章", "约翰福音 19章"], facts: { 地点: "各各他" } }),
  context({ id: "resurrection", type: "event", nameZh: "复活", nameEn: "Resurrection", eraIds: ["new-testament"], start: 30, display: "约公元30年", summary: "福音书记载耶稣受难后第三日复活。", tags: ["复活", "福音"], scriptures: ["马太福音 28章", "约翰福音 20章"], facts: { 时间: "七日的第一日" } }),
  context({ id: "jerusalem", type: "place", nameZh: "耶路撒冷", nameEn: "Jerusalem", eraIds: ["new-testament"], start: -4, end: 70, display: "新约时期", summary: "耶稣受难复活与早期教会活动的核心城市。", tags: ["圣城", "犹太"], scriptures: ["路加福音 24章", "使徒行传 1-8章"], facts: { 关联: "圣殿与早期教会" } }),
  context({ id: "disciples", type: "group", nameZh: "十二门徒", nameEn: "The Twelve Disciples", eraIds: ["new-testament"], start: 27, end: 30, display: "约公元27-30年", summary: "耶稣拣选、教导并差遣的核心门徒群体。", tags: ["门徒", "使徒"], scriptures: ["马可福音 3:13-19"], facts: { 人数: "十二人" } }),
  context({ id: "book-gospels", type: "book", nameZh: "四福音书", nameEn: "The Four Gospels", eraIds: ["new-testament"], start: -4, end: 30, display: "记载耶稣生平", summary: "从四个见证角度记载耶稣的事工、受难与复活。", tags: ["新约", "福音书"], scriptures: ["马太福音", "马可福音", "路加福音", "约翰福音"], facts: { 卷数: "四卷" } }),

  context({ id: "peter-call", type: "event", nameZh: "彼得蒙召", nameEn: "Calling of Peter", eraIds: ["new-testament"], start: 27, display: "约公元27年", summary: "彼得离开渔网跟从耶稣，成为门徒。", tags: ["呼召", "门徒"], scriptures: ["马太福音 4:18-20", "路加福音 5:1-11"], facts: { 地点: "加利利海" } }),
  context({ id: "pentecost", type: "event", nameZh: "五旬节", nameEn: "Pentecost", eraIds: ["new-testament"], start: 30, display: "约公元30年", summary: "圣灵降临，彼得向聚集的人宣讲。", tags: ["圣灵", "教会"], scriptures: ["使徒行传 2章"], facts: { 地点: "耶路撒冷" } }),
  context({ id: "apostles", type: "group", nameZh: "早期使徒群体", nameEn: "Early Apostles", eraIds: ["new-testament"], start: 30, end: 65, display: "公元1世纪", summary: "在耶路撒冷及各地见证福音的使徒群体。", tags: ["使徒", "教会"], scriptures: ["使徒行传 1-15章"], facts: { 代表人物: "彼得、约翰、雅各、保罗" } }),
  context({ id: "book-acts-peter", type: "book", nameZh: "使徒行传 1-12章与彼得前书", nameEn: "Acts 1-12 and 1 Peter", eraIds: ["new-testament"], start: 30, end: 64, display: "记载早期教会", summary: "记载彼得在早期教会的事奉，并保存其书信劝勉。", tags: ["新约", "使徒"], scriptures: ["使徒行传 1-12章", "彼得前书"], facts: { 主角: "彼得" } }),

  context({ id: "damascus-conversion", type: "event", nameZh: "大马士革归信", nameEn: "Damascus Conversion", eraIds: ["new-testament"], start: 34, display: "约公元34年", summary: "扫罗在前往大马士革途中见到异象并归信。", tags: ["归信", "呼召"], scriptures: ["使徒行传 9:1-19"], facts: { 地点: "大马士革路上" } }),
  context({ id: "mission-journeys", type: "event", nameZh: "宣教旅程", nameEn: "Missionary Journeys", eraIds: ["new-testament"], start: 46, end: 58, display: "约公元46-58年", summary: "保罗与同工在小亚细亚、希腊等地建立教会。", tags: ["宣教", "教会"], scriptures: ["使徒行传 13-21章"], facts: { 范围: "地中海东部" } }),
  context({ id: "damascus", type: "place", nameZh: "大马士革", nameEn: "Damascus", eraIds: ["new-testament"], start: 34, display: "公元1世纪", summary: "保罗归信后最初进入并受洗的城市。", tags: ["城市", "叙利亚"], scriptures: ["使徒行传 9:8-19"], facts: { 关联: "保罗归信" } }),
  context({ id: "rome", type: "place", nameZh: "罗马", nameEn: "Rome", eraIds: ["new-testament"], start: 60, end: 67, display: "公元1世纪", summary: "使徒行传结尾保罗被押送并继续传讲的帝国首都。", tags: ["城市", "帝国"], scriptures: ["使徒行传 28章"], facts: { 关联: "保罗被囚与传讲" } }),
  context({ id: "gentile-churches", type: "group", nameZh: "外邦众教会", nameEn: "Gentile Churches", eraIds: ["new-testament"], start: 46, end: 67, display: "公元1世纪", summary: "保罗宣教旅程中建立并持续牧养的各地教会。", tags: ["教会", "外邦"], scriptures: ["使徒行传 13-20章"], facts: { 区域: "小亚细亚、马其顿、亚该亚" } }),
  context({ id: "book-acts-paul", type: "book", nameZh: "使徒行传 9-28章与保罗书信", nameEn: "Acts 9-28 and Pauline Epistles", eraIds: ["new-testament"], start: 34, end: 67, display: "记载保罗事奉", summary: "记载保罗归信和宣教，并保存其写给教会与同工的书信。", tags: ["新约", "书信"], scriptures: ["使徒行传 9-28章", "罗马书至腓利门书"], facts: { 主角: "保罗" } }),
];

const EXPANDED_CONTEXT_ENTITIES = [
  context({ id: "conquest-canaan", type: "event", nameZh: "进入迦南", nameEn: "Entry into Canaan", eraIds: ["judges"], start: -1406, end: -1375, display: "约公元前15-14世纪", summary: "约书亚带领以色列人渡过约旦河并进入迦南。", tags: ["征服", "应许之地"], scriptures: ["约书亚记 1-12章"], facts: { 领袖: "约书亚", 起点: "约旦河东" } }),
  context({ id: "book-joshua", type: "book", nameZh: "约书亚记", nameEn: "Book of Joshua", eraIds: ["judges"], start: -1406, end: -1375, display: "记载征服迦南时期", summary: "记载以色列人进入迦南、分地和约书亚晚年训诫。", tags: ["历史书", "征服"], scriptures: ["约书亚记 1-24章"], facts: { 卷别: "旧约历史书" } }),
  context({ id: "judges-deliverance", type: "event", nameZh: "士师拯救", nameEn: "Deliverance in the Judges", eraIds: ["tribes"], start: -1250, end: -1120, display: "士师时期", summary: "以色列人在压迫、呼求与士师拯救之间反复经历的时代。", tags: ["士师", "拯救"], scriptures: ["士师记 2:16-19"], facts: { 代表人物: "底波拉、基甸" } }),
  context({ id: "book-judges", type: "book", nameZh: "士师记", nameEn: "Book of Judges", eraIds: ["tribes"], start: -1350, end: -1050, display: "记载士师时期", summary: "记载以色列各支派在士师时期的危机与拯救。", tags: ["历史书", "士师"], scriptures: ["士师记 1-21章"], facts: { 卷别: "旧约历史书" } }),
  context({ id: "bethlehem-harvest", type: "event", nameZh: "伯利恒的归属与收割", nameEn: "Ruth in Bethlehem", eraIds: ["tribes"], start: -1120, display: "约公元前12-11世纪", summary: "路得跟随拿俄米到伯利恒，并在波阿斯田间拾穗。", tags: ["伯利恒", "救赎"], scriptures: ["路得记 1-4章"], facts: { 地点: "伯利恒", 主要人物: "路得、拿俄米、波阿斯" } }),
  context({ id: "book-ruth", type: "book", nameZh: "路得记", nameEn: "Book of Ruth", eraIds: ["tribes"], start: -1150, end: -1070, display: "记载士师时期", summary: "记载路得的信实、波阿斯的救赎和大卫家谱。", tags: ["历史书", "家谱"], scriptures: ["路得记 1-4章"], facts: { 卷别: "旧约历史书" } }),
  context({ id: "prophetic-witness", type: "event", nameZh: "先知见证", nameEn: "Prophetic Witness", eraIds: ["divided"], start: -850, end: -586, display: "分裂王国时期", summary: "先知在王国危机中宣告审判、悔改与盼望。", tags: ["先知", "王国"], scriptures: ["列王纪下", "以赛亚书", "耶利米书"], facts: { 代表人物: "以利沙、以赛亚、耶利米" } }),
  context({ id: "book-major-prophets", type: "book", nameZh: "列王纪与大先知书", nameEn: "Kings and Major Prophets", eraIds: ["divided", "exile"], start: -850, end: -530, display: "记载王国末期与被掳", summary: "保存王国兴衰与主要先知信息的书卷群。", tags: ["历史书", "先知书"], scriptures: ["列王纪下", "以赛亚书", "耶利米书", "但以理书"], facts: { 范围: "分裂王国至被掳时期" } }),
  context({ id: "babylon-exile", type: "place", nameZh: "巴比伦", nameEn: "Babylon", eraIds: ["exile"], start: -605, end: -538, display: "被掳时期", summary: "犹大人被掳后生活与服事的重要帝国中心。", tags: ["帝国", "被掳"], scriptures: ["但以理书 1章", "耶利米书 29章"], facts: { 关联人物: "耶利米、但以理" } }),
  context({ id: "persian-deliverance", type: "event", nameZh: "普珥日拯救", nameEn: "Deliverance at Purim", eraIds: ["return"], start: -474, display: "约公元前5世纪", summary: "以斯帖与末底改促成犹太人脱离哈曼灭族阴谋。", tags: ["波斯", "拯救"], scriptures: ["以斯帖记 3-9章"], facts: { 王国: "波斯", 纪念: "普珥日" } }),
  context({ id: "jerusalem-return", type: "event", nameZh: "归回与重建", nameEn: "Return and Rebuilding", eraIds: ["return"], start: -458, end: -432, display: "约公元前5世纪", summary: "归回群体在以斯拉与尼希米带领下重建城墙并更新信仰生活。", tags: ["归回", "重建"], scriptures: ["以斯拉记 7-10章", "尼希米记 1-13章"], facts: { 地点: "耶路撒冷", 领袖: "以斯拉、尼希米" } }),
  context({ id: "book-return", type: "book", nameZh: "以斯帖记—尼希米记", nameEn: "Esther to Nehemiah", eraIds: ["return"], start: -500, end: -400, display: "记载波斯与归回时期", summary: "记载波斯宫廷拯救、归回和耶路撒冷重建。", tags: ["历史书", "归回"], scriptures: ["以斯帖记", "以斯拉记", "尼希米记"], facts: { 卷数: "三卷" } }),
  context({ id: "book-job", type: "book", nameZh: "约伯记", nameEn: "Book of Job", eraIds: ["patriarchs"], start: -2000, end: -1500, display: "背景年代不详", summary: "以诗歌与对话探讨义人受苦、人的有限与神的智慧。", tags: ["智慧书", "苦难"], scriptures: ["约伯记 1-42章"], facts: { 卷别: "智慧文学" } }),
  context({ id: "job-trials", type: "event", nameZh: "约伯受试炼", nameEn: "Trials of Job", eraIds: ["patriarchs"], start: -1900, display: "年代不详", summary: "约伯失去财产、儿女与健康，并在苦难中寻求答案。", tags: ["试炼", "苦难"], scriptures: ["约伯记 1-2章"], facts: { 主角: "约伯", 结局: "在神的回答后重新得福" } }),
  context({ id: "uz", type: "place", nameZh: "乌斯地", nameEn: "Land of Uz", eraIds: ["patriarchs"], start: -1900, display: "年代不详", summary: "约伯记开篇所称约伯居住的地方。", tags: ["地点", "智慧文学"], scriptures: ["约伯记 1:1"], facts: { 居民: "约伯" } }),
  context({ id: "nativity", type: "event", nameZh: "耶稣降生", nameEn: "Nativity of Jesus", eraIds: ["new-testament"], start: -4, display: "约公元前4年", summary: "马利亚在伯利恒生下耶稣，约瑟承担照料责任。", tags: ["降生", "伯利恒"], scriptures: ["马太福音 1-2章", "路加福音 1-2章"], facts: { 地点: "伯利恒", 家庭: "马利亚与约瑟" } }),
  context({ id: "baptism-event", type: "event", nameZh: "约旦河受洗", nameEn: "Baptism of Jesus", eraIds: ["new-testament"], start: 27, display: "约公元27年", summary: "施洗约翰在约旦河为耶稣施洗，标志公开事工展开。", tags: ["施洗", "约旦河"], scriptures: ["马太福音 3:13-17"], facts: { 施洗者: "施洗约翰", 受洗者: "耶稣" } }),
  context({ id: "galilee-ministry", type: "place", nameZh: "加利利", nameEn: "Galilee", eraIds: ["new-testament"], start: 27, end: 30, display: "约公元27-30年", summary: "耶稣呼召门徒并开展大量教导与医治事工的主要地区。", tags: ["地区", "福音书"], scriptures: ["马太福音 4:12-25"], facts: { 关联人物: "耶稣与门徒" } }),
  context({ id: "early-church-witness", type: "event", nameZh: "耶路撒冷教会见证", nameEn: "Witness of the Jerusalem Church", eraIds: ["new-testament"], start: 30, end: 40, display: "约公元30-40年", summary: "早期教会在耶路撒冷服事、受逼迫并向外扩展。", tags: ["教会", "见证"], scriptures: ["使徒行传 2-8章"], facts: { 代表人物: "彼得、司提反、腓利" } }),
  context({ id: "book-acts-church", type: "book", nameZh: "使徒行传", nameEn: "Acts of the Apostles", eraIds: ["new-testament"], start: 30, end: 62, display: "记载早期教会", summary: "记载福音从耶路撒冷扩展到罗马的过程。", tags: ["新约", "教会史"], scriptures: ["使徒行传 1-28章"], facts: { 传统作者: "路加" } }),
];

const CORE_RELATIONS = [
  relation("creation-adam", "creation-event", "adam", "participation", "受造", ["创世记 2:7"], "亚当在创造叙事中受造。"),
  relation("adam-fall", "adam", "fall-event", "participation", "参与", ["创世记 3:6"], "亚当参与了堕落事件。"),
  relation("adam-eden", "adam", "eden", "other", "居住", ["创世记 2:15"], "亚当被安置在伊甸园。"),
  relation("adam-first-family", "adam", "first-family", "family", "始祖", ["创世记 4:1-2"], "亚当是始祖家庭的父亲。"),
  relation("adam-book-early", "fall-event", "book-genesis-early", "record", "记载", ["创世记 1-5章"], "创世记前五章集中记载亚当叙事。"),

  relation("adam-noah", "adam", "noah", "family", "世系先祖", ["创世记 5章"], "创世记第五章列出从亚当到挪亚的世系。"),
  relation("noah-flood", "noah", "flood-event", "participation", "经历", ["创世记 7章"], "挪亚一家进入方舟并经历洪水。"),
  relation("noah-ararat", "noah", "ararat", "other", "停靠", ["创世记 8:4"], "挪亚的方舟停在亚拉腊山地。"),
  relation("noah-family-relation", "noah", "noah-family", "family", "家长", ["创世记 7:7"], "挪亚带领全家进入方舟。"),
  relation("noah-book-flood", "flood-event", "book-genesis-flood", "record", "记载", ["创世记 6-9章"], "创世记六至九章记载挪亚与洪水。"),

  relation("noah-abraham", "noah", "abraham", "family", "世系先祖", ["创世记 10:21-32", "创世记 11:10-26"], "经文通过闪的世系连接挪亚与亚伯拉罕。"),
  relation("abraham-call-relation", "abraham", "abraham-call", "participation", "回应", ["创世记 12:1-4"], "亚伯拉罕回应呼召离开哈兰。"),
  relation("abraham-moriah", "abraham", "moriah-event", "participation", "经历", ["创世记 22:1-18"], "亚伯拉罕经历献以撒的信心试验。"),
  relation("abraham-canaan", "abraham", "canaan", "other", "寄居", ["创世记 12:5-9"], "亚伯拉罕在迦南寄居。"),
  relation("abraham-covenant-family", "abraham", "covenant-family", "family", "先祖", ["创世记 17:4-7"], "亚伯拉罕是应许家族的先祖。"),
  relation("abraham-book", "abraham-call", "book-genesis-patriarchs", "record", "记载", ["创世记 12-25章"], "创世记十二至二十五章集中记载亚伯拉罕。"),

  relation("abraham-joseph", "abraham", "joseph", "family", "曾祖父", ["创世记 21:3", "创世记 25:26", "创世记 30:22-24"], "亚伯拉罕经以撒、雅各成为约瑟的曾祖父。"),
  relation("joseph-egypt-event", "joseph", "joseph-egypt", "participation", "被卖", ["创世记 37:28"], "约瑟被带到埃及。"),
  relation("joseph-reunion", "joseph", "famine-reunion", "participation", "保存家族", ["创世记 45:4-11"], "约瑟在饥荒中保存并接纳家族。"),
  relation("joseph-egypt-place", "joseph", "egypt", "other", "治理", ["创世记 41:39-43"], "约瑟在埃及被立为治理者。"),
  relation("joseph-tribes", "joseph", "tribes-israel", "family", "支派先祖", ["创世记 48章", "创世记 49:22-26"], "约瑟的后裔以法莲和玛拿西进入支派体系。"),
  relation("joseph-book", "famine-reunion", "book-genesis-joseph", "record", "记载", ["创世记 37-50章"], "创世记末段集中记载约瑟。"),

  relation("joseph-moses", "joseph", "moses", "other", "遗骨嘱托", ["出埃及记 13:19"], "摩西在出埃及时带走约瑟的骸骨。"),
  relation("moses-exodus", "moses", "exodus-event", "participation", "带领", ["出埃及记 12:31-42"], "摩西带领以色列人出埃及。"),
  relation("moses-sinai-covenant", "moses", "sinai-covenant", "participation", "中保", ["出埃及记 19-24章"], "摩西在西奈立约中传达律法。"),
  relation("moses-egypt", "moses", "egypt", "other", "离开", ["出埃及记 12:31"], "摩西带领百姓离开埃及。"),
  relation("moses-sinai", "moses", "sinai", "other", "领受律法", ["出埃及记 19:20"], "摩西上西奈山领受诫命。"),
  relation("moses-israel", "moses", "israel-people", "mentor", "带领", ["出埃及记 3:10"], "摩西奉差遣带领以色列人。"),
  relation("moses-book", "sinai-covenant", "book-torah", "record", "记载", ["出埃及记至申命记"], "这些书卷集中记载摩西与出埃及传统。"),

  relation("elijah-carmel-event", "elijah", "carmel-event", "participation", "对决", ["列王纪上 18:20-40"], "以利亚在迦密山与巴力先知对决。"),
  relation("elijah-transfiguration", "elijah", "transfiguration", "participation", "显现", ["马太福音 17:3"], "以利亚在登山变像中显现。"),
  relation("moses-transfiguration", "moses", "transfiguration", "participation", "显现", ["马太福音 17:3"], "摩西在登山变像中显现。"),
  relation("jesus-transfiguration", "jesus", "transfiguration", "participation", "变像", ["马太福音 17:2"], "耶稣在山上变像。"),
  relation("elijah-carmel-place", "elijah", "carmel", "other", "事奉", ["列王纪上 18:19"], "以利亚召集众人到迦密山。"),
  relation("elijah-northern", "elijah", "northern-kingdom", "mentor", "先知事奉", ["列王纪上 17-19章"], "以利亚主要向北国以色列发出先知信息。"),
  relation("elijah-book", "carmel-event", "book-kings-elijah", "record", "记载", ["列王纪上 17章—列王纪下 2章"], "列王纪集中记载以利亚的事奉。"),

  relation("abraham-jesus", "abraham", "jesus", "family", "家谱先祖", ["马太福音 1:1-16"], "马太福音家谱从亚伯拉罕追溯到耶稣。"),
  relation("david-jesus", "david", "jesus", "kingship", "大卫后裔", ["马太福音 1:1", "路加福音 1:32"], "新约称耶稣为大卫的后裔。"),
  relation("jesus-peter", "jesus", "peter", "mentor", "呼召门徒", ["马太福音 4:18-20"], "耶稣呼召彼得跟从他。"),
  relation("jesus-crucifixion", "jesus", "crucifixion", "participation", "受难", ["马太福音 27章"], "耶稣在十字架上受难。"),
  relation("jesus-resurrection", "jesus", "resurrection", "participation", "复活", ["马太福音 28章"], "福音书记载耶稣从死里复活。"),
  relation("jesus-jerusalem", "jesus", "jerusalem", "other", "受难与复活", ["路加福音 19-24章"], "耶稣最后一周的重要事件发生在耶路撒冷。"),
  relation("jesus-disciples", "jesus", "disciples", "mentor", "拣选教导", ["马可福音 3:13-19"], "耶稣拣选并教导十二门徒。"),
  relation("jesus-gospels", "resurrection", "book-gospels", "record", "记载", ["四福音书"], "四福音书集中记载耶稣的生平与事工。"),

  relation("peter-call-relation", "peter", "peter-call", "participation", "回应", ["路加福音 5:11"], "彼得离开一切跟从耶稣。"),
  relation("peter-pentecost", "peter", "pentecost", "participation", "宣讲", ["使徒行传 2:14-41"], "彼得在五旬节向众人宣讲。"),
  relation("peter-jerusalem", "peter", "jerusalem", "other", "事奉", ["使徒行传 1-8章"], "彼得在耶路撒冷早期教会中事奉。"),
  relation("peter-apostles", "peter", "apostles", "peer", "使徒同工", ["使徒行传 2:42"], "彼得与其他使徒共同教导。", { direction: "undirected" }),
  relation("peter-paul", "peter", "paul", "peer", "使徒同工", ["加拉太书 2:7-9"], "彼得与保罗确认各自主要的使徒使命。", { direction: "undirected" }),
  relation("peter-book", "pentecost", "book-acts-peter", "record", "记载", ["使徒行传 1-12章", "彼得前书"], "使徒行传前段与彼得前书呈现彼得的事奉。"),

  relation("jesus-paul", "jesus", "paul", "mentor", "显现与呼召", ["使徒行传 9:3-6", "哥林多前书 15:8"], "保罗见证复活的耶稣向他显现并呼召他。"),
  relation("paul-damascus-event", "paul", "damascus-conversion", "participation", "归信", ["使徒行传 9:1-19"], "保罗在前往大马士革途中归信。"),
  relation("paul-missions", "paul", "mission-journeys", "participation", "带领", ["使徒行传 13-21章"], "保罗参与并带领多次宣教旅程。"),
  relation("paul-damascus", "paul", "damascus", "other", "受洗传讲", ["使徒行传 9:18-22"], "保罗在大马士革受洗并开始传讲。"),
  relation("paul-rome", "paul", "rome", "other", "被囚传讲", ["使徒行传 28:16-31"], "保罗在罗马被看守期间继续传讲。"),
  relation("paul-gentile-churches", "paul", "gentile-churches", "mentor", "建立牧养", ["使徒行传 14:21-23"], "保罗与同工建立并牧养各地教会。"),
  relation("paul-book", "mission-journeys", "book-acts-paul", "record", "记载", ["使徒行传 9-28章", "保罗书信"], "使徒行传与书信呈现保罗的归信、宣教和教导。"),
];

const EXPANDED_RELATIONS = [
  relation("adam-eve", "adam", "eve", "family", "夫妻", ["创世记 2:22-25"], "亚当与夏娃成为夫妻。", { direction: "undirected" }),
  relation("eve-fall", "eve", "fall-event", "participation", "参与", ["创世记 3:1-6"], "夏娃在伊甸园的堕落叙事中作出选择。"),
  relation("eve-eden", "eve", "eden", "other", "居住", ["创世记 2:22-25", "创世记 3:23"], "夏娃与亚当最初生活在伊甸园。"),

  relation("abraham-sarah", "abraham", "sarah", "family", "夫妻", ["创世记 11:29"], "撒拉是亚伯拉罕的妻子。", { direction: "undirected" }),
  relation("abraham-isaac", "abraham", "isaac", "family", "父亲", ["创世记 21:1-3"], "以撒是亚伯拉罕与撒拉的儿子。"),
  relation("sarah-isaac", "sarah", "isaac", "family", "母亲", ["创世记 21:1-3"], "撒拉生下以撒。"),
  relation("isaac-rebekah", "isaac", "rebekah", "family", "夫妻", ["创世记 24:67"], "以撒娶利百加为妻。", { direction: "undirected" }),
  relation("isaac-jacob", "isaac", "jacob", "family", "父亲", ["创世记 25:24-26"], "雅各是以撒与利百加的儿子。"),
  relation("rebekah-jacob", "rebekah", "jacob", "family", "母亲", ["创世记 25:24-28"], "利百加是雅各的母亲。"),
  relation("jacob-judah", "jacob", "judah", "family", "父亲", ["创世记 29:35"], "犹大是雅各的儿子。"),
  relation("jacob-joseph", "jacob", "joseph", "family", "父亲", ["创世记 30:22-24"], "约瑟是雅各与拉结的儿子。"),
  relation("judah-david", "judah", "david", "family", "家谱先祖", ["路得记 4:18-22", "历代志上 2:3-15"], "大卫出自犹大支派和法勒斯的世系。"),
  relation("sarah-patriarch-book", "sarah", "book-genesis-patriarchs", "record", "记载", ["创世记 12-23章"], "列祖叙事记载撒拉与应许。"),
  relation("isaac-patriarch-book", "isaac", "book-genesis-patriarchs", "record", "记载", ["创世记 21-25章"], "创世记记载以撒的出生与成长。"),
  relation("rebekah-patriarch-book", "rebekah", "book-genesis-patriarchs", "record", "记载", ["创世记 24-27章"], "创世记记载利百加进入列祖家族。"),
  relation("jacob-covenant-family", "jacob", "covenant-family", "family", "列祖", ["创世记 28:13-15", "创世记 35:9-12"], "雅各承接列祖之约并被改名为以色列。"),
  relation("judah-tribes", "judah", "tribes-israel", "family", "支派先祖", ["创世记 49:8-12"], "犹大成为以色列十二支派之一的先祖。"),

  relation("moses-aaron", "moses", "aaron", "family", "兄弟", ["出埃及记 4:14-16", "出埃及记 6:20"], "亚伦是摩西的哥哥和同工。", { direction: "undirected" }),
  relation("moses-joshua", "moses", "joshua", "mentor", "按立继承", ["民数记 27:18-23", "申命记 34:9"], "摩西按手在约书亚头上，约书亚继承领导使命。"),
  relation("aaron-israel", "aaron", "israel-people", "mentor", "祭司服事", ["出埃及记 28:1"], "亚伦被分别出来担任祭司。"),
  relation("aaron-torah", "aaron", "book-torah", "record", "记载", ["出埃及记 4章", "利未记 8-10章"], "摩西五经多处记载亚伦的职分与事迹。"),
  relation("joshua-conquest", "joshua", "conquest-canaan", "participation", "带领", ["约书亚记 1:1-9", "约书亚记 3章"], "约书亚带领百姓进入迦南。"),
  relation("conquest-joshua-book", "conquest-canaan", "book-joshua", "record", "记载", ["约书亚记 1-12章"], "约书亚记前半部记载进入迦南的过程。"),

  relation("deborah-judges", "deborah", "judges-deliverance", "participation", "带领", ["士师记 4:4-10"], "底波拉召集巴拉并参与拯救行动。"),
  relation("gideon-judges", "gideon", "judges-deliverance", "participation", "带领", ["士师记 6:11-16", "士师记 7章"], "基甸带领三百人击败米甸军。"),
  relation("deborah-book-judges", "deborah", "book-judges", "record", "记载", ["士师记 4-5章"], "士师记记载底波拉与巴拉之歌。"),
  relation("gideon-book-judges", "gideon", "book-judges", "record", "记载", ["士师记 6-8章"], "士师记记载基甸的蒙召与争战。"),
  relation("ruth-bethlehem", "ruth", "bethlehem-harvest", "participation", "归属", ["路得记 1:16-22", "路得记 2章"], "路得跟随拿俄米到伯利恒并在田间拾穗。"),
  relation("ruth-book", "ruth", "book-ruth", "record", "记载", ["路得记 1-4章"], "路得记完整记载路得与波阿斯的故事。"),
  relation("ruth-david", "ruth", "david", "family", "曾祖母", ["路得记 4:17-22"], "路得经俄备得和耶西成为大卫的曾祖母。"),

  relation("elijah-elisha", "elijah", "elisha", "mentor", "呼召继承", ["列王纪上 19:19-21", "列王纪下 2:9-15"], "以利沙跟随以利亚并承接先知职分。"),
  relation("elisha-prophetic", "elisha", "prophetic-witness", "participation", "先知事奉", ["列王纪下 2-13章"], "以利沙在北国持续先知事奉。"),
  relation("isaiah-prophetic", "isaiah", "prophetic-witness", "participation", "宣告", ["以赛亚书 1:1", "以赛亚书 6章"], "以赛亚在犹大君王时期宣告信息。"),
  relation("jeremiah-prophetic", "jeremiah", "prophetic-witness", "participation", "劝戒", ["耶利米书 1:4-10"], "耶利米在耶路撒冷陷落前后传达先知信息。"),
  relation("jeremiah-babylon", "jeremiah", "babylon-exile", "other", "预告被掳", ["耶利米书 25:8-12", "耶利米书 29:1-14"], "耶利米预告巴比伦统治并写信给被掳者。"),
  relation("daniel-babylon", "daniel", "babylon-exile", "other", "被掳任职", ["但以理书 1:1-7"], "但以理被带到巴比伦并在宫廷受训。"),
  relation("elisha-prophets-book", "elisha", "book-major-prophets", "record", "记载", ["列王纪下 2-13章"], "列王纪下集中记载以利沙的事奉。"),
  relation("isaiah-prophets-book", "isaiah", "book-major-prophets", "record", "记载", ["以赛亚书 1-66章"], "以赛亚书保存以赛亚传统的信息。"),
  relation("jeremiah-prophets-book", "jeremiah", "book-major-prophets", "record", "记载", ["耶利米书 1-52章"], "耶利米书保存耶利米的信息与经历。"),
  relation("daniel-prophets-book", "daniel", "book-major-prophets", "record", "记载", ["但以理书 1-12章"], "但以理书记载但以理在被掳时期的经历与异象。"),

  relation("esther-deliverance", "esther", "persian-deliverance", "participation", "代求拯救", ["以斯帖记 4:13-16", "以斯帖记 7章"], "以斯帖冒险进见王，为犹太人代求。"),
  relation("ezra-return", "ezra", "jerusalem-return", "participation", "教导更新", ["以斯拉记 7:6-10", "尼希米记 8章"], "以斯拉教导律法并推动群体更新。"),
  relation("nehemiah-return", "nehemiah", "jerusalem-return", "participation", "重建城墙", ["尼希米记 2:11-20", "尼希米记 6:15-16"], "尼希米组织重建耶路撒冷城墙。"),
  relation("ezra-nehemiah", "ezra", "nehemiah", "peer", "归回同工", ["尼希米记 8:1-9", "尼希米记 12:26"], "以斯拉与尼希米在归回群体中共同服事。", { direction: "undirected" }),
  relation("esther-return-book", "esther", "book-return", "record", "记载", ["以斯帖记"], "以斯帖记记载波斯宫廷中的拯救。"),
  relation("ezra-return-book", "ezra", "book-return", "record", "记载", ["以斯拉记 7-10章"], "以斯拉记后半部记载以斯拉的事奉。"),
  relation("nehemiah-return-book", "nehemiah", "book-return", "record", "记载", ["尼希米记 1-13章"], "尼希米记记载城墙重建与改革。"),
  relation("job-book", "job", "book-job", "record", "主角", ["约伯记 1:1", "约伯记 42:17"], "约伯是约伯记的中心人物。"),
  relation("job-trials-relation", "job", "job-trials", "participation", "经历试炼", ["约伯记 1-2章"], "约伯经历接连的损失与疾病。"),
  relation("job-uz", "job", "uz", "other", "居住", ["约伯记 1:1"], "约伯住在乌斯地。"),
  relation("job-trials-book", "job-trials", "book-job", "record", "记载", ["约伯记 1-42章"], "约伯记围绕约伯受试炼及其回应展开。"),

  relation("mary-joseph-nazareth", "mary", "joseph-nazareth", "family", "夫妻", ["马太福音 1:18-25"], "马利亚与约瑟结为夫妻。", { direction: "undirected" }),
  relation("mary-jesus", "mary", "jesus", "family", "母亲", ["路加福音 1:30-35", "路加福音 2:7"], "马利亚生下耶稣。"),
  relation("joseph-nazareth-jesus", "joseph-nazareth", "jesus", "family", "养育照料", ["马太福音 1:24-25", "马太福音 2:13-23"], "约瑟照料马利亚与童年耶稣。"),
  relation("mary-nativity", "mary", "nativity", "participation", "生下耶稣", ["路加福音 2:4-7"], "马利亚在伯利恒生下耶稣。"),
  relation("joseph-nativity", "joseph-nazareth", "nativity", "participation", "照料家庭", ["马太福音 1:24-25", "路加福音 2:4-7"], "约瑟带马利亚到伯利恒并照料家庭。"),
  relation("john-baptist-jesus", "john-baptist", "jesus", "mentor", "为耶稣施洗", ["马太福音 3:13-17"], "施洗约翰在约旦河为耶稣施洗。"),
  relation("john-baptist-baptism", "john-baptist", "baptism-event", "participation", "施洗", ["马太福音 3:13-17"], "施洗约翰参与耶稣受洗事件。"),
  relation("jesus-baptism", "jesus", "baptism-event", "participation", "受洗", ["马太福音 3:13-17"], "耶稣来到约旦河受约翰的洗。"),
  relation("jesus-galilee", "jesus", "galilee-ministry", "other", "公开事工", ["马太福音 4:12-25"], "耶稣在加利利展开公开事工。"),

  relation("peter-andrew", "peter", "andrew", "family", "兄弟", ["马太福音 4:18"], "彼得与安得烈是兄弟。", { direction: "undirected" }),
  relation("jesus-andrew", "jesus", "andrew", "mentor", "呼召门徒", ["约翰福音 1:35-40", "马太福音 4:18-20"], "安得烈跟随耶稣并成为使徒。"),
  relation("jesus-james", "jesus", "james", "mentor", "呼召门徒", ["马可福音 1:19-20"], "耶稣呼召雅各跟随他。"),
  relation("jesus-john", "jesus", "john", "mentor", "呼召门徒", ["马可福音 1:19-20"], "耶稣呼召约翰跟随他。"),
  relation("james-john", "james", "john", "family", "兄弟", ["马可福音 1:19-20"], "雅各与约翰是西庇太的儿子。", { direction: "undirected" }),
  relation("jesus-matthew", "jesus", "matthew", "mentor", "呼召门徒", ["马太福音 9:9"], "耶稣从税关呼召马太。"),
  relation("jesus-mary-magdalene", "jesus", "mary-magdalene", "mentor", "医治与跟随", ["路加福音 8:1-3"], "抹大拉的马利亚蒙医治后跟随耶稣。"),
  relation("mary-magdalene-resurrection", "mary-magdalene", "resurrection", "participation", "复活见证", ["约翰福音 20:1-18"], "抹大拉的马利亚在空墓旁见证复活的耶稣。"),
  relation("andrew-disciples", "andrew", "disciples", "peer", "十二使徒", ["马可福音 3:16-19"], "安得烈名列十二使徒。"),
  relation("james-disciples", "james", "disciples", "peer", "十二使徒", ["马可福音 3:16-19"], "雅各名列十二使徒。"),
  relation("john-disciples", "john", "disciples", "peer", "十二使徒", ["马可福音 3:16-19"], "约翰名列十二使徒。"),
  relation("matthew-disciples", "matthew", "disciples", "peer", "十二使徒", ["马太福音 10:2-4"], "马太名列十二使徒。"),

  relation("stephen-early-church", "stephen", "early-church-witness", "participation", "见证殉道", ["使徒行传 6-7章"], "司提反在耶路撒冷作见证并殉道。"),
  relation("philip-early-church", "philip", "early-church-witness", "participation", "向外传扬", ["使徒行传 8:4-40"], "腓利离开耶路撒冷向撒马利亚和旷野传福音。"),
  relation("stephen-paul", "stephen", "paul", "conflict", "殉道现场", ["使徒行传 7:58", "使徒行传 8:1"], "当时名为扫罗的保罗赞同司提反被害。"),
  relation("stephen-acts", "stephen", "book-acts-church", "record", "记载", ["使徒行传 6-7章"], "使徒行传记载司提反的服事与殉道。"),
  relation("philip-acts", "philip", "book-acts-church", "record", "记载", ["使徒行传 6章", "使徒行传 8章", "使徒行传 21:8"], "使徒行传记载传福音者腓利。"),
  relation("barnabas-paul", "barnabas", "paul", "peer", "宣教同工", ["使徒行传 9:27", "使徒行传 13:1-3"], "巴拿巴接纳保罗并与他同赴宣教旅程。", { direction: "undirected" }),
  relation("barnabas-mark", "barnabas", "mark", "family", "表兄弟", ["歌罗西书 4:10"], "马可是巴拿巴的表弟或近亲。"),
  relation("barnabas-missions", "barnabas", "mission-journeys", "participation", "参与", ["使徒行传 13-14章"], "巴拿巴与保罗参与第一次宣教旅程。"),
  relation("paul-timothy", "paul", "timothy", "mentor", "属灵父子", ["使徒行传 16:1-5", "提摩太前书 1:2"], "保罗带领提摩太参与宣教和牧养。"),
  relation("paul-titus", "paul", "titus", "mentor", "属灵父子", ["提多书 1:4-5"], "保罗称提多为照着共同信仰作真儿子的。"),
  relation("paul-luke", "paul", "luke", "peer", "宣教同工", ["歌罗西书 4:14", "提摩太后书 4:11"], "路加在保罗事奉和被囚期间陪伴他。", { direction: "undirected" }),
  relation("paul-mark", "paul", "mark", "peer", "恢复同工", ["提摩太后书 4:11", "腓利门书 24"], "保罗晚年认可马可在服事上的益处。", { direction: "undirected" }),
  relation("peter-mark", "peter", "mark", "mentor", "属灵关怀", ["彼得前书 5:13"], "彼得称马可为儿子，显出亲密的属灵关系。"),
  relation("timothy-missions", "timothy", "mission-journeys", "participation", "参与", ["使徒行传 16:1-5", "使徒行传 17:14-15"], "提摩太参与保罗的宣教旅程。"),
  relation("titus-gentile-churches", "titus", "gentile-churches", "mentor", "设立长老", ["提多书 1:5"], "提多受托在克里特各城设立长老。"),
  relation("luke-acts", "luke", "book-acts-church", "record", "传统作者", ["路加福音 1:1-4", "使徒行传 1:1-2"], "传统上认为路加写作路加福音与使徒行传。", { evidenceLevel: "traditional" }),
  relation("mark-gospels", "mark", "book-gospels", "record", "传统作者", ["马可福音 1:1"], "传统上认为马可与马可福音相关。", { evidenceLevel: "traditional" }),
  relation("samuel-saul", "samuel", "saul", "kingship", "膏立为王", ["撒母耳记上 10:1"], "撒母耳膏立扫罗为以色列第一位王。"),
  relation("bathsheba-solomon", "bathsheba", "solomon", "family", "母亲", ["撒母耳记下 12:24", "列王纪上 1:11-31"], "拔示巴是所罗门的母亲，并参与王位继承安排。"),
];

const RAW_GRAPH_ENTITIES = [...CORE_PEOPLE, ...EXPANDED_PEOPLE, ...DAVID_ENTITIES, ...CONTEXT_ENTITIES, ...EXPANDED_CONTEXT_ENTITIES];
const corePortraitPath = (entity) => CORE_PERSON_IDS.includes(entity.id) && entity.id !== "aaron"
  ? `/portraits/${entity.id}-story-v2.webp`
  : entity.image;

export const GRAPH_ENTITIES = RAW_GRAPH_ENTITIES.map((entity) => ({
  ...entity,
  image: entity.image ? withBasePath(corePortraitPath(entity)) : null,
}));
export const GRAPH_RELATIONS = [...DAVID_RELATIONS, ...CORE_RELATIONS, ...EXPANDED_RELATIONS];

const davidEntityIds = DAVID_ENTITIES.map((entity) => entity.id);

const BASE_NETWORKS = {
  adam: { label: "亚当与创世", entityIds: ["adam", "creation-event", "fall-event", "eden", "first-family", "book-genesis-early"] },
  noah: { label: "挪亚与洪水", entityIds: ["noah", "adam", "flood-event", "ararat", "noah-family", "book-genesis-flood"] },
  abraham: { label: "亚伯拉罕与应许", entityIds: ["abraham", "noah", "abraham-call", "moriah-event", "canaan", "covenant-family", "book-genesis-patriarchs"] },
  joseph: { label: "约瑟与埃及", entityIds: ["joseph", "abraham", "joseph-egypt", "famine-reunion", "egypt", "tribes-israel", "book-genesis-joseph"] },
  moses: { label: "摩西与出埃及", entityIds: ["moses", "joseph", "exodus-event", "sinai-covenant", "egypt", "sinai", "israel-people", "book-torah"] },
  david: { label: "大卫与联合王国", entityIds: davidEntityIds },
  elijah: { label: "以利亚与先知使命", entityIds: ["elijah", "moses", "jesus", "carmel-event", "transfiguration", "carmel", "northern-kingdom", "book-kings-elijah"] },
  jesus: { label: "耶稣与福音", entityIds: ["jesus", "abraham", "david", "peter", "transfiguration", "crucifixion", "resurrection", "jerusalem", "disciples", "book-gospels"] },
  peter: { label: "彼得与早期教会", entityIds: ["peter", "jesus", "paul", "peter-call", "pentecost", "jerusalem", "apostles", "book-acts-peter"] },
  paul: { label: "保罗与宣教旅程", entityIds: ["paul", "jesus", "peter", "damascus-conversion", "mission-journeys", "damascus", "rome", "gentile-churches", "book-acts-paul"] },
};

const CORE_NETWORK_LABELS = {
  jacob: "雅各（以色列）人物关系",
  james: "雅各（使徒）人物关系",
  "joseph-nazareth": "约瑟（拿撒勒）人物关系",
};

export const ENTITY_BY_ID = Object.fromEntries(GRAPH_ENTITIES.map((entity) => [entity.id, entity]));

function buildCoreNetwork(coreId) {
  const directRelations = GRAPH_RELATIONS.filter((item) => item.sourceId === coreId || item.targetId === coreId);
  const firstHopIds = directRelations.map((item) => item.sourceId === coreId ? item.targetId : item.sourceId);
  const firstHopSet = new Set(firstHopIds);
  const recordedContextIds = GRAPH_RELATIONS
    .filter((item) => item.type === "record" && (firstHopSet.has(item.sourceId) || firstHopSet.has(item.targetId)))
    .map((item) => firstHopSet.has(item.sourceId) ? item.targetId : item.sourceId);
  const entityIds = [...new Set([coreId, ...firstHopIds, ...recordedContextIds])]
    .filter((id) => ENTITY_BY_ID[id])
    .slice(0, 12);

  return {
    label: CORE_NETWORK_LABELS[coreId] ?? `${ENTITY_BY_ID[coreId].nameZh}人物关系`,
    entityIds,
  };
}

export const CORE_NETWORKS = Object.fromEntries(
  CORE_PERSON_IDS.map((coreId) => [coreId, BASE_NETWORKS[coreId] ?? buildCoreNetwork(coreId)]),
);
