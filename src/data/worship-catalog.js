/* 调研目录（2026-07-17）。播放链接使用平台检索页，避免伪造视频 ID。 */
const searchSource = (title, artist) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(`${artist} ${title} 官方`)}`;

const group = (name, titles, mood, theme, evidence, evidenceUrl, artistUrl, kind = "合集") =>
  titles.map((title, index) => ({
    title,
    artist: name,
    group: name,
    kind,
    album: "待补官方专辑信息",
    moods: [mood],
    theme,
    duration: "待核",
    rank: index + 1,
    reason: "正式目录与平台热门作品交叉核对",
    cover: ["sun", "mist", "water", "field", "dusk", "orange", "blue", "lavender", "sunset", "gold"][index],
    sourceUrl: searchSource(title, name),
    evidence,
    evidenceUrl,
    artistUrl,
  }));

let worshipCatalog = [
  ...group("赞美之泉", ["这一生最美的祝福", "恩典之路", "亲近祢", "有一位神", "展开清晨的翅膀", "平安的七月夜", "耶和华祝福满满", "我亲爱的耶稣", "宝贵十架", "我要欢唱"], "温暖治愈", "感恩与喜乐", "赞美之泉官方音乐目录", "https://sop.org/music/sa01/", "https://music.apple.com/tw/artist/赞美之泉/267461612"),
  ...group("天韵合唱团", ["眼光", "野地的花", "神的道路", "耶稣爱你", "生命中的云彩", "看不见的时候", "勇敢", "这一条路", "歌颂复活主", "最痛的时候"], "温暖治愈", "信心与盼望", "《天韵十大点播金曲》官方平台曲目", "https://music.apple.com/kr/album/天韵十大点播金曲/1656655595", "https://music.apple.com/sg/artist/天韵合唱团/1502628137"),
  ...group("小羊诗歌", ["陪我走过春夏秋冬", "一粒麦子", "再次将我更新", "谁能使我与神的爱隔绝", "我愿为祢去", "父啊，我向祢呼求", "耶稣，万名之上的名", "活祭", "全地在歌唱", "祢是我神"], "抒情安静", "祷告与亲近", "Apple Music 热门歌曲与官方作品目录", "https://music.apple.com/us/artist/小羊诗歌/1089342613", "https://music.apple.com/us/artist/小羊诗歌/1089342613"),
  ...group("盛晓玫", ["活出爱", "恩典的记号", "爱使生命美丽", "脚步", "医治的爱", "幸福", "依然爱我", "想起你", "胜过万有", "耶稣在我里面"], "温暖治愈", "安慰与医治", "Apple Music 热门歌曲", "https://music.apple.com/us/artist/盛晓玫/255479615", "https://music.apple.com/us/artist/盛晓玫/255479615"),
  ...group("泥土音乐", ["为何对我这么好", "亲密的朋友", "水火", "打开黑暗的角落", "你名何其美", "放手交给祂", "给你真平安", "新天地", "活出爱", "恩典的记号"], "温暖治愈", "安慰与医治", "Apple Music 热门歌曲与 Clay Music 官方说明", "https://music.apple.com/cn/artist/泥土音乐/1686557821", "https://www.claymusic.org/"),
  ...group("约书亚乐团", ["耶稣基督", "微小的声音", "安静", "我安然居住", "无价至宝", "我要爱慕你", "我神真伟大", "与你更靠近", "基督是我满足", "求充满这地"], "激情敬拜", "赞美与尊崇", "Apple Music 热门歌曲与官方媒体页", "https://music.apple.com/us/artist/约书亚乐团/976498453", "https://joshua.com.tw/web/"),
  ...group("GOOD TV 好音乐", ["奇异恩典", "圣哉三一歌", "坚固保障", "我知谁掌管明天", "何等恩典", "你真伟大", "主祢是我力量", "在祢手中", "我的神我的王", "恩典之路"], "庄严赞美", "赞美与尊崇", "GOOD TV 好音乐官方频道精选，演唱者另行标注", "https://music.goodtv.tv/", "https://music.goodtv.tv/", "合集"),
  ...group("KUA Worship", ["我神我王", "我信靠祢", "若有人在基督里", "前来敬拜祢", "哈利路亚这边", "宝座前", "祢的声音", "阿爸这就是祢", "无止尽的爱", "爱的印记"], "激情敬拜", "信心与盼望", "KUA Originals 官方项目与 Apple Music 热门歌曲", "https://kuaglobal.org/kuaoriginals/", "https://music.apple.com/us/artist/kua-worship/1584905348"),
  ...group("生命河灵粮堂", ["神的应许", "高声唱哈利路亚", "愿你荣耀遍及全地", "此生爱你不渝", "从破碎到自由", "活着为你", "生命的泉源", "神机会的风", "你的爱不离不弃", "奔向爱我的神"], "抒情安静", "信心与盼望", "生命河灵粮堂《如鹰展翅上腾》《神机会的风》《奔向爱我的神》专辑曲目", "https://www.izanmei.com/artist/rolcc/album/3_1_1.html", "https://www.youtube.com/@rolccmedia"),
  ...group("迦南诗选", ["真的有一位神爱你", "都有走路的艰难", "翱翔的地方是天空", "一个有信心的人", "压伤的芦苇", "万国的大使命", "你是我的主", "中国的早晨五点钟", "主啊，我赞美你", "最知心的朋友"], "温暖治愈", "信心与盼望", "迦南诗歌作品目录与经典百首选集交叉核对", "https://www.izanmei.cc/artist/jia-nan-shi-ge/song.html", "https://www.fuyin.tv/content/view/movid/1186/index.html"),
  ...group("经典单曲", ["奇异恩典", "生命的更新", "最知心的朋友", "你真伟大", "我知谁掌管明天", "坚固保障", "圣哉三一歌", "主祢是我力量", "何等恩典", "恩典之路"], "抒情安静", "安慰与医治", "经典诗歌本与教会聚会歌单方向，版本待按演唱者核验", "https://www.magicj.cn/officialwebsite/topics/applications/inspiration-station/theology?book=gen&chapter=1&verse=1", "https://www.youtube.com/results?search_query=中文经典赞美诗", "单曲"),
  {
    title: "如鹰展翅上腾",
    artist: "生命河灵粮堂",
    group: "经典单曲",
    kind: "单曲",
    album: "如鹰展翅上腾",
    moods: ["激情敬拜", "欢快感恩", "信心"],
    theme: "信心与盼望",
    duration: "待核",
    rank: 11,
    reason: "生命河官方频道长期传播的经典敬拜作品",
    cover: "sunset",
    sourceUrl: searchSource("如鹰展翅上腾", "生命河灵粮堂"),
    evidence: "生命河 ROLCC Media 官方版本",
    evidenceUrl: "https://www.youtube.com/watch?v=qF3RADPSlDs",
    artistUrl: "https://www.youtube.com/@rolccmedia",
  },
];

const moodOverrides = new Map([
  ["赞美之泉::耶和华祝福满满", ["欢快感恩", "温暖治愈"]],
  ["赞美之泉::我要欢唱", ["欢快感恩", "激情敬拜"]],
  ["天韵合唱团::歌颂复活主", ["欢快感恩", "激情敬拜"]],
  ["小羊诗歌::全地在歌唱", ["欢快感恩", "激情敬拜"]],
  ["盛晓玫::活出爱", ["欢快感恩", "温暖治愈"]],
  ["盛晓玫::幸福", ["欢快感恩", "温暖治愈"]],
  ["泥土音乐::新天地", ["欢快感恩", "激情敬拜"]],
  ["约书亚乐团::耶稣基督", ["欢快感恩", "激情敬拜"]],
  ["约书亚乐团::求充满这地", ["激情敬拜", "欢快感恩"]],
  ["KUA Worship::哈利路亚这边", ["欢快感恩", "激情敬拜"]],
  ["迦南诗选::主啊，我赞美你", ["欢快感恩", "温暖治愈"]],
]);

worshipCatalog = worshipCatalog.map(song => ({
  ...song,
  moods: moodOverrides.get(`${song.artist}::${song.title}`) || song.moods,
}));

export { worshipCatalog };
