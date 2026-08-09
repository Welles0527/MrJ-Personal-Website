"use strict";

(function createAIStockSelectionPage(global) {
  const CATEGORY_ORDER = ["全部机构", "基金", "QFII", "社保", "券商", "保险", "信托", "其他机构"];
  const STATUS_RUNNING = new Set(["queued", "pending", "starting", "running", "retry_wait", "retrying", "processing", "in_progress"]);
  const STATUS_SUCCESS = new Set(["success", "succeeded", "completed", "complete", "done"]);
  const STATUS_FAILED = new Set(["failed", "failure", "error", "cancelled", "canceled"]);

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function resolvePath(object, path) {
    return String(path).split(".").reduce((value, key) => value?.[key], object);
  }

  function firstValue(object, paths, fallback = undefined) {
    for (const path of paths) {
      const value = resolvePath(object, path);
      if (value !== undefined && value !== null && value !== "") return value;
    }
    return fallback;
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function numeric(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (value === undefined || value === null || value === "") return null;
    const text = String(value).trim().replaceAll(",", "").replaceAll("股", "");
    const match = text.match(/^([+-]?[\d.]+)\s*(亿|万)?/);
    if (!match) return null;
    const base = Number(match[1]);
    if (!Number.isFinite(base)) return null;
    if (match[2] === "亿") return base * 100000000;
    if (match[2] === "万") return base * 10000;
    return base;
  }

  function integer(value, fallback = 0) {
    const number = numeric(value);
    return Number.isFinite(number) ? Math.round(number) : fallback;
  }

  function truthyFlag(value) {
    if (value === true || value === 1) return true;
    return ["1", "true", "yes", "y", "是", "新增", "当日新增", "new"].includes(String(value || "").trim().toLowerCase());
  }

  function formatInteger(value) {
    const number = numeric(value);
    return Number.isFinite(number) ? Math.round(number).toLocaleString("zh-CN") : "—";
  }

  function formatShares(value) {
    const number = numeric(value);
    if (!Number.isFinite(number)) return "—";
    const absolute = Math.abs(number);
    if (absolute >= 100000000) return `${(number / 100000000).toLocaleString("zh-CN", { maximumFractionDigits: 3 })}亿`;
    if (absolute >= 10000) return `${(number / 10000).toLocaleString("zh-CN", { maximumFractionDigits: 2 })}万`;
    return Math.round(number).toLocaleString("zh-CN");
  }

  function formatPercent(value, options = {}) {
    const number = numeric(value);
    if (!Number.isFinite(number)) return "—";
    const normalized = options.fraction === true ? number * 100 : number;
    const prefix = options.signed && normalized > 0 ? "+" : "";
    return `${prefix}${normalized.toLocaleString("zh-CN", { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%`;
  }

  function formatDateTime(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return escapeHtml(String(value));
    const parts = new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}`;
  }

  function listFrom(object, paths) {
    for (const path of paths) {
      const value = resolvePath(object, path);
      if (Array.isArray(value)) return value;
    }
    return [];
  }

  function unwrapSnapshot(payload) {
    if (!payload || typeof payload !== "object") return null;
    if (payload.snapshot && typeof payload.snapshot === "object") return payload.snapshot;
    if (payload.data?.snapshot && typeof payload.data.snapshot === "object") return payload.data.snapshot;
    if (payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)) return payload.data;
    return payload;
  }

  function normalizeCategories(value) {
    if (Array.isArray(value)) return value.map(item => String(item).trim()).filter(Boolean);
    return String(value || "")
      .split(/[、,，/|+＋]/)
      .map(item => item.trim())
      .filter(Boolean);
  }

  function normalizeCandidate(item) {
    const q2Shares = firstValue(item, [
      "q2Shares", "currentShares", "current_shares", "q2_total_shares", "totalSharesCurrent",
      "TOTAL_SHARES_Q2", "2026Q2持股股数", "Q2持股股数", "本期持股股数", "本期持股(股)"
    ]);
    const q1Shares = firstValue(item, [
      "q1Shares", "previousShares", "previous_shares", "q1_total_shares", "totalSharesPrevious",
      "TOTAL_SHARES_Q1", "2026Q1持股股数", "Q1持股股数", "上期持股股数", "上期持股(股)"
    ]);
    const explicitDelta = firstValue(item, [
      "deltaShares", "adjustedDeltaShares", "delta_shares", "adjusted_delta_shares", "shareChange",
      "持股增加(股)", "校正后股数增量", "全部机构持股增量"
    ]);
    const calculatedDelta = Number.isFinite(numeric(q2Shares)) && Number.isFinite(numeric(q1Shares))
      ? numeric(q2Shares) - numeric(q1Shares)
      : null;
    const categories = normalizeCategories(firstValue(item, [
      "increasedCategories", "increased_categories", "categories", "categoryNames", "增仓机构类别", "增仓类别"
    ], []));
    return {
      raw: item,
      code: String(firstValue(item, ["code", "stockCode", "stock_code", "SECURITY_CODE", "股票代码", "证券代码"], "")).padStart(6, "0"),
      name: String(firstValue(item, ["name", "stockName", "stock_name", "SECURITY_NAME_ABBR", "股票名称", "证券简称"], "—")),
      q2Shares,
      q1Shares,
      deltaShares: explicitDelta ?? calculatedDelta,
      deltaPct: firstValue(item, ["deltaPct", "relativeChangePct", "relative_change_pct", "changePct", "增仓幅度", "持股增幅(%)"]),
      floatPct: firstValue(item, ["floatPct", "deltaFloatPct", "delta_float_pct", "floatSharePct", "增量占流通股比例", "占流通股比例(%)"]),
      categoryCount: integer(firstValue(item, ["categoryCount", "increasedCategoryCount", "category_count", "增仓机构类别数"], categories.length)),
      categories,
      currentReturnPct: firstValue(item, ["currentReturnPct", "returnSinceApr1Pct", "current_return_pct", "4月1日至今涨幅", "目前涨幅(%)"]),
      peakReturnPct: firstValue(item, ["peakReturnPct", "maxReturnSinceApr1Pct", "peak_return_pct", "期间最高涨幅", "最高涨幅(%)"]),
      screening: String(firstValue(item, ["screening", "screeningResult", "screening_result", "ruleStatus", "规则初筛", "初筛结论"], "通过")),
      evidence: String(firstValue(item, ["evidence", "capitalEventEvidence", "capital_event_evidence", "股本事件证据"], "")),
      isNew: truthyFlag(firstValue(item, ["isNew", "dailyNew", "daily_new", "newToday", "当日新增", "全部机构口径当日新增"], false))
    };
  }

  function categoryLabel(key, value) {
    const explicit = firstValue(value, ["label", "name", "category", "机构类型"]);
    const candidate = String(explicit || key || "未知类别");
    const normalized = candidate.toLowerCase().replace(/[\s_-]/g, "");
    const aliases = {
      all: "全部机构", total: "全部机构", allinstitution: "全部机构", allinstitutions: "全部机构",
      fund: "基金", funds: "基金", qfii: "QFII", socialsecurity: "社保", socialsecurityfund: "社保",
      broker: "券商", securities: "券商", insurance: "保险", trust: "信托", other: "其他机构", others: "其他机构"
    };
    return aliases[normalized] || candidate;
  }

  function normalizeCoverage(snapshot) {
    const source = firstValue(snapshot, ["coverage", "disclosureCoverage", "disclosure_coverage", "metadata.coverage", "meta.coverage"], {});
    const entries = [];
    if (Array.isArray(source)) {
      source.forEach((item, index) => entries.push([item.key || item.id || index, item]));
    } else if (source && typeof source === "object") {
      const nested = firstValue(source, ["categories", "items", "byCategory", "by_category"]);
      if (Array.isArray(nested)) nested.forEach((item, index) => entries.push([item.key || item.id || index, item]));
      else Object.entries(source).forEach(([key, value]) => {
        if (value && typeof value === "object") entries.push([key, value]);
      });
    }

    const normalized = entries.map(([key, value]) => {
      const currentCount = firstValue(value, ["currentCount", "q2Count", "current_count", "q2_count", "current", "2026Q2", "Q2", "本期数量"]);
      const previousCount = firstValue(value, ["previousCount", "q1Count", "previous_count", "q1_count", "previous", "2026Q1", "Q1", "上期数量"]);
      const explicitRatio = firstValue(value, ["ratio", "coverageRatio", "coverage_ratio", "percent", "覆盖率"]);
      return {
        key: String(key),
        label: categoryLabel(key, value),
        currentCount,
        previousCount,
        ratio: Number.isFinite(numeric(currentCount)) && numeric(previousCount) > 0
          ? numeric(currentCount) / numeric(previousCount)
          : numeric(explicitRatio),
        ratioIsFraction: Number.isFinite(numeric(currentCount)) && numeric(previousCount) > 0
          ? true
          : numeric(explicitRatio) !== null && Math.abs(numeric(explicitRatio)) <= 3,
        status: String(firstValue(value, ["status", "comparisonStatus", "comparison_status", "可比状态"], "披露中"))
      };
    });

    if (!normalized.some(item => item.label === "全部机构")) {
      const currentCount = firstValue(source, ["currentCount", "q2Count", "current_count", "q2_count", "q2StockCount", "q2_stock_count"]);
      const previousCount = firstValue(source, ["previousCount", "q1Count", "previous_count", "q1_count", "q1StockCount", "q1_stock_count"]);
      if (currentCount !== undefined || previousCount !== undefined) {
        normalized.push({
          key: "all",
          label: "全部机构",
          currentCount,
          previousCount,
          ratio: numeric(previousCount) > 0 ? numeric(currentCount) / numeric(previousCount) : null,
          ratioIsFraction: true,
          status: "披露中"
        });
      }
    }

    return normalized.sort((left, right) => {
      const leftIndex = CATEGORY_ORDER.indexOf(left.label);
      const rightIndex = CATEGORY_ORDER.indexOf(right.label);
      return (leftIndex < 0 ? 99 : leftIndex) - (rightIndex < 0 ? 99 : rightIndex);
    });
  }

  function normalizeSnapshot(payload) {
    const snapshot = unwrapSnapshot(payload);
    if (!snapshot) return null;
    const allCandidates = listFrom(snapshot, [
      "allInstitutionCandidates", "all_institution_candidates", "results.allInstitution", "results.all_institution",
      "candidates.allInstitution", "candidates.all_institution", "全部机构主结果"
    ]).map(normalizeCandidate);
    const multiCandidates = listFrom(snapshot, [
      "multiCategoryCandidates", "multi_category_candidates", "results.multiCategory", "results.multi_category",
      "candidates.multiCategory", "candidates.multi_category", "多机构共振结果"
    ]).map(normalizeCandidate);
    const added = listFrom(snapshot, ["added", "dailyAdded", "daily_added", "diff.added", "当日新增"]);
    const removed = listFrom(snapshot, ["removed", "dailyRemoved", "daily_removed", "diff.removed", "当日移出"]);
    return {
      raw: snapshot,
      generatedAt: firstValue(snapshot, ["generatedAt", "generated_at", "createdAt", "created_at", "metadata.generatedAt", "metadata.generated_at", "runMeta.generatedAt", "run_meta.generated_at"]),
      runDate: firstValue(snapshot, ["runDate", "run_date", "naturalRunDate", "natural_run_date", "metadata.runDate", "metadata.run_date"]),
      marketTradeDate: firstValue(snapshot, ["marketTradeDate", "market_trade_date", "effectiveMarketDate", "effective_market_date", "metadata.marketTradeDate", "metadata.market_trade_date"]),
      currentQuarter: String(firstValue(snapshot, ["currentQuarter", "current_quarter", "period.current", "quarter.current"], "2026Q2")),
      previousQuarter: String(firstValue(snapshot, ["previousQuarter", "previous_quarter", "period.previous", "quarter.previous"], "2026Q1")),
      source: String(firstValue(snapshot, ["source", "dataSource", "data_source", "metadata.source"], "东方财富公开数据")),
      disclosureInProgress: firstValue(snapshot, ["disclosureInProgress", "disclosure_in_progress", "metadata.disclosureInProgress"], true) !== false,
      stale: truthyFlag(firstValue(snapshot, ["stale", "isStale", "is_stale", "metadata.stale"], false)),
      coverage: normalizeCoverage(snapshot),
      allCandidates,
      multiCandidates,
      addedCount: integer(firstValue(snapshot, ["summary.newCount", "summary.new_count", "newCount", "new_count", "diff.addedCount", "diff.added_count"], added.length)),
      removedCount: integer(firstValue(snapshot, ["summary.removedCount", "summary.removed_count", "removedCount", "removed_count", "diff.removedCount", "diff.removed_count"], removed.length)),
      warning: String(firstValue(snapshot, ["warning", "dataWarning", "data_warning", "metadata.warning", "error"], ""))
    };
  }

  function normalizeJob(payload) {
    const value = payload?.data && typeof payload.data === "object" ? payload.data : payload || {};
    const rawStatus = String(firstValue(value, ["status", "state", "jobStatus", "job_status"], "running")).toLowerCase();
    const rawProgress = firstValue(value, ["progress.percent", "progress.pct", "progress", "percent", "percentage"], 0);
    let progress = numeric(rawProgress) || 0;
    if (progress > 0 && progress <= 1) progress *= 100;
    progress = Math.max(0, Math.min(100, progress));
    return {
      raw: value,
      status: STATUS_SUCCESS.has(rawStatus) ? "success" : STATUS_FAILED.has(rawStatus) ? "failed" : STATUS_RUNNING.has(rawStatus) ? "running" : rawStatus,
      progress,
      message: String(firstValue(value, ["message", "progress.message", "detail", "statusText", "status_text"], "正在采集并执行筛选…")),
      currentStock: String(firstValue(value, ["currentStock", "current_stock", "progress.currentStock", "progress.current_stock"], "")),
      retryCount: integer(firstValue(value, ["retryCount", "retry_count", "progress.retryCount", "progress.retry_count"], 0)),
      nextRetryAt: firstValue(value, ["nextRetryAt", "next_retry_at"]),
      error: String(firstValue(value, ["error", "errorMessage", "error_message", "failureReason", "failure_reason"], "")),
      snapshot: firstValue(value, ["snapshot", "result.snapshot", "result"])
    };
  }

  function renderRefreshIcon() {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5M18.5 9A7 7 0 006 7l-2 5M5.5 15A7 7 0 0018 17l2-5"/></svg>`;
  }

  function renderAIIcon() {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l1.45 4.05L17.5 9l-4.05 1.45L12 14.5l-1.45-4.05L6.5 9l4.05-1.45z"/><path d="M18.5 14.5l.78 2.22 2.22.78-2.22.78-.78 2.22-.78-2.22-2.22-.78 2.22-.78zM5.5 14l.58 1.67 1.67.58-1.67.58L5.5 18.5l-.58-1.67-1.67-.58 1.67-.58z"/></svg>`;
  }

  function renderCoverage(snapshot) {
    if (!snapshot.coverage.length) {
      return `<section class="ai-coverage-section" aria-labelledby="ai-coverage-title"><div class="ai-section-heading"><div><h3 id="ai-coverage-title">相对披露覆盖率</h3><p>当前快照未提供分类覆盖数量。</p></div></div><div class="ai-selection-state ai-selection-state-compact"><strong>覆盖率数据待补充</strong><p>候选结果仍可查看，但不能据此判断披露范围是否充分。</p></div></section>`;
    }
    return `
      <section class="ai-coverage-section" aria-labelledby="ai-coverage-title">
        <div class="ai-section-heading">
          <div><h3 id="ai-coverage-title">相对披露覆盖率</h3><p>Q2平台已返回股票数 ÷ Q1平台已返回股票数；不是监管披露完成率。</p></div>
        </div>
        <div class="ai-coverage-list">
          ${snapshot.coverage.map(item => {
            const ratioValue = Number.isFinite(item.ratio) ? (item.ratioIsFraction ? item.ratio * 100 : item.ratio) : null;
            const width = Number.isFinite(ratioValue) ? Math.max(2, Math.min(100, ratioValue)) : 0;
            return `
              <article class="ai-coverage-row">
                <div class="ai-coverage-label"><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.status)}</span></div>
                <div class="ai-coverage-track" ${Number.isFinite(ratioValue) ? `role="progressbar" aria-valuemin="0" aria-valuemax="${Math.max(100, Math.ceil(ratioValue))}" aria-valuenow="${ratioValue.toFixed(2)}" aria-label="${escapeHtml(item.label)}相对披露覆盖率"` : 'aria-hidden="true"'}>
                  <span style="width:${width}%"></span>
                </div>
                <div class="ai-coverage-value"><b>${formatInteger(item.currentCount)} / ${formatInteger(item.previousCount)}</b><small>${Number.isFinite(ratioValue) ? formatPercent(ratioValue) : "不可计算"}</small></div>
              </article>`;
          }).join("")}
        </div>
      </section>`;
  }

  function screeningClass(value) {
    if (/剔除|失败|不通过|excluded|failed|rejected/i.test(value)) return "excluded";
    if (/复核|未知|部分|review|pending|unknown|partial/i.test(value)) return "review";
    return "passed";
  }

  function directionClass(value) {
    const number = numeric(value);
    if (!Number.isFinite(number)) return "";
    return number >= 0 ? "positive" : "negative";
  }

  function renderCandidateTable(candidates, mode) {
    const label = mode === "all" ? "全部机构主结果" : "多机构共振结果";
    const q2Label = mode === "all" ? "Q2全部机构" : "Q2增仓类别合计";
    const q1Label = mode === "all" ? "Q1校正后全部机构" : "Q1校正后类别合计";
    if (!candidates.length) {
      return `<div class="ai-selection-state ai-selection-state-empty"><strong>当前没有${label}</strong><p>${mode === "all" ? "在已披露数据和现有排除规则下，暂未发现全部机构Q2持股高于Q1的股票。" : "暂未发现至少两个机构类别能够确认增仓的股票。"}</p></div>`;
    }
    return `
      <div class="ai-results-table-wrap" tabindex="0" aria-label="${label}，可横向滚动">
        <table class="ai-results-table">
          <caption>${label}</caption>
          <thead><tr>
            <th scope="col">股票</th>
            <th scope="col">${q2Label}</th>
            <th scope="col">${q1Label}</th>
            <th scope="col">校正后增量</th>
            <th scope="col">增幅</th>
            <th scope="col">占流通股</th>
            <th scope="col">增仓类别</th>
            <th scope="col">4月1日至今</th>
            <th scope="col">期间最高</th>
            <th scope="col">规则初筛</th>
          </tr></thead>
          <tbody>
            ${candidates.map(candidate => {
              const delta = numeric(candidate.deltaShares);
              const deltaClass = directionClass(candidate.deltaShares);
              const categoryText = candidate.categories.length ? candidate.categories.join("、") : candidate.categoryCount ? `${candidate.categoryCount}类` : "—";
              const code = candidate.code === "000000" && !firstValue(candidate.raw, ["code", "stockCode", "stock_code", "SECURITY_CODE", "股票代码", "证券代码"]) ? "" : candidate.code;
              return `
                <tr>
                  <th scope="row">
                    <a class="ai-stock-link" href="?stock=${encodeURIComponent(code)}">
                      <span>${escapeHtml(candidate.name)}</span><small>${escapeHtml(code || "代码缺失")}</small>
                    </a>
                    ${candidate.isNew ? `<b class="ai-new-badge">当日新增</b>` : ""}
                  </th>
                  <td class="ai-number">${formatShares(candidate.q2Shares)}</td>
                  <td class="ai-number">${formatShares(candidate.q1Shares)}</td>
                  <td class="ai-number ${deltaClass}">${Number.isFinite(delta) && delta > 0 ? "+" : ""}${formatShares(candidate.deltaShares)}</td>
                  <td class="ai-number ${directionClass(candidate.deltaPct)}">${formatPercent(candidate.deltaPct, { signed: true })}</td>
                  <td class="ai-number">${formatPercent(candidate.floatPct)}</td>
                  <td><span class="ai-category-count">${candidate.categoryCount || "—"}</span><small class="ai-category-names" title="${escapeHtml(categoryText)}">${escapeHtml(categoryText)}</small></td>
                  <td class="ai-number ${directionClass(candidate.currentReturnPct)}">${formatPercent(candidate.currentReturnPct, { signed: true })}</td>
                  <td class="ai-number ${directionClass(candidate.peakReturnPct)}">${formatPercent(candidate.peakReturnPct, { signed: true })}</td>
                  <td><span class="ai-screening-status ${screeningClass(candidate.screening)}">${escapeHtml(candidate.screening)}</span>${candidate.evidence ? `<small class="ai-evidence" title="${escapeHtml(candidate.evidence)}">${escapeHtml(candidate.evidence)}</small>` : ""}</td>
                </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>`;
  }

  class AISelectionPage {
    constructor(provider, onChange) {
      this.provider = provider;
      this.onChange = typeof onChange === "function" ? onChange : () => {};
      this.state = {
        activeTab: "all",
        snapshot: null,
        phase: "idle",
        error: "",
        job: null
      };
      this.snapshotRequested = false;
      this.pollTimer = null;
    }

    mount() {
      if (!this.snapshotRequested) void this.loadSnapshot();
    }

    notify() {
      this.onChange();
    }

    async loadSnapshot(options = {}) {
      this.snapshotRequested = true;
      if (!this.provider || typeof this.provider.getSnapshot !== "function") {
        this.state.phase = "error";
        this.state.error = "AI选股数据服务尚未接通。请确认页面已加载数据提供模块。";
        this.notify();
        return;
      }
      if (!options.silent) {
        this.state.phase = this.state.snapshot ? "ready" : "loading";
        this.state.error = "";
        this.notify();
      }
      try {
        const payload = await Promise.resolve(this.provider.getSnapshot());
        this.state.snapshot = normalizeSnapshot(payload);
        this.state.phase = "ready";
        this.state.error = "";
      } catch (error) {
        this.state.phase = "error";
        this.state.error = `读取最近快照失败：${error?.message || "服务暂不可用"}`;
      }
      this.notify();
    }

    stopPolling() {
      if (this.pollTimer) global.clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }

    schedulePoll(taskId, delay = 2500) {
      this.stopPolling();
      this.pollTimer = global.setTimeout(() => void this.pollStatus(taskId), delay);
    }

    async startRefresh() {
      if (!this.provider || typeof this.provider.startRefresh !== "function") {
        this.state.phase = "error";
        this.state.error = "刷新服务尚未接通，无法启动机构持仓采集。";
        this.notify();
        return;
      }
      this.stopPolling();
      this.state.phase = "refreshing";
      this.state.error = "";
      this.state.job = { status: "running", progress: 0, message: "正在创建全市场筛选任务…", currentStock: "", retryCount: 0 };
      this.notify();
      try {
        const payload = await Promise.resolve(this.provider.startRefresh());
        const value = payload?.data && typeof payload.data === "object" ? payload.data : payload || {};
        const taskId = firstValue(value, ["taskId", "task_id", "id"]);
        const immediateSnapshot = firstValue(value, ["snapshot", "result.snapshot"]);
        if (immediateSnapshot) {
          this.state.snapshot = normalizeSnapshot(immediateSnapshot);
          this.state.phase = "ready";
          this.state.job = { status: "success", progress: 100, message: "筛选已完成", currentStock: "", retryCount: 0 };
          this.notify();
          return;
        }
        if (!taskId) throw new Error("刷新接口未返回任务ID");
        this.state.job = { ...this.state.job, taskId: String(taskId), message: "任务已启动，正在采集东方财富披露数据…" };
        this.notify();
        this.schedulePoll(String(taskId));
      } catch (error) {
        this.state.phase = "error";
        this.state.error = `启动刷新失败：${error?.message || "服务暂不可用"}`;
        this.state.job = { ...this.state.job, status: "failed", message: this.state.error };
        this.notify();
      }
    }

    async pollStatus(taskId) {
      if (!this.provider || typeof this.provider.getStatus !== "function") {
        this.state.phase = "error";
        this.state.error = "任务状态接口不可用；后台任务可能仍在运行，请稍后重新载入快照。";
        this.notify();
        return;
      }
      try {
        const payload = await Promise.resolve(this.provider.getStatus(taskId));
        const job = normalizeJob(payload);
        this.state.job = { ...job, taskId };
        if (job.status === "success") {
          this.stopPolling();
          if (job.snapshot) this.state.snapshot = normalizeSnapshot(job.snapshot);
          this.state.phase = "ready";
          this.state.error = "";
          this.notify();
          if (!job.snapshot) await this.loadSnapshot({ silent: true });
          return;
        }
        if (job.status === "failed") {
          this.stopPolling();
          this.state.phase = "error";
          this.state.error = `本次刷新失败：${job.error || job.message || "后台采集未成功"}。旧快照未被覆盖。`;
          this.notify();
          return;
        }
        this.state.phase = "refreshing";
        this.notify();
        this.schedulePoll(taskId, job.raw?.status === "retry_wait" ? 60000 : 2500);
      } catch (error) {
        this.state.phase = "error";
        this.state.error = `查询任务状态失败：${error?.message || "服务暂不可用"}。后台任务可能仍在运行。`;
        this.notify();
      }
    }

    handleAction(target) {
      const action = target?.dataset?.action;
      if (action === "select-ai-selection-tab") {
        this.state.activeTab = target.dataset.tab === "multi" ? "multi" : "all";
        return true;
      }
      if (action === "refresh-ai-selection") {
        void this.startRefresh();
        return "async";
      }
      if (action === "reload-ai-selection") {
        void this.loadSnapshot();
        return "async";
      }
      return false;
    }

    renderHeader(snapshot) {
      const phase = this.state.phase;
      const running = phase === "refreshing";
      const statusLabel = running ? "任务运行中" : phase === "error" ? "最近刷新异常" : snapshot ? "最近快照可用" : "等待数据";
      return `
        <header class="ai-selection-header">
          <div class="ai-selection-title-mark">${renderAIIcon()}</div>
          <div class="ai-selection-title">
            <h2>AI选股</h2>
            <p>机构持仓披露信号工作台</p>
            <span>${escapeHtml(snapshot?.currentQuarter || "2026Q2")} 对 ${escapeHtml(snapshot?.previousQuarter || "2026Q1")} · 全部机构主结果与多机构共振</span>
          </div>
          <div class="ai-selection-header-action">
            <span class="ai-job-chip phase-${escapeHtml(phase)}"><i></i>${escapeHtml(statusLabel)}</span>
            <button class="ai-refresh-button ${running ? "refreshing" : ""}" type="button" data-action="refresh-ai-selection" ${running ? "disabled" : ""}>
              ${renderRefreshIcon()}<span>${running ? "执行中" : "刷新AI选股"}</span>
            </button>
          </div>
        </header>`;
    }

    renderJobStatus() {
      const { job } = this.state;
      if (this.state.phase !== "refreshing" || !job) return "";
      const details = [
        job.currentStock ? `当前 ${job.currentStock}` : "",
        job.retryCount ? `已重试 ${job.retryCount} 次` : "",
        job.nextRetryAt ? `下次重试 ${formatDateTime(job.nextRetryAt)}` : ""
      ].filter(Boolean).join(" · ");
      return `
        <section class="ai-job-progress" aria-live="polite">
          <div class="ai-job-progress-copy"><strong>${escapeHtml(job.message || "正在执行全市场筛选…")}</strong><span>${escapeHtml(details || "采集、校正和规则筛选将在后台依次完成")}</span></div>
          <div class="ai-job-progress-meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(job.progress || 0)}"><span style="width:${Math.max(2, job.progress || 0)}%"></span></div>
          <b>${Math.round(job.progress || 0)}%</b>
        </section>`;
    }

    renderSnapshotNotice(snapshot) {
      const notices = [];
      if (this.state.error) notices.push(`<div class="ai-data-notice error" role="alert"><strong>${escapeHtml(this.state.error)}</strong><button type="button" data-action="reload-ai-selection">重新读取快照</button></div>`);
      if (snapshot?.stale) notices.push(`<div class="ai-data-notice warning"><strong>当前显示历史成功快照</strong><span>刷新失败不会覆盖旧结果，请以页面上的抓取时间为准。</span></div>`);
      if (snapshot?.warning) notices.push(`<div class="ai-data-notice warning"><strong>数据提示</strong><span>${escapeHtml(snapshot.warning)}</span></div>`);
      return notices.join("");
    }

    renderSnapshotMeta(snapshot) {
      return `
        <section class="ai-snapshot-meta" aria-label="AI选股数据时间与来源">
          <div><span>自然运行日</span><strong>${escapeHtml(snapshot.runDate || "—")}</strong></div>
          <div><span>有效交易日</span><strong>${escapeHtml(snapshot.marketTradeDate || "—")}</strong></div>
          <div><span>最近成功快照</span><strong>${formatDateTime(snapshot.generatedAt)}</strong></div>
          <div><span>数据来源</span><strong>${escapeHtml(snapshot.source)}</strong></div>
          <p><b>${snapshot.disclosureInProgress ? "Q2仍在披露中" : "披露状态以来源为准"}</b>。未出现的机构类别按“未知”处理，不按零持仓计算；页面结果属于平台披露口径，不等同于实时净买入。</p>
        </section>`;
    }

    renderSummary(snapshot) {
      const overallCoverage = snapshot.coverage.find(item => item.label === "全部机构") || snapshot.coverage[0];
      const coveragePct = overallCoverage && Number.isFinite(overallCoverage.ratio)
        ? (overallCoverage.ratioIsFraction ? overallCoverage.ratio * 100 : overallCoverage.ratio)
        : null;
      return `
        <section class="ai-summary-grid" aria-label="AI选股结果摘要">
          <article><span>全部机构主结果</span><strong>${snapshot.allCandidates.length.toLocaleString("zh-CN")}</strong><small>Q2全部机构持股高于Q1</small></article>
          <article><span>多机构共振</span><strong>${snapshot.multiCandidates.length.toLocaleString("zh-CN")}</strong><small>至少2个机构类别确认增仓</small></article>
          <article><span>当日变化</span><strong>+${snapshot.addedCount}</strong><small>新增 ${snapshot.addedCount} · 移出 ${snapshot.removedCount}</small></article>
          <article><span>全部机构相对覆盖</span><strong>${Number.isFinite(coveragePct) ? formatPercent(coveragePct) : "—"}</strong><small>${overallCoverage ? `${formatInteger(overallCoverage.currentCount)} / ${formatInteger(overallCoverage.previousCount)} 只` : "等待覆盖数据"}</small></article>
        </section>`;
    }

    renderResults(snapshot) {
      const active = this.state.activeTab;
      const candidates = active === "multi" ? snapshot.multiCandidates : snapshot.allCandidates;
      return `
        <section class="ai-results-section" aria-labelledby="ai-results-title">
          <div class="ai-results-heading">
            <div><h3 id="ai-results-title">筛选结果</h3><p>${active === "all" ? "全部机构汇总持股经股本事件校正后增加，并通过既定排除规则。" : "QFII、社保、券商、保险、信托、其他机构中，至少2个类别能够确认增仓。"}</p></div>
            <div class="ai-results-tabs" aria-label="AI选股结果口径">
              <button type="button" aria-pressed="${active === "all"}" class="${active === "all" ? "selected" : ""}" data-action="select-ai-selection-tab" data-tab="all">全部机构 <b>${snapshot.allCandidates.length}</b></button>
              <button type="button" aria-pressed="${active === "multi"}" class="${active === "multi" ? "selected" : ""}" data-action="select-ai-selection-tab" data-tab="multi">≥2类共振 <b>${snapshot.multiCandidates.length}</b></button>
            </div>
          </div>
          ${renderCandidateTable(candidates, active)}
        </section>`;
    }

    render() {
      const snapshot = this.state.snapshot;
      const header = this.renderHeader(snapshot);
      if (!snapshot && ["idle", "loading"].includes(this.state.phase)) {
        return `<section class="ai-selection-page">${header}<div class="ai-selection-state ai-selection-state-loading" aria-live="polite"><span class="ai-loading-mark">${renderAIIcon()}</span><strong>正在读取最近一次成功快照</strong><p>读取完成后将显示披露覆盖率和两套机构增仓结果。</p></div></section>`;
      }
      if (!snapshot) {
        return `<section class="ai-selection-page">${header}${this.renderJobStatus()}${this.renderSnapshotNotice(null)}<div class="ai-selection-state ai-selection-state-empty"><strong>暂无可展示的成功快照</strong><p>连接数据服务后点击“刷新AI选股”，任务完成时结果会出现在这里。</p><button type="button" data-action="reload-ai-selection">重新读取</button></div></section>`;
      }
      return `
        <section class="ai-selection-page">
          ${header}
          ${this.renderJobStatus()}
          ${this.renderSnapshotNotice(snapshot)}
          ${this.renderSnapshotMeta(snapshot)}
          ${this.renderSummary(snapshot)}
          ${this.renderResults(snapshot)}
          ${renderCoverage(snapshot)}
        </section>`;
    }
  }

  global.AIStockSelectionPage = {
    create(provider, onChange) {
      return new AISelectionPage(provider, onChange);
    }
  };
})(window);
