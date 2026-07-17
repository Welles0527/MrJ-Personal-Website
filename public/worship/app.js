const cloudStore = window.worshipCloudStore || {
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

const songs = window.worshipCatalog?.length ? window.worshipCatalog : featuredSongs;
const sourceMap = window.worshipSources || {};
const queue = [...songs.slice(0, 12)];
const state = { mood: "全部", query: "", viewMode: "discover", artist: "", current: songs[0], playing: false, favorites: new Set(), recents: [] };
const $ = selector => document.querySelector(selector);
const coverClass = song => `cover-${song.cover || "sun"}`;
const isCurrent = song => state.current?.title === song.title && state.current?.artist === song.artist;

function getFilteredSongs() {
  const query = state.query.trim().toLowerCase();
  return songs.filter(song => {
    const moodMatch = state.mood === "全部" || song.moods.includes(state.mood) || song.theme.includes(state.mood);
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
  if (state.viewMode === "favorites") return filtered.filter(song => state.favorites.has(song.title));
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
  if (state.viewMode === "artists") {
    renderArtists();
    return;
  }
  const list = getVisibleSongs();
  $("#artistList").hidden = true;
  $("#songList").hidden = false;
  $("#songList").classList.remove("artist-grid");
  $("#songList").innerHTML = list.map((song, index) => `
    <article class="song-row ${isCurrent(song) ? "is-current" : ""}">
      <span class="track-num">${String(song.rank ?? index + 1).padStart(2, "0")}</span>
      <div class="row-cover cover ${coverClass(song)}">${song.title.slice(0, 4)}</div>
      <div class="song-name"><button type="button" class="song-title-button" data-play="${song.title}" data-artist="${song.artist}">${song.title}</button><small>${song.album}</small></div>
      <button type="button" class="artist" data-artist-filter="${song.artist}">${song.artist}</button>
      <div class="tags">${song.moods.slice(0, 2).map(mood => `<span>${mood}</span>`).join("")}</div>
      <span class="duration">${song.duration}</span>
      <button class="row-fav ${state.favorites.has(song.title) ? "filled" : ""}" data-favorite="${song.title}" aria-label="收藏${song.title}">${state.favorites.has(song.title) ? "♥" : "♡"}</button>
      <button class="row-play ${isCurrent(song) && state.playing ? "is-playing" : ""}" data-play="${song.title}" data-artist="${song.artist}" aria-label="${isCurrent(song) && state.playing ? "暂停" : "播放"}${song.title}">${isCurrent(song) && state.playing ? "Ⅱ" : "▶"}</button>
    </article>`).join("");
  $("#emptyState").hidden = list.length > 0;
  updatePlayIndicators();
}

function renderArtists() {
  const query = state.query.trim().toLowerCase();
  const artists = [...new Set(songs.filter(song => song.kind !== "单曲").map(song => song.artist))]
    .filter(artist => artist.toLowerCase().includes(query));
  $("#songList").hidden = true;
  $("#artistList").hidden = false;
  $("#artistList").innerHTML = artists.map((artist, index) => {
    const artistSongs = songs.filter(song => song.artist === artist);
    const sample = artistSongs[0];
    return `<button type="button" class="artist-card" data-artist-filter="${artist}">
      <span class="artist-card-number">${String(index + 1).padStart(2, "0")}</span>
      <span class="artist-card-cover cover ${coverClass(sample)}">${artist.slice(0, 4)}</span>
      <span><strong>${artist}</strong><small>${artistSongs.length} 首曲目 · 点击查看全部</small></span>
      <i>↗</i>
    </button>`;
  }).join("");
  $("#emptyState").hidden = artists.length > 0;
}

function renderQueue() {
  $("#queueList").innerHTML = queue.map(song => `<div class="queue-item ${isCurrent(song) ? "current" : ""}"><span class="drag">⋮⋮</span><div class="cover ${coverClass(song)}">${song.title.slice(0, 2)}</div><div><button type="button" class="queue-song-title" data-play="${song.title}" data-artist="${song.artist}">${song.title}</button><button type="button" class="queue-artist" data-artist-filter="${song.artist}">${song.artist}</button></div><button class="queue-play ${isCurrent(song) && state.playing ? "is-playing" : ""}" data-play="${song.title}" data-artist="${song.artist}" aria-label="${isCurrent(song) && state.playing ? "暂停" : "播放"}${song.title}">${isCurrent(song) && state.playing ? "Ⅱ" : "▶"}</button></div>`).join("");
  $("#queueCount").textContent = queue.length;
  updatePlayIndicators();
}

function updatePlayIndicators() {
  document.querySelectorAll("[data-play]").forEach(node => {
    const active = node.dataset.play === state.current.title && node.dataset.artist === state.current.artist;
    if (node.matches(".row-play,.queue-play,.big-play,.feature-play")) {
      node.textContent = active && state.playing ? "Ⅱ" : "▶";
      node.classList.toggle("is-playing", active && state.playing);
      node.setAttribute("aria-label", `${active && state.playing ? "暂停" : "播放"}${node.dataset.play}`);
    }
  });
  $("#playToggle").textContent = state.playing ? "Ⅱ" : "▶";
  $("#playToggle").setAttribute("aria-label", state.playing ? "暂停" : "播放");
}

function playSong(title, artist) {
  const song = songs.find(item => item.title === title && (!artist || item.artist === artist)) || songs.find(item => item.title === title) || state.current;
  state.current = { ...song, artist: artist || song.artist };
  state.recents = [song.title, ...state.recents.filter(item => item !== song.title)].slice(0, 20);
  cloudStore.save("recent", state.recents);
  $("#nowTitle").textContent = song.title; $("#nowArtist").textContent = song.artist;
  $("#playerTitle").textContent = song.title; $("#playerArtist").textContent = song.artist;
  [$("#nowTitle"), $("#playerTitle")].forEach(node => { node.dataset.play = song.title; node.dataset.artist = song.artist; });
  [$("#nowArtist"), $("#playerArtist")].forEach(node => { node.dataset.artistFilter = song.artist; });
  $(".mini-heart").dataset.favorite = song.title;
  $("#dialogSong").textContent = song.title; $("#dialogArtist").textContent = song.artist;
  const source = sourceMap[`${song.artist}::${song.title}`] || {};
  const mediaPlayer = $("#mediaPlayer");
  const playerShell = mediaPlayer.closest(".media-player-shell");
  if (source.youtubeId) {
    mediaPlayer.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(source.youtubeId)}?autoplay=1&rel=0&playsinline=1`;
    playerShell.classList.add("is-playing");
    $("#sourceLink").href = `https://www.youtube.com/watch?v=${source.youtubeId}`;
    $("#playerSourceLabel").textContent = "YouTube";
  } else if (source.bvid) {
    mediaPlayer.src = `https://player.bilibili.com/player.html?bvid=${encodeURIComponent(source.bvid)}&page=1&autoplay=1&high_quality=1&danmaku=0`;
    playerShell.classList.add("is-playing");
    $("#sourceLink").href = `https://www.bilibili.com/video/${source.bvid}/`;
    $("#playerSourceLabel").textContent = "B站";
  } else {
    mediaPlayer.removeAttribute("src");
    playerShell.classList.remove("is-playing");
    $("#sourceLink").href = song.sourceUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(`${song.artist} ${song.title}`)}`;
  }
  document.querySelectorAll(".player-cover,.now-card .cover").forEach(node => { node.className = `cover ${coverClass(song)}`; node.textContent = song.title.slice(0, 4); });
  state.playing = Boolean(source.youtubeId || source.bvid); setProgress(state.playing ? 47 : 0); renderSongs(); renderQueue(); updatePlayIndicators();
}

function togglePlayback() {
  const player = $("#mediaPlayer");
  if (!player.src) { playSong(state.current.title, state.current.artist); return; }
  if (state.playing) {
    player.dataset.pausedSrc = player.src;
    player.removeAttribute("src");
    state.playing = false;
  } else {
    player.src = player.dataset.pausedSrc || player.src;
    state.playing = true;
  }
  setProgress(state.playing ? 47 : 0);
  renderSongs(); renderQueue(); updatePlayIndicators();
}

async function loadSavedState() {
  state.favorites = new Set(await cloudStore.load("favorites", []));
  state.recents = await cloudStore.load("recent", []);
  renderSongs();
  if (state.favorites.size) $(".nav-dot").hidden = false;
  const account = cloudStore.account || "";
  $("#accountName").textContent = account || "共享主站账号";
  $("#accountAvatar").textContent = account ? account.slice(0, 1).toUpperCase() : "恩";
  $("#syncStatus").textContent = cloudStore.userId ? "已登录 · 收藏与最近播放已同步" : "未登录 · 使用主站账号登录";
}

document.addEventListener("click", event => {
  const play = event.target.closest("[data-play]");
  if (play) {
    const active = play.dataset.play === state.current.title && play.dataset.artist === state.current.artist;
    active ? togglePlayback() : playSong(play.dataset.play, play.dataset.artist);
  }
  const fav = event.target.closest("[data-favorite]");
  if (fav) { const title = fav.dataset.favorite; state.favorites.has(title) ? state.favorites.delete(title) : state.favorites.add(title); cloudStore.save("favorites", [...state.favorites]); $(".nav-dot").hidden = state.favorites.size === 0; renderSongs(); }
  const mood = event.target.closest("[data-mood]");
  if (mood) { state.mood = mood.dataset.mood; state.viewMode = "discover"; state.artist = ""; $("#clearFilter").textContent = "查看全部 →"; document.querySelectorAll(".mood").forEach(node => node.classList.toggle("active", node === mood)); document.querySelectorAll(".side-link").forEach(node => node.classList.toggle("active", node.dataset.nav === "discover")); $("#listTitle").textContent = state.mood === "全部" ? "为你精选" : state.mood; renderSongs(); }
  const nav = event.target.closest("[data-nav]");
  if (nav) {
    state.viewMode = nav.dataset.nav;
    state.artist = "";
    state.query = "";
    $("#searchInput").value = "";
    $("#clearFilter").textContent = "查看全部 →";
    const titles = { discover: "为你精选", picked: "为你精选", artists: "歌手合集", singles: "经典单曲", favorites: "我的收藏", recent: "最近播放" };
    $("#listTitle").textContent = titles[state.viewMode] || "为你精选";
    document.querySelectorAll(".side-link").forEach(node => node.classList.toggle("active", node === nav));
    renderSongs();
  }
  const artist = event.target.closest("[data-artist-filter]");
  if (artist && !play) {
    state.viewMode = "artist";
    state.artist = artist.dataset.artistFilter;
    state.query = "";
    $("#searchInput").value = "";
    $("#listTitle").textContent = `${state.artist} · 全部曲目`;
    $("#clearFilter").textContent = "返回歌手合集 ←";
    document.querySelectorAll(".side-link").forEach(node => node.classList.toggle("active", node.dataset.nav === "artists"));
    renderSongs();
  }
  const skip = event.target.closest("[data-skip]");
  if (skip) {
    const pool = queue.length ? queue : songs;
    const currentIndex = Math.max(0, pool.findIndex(song => song.title === state.current.title && song.artist === state.current.artist));
    const delta = skip.dataset.skip === "prev" ? -1 : 1;
    const next = pool[(currentIndex + delta + pool.length) % pool.length];
    playSong(next.title, next.artist);
  }
});

$("#searchInput").addEventListener("input", event => { state.query = event.target.value; $("#listTitle").textContent = state.viewMode === "artists" ? (state.query ? `查找歌手：${state.query}` : "歌手合集") : (state.query ? `搜索：${state.query}` : "为你精选"); renderSongs(); });
$("#clearFilter").addEventListener("click", () => {
  state.mood = "全部"; state.query = ""; $("#searchInput").value = "";
  if (state.viewMode === "artist") { state.viewMode = "artists"; state.artist = ""; $("#listTitle").textContent = "歌手合集"; }
  else { state.viewMode = "all"; $("#listTitle").textContent = "全部歌曲"; }
  $("#clearFilter").textContent = "查看全部 →";
  document.querySelectorAll(".mood").forEach(node => node.classList.toggle("active", node.dataset.mood === "全部")); renderSongs();
});
$("#randomButton").addEventListener("click", () => { const song = songs[Math.floor(Math.random() * songs.length)]; playSong(song.title, song.artist); });
$("#playToggle").addEventListener("click", togglePlayback);
$("#lyricsButton").addEventListener("click", () => $("#lyricsDialog").showModal()); $("#lyricsButtonBottom").addEventListener("click", () => $("#lyricsDialog").showModal()); $("#closeDialog").addEventListener("click", () => $("#lyricsDialog").close());
$("#clearQueue").addEventListener("click", () => { queue.splice(0); renderQueue(); }); $("#addQueue").addEventListener("click", () => { queue.push(...songs.filter(song => !queue.some(item => item.title === song.title)).slice(0, 3)); renderQueue(); });
$("#mobileMenu").addEventListener("click", () => $(".sidebar").classList.toggle("mobile-open"));
$("#fullscreenPlayer").addEventListener("click", () => $(".media-player-shell").requestFullscreen?.());

renderSongs(); renderQueue(); loadSavedState();
