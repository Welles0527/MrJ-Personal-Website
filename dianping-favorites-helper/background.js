const requests = new Map();

const normalize = value => String(value || '').toLowerCase().replace(/[\s·•・()（）\-—_]/g, '');
const boardMessage = (tabId, payload) => chrome.tabs.sendMessage(tabId, payload).catch(() => {});
const closeLookupTab = tabId => chrome.tabs.remove(tabId).catch(() => {});

function requestExtraction(tabId, request) {
  if (request.stage === 'search' || request.stage === 'package-search') chrome.tabs.sendMessage(tabId, { type: 'extract-search', name: request.name }).catch(() => {});
  if (request.stage === 'detail') chrome.tabs.sendMessage(tabId, { type: 'extract-shop', candidate: request.candidate }).catch(() => {});
  if (request.stage === 'deals') chrome.tabs.sendMessage(tabId, { type: 'extract-deals' }).catch(() => {});
}

async function openShop(request, candidate, stage = 'detail') {
  if (!candidate?.url || !/^https:\/\/(?:www\.|m\.)?dianping\.com\/shop\//.test(candidate.url)) {
    boardMessage(request.boardTabId, { type: stage === 'deals' ? 'deals-error' : 'error', requestId: request.requestId, message: '未取得有效的大众点评店铺链接' });
    return;
  }
  const tab = await chrome.tabs.create({ url: candidate.url, active: false });
  requests.set(tab.id, { ...request, stage, candidate });
  requestExtraction(tab.id, requests.get(tab.id));
  if (stage === 'detail') setTimeout(() => {
    if (requests.get(tab.id)?.requestId !== request.requestId) return;
    requests.delete(tab.id);
    closeLookupTab(tab.id);
    boardMessage(request.boardTabId, { type: 'error', requestId: request.requestId, message: '店铺页面未能返回信息，请稍后重试或手动填写' });
  }, 15000);
  if (stage === 'deals') setTimeout(() => {
    if (requests.get(tab.id)?.requestId !== request.requestId) return;
    requests.delete(tab.id);
    closeLookupTab(tab.id);
    boardMessage(request.boardTabId, { type: 'deals-error', requestId: request.requestId, message: '店铺页面未能加载团购信息，已停止同步' });
  }, 15000);
}

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type === 'board-package-search' && sender.tab?.id) {
    const query = String(message.query || '').trim();
    if (!['午市套餐', '工作日套餐', '工作日午市套餐'].includes(query)) return;
    chrome.tabs.create({ url: `https://www.dianping.com/search/keyword/1/0_${encodeURIComponent(query)}`, active: false })
      .then(tab => {
        requests.set(tab.id, { stage: 'package-search', boardTabId: sender.tab.id, requestId: message.requestId, name: query });
        requestExtraction(tab.id, requests.get(tab.id));
        setTimeout(() => {
          if (requests.get(tab.id)?.requestId !== message.requestId) return;
          requests.delete(tab.id); closeLookupTab(tab.id);
          boardMessage(sender.tab.id, { type: 'package-error', requestId: message.requestId, message: '大众点评搜索页未返回结果' });
        }, 15000);
      })
      .catch(() => boardMessage(sender.tab.id, { type: 'package-error', requestId: message.requestId, message: '无法打开大众点评搜索页' }));
    return;
  }
  if (message?.type === 'board-package-cancel' && sender.tab?.id) {
    for (const [tabId, request] of requests) if (request.boardTabId === sender.tab.id && request.requestId === message.requestId) { requests.delete(tabId); if (typeof tabId === 'number') closeLookupTab(tabId); }
    return;
  }
  if (message?.type === 'board-search' && sender.tab?.id) {
    const name = String(message.name || '').trim();
    if (!name) return;
    chrome.tabs.create({ url: `https://www.dianping.com/search/keyword/1/0_${encodeURIComponent(name)}`, active: false })
      .then(tab => {
        requests.set(tab.id, { stage: 'search', boardTabId: sender.tab.id, requestId: message.requestId, name });
        boardMessage(sender.tab.id, { type: 'started', requestId: message.requestId });
        requestExtraction(tab.id, requests.get(tab.id));
        setTimeout(() => {
          if (requests.get(tab.id)?.requestId !== message.requestId) return;
          requests.delete(tab.id);
          closeLookupTab(tab.id);
          boardMessage(sender.tab.id, { type: 'error', requestId: message.requestId, message: '大众点评搜索页未能返回结果，请稍后重试或手动填写' });
        }, 15000);
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
  if (message?.type === 'board-deals' && sender.tab?.id) {
    openShop({ boardTabId: sender.tab.id, requestId: message.requestId }, message.shop, 'deals')
      .catch(() => boardMessage(sender.tab.id, { type: 'deals-error', requestId: message.requestId, message: '无法打开大众点评店铺页，已停止同步' }));
  }
});

chrome.runtime.onMessage.addListener((message, sender) => {
  const tabId = sender.tab?.id;
  if (!tabId || !requests.has(tabId)) return;
  const request = requests.get(tabId);
  if (message?.type === 'page-ready') {
    requestExtraction(tabId, request);
    return;
  }
  if (message?.type === 'search-results' && request.stage === 'search') {
    const candidates = Array.isArray(message.candidates) ? message.candidates : [];
    closeLookupTab(tabId);
    requests.delete(tabId);
    const exact = candidates.filter(candidate => normalize(candidate.name) === normalize(request.name));
    if (exact.length === 1) return void openShop(request, exact[0]).catch(() => boardMessage(request.boardTabId, { type: 'error', requestId: request.requestId, message: '无法打开大众点评店铺页' }));
    if (candidates.length === 1) return void openShop(request, candidates[0]).catch(() => boardMessage(request.boardTabId, { type: 'error', requestId: request.requestId, message: '无法打开大众点评店铺页' }));
    if (candidates.length) {
      const chooserId = `choose-${request.requestId}`;
      requests.set(chooserId, { ...request, stage: 'choose' });
      boardMessage(request.boardTabId, { type: 'candidates', requestId: request.requestId, candidates });
      return;
    }
    boardMessage(request.boardTabId, { type: 'error', requestId: request.requestId, message: '没有找到可用的大众点评店铺结果' });
    return;
  }
  if (message?.type === 'search-results' && request.stage === 'package-search') {
    requests.delete(tabId); closeLookupTab(tabId);
    if (message.blocked) { boardMessage(request.boardTabId, { type: 'package-error', requestId: request.requestId, message: '大众点评要求验证，已停止搜索' }); return; }
    boardMessage(request.boardTabId, { type: 'package-candidates', requestId: request.requestId, candidates: Array.isArray(message.candidates) ? message.candidates.slice(0, 8) : [] });
    return;
  }
  if (message?.type === 'shop-details' && request.stage === 'detail') {
    const shop = { ...request.candidate, ...message.shop, id: request.candidate.id || message.shop?.id, url: request.candidate.url };
    closeLookupTab(tabId);
    requests.delete(tabId);
    boardMessage(request.boardTabId, { type: 'result', requestId: request.requestId, shop });
  }
  if (message?.type === 'deals-details' && request.stage === 'deals') {
    requests.delete(tabId);
    closeLookupTab(tabId);
    boardMessage(request.boardTabId, { type: 'deals-result', requestId: request.requestId, shopId: request.candidate.id, deals: message.deals });
  }
});

chrome.tabs.onRemoved.addListener(tabId => requests.delete(tabId));
