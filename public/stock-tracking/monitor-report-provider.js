"use strict";

(function () {
  const labels = {
    "688633": ["基本面", "机构", "筹码", "资金面", "风险事项", "综合"],
    "301026": ["基本面", "机构", "筹码", "资金面", "风险事项", "综合"],
    "603507": ["基本面", "机构", "筹码", "资金面", "风险事项", "综合"],
    "300871": ["基本面", "机构", "筹码", "财务质量", "行业景气", "风险事项", "量价资金", "综合"]
  };
  const ids = { 基本面: "fundamentals", 机构: "institution", 筹码: "chips", 资金面: "capital", 量价资金: "capital", 财务质量: "financial", 行业景气: "industry", 风险事项: "risk", 综合: "overall" };
  const status = {};
  let pending;

  function validate(report, code) {
    const expected = labels[code];
    if (!report || report.code !== code || !/^\d{4}-\d{2}-\d{2}$/.test(report.reportDate) ||
        !Number.isFinite(Date.parse(report.reportDate)) ||
        new Date(report.reportDate).toISOString().slice(0, 10) !== report.reportDate ||
        report.reportDate > new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" }) ||
        typeof report.sourceTitle !== "string" || !Number.isFinite(Date.parse(report.syncedAt)) ||
        !/^[a-f0-9]{64}$/.test(report.receipt) ||
        !Array.isArray(report.rows) || report.rows.length !== expected.length) throw new Error("Invalid report");
    const rows = expected.map(label => {
      const matches = report.rows.filter(row => row?.label === label);
      const row = matches[0];
      if (matches.length !== 1 || !["positive", "neutral", "negative"].includes(row.tone) ||
          !["rating", "comparison", "evidence"].every(key => typeof row[key] === "string" && row[key].length <= 5000)) throw new Error("Invalid rating");
      return { id: ids[label], label, tone: row.tone, rating: row.rating, comparison: row.comparison, evidence: row.evidence };
    });
    return { code, name: report.name, reportDate: report.reportDate, sourceTitle: report.sourceTitle, syncedAt: report.syncedAt, sourceDigest: report.sourceDigest, receipt: report.receipt, origin: "chatgpt-cloud", rows };
  }

  async function refresh() {
    if (pending) return pending;
    pending = Promise.all(Object.keys(labels).map(async code => {
      try {
        const response = await fetch("/api/stock-monitor-reports/reports/latest?code=" + code, {
          cache: "no-store", credentials: "omit", signal: AbortSignal.timeout(12000)
        });
        if (!response.ok) throw new Error("HTTP " + response.status);
        const value = await response.json();
        if (value.report === null) {
          status[code] = "后台尚未收到报告，暂保留此前已发布版本。";
          return;
        }
        const report = validate(value.report, code);
        const previous = window.STOCK_MONITOR_RATINGS?.stocks?.[code];
        if (previous?.reportDate > report.reportDate) throw new Error("Older report");
        window.STOCK_MONITOR_RATINGS ||= { schemaVersion: 1, stocks: {} };
        window.STOCK_MONITOR_RATINGS.stocks[code] = report;
        status[code] = "已从网站后台读取最新已保存报告。";
      } catch {
        status[code] = "云端报告读取失败，已保留上一份报告；请稍后重试。";
      }
    })).finally(() => { pending = null; });
    return pending;
  }
  window.StockMonitorReports = { refresh, status };
})();
