'use strict';

const byId = id => document.getElementById(id);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[ch]);
const num = value => value !== null && value !== '' && value !== undefined && Number.isFinite(Number(value));
const countText = n => Number(n).toLocaleString('zh-CN');
const listText = value => Array.isArray(value) ? value.filter(Boolean).join('、') : String(value || '');
const sourceLabels = {
  all: '多平台口碑', douban: '豆瓣电影', imdb: 'IMDb', rt: '烂番茄', iqiyi: '爱奇艺', youku: '优酷评分',
  maoyan: '猫眼电影', viki: 'Rakuten Viki', metacritic: 'Metacritic', tmdb: 'TMDB', tvmaze: 'TVmaze'
};
const sourceKeys = Object.keys(sourceLabels).filter(key => key !== 'all');
const historyLabels = {...sourceLabels,rt:'烂番茄影评人好评率',rtavg:'烂番茄影评均分',rtaud:'烂番茄观众好评率',movielens:'MovieLens',jincheng:'金橙评分'};
const watchLabels = {youku:'优酷',netflix:'Netflix',youtube:'YouTube'};
const linkLabels = {...sourceLabels,...watchLabels};
const tabLabels = {discover: '筛选结果', ranking: '口碑榜', saved: '我的收藏'};
const ageGroups = ['50后', '60后', '70后', '80后', '90后', '00后'];
const regionGroups = ['国产剧', '美剧', '英剧', '韩剧', '日剧'];
const mainGenres = ['剧情', '悬疑', '古装', '喜剧', '历史', '家庭', '自然', '科幻', '权谋', '宫廷'];
const savedKey = 'guangying.saved.v1';
const layout = window.matchMedia('(max-width:650px)');
const tablet = window.matchMedia('(max-width:900px)');
let tab = 'discover';
let page = 1;
let filters = freshFilters();
let selectedId = null;
let availableGenres = mainGenres;
let availableCountries = [];
let request = null;
let refreshTimer;
let items = [];
let total = 0;
let pageSize = 24;
let catalogError = false;
let catalogStatus = null;
let compareRequest = 0;
const comparing = new Map();
let missingRequest = null;
let archivedIds = [];

