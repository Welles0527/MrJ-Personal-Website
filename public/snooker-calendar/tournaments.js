/* Shared tournament schedule for the snooker and summary calendars. */
(() => {
  const calendarSource='https://www.wst.tv/calendar/';
  const events=[];
function add(id,name,en,start,end,type,region,city,venue,prize,symbol,extra={}){events.push({id,name,en,start:'2026-'+start,end:'2026-'+end,type,region,city,venue,prize,symbol,source:calendarSource,...extra})}
add('masters','大师赛','The Masters','01-11','01-18','masters','uk','伦敦','亚历山德拉宫',350000,'trophy',{source:'https://www.wst.tv/themasters/',total:'£1,015,000',players:['凯伦·威尔逊','约翰·希金斯','贾德·特鲁姆普','吴宜泽','赵心童','肖国栋','马克·艾伦','肖恩·墨菲','丁俊晖','巴里·霍金斯','加里·威尔逊'],result:[['01月11日 · 1/8决赛','吴宜泽','6–2','肖恩·墨菲'],['01月12日 · 1/8决赛','赵心童','6–2','加里·威尔逊'],['01月13日 · 1/8决赛','约翰·希金斯','6–2','巴里·霍金斯'],['01月14日 · 1/8决赛','贾德·特鲁姆普','6–2','丁俊晖'],['01月15日 · 1/4决赛','贾德·特鲁姆普','6–2','马克·艾伦'],['01月15日 · 1/4决赛','约翰·希金斯','胜','赵心童'],['01月16日 · 1/4决赛','吴宜泽','胜','肖国栋'],['01月17日 · 半决赛','约翰·希金斯','6–5','贾德·特鲁姆普'],['01月17日 · 半决赛','凯伦·威尔逊','6–5','吴宜泽'],['01月18日 · 决赛','凯伦·威尔逊','10–6','约翰·希金斯']],champion:{name:'凯伦·威尔逊',en:'Kyren Wilson',photo:'https://commons.wikimedia.org/wiki/Special:FilePath/Kyren_Wilson_Masters_2026_4.jpg?width=330',credit:'BennyOnTheLoose · CC BY-SA 4.0',creditUrl:'https://commons.wikimedia.org/wiki/File:Kyren_Wilson_Masters_2026_4.jpg'},note:'三大赛之一 · 非排名邀请赛；仅录入 WST 已明确发布的对阵与赛果'});
add('german','德国大师赛','German Masters','01-26','02-01','ranking','eu','柏林','Tempodrom',100000,'diamond',{total:'£550,400',note:'德国排名赛 · 名称含“大师赛”，归类为排名赛',champion:{name:'贾德·特鲁姆普',en:'Judd Trump',photo:'https://www.wpbsa.com/wp-content/uploads/Judd-Trump-copy.png',profile:'https://www.wpbsa.com/player/judd-trump/'}});
add('grandprix','世界大奖赛','World Grand Prix','02-03','02-08','ranking','cn','中国香港','Kai Tak Arena',180000,'target',{flag:'🇭🇰',note:'单赛季排名前32位球员参加',champion:{name:'赵心童',en:'Zhao Xintong',photo:'https://www.wpbsa.com/wp-content/uploads/Zhao-Xintong.png',profile:'https://www.wpbsa.com/player/zhao-xintong/'}});
add('players','球员锦标赛','Players Championship','02-17','02-22','ranking','uk','特尔福德','特尔福德国际中心',150000,'shield',{total:'£500,000',note:'单赛季排名前16位球员参加',champion:{name:'赵心童',en:'Zhao Xintong',photo:'https://www.wpbsa.com/wp-content/uploads/Zhao-Xintong.png',profile:'https://www.wpbsa.com/player/zhao-xintong/'}});
add('welsh','威尔士公开赛','Welsh Open','02-23','03-01','ranking','uk','兰迪德诺','Venue Cymru',100000,'flower',{total:'£550,400',champion:{name:'巴里·霍金斯',en:'Barry Hawkins',photo:'https://www.wpbsa.com/wp-content/uploads/Barry-Hawkins-copy.png',profile:'https://www.wpbsa.com/player/barry-hawkins/'}});
add('worldopen','世界公开赛','World Open','03-16','03-22','ranking','cn','玉山','Yushan Sport Centre',175000,'hex',{champion:{name:'塔猜亚·乌努',en:'Thepchaiya Un-Nooh',photo:'https://www.wpbsa.com/wp-content/uploads/Thepchaiya-Un-Nooh-copy-1200x1200-copy_v1.png',profile:'https://www.wpbsa.com/player/thepchaiya-un-nooh/'}});
add('tour','巡回锦标赛','Tour Championship','03-30','04-05','ranking','uk','曼彻斯特','Manchester Central',150000,'crown',{champion:{name:'赵心童',en:'Zhao Xintong',photo:'https://www.wpbsa.com/wp-content/uploads/Zhao-Xintong.png',profile:'https://www.wpbsa.com/player/zhao-xintong/'}});
add('world','世界锦标赛','World Snooker Championship','04-18','05-04','ranking','uk','谢菲尔德','克鲁斯堡剧院',500000,'trophy',{total:'£2,395,000',note:'三大赛之一 · 克鲁斯堡第50届世锦赛',champion:{name:'吴宜泽',en:'Wu Yize',photo:'https://www.wpbsa.com/wp-content/uploads/Wu-Yize-1.png',profile:'https://www.wpbsa.com/player/wu-yize/'}});
add('league','冠军联赛（排名赛）','Championship League','06-22','07-15','ranking','uk','莱斯特','Mattioli Arena',33000,'grid',{champion:{name:'杰克·琼斯',en:'Jak Jones',photo:'./jak-jones.png',profile:'https://www.wpbsa.com/player/jak-jones/'}});
add('chinaq','中国公开赛资格赛','China Open Qualifiers','06-10','06-14','qualifier','uk','莱斯特','Mattioli Arena',null,'ticket');
add('wuhanq','武汉公开赛资格赛','Wuhan Open Qualifiers','06-15','06-18','qualifier','uk','莱斯特','Mattioli Arena',null,'ticket');
add('shanghai','上海大师赛','Shanghai Masters','07-27','08-02','invite','cn','上海','卢湾体育馆',210000,'star',{note:'24人邀请赛 · 不计入世界排名',champion:{name:'贾德·特鲁姆普',en:'Judd Trump',photo:'https://www.wpbsa.com/wp-content/uploads/Judd-Trump-copy.png',profile:'https://www.wpbsa.com/player/judd-trump/'}});
add('shenzhenq','深圳公开赛资格赛','Shenzhen Open Qualifiers','07-19','07-22','qualifier','uk','莱斯特','Mattioli Arena',null,'ticket');
add('britishq','英国公开赛资格赛','British Open Qualifiers','07-23','07-24','qualifier','uk','莱斯特','Mattioli Arena',null,'ticket');
add('englishq','英格兰公开赛资格赛','English Open Qualifiers','07-25','07-26','qualifier','uk','莱斯特','Mattioli Arena',null,'ticket');
add('china','中国公开赛','China Open','08-08','08-16','ranking','cn','太原','体育中心',250000,'hex',{champion:{name:'马克·塞尔比',en:'Mark Selby',photo:'https://www.wpbsa.com/wp-content/uploads/Mark-Selby-copy.png',profile:'https://www.wpbsa.com/player/mark-selby/'}});
add('wuhan','武汉公开赛','Wuhan Open','08-23','08-29','ranking','cn','武汉','华中科技大学光谷体育馆',175000,'flower',{champion:{name:'常冰玉',en:'Chang Bingyu',photo:'https://www.wpbsa.com/wp-content/uploads/Chang-Bingyu-1024x1024.png',profile:'https://www.wpbsa.com/player/chang-bingyu/'}});
add('british','英国公开赛','British Open','08-31','09-06','ranking','uk','切尔滕纳姆','The Centaur',100000,'shield',{champion:{name:'杰克·琼斯',en:'Jak Jones',photo:'./jak-jones.png',profile:'https://www.wpbsa.com/player/jak-jones/'}});
add('english','英格兰公开赛','English Open','09-07','09-13','ranking','uk','布伦特伍德','Brentwood Leisure Centre',100000,'flag',{note:'本土系列赛',champion:{name:'阿里·卡特',en:'Ali Carter',photo:'./ali-carter.png',profile:'https://www.wpbsa.com/player/ali-carter/'}});
add('northernq','北爱尔兰公开赛资格赛','Northern Ireland Open Qualifiers','09-13','09-16','qualifier','uk','莱斯特','Mattioli Arena',null,'ticket');
add('internationalq','国际锦标赛资格赛','International Championship Qualifiers','09-17','09-19','qualifier','uk','莱斯特','Mattioli Arena',null,'ticket');
add('scottishq','苏格兰公开赛资格赛','Scottish Open Qualifiers','09-20','09-23','qualifier','uk','莱斯特','Mattioli Arena',null,'ticket');
add('shenzhen','深圳公开赛','Shenzhen Open','09-28','10-04','ranking','cn','深圳','宝安体育中心体育馆',177000,'diamond',{note:'中国排名赛 · 官方对阵公布后录入'});
add('northern','北爱尔兰公开赛','Northern Ireland Open','10-18','10-25','ranking','uk','贝尔法斯特','Waterfront Hall',100000,'flower');
add('international','国际锦标赛','International Championship','10-31','11-07','ranking','cn','南京','具体场馆待公布',175000,'target');
add('champions','冠中冠','Champion of Champions','11-09','11-15','invite','uk','莱斯特','Mattioli Arena',null,'crown');
add('germanq','德国大师赛资格赛','German Masters Qualifiers','11-16','11-19','qualifier','uk','维冈','Robin Park',null,'ticket');
add('ukq','英锦赛资格赛','UK Championship Qualifiers','11-21','11-26','qualifier','uk','莱斯特','Mattioli Arena',null,'ticket');
add('uk','英国锦标赛','UK Championship','11-28','12-06','ranking','uk','约克','Barbican Centre',312500,'crown',{note:'三大赛之一 · 年末重磅排名赛'});
add('shootout','单局限时赛','Shoot Out','12-09','12-12','ranking','uk','布莱克浦','Tower Circus',50000,'bolt');
add('scottish','苏格兰公开赛','Scottish Open','12-14','12-20','ranking','uk','爱丁堡','Meadowbank Sports Centre',100000,'shield');
add('leagueinvite','冠军联赛 · 第一组','Championship League · Group 1','12-21','12-22','invite','uk','莱斯特','Mattioli Arena',null,'grid');
  window.CUE_TOURNAMENTS = events;
})();
