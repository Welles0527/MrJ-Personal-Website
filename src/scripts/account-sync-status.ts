/** Mirror each page's own confirmed cloud result beside its account entry. */
export function mountAccountSyncStatus() {
  if (window.top !== window.self) return;
  const path = location.pathname;
  const configs = [
    { match: /planning\/todo\/?$/, anchor: '[data-auth-status]', source: '[data-auth-status]' },
    { match: /super-calendar\/(?:index\.html)?$/, anchor: '[data-calendar-login]', source: '[data-calendar-sync-status]' },
    { match: /snooker-calendar\/(?:index\.html)?$/, anchor: '#mj-account-status', source: '#snooker-favorites-cloud-status' },
    { match: /family-health\.html$/, anchor: '.account-label', source: '.storage-mini' },
    { match: /inspiration-studio\.html$/, anchor: '#studioAccount', source: '#syncStatus' },
    { match: /theology\/group-study\/?$/, anchor: '#account-name', source: '#save-state' },
    { match: /investing\/funds\/(?:index\.html)?$/, anchor: '#fund-auth-status', source: '#preference-sync-state' },
    { match: /(?:^|\/)stock-tracking\/(?:index\.html)?$/, anchor: '.shared-account-copy strong', source: '.shared-account-copy > small' },
    { match: /theology\/?$/, anchor: '.bible-account-controls [data-action="cloud-login"]', source: '[data-reading-sync-status]' },
    { match: /tools\/dianping-favorites\/?$/, anchor: '.account-identity', source: '.account-badge [data-sync]' },
    { match: /coffee-order\/?$/, anchor: '#coffee-sync-account', source: '#coffee-sync-result' }
  ];
  const config = configs.find(item => item.match.test(path));
  if (!config) return;
  const studio = config.anchor === '#studioAccount';
  const style = document.createElement('style');
  style.textContent = `.mj-sync-account{display:inline-flex!important;flex-direction:column!important;align-items:flex-start;vertical-align:middle;min-width:0;max-width:100%;gap:3px}.mj-sync-status{display:block!important;font:11px/1.5 system-ui!important;letter-spacing:normal!important;white-space:nowrap!important;overflow:hidden;text-overflow:ellipsis;max-width:75vw;color:var(--muted,#8b8b8b)}.mj-sync-status[data-state=success]{color:#329b63}.mj-sync-status[data-state=error]{color:#d85b59}.mj-sync-status[data-state=pending],.todo-sync-summary>[data-last-sync],${config.source}{display:none!important}.mj-sync-identity:empty{display:none}.calendar-account-tools:has(.mj-sync-account){flex-wrap:wrap;justify-content:flex-end}.bible-account-controls:has(.mj-sync-account){flex-wrap:wrap}@media(max-width:600px){.topbar:has(#coffee-sync-account){flex-wrap:wrap}.topbar:has(#coffee-sync-account)>.mj-sync-account{flex-basis:100%;align-items:flex-end}}`;
  if (studio) style.textContent += `.profile>.mj-sync-status{grid-column:1/-1;order:2;min-width:0;max-width:100%;text-align:right}`;
  document.head.append(style);
  let signature = '', lastSuccess = '', state = 'pending';
  const classify = (node: HTMLElement) => {
    const text = node.textContent?.trim() || '';
    const code = node.dataset.status || node.dataset.state || '';
    if (/未登录|请先登录|登录后|本地模拟|本地预览|仅.*本机|保存在本机|本地草稿|购物车/.test(text)) return 'pending';
    if (/失败|未保存|未确认|不可用|中断|离线|待同步|需要重新登录/.test(text) || ['error', 'offline'].includes(code)) return 'error';
    if (/正在|继续同步|有更新|账号已改变/.test(text) || ['pending', 'saving', 'syncing', 'loading'].includes(code)) return 'pending';
    if (['saved', 'synced', 'success'].includes(code) || /^(已从云端加载|已同步|已保存至账号|已保存到账号云端|云端阅读记录已核实|已保存并回读云端|收藏、备注与筛选默认已与账号同步|自选股与已读状态已同步云端|当前账号 · 云端已保存 v|云端空档案|云端收藏已|收藏已同步|已保存到云端|订单云端)/.test(text)) return 'success';
    return 'pending';
  };
  const update = () => {
    const anchor = document.querySelector<HTMLElement>(config.anchor);
    const source = document.querySelector<HTMLElement>(config.source);
    if (!anchor || !source) return;
    const nextSignature = [source.textContent, source.dataset.status, source.dataset.state, source.dataset.syncedAt, source.dataset.syncOwner].join('|');
    if (nextSignature !== signature) {
      signature = nextSignature;
      state = classify(source);
      lastSuccess = state === 'success' ? source.dataset.syncedAt || new Date().toISOString() : '';
    }
    let wrapper = anchor.parentElement!;
    if (!wrapper.classList.contains('mj-sync-account')) {
      wrapper = document.createElement('span'); wrapper.className = 'mj-sync-account';
      anchor.before(wrapper); wrapper.append(anchor);
    }
    const host = studio ? document.querySelector<HTMLElement>('#views')?.parentElement || wrapper : wrapper;
    let display = host.querySelector<HTMLElement>(':scope > .mj-sync-status');
    if (!display) { display = document.createElement('span'); display.className = 'mj-sync-status'; display.setAttribute('role', 'status'); display.setAttribute('aria-live', 'polite'); host.append(display); }
    if (config.source === '[data-reading-sync-status]' || source === anchor) {
      const account = source === anchor
        ? source.textContent?.match(/^(?:已同步|已登录|正在同步|正在重试|本地模拟)：(.+)$/)?.[1] || ''
        : document.querySelector('[data-login-status]')?.textContent?.split('；')[0] || '';
      let identity = wrapper.querySelector<HTMLElement>('.mj-sync-identity');
      if (!identity) { identity = document.createElement('span'); identity.className = 'mj-sync-identity'; display.before(identity); }
      if (identity.textContent !== account) identity.textContent = account;
    }
    const time = state === 'success' ? new Date(lastSuccess).toLocaleString('zh-CN', { hour12: false }) : '';
    const summary = state === 'success' ? `同步成功 · ${time}` : state === 'error' ? '同步失败' : '';
    if (display.textContent !== summary) display.textContent = summary;
    if (display.dataset.state !== state) display.dataset.state = state;
    display.title = summary;
  };
  const observer = new MutationObserver(update);
  observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['data-status', 'data-state', 'data-synced-at', 'data-sync-owner'] });
  window.addEventListener('site-auth-change', () => {
    lastSuccess = ''; state = 'pending';
    const source = document.querySelector<HTMLElement>(config.source);
    signature = source ? [source.textContent, source.dataset.status, source.dataset.state, source.dataset.syncedAt, source.dataset.syncOwner].join('|') : '';
    update();
  });
  update();
}