function readSaved() {
  try {
    const values = JSON.parse(localStorage.getItem(savedKey) || '[]');
    const entries = new Map();
    if (!Array.isArray(values)) return entries;
    for (const value of values) {
      const id = typeof value === 'string' ? value : value?.id;
      if (typeof id === 'string' && id) entries.set(id, typeof value === 'string' ? {id} : value);
    }
    return entries;
  } catch { return new Map(); }
}
let saved = readSaved();
function savedSnapshot(work) {
  const url = ['tmdb','douban','imdb',...sourceKeys].map(key => safeLink(ratingUrl(work,key))).find(Boolean) || '';
  return {id:idOf(work),title:String(work.title || ''),year:work.year || null,url};
}
function persistSaved() {
  try {
    localStorage.setItem(savedKey,JSON.stringify([...saved.values()]));
    byId('storage-status').textContent = '';
  } catch { byId('storage-status').textContent = '浏览器存储不可用，本次收藏变更仅在当前页面保留。'; }
}
function freshFilters(forTab = 'discover') {
  return {type: '', area: '', region: '', country: '', ages: [], genres: [], classic: false,
    seed: '', from: '', to: '', linked: '', archive: '', source: 'all', band: '', minSources: '', minVotes: forTab === 'ranking' ? '100' : '0'};
}
function safeLink(raw, allowLocal = false) {
  if (typeof raw !== 'string' || !raw.trim()) return '';
  try {
    const url = new URL(raw, location.origin);
    if (!['https:', 'http:'].includes(url.protocol)) return '';
    if (url.origin === location.origin && !allowLocal) return '';
    return url.href;
  } catch { return ''; }
}
function link(raw, label) {
  const url = safeLink(raw);
  return url ? '<a target="_blank" rel="noopener noreferrer" href="' + escapeHtml(url) + '">' + escapeHtml(label) + '</a>' : '';
}
function scoreUnit(key) { return ['rt','rtaud'].includes(key) ? '%' : key === 'metacritic' ? '/100' : '/10'; }
function scoreNumber(value) {
  return num(value) ? Number(value).toLocaleString('zh-CN', {maximumFractionDigits: 3}) : '—';
}
function dateText(raw) {
  if (!raw) return '';
  if (typeof raw === 'string' && /^\d{4}-\d{2}$/.test(raw)) return raw;
  if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const d = new Date(raw);
  return Number.isNaN(d.valueOf()) ? '' : d.toLocaleDateString('zh-CN');
}
function choiceButtons(key, choices) {
  return ['', ...choices].map(value => {
    const chosen = Array.isArray(filters[key]) ? (value ? filters[key].includes(value) : !filters[key].length) : filters[key] === value;
    return '<button data-filter="' + key + '" data-value="' + escapeHtml(value) + '" aria-pressed="' + chosen + '" class="' + (chosen ? 'on' : '') + '">' + escapeHtml(value || '全部') + '</button>';
  }).join('');
}
function bands() {
  const key = filters.archive || filters.source;
  const hundred = ['rt','rtaud','metacritic'].includes(key);
  const mul = hundred ? 10 : 1;
  const suffix = scoreUnit(key) === '%' ? '%' : '分';
  return [[9,10],[8.5,9],[8,8.5],[7.5,8],[null,7.5]].map(([low,high]) => {
    const from = low === null ? '' : low * mul;
    const to = high * mul;
    return {value: from + ',' + to, label: (low === null ? '低于' + to : from + '–' + to) + suffix};
  });
}
function ratingBands() {
  return [{value:'',label:'全部'}, ...bands()].map(b => '<button data-filter="band" data-value="' + b.value + '" aria-pressed="' + (filters.band === b.value) + '" class="' + (filters.band === b.value ? 'on' : '') + '">' + b.label + '</button>').join('');
}
function row(title, content) {
  return '<div class="row"><span class="label">' + title + '</span><div class="choices">' + content + '</div></div>';
}
function voteOptions(critics) {
  return ['0','10','100','1000','10000'].map(value => {
    const label = value === '0' ? '不限' : '至少 ' + countText(value) + (critics ? ' 篇影评' : ' 票');
    return '<option value="' + value + '"' + (filters.minVotes === value ? ' selected' : '') + '>' + label + '</option>';
  }).join('');
}
function historySources(status) {
  const primary = sourceKeys.filter(key => Number(status?.sources?.[key]?.historical) > 0);
  return [...primary,...['rtavg','rtaud','movielens','jincheng'].filter(key=>Number(status?.historicalMetrics?.[key])>0)];
}
function renderFilters() {
  const focus = byId('filter-rows').contains(document.activeElement) ? document.activeElement : null;
  const chip = byId('linked-filter');
  const sourceFilter = [filters.archive && historyLabels[filters.archive] + '历史评分',
    filters.linked && linkLabels[filters.linked] + '原站链接'].filter(Boolean).join('、');
  chip.hidden = !sourceFilter;
  chip.textContent = sourceFilter ? '有' + sourceFilter + ' ×' : '';
  chip.setAttribute('aria-label','移除' + sourceFilter + '条件');
  const genres = [...new Set([...mainGenres, ...availableGenres])];
  const extra = genres.filter(g => !mainGenres.includes(g));
  const extraSelected = filters.genres.filter(g => extra.includes(g));
  let genreControls = choiceButtons('genres', [...mainGenres, ...extraSelected]);
  if (extra.some(g => !extraSelected.includes(g))) {
    genreControls += '<select id="more-genres" aria-label="添加其他题材"><option value="">更多题材</option>' +
      extra.filter(g => !extraSelected.includes(g)).map(g => '<option value="' + escapeHtml(g) + '">' + escapeHtml(g) + '</option>').join('') + '</select>';
  }
  const sourceOptions = Object.entries(sourceLabels).filter(([id]) => !['tvmaze','youku','viki'].includes(id) || catalogStatus?.sources?.[id]?.count).map(([id, text]) =>
    '<option value="' + id + '"' + (!filters.archive && filters.source === id ? ' selected' : '') + '>' + text + '</option>').join('');
  const archives = historySources(catalogStatus).map(key => '<option value="history:' + key + '"' +
    (filters.archive === key ? ' selected' : '') + '>' + historyLabels[key] + ' · 历史评分</option>').join('');
  const critics = ['rt','rtavg','metacritic'].includes(filters.archive);
  const voteLabel = critics ? '影评篇数' : '评分人数';
  const platformOptions = ['','2','3'].map(value => '<option value="' + value + '"' +
    (filters.minSources === value ? ' selected' : '') + '>' + (value ? '至少 ' + value + ' 个' : '不限') + '</option>').join('');
  const platformFilter = catalogStatus?.scoreSourceCountFilter ?
    '<label class="sub">评分平台数 <select id="minSources">' + platformOptions + '</select></label>' : '';
  const countries = availableCountries.map(({code,label,count}) => '<option value="' + escapeHtml(code) + '"' +
    (filters.country === code ? ' selected' : '') + '>' + escapeHtml(label) + '（' + countText(count) + '）</option>').join('');
  byId('filter-rows').innerHTML =
    row('作品类型', choiceButtons('type',['电影','电视剧','纪录片','AI短剧'])) +
    row('适合人群', choiceButtons('ages',ageGroups)) +
    row('地区', choiceButtons('area',['国内','国外']) + '<span class="sub">剧集地区</span>' + choiceButtons('region',regionGroups) +
      '<select id="country" aria-label="制作国家或地区"><option value="">全部制作地区</option>' + countries + '</select>') +
    row('题材', genreControls + '<label><input type="checkbox" id="classic"' + (filters.classic ? ' checked' : '') + '>只看经典</label>') +
    row('上映／首播年份','<div class="years"><input type="number" min="1880" max="2200" id="from" placeholder="起始年份" aria-label="起始年份" value="' + escapeHtml(filters.from) + '"> — <input type="number" min="1880" max="2200" id="to" placeholder="结束年份" aria-label="结束年份" value="' + escapeHtml(filters.to) + '"></div>') +
    row('高分入选平台','<select id="seed" aria-label="高分入选平台"><option value="">全部平台</option>' + ['douban','iqiyi','maoyan','rt','imdb','tmdb','youku','metacritic','tvmaze','viki','jincheng'].filter(k => catalogStatus?.seedCounts?.[k]).map(k => '<option value="'+k+'"'+(filters.seed===k?' selected':'')+'>'+escapeHtml(sourceLabels[k] || historyLabels[k])+'</option>').join('')+'</select>') +
    row(filters.archive ? '历史评分区间' : '评分区间','<select id="source" aria-label="评分来源">' + sourceOptions +
      (archives ? '<optgroup label="历史评分">' + archives + '</optgroup>' : '') + '</select>' + ratingBands() +
      '<label class="sub">' + voteLabel + ' <select id="minVotes" aria-label="最低' + voteLabel + '">' + voteOptions(critics) + '</select></label>' + platformFilter);
  if (focus?.id) byId(focus.id)?.focus({preventScroll:true});
  else if (focus?.dataset.filter) {
    [...byId('filter-rows').querySelectorAll('[data-filter]')].find(b =>
      b.dataset.filter === focus.dataset.filter && b.dataset.value === focus.dataset.value)?.focus({preventScroll:true});
  }
}
function sourceRating(work, key) {
  const entry = work.ratings?.[key];
  return entry && num(entry.value) ? entry : null;
}
function cardScore(work, key) {
  if (key) return {value: work.historicalRatings?.[key]?.value, label: historyLabels[key] + ' · 历史', suffix: scoreUnit(key)};
  if (filters.source !== 'all') {
    const rating = sourceRating(work, filters.source);
    return {value: rating?.value, label: sourceLabels[filters.source], suffix: scoreUnit(filters.source)};
  }
  const keys = sourceKeys.filter(key => key !== 'rt' && sourceRating(work, key));
  if (keys.length === 1) {
    const key = keys[0];
    return {value: work.ratings[key].value, label: sourceLabels[key], suffix: scoreUnit(key)};
  }
  if (!keys.length && sourceRating(work,'rt')) return {value:work.ratings.rt.value, label:'烂番茄好评率', suffix:'%'};
  return {value: work.sampleMax, label: '最高平台分（折合）', suffix:'/10'};
}
function idOf(work) { return String(work.id); }
function bookmark(work) {
  const isSaved = saved.has(idOf(work));
  return '<button class="save" data-save="' + escapeHtml(work.id) + '" aria-label="' + (isSaved ? '取消收藏' : '收藏') + escapeHtml(work.title) +
    '" aria-pressed="' + isSaved + '" title="' + (isSaved ? '取消收藏' : '收藏') + '"><svg aria-hidden="true" viewBox="0 0 20 26"><path d="M2 2h16v21l-8-5-8 5z" stroke="currentColor" stroke-width="2" fill="' + (isSaved ? 'currentColor' : 'none') + '"/></svg></button>';
}
function card(work) {
  const id = idOf(work), key = escapeHtml(id), title = escapeHtml(work.title);
  const regions = work.countries || [];
  const cardRegions = regions.length > 2 ? [regions[0],regions[1] + '等'] : regions;
  const term = byId('search').value.normalize('NFKC').trim().toLowerCase();
  const matchedAlias = term && work.imdbAkas?.find(name => name !== work.title && name.normalize('NFKC').toLowerCase().includes(term));
  const meta = [...new Set([matchedAlias, work.type, work.ratings?.imdb?.edition, work.region || work.area, ...cardRegions, ...(work.genres || [])].filter(Boolean))].join(' · ');
  const ages = (work.ages || []).map(age => '<span class="age">' + escapeHtml(age) + '</span>').join('');
  const poster = safeLink(work.poster, true);
  const archive = filters.archive || (filters.source === 'all' && work.archiveOnly && Object.entries(work.historicalRatings || {})
    .filter(([source,rating]) => (['rtavg','rtaud'].includes(source) || rating.votes >= 1 || rating.published) && rating.value >= (rating.unit === 100 ? 75 : 7.5))
    .sort((a,b) => b[1].updatedAt.localeCompare(a[1].updatedAt))[0]?.[0]);
  const score = cardScore(work,archive), isPicked = comparing.has(id);
  const historical = archive && work.historicalRatings?.[archive];
  const badgeText = !num(score.value) && work.selectionReason ? '入选作品' :
    '<b>' + scoreNumber(score.value) + '</b>' + (num(score.value) ? score.suffix : '') + ' ' + score.label;
  const badge = '<span class="score-badge">' + badgeText + '</span>';
  const shownScore = historical ? '<div class="history-score">' + badge + '<small>' +
    link(historical.citation,archive==='iqiyi' ? '旧榜 · '+dateText(historical.updatedAt) : dateText(historical.updatedAt)) + '</small></div>' : badge;
  const linkedUrl = Object.hasOwn(watchLabels,filters.linked) ? work.links?.[filters.linked] : ratingUrl(work,filters.linked);
  return '<article class="card' + (selectedId === id ? ' active' : '') + '"><button class="face" data-detail="' + key + '" aria-expanded="' + (selectedId === id) + '" aria-label="查看' + title + '的作品详情"><div class="poster"><span class="fallback" aria-hidden="true">' + title + '</span>' +
    (poster ? '<img alt="" loading="lazy" decoding="async" src="' + escapeHtml(poster) + '">' : '') +
    (work.classic ? '<span class="stamp">经典</span>' : '') + '</div><div class="meta"><span class="title">' + title + '</span>' +
    (work.year ? '<span class="year">' + escapeHtml(work.year) + '</span>' : '') +
    '<div class="tags">' + escapeHtml(meta) + ' ' + ages + '</div></div></button>' + bookmark(work) +
    '<div class="card-actions">' + shownScore + (filters.linked ? link(linkedUrl,linkLabels[filters.linked] + '原站') : '') +
    '<button class="compare-pick" data-add="' + key + '" aria-pressed="' + isPicked + '">' + (isPicked ? '已选对比' : '加入对比') + '</button></div></article>';
}
function votesText(rating) {
  return rating?.votesLabel || (num(rating?.votes) ? countText(rating.votes) + ' 人评分' : '');
}
function applicable(work, key) {
  if (key === 'youku') return Boolean(sourceRating(work,key));
  return !['viki','tvmaze'].includes(key) || Boolean(sourceRating(work,key) || work.links?.[key]);
}
function ratingUrl(work, key) {
  return work.ratings?.[key]?.url || work.links?.[key];
}
function ratingValue(work, key) {
  const rating = sourceRating(work, key);
  if (!rating) return '—';
  return scoreNumber(rating.value) + scoreUnit(key);
}
function audienceValue(rating) {
  const audience = rating?.audience;
  const value = typeof audience === 'object' && audience ? audience.value : audience;
  return num(value) ? '观众好评率 ' + scoreNumber(value) + '%' : '';
}
function metricInfo(work, key) {
  const rating = sourceRating(work, key);
  const notes = [votesText(rating)];
  if (key === 'rt' && rating) {
    notes[0] = num(rating.votes) ? countText(rating.votes) + ' 篇影评' : '';
    notes.push(audienceValue(rating));
  }
  if (key === 'metacritic' && rating && num(rating.votes)) notes[0] = countText(rating.votes) + ' 篇评价';
  if (key === 'iqiyi' && rating) notes.unshift(rating.citation ? ['观众推荐分',rating.edition].filter(Boolean).join(' · ') : '作品页评分');
  if (key === 'imdb' && rating?.edition) notes.unshift(rating.edition + '评分');
  if (key === 'maoyan' && rating && !rating.citation) notes.unshift('购票评分');
  if (key === 'tvmaze' && rating && !num(rating.votes)) notes.unshift('观众评分 · 票数未公布');
  let date = dateText(rating?.updatedAt || rating?.date || (key === 'tmdb' && work.snapshotDate));
  if (!date && key === 'tmdb' && rating && catalogStatus?.kind === 'snapshot') {
    const label = idOf(work).startsWith('tmdb-tv-') ? '电视' : idOf(work).startsWith('tmdb-movie-') ? '电影' : null;
    const sources = (catalogStatus.evidence || []).filter(s => label && String(s.label).includes(label));
    if (sources.length === 1) date = dateText(sources[0].date);
  }
  if (date) notes.push(key === 'youku' || (key === 'maoyan' && rating && !rating.citation) ? '核对日期 ' + date : date);
  return notes.filter(Boolean);
}
function metricNote(value) {
  const date = /^核对日期 (\d{4}-\d{2}-\d{2})$/.exec(value);
  return date ? '核对日期 <time style="white-space:nowrap">' + date[1] + '</time>' : escapeHtml(value);
}
function historicalValue(rating,key) {
  if(!rating) return '—';
  const value = scoreNumber(rating.value) + scoreUnit(key);
  const votes = ['rt','rtavg','metacritic'].includes(key) && num(rating.votes) ? countText(rating.votes) + ' 篇影评' : votesText(rating);
  if(key==='iqiyi')return value + '<small class="metric-note">' +
    escapeHtml([rating.edition,'页面版本 '+dateText(rating.updatedAt),votes].filter(Boolean).join(' · ')) +
    ' · ' + link(rating.citation,'爱奇艺旧榜') + '</small>';
  const annualMaoyan = key === 'maoyan' && rating.citation?.startsWith('https://i.maoyan.com/asgard/board?id=24&year=');
  const youkuDouban = key === 'douban' && rating.citation?.startsWith('https://v.youku.com/v_show/');
  const citationLabel = key==='movielens' ? 'GroupLens 数据集' :
    annualMaoyan ? '猫眼年度购票榜' : youkuDouban ? '优酷作品页' : rating.published ? '披露出处' : '维基数据引用';
  const dateLabel = youkuDouban ? '核对日期 ' : key==='viki' ? '记录日期 ' : '披露日期 ';
  return (link(rating.url,value) || value) + '<small class="metric-note">' +
    escapeHtml([rating.verified ? '购票验证' : '',rating.published ? dateLabel+dateText(rating.updatedAt) : rating.updatedAt,rating.observation,votes].filter(Boolean).join(' · ')) +
    ' · ' + link(rating.citation,citationLabel) + '</small>';
}
function ratingRadar(work) {
  const axes = [];
  const history = work.historicalRatings || {};
  const keys = [...sourceKeys, 'movielens', 'jincheng'];
  for (const key of keys) {
    const historicalKey = key === 'rt' ? ['rtavg', 'rt', 'rtaud'].find(k => num(history[k]?.value)) : key;
    const audience = key === 'rt' && !sourceRating(work, key) ? work.ratings?.rtaud : null;
    const current = sourceRating(work, key) || audience;
    const rating = current || history[historicalKey];
    if (!num(rating?.value)) continue;
    const unit = Number(rating.unit || (['rt','rtaud','metacritic'].includes(current ? key : historicalKey) ? 100 : 10));
    const value = Number(rating.value);
    if (unit <= 0 || value < 0 || value > unit) continue;
    const label = key === 'rt' ? (audience || (!current && historicalKey === 'rtaud') ? '烂番茄·观众' : '烂番茄·影评人') : sourceLabels[key] || historyLabels[key];
    const metric = current && key === 'rt' || !current && ['rt','rtaud'].includes(historicalKey)
      ? scoreNumber(value) + '%' : scoreNumber(value) + '/' + unit;
    axes.push({label, metric, historical: !current, fraction: value / unit});
  }
  if (!axes.length) return '';
  const center = 190, radius = 103;
  const point = (i, r) => {
    const angle = -Math.PI / 2 + i * 2 * Math.PI / axes.length;
    return [center + r * Math.cos(angle), center + r * Math.sin(angle)];
  };
  const rings = [2,4,6,8,10].map(n =>
    '<circle class="radar-ring" cx="190" cy="190" r="' + radius * n / 10 + '"/>' +
    '<text class="radar-tick" x="184" y="' + (190 - radius * n / 10 + 3) + '" text-anchor="end">' + n + '</text>'
  ).join('');
  const spokes = axes.map(({label,metric,historical}, i) => {
    const [x,y] = point(i,radius);
    const [lx,ly] = point(i,radius + 22);
    const anchor = Math.abs(lx - center) < 12 ? 'middle' : lx > center ? 'start' : 'end';
    return '<line class="radar-axis" data-platform="' + escapeHtml(label) + '" x1="190" y1="190" x2="' + x + '" y2="' + y + '"/>' +
      '<text class="radar-label" x="' + lx + '" y="' + ly + '" text-anchor="' + anchor + '">' + escapeHtml(label) +
      '<tspan class="radar-value" x="' + lx + '" dy="15">' + escapeHtml(metric + (historical ? ' · 历史' : '')) + '</tspan></text>';
  }).join('');
  const values = axes.map((axis,i) => point(i,radius * axis.fraction));
  const points = values.map(p => p.join(',')).join(' ');
  const trace = axes.length >= 3 ? '<polygon class="radar-shape" points="' + points + '"/>' :
    axes.length === 2 ? '<polyline class="radar-shape" points="' + points + '"/>' : '';
  const dots = values.map(([x,y]) => '<circle class="radar-dot" cx="' + x + '" cy="' + y + '" r="4"/>').join('');
  const description = axes.map(a => a.label + ' ' + a.metric + (a.historical ? '（历史）' : '')).join('，');
  return '<figure class="rating-radar"><figcaption>平台评分蜘蛛图</figcaption>' +
    '<svg viewBox="0 42 380 305" role="img" aria-label="' + escapeHtml(description) + '">' + rings + spokes + trace + dots + '</svg>' +
    '<p>轴线统一为 0–10，平台标签保留原始分制。百分比按比例绘制。</p></figure>';
}
function detail(work) {
  const keys = work.ratings?.rtaud ? [...sourceKeys, 'rtaud'] : sourceKeys;
  const cells = keys.filter(key => applicable(work,key)).map(key => {
    const name = key === 'rt' ? '烂番茄 · 影评人' : sourceLabels[key] || historyLabels[key];
    const citation = link(sourceRating(work,key)?.citation,key === 'imdb' ? '版本出处' : '榜单出处');
    return '<div class="rating-cell"><span class="source-name">' + (link(ratingUrl(work,key),name) || name) + '</span><span class="metric">' +
      ratingValue(work,key) + '</span>' + metricInfo(work,key).map(v => '<small>' + metricNote(v) + '</small>').join('') +
      (citation ? '<small>' + citation + '</small>' : '') + '</div>';
  }).join('');
  const watchLinks = Object.entries(watchLabels).map(([key,name]) => link(work.links?.[key],name + '片目')).filter(Boolean);
  const credits = listText(work.people);
  const imdbAkas = (work.imdbAkas || []).filter(name => name !== work.title && name !== work.originalTitle);
  const evidence = [...(work.evidence || []),...(work.genreEvidence || [])].map(item => link(item.url,item.label)).filter(Boolean);
  if(work.keywordTags?.length) {
    const keywordSource = link(work.links?.tmdb,'TMDB 关键词 · ' + listText(work.keywordTags));
    if(keywordSource) evidence.push(keywordSource);
  }
  const history = Object.entries(work.historicalRatings || {}).map(([key,rating]) =>
    '<div class="rating-cell"><div class="source-name">' + historyLabels[key] + ' · 历史</div>' +
    historicalValue(rating,key) + '</div>').join('');
  return '<section class="detail" aria-label="作品详情"><div class="detail-head"><h3>' + escapeHtml(work.title) + ' · 作品档案</h3><button class="dismiss" data-detail="' + escapeHtml(work.id) + '">收起详情</button></div>' +
    (work.originalTitle && work.originalTitle !== work.title ? '<p class="credits">' + escapeHtml(work.originalTitle) + '</p>' : '') +
    (imdbAkas.length ? '<p class="credits">IMDb 中文片名 ／ ' + escapeHtml(listText(imdbAkas)) + '</p>' : '') +
    (work.countries?.length ? '<p class="credits">制作地区 ／ ' + escapeHtml(listText(work.countries)) + '</p>' : '') +
    (credits ? '<p class="credits">主创与出镜 ／ ' + escapeHtml(credits) + '</p>' : '') +
    (work.overview ? '<p>' + escapeHtml(work.overview) + '</p>' : '') +
    (work.ageNote ? '<p class="credits">年代推荐依据 ／ ' + escapeHtml(work.ageNote) + '</p>' : '') +
    (work.classicReason ? '<p class="credits">经典入选依据 ／ ' + escapeHtml(work.classicReason) + '</p>' : '') +
    (work.selectionReason ? '<p class="credits">收录依据 ／ ' + escapeHtml(work.selectionReason) + '</p>' : '') +
    ratingRadar(work) + '<div class="rating-grid">' + cells + '</div>' +
    (history ? '<h3>历史评分引用</h3><div class="rating-grid">' + history + '</div>' : '') +
    (evidence.length ? '<div class="film-links" aria-label="作品资料出处">' + [...new Set(evidence)].join('') + '</div>' : '') +
    (watchLinks.length ? '<div class="film-links" aria-label="观看平台入口">' + watchLinks.join('') + '</div>' : '') + '</section>';
}
function renderItems() {
  if (catalogError) return;
  byId('count').textContent = countText(total) + ' 部作品';
  const width = layout.matches ? 1 : tablet.matches ? 2 : 3;
  let html = '';
  for (let i=0; i<items.length; i+=width) {
    const chunk = items.slice(i,i+width);
    const active = chunk.find(work => idOf(work) === selectedId);
    html += '<div class="shelf-row"><div class="grid">' + chunk.map(card).join('') + '</div>' + (active ? detail(active) : '') + '</div>';
  }
  let empty = '没有匹配的作品。可清空筛选或更换关键词。';
  if (tab === 'saved' && saved.size === 0) empty = '还没有收藏。点击海报右上角的书签即可加入。';
  else if (catalogStatus?.total === 0) empty = '片库暂未收录作品。';
  byId('results').innerHTML = html || '<p class="empty">' + empty + '</p>';
  const pages = Math.ceil(total/pageSize);
  byId('pagination').innerHTML = pages > 1 ? '<button class="plain" data-page="' + (page - 1) + '"' + (page <= 1 ? ' disabled' : '') +
    '>上一页</button><span>第 ' + page + ' / ' + countText(pages) + ' 页</span><button class="plain" data-page="' + (page + 1) + '"' + (page >= pages ? ' disabled' : '') + '>下一页</button>' : '';
}
function notify(message) { byId('status').textContent = message; }
function apiParams() {
  const params = new URLSearchParams({tab, page: String(page), q: byId('search').value.trim(), sort: byId('sort').value});
  for (const key of ['seed','source','linked','archive','type','area','region','country','ages','genres','from','to','minVotes','minSources']) {
    const value = filters[key];
    if (String(value)) params.set(key, String(value));
  }
  if (filters.classic) params.set('classic','1');
  if (filters.band) {
    const [min,max] = filters.band.split(',');
    if (min) params.set('min',min);
    if (max) params.set('max',max);
  }
  return params;
}
async function getJson(url, signal, body) {
  if (url.startsWith("/api/")) return publicCatalog(url,signal,body);
  const options = {signal, headers:{Accept:'application/json'}};
  if (body !== undefined) {
    options.method = 'POST';
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }
  const response = await fetch(url, options);
  if (!response.ok) throw new Error('HTTP ' + response.status);
  return response.json();
}
async function fetchItems() {
  request?.abort();
  const current = new AbortController();
  request = current;
  notify('');
  byId('results').setAttribute('aria-busy','true');
  try {
    if (filters.from && filters.to && Number(filters.from) > Number(filters.to)) {
      catalogError = true;
      byId('results').innerHTML = '<p class="empty">起始年份应早于或等于结束年份。</p>';
      byId('count').textContent = '';
      byId('pagination').replaceChildren();
      return;
    }
    const data = await getJson('/api/catalog?' + apiParams(),current.signal,tab === 'saved' ? {ids:[...saved.keys()]} : undefined);
    if (request !== current) return;
    items = Array.isArray(data.items) ? data.items : [];
    total = Number(data.total) || 0;
    pageSize = Number(data.pageSize) || 24;
    let upgraded = false;
    for (const work of items) {
      const id = idOf(work);
      const old = saved.get(id);
      const legacy = (work.priorIds || []).filter(previous => saved.has(previous));
      if (legacy.length || (old && !old.title)) {
        for (const previous of legacy) saved.delete(previous);
        saved.set(id,savedSnapshot(work));
        upgraded = true;
      }
    }
    if (upgraded) { persistSaved(); showSavedCount(); }
    if (page > 1 && page > Math.max(1, Math.ceil(total / pageSize))) {
      page = Math.max(1, Math.ceil(total / pageSize));
      return fetchItems();
    }
    catalogError = false;
    renderItems();
  } catch (e) {
    if (current.signal.aborted) return;
    catalogError = true;
    byId('count').textContent = '';
    byId('pagination').replaceChildren();
    byId('results').innerHTML = '<p class="empty">暂时无法读取片库。<button class="plain" id="retry">重新读取</button></p>';
  } finally {
    if (request === current) byId('results').setAttribute('aria-busy','false');
  }
}
function refresh(debounce = false) {
  page = 1;
  selectedId = null;
  clearTimeout(refreshTimer);
  request?.abort();
  if (debounce) refreshTimer = setTimeout(fetchItems,180);
  else fetchItems();
}
function resetFilters() {
  filters = freshFilters(tab);
  byId('search').value = '';
  byId('sort').value = tab === 'discover' ? 'recommended' : 'score';
  renderFilters();
}
function selectTab(next, linkFilter = '', historyFilter = '') {
  tab = next;
  byId('results-heading').textContent = tabLabels[tab];
  document.querySelectorAll('[data-tab]').forEach(button => {
    const on = button.dataset.tab === tab;
    button.classList.toggle('on',on);
    if (on) button.setAttribute('aria-current','page'); else button.removeAttribute('aria-current');
  });
  resetFilters();
  if (linkFilter || historyFilter) {
    filters.linked = linkFilter;
    filters.archive = historyFilter;
    if (historyFilter) byId('sort').value = 'score';
    renderFilters();
  }
  byId('archive-panel').hidden = tab !== 'saved';
  if (tab === 'saved') { byId('archive').open = false; fetchMissing(); }
  else { missingRequest?.abort(); byId('archive').hidden = true; }
  refresh();
}
function changeChoice(key, value) {
  if (Array.isArray(filters[key])) {
    const old = filters[key];
    filters[key] = !value ? [] : old.includes(value) ? old.filter(v => v !== value) : [...old,value];
  } else {
    filters[key] = filters[key] === value ? '' : value;
  }
  renderFilters();
  refresh();
}
function showSavedCount() { byId('saved-count').textContent = saved.size ? countText(saved.size) : ''; }
function renderArchive() {
  const entries = archivedIds.filter(id => saved.has(id));
  byId('archive').hidden = tab !== 'saved' || !entries.length;
  if (byId('archive').hidden) return;
  byId('archive-title').textContent = '已离开本期片库（' + countText(entries.length) + '）';
  byId('archive-list').innerHTML = entries.map(id => {
    const past = saved.get(id);
    const tmdb = id.match(/^tmdb-(movie|tv)-(\d+)$/);
    const url = safeLink(past.url) || (tmdb ? 'https://www.themoviedb.org/' + tmdb[1] + '/' + tmdb[2] : '');
    return '<li><span><strong>' + escapeHtml(past.title || id) + '</strong>' + (past.year ? ' · ' + escapeHtml(past.year) : '') + '</span><span>' +
      link(url,'原站') + ' <button class="small-button" data-archive-remove="' + escapeHtml(id) + '" aria-label="移除收藏' + escapeHtml(past.title || id) + '">移除收藏</button></span></li>';
  }).join('');
}
async function fetchMissing() {
  missingRequest?.abort();
  archivedIds = [];
  byId('archive-check').textContent = '';
  renderArchive();
  if (!saved.size || tab !== 'saved') return;
  const current = new AbortController();
  missingRequest = current;
  try {
    const data = await getJson('/api/missing',current.signal,{ids:[...saved.keys()]});
    if (missingRequest !== current || tab !== 'saved') return;
    archivedIds = Array.isArray(data.ids) ? data.ids : [];
    renderArchive();
  } catch {
    if (!current.signal.aborted && tab === 'saved') byId('archive-check').innerHTML = '暂时无法核对历史收藏。 <button class="small-button" id="retry-archive">重新核对</button>';
  }
}
function saveWork(id, button) {
  const work = items.find(w => idOf(w) === id);
  if (saved.has(id)) saved.delete(id); else if (work) saved.set(id,savedSnapshot(work));
  persistSaved();
  showSavedCount();
  if (tab === 'saved') { renderArchive(); fetchItems(); return; }
  if (!work) return;
  button.setAttribute('aria-pressed',String(saved.has(id)));
  button.setAttribute('aria-label',(saved.has(id) ? '取消收藏' : '收藏') + work.title);
  button.title = saved.has(id) ? '取消收藏' : '收藏';
  button.querySelector('path').setAttribute('fill',saved.has(id) ? 'currentColor' : 'none');
}
function renderTray() {
  const size = comparing.size;
  byId('compare-tray').hidden = !size;
  byId('compare-count').textContent = '作品对比 ' + size + ' / 4';
  byId('open-compare').disabled = size < 2;
  byId('open-compare').title = size < 2 ? '至少选择两部作品' : '';
  byId('tray-items').innerHTML = [...comparing].map(([id,title]) =>
    '<button data-remove="' + escapeHtml(id) + '" title="移除' + escapeHtml(title) + '">' + escapeHtml(title) + ' ×</button>').join('');
  document.querySelectorAll('[data-add]').forEach(b => {
    const on = comparing.has(b.dataset.add);
    b.setAttribute('aria-pressed',String(on));
    b.textContent = on ? '已选对比' : '加入对比';
  });
}
function selectForComparison(id) {
  if (comparing.has(id)) comparing.delete(id);
  else {
    if (comparing.size >= 4) { notify('最多可对比 4 部作品，请先移除一部。'); return; }
    const work = items.find(w => idOf(w) === id);
    if (work) comparing.set(id,work.title);
  }
  notify('');
  renderTray();
}
function comparisonTable(list) {
  const field = (name, fn) => '<tr><th scope="row">' + name + '</th>' + list.map(w => '<td>' + fn(w) + '</td>').join('') + '</tr>';
  const fields = [
    ['类型 / 地区', w => [w.type,w.area,w.region].filter(Boolean).join(' · ')],
    ['制作地区', w => listText(w.countries)],
    ['上映年份', w => w.year], ['题材', w => listText(w.genres)], ['适合人群', w => [listText(w.ages),w.ageNote].filter(Boolean).join(' ／ ')],
    ['经典', w => w.classic ? ['经典',w.classicReason].filter(Boolean).join(' ／ ') : '—'],
    ['主创与出镜', w => {
      const people = w.people || [];
      return listText(people.slice(0,4)) + (people.length > 4 ? ' 等 ' + countText(people.length) + ' 人' : '');
    }]
  ];
  const scoredSources = sourceKeys.filter(key => list.some(w => sourceRating(w,key)));
  const linkOnlySources = sourceKeys.filter(key => !scoredSources.includes(key) && list.some(w => applicable(w,key) && ratingUrl(w,key)));
  const citedSources = [...sourceKeys,'rtavg','rtaud','movielens','jincheng'].filter(key => list.some(w => w.historicalRatings?.[key]));
  const rows = scoredSources.map(key => field(key === 'rt' ? '烂番茄影评人' : sourceLabels[key], w => {
    if (!applicable(w,key)) return '—';
    const metric = ratingValue(w,key);
    const dest = ratingUrl(w,key);
    const displayed = metric === '—' ? ('—' + (dest ? ' ' + link(dest,'来源') : '')) : (link(dest,metric) || metric);
    const citation = link(sourceRating(w,key)?.citation,key === 'imdb' ? '版本出处' : '榜单出处');
    return displayed + metricInfo(w,key).map(v => '<small class="metric-note">' + metricNote(v) + '</small>').join('') +
      (citation ? '<small class="metric-note">' + citation + '</small>' : '');
  })).join('') +
    citedSources.map(key => field(historyLabels[key] + ' · 历史',w => w.historicalRatings?.[key] ?
      historicalValue(w.historicalRatings[key],key) : link(ratingUrl(w,key),'原站') || '—')).join('') +
    linkOnlySources.filter(key=>!citedSources.includes(key)).map(key => field(sourceLabels[key],w => link(ratingUrl(w,key),'原站') || '—')).join('') +
    Object.entries(watchLabels).filter(([key]) => list.some(work => work.links?.[key])).map(([key,name]) =>
      field(name,w=>link(w.links?.[key],'片目') || '—')).join('') +
    fields.map(([name,get]) => field(name,w => escapeHtml(get(w) || '—'))).join('') +
    (list.some(work => work.selectionReason) ? field('收录依据',work => {
      const reason = work.selectionReason;
      return reason ? link(work.evidence?.[0]?.url,reason) || escapeHtml(reason) : '—';
    }) : '');
  const headings = list.map(work => {
    const sameTitle = list.some(other => other.id !== work.id && other.title === work.title);
    const title = sameTitle && work.year ? work.title + '（' + work.year + '）' : work.title;
    return '<th scope="col">' + escapeHtml(title) + '</th>';
  }).join('');
  return '<div class="table-wrap" tabindex="0" aria-label="作品对比表，可横向滚动"><table class="compare-table"><thead><tr><th scope="col">作品</th>' +
    headings + '</tr></thead><tbody>' + rows + '</tbody></table></div>';
}
async function openCompare() {
  if (comparing.size < 2) return;
  const seq = ++compareRequest;
  const dialog = byId('compare-dialog');
  if (!dialog.open) dialog.showModal();
  byId('compare-body').textContent = '正在读取作品…';
  const ids = [...comparing.keys()];
  try {
    const data = await getJson('/api/works?' + new URLSearchParams({ids:ids.join(',')}));
    if (seq !== compareRequest) return;
    const list = data.items || [];
    if (list.length < 2) { byId('compare-body').textContent = '当前可读取的作品少于两部，请重新选择。'; return; }
    byId('compare-body').innerHTML = comparisonTable(list);
  } catch {
    if (seq === compareRequest) byId('compare-body').innerHTML = '暂时无法读取对比数据。 <button class="plain" id="retry-compare">重试</button>';
  }
}
function displayStatus() {
  const data = catalogStatus;
  if (!data) return;
  const date = dateText(data.updatedAt);
  const progress = data.complete ? '本轮同步完成' : data.kind === 'empty' ? '等待同步' : data.kind === 'snapshot' ? '固定版本快照' : '部分已收录';
  const evidence = Array.isArray(data.evidence) ? data.evidence : [];
  const dates = data.kind === 'snapshot' ? evidence.filter(s => s.date).map(s => {
    let label = String(s.label || '').replace('TMDB ', '');
    if (label.includes('补充') && !label.includes('部分')) label = label.replace('补充','部分补充');
    return label + ' ' + dateText(s.date);
  }) : [];
  const update = dates.length ? dates.join(' · ') : date ? '更新于 ' + date : '';
  byId('sync-summary').textContent = ['馆藏 ' + countText(data.total || 0) + ' 部',
    data.privateImdb && 'IMDb 个人版'].filter(Boolean).join(' · ');
  const phaseText = {discover:'正在检索作品', details:'正在更新作品资料', publishing:'正在更新片库', failed:'本轮同步中断', complete:'本轮同步完成'};
  const sync = data.progress;
  const phase = phaseText[sync?.phase];
  const liveState = phase ? ' TMDB ' + phase + (num(sync.processed) && num(sync.discovered) ? '（' +
    countText(sync.processed) + ' / ' + countText(sync.discovered) + ' 部）' : '') + '。' : '';
  const tags = data.coverage ? ' 已标注年代推荐 ' + countText(data.coverage.recommended) + ' 部、经典 ' + countText(data.coverage.classics) + ' 部。' : '';
  const archive = data.coverage?.historicalOnly ? ' 另有 ' + countText(data.coverage.historicalOnly) + ' 部凭历史高分收录，可在发现和历史评分中筛选。' : '';
  byId('sync-status').textContent = [progress, update].filter(Boolean).join(' · ') +
    '。主榜收录线为任一可比来源达到 7.5/10。口碑榜默认至少 100 票，可在「评分人数」调整。' + tags + archive + liveState;
  const kinds = {snapshot:'数据快照',live:'在线同步',empty:'待接入',manual:'人工核实',feed:'导入评分',link:'来源链接',private:'本机个人版'};
  byId('source-list').innerHTML = sourceKeys.map(key => {
    const s = data.sources?.[key];
    const d = key === 'tmdb' && dates.length ? '' : dateText(s?.updatedAt);
    let status = Number(s?.historical) > 0 || key === 'rt' && (data.historicalMetrics?.rtavg || data.historicalMetrics?.rtaud) ?
      '暂无当期评分' : '暂无评分';
    if (s && Number(s.count) > 0) status = [kinds[s.kind] || '已收录', countText(s.count) + ' 部评分', d].filter(Boolean).join(' · ');
    const browse = !Object.hasOwn(watchLabels,key) && Number(s?.linked) > 0 ? ' · <button class="view-linked" data-linked="' + key + '" title="浏览有' +
      sourceLabels[key] + '原站链接的作品">查看 ' + countText(s.linked) + ' 部</button>' : '';
    const citations = Number(s?.historical) > 0 ? ' · <button class="view-linked" data-history-source="' + key +
      '">历史引用 ' + countText(s.historical) + ' 部</button>' : '';
    const rtMetrics = key === 'rt' ? [['rtavg','影评均分'],['rtaud','观众好评率']].filter(([id])=>Number(data.historicalMetrics?.[id])>0)
      .map(([id,label])=>' · <button class="view-linked" data-history-source="' + id + '">' + label + ' ' + countText(data.historicalMetrics[id]) + ' 部</button>').join('') : '';
    const imdbTitleCount = key === 'imdb' && data.privateImdb && data.coverage?.imdbAkaWorks ? ' · 中文片名 ' + countText(data.coverage.imdbAkaWorks) + ' 部' : '';
    return '<li><strong>' + sourceLabels[key] + '</strong><span>' + escapeHtml(status + imdbTitleCount) + browse + citations + rtMetrics + '</span></li>';
  }).join('') + (data.historicalMetrics?.movielens ? '<li><strong>MovieLens</strong><span>32M 样本 · ' +
    '<button class="view-linked" data-history-source="movielens">历史评分 ' +
    countText(data.historicalMetrics.movielens) + ' 部</button></span></li>' : '') +
    (data.historicalMetrics?.jincheng ? '<li><strong>金橙评分</strong><span>上线日榜单 · ' +
      '<button class="view-linked" data-history-source="jincheng">历史评分 ' +
      countText(data.historicalMetrics.jincheng) + ' 部</button></span></li>' : '');
  const watchLinks = Object.entries(watchLabels).filter(([key])=>data.watch?.[key]?.linked > 0);
  const watchSection = byId('watch-sources');
  watchSection.hidden = !watchLinks.length;
  byId('watch-list').innerHTML = watchLinks.map(([key,name]) => '<li><strong>' + name + '</strong><span>' +
    '<button class="view-linked" data-linked="' + key + '">查看 ' + countText(data.watch[key].linked) + ' 部</button></span></li>').join('');
  const attribution = evidence.map(e => {
    const source = link(e.url,e.label);
    const license = link(e.licenseUrl,e.license);
    const version = num(e.version) ? '版本 ' + countText(e.version) : '';
    const works = num(e.works) ? '本库收录 ' + countText(e.works) + ' 部' : '';
    return [source,escapeHtml(e.publisher),escapeHtml(dateText(e.date)),version,works,license,escapeHtml(e.scope)].filter(Boolean).join(' ／ ');
  }).filter(Boolean);
  if(data.privateImdb)attribution.push('Information courtesy of IMDb (' +
    link('https://www.imdb.com','https://www.imdb.com') + '). Used with permission. ' +
    link('https://data.imdb.com/non-commercial-datasets/','IMDb 官方个人数据集'));
  byId('source-evidence').innerHTML = attribution.join('<br>');
}
async function fetchStatus() {
  try {
    const previous = catalogStatus;
    catalogStatus = await getJson('/api/status');
    displayStatus();
    const genres = (catalogStatus.genres || []).filter(g => typeof g === 'string' && g.trim());
    const countries = catalogStatus.countries || [];
    const historyChanged = historySources(previous).join(',') !== historySources(catalogStatus).join(',');
    const sourceChanged = ['tvmaze','youku'].some(key =>
      Boolean(previous?.sources?.[key]?.count) !== Boolean(catalogStatus.sources?.[key]?.count));
    const platformFilterChanged = Boolean(previous?.scoreSourceCountFilter) !== Boolean(catalogStatus.scoreSourceCountFilter);
    if (historyChanged || sourceChanged || platformFilterChanged || genres.join(',') !== availableGenres.join(',') || JSON.stringify(countries) !== JSON.stringify(availableCountries)) {
      availableGenres = genres;
      availableCountries = countries;
      const more = byId('more-genres');
      const focused = document.activeElement;
      if (historyChanged || sourceChanged || platformFilterChanged || !byId('filter-rows').contains(focused) || focused === more || focused?.id === 'country') renderFilters();
    }
    if (previous && (previous.total !== catalogStatus.total || previous.updatedAt !== catalogStatus.updatedAt) && byId('results').getAttribute('aria-busy') !== 'true') {
      fetchItems();
      if (tab === 'saved') fetchMissing();
    }
  } catch { byId('sync-summary').textContent = '来源状态暂不可用'; }
}
document.addEventListener('click',event => {
  const b = event.target.closest?.('button');
  if (!b) return;
  if (b.dataset.linked || b.dataset.historySource) {
    selectTab('discover',b.dataset.linked,b.dataset.historySource);
    byId('results-heading').scrollIntoView({block:'start'});
    byId('linked-filter').focus({preventScroll:true});
    return;
  }
  if (b.dataset.tab) return selectTab(b.dataset.tab);
  if (b.dataset.filter) return changeChoice(b.dataset.filter,b.dataset.value);
  if (b.dataset.save) return saveWork(b.dataset.save,b);
  if (b.dataset.archiveRemove) {
    saved.delete(b.dataset.archiveRemove);
    persistSaved(); showSavedCount(); renderArchive();
    if (!saved.size) fetchItems();
    return;
  }
  if (b.dataset.add) return selectForComparison(b.dataset.add);
  if (b.dataset.remove) return selectForComparison(b.dataset.remove);
  if (b.dataset.detail) {
    const id = b.dataset.detail;
    const opening = selectedId !== id;
    selectedId = opening ? id : null;
    renderItems();
    const cardButton = [...byId('results').querySelectorAll('.face')].find(el => el.dataset.detail === id);
    cardButton?.focus({preventScroll:true});
    if (opening) byId('results').querySelector('.detail')?.scrollIntoView({block:'nearest'});
    return;
  }
  if (b.dataset.page) {
    page = Number(b.dataset.page);
    selectedId = null;
    fetchItems();
    byId('results-heading').scrollIntoView({block:'start'});
    return;
  }
  switch(b.id) {
    case 'linked-filter':
      if (filters.archive) filters.band = '';
      filters.linked = ''; filters.archive = ''; renderFilters(); refresh(); break;
    case 'reset': resetFilters(); refresh(); break;
    case 'filter-toggle': {
      const folded = byId('filter-rows').classList.toggle('mobile-folded');
      b.setAttribute('aria-expanded',String(!folded)); break;
    }
    case 'retry': fetchItems(); break;
    case 'retry-archive': fetchMissing(); break;
    case 'open-compare': case 'retry-compare': openCompare(); break;
    case 'close-compare': byId('compare-dialog').close(); break;
    case 'clear-compare': comparing.clear(); renderTray(); notify(''); break;
    case 'credits': byId('sources').hidden = !byId('sources').hidden; b.setAttribute('aria-expanded',String(!byId('sources').hidden)); break;
  }
});
document.addEventListener('change',event => {
  const input = event.target;
  switch(input.id) {
    case 'sort': refresh(); break;
    case 'classic': filters.classic = input.checked; refresh(); break;
    case 'more-genres': if (input.value) changeChoice('genres',input.value); break;
    case 'source':
      filters.archive = input.value.startsWith('history:') ? input.value.slice('history:'.length) : '';
      filters.source = filters.archive ? 'all' : input.value;
      filters.band = '';
      if (filters.archive || (filters.source === 'youku' && byId('sort').value === 'recommended')) byId('sort').value = 'score';
      renderFilters(); refresh(); break;
    case 'seed': filters.seed = input.value; refresh(); break;
    case 'country': filters.country = input.value; refresh(); break;
    case 'minVotes': filters.minVotes = input.value; refresh(); break;
    case 'minSources': filters.minSources = input.value; refresh(); break;
  }
});
document.addEventListener('input',event => {
  const input = event.target;
  if (input.id === 'search' && !event.isComposing) refresh(true);
  if (input.id === 'from' || input.id === 'to') { filters[input.id] = input.value; refresh(true); }
});
byId('search').addEventListener('compositionend',() => refresh(true));
byId('results').addEventListener('load',event => {
  if (event.target.matches?.('.poster img')) event.target.classList.add('loaded');
},true);
byId('results').addEventListener('error',event => {
  if (event.target.matches?.('.poster img')) event.target.remove();
},true);
window.addEventListener('storage',event => {
  if (event.key !== savedKey && event.key !== null) return;
  saved = readSaved(); showSavedCount();
  if (tab === 'saved') { fetchItems(); fetchMissing(); } else renderItems();
});
[layout,tablet].forEach(media => media.addEventListener('change',() => { if (items.length) renderItems(); }));
document.querySelector('[data-tab="discover"]').setAttribute('aria-current','page');
showSavedCount();
renderFilters();
fetchStatus();
fetchItems();
setInterval(() => { if (!document.hidden) fetchStatus(); },60000);
