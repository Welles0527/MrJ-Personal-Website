import { worshipCatalog } from "../data/worship-catalog";
import { worshipSources } from "../data/worship-sources";

export function initializeWorshipApp(cloudStoreOverride) {
const cloudStore = cloudStoreOverride || window.worshipCloudStore || {
  userId: null,
  async load(key, fallback) {
    try { return JSON.parse(localStorage.getItem(`worship:${key}`)) ?? fallback; } catch { return fallback; }
  },
  async save(key, value) { localStorage.setItem(`worship:${key}`, JSON.stringify(value)); },
};

const featuredSongs = [
  { title: "这一生最美的祝福", artist: "赞美之泉", album: "永恒的盼望", moods: ["温暖治愈", "感恩"], theme: "感恩与喜乐", duration: "05:26", rank: 1, reason: "官方版本、现场敬拜与翻唱长期流传", cover: "sun" },
  { title: "我相信", artist: "赞美之泉", album: "不要放弃", moods: ["信心", "激情敬拜"], theme: "信心与盼望", duration: "04:58", rank: 2, reason: "跨地区教会聚会中持续使用", cover: "mist" },
  { title: "如鹿切慕溪水", artist: "赞美之泉", album: "深深爱你", moods: ["温暖治愈", "安静"], theme: "祷告与亲近", duration: "05:15", rank: 3, reason: "经典经文诗歌的华语代表版本", cover: "water" },
  { title: "有你在我生命中", artist: "赞美之泉", album: "彩虹下的约定", moods: ["温暖治愈", "陪伴"], theme: "安慰与医治", duration: "04:42", rank: 4, reason: "歌词版、现场版和翻唱版本丰富", cover: "field" },
  { title: "全然向你", artist: "赞美之泉", album: "展开清晨的翅膀", moods: ["抒情安静", "敬拜"], theme: "委身与奉献", duration: "05:03", rank: 5, reason: "适合个人灵修与团体回应诗歌", cover: "dusk" },
  { title: "脚步", artist: "盛晓玫", album: "有一天", moods: ["激情敬拜", "福音见证"], theme: "信心与盼望", duration: "04:31", rank: 6, reason: "华人原创敬拜中的高识别度作品", cover: "orange" },
  { title: "最知心的朋友", artist: "经典单曲", album: "代表版本待核", moods: ["温暖治愈", "抒情安静"], theme: "安慰与医治", duration: "04:18", rank: 7, reason: "跨年代传唱的中文诗歌", cover: "blue" },
  { title: "陪我走过春夏秋冬", artist: "小羊诗歌", album: "活祭", moods: ["抒情安静", "温暖治愈"], theme: "陪伴与安慰", duration: "05:01", rank: 8, reason: "小羊诗歌代表性的抒情作品", cover: "lavender" },
  { title: "云上太阳", artist: "天韵合唱团", album: "天韵诗歌精选", moods: ["欢快感恩", "温暖治愈"], theme: "信心与盼望", duration: "04:10", rank: 9, reason: "华语教会长期传唱曲目", cover: "sunset" },
  { title: "奇异恩典", artist: "经典单曲", album: "多版本合集", moods: ["庄严赞美", "温暖治愈"], theme: "福音与救赎", duration: "03:58", rank: 10, reason: "跨宗派、跨年代的核心赞美诗", cover: "gold" },
  { title: "生命的更新", artist: "经典单曲", album: "代表版本待核", moods: ["抒情安静", "祷告默想"], theme: "委身与奉献", duration: "04:45", rank: 11, reason: "适合回应与更新主题聚会", cover: "green" },
  { title: "我要唱唱你的力量", artist: "KUA Worship", album: "KUA Worship 精选", moods: ["激情敬拜", "欢快感恩"], theme: "赞美与尊崇", duration: "05:12", rank: 12, reason: "现代华语现场敬拜的代表气质", cover: "red" },
];

const PRIMARY_MOODS = ["温暖治愈", "激情敬拜", "欢快感恩"];
const normalizeCategoryMoods = (moods = [], theme = "") => {
  const directMatches = [...new Set((Array.isArray(moods) ? moods : []).filter(mood => PRIMARY_MOODS.includes(mood)))];
  if (directMatches.length) return directMatches;
  const text = `${(Array.isArray(moods) ? moods : []).join(" ")} ${theme}`;
  if (/欢快|感恩|喜乐|欢唱/.test(text)) return ["欢快感恩"];
  if (/激情|敬拜|赞美|尊崇|宣告|庄严/.test(text)) return ["激情敬拜"];
  return ["温暖治愈"];
};
const songKey = song => song?.isCustom ? `custom:${song.id}` : `catalog:${song?.artist || ""}::${song?.title || ""}`;
const baseSongs = (worshipCatalog.length ? worshipCatalog : featuredSongs).map(song => ({
  ...song,
  moods: normalizeCategoryMoods(song.moods, song.theme),
}));
let customSongs = [];
let categoryOverrides = {};
let lyricsOverrides = {};
let deletedCatalogKeys = new Set();
let songs = [...baseSongs];
const sourceMap = worshipSources;
const queue = [...songs.slice(0, 12)];
const state = { mood: "", query: "", viewMode: "discover", artist: "", current: songs[0], playing: false, favorites: new Set(), recents: [] };
let queueSelectionMode = false;
let selectedQueueKeys = new Set();
let batchPlaybackKeys = [];
let youtubePlaylistEntries = [];
let youtubeAdvanceFallbackTimer = 0;
let youtubeLoadGeneration = 0;
let youtubeReadyGeneration = 0;
let requestedYoutubeId = "";
let requestedYoutubeConfirmed = false;
let youtubeStartupFallbackTimer = 0;
const $ = selector => document.querySelector(selector);
const coverClass = song => `cover-${song.cover || "sun"}`;
const isCurrent = song => state.current?.title === song.title && state.current?.artist === song.artist;
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
const resolveSongSource = song => song?.source || sourceMap[`${song?.artist || ""}::${song?.title || ""}`] || {};
const getSongLyrics = song => String(lyricsOverrides[songKey(song)] || song?.lyrics || "").trim();
let editingCustomSongId = null;
let editingCategorySongKey = null;
let songEditorReturnView = "mine";
document.documentElement.dataset.worshipAppVersion = "content-hashed-assets-v1";

function getFallbackArtwork(song) {
  const feature = $(".feature");
  const options = [
    feature?.dataset.fallbackAlbum,
    feature?.dataset.fallbackBand,
    feature?.dataset.fallbackQuiet,
    feature?.dataset.fallbackVideo,
  ].filter(Boolean);
  const seed = `${song?.artist || ""}${song?.title || ""}`;
  const index = [...seed].reduce((total, character) => total + character.codePointAt(0), 0) % Math.max(options.length, 1);
  return options[index] || "";
}

function getSongArtwork(song) {
  const source = resolveSongSource(song);
  const fallback = getFallbackArtwork(song);
  if (source.youtubeId) {
    return {
      cover: `https://i.ytimg.com/vi/${encodeURIComponent(source.youtubeId)}/hqdefault.jpg`,
      backdrop: `https://i.ytimg.com/vi/${encodeURIComponent(source.youtubeId)}/maxresdefault.jpg`,
      fallback,
    };
  }
  return { cover: fallback, backdrop: fallback, fallback };
}

function setImageSource(node, source, fallback) {
  if (!node) return;
  node.onerror = source !== fallback && fallback
    ? () => {
      node.onerror = null;
      node.src = fallback;
    }
    : null;
  node.src = source || fallback || "";
}

function renderLyrics(song) {
  const lyrics = getSongLyrics(song);
  const dialogLyrics = $("#dialogLyrics");
  if (dialogLyrics) {
    dialogLyrics.textContent = lyrics || "这首歌暂未收录授权歌词。";
    dialogLyrics.classList.toggle("is-empty", !lyrics);
  }
  const editLabel = lyrics ? "编辑歌词" : "补充歌词";
  if ($("#editLyricsButton")) $("#editLyricsButton").textContent = editLabel;
}

function updateFeatureSong(song) {
  const artwork = getSongArtwork(song);
  setImageSource($("#featureArt"), artwork.backdrop, artwork.cover || artwork.fallback);
  setImageSource($("#featureAlbumImage"), artwork.cover, artwork.fallback);
  setImageSource($("#queueCoverImage"), artwork.cover, artwork.fallback);
  if ($("#featureAlbumImage")) $("#featureAlbumImage").alt = `${song.title}歌曲图片`;
  if ($("#queueCoverImage")) $("#queueCoverImage").alt = `${song.title} · ${song.artist}封面`;
  const playerShell = $("#mediaPlayer")?.closest(".media-player-shell");
  if (playerShell) playerShell.style.setProperty("--video-poster", `url("${artwork.cover || artwork.fallback}")`);
  if ($("#playerPrompt strong")) $("#playerPrompt strong").textContent = song.title;
  if ($("#playerPrompt small")) $("#playerPrompt small").textContent = song.artist;
  $("#featureAlbumBadge").textContent = song.artist;
  $("#featureHeroTitle").textContent = song.title;
  $("#featureHeroTitle").dataset.play = song.title;
  $("#featureHeroTitle").dataset.artist = song.artist;
  $("#featureHeroArtist").textContent = song.artist;
  $("#featureHeroArtist").dataset.artistFilter = song.artist;
  $("#featureHeroDescription").textContent = [song.album, ...(song.moods || [])].filter(Boolean).join(" · ");
  $("#featureReason").textContent = song.reason || song.theme || "收录于你的敬拜音乐歌单";
  $("#featureTime").textContent = `00:00 / ${song.duration || "--:--"}`;
  document.querySelectorAll(".feature-controls [data-play]").forEach(node => {
    node.dataset.play = song.title;
    node.dataset.artist = song.artist;
  });
  document.querySelectorAll(".player-cover,.now-card .cover").forEach(node => {
    node.style.backgroundImage = artwork.cover
      ? `linear-gradient(145deg, rgba(17, 30, 32, 0.08), rgba(17, 30, 32, 0.34)), url("${artwork.cover}")`
      : "";
    node.classList.toggle("has-artwork", Boolean(artwork.cover));
  });
  renderLyrics(song);
}

function extractPlayableSource(sourceUrl) {
  try {
    const url = new URL(sourceUrl);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    let youtubeId = "";
    if (hostname === "youtu.be") youtubeId = url.pathname.split("/").filter(Boolean)[0] || "";
    if (hostname.endsWith("youtube.com")) youtubeId = url.searchParams.get("v") || url.pathname.match(/\/(?:shorts|embed)\/([\w-]+)/)?.[1] || "";
    if (/^[\w-]{6,}$/.test(youtubeId)) return { youtubeId };
    if (hostname.endsWith("bilibili.com") || hostname === "b23.tv") {
      const bvid = `${url.pathname}${url.search}`.match(/BV[\w]+/i)?.[0];
      if (bvid) return { bvid };
    }
  } catch { /* Validation message is shown by the form. */ }
  return null;
}

function normalizeCustomSong(song) {
  const source = extractPlayableSource(song?.sourceUrl || "");
  if (!source || !String(song?.title || "").trim() || !String(song?.artist || "").trim()) return null;
  const moods = normalizeCategoryMoods(song.moods, song.theme);
  return {
    id: song.id || (crypto.randomUUID?.() || `mine-${Date.now()}-${Math.random().toString(36).slice(2)}`),
    title: String(song.title).trim(), artist: String(song.artist).trim(), album: String(song.album || "我的收藏").trim() || "我的收藏",
    duration: /^\d{1,2}:\d{2}$/.test(String(song.duration || "")) ? String(song.duration) : "--:--",
    moods, theme: moods.join(" · "), cover: song.cover || "dusk", kind: "个人歌曲", isCustom: true,
    sourceUrl: String(song.sourceUrl).trim(), source, createdAt: song.createdAt || new Date().toISOString(),
  };
}

function rebuildSongs() {
  const currentKey = songKey(state.current);
  const catalogSongs = baseSongs
    .filter(song => !deletedCatalogKeys.has(songKey(song)))
    .map(song => {
      const override = categoryOverrides[songKey(song)];
      const moods = override ? normalizeCategoryMoods(override, song.theme) : song.moods;
      return { ...song, moods, theme: moods.join(" · ") };
    });
  songs = [...catalogSongs, ...customSongs];
  const refreshedQueue = queue
    .map(item => songs.find(song => songKey(song) === songKey(item)))
    .filter(Boolean);
  queue.splice(0, queue.length, ...refreshedQueue);
  state.current = songs.find(song => songKey(song) === currentKey) || songs[0];
  if (!state.current) state.playing = false;
}

async function saveLibrarySettings() {
  const categories = Object.fromEntries(
    Object.entries(categoryOverrides)
      .map(([key, moods]) => [key, normalizeCategoryMoods(moods)])
      .filter(([, moods]) => moods.length),
  );
  const lyrics = Object.fromEntries(
    Object.entries(lyricsOverrides)
      .map(([key, value]) => [key, String(value || "").trim()])
      .filter(([, value]) => value),
  );
  await cloudStore.save("librarySettings", { categories, lyrics, deleted: [...deletedCatalogKeys] });
}

async function savePlaylist() {
  await cloudStore.save("playlist", queue.map(songKey));
}

function announceQueue(message) {
  const status = $("#queueStatus");
  if (!status) return;
  status.textContent = message;
  window.clearTimeout(announceQueue.timer);
  announceQueue.timer = window.setTimeout(() => { status.textContent = ""; }, 2600);
}

function addSongsToQueue(candidates, label = "歌曲") {
  const existingKeys = new Set(queue.map(songKey));
  const additions = candidates.filter(song => song && !existingKeys.has(songKey(song)));
  queue.push(...additions);
  renderQueue();
  if (additions.length) {
    savePlaylist();
    announceQueue(`已将${label}加入播放列表 · ${additions.length} 首`);
  } else {
    announceQueue(`${label}已在播放列表中`);
  }
  return additions;
}

function getPlaybackQueue() {
  if (batchPlaybackKeys.length) {
    const selectedSongs = batchPlaybackKeys
      .map(key => queue.find(song => songKey(song) === key))
      .filter(Boolean);
    if (selectedSongs.length) return selectedSongs;
    batchPlaybackKeys = [];
  }
  return queue.length ? queue : songs;
}

function buildYouTubePlaylistEntries(currentSong) {
  const playbackQueue = getPlaybackQueue();
  const currentIndex = playbackQueue.findIndex(song => songKey(song) === songKey(currentSong));
  const remainingSongs = currentIndex >= 0 ? playbackQueue.slice(currentIndex) : [currentSong];
  const entries = [];
  for (const song of remainingSongs) {
    const youtubeId = resolveSongSource(song).youtubeId;
    if (!youtubeId) break;
    entries.push({ song, youtubeId: String(youtubeId) });
  }
  return entries;
}

function updateQueueBatchActions() {
  const actions = $("#queueBatchActions");
  if (!actions) return;
  actions.hidden = !queueSelectionMode;
  $("#queueSelectedCount").textContent = selectedQueueKeys.size;
  $("#queueSelectAll").textContent = selectedQueueKeys.size === queue.length && queue.length ? "取消全选" : "全选";
  ["#queuePlaySelected", "#queueDeleteSelected"].forEach(selector => {
    $(selector).disabled = selectedQueueKeys.size === 0;
  });
  $("#queuePanel").classList.toggle("is-selecting", queueSelectionMode);
  $("#queueTitle").classList.toggle("is-selecting", queueSelectionMode);
  $("#queueTitle").setAttribute("aria-pressed", String(queueSelectionMode));
}

function setQueueSelectionMode(enabled) {
  queueSelectionMode = Boolean(enabled && queue.length);
  if (!queueSelectionMode) selectedQueueKeys = new Set();
  renderQueue();
  announceQueue(queueSelectionMode ? "多选模式 · 选择歌曲后可批量播放或删除" : "已退出多选模式");
}

function removeQueueSongs(keys, message) {
  const removing = new Set(keys);
  if (!removing.size) return;
  for (let index = queue.length - 1; index >= 0; index -= 1) {
    if (removing.has(songKey(queue[index]))) queue.splice(index, 1);
  }
  selectedQueueKeys = new Set([...selectedQueueKeys].filter(key => !removing.has(key)));
  batchPlaybackKeys = batchPlaybackKeys.filter(key => !removing.has(key));
  if (!queue.length) queueSelectionMode = false;
  savePlaylist();
  renderQueue();
  announceQueue(message);
}

function getFilteredSongs() {
  const query = state.query.trim().toLowerCase();
  return songs.filter(song => {
    const moodMatch = !state.mood || song.moods.includes(state.mood);
    const text = [song.title, song.artist, song.album, song.theme, ...song.moods].join(" ").toLowerCase();
    return moodMatch && text.includes(query);
  });
}

function getVisibleSongs() {
  const filtered = getFilteredSongs();
  if (state.viewMode === "artists") return filtered.filter(song => song.kind !== "单曲");
  if (state.viewMode === "singles") return filtered.filter(song => song.kind === "单曲");
  if (state.viewMode === "artist") return filtered.filter(song => song.artist === state.artist);
  if (state.viewMode === "all") return filtered;
  if (state.viewMode === "library") return filtered;
  if (state.viewMode === "favorites") return filtered.filter(song => state.favorites.has(song.title));
  if (state.viewMode === "mine") return filtered.filter(song => song.isCustom);
  if (state.viewMode === "recent") {
    const order = new Map(state.recents.map((title, index) => [title, index]));
    return filtered.filter(song => order.has(song.title)).sort((a, b) => order.get(a.title) - order.get(b.title));
  }
  return filtered.slice(0, 12);
}

function setProgress(percentage) {
  ["#featureProgress", "#nowProgress", "#playerProgress"].forEach(selector => {
    const node = $(selector); if (node) node.style.width = `${percentage}%`;
  });
}

function renderSongs() {
  const homeArtists = $("#homeArtists");
  $("#libraryAddButton").hidden = state.viewMode !== "library";
  if (state.viewMode === "artists") {
    if (homeArtists) homeArtists.hidden = true;
    renderArtists();
    return;
  }
  if (homeArtists) homeArtists.hidden = !["discover", "picked", "all"].includes(state.viewMode);
  const list = getVisibleSongs();
  $("#artistList").hidden = true;
  $("#songList").hidden = false;
  $("#songList").classList.remove("artist-grid");
  $("#songList").innerHTML = list.map((song, index) => {
    const key = songKey(song);
    const managementActions = state.viewMode === "library"
      ? `<span class="library-song-actions"><button type="button" data-edit-categories="${escapeHtml(key)}">修改分类</button><button type="button" data-delete-library="${escapeHtml(key)}">删除</button></span>`
      : "";
    const customActions = song.isCustom && state.viewMode === "mine"
      ? `<span class="custom-song-actions"><button type="button" data-edit-song="${escapeHtml(song.id)}">编辑</button><button type="button" data-delete-song="${escapeHtml(song.id)}">删除</button></span>`
      : "";
    return `
    <article class="song-row ${state.viewMode === "library" ? "library-row" : ""} ${isCurrent(song) ? "is-current" : ""}">
      <span class="track-num">${String(song.rank ?? index + 1).padStart(2, "0")}</span>
      <div class="row-cover cover ${coverClass(song)}">${escapeHtml(song.title.slice(0, 4))}</div>
      <div class="song-name"><button type="button" class="song-title-button" data-play="${escapeHtml(song.title)}" data-artist="${escapeHtml(song.artist)}" aria-label="播放${escapeHtml(song.title)}"><strong>${escapeHtml(song.title)}</strong></button><button type="button" class="song-queue-button" data-add-to-queue="${escapeHtml(key)}" aria-label="将${escapeHtml(song.title)}添加至播放列表"><span>＋</span> 添加至播放列表</button>${managementActions}${customActions}</div>
      <button type="button" class="artist" data-artist-filter="${escapeHtml(song.artist)}">${escapeHtml(song.artist)}</button>
      <div class="tags">${song.moods.slice(0, 2).map(mood => `<span>${escapeHtml(mood)}</span>`).join("")}</div>
      <span class="duration">${escapeHtml(song.duration)}</span>
      <button class="row-fav ${state.favorites.has(song.title) ? "filled" : ""}" data-favorite="${escapeHtml(song.title)}" aria-label="收藏${escapeHtml(song.title)}">${state.favorites.has(song.title) ? "♥" : "♡"}</button>
      <button class="row-play ${isCurrent(song) && state.playing ? "is-playing" : ""}" data-play="${escapeHtml(song.title)}" data-artist="${escapeHtml(song.artist)}" aria-label="${isCurrent(song) && state.playing ? "暂停" : "播放"}${escapeHtml(song.title)}">${isCurrent(song) && state.playing ? "Ⅱ" : "▶"}</button>
    </article>`;
  }).join("");
  $("#emptyState").hidden = list.length > 0;
  updatePlayIndicators();
}

function renderArtists() {
  const query = state.query.trim().toLowerCase();
  const moodSongs = state.mood ? songs.filter(song => song.moods.includes(state.mood)) : songs;
  const artists = [...new Set(moodSongs.map(song => song.artist))]
    .filter(artist => artist.toLowerCase().includes(query));
  $("#songList").hidden = true;
  $("#artistList").hidden = false;
  $("#artistList").innerHTML = artists.map((artist, index) => {
    const artistSongs = moodSongs.filter(song => song.artist === artist);
    const sample = artistSongs[0];
    return `<button type="button" class="artist-card" data-artist-filter="${escapeHtml(artist)}">
      <span class="artist-card-number">${String(index + 1).padStart(2, "0")}</span>
      <span class="artist-card-cover cover ${coverClass(sample)}">${escapeHtml(artist.slice(0, 4))}</span>
      <span><strong>${escapeHtml(artist)}</strong><small>${artistSongs.length} 首曲目 · 点击查看全部</small></span>
      <i>↗</i>
    </button>`;
  }).join("");
  $("#emptyState").hidden = artists.length > 0;
}

function renderQueue() {
  $("#queueList").innerHTML = queue.length
    ? queue.map(song => {
      const key = songKey(song);
      const selected = selectedQueueKeys.has(key);
      const leadingControl = queueSelectionMode
        ? `<button type="button" class="queue-select ${selected ? "selected" : ""}" data-queue-select="${escapeHtml(key)}" aria-pressed="${selected}" aria-label="${selected ? "取消选择" : "选择"}${escapeHtml(song.title)}">${selected ? "✓" : ""}</button>`
        : `<span class="drag" aria-hidden="true">⋮⋮</span>`;
      return `<div class="queue-item ${isCurrent(song) ? "current" : ""} ${selected ? "selected" : ""}" data-queue-key="${escapeHtml(key)}">${leadingControl}<div class="cover ${coverClass(song)}">${escapeHtml(song.title.slice(0, 2))}</div><div><button type="button" class="queue-song-title" data-play="${escapeHtml(song.title)}" data-artist="${escapeHtml(song.artist)}">${escapeHtml(song.title)}</button><button type="button" class="queue-artist" data-artist-filter="${escapeHtml(song.artist)}">${escapeHtml(song.artist)}</button></div><button class="queue-play ${isCurrent(song) && state.playing ? "is-playing" : ""}" data-play="${escapeHtml(song.title)}" data-artist="${escapeHtml(song.artist)}" aria-label="${isCurrent(song) && state.playing ? "暂停" : "播放"}${escapeHtml(song.title)}">${isCurrent(song) && state.playing ? "Ⅱ" : "▶"}</button><button type="button" class="queue-remove" data-remove-from-queue="${escapeHtml(key)}" aria-label="从播放列表删除${escapeHtml(song.title)}">×</button></div>`;
    }).join("")
    : `<div class="queue-empty"><span>♫</span><strong>播放列表还是空的</strong><small>从歌曲或专辑旁点击“添加至播放列表”</small></div>`;
  $("#queueCount").textContent = queue.length;
  updateQueueBatchActions();
  updatePlayIndicators();
}

function updatePlayIndicators() {
  document.querySelectorAll("[data-play]").forEach(node => {
    const active = node.dataset.play === state.current.title && node.dataset.artist === state.current.artist;
    if (node.matches(".row-play,.queue-play,.big-play,.feature-play,.queue-main-play")) {
      node.textContent = active && state.playing ? "Ⅱ" : "▶";
      node.classList.toggle("is-playing", active && state.playing);
      node.setAttribute("aria-label", `${active && state.playing ? "暂停" : "播放"}${node.dataset.play}`);
    }
  });
  $("#playToggle").textContent = state.playing ? "Ⅱ" : "▶";
  $("#playToggle").setAttribute("aria-label", state.playing ? "暂停" : "播放");
}

function setPlaybackState(playing) {
  const nextState = Boolean(playing);
  if (state.playing === nextState) {
    updatePlayIndicators();
    return;
  }
  state.playing = nextState;
  if ($("#featureKicker")) $("#featureKicker").textContent = state.playing ? "正在播放" : "已暂停";
  setProgress(state.playing ? 47 : 0);
  updatePlayIndicators();
}

function sendYouTubeCommand(func, args = []) {
  const player = $("#mediaPlayer");
  if (!player?.contentWindow || !player.src.includes("youtube-nocookie.com")) return false;
  player.contentWindow.postMessage(JSON.stringify({ event: "command", func, args }), "*");
  return true;
}

function sendYouTubeListening() {
  const player = $("#mediaPlayer");
  if (!player?.contentWindow || !player.src.includes("youtube-nocookie.com")) return;
  player.contentWindow.postMessage(JSON.stringify({ event: "listening", id: "mediaPlayer" }), "*");
  sendYouTubeCommand("addEventListener", ["onStateChange"]);
  sendYouTubeCommand("getPlayerState");
  sendYouTubeCommand("getVideoData");
}

function fallbackToBilibili(song, message = "YouTube 7 秒内未开始播放，已切换到 B 站") {
  const source = resolveSongSource(song);
  const player = $("#mediaPlayer");
  if (!source.bvid || !player?.src.includes("youtube-nocookie.com")) return false;
  window.clearTimeout(youtubeStartupFallbackTimer);
  youtubeStartupFallbackTimer = 0;
  playSong(song.title, song.artist, { preserveBatch: true, sourceOverride: "bilibili" });
  announceQueue(`${message} · ${song.title}`);
  return true;
}

function readPlayerState(payload) {
  if (payload?.event === "onStateChange" && typeof payload.info === "number") return payload.info;
  if (payload?.event === "infoDelivery" && typeof payload.info?.playerState === "number") return payload.info.playerState;
  return null;
}

function readPlayerVideoId(payload) {
  return payload?.info?.videoData?.video_id || payload?.info?.videoData?.videoId || "";
}

function updateCurrentSong(song, { recordRecent = true, render = true } = {}) {
  state.current = { ...song };
  if (recordRecent) {
    state.recents = [song.title, ...state.recents.filter(item => item !== song.title)].slice(0, 20);
    cloudStore.save("recent", state.recents);
  }
  $("#nowTitle").textContent = song.title; $("#nowArtist").textContent = song.artist;
  $("#playerTitle").textContent = song.title; $("#playerArtist").textContent = song.artist;
  [$("#nowTitle"), $("#playerTitle")].forEach(node => { node.dataset.play = song.title; node.dataset.artist = song.artist; });
  [$("#nowArtist"), $("#playerArtist")].forEach(node => { node.dataset.artistFilter = song.artist; });
  const queuePlayToggle = $("#queuePlayToggle");
  if (queuePlayToggle) {
    queuePlayToggle.dataset.play = song.title;
    queuePlayToggle.dataset.artist = song.artist;
  }
  $(".mini-heart").dataset.favorite = song.title;
  $("#dialogSong").textContent = song.title; $("#dialogArtist").textContent = song.artist;
  updateFeatureSong(song);
  document.querySelectorAll(".player-cover,.now-card .cover").forEach(node => {
    node.className = `cover ${node.classList.contains("player-cover") ? "player-cover " : ""}${coverClass(song)}`;
    node.textContent = "";
  });
  if (render) {
    renderSongs();
    renderQueue();
    updatePlayIndicators();
  }
}

function syncSongFromEmbeddedPlaylist(videoId, playerState) {
  if (!videoId || !youtubePlaylistEntries.length || youtubeReadyGeneration !== youtubeLoadGeneration) return;
  if (requestedYoutubeId && !requestedYoutubeConfirmed) {
    if (videoId === requestedYoutubeId) requestedYoutubeConfirmed = true;
    return;
  }
  if (playerState !== 1 && playerState !== 3) return;
  const currentIndex = youtubePlaylistEntries.findIndex(entry => songKey(entry.song) === songKey(state.current));
  const laterMatch = youtubePlaylistEntries.findIndex((entry, index) => index > currentIndex && entry.youtubeId === videoId);
  const match = laterMatch >= 0
    ? youtubePlaylistEntries[laterMatch]
    : youtubePlaylistEntries.find(entry => entry.youtubeId === videoId);
  if (!match || songKey(match.song) === songKey(state.current)) return;
  window.clearTimeout(youtubeAdvanceFallbackTimer);
  updateCurrentSong(match.song, { render: false });
  $("#sourceLink").href = `https://www.youtube.com/watch?v=${match.youtubeId}`;
  $("#playerSourceLabel").textContent = "YouTube";
  state.playing = true;
  setProgress(47);
  renderSongs();
  renderQueue();
  updatePlayIndicators();
  announceQueue(`连续播放 · ${match.song.title}`);
}

let autoAdvanceLocked = false;

function playNextQueuedSong({ sourceOverride = "" } = {}) {
  const playbackQueue = getPlaybackQueue();
  const currentIndex = playbackQueue.findIndex(song => songKey(song) === songKey(state.current));
  const next = currentIndex >= 0 ? playbackQueue[currentIndex + 1] : playbackQueue[0];
  if (!next && batchPlaybackKeys.length) batchPlaybackKeys = [];
  if (!next) return false;
  playSong(next.title, next.artist, { preserveBatch: true, sourceOverride });
  announceQueue(`连续播放 · ${next.title}`);
  return true;
}

window.addEventListener("message", event => {
  const player = $("#mediaPlayer");
  if (!player?.contentWindow || event.source !== player.contentWindow) return;
  if (event.origin === "https://player.bilibili.com") {
    if (player.src.includes("player.bilibili.com")) {
      if (event.data === "bilibili:player:ended" || event.data?.event === "ended") {
        if (!playNextQueuedSong()) setPlaybackState(false);
      } else if (event.data === "bilibili:player:error" || event.data?.event === "error" || event.data?.type === "error") {
        announceQueue(`B站播放受限 · ${state.current.title}`);
      }
    }
    return;
  }
  if (!/^https:\/\/(www\.)?(youtube(?:-nocookie)?\.com)$/.test(event.origin)) return;
  let payload = event.data;
  if (typeof payload === "string") {
    try { payload = JSON.parse(payload); } catch { return; }
  }
  const playerState = readPlayerState(payload);
  syncSongFromEmbeddedPlaylist(readPlayerVideoId(payload), playerState);
  if (playerState === 1 || playerState === 3) {
    if (playerState === 1) {
      window.clearTimeout(youtubeStartupFallbackTimer);
      youtubeStartupFallbackTimer = 0;
    }
    window.clearTimeout(youtubeAdvanceFallbackTimer);
    setPlaybackState(true);
  }
  if (payload?.event === "onError" || payload?.event === "error") {
    fallbackToBilibili(state.current, "YouTube 播放受限，已切换到 B 站");
    return;
  }
  if (playerState === 0) {
    if (autoAdvanceLocked) return;
    autoAdvanceLocked = true;
    const embeddedIndex = youtubePlaylistEntries.findIndex(entry => songKey(entry.song) === songKey(state.current));
    if (embeddedIndex >= 0 && embeddedIndex < youtubePlaylistEntries.length - 1) {
      const endedSongKey = songKey(state.current);
      window.clearTimeout(youtubeAdvanceFallbackTimer);
      youtubeAdvanceFallbackTimer = window.setTimeout(() => {
        if (songKey(state.current) !== endedSongKey) return;
        youtubePlaylistEntries = [];
        if (!playNextQueuedSong()) setPlaybackState(false);
      }, 2500);
      window.setTimeout(() => { autoAdvanceLocked = false; }, 1200);
      return;
    }
    if (!playNextQueuedSong()) setPlaybackState(false);
    window.setTimeout(() => { autoAdvanceLocked = false; }, 1200);
    return;
  }
  if (playerState === 2 || playerState === 5) setPlaybackState(false);
});

$("#mediaPlayer").addEventListener("load", () => {
  youtubeReadyGeneration = Number($("#mediaPlayer").dataset.loadGeneration || 0);
  [0, 250, 800].forEach(delay => window.setTimeout(sendYouTubeListening, delay));
});
$("#mediaPlayer").addEventListener("error", () => {
  const player = $("#mediaPlayer");
  if (player.src.includes("youtube-nocookie.com")) fallbackToBilibili(state.current, "YouTube 播放受限，已切换到 B 站");
});
window.addEventListener("pageshow", () => window.setTimeout(sendYouTubeListening, 100));
document.addEventListener("visibilitychange", sendYouTubeListening);

function playSong(title, artist, { preserveBatch = false, sourceOverride = "" } = {}) {
  const song = songs.find(item => item.title === title && (!artist || item.artist === artist)) || songs.find(item => item.title === title) || state.current;
  if (!preserveBatch) batchPlaybackKeys = [];
  window.clearTimeout(youtubeStartupFallbackTimer);
  youtubeStartupFallbackTimer = 0;
  window.clearTimeout(youtubeAdvanceFallbackTimer);
  const activeSong = { ...song, artist: artist || song.artist };
  updateCurrentSong(activeSong, { render: false });
  const resolvedSource = resolveSongSource(activeSong);
  const source = sourceOverride === "youtube" && resolvedSource.youtubeId
    ? { youtubeId: resolvedSource.youtubeId }
    : sourceOverride === "bilibili" && resolvedSource.bvid
      ? { bvid: resolvedSource.bvid }
      : resolvedSource.youtubeId
        ? { youtubeId: resolvedSource.youtubeId }
    : resolvedSource.bvid
      ? { bvid: resolvedSource.bvid }
      : resolvedSource;
  const mediaPlayer = $("#mediaPlayer");
  const playerShell = mediaPlayer.closest(".media-player-shell");
  youtubeLoadGeneration += 1;
  youtubeReadyGeneration = 0;
  mediaPlayer.dataset.loadGeneration = String(youtubeLoadGeneration);
  if (source.youtubeId) {
    youtubePlaylistEntries = buildYouTubePlaylistEntries(activeSong);
    const playlistIds = youtubePlaylistEntries.map(entry => encodeURIComponent(entry.youtubeId));
    const playlistParameter = playlistIds.length > 1 ? `&playlist=${playlistIds.join(",")}&index=0` : "";
    requestedYoutubeId = String(source.youtubeId);
    requestedYoutubeConfirmed = false;
    mediaPlayer.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(source.youtubeId)}?autoplay=1&rel=0&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(location.origin)}${playlistParameter}`;
    playerShell.classList.add("is-playing");
    $("#sourceLink").href = `https://www.youtube.com/watch?v=${source.youtubeId}`;
    $("#playerSourceLabel").textContent = "YouTube";
    if (resolvedSource.bvid) {
      const fallbackSongKey = songKey(activeSong);
      const loadGeneration = youtubeLoadGeneration;
      youtubeStartupFallbackTimer = window.setTimeout(() => {
        if (youtubeLoadGeneration !== loadGeneration || songKey(state.current) !== fallbackSongKey || !mediaPlayer.src.includes("youtube-nocookie.com")) return;
        fallbackToBilibili(activeSong);
      }, 7000);
    }
  } else if (source.bvid) {
    youtubePlaylistEntries = [];
    requestedYoutubeId = "";
    requestedYoutubeConfirmed = false;
    mediaPlayer.src = `https://player.bilibili.com/player.html?bvid=${encodeURIComponent(source.bvid)}&page=1&autoplay=1&high_quality=1&danmaku=0`;
    playerShell.classList.add("is-playing");
    $("#sourceLink").href = `https://www.bilibili.com/video/${source.bvid}/`;
    $("#playerSourceLabel").textContent = "B站";
  } else {
    youtubePlaylistEntries = [];
    requestedYoutubeId = "";
    requestedYoutubeConfirmed = false;
    mediaPlayer.removeAttribute("src");
    playerShell.classList.remove("is-playing");
    $("#sourceLink").href = song.sourceUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(`${song.artist} ${song.title}`)}`;
  }
  state.playing = Boolean(source.youtubeId || source.bvid);
  if ($("#featureKicker")) $("#featureKicker").textContent = state.playing ? "正在播放" : "等待播放";
  setProgress(state.playing ? 47 : 0); renderSongs(); renderQueue(); updatePlayIndicators();
}

function togglePlayback() {
  const player = $("#mediaPlayer");
  if (!player.src) { playSong(state.current.title, state.current.artist); return; }
  if (player.src.includes("youtube-nocookie.com")) {
    sendYouTubeCommand(state.playing ? "pauseVideo" : "playVideo");
    setPlaybackState(!state.playing);
    return;
  }
  if (state.playing) {
    player.dataset.pausedSrc = player.src;
    player.removeAttribute("src");
    setPlaybackState(false);
  } else {
    player.src = player.dataset.pausedSrc || player.src;
    setPlaybackState(true);
  }
}

async function loadSavedState() {
  const [savedFavorites, savedRecents, savedCustomSongs, savedLibrarySettings, savedPlaylist] = await Promise.all([
    cloudStore.load("favorites", []), cloudStore.load("recent", []), cloudStore.load("customSongs", []),
    cloudStore.load("librarySettings", { categories: {}, deleted: [] }),
    cloudStore.load("playlist", null),
  ]);
  state.favorites = new Set(savedFavorites);
  state.recents = savedRecents;
  customSongs = (Array.isArray(savedCustomSongs) ? savedCustomSongs : []).map(normalizeCustomSong).filter(Boolean);
  categoryOverrides = savedLibrarySettings?.categories && typeof savedLibrarySettings.categories === "object"
    ? savedLibrarySettings.categories
    : {};
  lyricsOverrides = savedLibrarySettings?.lyrics && typeof savedLibrarySettings.lyrics === "object"
    ? savedLibrarySettings.lyrics
    : {};
  deletedCatalogKeys = new Set(Array.isArray(savedLibrarySettings?.deleted) ? savedLibrarySettings.deleted : []);
  rebuildSongs();
  if (state.current) updateCurrentSong(state.current, { recordRecent: false, render: false });
  if (Array.isArray(savedPlaylist)) {
    const restoredQueue = savedPlaylist
      .map(key => songs.find(song => songKey(song) === key))
      .filter(Boolean);
    queue.splice(0, queue.length, ...restoredQueue);
  }
  renderSongs();
  renderQueue();
  if (state.favorites.size) $(".nav-dot").hidden = false;
  const account = cloudStore.account || "";
  $("#accountName").textContent = account || "共享主站账号";
  $("#accountAvatar").textContent = account ? account.slice(0, 1).toUpperCase() : "恩";
  $("#syncStatus").textContent = cloudStore.userId ? "已登录 · 收藏、播放列表与分类已同步" : "未登录 · 使用主站账号登录";
}

function openSongEditor(song = null) {
  editingCustomSongId = song?.id || null;
  songEditorReturnView = state.viewMode === "library" ? "library" : "mine";
  $("#songForm").reset();
  $("#songDialogTitle").textContent = song ? "编辑我的歌曲" : "添加我喜欢的歌曲";
  $("#saveSongButton").textContent = song ? "保存修改" : "保存到我的歌曲";
  $("#songFormError").hidden = true;
  if (song) {
    $("#songSourceUrl").value = song.sourceUrl;
    $("#songTitle").value = song.title;
    $("#songArtist").value = song.artist;
    $("#songAlbum").value = song.album === "我的收藏" ? "" : song.album;
    $("#songDuration").value = song.duration === "--:--" ? "" : song.duration;
    document.querySelectorAll('#songForm input[name="moods"]').forEach(input => { input.checked = song.moods.includes(input.value); });
  }
  $("#songDialog").showModal();
}

async function saveCustomSongs() {
  await cloudStore.save("customSongs", customSongs.map(({ id, title, artist, album, duration, moods, cover, sourceUrl, createdAt }) => ({ id, title, artist, album, duration, moods, cover, sourceUrl, createdAt })));
}

async function submitSongForm(event) {
  event.preventDefault();
  const sourceUrl = $("#songSourceUrl").value.trim();
  const source = extractPlayableSource(sourceUrl);
  const error = $("#songFormError");
  if (!source) {
    error.textContent = "暂时无法识别这个链接，请粘贴具体的 YouTube 或 B站视频页面链接。";
    error.hidden = false;
    return;
  }
  const moods = [...document.querySelectorAll('#songForm input[name="moods"]:checked')].map(input => input.value);
  const draft = normalizeCustomSong({
    id: editingCustomSongId || undefined,
    title: $("#songTitle").value,
    artist: $("#songArtist").value,
    album: $("#songAlbum").value,
    duration: $("#songDuration").value,
    moods: moods.length ? moods : ["温暖治愈"], sourceUrl,
    createdAt: customSongs.find(song => song.id === editingCustomSongId)?.createdAt,
  });
  const duplicate = songs.find(song => song.title === draft.title && song.artist === draft.artist && song.id !== editingCustomSongId);
  if (duplicate) {
    error.textContent = "这位歌手的同名歌曲已经在曲库中。你可以编辑已有歌曲，或调整名称以区分版本。";
    error.hidden = false;
    return;
  }
  const existingIndex = customSongs.findIndex(song => song.id === editingCustomSongId);
  if (existingIndex >= 0) customSongs.splice(existingIndex, 1, draft);
  else customSongs.unshift(draft);
  rebuildSongs();
  await saveCustomSongs();
  state.viewMode = songEditorReturnView;
  state.mood = "";
  state.query = "";
  $("#searchInput").value = "";
  $("#listTitle").textContent = state.viewMode === "library" ? "全部歌单" : "我的歌曲";
  document.querySelectorAll(".side-link").forEach(node => node.classList.toggle("active", node.dataset.nav === state.viewMode));
  document.querySelectorAll(".mood").forEach(node => node.classList.remove("active"));
  $("#songDialog").close();
  renderSongs();
}

async function deleteCustomSong(id) {
  const song = customSongs.find(item => item.id === id);
  if (!song || !window.confirm(`确定从“我的歌曲”中删除《${song.title}》吗？`)) return;
  const deletingKey = songKey(song);
  const deletingCurrent = state.current?.id === id;
  customSongs = customSongs.filter(item => item.id !== id);
  delete lyricsOverrides[deletingKey];
  rebuildSongs();
  for (let index = queue.length - 1; index >= 0; index -= 1) if (queue[index].id === id) queue.splice(index, 1);
  if (deletingCurrent) {
    state.playing = false;
    $("#mediaPlayer").removeAttribute("src");
    $("#mediaPlayer").closest(".media-player-shell").classList.remove("is-playing");
  }
  await saveCustomSongs();
  await saveLibrarySettings();
  renderSongs();
  renderQueue();
}

function openCategoryEditor(key) {
  const song = songs.find(item => songKey(item) === key);
  if (!song) return;
  editingCategorySongKey = key;
  $("#categorySongTitle").textContent = `修改《${song.title}》分类`;
  $("#categorySongArtist").textContent = song.artist;
  $("#categoryFormError").hidden = true;
  document.querySelectorAll('#categoryForm input[name="categoryMoods"]').forEach(input => {
    input.checked = song.moods.includes(input.value);
  });
  $("#categoryDialog").showModal();
}

async function submitCategoryForm(event) {
  event.preventDefault();
  const moods = [...document.querySelectorAll('#categoryForm input[name="categoryMoods"]:checked')]
    .map(input => input.value)
    .filter(mood => PRIMARY_MOODS.includes(mood));
  if (!moods.length) {
    $("#categoryFormError").textContent = "请至少选择一个歌曲分类。";
    $("#categoryFormError").hidden = false;
    return;
  }
  const song = songs.find(item => songKey(item) === editingCategorySongKey);
  if (!song) return;
  if (song.isCustom) {
    const index = customSongs.findIndex(item => item.id === song.id);
    if (index >= 0) customSongs.splice(index, 1, { ...customSongs[index], moods, theme: moods.join(" · ") });
    await saveCustomSongs();
  } else {
    categoryOverrides[editingCategorySongKey] = moods;
    await saveLibrarySettings();
  }
  rebuildSongs();
  $("#categoryDialog").close();
  renderSongs();
  renderQueue();
}

function setLyricsEditing(editing) {
  $("#lyricsForm").hidden = !editing;
  $("#dialogLyrics").hidden = editing;
  $(".dialog-lyrics-actions").hidden = editing;
  if (editing) {
    $("#lyricsInput").value = getSongLyrics(state.current);
    window.setTimeout(() => $("#lyricsInput").focus(), 0);
  }
}

function openLyricsDialog(editing = false) {
  if (!state.current) return;
  $("#dialogSong").textContent = state.current.title;
  $("#dialogArtist").textContent = state.current.artist;
  renderLyrics(state.current);
  setLyricsEditing(editing);
  if (!$("#lyricsDialog").open) $("#lyricsDialog").showModal();
}

async function submitLyricsForm(event) {
  event.preventDefault();
  if (!state.current) return;
  const key = songKey(state.current);
  const lyrics = $("#lyricsInput").value.replace(/\r\n/g, "\n").trim();
  if (lyrics) lyricsOverrides[key] = lyrics;
  else delete lyricsOverrides[key];
  await saveLibrarySettings();
  renderLyrics(state.current);
  setLyricsEditing(false);
}

async function deleteLibrarySong(key) {
  const song = songs.find(item => songKey(item) === key);
  if (!song || !window.confirm(`确定从“全部歌单”中删除《${song.title}》吗？`)) return;
  const deletingCurrent = songKey(state.current) === key;
  if (song.isCustom) {
    customSongs = customSongs.filter(item => item.id !== song.id);
    await saveCustomSongs();
  } else {
    deletedCatalogKeys.add(key);
    delete categoryOverrides[key];
  }
  delete lyricsOverrides[key];
  await saveLibrarySettings();
  rebuildSongs();
  if (deletingCurrent) {
    state.playing = false;
    $("#mediaPlayer").removeAttribute("src");
    $("#mediaPlayer").closest(".media-player-shell").classList.remove("is-playing");
  }
  renderSongs();
  renderQueue();
}

function updateListTitle() {
  if (state.viewMode === "artist" && state.artist) {
    $("#listTitle").textContent = `${state.artist} · ${state.mood || "全部曲目"}`;
    $("#clearFilter").textContent = "清除歌手筛选 ←";
    return;
  }
  const titles = {
    discover: "为你精选", picked: "为你精选", artists: "歌手合集", singles: "经典单曲",
    favorites: "我的收藏", recent: "最近播放", mine: "我的歌曲", library: "全部歌单", all: "全部歌曲",
  };
  const baseTitle = titles[state.viewMode] || "为你精选";
  $("#listTitle").textContent = state.mood ? `${baseTitle} · ${state.mood}` : baseTitle;
  $("#clearFilter").textContent = state.mood ? "清除分类筛选 ×" : "查看全部 →";
}

document.addEventListener("click", event => {
  const play = event.target.closest("[data-play]");
  if (play) {
    const active = play.dataset.play === state.current.title && play.dataset.artist === state.current.artist;
    active ? togglePlayback() : playSong(play.dataset.play, play.dataset.artist);
  }
  const fav = event.target.closest("[data-favorite]");
  if (fav) { const title = fav.dataset.favorite; state.favorites.has(title) ? state.favorites.delete(title) : state.favorites.add(title); cloudStore.save("favorites", [...state.favorites]); $(".nav-dot").hidden = state.favorites.size === 0; renderSongs(); }
  const addToQueue = event.target.closest("[data-add-to-queue]");
  if (addToQueue) {
    const song = songs.find(item => songKey(item) === addToQueue.dataset.addToQueue);
    if (song) addSongsToQueue([song], `《${song.title}》`);
  }
  const addArtistQueue = event.target.closest("[data-add-artist-queue]");
  if (addArtistQueue) {
    const artist = addArtistQueue.dataset.addArtistQueue;
    const artistSongs = songs.filter(song => song.artist === artist);
    if (artistSongs.length) {
      addSongsToQueue(artistSongs, `“${artist}”专辑`);
      batchPlaybackKeys = artistSongs.map(songKey);
      const firstSong = artistSongs[0];
      playSong(firstSong.title, firstSong.artist, { preserveBatch: true });
      announceQueue(`已加入“${artist}”并开始连续播放 · ${artistSongs.length} 首`);
    }
  }
  const queueSelect = event.target.closest("[data-queue-select]");
  if (queueSelect) {
    const key = queueSelect.dataset.queueSelect;
    selectedQueueKeys.has(key) ? selectedQueueKeys.delete(key) : selectedQueueKeys.add(key);
    renderQueue();
  }
  const queueRemove = event.target.closest("[data-remove-from-queue]");
  if (queueRemove) {
    const key = queueRemove.dataset.removeFromQueue;
    const song = queue.find(item => songKey(item) === key);
    if (song) removeQueueSongs([key], `已从播放列表删除《${song.title}》`);
  }
  const mood = event.target.closest("[data-mood]");
  if (mood) {
    state.mood = state.mood === mood.dataset.mood ? "" : mood.dataset.mood;
    if (!["artist", "library", "singles", "favorites", "recent", "mine", "artists"].includes(state.viewMode)) state.viewMode = "discover";
    document.querySelectorAll(".mood").forEach(node => node.classList.toggle("active", node.dataset.mood === state.mood));
    updateListTitle();
    renderSongs();
  }
  const nav = event.target.closest("[data-nav]");
  if (nav) {
    state.viewMode = nav.dataset.nav;
    state.artist = "";
    state.mood = "";
    state.query = "";
    $("#searchInput").value = "";
    document.querySelectorAll(".mood").forEach(node => node.classList.remove("active"));
    updateListTitle();
    document.querySelectorAll(".side-link").forEach(node => node.classList.toggle("active", node === nav));
    $(".sidebar").classList.remove("open");
    renderSongs();
  }
  const artist = event.target.closest("[data-artist-filter]");
  if (artist && !play) {
    state.viewMode = "artist";
    state.artist = artist.dataset.artistFilter;
    state.query = "";
    $("#searchInput").value = "";
    updateListTitle();
    document.querySelectorAll(".side-link").forEach(node => node.classList.toggle("active", node.dataset.nav === "artists"));
    renderSongs();
  }
  const skip = event.target.closest("[data-skip]");
  if (skip) {
    const pool = getPlaybackQueue();
    const foundIndex = pool.findIndex(song => song.title === state.current.title && song.artist === state.current.artist);
    const delta = skip.dataset.skip === "prev" ? -1 : 1;
    const currentIndex = foundIndex >= 0 ? foundIndex : (delta > 0 ? -1 : 0);
    const next = pool[(currentIndex + delta + pool.length) % pool.length];
    playSong(next.title, next.artist, { preserveBatch: batchPlaybackKeys.length > 0 });
  }
  const editSong = event.target.closest("[data-edit-song]");
  if (editSong) openSongEditor(customSongs.find(song => song.id === editSong.dataset.editSong));
  const deleteSong = event.target.closest("[data-delete-song]");
  if (deleteSong) deleteCustomSong(deleteSong.dataset.deleteSong);
  const editCategories = event.target.closest("[data-edit-categories]");
  if (editCategories) openCategoryEditor(editCategories.dataset.editCategories);
  const deleteLibrary = event.target.closest("[data-delete-library]");
  if (deleteLibrary) deleteLibrarySong(deleteLibrary.dataset.deleteLibrary);
});

const themeToggle = $("#themeToggle");
const applyTheme = (theme, persist = true) => {
  const dark = theme === "dark";
  if (dark) document.documentElement.dataset.theme = "dark";
  else delete document.documentElement.dataset.theme;
  themeToggle.setAttribute("aria-pressed", String(dark));
  themeToggle.setAttribute("aria-label", dark ? "切换到浅色皮肤" : "切换到深色皮肤");
  themeToggle.querySelector("span").textContent = dark ? "☼" : "◐";
  themeToggle.querySelector("b").textContent = dark ? "浅色" : "深色";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#101b1e" : "#f4ede2");
  if (persist) {
    try { localStorage.setItem("worship:theme", dark ? "dark" : "light"); } catch { /* 浏览器可能禁用本地存储。 */ }
  }
};
applyTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light", false);
themeToggle.addEventListener("click", () => applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));

$("#searchInput").addEventListener("input", event => {
  state.query = event.target.value;
  if (state.query) $("#listTitle").textContent = state.viewMode === "artists" ? `查找歌手：${state.query}` : `搜索：${state.query}`;
  else updateListTitle();
  renderSongs();
});
$("#clearFilter").addEventListener("click", () => {
  state.query = "";
  $("#searchInput").value = "";
  if (state.viewMode === "artist") {
    state.viewMode = "discover";
    state.artist = "";
    document.querySelectorAll(".side-link").forEach(node => node.classList.toggle("active", node.dataset.nav === "discover"));
  } else if (state.mood) {
    state.mood = "";
  } else if (state.viewMode !== "library") {
    state.viewMode = "all";
  }
  document.querySelectorAll(".mood").forEach(node => node.classList.toggle("active", node.dataset.mood === state.mood));
  updateListTitle();
  renderSongs();
});
$("#randomButton").addEventListener("click", () => { const song = songs[Math.floor(Math.random() * songs.length)]; playSong(song.title, song.artist); });
$("#addSongButton").addEventListener("click", () => openSongEditor());
$("#libraryAddButton").addEventListener("click", () => openSongEditor());
$("#songForm").addEventListener("submit", submitSongForm);
$("#closeSongDialog").addEventListener("click", () => $("#songDialog").close());
$("#cancelSongEdit").addEventListener("click", () => $("#songDialog").close());
$("#categoryForm").addEventListener("submit", submitCategoryForm);
$("#closeCategoryDialog").addEventListener("click", () => $("#categoryDialog").close());
$("#cancelCategoryEdit").addEventListener("click", () => $("#categoryDialog").close());
$("#playToggle").addEventListener("click", togglePlayback);
$("#lyricsButton").addEventListener("click", () => openLyricsDialog(false));
$("#lyricsButtonBottom").addEventListener("click", () => openLyricsDialog(false));
$("#editLyricsButton").addEventListener("click", () => setLyricsEditing(true));
$("#lyricsForm").addEventListener("submit", submitLyricsForm);
$("#cancelLyricsEdit").addEventListener("click", () => setLyricsEditing(false));
$("#closeDialog").addEventListener("click", () => {
  setLyricsEditing(false);
  $("#lyricsDialog").close();
});
$("#clearQueue").addEventListener("click", () => {
  if (!queue.length || !window.confirm(`确定清理播放列表中的 ${queue.length} 首歌曲吗？`)) return;
  queue.splice(0);
  selectedQueueKeys = new Set();
  batchPlaybackKeys = [];
  queueSelectionMode = false;
  savePlaylist();
  renderQueue();
  announceQueue("播放列表已清理");
});
$("#addQueue").addEventListener("click", () => addSongsToQueue(getVisibleSongs(), "当前歌曲列表"));
$("#queueTitle").addEventListener("dblclick", () => setQueueSelectionMode(!queueSelectionMode));
$("#queueTitle").addEventListener("keydown", event => {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  setQueueSelectionMode(!queueSelectionMode);
});
$("#queueSelectAll").addEventListener("click", () => {
  selectedQueueKeys = selectedQueueKeys.size === queue.length
    ? new Set()
    : new Set(queue.map(songKey));
  renderQueue();
});
$("#queuePlaySelected").addEventListener("click", () => {
  const selectedSongs = queue.filter(song => selectedQueueKeys.has(songKey(song)));
  if (!selectedSongs.length) return;
  batchPlaybackKeys = selectedSongs.map(songKey);
  const first = selectedSongs[0];
  setQueueSelectionMode(false);
  batchPlaybackKeys = selectedSongs.map(songKey);
  playSong(first.title, first.artist, { preserveBatch: true });
  announceQueue(`开始播放所选歌曲 · ${selectedSongs.length} 首`);
});
$("#queueDeleteSelected").addEventListener("click", () => {
  if (!selectedQueueKeys.size || !window.confirm(`确定从播放列表删除选中的 ${selectedQueueKeys.size} 首歌曲吗？`)) return;
  const count = selectedQueueKeys.size;
  removeQueueSongs([...selectedQueueKeys], `已删除所选歌曲 · ${count} 首`);
});
$("#queueCancelSelection").addEventListener("click", () => setQueueSelectionMode(false));
$("#mobileMenu").addEventListener("click", () => $(".sidebar").classList.toggle("open"));
$("#fullscreenPlayer").addEventListener("click", () => $(".media-player-shell").requestFullscreen?.());

renderSongs(); renderQueue(); loadSavedState();
}
