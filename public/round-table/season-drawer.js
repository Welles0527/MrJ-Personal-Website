const gallery = document.querySelector('#season-gallery');
const series = gallery.querySelector('.series');
const seriesLayout = gallery.querySelector('.series-layout');
const seasonGrid = gallery.querySelector('.seasons');
const seasonCards = Array.from(seasonGrid.querySelectorAll('[data-season]'));
const directoryHome = gallery.querySelector('.guest-directory-home');
const directory = directoryHome.querySelector('.guest-directory');
const guestGroups = Array.from(directory.querySelectorAll('.guest-avatars'));
const guestDirectoryLabel = directory.querySelector('#guest-directory-label');
const guestDirectoryCount = guestDirectoryLabel.querySelector('.guest-directory-count');
const directoryNote = directory.querySelector('.guest-directory-note');
const guestDirectoryStatus = directory.querySelector('.guest-directory-status');
const guestRetry = directory.querySelector('.guest-retry');
const guestTooltip = document.querySelector('.guest-tooltip');
const guestTooltipName = guestTooltip.querySelector('strong');
const guestTooltipBackground = guestTooltip.querySelector('#guest-tooltip-background');
const drawer = document.querySelector('#season-drawer');
const drawerTitle = drawer.querySelector('#drawer-title');
const drawerGuestIntro = drawer.querySelector('.drawer-guest-intro');
const drawerMeta = drawer.querySelector('#drawer-meta');
const drawerClose = drawer.querySelector('.drawer-close');
const drawerScroll = drawer.querySelector('.drawer-scroll');
const rosterToggle = drawer.querySelector('.drawer-roster-toggle');
const drawerRoster = drawer.querySelector('#drawer-roster');
const drawerProgramme = drawer.querySelector('.drawer-programme');
const drawerStatus = drawer.querySelector('.drawer-status');
const fallback = drawer.querySelector('.drawer-fallback');
const list = drawer.querySelector('.episode-list');
const guestDrawer = document.querySelector('#guest-drawer');
const guestTitle = guestDrawer.querySelector('#guest-drawer-title');
const guestMeta = guestDrawer.querySelector('#guest-drawer-meta');
const guestClose = guestDrawer.querySelector('.drawer-close');
const guestScroll = guestDrawer.querySelector('.drawer-scroll');
const guestList = guestDrawer.querySelector('.episode-guests');
const episodeTemplate = document.querySelector('#episode-template');
const guestTemplate = document.querySelector('#guest-template');
const appearanceTemplate = document.querySelector('#guest-appearance-template');
const touchLayout = gallery.hasAttribute('data-touch-layout')
  ? window.matchMedia('(hover: none) and (pointer: coarse)')
  : null;
const compactLayout = window.matchMedia(touchLayout
  ? `(max-width: 900px), ${touchLayout.media}`
  : '(max-width: 900px)');

let catalogRequest;
let guestProfiles;
let appearancesByGuest;
let guestRosters;
let tooltipButton = null;
let activeTrigger = null;
let selectedSeason = null;
let activeEpisodeButton = null;
let openVersion = 0;

function loadCatalog() {
  catalogRequest ??= fetch(new URL('./episodes.json', document.baseURI))
    .then(response => {
      if (!response.ok) throw new Error(`Episode catalog: ${response.status}`);
      return response.json();
    })
    .catch(error => {
      catalogRequest = undefined;
      throw error;
    });
  return catalogRequest;
}

function renderPortrait(portrait, name, path) {
  const initial = Array.from(name)[0];
  portrait.textContent = initial;
  if (!path) return;

  const image = document.createElement('img');
  image.alt = '';
  image.loading = 'lazy';
  image.addEventListener('error', () => {
    if (image.parentElement === portrait) portrait.textContent = initial;
  }, { once: true });
  image.src = path;
  portrait.replaceChildren(image);
}

function renderGuestName(heading, name, profile) {
  heading.textContent = name;
  if (!profile.portrait || !profile.source) return;

  const source = document.createElement('a');
  source.href = profile.source;
  source.target = '_blank';
  source.rel = 'noopener';
  source.title = '查看照片来源';
  source.setAttribute('aria-label', `${name}，查看照片来源（新标签页）`);
  source.textContent = name;
  heading.replaceChildren(source);
}

function makeGuest(name, profile) {
  const guest = guestTemplate.content.cloneNode(true);
  renderGuestName(guest.querySelector('.guest-name'), name, profile);
  guest.querySelector('.guest-background').textContent = profile.background;
  renderPortrait(guest.querySelector('.guest-photo'), name, profile.portrait);
  return guest;
}

function episodeNumber(episode) {
  return episode.number == null ? '特别篇' : `第 ${episode.number} 期`;
}

