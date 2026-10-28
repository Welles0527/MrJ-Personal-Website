/* Curated referee directory. Public sources checked 2026-10-25; not a live tour roster. */
(() => {
  const sources = {
    wst: ['WST 官方裁判名录', 'https://www.wst.tv/referees/'],
    finals: ['TNT Sports · 世锦赛决赛执裁记录', 'https://www.tntsports.co.uk/snooker/why-did-new-world-snooker-championship-final-referee-rob-spencer-refuse-to-clean-the-white-ball-at-crucible-its-an-unwritten-rule_sto23278070/story.shtml'],
    register: ['裁判资料与参考文献', 'https://de.wikipedia.org/wiki/Liste_von_Snookerschiedsrichtern'],
    cbsa: ['中国台球协会 · 高级裁判长名单', 'https://cbsa.cssf.net.cn/annoucement/2014/0106/52255.html'],
    shenzhen: ['中国台球协会 · 深圳公开赛名单', 'https://cbsa.cssf.net.cn/NewsReleases/NewListDetails.htm?id=AE936C87785B99FB'],
    games: ['成都世运会 · 斯诺克裁判名单', 'https://esnooker.pl/turnieje/2025/wg/snooker/show_list_referee.php'],
    zhu: ['新华社 · 诸瑛世锦赛执裁报道', 'https://news.cntv.cn/20120424/101399.shtml'],
    li: ['中国斯诺克裁判资料站（非官方）', 'https://cnref.nanzhu.me/en/referees/li-an/'],
    lyu: ['澎湃新闻 · 吕浠琳专访', 'https://www.thepaper.cn/newsDetail_forward_33983812'],
    lyuAlias: ['裁判资料站 · 姓名对应（非官方）', 'https://cnref.nanzhu.me/en/referees/lyu-zhiwei/'],
    tabb: ['BBC Sport · 塔布执裁生涯', 'https://www.bbc.co.uk/sport/snooker/31970243'],
    women: ['Totally Snookered · 女裁判专访资料', 'https://www.totallysnookered.com/sport/snooker/features/who-are-the-leading-women-snooker-referees-on-the-professional-snooker-tour-4905329'],
    bozhilova: ['WPBSA · 保加利亚裁判报道', 'https://www.wpbsa.com/bulgaria-to-host-2026-wsf-championships/']
  };
  // Chinese / original name, gender, country or region, highlight, biography, sources, aliases.
  // Historical achievements are dated; inclusion never implies current WST employment.
  const profiles = [
    ['郑伟利', 'Zheng Weili', 'male', '中国', '中国斯诺克裁判', '执裁现场照片由用户提供。', [], ''],
    ['诸瑛', 'Zhu Ying', 'female', '中国', '首位执裁世锦赛的中国裁判', '2012 年在克鲁斯堡执裁亨德利与宾汉姆的首轮比赛，成为中国裁判登上这一舞台的先行者。', ['zhu', 'cbsa'], '诸英 褚英'],
    ['李安', 'Peggy Li / Li An', 'female', '中国', '国际排名赛决赛裁判', '曾执裁 2018 年中国公开赛、2023 年上海大师赛等决赛；入选 2025 年成都世运会斯诺克裁判名单。', ['li', 'games']],
    ['吕浠琳', 'Queenie Lyu / Lyu Xilin', 'female', '中国', '亦名吕智维 · 国际排名赛裁判', '曾执裁 2019、2023 年国际锦标赛决赛，2024 年赴英国执裁职业赛事。官方赛事名单亦使用“吕智维”。', ['lyu', 'lyuAlias', 'shenzhen'], '吕智维 Lyu Zhiwei Lu Xilin'],
    ['汪炜', 'Wang Wei', 'male', '中国', '职业巡回赛中国站裁判', '来自江西，入选中国台球协会公布的 2026 年深圳公开赛裁判名单。', ['shenzhen']],
    ['米卡埃拉·塔布', 'Michaela Tabb', 'female', '英国 · 苏格兰', '首位执裁世锦赛决赛的女性', '2009 年执裁世锦赛决赛，2012 年再度担任决赛主裁。', ['tabb', 'register'], '米凯拉 塔布'],
    ['德西斯拉娃·博日洛娃', 'Desislava Bozhilova', 'female', '保加利亚', '2025 年世锦赛决赛裁判', '执裁 2025 年赵心童与马克·威廉姆斯的世锦赛决赛，是保加利亚国际裁判的代表人物。', ['bozhilova', 'finals'], '波兹洛娃 波兹洛夫 博兹洛娃'],
    ['塔季扬娜·沃拉斯顿', 'Tatiana Woollaston', 'female', '白俄罗斯', '2024 年英锦赛决赛裁判', '在 2024 年英国锦标赛首次担任三大赛决赛主裁，也是 WST 官方裁判名录收录的裁判。', ['women', 'wst', 'register'], '塔蒂亚娜 沃拉斯通'],
    ['迈克·凯斯勒', 'Maike Kesseler', 'female', '德国', 'WST 职业巡回赛裁判', '德国女性斯诺克裁判，WST 官方设有个人裁判档案。', ['wst', 'register'], '迈克·凯塞勒'],
    ['普罗莱蒂娜·韦利奇科娃', 'Proletina Velichkova', 'female', '保加利亚', '国际职业赛事裁判', '2012 年起参与职业赛事执裁，是保加利亚女性斯诺克裁判的代表之一。', ['register']],
    ['玛乌戈热塔·卡涅斯卡', 'Małgorzata Kanieska', 'female', '波兰', '职业巡回赛女裁判', '2010 年起参与职业赛事执裁，曾执裁球员打出单杆 147 的比赛。', ['register'], 'Malgorzata Kanieska'],
    ['扬·维尔哈斯', 'Jan Verhaas', 'male', '荷兰', '六届世锦赛决赛主裁', '在 2003、2006、2008、2011、2013、2017 年担任世锦赛决赛裁判。', ['finals', 'wst', 'register'], '雅马哈斯 亚马哈斯 杨·沃哈斯 扬·维尔哈斯'],
    ['保罗·科利尔', 'Paul Collier', 'male', '英国 · 威尔士', '四届世锦赛决赛主裁', '执裁 2004、2016、2021、2024 年世锦赛决赛。', ['finals', 'wst', 'register']],
    ['布伦丹·摩尔', 'Brendan Moore', 'male', '英国 · 英格兰', '三届世锦赛决赛主裁', '担任 2014、2018、2023 年世锦赛决赛裁判。', ['finals', 'register']],
    ['奥利维尔·马蒂尔', 'Olivier Marteel', 'male', '比利时', '两届世锦赛决赛主裁', '执裁 2015、2022 年世锦赛决赛。', ['finals', 'wst', 'register'], '奥利弗 马泰尔'],
    ['马塞尔·埃卡特', 'Marcel Eckardt', 'male', '德国', '2020 年世锦赛决赛裁判', '担任 2020 年奥沙利文与凯伦·威尔逊的世锦赛决赛主裁。', ['finals', 'wst', 'register'], '埃克哈特'],
    ['利奥·斯卡利恩', 'Leo Scullion', 'male', '英国 · 苏格兰', '2019 年世锦赛决赛裁判', '担任 2019 年特鲁姆普与希金斯的世锦赛决赛主裁。', ['finals', 'wst', 'register']],
    ['罗布·斯宾塞', 'Rob Spencer', 'male', '英国 · 英格兰', '2026 年世锦赛决赛裁判', '获任 2026 年克鲁斯堡世锦赛决赛主裁。', ['finals', 'wst', 'register']],
    ['本·威廉姆斯', 'Ben Williams', 'male', '英国 · 英格兰', 'WST 职业巡回赛裁判', '英格兰职业裁判，WST 官方设有个人裁判档案。', ['wst', 'register']],
    ['科林·汉弗莱斯', 'Colin Humphries', 'male', '英国 · 英格兰', 'WST 职业巡回赛裁判', 'WST 官方名录收录的英格兰资深裁判。', ['wst', 'register']],
    ['艾里安·威廉姆斯', 'Eirian Williams', 'male', '英国 · 威尔士', '四届世锦赛决赛主裁', '执裁 2001、2005、2007、2010 年世锦赛决赛。', ['finals', 'register']],
    ['伦·甘利', 'Len Ganley', 'male', '英国 · 北爱尔兰', '四届世锦赛决赛主裁', '执裁 1983、1987、1990、1993 年世锦赛决赛。', ['finals', 'register']],
  ].map(([name, english, gender, country, highlight, bio, refs, aliases = '']) => ({
    name, english, gender, country, highlight, bio, refs, aliases,
    region: country === '中国' ? 'domestic' : 'international'
  }));
  // Photos are tied to named source pages; unresolved portraits remain explicitly pending.
  const portraits = Object.fromEntries([
    ['郑伟利', 'zheng-weili-user.png', '用户提供的执裁现场照', ''],
  [
    "扬·维尔哈斯",
    "janverhaas.jpg",
    "WST 官方",
    "https://www.wst.tv/referees/janverhaas"
  ],
  [
    "保罗·科利尔",
    "paulcollier.jpg",
    "WST 官方",
    "https://www.wst.tv/referees/paulcollier"
  ],
  [
    "德西斯拉娃·博日洛娃",
    "desislavabozhilova.jpg",
    "WST 官方",
    "https://www.wst.tv/referees/desislavabozhilova"
  ],
  [
    "马塞尔·埃卡特",
    "marceleckardt.jpg",
    "WST 官方",
    "https://www.wst.tv/referees/marceleckardt"
  ],
  [
    "奥利维尔·马蒂尔",
    "olivier-marteel.jpg",
    "WST 官方",
    "https://www.wst.tv/referees/olivier-marteel"
  ],
  [
    "罗布·斯宾塞",
    "robspencer.jpg",
    "WST 官方",
    "https://www.wst.tv/referees/robspencer"
  ],
  [
    "本·威廉姆斯",
    "ben-williams.jpg",
    "WST 官方",
    "https://www.wst.tv/referees/ben-williams"
  ],
  [
    "塔季扬娜·沃拉斯顿",
    "tatianawoollaston.jpg",
    "WST 官方",
    "https://www.wst.tv/referees/tatianawoollaston"
  ],
  [
    "迈克·凯斯勒",
    "maikekesseler.jpg",
    "WST 官方",
    "https://www.wst.tv/referees/maikekesseler"
  ],
  [
    "科林·汉弗莱斯",
    "colinhumphries.jpg",
    "WST 官方",
    "https://www.wst.tv/referees/colinhumphries"
  ],
  [
    "利奥·斯卡利恩",
    "leo-scullion-action.jpg",
    "WPBSA 官方",
    "https://www.wpbsa.com/scullion-selected-to-referee-first-world-final/"
  ],
  [
    "诸瑛",
    "zhu-ying-formal.jpg",
    "新浪体育 / TOP147",
    "https://sports.sina.com.cn/others/snooker/2017-07-07/doc-ifyhwefp0236178.shtml"
  ],
  [
    "汪炜",
    "wang-wei.jpg",
    "新浪 · 本人专访",
    "https://k.sina.cn/article_2322963911_8a759dc700102j328.html"
  ],
  [
    "布伦丹·摩尔",
    "brendan-moore.jpg",
    "WST / SnookerHQ",
    "https://snookerhq.com/2023/04/12/brendan-moore-i-already-get-emotional-thinking-about-it/"
  ],
  [
    "艾里安·威廉姆斯",
    "eirian-williams.jpg",
    "欧洲台球和斯诺克协会 EBSA",
    "https://www.ebsa.tv/eirian-williams-retires/"
  ],
  [
    "伦·甘利",
    "len-ganley.jpg",
    "The Guardian",
    "https://www.theguardian.com/sport/2011/aug/30/len-ganley-obituary"
  ],
  [
    "李安",
    "peggy-li-user.png",
    "用户提供的执裁现场照",
    ""
  ],
  [
    "吕浠琳",
    "lyu-xilin-user.png",
    "用户提供的执裁现场照",
    ""
  ],
  [
    "米卡埃拉·塔布",
    "michaela-tabb-user.png",
    "用户提供的执裁现场照",
    ""
  ],
  [
    "玛乌戈热塔·卡涅斯卡",
    "malgorzata-kanieska-user.png",
    "用户提供的执裁现场照",
    ""
  ],
  [
    "普罗莱蒂娜·韦利奇科娃",
    "proletina-velichkova-user.png",
    "用户提供的执裁现场照",
    ""
  ]
].map(([name, file, credit, url]) => [name, { file, credit, url }]));
  const ui = { region: 'all', gender: 'all', query: '' };
  const likeIds = ['zheng-weili','zhu-ying','peggy-li','lyu-xilin','wang-wei','michaela-tabb','desislava-bozhilova','tatiana-woollaston','maike-kesseler','proletina-velichkova','malgorzata-kanieska','jan-verhaas','paul-collier','brendan-moore','olivier-marteel','marcel-eckardt','leo-scullion','rob-spencer','ben-williams','colin-humphries','eirian-williams','len-ganley'];
  profiles.forEach((profile, index) => { profile.likeId = likeIds[index]; });
  const likes = { counts: {}, mine: new Set(), pending: new Set(), requests: new Map(), loaded: false, loading: false, attempted: false, error: '', fetchedAt: 0 };
  const thumb = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10v11H3V10h4Zm0 0 5-8c2 0 3 1 2 4l-1 4h6a2 2 0 0 1 2 2l-2 7a3 3 0 0 1-3 2H7"/></svg>';
  async function requestLikes(payload) {
    const env = 'magicj-web-d5g9yvowj6862f7a2';
    if (!window.cloudbase?.init) throw new Error('SDK unavailable');
    const app = window.cloudbase.init({ env, region: 'ap-shanghai' });
    const auth = app.auth();
    const expired = value => /(?:access_)?token[_ -]?expired|invalid[_ -]?(?:access_)?token|credentials not found|Cannot read properties of null \(reading 'scope'\)/i.test(`${value?.code || ''} ${value?.message || ''}`);
    let renewedOnce = false;
    const refresh = async () => {
      if (renewedOnce) throw new Error('登录状态已过期，请重新登录后重试。');
      renewedOnce = true;
      const renewed = await auth.refreshSession();
      if (renewed?.error) {
        if (expired(renewed.error) || /invalid_grant|refresh_token|revoked/i.test(`${renewed.error.code} ${renewed.error.message}`)) throw new Error('登录状态已过期，请重新登录后重试。');
        throw new Error(renewed.error.message || 'Session renewal unavailable');
      }
      const token = renewed?.data?.session?.access_token;
      if (!token) throw new Error('登录状态已过期，请重新登录后重试。');
      return token;
    };
    const getToken = async () => {
      const personal = Boolean(localStorage.getItem('mywebsite.site-auth-session.v1'));
      let session;
      try { session = await auth.getSession(); if (session?.error) throw Object.assign(new Error(session.error.message), { code: session.error.code }); }
      // This SDK also reports a fresh visitor's missing credentials as a null scope.
      catch (error) {
        if (!expired(error)) throw error;
        if (personal || /token[_ -]?expired/i.test(`${error.code} ${error.message}`)) return refresh();
      }
      if (session?.data?.session?.access_token) return session.data.session.access_token;
      if (personal) return refresh();
      const anonymous = await auth.signInAnonymously();
      if (anonymous?.error) throw new Error(anonymous.error.message);
      return anonymous?.data?.session?.access_token;
    };
    const locked = operation => navigator.locks?.request ? navigator.locks.request(`mywebsite.auth:${env}`, operation) : operation();
    const token = await locked(getToken);
    if (!token) throw new Error('Session unavailable');
    const invoke = async accessToken => {
      const response = await fetch(`https://${env}.ap-shanghai.tcb-api.tencentcloudapi.com/web?env=${env}`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, signal: AbortSignal.timeout(12000),
        body: JSON.stringify({ action: 'functions.invokeFunction', dataVersion: '2020-01-10', env,
          function_name: 'referee-likes', request_data: JSON.stringify(payload), access_token: accessToken })
      });
      if (!response.ok) throw new Error('Service unavailable');
      return response.json();
    };
    let body = await invoke(token);
    // One renewal only; the server's deterministic vote ID makes a retry idempotent.
    if (expired(body) || expired(body?.error)) body = await invoke(await locked(refresh));
    const result = typeof body?.data?.response_data === 'string' ? JSON.parse(body.data.response_data) : body?.data?.response_data;
    if (!result?.ok) throw new Error('Likes unavailable');
    return result;
  }
  function updateLikeButtons() {
    document.querySelectorAll('[data-referee-like]').forEach(button => {
      const id = button.dataset.refereeLike;
      const liked = likes.mine.has(id), pending = likes.pending.has(id);
      button.disabled = !likes.loaded || pending;
      button.setAttribute('aria-pressed', String(liked));
      button.setAttribute('aria-label', `点赞${button.dataset.refereeName}，${likes.counts[id] ?? '尚未加载'}个赞，可再次点赞`);
      button.title = pending ? '正在保存点赞' : '为这位裁判点赞，可重复点击';
      button.innerHTML = `${thumb}<span>${pending ? '…' : likes.counts[id] ?? '—'}</span>`;
    });
    const message = document.getElementById('referee-likes-status');
    if (message) message.textContent = likes.error || (likes.loading ? '正在加载点赞…' : '共享点赞 · 可重复点赞，每次点击增加一个赞');
    const retry = document.querySelector('[data-referee-likes-retry]');
    if (retry) retry.hidden = !likes.error || likes.loading;
  }
  async function loadLikes() {
    if (likes.loading || likes.pending.size) return;
    likes.loading = true; likes.attempted = true; likes.error = ''; updateLikeButtons();
    try {
      const result = await requestLikes({ action: 'list' });
      if (!result.counts || !Array.isArray(result.liked)) throw new Error('Invalid response');
      likes.counts = result.counts; likes.mine = new Set(result.liked); likes.loaded = true; likes.fetchedAt = Date.now();
    } catch (error) { likes.error = error.message === '登录状态已过期，请重新登录后重试。' ? error.message : '点赞暂时不可用，请稍后重试。'; }
    finally { likes.loading = false; updateLikeButtons(); }
  }
  async function likeReferee(id) {
    if (!likes.loaded || likes.pending.has(id)) return;
    if (!likes.requests.has(id)) likes.requests.set(id, crypto.randomUUID());
    likes.pending.add(id); likes.error = ''; updateLikeButtons();
    try {
      const result = await requestLikes({ action: 'like', refereeId: id, requestId: likes.requests.get(id) });
      if (result.refereeId !== id || !Number.isSafeInteger(result.count) || result.count < 1 || result.liked !== true) throw new Error('Invalid response');
      likes.counts[id] = result.count; likes.mine.add(id); likes.requests.delete(id);
    } catch (error) { likes.error = error.message === '登录状态已过期，请重新登录后重试。' ? error.message : '点赞未能确认保存，请重试；重复请求不会重复计数。'; }
    finally { likes.pending.delete(id); updateLikeButtons(); }
  }
  const escape = value => String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
  const normalize = value => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const refereeIcon = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 4 6v6c0 4 4 7 8 9 4-2 8-5 8-9V6z"/><path d="m8 12 3 3 5-6"/></svg>';
  const style = document.createElement('style');
  style.textContent = `
    .referee-page{--ref-accent:var(--selection,var(--purple));--ref-ink:var(--selection-ink,var(--bg));max-width:1440px;margin:auto}
    .referee-hero{display:flex;justify-content:space-between;align-items:center;gap:24px;padding:28px;border:1px solid var(--line);border-radius:16px;background:var(--card)}
    .referee-hero .eyebrow{color:var(--ref-accent);font-size:11px;letter-spacing:2px;margin:0 0 12px}
    .referee-hero h1{font-size:32px;margin:0 0 10px;line-height:1.25}.referee-hero p:last-child{max-width:660px;color:var(--muted);margin:0;line-height:1.8;font-size:13px}
    .referee-total{flex-shrink:0;padding-left:28px;border-left:1px solid var(--line);text-align:center}.referee-total strong{display:block;font-size:48px;line-height:1.2;color:var(--ref-accent)}.referee-total span{font-size:12px;color:var(--muted)}
    .referee-tools{margin:22px 0;padding:18px;border:1px solid var(--line);border-radius:12px;background:var(--card);display:grid;gap:14px}
    .referee-filter-row{display:flex;align-items:center;gap:28px;overflow-x:auto;padding:2px 2px 6px;scrollbar-width:thin}.referee-filter{display:flex;flex:0 0 auto;align-items:center;flex-wrap:nowrap;gap:8px}.referee-filter-label{white-space:nowrap;width:auto;color:var(--muted);font-size:12px}
    .referee-filter-select{display:none;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--text);padding:10px 6px;font:inherit;font-size:12px;min-height:40px}
    .referee-filter button,.referee-reset{border:1px solid var(--line);border-radius:8px;background:transparent;color:var(--text);padding:9px 12px;font:inherit;font-size:12px;cursor:pointer;min-height:40px}
    .referee-filter button[aria-pressed="true"]{background:var(--ref-accent);border-color:var(--ref-accent);color:var(--ref-ink)}.referee-filter button small{margin-left:7px;font-size:11px;opacity:.8}
    .referee-search{display:flex;align-items:center;gap:12px;border-top:1px solid var(--line);padding-top:14px}.referee-search label{flex:1;min-width:0}.referee-search label span{display:block;color:var(--muted);font-size:12px;margin-bottom:7px}
    .referee-search input{width:100%;min-width:0;padding:12px 14px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--text);font:inherit;font-size:14px;box-sizing:border-box}.referee-reset{align-self:flex-end;white-space:nowrap}
    .referee-page :is(button,a,input,select):focus-visible{outline:2px solid var(--ref-accent);outline-offset:3px}
    .referee-result-count{font-size:12px;color:var(--muted);margin:18px 0}.referee-section{margin:0 0 28px}.referee-section>h2{display:flex;align-items:center;gap:10px;font-size:18px;margin:0 0 14px}.referee-section>h2:before{content:'';width:4px;height:18px;border-radius:2px;background:var(--ref-accent)}.referee-section>h2 small{color:var(--muted);font-size:12px;font-weight:400}
    .referee-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.referee-card{min-width:0;padding:20px;border:1px solid var(--line);border-radius:12px;background:var(--card);display:flex;flex-direction:column;gap:14px}
    .referee-photo{margin:0;aspect-ratio:4/3;display:grid;place-items:center;overflow:hidden;border-radius:8px;background:var(--bg);border:1px solid var(--line)}.referee-photo img{display:block;width:100%;height:100%;object-fit:contain}.referee-photo-credit{font-size:10px;color:var(--muted);text-decoration:none;line-height:1.6;overflow-wrap:anywhere}.referee-photo-credit:hover{color:var(--ref-accent);text-decoration:underline}
    .referee-card-head{display:flex;align-items:center;gap:12px}
    .referee-identity{min-width:0;width:100%}.referee-name-row{display:flex;align-items:center;justify-content:space-between;gap:10px}.referee-card h3{font-size:16px;line-height:1.5;margin:0;overflow-wrap:anywhere}.referee-english{color:var(--muted);font-size:11px;line-height:1.5;margin-top:4px;overflow-wrap:anywhere}.referee-tags{display:flex;flex-wrap:wrap;gap:6px}.referee-tags span{padding:4px 8px;font-size:11px;background:var(--bg);border:1px solid var(--line);border-radius:5px;color:var(--muted)}
    .referee-like{display:inline-flex;align-items:center;justify-content:center;gap:6px;flex-shrink:0;min-height:44px;min-width:54px;padding:7px 9px;border:1px solid #d7ad4c66;border-radius:9px;color:#edc35b;background:#d7ad4c0c;cursor:pointer}.referee-like svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:1.7}.referee-like[aria-pressed="true"] svg{fill:currentColor;stroke:var(--card)}.referee-like:disabled{cursor:default}.referee-like:not(:disabled):hover{background:#d7ad4c24;border-color:#edc35b}.referee-like span{font-size:12px;font-variant-numeric:tabular-nums}.referee-likes-note{display:flex;align-items:center;flex-wrap:wrap;gap:8px;color:var(--muted);font-size:12px;margin:0 0 18px}.referee-likes-note button{color:#edc35b;text-decoration:underline}.referee-likes-note button[hidden]{display:none}
    .referee-highlight{color:var(--ref-accent);font-size:12px;line-height:1.6;margin:0;font-weight:600}.referee-bio{font-size:12px;color:var(--muted);line-height:1.9;margin:0}.referee-sources{margin-top:auto;padding-top:12px;border-top:1px solid var(--line);display:flex;flex-direction:column;gap:8px}.referee-sources a{color:var(--muted);font-size:11px;text-decoration:none;line-height:1.6;overflow-wrap:anywhere}.referee-sources a:hover{color:var(--ref-accent);text-decoration:underline}
    .referee-empty{padding:40px 20px;text-align:center;border:1px dashed var(--line);border-radius:12px;color:var(--muted);line-height:1.8}.referee-note{font-size:11px;color:var(--muted);line-height:1.9;border-top:1px solid var(--line);padding-top:18px;margin-top:24px}
    @media(max-width:1200px){.referee-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:680px){.referee-hero{padding:18px;gap:12px;align-items:flex-start}.referee-hero h1{font-size:25px}.referee-hero .eyebrow{font-size:9px;letter-spacing:1px}.referee-hero p:last-child{font-size:12px}.referee-total{padding-left:12px}.referee-total strong{font-size:34px}.referee-total span{font-size:10px}.referee-tools{padding:12px}.referee-filter{gap:6px}.referee-filter-row{gap:12px;overflow:visible}.referee-filter{flex:1;min-width:0}.referee-filter button{display:none}.referee-filter-select{display:block;flex:1;min-width:0;max-width:100%}.referee-filter-label{margin-right:2px}.referee-filter button{padding:9px 11px}.referee-search{align-items:stretch;flex-direction:column}.referee-reset{align-self:flex-start}.referee-grid{grid-template-columns:minmax(0,1fr)}.referee-card{padding:18px}.referee-card h3{font-size:17px}.referee-english{font-size:12px}}
  `;
  document.head.append(style);

  function matches(profile, skip = '') {
    return (skip === 'region' || ui.region === 'all' || ui.region === profile.region) &&
      (skip === 'gender' || ui.gender === 'all' || ui.gender === profile.gender) &&
      normalize(`${profile.name} ${profile.english} ${profile.aliases} ${profile.country}`).includes(normalize(ui.query.trim()));
  }
  function card(profile) {
    const portrait = portraits[profile.name];
    const photo = `<figure class="referee-photo"><img src="./assets/referees/${escape(portrait.file)}" alt="${escape(profile.name)}裁判照片" loading="lazy" decoding="async"></figure>${portrait.url ? `<a class="referee-photo-credit" href="${escape(portrait.url)}" target="_blank" rel="noopener noreferrer">照片：${escape(portrait.credit)} ↗</a>` : `<span class="referee-photo-credit">照片：${escape(portrait.credit)}</span>`}`;
    return `<article class="referee-card" data-referee-name="${escape(profile.name)}" data-referee-region="${profile.region}" data-referee-gender="${profile.gender}">
      ${photo}<div class="referee-card-head"><div class="referee-identity"><div class="referee-name-row"><h3>${escape(profile.name)}</h3><button type="button" class="referee-like" data-referee-like="${profile.likeId}" data-referee-name="${escape(profile.name)}" aria-pressed="false" aria-label="点赞${escape(profile.name)}" disabled>${thumb}<span>—</span></button></div><div class="referee-english" lang="en">${escape(profile.english)}</div></div></div>
      <div class="referee-tags"><span>${escape(profile.country)}</span><span>${profile.gender === 'female' ? '女裁判' : '男裁判'}</span></div>
      <p class="referee-highlight">${escape(profile.highlight)}</p><p class="referee-bio">${escape(profile.bio)}</p>
      <div class="referee-sources">${profile.refs.map(key => `<a href="${escape(sources[key][1])}" target="_blank" rel="noopener noreferrer">${escape(sources[key][0])} ↗</a>`).join('')}</div></article>`;
  }
  function updateResults() {
    const results = document.getElementById('referee-results');
    if (!results) return;
    const visible = profiles.filter(profile => matches(profile));
    document.getElementById('referee-result-count').textContent = `显示 ${visible.length} / ${profiles.length} 位裁判`;
    document.querySelectorAll('[data-referee-filter]').forEach(button => {
      const key = button.dataset.refereeFilter;
      const value = button.dataset.value;
      button.setAttribute('aria-pressed', String(ui[key] === value));
      button.querySelector('small').textContent = profiles.filter(profile => matches(profile, key) && (value === 'all' || profile[key] === value)).length;
    });
    document.querySelectorAll('[data-referee-select]').forEach(select => {
      const key = select.dataset.refereeSelect;
      select.value = ui[key];
      [...select.options].forEach(option => {
        const count = profiles.filter(profile => matches(profile, key) && (option.value === 'all' || profile[key] === option.value)).length;
        option.textContent = `${option.dataset.label} ${count}`;
      });
    });
    results.innerHTML = ['domestic', 'international'].flatMap(region => ['female', 'male'].map(gender => {
      const group = visible.filter(profile => profile.region === region && profile.gender === gender);
      return group.length ? `<section class="referee-section"><h2>${region === 'domestic' ? '国内' : '国外'} · ${gender === 'female' ? '女裁判' : '男裁判'}<small>${group.length} 位</small></h2><div class="referee-grid">${group.map(card).join('')}</div></section>` : '';
    })).join('') || '<div class="referee-empty">没有找到符合条件的裁判。<br>试试其他姓名，或重置筛选。</div>';
    updateLikeButtons();
  }
  function filter(key, label, options) {
    return `<div class="referee-filter" role="group" aria-label="${label}筛选"><span class="referee-filter-label">${label}</span>${options.map(([value, text]) => `<button type="button" data-referee-filter="${key}" data-value="${value}" aria-pressed="${ui[key] === value}">${text}<small>0</small></button>`).join('')}<select class="referee-filter-select" data-referee-select="${key}" aria-label="${label}">${options.map(([value, text]) => `<option value="${value}" data-label="${text}">${text}</option>`).join('')}</select></div>`;
  }
  function applyReferees() {
    const records = document.querySelector('[data-nav="records"]');
    if (records && !document.querySelector('[data-nav="referees"]')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.nav = 'referees';
      button.classList.toggle('active', state.nav === 'referees');
      button.innerHTML = `${refereeIcon}裁判档案`;
      button.onclick = () => {
        state.nav = 'referees';
        document.body.classList.remove('menu-open');
        render();
        window.scrollTo(0, 0);
      };
      records.after(button);
    }
    if (state.nav !== 'referees') return;
    const main = document.querySelector('main');
    if (!main) return;
    document.body.dataset.activeNav = 'referees';
    document.querySelector('header .crumb strong').textContent = ' /  裁判档案';
    main.innerHTML = `<div class="referee-page"><section class="referee-hero"><div><p class="eyebrow">THE PEOPLE BEHIND THE GAME</p><h1>裁判档案</h1><p>认识球台边的执裁者。收录国内外知名职业赛事裁判与历史名裁，按性别和国内外分类浏览。</p></div><div class="referee-total"><strong>${profiles.length}</strong><span>位已收录裁判</span></div></section>
      <section class="referee-tools" aria-label="查找裁判"><div class="referee-filter-row">${filter('region', '范围', [['all', '全部'], ['domestic', '国内'], ['international', '国外']])}${filter('gender', '性别', [['all', '全部'], ['female', '女裁判'], ['male', '男裁判']])}</div><div class="referee-search"><label><span>搜索裁判</span><input id="referee-search" type="search" value="${escape(ui.query)}" placeholder="中文名、英文名或国家 / 地区" autocomplete="off"></label><button type="button" class="referee-reset" data-referee-reset>重置筛选</button></div></section>
      <p class="referee-result-count" id="referee-result-count" role="status" aria-live="polite"></p><div id="referee-results"></div><p class="referee-note">资料核对：2026.10.25 · 国内按中国裁判归类，国外保留国家 / 地区信息。此处为人物档案，包含历史执裁经历，不表示所有人仍在巡回赛执裁。名录根据公开资料整理，并非全球裁判注册全表；每份档案均附来源，非官方资料已标注。</p></div>`;
    main.querySelectorAll('[data-referee-filter]').forEach(button => button.onclick = () => {
      ui[button.dataset.refereeFilter] = button.dataset.value;
      updateResults();
    });
    main.querySelectorAll('[data-referee-select]').forEach(select => select.onchange = () => {
      ui[select.dataset.refereeSelect] = select.value;
      updateResults();
    });
    main.querySelector('#referee-search').oninput = event => {
      ui.query = event.target.value;
      updateResults();
    };
    main.querySelector('[data-referee-reset]').onclick = () => {
      ui.region = 'all'; ui.gender = 'all'; ui.query = '';
      main.querySelector('#referee-search').value = '';
      updateResults();
    };
    updateResults();
    const status = document.createElement('div');
    status.className = 'referee-likes-note';
    status.innerHTML = '<span id="referee-likes-status" role="status" aria-live="polite"></span><button type="button" data-referee-likes-retry hidden>重试</button>';
    main.querySelector('#referee-result-count').after(status);
    status.querySelector('button').onclick = loadLikes;
    main.querySelector('#referee-results').onclick = event => {
      const button = event.target.closest('[data-referee-like]');
      if (button && !button.disabled) likeReferee(button.dataset.refereeLike);
    };
    updateLikeButtons();
    if (!likes.loading && (!likes.attempted || (likes.loaded && Date.now() - likes.fetchedAt > 60000))) loadLikes();
  }
  const previousRender = render;
  render = function () { previousRender(); applyReferees(); };
  applyReferees();
})();
