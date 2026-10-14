const boardOrigins = new Set(['http://127.0.0.1:4174', 'http://127.0.0.1:4339', 'https://www.magicj.cn']);
const compact = value => String(value || '').replace(/\s+/g, ' ').trim();
const shopId = url => (String(url || '').match(/\/shop\/([^/?#]+)/) || [])[1] || '';
const first = (...values) => values.find(value => compact(value));

function averagePriceFrom(text) {
  const match = compact(text).match(/人均(?:消费|价格)?\s*[:：]?\s*[¥￥]?\s*([0-9]+(?:[,，][0-9]{3})*(?:\.[0-9]+)?)(?![0-9])/);
  const value = match ? Number(match[1].replace(/[,，]/g, '')) : NaN;
  return Number.isFinite(value) && value > 0 ? value : null;
}

function scoreFrom(text) {
  const match = compact(text).match(/(?:评分|口味|环境|服务|★)?\s*([3-5](?:\.\d)?)/);
  return match ? match[1] : '';
}

function shopCandidates() {
  const seen = new Set();
  return [...document.querySelectorAll('a[href*="/shop/"]')].map(link => {
    const url = link.href;
    const id = shopId(url);
    const container = link.closest('li,article,.shop-list-item,.shop-item,.search-list-item') || link.parentElement;
    const text = compact(container?.innerText || link.innerText);
    const name = compact(first(link.innerText, link.getAttribute('title'), link.querySelector('h1,h2,h3,h4')?.innerText));
    const photo = container?.querySelector('img[src]')?.currentSrc || container?.querySelector('img[src]')?.src || '';
    return { id, url, name, avgPrice: averagePriceFrom(text), score: scoreFrom(text), photo, address: text.slice(0, 180) };
  }).filter(candidate => candidate.id && candidate.name && candidate.name.length < 80 && !seen.has(candidate.id) && seen.add(candidate.id));
}

function shopDetails(candidate) {
  const text = compact(document.body?.innerText);
  const name = compact(first(document.querySelector('meta[property="og:title"]')?.content, document.querySelector('h1')?.innerText, candidate.name)).replace(/[-_｜|]\s*大众点评.*$/i, '');
  const photo = first(document.querySelector('meta[property="og:image"]')?.content, document.querySelector('img[src*="dianping"],img[src*="dpfile"]')?.currentSrc, candidate.photo);
  const addressMatch = text.match(/(?:地址|商户地址)\s*[:：]?\s*([^。；;]{4,100})/);
  const categoryMatch = text.match(/(?:美食|餐饮|咖啡|酒吧|购物|商场|休闲度假|公园)[\s/·\-]*([^\s，。；;]{0,20})/);
  const priceText = [...document.querySelectorAll('#avgPriceTitle,.avg-price,.avgPrice,[class*="avg-price"]')].map(node => compact(node.innerText)).join(' ');
  const avgPrice = averagePriceFrom(priceText) ?? averagePriceFrom(text) ?? candidate.avgPrice ?? null;
  return { id: candidate.id, avgPrice, name: name || candidate.name, score: scoreFrom(text) || candidate.score, photo, address: compact(addressMatch?.[1] || candidate.address), category: '美食', sub: compact(categoryMatch?.[1] || '其他'), url: candidate.url, city: '上海', deals: extractDeals() };
}

function extractDeals() {
  const text = compact(document.body?.innerText);
  const checkedAt = new Date().toISOString();
  if (/验证码|滑动验证|异常访问|访问受限|安全验证|请完成验证/.test(text)) return { status: 'blocked', offers: [], checkedAt };
  const offers = [];
  const seen = new Set();
  const selectors = '.meal-item-container,.coupon-item-container,a[href*="/deal/"],a[href*="/group/"],a[href*="/product/"],[data-deal-id],[class*="deal-item"],[class*="group-item"],[class*="tuan-item"],[class*="package-item"]';
  for (const node of document.querySelectorAll(selectors)) {
    const card = node.closest('.meal-item-container,.coupon-item-container,[class*="deal-item"],[class*="group-item"],[class*="tuan-item"],[class*="package-item"]') || node;
    const cardText = compact(card.innerText).slice(0, 300);
    const priceMatch = compact(card.querySelector('.priceInfo-container .price')?.innerText).match(/^([1-9]\d{0,5}(?:\.\d{1,2})?)$/) || cardText.match(/[¥￥]\s*([1-9]\d{0,5}(?:\.\d{1,2})?)(?!\d)/);
    const heading = compact(card.querySelector('.title-container .title,.left-top-container .title,h2,h3,h4,[class*="title"],[class*="name"]')?.innerText);
    const title = (heading || cardText.replace(/[¥￥]\s*\d+(?:\.\d{1,2})?.*$/, '')).trim().slice(0, 100);
    const link = card.matches('a[href]') ? card : card.querySelector('a[href]');
    const url = link?.href || location.href;
    if (!priceMatch || !title || /^(?:商家团购套餐|商户优惠|团购|打开大众点评App查看)$/.test(title) || !/^https:\/\/(?:[\w-]+\.)*(?:dianping\.com|meituan\.com)\//.test(url)) continue;
    const price = Number(priceMatch[1]);
    const key = `${title}|${price}|${url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    offers.push({ title, price, url });
    if (offers.length === 40) break;
  }
  if (offers.length) return { status: 'found', offers, checkedAt };
  if (/商家团购套餐.{0,35}(?:[¥￥]\s*\*+|打开大众点评App查看)/.test(text)) return { status: 'blocked', offers: [], checkedAt };
  if (/暂无团购|暂无套餐|暂无可用团购|商家暂未发布团购|暂无商家团购/.test(text)) return { status: 'none', offers: [], checkedAt };
  return { status: 'unknown', offers: [], checkedAt };
}

if (boardOrigins.has(location.origin) && (location.origin !== 'https://www.magicj.cn' || location.pathname.startsWith('/officialwebsite/tools/dianping-favorites/'))) {
  window.postMessage({ source: 'dianping-favorites-helper', type: 'ready' }, location.origin);
  window.addEventListener('message', event => {
    if (event.source !== window || event.origin !== location.origin || event.data?.source !== 'shanghai-favorites-board') return;
    if (event.data.type === 'dianping-helper-ping') window.postMessage({ source: 'dianping-favorites-helper', type: 'ready' }, location.origin);
    if (event.data.type === 'dianping-helper-search') {
      const requestId = event.data.requestId;
      const failed = () => window.postMessage({ source: 'dianping-favorites-helper', type: 'error', requestId, message: '大众点评助手连接已失效，请重新加载助手并刷新收藏页面。' }, location.origin);
      try { chrome.runtime.sendMessage({ type: 'board-search', requestId, name: event.data.name }).catch(failed); } catch { failed(); }
    }
    if (event.data.type === 'dianping-helper-select') chrome.runtime.sendMessage({ type: 'board-select', requestId: event.data.requestId, candidate: event.data.candidate });
    if (event.data.type === 'dianping-helper-deals') chrome.runtime.sendMessage({ type: 'board-deals', requestId: event.data.requestId, shop: event.data.shop });
    if (event.data.type === 'dianping-helper-package-search') chrome.runtime.sendMessage({ type: 'board-package-search', requestId: event.data.requestId, query: event.data.query });
    if (event.data.type === 'dianping-helper-package-cancel') chrome.runtime.sendMessage({ type: 'board-package-cancel', requestId: event.data.requestId });
  });
  chrome.runtime.onMessage.addListener(message => {
    if (!['started', 'candidates', 'result', 'error', 'deals-result', 'deals-error', 'package-candidates', 'package-error'].includes(message?.type)) return;
    window.postMessage({ source: 'dianping-favorites-helper', ...message }, location.origin);
  });
} else if (/dianping\.com$/.test(location.hostname)) {
  chrome.runtime.sendMessage({ type: 'page-ready' });
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'extract-search') {
      const started = Date.now();
      const timer = setInterval(() => {
        const candidates = shopCandidates();
        if (candidates.length || Date.now() - started > 9000) {
          clearInterval(timer);
          chrome.runtime.sendMessage({ type: 'search-results', candidates, blocked: /验证码|滑动验证|异常访问|访问受限|安全验证|请完成验证/.test(document.body?.innerText || '') });
          sendResponse({ ok: true });
        }
      }, 600);
      return true;
    }
    if (message?.type === 'extract-shop') {
      const started = Date.now();
      const timer = setInterval(() => {
        const details = shopDetails(message.candidate || {});
        if ((details.name && details.deals.status !== 'unknown') || Date.now() - started > 7500) {
          clearInterval(timer);
          chrome.runtime.sendMessage({ type: 'shop-details', shop: details });
          sendResponse({ ok: true });
        }
      }, 500);
      return true;
    }
    if (message?.type === 'extract-deals') {
      const started = Date.now();
      const timer = setInterval(() => {
        const deals = extractDeals();
        if (deals.status !== 'unknown' || Date.now() - started > 7500) {
          clearInterval(timer);
          chrome.runtime.sendMessage({ type: 'deals-details', deals });
          sendResponse({ ok: true });
        }
      }, 500);
      return true;
    }
  });
}