function setWatchLink(link, episode, watchRoute) {
  if (episode.index == null) {
    link.hidden = true;
    return;
  }

  const url = new URL(episode.route || watchRoute);
  url.searchParams.set('episode', episode.index);
  link.href = url;
  link.title = `ZIP0 选集 ${episode.index} · ${episode.label}`;
  link.setAttribute('aria-label', `观看 ${episode.title}（ZIP0，新标签页）`);
}

function makeGuestAvatar(name, profile) {
  const item = document.createElement('li');
  const button = document.createElement('button');
  const photo = document.createElement('span');
  const label = document.createElement('span');
  button.type = 'button';
  button.className = 'guest-avatar';
  button.dataset.guest = name;
  button.setAttribute('aria-label', name);
  button.setAttribute('aria-controls', drawer.id);
  button.setAttribute('aria-expanded', 'false');
  photo.className = 'guest-avatar-photo';
  photo.setAttribute('aria-hidden', 'true');
  label.className = 'guest-avatar-label';
  label.textContent = name;
  renderPortrait(photo, name, profile.portrait);
  button.append(photo, label);
  item.append(button);
  return item;
}

async function loadGuestDirectory() {
  guestRetry.hidden = true;
  guestDirectoryStatus.hidden = false;
  guestDirectoryStatus.textContent = '正在加载嘉宾…';

  try {
    const catalog = await loadCatalog();
    guestProfiles = catalog.guests;
    const profiles = Object.entries(guestProfiles);
    appearancesByGuest = new Map(profiles.map(([name]) => [name, []]));

    for (const card of seasonCards) {
      const seasonName = card.querySelector('.season-title').textContent;
      for (const episode of catalog.seasons[card.dataset.season].episodes) {
        for (const name of new Set(episode.guests)) {
          appearancesByGuest.get(name)?.push({ episode, seasonName, watchRoute: card.href });
        }
      }
    }

    guestRosters = guestGroups.map(group => {
      const members = profiles.filter(([, profile]) => profile.gender === group.dataset.gender);
      const entries = members.map(([name, profile]) => ({
        item: makeGuestAvatar(name, profile),
        appearances: appearancesByGuest.get(name).length,
      }));
      const frequent = [...entries].sort((left, right) => right.appearances - left.appearances).slice(0, 10);
      return { group, all: entries.map(entry => entry.item), frequent: frequent.map(entry => entry.item) };
    });
    renderGuestDirectory();
    guestDirectoryStatus.hidden = true;
  } catch {
    guestDirectoryStatus.textContent = '嘉宾资料暂时无法加载。';
    guestRetry.hidden = false;
  }
}

function renderGuestDirectory() {
  if (!guestRosters) return;
  const showFrequent = touchLayout?.matches && directory.parentElement === directoryHome;
  let total = 0;
  for (const { group, all, frequent } of guestRosters) {
    const items = showFrequent ? frequent : all;
    group.replaceChildren(...items);
    group.parentElement.hidden = items.length === 0;
    total += items.length;
  }
  if (guestDirectoryCount) {
    guestDirectoryCount.textContent = `${total} 位`;
  } else {
    guestDirectoryLabel.textContent = `嘉宾 · ${total} 位`;
  }
  updateSeasonGuests();
}

function updateSeasonGuests() {
  if (!appearancesByGuest) return;
  const seasonName = selectedSeason?.querySelector('.season-title').textContent;
  const filtered = Boolean(seasonName);
  let count = 0;
  for (const button of directory.querySelectorAll('.guest-avatar')) {
    const name = button.dataset.guest;
    const participated = filtered && appearancesByGuest.get(name).some(appearance => appearance.seasonName === seasonName);
    button.parentElement.hidden = filtered && !participated;
    button.classList.toggle('is-in-season', participated);
    button.setAttribute('aria-label', participated ? `${name}，参加${seasonName}` : name);
    if (participated) count += 1;
  }
  directoryNote.textContent = seasonName ? `${seasonName} · ${count} 位参与` : '';
}

function hideGuestTooltip() {
  if (!tooltipButton) return;
  tooltipButton.removeAttribute('aria-describedby');
  tooltipButton = null;
  guestTooltip.hidden = true;
}

