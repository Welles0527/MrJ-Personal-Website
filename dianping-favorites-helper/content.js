const boardOrigins = new Set(['http://127.0.0.1:4174', 'https://www.magicj.cn']);
const compact = value => String(value || '').replace(/\s+/g, ' ').trim();
const shopId = url => (String(url || '').match(/\/shop\/([^/?#]+)/) || [])[1] || '';
const first = (...values) => values.find(value => compact(value));

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
    return { id, url, name, score: scoreFrom(text), photo, address: text.slice(0, 180) };
  }).filter(candidate => candidate.id && candidate.name && candidate.name.length < 80 && !seen.has(candidate.id) && seen.add(candidate.id));
}

function shopDetails(candidate) {
  const text = compact(document.body?.innerText);
  const name = compact(first(document.querySelector('meta[property="og:title"]')?.content, document.querySelector('h1')?.innerText, candidate.name)).replace(/[-_｜|]\s*大众点评.*$/i, '');
  const photo = first(document.querySelector('meta[property="og:image"]')?.content, document.querySelector('img[src*="dianping"],img[src*="dpfile"]')?.currentSrc, candidate.photo);
  const addressMatch = text.match(/(?:地址|商户地址)\s*[:：]?\s*([^。；;]{4,100})/);
  const categoryMatch = text.match(/(?:美食|餐饮|咖啡|酒吧|购物|商场|休闲度假|公园)[\s/·\-]*([^\s，。；;]{0,20})/);
  return { id: candidate.id, name: name || candidate.name, score: scoreFrom(text) || candidate.score, photo, address: compact(addressMatch?.[1] || candidate.address), category: '美食', sub: compact(categoryMatch?.[1] || '其他'), url: candidate.url, city: '上海' };
}

if (boardOrigins.has(location.origin) && (location.origin !== 'https://www.magicj.cn' || location.pathname.startsWith('/officialwebsite/tools/dianping-favorites/'))) {
  window.postMessage({ source: 'dianping-favorites-helper', type: 'ready' }, location.origin);
  window.addEventListener('message', event => {
    if (event.source !== window || event.origin !== location.origin || event.data?.source !== 'shanghai-favorites-board') return;
    if (event.data.type === 'dianping-helper-search') chrome.runtime.sendMessage({ type: 'board-search', requestId: event.data.requestId, name: event.data.name });
    if (event.data.type === 'dianping-helper-select') chrome.runtime.sendMessage({ type: 'board-select', requestId: event.data.requestId, candidate: event.data.candidate });
  });
  chrome.runtime.onMessage.addListener(message => {
    if (!['started', 'candidates', 'result', 'error'].includes(message?.type)) return;
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
          chrome.runtime.sendMessage({ type: 'search-results', candidates });
          sendResponse({ ok: true });
        }
      }, 600);
      return true;
    }
    if (message?.type === 'extract-shop') {
      const started = Date.now();
      const timer = setInterval(() => {
        const details = shopDetails(message.candidate || {});
        if (details.name || Date.now() - started > 7000) {
          clearInterval(timer);
          chrome.runtime.sendMessage({ type: 'shop-details', shop: details });
          sendResponse({ ok: true });
        }
      }, 500);
      return true;
    }
  });
}
