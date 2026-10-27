// Project names use the same entry URLs as the homepage cards.
export function createProjectBrand(): HTMLAnchorElement | null {
  const route = location.pathname;
  const project = /\/topics\/space\/travel\//.test(route)
    ? { name: '足印', title: '3D 旅行相册', href: '/officialwebsite/topics/space/travel/travel-map/', color: '#72bfc9', icon: '<path d="M9 10c-3-1-5 3-4 7s4 5 6 2c1-2 0-4-1-5Z"/><circle cx="10" cy="6" r="2"/><path d="M17 13c3 0 5-4 3-7s-5-2-5 1c0 2 1 3 1 4Z"/><circle cx="17" cy="18" r="2"/>' }
    : route.endsWith('/ai-bookshelf.html')
    ? { name: '知页', title: '阅读神器', href: '/officialwebsite/ai-bookshelf.html', color: '#da5b25', icon: '<path d="M12 6v15M3 4c4-1 6 0 9 2 3-2 5-3 9-2v15c-4-1-6 0-9 2-3-2-5-3-9-2Z"/>' }
    : /\/resume(?:\/|$)/.test(route)
    ? { name: '职笺', title: 'AI个性化简历', href: '/officialwebsite/resume/', color: '#c47754', icon: '<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 8h8M8 12h8M8 16h5"/>' }
    : /\/super-calendar\//.test(route)
    ? { name: '日迹', title: 'AI 超级日历', href: '/officialwebsite/super-calendar/index.html', color: '#a271b8', icon: '<rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v4M16 3v4M4 10h16M8 14h2M14 14h2M8 18h2"/>' }
    : /\/(?:topics\/space\/investing\/(?:funds|stock-tracking)|stock-tracking)(?:\/|$)/.test(route)
    ? { name: '观盈', title: 'AI投资', href: '/officialwebsite/topics/space/investing/funds/index.html#kpi', color: '#c39242', icon: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="m6 16 5-5 3 3 4-6M14 8h4v4"/>' }
    : route.endsWith('/coffee-field-guide-zh.html')
    ? { name: '咖叙', title: '用AI，学咖啡', href: '/officialwebsite/coffee-field-guide-zh.html', color: '#9e492d', icon: '<path d="M5 8h12v7a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5ZM17 9h2a3 3 0 0 1 0 6h-2M8 3v2M12 2v3M4 22h15"/>' }
    : null;
  if (!project) return null;
  const brand = document.createElement('a');
  brand.className = 'mj-project-brand';
  brand.dataset.project = ({'足印':'travel','知页':'books','职笺':'resume','日迹':'calendar','咖叙':'coffee','观盈':'invest'} as Record<string,string>)[project.name];
  if (project.name === '咖叙') brand.dataset.native = 'coffee';
  brand.href = project.href;
  brand.setAttribute('aria-label', `${project.name} · ${project.title}`);
  brand.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="color:${project.color}">${project.icon}</svg><span>${project.name}</span>`;
  return brand;
}

// Put the identity in the page's own navigation instead of a separate account strip.
export function mountProjectBrand(brand: HTMLAnchorElement, accountBar: HTMLElement) {
  const kind = brand.dataset.project!;
  accountBar.dataset.project = kind;
  const style = document.createElement('style');
  style.textContent = `
    .mj-project-brand{font-family:inherit;font-size:20px;letter-spacing:.06em;background:none;border:0;box-shadow:none;padding:0;color:inherit}
    .mj-project-brand svg{width:25px;height:25px}
    .journal>.mj-project-brand{position:absolute;top:26px;left:20px;color:#eaf4f7;font-size:32px;gap:12px}
    .journal>.mj-project-brand svg{width:38px;height:38px}
    .atlas .topbar>.mj-project-brand{display:flex;width:max-content;margin:0 auto 18px;padding:0;border:0;background:none;font-size:28px;gap:10px}
    .atlas .topbar>.mj-project-brand svg{width:34px;height:34px}
    .shelf-header>.mj-project-brand{margin:0 0 14px;color:#29352e;font-size:18px}
    .sidebar>.brand[data-mj-brand=books]{color:#f5ead6;gap:12px}
    .utility-bar{gap:14px;flex-wrap:wrap}.utility-bar>.mj-project-brand{margin-right:4px;color:#422d26}.utility-bar>.mj-project-brand svg{color:currentColor!important}
    .utility-bar .controls{margin-left:auto}
    .calendar-topbar .topbar-period>.mj-project-brand{margin-right:auto;color:var(--text);font-size:18px}
    .app-header>.brand[data-mj-brand=invest]{display:flex;align-items:center;gap:10px}
    .app-header>.brand[data-mj-brand=invest] .brand-mark{display:flex!important;align-items:center;justify-content:center;flex:none;width:30px;height:30px;color:var(--accent,#c39242);background:none;border:0}
    .app-header>.brand[data-mj-brand=invest] .brand-mark svg{width:25px;height:25px}
    .app-header>.brand[data-mj-brand=invest] strong{font-size:18px;line-height:1.3}
    .workspace-nav:has(>.workspace-mark[data-mj-brand=invest]){grid-template-columns:auto minmax(0,1fr) auto!important}
    .workspace-mark[data-mj-brand=invest]{display:inline-flex;align-items:center;gap:8px;width:auto!important;min-width:86px!important;flex-shrink:0;padding:0 8px;font-family:inherit;font-size:17px;font-weight:600;white-space:nowrap;background:transparent!important;box-shadow:none!important;border:0!important;color:inherit!important}
    #mj-account[data-project=books]{background:#f7f1e6;color:#29352e}
    #mj-account[data-project=travel]{background:#010409;color:#eaf4f7}
    @media(max-width:820px){
      .utility-bar{gap:10px}.utility-bar>.mj-project-brand{font-size:18px}.utility-bar .home-link{font-size:12px}
      .calendar-topbar .topbar-period>.mj-project-brand{flex:none}.calendar-topbar .topbar-period{gap:10px}
      #topbar>.mj-project-brand{margin-right:auto;font-size:18px;gap:7px}#topbar:has(>.mj-project-brand)>.crumb{display:none}
    }
  `;
  document.head.append(style);
  const move = (host: Element | null) => {
    if (!host) return false;
    if (brand.parentElement !== host) host.prepend(brand);
    return true;
  };
  const rename = (host: Element | null, label: Element | null, name: string) => {
    if (!host || !label) return false;
    if (label.textContent !== name) label.textContent = name;
    host.setAttribute('data-mj-brand', kind);
    return true;
  };
  const integrate = () => {
    const mobile = matchMedia('(max-width:820px)').matches;
    let integrated = false;
    if (kind === 'travel') {
      integrated = move(document.querySelector(mobile ? '.atlas .topbar' : '.atlas .journal'));
      if (!integrated) integrated = move(document.querySelector('main header,main .page-heading,header:not(#mj-account)'));
    } else if (kind === 'books') {
      const native = document.querySelector('.sidebar>.brand');
      rename(native, native?.querySelector(':scope>span:last-child') || null, '知页');
      const compact = matchMedia('(max-width:1180px)').matches;
      integrated = compact ? move(document.querySelector('.shelf-header')) : Boolean(native);
      if (!compact && brand.isConnected) brand.remove();
    } else if (kind === 'resume') integrated = move(document.querySelector('.utility-bar'));
    else if (kind === 'calendar') {
      const native = document.querySelector('.space-brand,.space-shell .brand,aside>.brand');
      if (native && (!matchMedia('(max-width:680px)').matches || document.body.classList.contains('overview-page'))) {
        const label = native.querySelector('.wordmark') || native.querySelector(':scope>span:last-child');
        if (label) {
          const text = [...label.childNodes].find(node => node.nodeType === Node.TEXT_NODE);
          if (text && text.textContent !== '日迹') text.textContent = '日迹';
          // The sidebar wordmark used a decorative suffix; retain its English caption below.
          if (label.classList.contains('wordmark') && label.querySelector('span')) label.querySelector('span')!.remove();
          native.setAttribute('data-mj-brand', kind); integrated = true;
          if (brand.isConnected) brand.remove();
        }
      } else integrated = move(document.querySelector('.calendar-topbar .topbar-period'));
    } else if (kind === 'coffee') {
      integrated = mobile ? move(document.querySelector('#topbar')) : Boolean(document.querySelector('.sidebar .brand'));
      if (!mobile && brand.isConnected) brand.remove();
    } else if (kind === 'invest') {
      const native = document.querySelector('.app-header>.brand');
      if (native) {
        integrated = rename(native, native.querySelector(':scope>span:last-child strong'), '观盈');
        const icon = native.querySelector('.brand-mark');
        if (icon && !icon.hasAttribute('data-mj-icon')) { icon.innerHTML = brand.querySelector('svg')!.outerHTML; icon.setAttribute('data-mj-icon',''); }
      }
      const mark = document.querySelector('.workspace-mark');
      if (!integrated && mark) {
        if (!mark.hasAttribute('data-mj-icon')) { mark.querySelector('svg')?.replaceWith(brand.querySelector('svg')!.cloneNode(true)); mark.setAttribute('data-mj-icon',''); }
        if (!mark.querySelector('[data-brand-name]')) {
          const label = document.createElement('span'); label.dataset.brandName = ''; label.textContent = '观盈'; mark.append(label);
        }
        mark.setAttribute('data-mj-brand',kind); integrated = true;
      }
    }
    // A still-loading route may not have rendered its own header yet.
    if (!integrated && !brand.isConnected) accountBar.prepend(brand);
    else if (integrated && brand.parentElement === accountBar) brand.remove();
  };
  let queued = false;
  const schedule = () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; integrate(); }); } };
  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
  window.addEventListener('resize',schedule);
  integrate();
}
