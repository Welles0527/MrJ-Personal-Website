const requests = new Map();

const normalize = value => String(value || '').toLowerCase().replace(/[\s·•・()（）\-—_]/g, '');
const boardMessage = (tabId, payload) => chrome.tabs.sendMessage(tabId, payload).catch(() => {});
const closeLookupTab = tabId => chrome.tabs.remove(tabId).catch(() => {});

async function openShop(request, candidate) {
  if (!candidate?.url || !/^https:\/\/(?:www\.|m\.)?dianping\.com\/shop\//.test(candidate.url)) {
    boardMessage(request.boardTabId, { type: 'error', requestId: request.requestId, message: '未取得有效的大众点评店铺链接' });
    return;
  }
  const tab = await chrome.tabs.create({ url: candidate.url, active: false });
  requests.set(tab.id, { ...request, stage: 'detail', candidate });
}

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type === 'board-search' && sender.tab?.id) {
    const name = String(message.name || '').trim();
    if (!name) return;
    chrome.tabs.create({ url: `https://www.dianping.com/search/keyword/1/0_${encodeURIComponent(name)}`, active: false })
      .then(tab => {
        requests.set(tab.id, { stage: 'search', boardTabId: sender.tab.id, requestId: message.requestId, name });
        boardMessage(sender.tab.id, { type: 'started', requestId: message.requestId });
      })
      .catch(() => boardMessage(sender.tab.id, { type: 'error', requestId: message.requestId, message: '无法打开大众点评搜索页' }));
    return;
  }
  if (message?.type === 'board-select' && sender.tab?.id) {
    for (const [key, request] of requests.entries()) {
      if (request.boardTabId === sender.tab.id && request.requestId === message.requestId && request.stage === 'choose') {
        requests.delete(key);
        openShop(request, message.candidate);
        break;
      }
    }
  }
});

chrome.runtime.onMessage.addListener((message, sender) => {
  const tabId = sender.tab?.id;
  if (!tabId || !requests.has(tabId)) return;
  const request = requests.get(tabId);
  if (message?.type === 'page-ready') {
    if (request.stage === 'search' && /\/search\//.test(sender.tab.url || '')) chrome.tabs.sendMessage(tabId, { type: 'extract-search', name: request.name });
    if (request.stage === 'detail' && /\/shop\//.test(sender.tab.url || '')) chrome.tabs.sendMessage(tabId, { type: 'extract-shop', candidate: request.candidate });
    return;
  }
  if (message?.type === 'search-results' && request.stage === 'search') {
    const candidates = Array.isArray(message.candidates) ? message.candidates : [];
    closeLookupTab(tabId);
    requests.delete(tabId);
    const exact = candidates.filter(candidate => normalize(candidate.name) === normalize(request.name));
    if (exact.length === 1) return void openShop(request, exact[0]);
    if (candidates.length === 1) return void openShop(request, candidates[0]);
    if (candidates.length) {
      const chooserId = `choose-${request.requestId}`;
      requests.set(chooserId, { ...request, stage: 'choose' });
      boardMessage(request.boardTabId, { type: 'candidates', requestId: request.requestId, candidates });
      return;
    }
    boardMessage(request.boardTabId, { type: 'error', requestId: request.requestId, message: '没有找到可用的大众点评店铺结果' });
    return;
  }
  if (message?.type === 'shop-details' && request.stage === 'detail') {
    const shop = { ...request.candidate, ...message.shop, id: request.candidate.id || message.shop?.id, url: request.candidate.url };
    closeLookupTab(tabId);
    requests.delete(tabId);
    boardMessage(request.boardTabId, { type: 'result', requestId: request.requestId, shop });
  }
});

chrome.tabs.onRemoved.addListener(tabId => requests.delete(tabId));
