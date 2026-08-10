"use strict";

(function createTechnicalAnalysisPage(global) {
  const dimensionMeta = {
    trend: { label: "趋势", tone: "blue", description: "均线、MACD 与 ADX 共同判断方向" },
    structure: { label: "结构", tone: "mint", description: "枢轴、平台与通道共同判断健康度" },
    momentum: { label: "动量", tone: "green", description: "RSI、MACD、KDJ 与 ROC 判断推动力" },
    volumePrice: { label: "量价", tone: "purple", description: "量比、OBV、CMF 与突破量能互证" },
    volatility: { label: "波动", tone: "orange", description: "带宽、ATR 与实现波动率判断扩张质量" }
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatNumber(value, digits = 2) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "--";
    return number.toLocaleString("zh-CN", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }

  function formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "--";
    return new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(date).replaceAll("/", "-");
  }

  function normalizeSearchText(value) {
    return String(value || "").trim().toLowerCase().replace(/\s+/g, "");
  }

  function isFuzzySubsequence(needle, haystack) {
    if (!needle || !haystack) return false;
    let index = 0;
    for (const character of haystack) {
      if (character === needle[index]) index += 1;
      if (index === needle.length) return true;
    }
    return false;
  }

  function stockMatchesSearch(stock, rawQuery) {
    const query = normalizeSearchText(rawQuery);
    const fields = [stock.name, stock.code, stock.initials].map(normalizeSearchText).filter(Boolean);
    return fields.some(field => field.includes(query) || isFuzzySubsequence(query, field));
  }

  function icon(name) {
    const paths = {
      trend: '<path d="M4 17l5-5 3 3 7-8"/><path d="M14 7h5v5"/>',
      structure: '<path d="M5 18V9l7-4 7 4v9"/><path d="M8 12l4-2 4 2v5H8z"/>',
      momentum: '<path d="M5 16a7 7 0 1 1 14 0"/><path d="m12 13 4-4"/><circle cx="12" cy="16" r="1"/>',
      volumePrice: '<path d="M5 18v-4M9 18V9M13 18v-7M17 18V5M21 18H3"/>',
      volatility: '<path d="M3 12c3-6 6 6 9 0s6 6 9 0"/><path d="M3 17c3-4 6 4 9 0s6 4 9 0"/>',
      search: '<circle cx="10.5" cy="10.5" r="5.5"/><path d="m15 15 5 5"/>',
      refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.2 9A7 7 0 0 1 18.5 7M17.8 15A7 7 0 0 1 5.5 17"/>',
      back: '<path d="m15 18-6-6 6-6"/>',
      buy: '<circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
      breakout: '<path d="M4 18l5-5 3 3 7-9"/><path d="M14 7h5v5"/><path d="M5 21h14"/>',
      stop: '<path d="M12 3 5 6v5c0 4.4 2.9 8.3 7 10 4.1-1.7 7-5.6 7-10V6z"/><path d="m9 12 2 2 4-5"/>',
      reduce: '<path d="M12 3 3 20h18z"/><path d="M12 9v5M12 17h.01"/>'
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.trend}</svg>`;
  }

  function linePath(values, width = 118, height = 34, domain = null) {
    const finiteValues = values.map(Number).filter(Number.isFinite);
    if (finiteValues.length < 2) return "";
    const minimum = Number.isFinite(domain?.minimum) ? domain.minimum : Math.min(...finiteValues);
    const maximum = Number.isFinite(domain?.maximum) ? domain.maximum : Math.max(...finiteValues);
    const range = maximum - minimum || 1;
    return values.map((rawValue, index) => {
      const value = Number(rawValue);
      const x = index / Math.max(1, values.length - 1) * width;
      const y = height - 3 - ((value - minimum) / range) * (height - 6);
      return `${index ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
  }

  function renderSparkline(id, result) {
    const values = result.sparklines[id] || [];
    if (id === "momentum") {
      const maximum = Math.max(...values.map(value => Math.abs(Number(value) || 0)), 0.0001);
      return `<svg class="ta-spark bars" viewBox="0 0 118 34" aria-hidden="true">
        ${values.map((value, index) => {
          const height = Math.max(1, Math.abs(Number(value) || 0) / maximum * 14);
          const y = Number(value) >= 0 ? 17 - height : 18;
          return `<rect x="${(index * 6.3).toFixed(1)}" y="${y.toFixed(1)}" width="3.4" height="${height.toFixed(1)}" class="${Number(value) >= 0 ? "positive" : "negative"}"/>`;
        }).join("")}
        <path d="M0 17.5H118" class="baseline"/>
      </svg>`;
    }
    if (id === "volumePrice") {
      const volumes = result.sparklines.volumePrice;
      const prices = result.sparklines.trend;
      const maxVolume = Math.max(...volumes.map(Number), 1);
      return `<svg class="ta-spark combo" viewBox="0 0 118 34" aria-hidden="true">
        ${volumes.map((value, index) => `<rect x="${(index * 6.3).toFixed(1)}" y="${(32 - Number(value) / maxVolume * 15).toFixed(1)}" width="3.2" height="${(Number(value) / maxVolume * 15).toFixed(1)}"/>`).join("")}
        <path d="${linePath(prices)}"/>
      </svg>`;
    }
    if (id === "volatility") {
      const boll = result.sparklines.boll || {};
      const series = [boll.upper, boll.middle, boll.lower].filter(Array.isArray);
      const finiteValues = series.flat().map(Number).filter(Number.isFinite);
      if (series.length === 3 && finiteValues.length >= 6) {
        const domain = { minimum: Math.min(...finiteValues), maximum: Math.max(...finiteValues) };
        return `<svg class="ta-spark boll" viewBox="0 0 118 34" role="img" aria-label="BOLL 上轨、中轨、下轨最近18个交易日走势">
          <path class="upper" d="${linePath(boll.upper, 118, 34, domain)}"/>
          <path class="middle" d="${linePath(boll.middle, 118, 34, domain)}"/>
          <path class="lower" d="${linePath(boll.lower, 118, 34, domain)}"/>
        </svg>`;
      }
    }
    return `<svg class="ta-spark" viewBox="0 0 118 34" aria-hidden="true"><path d="${linePath(values)}"/></svg>`;
  }

  function detailsTooltip(meta, dimension) {
    return `<span class="ta-score-tooltip" role="tooltip" popover="manual">
      <strong>${meta.label}评分 ${formatNumber(dimension.score, 0)}</strong>
      ${dimension.details.map(detail => `<span><b>${escapeHtml(detail.label)}</b><em>${Number.isFinite(Number(detail.points)) ? `${formatNumber(detail.points, 1)}/${detail.max}` : "--"}</em></span><small>${escapeHtml(detail.evidence)}</small>`).join("")}
    </span>`;
  }

  function overlapArea(rect, other) {
    const width = Math.max(0, Math.min(rect.right, other.right) - Math.max(rect.left, other.left));
    const height = Math.max(0, Math.min(rect.bottom, other.bottom) - Math.max(rect.top, other.top));
    return width * height;
  }

  function placeScoreTooltip(trigger, root) {
    const tooltip = trigger.querySelector(".ta-score-tooltip");
    if (!tooltip) return;
    trigger.classList.add("is-tooltip-open");
    if (typeof tooltip.showPopover === "function" && !tooltip.matches(":popover-open")) tooltip.showPopover();
    tooltip.style.visibility = "hidden";
    tooltip.style.left = "0px";
    tooltip.style.top = "0px";
    const anchor = trigger.getBoundingClientRect();
    const measured = tooltip.getBoundingClientRect();
    const width = measured.width;
    const height = measured.height;
    const margin = 12;
    const gap = 10;
    const viewport = { width: global.innerWidth, height: global.innerHeight };
    const stage = trigger.closest(".ta-radar-stage")?.getBoundingClientRect() || anchor;
    const anchorCenterX = anchor.left + anchor.width / 2;
    const anchorCenterY = anchor.top + anchor.height / 2;
    const verticalPreference = anchorCenterY >= stage.top + stage.height / 2 ? "top" : "bottom";
    const horizontalPreference = anchorCenterX >= stage.left + stage.width / 2 ? "left" : "right";
    const preference = [verticalPreference, horizontalPreference, horizontalPreference === "left" ? "right" : "left", verticalPreference === "top" ? "bottom" : "top"];
    const coordinates = {
      top: { left: anchorCenterX - width / 2, top: anchor.top - height - gap },
      bottom: { left: anchorCenterX - width / 2, top: anchor.bottom + gap },
      left: { left: anchor.left - width - gap, top: anchorCenterY - height / 2 },
      right: { left: anchor.right + gap, top: anchorCenterY - height / 2 }
    };
    const avoidRects = [...root.querySelectorAll(".ta-dimension, .ta-total-score, .ta-conclusions")]
      .filter(element => element !== trigger)
      .map(element => element.getBoundingClientRect());
    const candidates = preference.map((placement, preferenceIndex) => {
      const point = coordinates[placement];
      const rect = { left: point.left, top: point.top, right: point.left + width, bottom: point.top + height };
      const overflow = Math.max(0, margin - rect.left)
        + Math.max(0, rect.right - viewport.width + margin)
        + Math.max(0, margin - rect.top)
        + Math.max(0, rect.bottom - viewport.height + margin);
      const overlap = avoidRects.reduce((total, other) => total + overlapArea(rect, other), 0);
      return { placement, point, score: overflow * 100000 + overlap + preferenceIndex * 500 };
    });
    const best = candidates.sort((left, right) => left.score - right.score)[0];
    const left = Math.min(Math.max(margin, best.point.left), Math.max(margin, viewport.width - width - margin));
    const top = Math.min(Math.max(margin, best.point.top), Math.max(margin, viewport.height - height - margin));
    tooltip.dataset.placement = best.placement;
    tooltip.style.left = `${Math.round(left)}px`;
    tooltip.style.top = `${Math.round(top)}px`;
    tooltip.style.visibility = "visible";
  }

  function bindScoreTooltips(root) {
    root.querySelectorAll(".ta-dimension, .ta-total-score").forEach(trigger => {
      const open = () => placeScoreTooltip(trigger, root);
      const close = () => {
        trigger.classList.remove("is-tooltip-open");
        const tooltip = trigger.querySelector(".ta-score-tooltip");
        if (tooltip) {
          if (typeof tooltip.hidePopover === "function" && tooltip.matches(":popover-open")) tooltip.hidePopover();
          tooltip.style.visibility = "";
        }
      };
      trigger.addEventListener("pointerenter", open);
      trigger.addEventListener("pointerleave", close);
      trigger.addEventListener("focusin", open);
      trigger.addEventListener("focusout", close);
    });
  }

  function bindSummaryRows(root) {
    root.querySelectorAll("[data-technical-stock]").forEach(row => {
      const activate = () => {
        const code = row.dataset.technicalStock;
        if (!code) return;
        if (row.dataset.current === "true") {
          root.querySelector(".ta-analysis-workspace")?.scrollIntoView({
            behavior: global.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ? "auto" : "smooth",
            block: "start"
          });
          return;
        }
        const url = new URL(global.location.href);
        url.searchParams.set("stock", code);
        url.searchParams.set("view", "technical");
        global.location.assign(url.href);
      };
      row.addEventListener("click", activate);
      row.addEventListener("keydown", event => {
        if (!["Enter", " "].includes(event.key)) return;
        event.preventDefault();
        activate();
      });
    });
  }

  function StockSearchBar(context, state) {
    const query = state.searchQuery.trim();
    const matches = query ? context.allStocks.filter(stock => stockMatchesSearch(stock, query)).slice(0, 7) : [];
    return `<div class="ta-search-wrap">
      <label class="ta-stock-search">
        ${icon("search")}
        <input type="search" value="${escapeHtml(state.searchQuery)}" data-technical-search placeholder="输入名称 / 代码" autocomplete="off" aria-label="搜索任意A股">
        ${query ? '<button type="button" data-action="clear-technical-search" aria-label="清除搜索">×</button>' : ""}
      </label>
      ${query ? `<div class="ta-search-results" role="listbox">
        ${matches.length ? matches.map(stock => `<button type="button" role="option" data-action="select-stock" data-stock-id="${stock.id}" data-stock-view="technical">
          <span><strong>${escapeHtml(stock.name)}</strong><small>${stock.code}</small></span>
          <em>${escapeHtml(stock.market || "A股")}</em>
        </button>`).join("") : '<div class="ta-search-empty">没有匹配的股票</div>'}
      </div>` : ""}
    </div>`;
  }

  function DashboardHeader(result, context, state) {
    const stock = result.overview;
    const rising = Number(stock.changePct) >= 0;
    return `<header class="ta-dashboard-header">
      <div class="ta-identity">
        <button type="button" class="ta-back" data-action="return-stock-view" aria-label="返回个股跟踪">${icon("back")}</button>
        <span class="ta-brand-mark">${icon("trend")}</span>
        <div><h1>${escapeHtml(stock.name)}技术总览</h1><p>${stock.code} · 日线前复权 · 评分截至 ${escapeHtml(stock.scoreDate)} 收盘</p></div>
      </div>
      ${StockSearchBar(context, state)}
      <div class="ta-live-quote ${rising ? "rise" : "fall"}">
        <strong>${formatNumber(stock.price)}</strong>
        <span>${rising ? "+" : ""}${formatNumber(stock.change)}　${rising ? "+" : ""}${formatNumber(stock.changePct)}%</span>
      </div>
      <div class="ta-status-stack">
        <span class="ta-status-chip market">${escapeHtml(stock.tradingStatus)}</span>
        <span class="ta-status-chip score">${escapeHtml(result.scores.label)}</span>
      </div>
      <div class="ta-update">
        <span>数据更新 · ${formatDateTime(stock.updatedAt)}</span>
        <button type="button" data-action="refresh-technical" aria-label="刷新真实行情" ${state.status === "loading" ? "disabled" : ""}>${icon("refresh")}</button>
      </div>
    </header>`;
  }

  function DimensionMetric(id, result) {
    const meta = dimensionMeta[id];
    const dimension = result.scores.dimensions[id];
    return `<button type="button" class="ta-dimension ta-dimension-${id} tone-${meta.tone}" aria-describedby="ta-${id}-tip">
      <span class="ta-dimension-icon">${icon(id)}</span>
      <span class="ta-dimension-copy">
        <span class="ta-dimension-title">${meta.label} <strong>${formatNumber(dimension.score, 0)}</strong></span>
        ${renderSparkline(id, result)}
        <small>${escapeHtml(dimension.details.find(detail => Number.isFinite(Number(detail.points)))?.evidence || meta.description)}</small>
      </span>
      <span id="ta-${id}-tip">${detailsTooltip(meta, dimension)}</span>
    </button>`;
  }

  function TotalScoreTooltip(result) {
    const rows = Object.entries(dimensionMeta).map(([id, meta]) => {
      const score = result.scores.dimensions[id].score;
      const weight = global.StockTechnicalScores.DIMENSION_WEIGHTS[id];
      return `<span><b>${meta.label} ${formatNumber(score, 0)}</b><em>× ${weight}%</em></span>`;
    }).join("");
    return `<span class="ta-score-tooltip ta-total-tooltip" role="tooltip" popover="manual"><strong>综合技术评分</strong>${rows}<small>= ${formatNumber(result.scores.total, 0)}</small></span>`;
  }

  function RadarOverview(result) {
    return `<section class="ta-radar-panel" aria-labelledby="ta-radar-title">
      <div class="ta-panel-title"><h2 id="ta-radar-title">综合技术评分 <span>（满分100）</span></h2><p>五维评分全部由最近完成交易日的真实行情计算</p></div>
      <div class="ta-radar-stage">
        ${DimensionMetric("trend", result)}
        ${DimensionMetric("structure", result)}
        ${DimensionMetric("momentum", result)}
        ${DimensionMetric("volumePrice", result)}
        ${DimensionMetric("volatility", result)}
        <div id="technical-radar-chart" class="ta-radar-chart" role="img" aria-label="${escapeHtml(result.overview.name)}五维技术雷达图"></div>
        <button type="button" class="ta-total-score" aria-label="综合技术评分 ${formatNumber(result.scores.total, 0)}，${escapeHtml(result.scores.label)}">
          <strong>${formatNumber(result.scores.total, 0)}</strong><span>${escapeHtml(result.scores.label)}</span>${TotalScoreTooltip(result)}
        </button>
      </div>
      <div class="ta-conclusions"><strong>技术结论</strong><div>
        ${result.scores.chips.length ? result.scores.chips.map(chip => `<span class="tone-${chip.tone}">${escapeHtml(chip.label)}</span>`).join("") : '<span class="tone-muted">暂无达到阈值的技术结论</span>'}
      </div></div>
    </section>`;
  }

  function tradeItem(iconName, tone, title, value, detail) {
    return `<div class="ta-trade-item tone-${tone}"><span class="ta-trade-icon">${icon(iconName)}</span><div><strong>${escapeHtml(title)}</strong><span>${escapeHtml(value)}</span>${detail ? `<small>${escapeHtml(detail)}</small>` : ""}</div></div>`;
  }

  function TradePositionPanel(result) {
    const levels = result.tradeLevels;
    const buy = levels.buyZone;
    const breakout = levels.breakout;
    return `<aside class="ta-trade-panel" aria-labelledby="ta-trade-title">
      <div class="ta-panel-title"><h2 id="ta-trade-title">交易位置 / 买卖点</h2><p>基于支撑压力共振与 ATR 距离，不构成交易建议</p></div>
      <div class="ta-trade-list">
        ${tradeItem("buy", "mint", "买点", buy ? `缩量回踩 ${formatNumber(buy.lower)}～${formatNumber(buy.upper)}` : "--", buy ? buy.sources.join(" + ") : "等待两项以上支撑共振")}
        ${tradeItem("breakout", "green", breakout?.triggered ? "突破买点" : "关注突破", breakout ? `${breakout.triggered ? "放量站上" : "放量站上"} ${formatNumber(breakout.price)}` : "--", breakout?.condition || "尚未识别主要压力")}
        ${tradeItem("stop", "red", "止损位", formatNumber(levels.stop), levels.stop ? `支撑下沿 - 0.4 ATR（ATR ${formatNumber(levels.atr)}）` : "支撑结构不足")}
        ${tradeItem("reduce", "orange", "减仓信号", levels.reduceSignal?.label || "--", levels.reduceSignal?.evidence?.join("；") || "未形成共振")}
      </div>
    </aside>`;
  }

  function scoreTone(score) {
    const value = Number(score);
    if (value >= 65) return "strong";
    if (value < 45) return "weak";
    return "neutral";
  }

  function summaryBuyZone(item) {
    return item.buyZone
      ? `${formatNumber(item.buyZone.lower)}～${formatNumber(item.buyZone.upper)}`
      : "--";
  }

  function StockScoreSummary(summary, status, currentCode) {
    const items = Array.isArray(summary?.items) ? summary.items : [];
    const errors = Array.isArray(summary?.errors) ? summary.errors : [];
    const latestDate = items.map(item => item.scoreDate).filter(Boolean).sort().at(-1) || "--";
    const body = status === "loading" && !items.length
      ? `<div class="ta-summary-state"><span class="ta-summary-loader" aria-hidden="true"></span><strong>正在计算全部自选股评分</strong><small>逐只读取最新完成交易日的真实行情</small></div>`
      : items.length || errors.length
        ? `<div class="ta-summary-scroll"><table>
            <thead><tr><th scope="col">排名</th><th scope="col">股票</th><th scope="col">当日综合分数</th><th scope="col">买点</th><th scope="col">止损位</th><th scope="col">技术结论</th><th scope="col">当日涨跌</th><th scope="col">评分交易日</th></tr></thead>
            <tbody>${items.map((item, index) => {
              const rising = Number(item.changePct) >= 0;
              const active = String(item.code) === String(currentCode);
              return `<tr class="${active ? "is-current" : ""}" role="link" tabindex="0" data-technical-stock="${escapeHtml(item.code)}" data-current="${active}" aria-label="查看 ${escapeHtml(item.name)} ${escapeHtml(item.code)} 的技术分析">
                <td><span class="ta-summary-rank">${index + 1}</span></td>
                <td><span class="ta-summary-stock"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.code)}${active ? " · 当前" : ""}</small></span></td>
                <td><span class="ta-summary-score ${scoreTone(item.score)}">${formatNumber(item.score, 0)}</span></td>
                <td><span class="ta-summary-level buy">${summaryBuyZone(item)}</span></td>
                <td><span class="ta-summary-level stop">${formatNumber(item.stop)}</span></td>
                <td><span class="ta-summary-label ${scoreTone(item.score)}">${escapeHtml(item.label)}</span></td>
                <td><span class="ta-summary-change ${rising ? "rise" : "fall"}">${rising ? "上涨" : "下跌"} ${rising ? "+" : ""}${formatNumber(item.changePct)}%</span></td>
                <td><time datetime="${escapeHtml(item.scoreDate)}">${escapeHtml(item.scoreDate)}</time></td>
              </tr>`;
            }).join("")}${errors.map(error => {
              const active = String(error.code) === String(currentCode);
              return `<tr class="ta-summary-error-row ${active ? "is-current" : ""}" role="link" tabindex="0" data-technical-stock="${escapeHtml(error.code)}" data-current="${active}" aria-label="重试 ${escapeHtml(error.name)} ${escapeHtml(error.code)} 的技术分析">
                <td><span class="ta-summary-rank">--</span></td>
                <td><span class="ta-summary-stock"><strong>${escapeHtml(error.name)}</strong><small>${escapeHtml(error.code)}${active ? " · 当前" : ""}</small></span></td>
                <td><span class="ta-summary-score">--</span></td>
                <td><span class="ta-summary-level">--</span></td>
                <td><span class="ta-summary-level">--</span></td>
                <td><span class="ta-summary-label">行情暂不可用</span></td>
                <td><span class="ta-summary-change">--</span></td>
                <td><span class="ta-summary-retry" title="${escapeHtml(error.message)}">待重试</span></td>
              </tr>`;
            }).join("")}</tbody>
          </table></div>`
        : `<div class="ta-summary-state"><strong>暂时无法生成自选股评分汇总</strong><small>${errors.length ? `有 ${errors.length} 只股票行情读取失败，请稍后刷新` : "请先添加自选股"}</small></div>`;
    return `<section class="ta-score-summary" aria-labelledby="ta-score-summary-title">
      <div class="ta-panel-title ta-summary-heading">
        <div><h2 id="ta-score-summary-title">全部自选股 · 当日综合评分</h2><p>${latestDate} 收盘 · 按综合分数从高到低排列</p></div>
        <span>${items.length} / ${items.length + errors.length || 0} 只已完成${status === "loading" ? " · 更新中" : ""}</span>
      </div>
      ${body}
    </section>`;
  }

  function ScoreTrend(result) {
    const performance = result.scorePerformance || global.StockTechnicalScores.calculateScorePerformance(result.scoreHistory);
    const hitRate = Number.isFinite(Number(performance.hitRate)) ? `${performance.hitRate}%` : "--";
    return `<section class="ta-score-trend" aria-labelledby="ta-score-trend-title">
      <div class="ta-panel-title ta-score-heading">
        <div><h2 id="ta-score-trend-title">评分与涨跌对照（近30个交易日）</h2><p>上层为每日收盘技术评分，下层为当日涨跌幅；两组柱状图共享同一交易日轴</p></div>
        <div class="ta-score-legend" aria-label="图例"><span class="score-bullish">≥65 偏多</span><span class="score-neutral">45～64 中性</span><span class="score-bearish">＜45 偏空</span><span class="rise">上涨</span><span class="fall">下跌</span><strong>最新 ${formatNumber(result.scores.total, 0)}</strong></div>
      </div>
      <div id="technical-score-trend-chart" class="ta-score-trend-chart" role="img" aria-label="近30个交易日综合技术评分与每日涨跌幅柱状对比"></div>
      <aside class="ta-score-validation" aria-label="技术评分次日方向验证">
        <div class="ta-validation-primary"><span>近3个月次日方向命中率</span><strong>${hitRate}</strong></div>
        <dl><div><dt>有效样本</dt><dd>${performance.evaluatedCount}</dd></div><div><dt>方向命中</dt><dd>${performance.hitCount}</dd></div><div><dt>未计样本</dt><dd>${performance.ignoredCount}</dd></div></dl>
        <p>统计最近3个月：以前一交易日评分判断下一交易日方向，评分 ≥65 偏多、＜45 偏空；45～64分和平盘不计。</p>
      </aside>
    </section>`;
  }

  function LoadingState(context, state) {
    return `<div class="technical-analysis-page ta-state-page">
      <header class="ta-state-header"><button type="button" class="ta-back" data-action="return-stock-view">${icon("back")}</button>${StockSearchBar(context, state)}</header>
      <section class="ta-loading" aria-live="polite" aria-busy="true"><span class="ta-loader"></span><h2>正在读取真实行情</h2><p>加载至少250个交易日的前复权日线，并逐日计算技术评分…</p></section>
    </div>`;
  }

  function ErrorState(state, context) {
    return `<div class="technical-analysis-page ta-state-page">
      <header class="ta-state-header"><button type="button" class="ta-back" data-action="return-stock-view">${icon("back")}</button>${StockSearchBar(context, state)}</header>
      <section class="ta-error-state"><span>行情数据未连接</span><h2>无法生成正式技术评分</h2><p>${escapeHtml(state.error || "真实行情暂不可用，请稍后重试。")}</p><button type="button" data-action="refresh-technical">重新读取真实行情</button></section>
    </div>`;
  }

  class TechnicalAnalysisPage {
    constructor(provider, onChange) {
      this.provider = provider;
      this.onChange = onChange;
      this.currentStockCode = "";
      this.chartElements = [];
      this.resizeObserver = typeof ResizeObserver === "function"
        ? new ResizeObserver(() => global.requestAnimationFrame(() => this.chartElements.forEach(element => global.StockTechnicalChart?.resize(element))))
        : null;
      this.state = {
        status: "idle",
        result: null,
        summary: null,
        summaryStatus: "idle",
        summaryError: "",
        error: "",
        searchQuery: "",
        query: { period: "day", adjustment: "forward" }
      };
    }

    async load(stockCode, options = {}) {
      if (!stockCode) return;
      if (!options.forceRefresh && this.currentStockCode === stockCode && ["loading", "ready"].includes(this.state.status)) return;
      this.currentStockCode = stockCode;
      this.state.status = "loading";
      this.state.summaryStatus = "loading";
      this.state.summaryError = "";
      this.state.error = "";
      this.state.result = null;
      this.onChange();
      try {
        const result = await this.provider.getTechnicalAnalysis(stockCode, this.state.query, options);
        if (this.currentStockCode !== stockCode) return;
        this.state.result = result;
        this.state.status = "ready";
        this.onChange();
        try {
          this.state.summary = await this.provider.getTechnicalSummary(this.trackedStocks, this.state.query, options);
          this.state.summaryStatus = "ready";
        } catch (summaryError) {
          this.state.summaryStatus = "error";
          this.state.summaryError = summaryError?.message || "自选股评分汇总失败";
        }
      } catch (error) {
        if (this.currentStockCode !== stockCode) return;
        this.state.status = "error";
        this.state.error = error?.message || "未知错误";
      }
      this.onChange();
    }

    render(stock, context) {
      this.trackedStocks = Array.isArray(context.trackedStocks) ? context.trackedStocks : [];
      if (this.state.status === "idle" || (this.currentStockCode && this.currentStockCode !== stock.code)) return LoadingState(context, this.state);
      if (this.state.status === "loading") return LoadingState(context, this.state);
      if (this.state.status === "error" || !this.state.result) return ErrorState(this.state, context);
      this.state.result.overview.name = stock.name || this.state.result.overview.name;
      return `<div class="technical-analysis-page">
        ${StockScoreSummary(this.state.summary, this.state.summaryStatus, stock.code)}
        ${DashboardHeader(this.state.result, context, this.state)}
        <div class="ta-analysis-workspace">
          <div class="ta-dashboard-grid">${RadarOverview(this.state.result)}${TradePositionPanel(this.state.result)}</div>
          ${ScoreTrend(this.state.result)}
        </div>
        <footer class="ta-data-foot">${escapeHtml(this.state.result.dataMeta.source)} · ${this.state.result.dataMeta.rawCount} 个已完成交易日 · 前复权 · 技术评分描述当前状态，不代表上涨概率</footer>
      </div>`;
    }

    mount(root, stock) {
      if (!stock?.code) return;
      if (this.currentStockCode !== stock.code || this.state.status === "idle") {
        this.load(stock.code);
        return;
      }
      if (!this.state.result || this.state.status !== "ready") return;
      this.chartElements.forEach(element => this.resizeObserver?.unobserve(element));
      this.chartElements = [root.querySelector("#technical-radar-chart"), root.querySelector("#technical-score-trend-chart")].filter(Boolean);
      this.chartElements.forEach(element => this.resizeObserver?.observe(element));
      bindScoreTooltips(root);
      bindSummaryRows(root);
      global.StockTechnicalChart?.renderRadar(this.chartElements[0], this.state.result);
      global.StockTechnicalChart?.renderTrend(this.chartElements[1], this.state.result);
    }

    handleAction(target) {
      const action = target.dataset.action;
      if (action === "clear-technical-search") {
        this.state.searchQuery = "";
        return true;
      }
      if (action === "refresh-technical") {
        this.load(this.currentStockCode, { forceRefresh: true });
        return "async";
      }
      return false;
    }

    handleInput(target) {
      if (!target.matches("[data-technical-search]")) return false;
      this.state.searchQuery = target.value;
      return true;
    }

    clearSearch() {
      this.state.searchQuery = "";
    }
  }

  global.StockTechnicalAnalysisPage = {
    create(provider, onChange) {
      return new TechnicalAnalysisPage(provider, onChange);
    }
  };
})(window);