function showGuestTooltip(button) {
  hideGuestTooltip();
  if (touchLayout?.matches) return;
  tooltipButton = button;
  const name = button.dataset.guest;
  guestTooltipName.textContent = name;
  guestTooltipBackground.textContent = guestProfiles[name].background;
  guestTooltip.hidden = false;
  button.setAttribute('aria-describedby', guestTooltipBackground.id);

  const target = button.getBoundingClientRect();
  const { width, height } = guestTooltip.getBoundingClientRect();
  const x = Math.min(target.left + (target.width - width) / 2, document.documentElement.clientWidth - width - 12);
  const y = target.bottom + height + 20 <= window.innerHeight ? target.bottom + 8 : target.top - height - 8;
  guestTooltip.style.left = `${Math.max(12, x)}px`;
  guestTooltip.style.top = `${Math.max(12, y)}px`;
}

function makeAppearance({ episode, seasonName, watchRoute }) {
  const row = appearanceTemplate.content.cloneNode(true);
  row.querySelector('.episode-number').textContent = `${seasonName} · ${episodeNumber(episode)}`;
  row.querySelector('.episode-title').textContent = episode.title;
  setWatchLink(row.querySelector('.episode-watch'), episode, watchRoute);
  return row;
}

function openGuestAppearances(button) {
  openDrawer(button);
  const name = button.dataset.guest;
  const appearances = appearancesByGuest.get(name);
  drawerTitle.textContent = name;
  if (drawerGuestIntro) {
    drawerGuestIntro.textContent = guestProfiles[name].background;
    drawerGuestIntro.hidden = !drawerGuestIntro.textContent;
  }
  drawerMeta.textContent = `参与节目 · ${appearances.length} 期`;
  list.setAttribute('aria-label', `${name}参与的节目单`);
  list.replaceChildren(...appearances.map(makeAppearance));
}

function placeGuestDirectory() {
  if (touchLayout?.matches) {
    hideGuestTooltip();
    seasonGrid.before(directoryHome);
  } else if (directoryHome.parentElement !== gallery) {
    gallery.append(directoryHome);
  }
  if (directory.parentElement === directoryHome) renderGuestDirectory();
}

function showDrawerRoster(show) {
  const mount = show ? drawerRoster : directoryHome;
  if (directory.parentElement !== mount) {
    mount.append(directory);
    if (touchLayout?.matches) renderGuestDirectory();
  }
  drawerRoster.hidden = !show;
  drawerProgramme.hidden = show;
  rosterToggle.setAttribute('aria-expanded', String(show));
  rosterToggle.textContent = show ? '返回节目单' : '本季嘉宾';
  drawerScroll.scrollTop = 0;
}

function updatePanelAvailability() {
  const drawerOpen = activeTrigger !== null;
  const guestOpen = activeEpisodeButton !== null;
  series.inert = directoryHome.inert = guestOpen || (compactLayout.matches && drawerOpen);
  drawer.inert = !drawerOpen || (compactLayout.matches && guestOpen);
  guestDrawer.inert = !guestOpen;
}

function revealDrawer(closeButton) {
  if (seriesLayout.getBoundingClientRect().top < 16) {
    seriesLayout.scrollIntoView({ block: 'start' });
  }
  closeButton.focus({ preventScroll: true });
}

function openGuests(episode, button, guests) {
  activeEpisodeButton?.setAttribute('aria-expanded', 'false');
  activeEpisodeButton = button;
  button.setAttribute('aria-expanded', 'true');
  guestTitle.textContent = episode.title;
  const programme = [drawerTitle.textContent, button.querySelector('.episode-number').textContent];
  programme.push(episode.index == null ? 'ZIP0 对应集待核对' : `ZIP0 选集 ${episode.index}`);
  guestMeta.textContent = programme.join(' · ');
  guestList.replaceChildren(...episode.guests.map(name => makeGuest(name, guests[name])));
  guestDrawer.classList.add('is-open');
  updatePanelAvailability();
  guestScroll.scrollTop = 0;
  revealDrawer(guestClose);
}

function closeGuests(restoreFocus = true) {
  const button = activeEpisodeButton;
  if (!button) return;
  activeEpisodeButton = null;
  button.setAttribute('aria-expanded', 'false');
  guestDrawer.classList.remove('is-open');
  updatePanelAvailability();
  if (restoreFocus) button.focus();
}

function makeEpisode(episode, watchRoute, guests) {
  const item = episodeTemplate.content.cloneNode(true);
  const button = item.querySelector('.episode-select');
  item.querySelector('.episode-number').textContent = episodeNumber(episode);
  item.querySelector('.episode-title').textContent = episode.title;
  button.addEventListener('click', () => openGuests(episode, button, guests));
  setWatchLink(item.querySelector('.episode-watch'), episode, watchRoute);
  return item;
}

