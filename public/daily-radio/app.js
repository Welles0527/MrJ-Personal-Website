"use strict";

(function initializeDailyRadio() {
  const root = document.getElementById("app");
  const data = window.DAILY_RADIO_DATA;
  const components = window.DailyRadioComponents;
  const storageKey = "daily-radio.preferences.v1";
  const speedOptions = [1, 1.25, 1.5, 2];
  const aiBriefingIds = data.briefings.filter(item => item.channel === "ai").map(item => item.id);
  const defaultPlaylistOrder = [
    "finance-1", "stocks-1", aiBriefingIds[0], "faith-1", "sports-1",
    "finance-2", "stocks-2", aiBriefingIds[1], "faith-2", "sports-2",
    "finance-3", "stocks-3", ...aiBriefingIds.slice(2)
  ].filter(Boolean);
  const saved = loadPreferences();

  function migratePlaylistOrder(order) {
    if (!Array.isArray(order)) return defaultPlaylistOrder;
    const migrated = order.map(id => id === "ai-1" ? aiBriefingIds[0] : id === "ai-2" ? aiBriefingIds[1] : id);
    const available = new Set(data.briefings.map(item => item.id));
    const resolved = migrated.filter((id, index) => id && available.has(id) && migrated.indexOf(id) === index);
    defaultPlaylistOrder.forEach(id => { if (!resolved.includes(id)) resolved.push(id); });
    return resolved;
  }

  const state = {
    view: "today",
    theme: saved.theme || "light",
    selectedChannels: saved.selectedChannels || [],
    listenMinutes: saved.listenMinutes || 10,
    voice: saved.voice || "清柔女声",
    updateTime: saved.updateTime || "07:30",
    watchlist: saved.watchlist || [],
    holdings: saved.holdings || [],
    favorites: saved.favorites || [],
    playlistOrder: migratePlaylistOrder(saved.playlistOrder),
    onboardingComplete: Boolean(saved.onboardingComplete),
    onboardingStep: 1,
    draftChannels: saved.selectedChannels || [],
    draftListenMinutes: saved.listenMinutes || 10,
    draftVoice: saved.voice || "清柔女声",
    draftUpdateTime: saved.updateTime || "07:30",
    draftWatchlist: saved.watchlist || [],
    draftHoldings: saved.holdings || [],
    currentId: saved.currentId || "",
    playing: false,
    progress: 0,
    speed: 1,
    focusOnly: false,
    drawerOpen: false,
    drawerId: "",
    toast: "",
    draggedId: ""
  };

  let progressTimer = 0;
  let progressStartedAt = 0;
  let progressStartValue = 0;
  let toastTimer = 0;
  let activeUtterance = null;
  let lastOverlaySignature = "";

  function loadPreferences() {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || "{}");
    } catch (_error) {
      return {};
    }
  }

  function persist() {
    const preferences = {
      theme: state.theme,
      selectedChannels: state.selectedChannels,
      listenMinutes: state.listenMinutes,
      voice: state.voice,
      updateTime: state.updateTime,
      watchlist: state.watchlist,
      holdings: state.holdings,
      favorites: state.favorites,
      playlistOrder: state.playlistOrder,
      onboardingComplete: state.onboardingComplete,
      currentId: state.currentId
    };
    localStorage.setItem(storageKey, JSON.stringify(preferences));
  }

  function selectedBriefings() {
    const selected = data.briefings.filter(item => state.selectedChannels.includes(item.channel));
    const focused = state.focusOnly ? selected.filter(item => item.importance === "重要") : selected;
    const candidates = focused.length ? focused : selected;
    const byId = new Map(candidates.map(item => [item.id, item]));
    const ordered = state.playlistOrder.map(id => byId.get(id)).filter(Boolean);
    candidates.forEach(item => { if (!ordered.some(entry => entry.id === item.id)) ordered.push(item); });
    const limitSeconds = state.listenMinutes * 60;
    let total = 0;
    return ordered.filter((item, index) => {
      if (index === 0) { total += item.durationSeconds; return true; }
      if (total + item.durationSeconds > limitSeconds + 120) return false;
      total += item.durationSeconds;
      return true;
    });
  }

  function ensureCurrent(filtered) {
    if (!filtered.length) {
      state.currentId = "";
      stopPlayback();
      return null;
    }
    let current = filtered.find(item => item.id === state.currentId);
    if (!current) {
      current = filtered[0];
      state.currentId = current.id;
      state.progress = 0;
      stopPlayback(false);
    }
    return current;
  }

  function dateSummary(filtered) {
    const now = new Date();
    const hour = now.getHours();
    const greeting = hour < 12 ? "早上好" : hour < 18 ? "下午好" : "晚上好";
    const dateText = new Intl.DateTimeFormat("zh-CN", {
      month: "long",
      day: "numeric",
      weekday: "long"
    }).format(now);
    const seconds = filtered.reduce((sum, item) => sum + item.durationSeconds, 0);
    return {
      greeting,
      dateText,
      count: filtered.length,
      duration: seconds >= 60 ? `${Math.max(1, Math.round(seconds / 60))} 分钟` : `${seconds} 秒`
    };
  }

  function render() {
    const filtered = selectedBriefings();
    const current = ensureCurrent(filtered);
    const previewCurrent = current || data.briefings[0];
    document.documentElement.style.colorScheme = state.theme;
    document.querySelector('meta[name="theme-color"]').setAttribute("content", state.theme === "dark" ? "#171b29" : "#f4f7ff");
    root.innerHTML = components.shell(state, data, filtered, previewCurrent, dateSummary(filtered));
    const overlaySignature = !state.onboardingComplete
      ? `onboarding-${state.onboardingStep}`
      : state.drawerOpen ? `drawer-${state.drawerId}` : "";
    if (overlaySignature && overlaySignature !== lastOverlaySignature) {
      window.requestAnimationFrame(() => {
        const overlay = root.querySelector(".onboarding, .detail-drawer");
        const focusTarget = overlay?.querySelector("button:not(:disabled), input:not(:disabled), select:not(:disabled)");
        focusTarget?.focus();
      });
    }
    lastOverlaySignature = overlaySignature;
  }

  function updateWaveformProgress(waveformElement, progress) {
    const bars = waveformElement?.querySelectorAll("i");
    if (!bars?.length) return;
    bars.forEach((bar, index) => {
      bar.classList.toggle("is-active", index / bars.length <= progress);
    });
  }

  function updatePlaybackProgress() {
    const percent = Math.round(state.progress * 100);
    const playerWave = root.querySelector(".player-wave");
    if (playerWave) {
      playerWave.setAttribute("aria-label", `播放进度 ${percent}%`);
      updateWaveformProgress(playerWave.querySelector(".waveform"), state.progress);
    }
    updateWaveformProgress(root.querySelector(".mini-wave .waveform"), state.progress);

    const currentProgress = root.querySelector(".current-line > span:last-child");
    if (currentProgress) currentProgress.textContent = `${percent}%`;

    const current = currentBriefing();
    const channel = data.channels.find(item => item.id === current?.channel);
    const miniProgress = root.querySelector(".mini-copy > span");
    if (miniProgress && channel) miniProgress.textContent = `${channel.name} · ${percent}%`;
  }

  function showToast(message) {
    state.toast = message;
    window.clearTimeout(toastTimer);
    render();
    toastTimer = window.setTimeout(() => {
      state.toast = "";
      render();
    }, 2200);
  }

  function currentBriefing() {
    return data.briefings.find(item => item.id === state.currentId) || null;
  }

  function estimatedNarrationSeconds(item) {
    const characterCount = item?.transcript?.length || 80;
    return Math.max(12, characterCount * 0.22 / state.speed);
  }

  function startProgressTimer(item) {
    window.clearInterval(progressTimer);
    progressStartedAt = performance.now();
    progressStartValue = state.progress;
    const duration = estimatedNarrationSeconds(item);
    progressTimer = window.setInterval(() => {
      if (!state.playing) return;
      const elapsed = (performance.now() - progressStartedAt) / 1000;
      state.progress = Math.min(1, progressStartValue + elapsed / duration);
      if (state.progress >= 1) {
        playNext();
      } else {
        updatePlaybackProgress();
      }
    }, 360);
  }

  function preferredVoice() {
    const voices = window.speechSynthesis?.getVoices?.() || [];
    const chinese = voices.filter(voice => /^zh/i.test(voice.lang));
    if (!chinese.length) return null;
    if (state.voice === "沉稳播报") return chinese.find(voice => /male|yunxi|kangkang/i.test(voice.name)) || chinese.at(-1);
    if (state.voice === "清晰快讯") return chinese.find(voice => /xiaoxiao|huihui/i.test(voice.name)) || chinese[0];
    return chinese.find(voice => /female|xiaoyi|huihui/i.test(voice.name)) || chinese[0];
  }

  function speak(item) {
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      showToast("当前浏览器不支持中文语音，将继续模拟播放进度");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(item.transcript);
    utterance.lang = "zh-CN";
    utterance.rate = state.speed * (state.voice === "清晰快讯" ? 1.05 : state.voice === "沉稳播报" ? 0.92 : 0.98);
    utterance.pitch = state.voice === "沉稳播报" ? 0.82 : state.voice === "清柔女声" ? 1.08 : 1;
    const voice = preferredVoice();
    if (voice) utterance.voice = voice;
    utterance.onend = () => {
      if (activeUtterance !== utterance || !state.playing) return;
      state.progress = 1;
      playNext();
    };
    utterance.onerror = event => {
      if (event.error === "canceled" || event.error === "interrupted") return;
      showToast("语音播报暂不可用，正在模拟播放进度");
    };
    activeUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  function playCurrent({ restartSpeech = true } = {}) {
    const item = currentBriefing();
    if (!item) return;
    state.playing = true;
    if (restartSpeech) speak(item);
    startProgressTimer(item);
    persist();
    render();
  }

  function pausePlayback() {
    state.playing = false;
    window.clearInterval(progressTimer);
    if (window.speechSynthesis?.speaking) window.speechSynthesis.pause();
    render();
  }

  function resumePlayback() {
    state.playing = true;
    if (window.speechSynthesis?.paused) {
      window.speechSynthesis.resume();
      startProgressTimer(currentBriefing());
      render();
      return;
    }
    playCurrent();
  }

  function stopPlayback(cancelSpeech = true) {
    state.playing = false;
    window.clearInterval(progressTimer);
    if (cancelSpeech && window.speechSynthesis) window.speechSynthesis.cancel();
    activeUtterance = null;
  }

  function playNext() {
    const filtered = selectedBriefings();
    if (!filtered.length) return;
    const index = filtered.findIndex(item => item.id === state.currentId);
    const next = filtered[(index + 1) % filtered.length];
    stopPlayback();
    state.currentId = next.id;
    state.progress = 0;
    playCurrent();
  }

  function togglePlay() {
    if (state.playing) pausePlayback();
    else if (window.speechSynthesis?.paused) resumePlayback();
    else playCurrent();
  }

  function playItem(id) {
    if (state.currentId === id && state.playing) {
      pausePlayback();
      return;
    }
    stopPlayback();
    state.currentId = id;
    state.progress = 0;
    playCurrent();
  }

  function toggleChannel(id) {
    const selected = state.selectedChannels.includes(id);
    if (selected && state.selectedChannels.length === 1) {
      showToast("请至少保留一个频道");
      return;
    }
    stopPlayback();
    state.selectedChannels = selected
      ? state.selectedChannels.filter(channel => channel !== id)
      : [...state.selectedChannels, id];
    state.progress = 0;
    persist();
    render();
  }

  function movePlaylistItem(id, directionOrTarget) {
    const order = [...state.playlistOrder];
    const visibleOrder = selectedBriefings().map(item => item.id);
    const from = visibleOrder.indexOf(id);
    const to = typeof directionOrTarget === "number"
      ? from + directionOrTarget
      : visibleOrder.indexOf(directionOrTarget);
    if (from < 0 || to < 0 || to >= visibleOrder.length || to === from) return;
    const [moved] = visibleOrder.splice(from, 1);
    visibleOrder.splice(to, 0, moved);
    const visibleSet = new Set(visibleOrder);
    let visibleCursor = 0;
    state.playlistOrder = order.map(itemId => visibleSet.has(itemId) ? visibleOrder[visibleCursor++] : itemId);
    persist();
    render();
  }

  function finishOnboarding() {
    state.selectedChannels = [...state.draftChannels];
    state.listenMinutes = state.draftListenMinutes;
    state.voice = state.draftVoice;
    state.updateTime = state.draftUpdateTime;
    state.watchlist = [...state.draftWatchlist];
    state.holdings = [...state.draftHoldings];
    state.onboardingComplete = true;
    state.onboardingStep = 1;
    state.currentId = "";
    persist();
    showToast("今日听单已生成");
  }

  function onboardingNext() {
    if (state.onboardingStep === 1) {
      if (!state.draftChannels.length) return;
      state.onboardingStep = 2;
      render();
      return;
    }
    if (state.onboardingStep === 2 && state.draftChannels.includes("stocks")) {
      state.onboardingStep = 3;
      render();
      return;
    }
    finishOnboarding();
  }

  function addStock(value, type, draft = false) {
    const normalized = value.trim();
    if (!normalized) return false;
    const baseKey = type === "holdings" ? "holdings" : "watchlist";
    const key = draft ? `draft${baseKey[0].toUpperCase()}${baseKey.slice(1)}` : baseKey;
    if (state[key].some(item => item.toLowerCase() === normalized.toLowerCase())) {
      showToast("这只股票已经添加");
      return false;
    }
    state[key] = [...state[key], normalized];
    if (!draft) persist();
    render();
    return true;
  }

  function removeStock(value, type) {
    const draft = !state.onboardingComplete;
    const baseKey = type === "holdings" ? "holdings" : "watchlist";
    const key = draft ? `draft${baseKey[0].toUpperCase()}${baseKey.slice(1)}` : baseKey;
    state[key] = state[key].filter(item => item !== value);
    if (!draft) persist();
    render();
  }

  function openBrief(id) {
    state.drawerOpen = true;
    state.drawerId = id;
    render();
  }

  function handleAction(button) {
    const action = button.dataset.action;
    if (!action) return;
    if (action === "theme-toggle") {
      state.theme = state.theme === "dark" ? "light" : "dark";
      persist();
      render();
    } else if (action === "toggle-channel") {
      toggleChannel(button.dataset.channel);
    } else if (action === "play-toggle") {
      togglePlay();
    } else if (action === "play-item") {
      state.drawerOpen = false;
      playItem(button.dataset.id);
    } else if (action === "favorite") {
      const id = button.dataset.id;
      state.favorites = state.favorites.includes(id) ? state.favorites.filter(item => item !== id) : [...state.favorites, id];
      persist();
      showToast(state.favorites.includes(id) ? "已加入收藏" : "已取消收藏");
    } else if (action === "open-brief") {
      openBrief(button.dataset.id);
    } else if (action === "open-transcript") {
      openBrief(state.currentId);
    } else if (action === "focus-toggle") {
      stopPlayback();
      state.focusOnly = !state.focusOnly;
      state.currentId = "";
      state.progress = 0;
      render();
    } else if (action === "speed-toggle") {
      const currentIndex = speedOptions.indexOf(state.speed);
      state.speed = speedOptions[(currentIndex + 1) % speedOptions.length];
      if (state.playing) {
        state.progress = 0;
        playCurrent();
      } else render();
    } else if (action === "move-item") {
      movePlaylistItem(button.dataset.id, Number(button.dataset.direction));
    } else if (action === "open-playlist") {
      state.drawerOpen = true;
      state.drawerId = "playlist";
      render();
    } else if (action === "close-drawer") {
      state.drawerOpen = false;
      state.drawerId = "";
      render();
    } else if (action === "onboarding-channel") {
      const id = button.dataset.channel;
      state.draftChannels = state.draftChannels.includes(id) ? state.draftChannels.filter(item => item !== id) : [...state.draftChannels, id];
      render();
    } else if (action === "duration-choice") {
      state.draftListenMinutes = Number(button.dataset.value);
      render();
    } else if (action === "voice-choice") {
      state.draftVoice = button.dataset.value;
      render();
    } else if (action === "onboarding-next") {
      onboardingNext();
    } else if (action === "onboarding-back") {
      state.onboardingStep = Math.max(1, state.onboardingStep - 1);
      render();
    } else if (action === "remove-stock") {
      removeStock(button.dataset.value, button.dataset.type);
    } else if (action === "restart-onboarding") {
      stopPlayback();
      state.draftChannels = [...state.selectedChannels];
      state.draftListenMinutes = state.listenMinutes;
      state.draftVoice = state.voice;
      state.draftUpdateTime = state.updateTime;
      state.draftWatchlist = [...state.watchlist];
      state.draftHoldings = [...state.holdings];
      state.onboardingComplete = false;
      state.onboardingStep = 1;
      render();
    } else if (action === "reset-demo") {
      if (!window.confirm("重置后会清除频道、收藏、自选股和收听偏好。确定继续吗？")) return;
      stopPlayback();
      localStorage.removeItem(storageKey);
      window.location.reload();
    } else if (action === "open-settings") {
      state.view = "profile";
      window.scrollTo({ top: 0, behavior: "smooth" });
      render();
    } else if (action === "share") {
      sharePage();
    }
  }

  async function sharePage() {
    const shareData = { title: "每日简讯电台", text: "把每天值得关注的事，变成一份刚刚好的听单。", url: window.location.href };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(window.location.href);
        showToast("页面链接已复制");
      }
    } catch (error) {
      if (error.name !== "AbortError") showToast("暂时无法分享");
    }
  }

  root.addEventListener("click", event => {
    const viewButton = event.target.closest("[data-view]");
    if (viewButton) {
      state.view = viewButton.dataset.view;
      state.drawerOpen = false;
      window.scrollTo({ top: 0, behavior: "smooth" });
      render();
      return;
    }
    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) return;
    if (actionButton.matches(".drawer-backdrop") && event.target.closest("[data-drawer-content]")) return;
    handleAction(actionButton);
  });

  root.addEventListener("change", event => {
    if (event.target.matches('[data-action="time-choice"]')) {
      state.draftUpdateTime = event.target.value || "07:30";
    }
  });

  root.addEventListener("submit", event => {
    const form = event.target;
    const formName = form.dataset.form;
    if (!formName) return;
    event.preventDefault();
    const values = new FormData(form);
    const added = addStock(String(values.get("stock") || ""), String(values.get("stockType") || "watchlist"), formName === "onboarding-stock");
    if (added) form.reset();
  });

  root.addEventListener("dragstart", event => {
    const item = event.target.closest(".playlist-item");
    if (!item) return;
    state.draggedId = item.dataset.id;
    item.classList.add("is-dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", state.draggedId);
  });
  root.addEventListener("dragover", event => {
    if (event.target.closest(".playlist-item")) event.preventDefault();
  });
  root.addEventListener("drop", event => {
    const target = event.target.closest(".playlist-item");
    if (!target || !state.draggedId) return;
    event.preventDefault();
    movePlaylistItem(state.draggedId, target.dataset.id);
    state.draggedId = "";
  });
  root.addEventListener("dragend", () => {
    state.draggedId = "";
    root.querySelectorAll(".is-dragging").forEach(item => item.classList.remove("is-dragging"));
  });

  document.addEventListener("keydown", event => {
    const playlistItem = event.target.closest?.(".playlist-item");
    if (playlistItem && event.altKey && ["ArrowUp", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      movePlaylistItem(playlistItem.dataset.id, event.key === "ArrowUp" ? -1 : 1);
      window.requestAnimationFrame(() => root.querySelector(`.playlist-item[data-id="${playlistItem.dataset.id}"]`)?.focus());
      return;
    }
    const overlay = root.querySelector(".onboarding, .detail-drawer");
    if (overlay && event.key === "Tab") {
      const focusable = [...overlay.querySelectorAll("button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex='-1'])")]
        .filter(element => element.getClientRects().length > 0);
      if (focusable.length) {
        const first = focusable[0];
        const last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    if (event.key === "Escape" && state.drawerOpen) {
      state.drawerOpen = false;
      state.drawerId = "";
      render();
    }
    if (event.code === "Space" && !event.target.matches("input, select, button")) {
      event.preventDefault();
      togglePlay();
    }
  });

  window.addEventListener("beforeunload", () => stopPlayback());
  if (window.speechSynthesis) window.speechSynthesis.getVoices();
  render();
})();
