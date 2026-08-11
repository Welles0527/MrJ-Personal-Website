"use strict";

(function createScoreMatrixPage(global) {
  const PERIODS = [
    { id: "day", label: "日", lineLabel: "日线" },
    { id: "week", label: "周", lineLabel: "周线" },
    { id: "month", label: "月", lineLabel: "月线" },
    { id: "quarter", label: "季", lineLabel: "季线" },
    { id: "year", label: "年", lineLabel: "年线" }
  ];
  const DIMENSIONS = [
    { id: "trend", label: "趋势", tone: "blue" },
    { id: "structure", label: "结构", tone: "mint" },
    { id: "momentum", label: "动量", tone: "green" },
    { id: "volumePrice", label: "量价", tone: "purple" },
    { id: "volatility", label: "波动", tone: "amber" }
  ];
  const DEFAULT_WEIGHTS = { trend: 30, structure: 25, momentum: 20, volumePrice: 15, volatility: 10 };
  const STORAGE_KEY = "stock-tracking-score-matrix-weights-v1";

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function isValidWeights(weights) {
    const values = DIMENSIONS.map(item => Number(weights?.[item.id]));
    return values.every(value => Number.isFinite(value) && value >= 0 && value <= 100)
      && Math.abs(values.reduce((sum, value) => sum + value, 0) - 100) < 0.001;
  }

  function readWeights() {
    try {
      const saved = JSON.parse(global.localStorage.getItem(STORAGE_KEY) || "null");
      if (isValidWeights(saved)) return Object.fromEntries(DIMENSIONS.map(item => [item.id, Number(saved[item.id])]));
    } catch (_) {
      // Invalid or unavailable local storage falls back to the documented model weights.
    }
    return { ...DEFAULT_WEIGHTS };
  }

  function storeWeights(weights) {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(weights));
    } catch (_) {
      // The applied weights remain valid for the current session when storage is unavailable.
    }
  }

  function scoreTone(score) {
    const value = Number(score);
    if (value >= 65) return "bullish";
    if (value < 45) return "bearish";
    return "neutral";
  }

  function refreshIcon() {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5M18.5 9A7 7 0 0 0 6 7l-2 5M5.5 15A7 7 0 0 0 18 17l2-5"/></svg>`;
  }

  function matrixIcon() {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="4" width="17" height="16" rx="2"/><path d="M9 4v16M15 4v16M3.5 9.5h17M3.5 15h17"/></svg>`;
  }

  function searchIcon() {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>`;
  }

  function clearIcon() {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17"/></svg>`;
  }

  class ScoreMatrixPage {
    constructor(provider, requestRender) {
      this.provider = provider;
      this.requestRender = requestRender;
      this.root = null;
      this.stocks = [];
      this.stockSignature = "";
      this.results = new Map();
      this.errors = new Map();
      this.status = "idle";
      this.progress = 0;
      this.generation = 0;
      this.weights = readWeights();
      this.draftWeights = { ...this.weights };
      this.stockQuery = "";
    }

    setStocks(stocks) {
      const normalized = (Array.isArray(stocks) ? stocks : [])
        .map(stock => ({ code: String(stock?.code || stock?.id || "").padStart(6, "0"), name: stock?.name || stock?.code || "" }))
        .filter(stock => /^\d{6}$/.test(stock.code));
      const signature = normalized.map(stock => stock.code).join("|");
      if (signature !== this.stockSignature) {
        this.generation += 1;
        this.stockSignature = signature;
        this.stocks = normalized;
        this.results.clear();
        this.errors.clear();
        this.status = "idle";
        this.progress = 0;
      } else {
        this.stocks = normalized;
      }
    }

    render(stocks) {
      this.setStocks(stocks);
      const total = this.stocks.length * PERIODS.length;
      const completed = this.results.size + this.errors.size;
      const statusCopy = this.status === "loading"
        ? `正在读取 ${completed} / ${total}`
        : this.status === "ready"
          ? `已完成 ${completed} / ${total}`
          : this.status === "error"
            ? `已完成 ${completed} / ${total}`
            : "等待读取真实行情";
      const rows = this.stocks.length
        ? this.stocks.map(stock => `<tr data-matrix-stock-row data-matrix-stock-search="${escapeHtml(`${stock.name} ${stock.code}`.toLowerCase())}">
            <th scope="row"><span class="matrix-stock"><strong>${escapeHtml(stock.name)}</strong><small>${escapeHtml(stock.code)}</small></span></th>
            ${PERIODS.map(period => this.renderScoreCell(stock, period)).join("")}
          </tr>`).join("")
        : `<tr><td class="matrix-empty" colspan="6"><strong>暂无自选股</strong><span>请先在个股看板添加股票，再返回评分矩阵。</span></td></tr>`;
      const errorNotice = this.errors.size
        ? `<p class="matrix-error-notice" role="status">${this.errors.size} 个周期暂未取得足够行情，可点击“重新计算”重试。</p>`
        : "";

      return `<section class="score-matrix-page" aria-labelledby="score-matrix-title">
        <div class="matrix-workspace">
          <aside class="matrix-weight-panel" aria-labelledby="matrix-weight-title">
            <div class="matrix-weight-heading">
              <div><h2 id="matrix-weight-title">综合分数权重</h2><p>五项合计必须为 100%，应用后立即重算整张矩阵。</p></div>
              <output class="matrix-weight-total is-valid" data-matrix-weight-total aria-live="polite">合计 100%</output>
            </div>
            <div class="matrix-weight-grid">
              ${DIMENSIONS.map(item => `<label class="matrix-weight-field tone-${item.tone}">
                <span>${item.label}</span>
                <span class="matrix-weight-input"><input type="number" min="0" max="100" step="1" inputmode="decimal" data-matrix-weight="${item.id}" value="${escapeHtml(this.draftWeights[item.id])}" aria-label="${item.label}权重百分比"><em>%</em></span>
              </label>`).join("")}
            </div>
            <div class="matrix-weight-actions">
              <span data-matrix-weight-message>当前权重有效，可以调整后重新应用。</span>
              <button class="matrix-weight-reset" type="button" data-action="reset-score-weights">恢复默认</button>
              <button class="matrix-weight-apply" type="button" data-action="apply-score-weights">应用权重</button>
            </div>
          </aside>

          <div class="matrix-content">
            <header class="matrix-control-panel">
              <div class="matrix-intro">
                <span class="matrix-intro-icon">${matrixIcon()}</span>
                <div>
                  <h1 id="score-matrix-title">多周期综合评分矩阵</h1>
                  <p>同一组权重横向比较日、周、月、季、年，行序与自选股保持一致。</p>
                </div>
                <div class="matrix-load-state">
                  <span data-matrix-progress aria-live="polite">${escapeHtml(statusCopy)}</span>
                  <button type="button" data-action="refresh-score-matrix" ${this.status === "loading" || !this.stocks.length ? "disabled" : ""}>
                    ${refreshIcon()}<span>${this.status === "loading" ? "计算中" : "重新计算"}</span>
                  </button>
                </div>
              </div>
            </header>

            <section class="matrix-table-panel" aria-labelledby="matrix-table-title">
              <div class="matrix-table-heading">
                <div><h2 id="matrix-table-title">全部自选股 · 五周期综合分数</h2><p>每个分数均由该周期最近完成行情的五维指标重新计算。</p></div>
                <div class="matrix-table-tools">
                  <label class="matrix-stock-filter">
                    ${searchIcon()}
                    <input type="search" data-matrix-stock-filter value="${escapeHtml(this.stockQuery)}" placeholder="筛选股票名称或代码" autocomplete="off" aria-label="筛选股票名称或代码">
                    <button type="button" data-action="clear-score-matrix-filter" aria-label="清除股票筛选" ${this.stockQuery ? "" : "hidden"}>${clearIcon()}</button>
                  </label>
                  <div class="matrix-score-legend" aria-label="分数区间"><span class="bullish">≥65</span><span class="neutral">45～64</span><span class="bearish">＜45</span></div>
                </div>
              </div>
              <div class="matrix-table-wrap">
                <table>
                  <thead><tr><th scope="col">股票</th>${PERIODS.map(period => `<th scope="col"><strong>${period.label}</strong><small>${period.lineLabel}</small></th>`).join("")}</tr></thead>
                  <tbody>${rows}<tr class="matrix-filter-empty" data-matrix-filter-empty hidden><td colspan="6"><strong>没有匹配的股票</strong><span>请更换名称或代码后重试。</span></td></tr></tbody>
                </table>
              </div>
              ${errorNotice}
              <footer>权重只改变综合分数，不改变趋势、结构、动量、量价与波动的原始维度评分。</footer>
            </section>
          </div>
        </div>
      </section>`;
    }

    renderScoreCell(stock, period) {
      const key = `${stock.code}:${period.id}`;
      const result = this.results.get(key);
      if (result) {
        const score = global.StockTechnicalScores.calculateTotalScore(result.scores.dimensions, this.weights);
        const tone = scoreTone(score);
        return `<td><span class="matrix-score tone-${tone}" aria-label="${escapeHtml(stock.name)}${period.lineLabel}综合评分 ${score}"><strong>${score}</strong></span></td>`;
      }
      if (this.errors.has(key)) {
        return `<td><span class="matrix-score is-error" title="${escapeHtml(this.errors.get(key))}"><strong>--</strong><small>数据不足</small></span></td>`;
      }
      return `<td><span class="matrix-score is-loading" aria-label="${escapeHtml(stock.name)}${period.lineLabel}评分读取中"><strong>···</strong><small>读取中</small></span></td>`;
    }

    mount(root, stocks) {
      this.root = root;
      this.setStocks(stocks);
      this.updateWeightControls();
      this.updateStockFilter();
      if (this.status === "idle" && this.stocks.length) void this.load(false);
    }

    handleInput(target) {
      if (target?.matches?.("[data-matrix-stock-filter]")) {
        this.stockQuery = target.value;
        this.updateStockFilter();
        return true;
      }
      const key = target?.dataset?.matrixWeight;
      if (!key || !DIMENSIONS.some(item => item.id === key)) return false;
      this.draftWeights[key] = target.value;
      this.updateWeightControls();
      return true;
    }

    handleAction(target) {
      const action = target?.dataset?.action;
      if (action === "apply-score-weights") {
        const candidate = Object.fromEntries(DIMENSIONS.map(item => [item.id, Number(this.draftWeights[item.id])]));
        if (!isValidWeights(candidate)) {
          this.updateWeightControls();
          return "async";
        }
        this.weights = candidate;
        this.draftWeights = { ...candidate };
        storeWeights(candidate);
        this.requestRender();
        return "async";
      }
      if (action === "reset-score-weights") {
        this.weights = { ...DEFAULT_WEIGHTS };
        this.draftWeights = { ...DEFAULT_WEIGHTS };
        storeWeights(this.weights);
        this.requestRender();
        return "async";
      }
      if (action === "refresh-score-matrix") {
        void this.load(true);
        return "async";
      }
      if (action === "clear-score-matrix-filter") {
        this.stockQuery = "";
        const input = this.root?.querySelector("[data-matrix-stock-filter]");
        if (input) {
          input.value = "";
          input.focus();
        }
        this.updateStockFilter();
        return "async";
      }
      return false;
    }

    updateStockFilter() {
      if (!this.root) return;
      const query = this.stockQuery.trim().toLowerCase();
      let visibleCount = 0;
      this.root.querySelectorAll("[data-matrix-stock-row]").forEach(row => {
        const matches = !query || String(row.dataset.matrixStockSearch || "").includes(query);
        row.hidden = !matches;
        if (matches) visibleCount += 1;
      });
      const empty = this.root.querySelector("[data-matrix-filter-empty]");
      if (empty) empty.hidden = !query || visibleCount > 0;
      const clear = this.root.querySelector('[data-action="clear-score-matrix-filter"]');
      if (clear) clear.hidden = !query;
    }

    updateWeightControls() {
      if (!this.root) return;
      const values = DIMENSIONS.map(item => Number(this.draftWeights[item.id]));
      const allFinite = values.every(value => Number.isFinite(value) && value >= 0 && value <= 100);
      const total = allFinite ? values.reduce((sum, value) => sum + value, 0) : null;
      const valid = allFinite && Math.abs(total - 100) < 0.001;
      const output = this.root.querySelector("[data-matrix-weight-total]");
      const message = this.root.querySelector("[data-matrix-weight-message]");
      const apply = this.root.querySelector('[data-action="apply-score-weights"]');
      if (output) {
        output.textContent = allFinite ? `合计 ${Number(total.toFixed(2))}%` : "合计 --";
        output.classList.toggle("is-valid", valid);
        output.classList.toggle("is-invalid", !valid);
      }
      if (message) {
        if (!allFinite) message.textContent = "每项请输入 0～100 之间的数字。";
        else if (valid) message.textContent = "合计正确，可以应用并重算全部周期。";
        else if (total < 100) message.textContent = `还差 ${Number((100 - total).toFixed(2))}%，当前分数保持不变。`;
        else message.textContent = `超出 ${Number((total - 100).toFixed(2))}%，当前分数保持不变。`;
      }
      if (apply) apply.disabled = !valid;
    }

    updateProgress() {
      const total = this.stocks.length * PERIODS.length;
      const completed = this.results.size + this.errors.size;
      const element = this.root?.querySelector("[data-matrix-progress]");
      if (element) element.textContent = `正在读取 ${completed} / ${total}`;
    }

    async load(forceRefresh) {
      if (this.status === "loading" || !this.stocks.length) return;
      const generation = ++this.generation;
      this.status = "loading";
      this.progress = 0;
      if (forceRefresh) {
        this.results.clear();
        this.errors.clear();
      }
      this.requestRender();
      let nextStockIndex = 0;
      const workerCount = Math.min(3, this.stocks.length);
      const workers = Array.from({ length: workerCount }, async () => {
        while (nextStockIndex < this.stocks.length && generation === this.generation) {
          const stock = this.stocks[nextStockIndex];
          nextStockIndex += 1;
          for (const period of PERIODS) {
            if (generation !== this.generation) return;
            const key = `${stock.code}:${period.id}`;
            try {
              let result;
              try {
                result = await this.provider.getTechnicalAnalysis(stock.code, { period: period.id, adjustment: "forward" }, { forceRefresh });
              } catch (_) {
                await new Promise(resolve => global.setTimeout(resolve, 250));
                result = await this.provider.getTechnicalAnalysis(stock.code, { period: period.id, adjustment: "forward" }, { forceRefresh });
              }
              if (generation !== this.generation) return;
              this.results.set(key, result);
              this.errors.delete(key);
            } catch (error) {
              if (generation !== this.generation) return;
              this.results.delete(key);
              this.errors.set(key, error?.message || "评分读取失败");
            }
            this.progress += 1;
            this.updateProgress();
          }
        }
      });
      await Promise.all(workers);
      if (generation !== this.generation) return;
      this.status = this.results.size ? (this.errors.size ? "error" : "ready") : "error";
      this.requestRender();
    }
  }

  global.StockScoreMatrixPage = {
    DEFAULT_WEIGHTS,
    PERIODS,
    create(provider, requestRender) {
      return new ScoreMatrixPage(provider, requestRender);
    }
  };
})(window);