function openDrawer(trigger) {
  hideGuestTooltip();
  closeGuests(false);
  activeTrigger?.setAttribute('aria-expanded', 'false');
  activeTrigger = trigger;
  trigger.setAttribute('aria-expanded', 'true');
  openVersion += 1;
  showDrawerRoster(false);
  if (drawerGuestIntro) drawerGuestIntro.hidden = true;
  rosterToggle.hidden = true;
  drawerStatus.hidden = true;
  fallback.hidden = true;
  drawer.classList.add('is-open');
  updatePanelAvailability();
  revealDrawer(drawerClose);
}

async function openSeason(card) {
  openDrawer(card);
  const version = openVersion;
  selectedSeason?.classList.remove('is-season-selected');
  selectedSeason = card;
  card.classList.add('is-season-selected');
  updateSeasonGuests();
  const year = card.querySelector('time').dateTime;
  drawerTitle.textContent = `圆桌派 ${card.querySelector('.season-title').textContent}`;
  drawerMeta.textContent = year;
  drawerStatus.textContent = '正在加载节目单…';
  drawerStatus.hidden = false;
  fallback.href = card.href;
  list.setAttribute('aria-label', '本季节目单');
  list.replaceChildren();

  try {
    const catalog = await loadCatalog();
    if (version !== openVersion) return;
    const season = catalog.seasons[card.dataset.season];
    const regularCount = season.episodes.filter(episode => episode.number != null).length;
    const bonusCount = season.episodes.length - regularCount;
    const countLabel = bonusCount ? `${regularCount} 期 + ${bonusCount} 个特别篇` : `${regularCount} 期`;
    drawerMeta.textContent = `${year} · ${countLabel} · 主持人 窦文涛`;
    drawerStatus.textContent = season.notice || '';
    drawerStatus.hidden = !season.notice;
    list.replaceChildren(...season.episodes.map(episode =>
      makeEpisode(episode, card.href, catalog.guests)
    ));
    rosterToggle.hidden = false;
  } catch {
    if (version !== openVersion) return;
    drawerStatus.textContent = '节目单暂时无法加载。';
    drawerStatus.hidden = false;
    fallback.hidden = false;
  }
}

function closeDrawer() {
  const trigger = activeTrigger;
  const seasonTrigger = selectedSeason;
  closeGuests(false);
  hideGuestTooltip();
  showDrawerRoster(false);
  activeTrigger = null;
  selectedSeason?.classList.remove('is-season-selected');
  selectedSeason = null;
  openVersion += 1;
  trigger?.setAttribute('aria-expanded', 'false');
  updateSeasonGuests();
  drawer.classList.remove('is-open');
  updatePanelAvailability();
  const focusTarget = trigger?.isConnected ? trigger : seasonTrigger;
  focusTarget?.focus();
}

for (const card of seasonCards) {
  card.setAttribute('aria-controls', drawer.id);
  card.setAttribute('aria-expanded', 'false');
}

seasonGrid.addEventListener('click', event => {
  const card = event.target.closest('[data-season]');
  if (!card || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  openSeason(card);
});

drawerClose.addEventListener('click', closeDrawer);
rosterToggle.addEventListener('click', () => {
  hideGuestTooltip();
  showDrawerRoster(drawerRoster.hidden);
});
guestClose.addEventListener('click', () => closeGuests());
guestRetry.addEventListener('click', loadGuestDirectory);

directory.addEventListener('pointerover', event => {
  const button = event.target.closest('.guest-avatar');
  if (event.pointerType !== 'touch' && button && button !== tooltipButton) showGuestTooltip(button);
});

directory.addEventListener('pointerout', event => {
  if (tooltipButton === event.target.closest('.guest-avatar')) hideGuestTooltip();
});

directory.addEventListener('focusin', event => {
  if (event.target.matches('.guest-avatar:focus-visible')) showGuestTooltip(event.target);
});

directory.addEventListener('focusout', hideGuestTooltip);
directory.addEventListener('click', event => {
  const button = event.target.closest('.guest-avatar');
  if (button) openGuestAppearances(button);
});

window.addEventListener('scroll', hideGuestTooltip, { capture: true, passive: true });
window.addEventListener('resize', hideGuestTooltip);

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || event.defaultPrevented || !(activeTrigger || tooltipButton)) return;
  event.preventDefault();
  if (activeEpisodeButton) closeGuests();
  else if (tooltipButton) hideGuestTooltip();
  else closeDrawer();
});

placeGuestDirectory();
touchLayout?.addEventListener('change', placeGuestDirectory);
loadGuestDirectory();

compactLayout.addEventListener('change', () => {
  const focused = document.activeElement;
  if (!compactLayout.matches && !drawerRoster.hidden) showDrawerRoster(false);
  updatePanelAvailability();
  if (focused?.closest('[inert]')) {
    (activeEpisodeButton ? guestClose : drawerClose).focus({ preventScroll: true });
  }
});
