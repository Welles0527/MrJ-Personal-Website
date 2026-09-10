"use strict";

const { createHash } = require("node:crypto");
const SOURCES = {
  "688633": { name: "星球石墨", dimensions: ["基本面", "机构", "筹码", "资金面", "风险事项", "综合"] },
  "301026": { name: "浩通科技", dimensions: ["基本面", "机构", "筹码", "资金面", "风险事项", "综合"] },
  "603507": { name: "振江股份", dimensions: ["基本面", "机构", "筹码", "资金面", "风险事项", "综合"] },
  "300871": { name: "回盛生物", dimensions: ["基本面", "机构", "筹码", "财务质量", "行业景气", "风险事项", "量价资金", "综合"] }
};
const IDS = { 基本面: "fundamentals", 机构: "institution", 筹码: "chips", 资金面: "capital", 量价资金: "capital", 财务质量: "financial", 行业景气: "industry", 风险事项: "risk", 综合: "overall" };

function fail(message, status = 400) {
  throw Object.assign(new Error(message), { status });
}

function text(value, field, maximum, allowEmpty = false) {
  if (typeof value !== "string" || value.length > maximum || (!allowEmpty && !value.trim())) fail("Invalid " + field);
  return value.trim();
}

function validateReport(input, now = new Date()) {
  if (!input || typeof input !== "object" || Array.isArray(input)) fail("Invalid report");
  const source = Object.hasOwn(SOURCES, input.code) ? SOURCES[input.code] : null;
  if (!source || input.name !== source.name) fail("Unknown stock");
  const reportDate = text(input.reportDate, "reportDate", 10);
  const date = new Date(reportDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(reportDate) || !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== reportDate ||
      reportDate > now.toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" })) fail("Invalid report date");
  if (!Array.isArray(input.rows) || input.rows.length !== source.dimensions.length) fail("Incomplete ratings");
  if (new Set(input.rows.map(row => row?.label)).size !== source.dimensions.length) fail("Duplicate ratings");
  const rows = source.dimensions.map(label => {
    const row = input.rows.find(value => value?.label === label);
    if (!row || !["positive", "neutral", "negative"].includes(row.tone)) fail("Invalid rating: " + label);
    return {
      id: IDS[label], label, tone: row.tone,
      rating: text(row.rating, "rating", 100),
      comparison: text(row.comparison, "comparison", 300),
      evidence: text(row.evidence, "evidence", 5000, label === "综合") || "原文未单列理由"
    };
  });
  // Only the approved conclusions are stored; arbitrary chat content is excluded.
  const report = { code: input.code, name: source.name, reportDate, rows };
  return { ...report, sourceDigest: createHash("sha256").update(JSON.stringify(report)).digest("hex") };
}

// The production repository must provide a durable, serializable transaction.
// No in-process cache is used as authoritative report storage.
function createReportService({ repository, writerId, now = () => new Date() }) {
  if (!repository?.transaction || !repository?.latest || !writerId) throw new Error("Persistent repository and writer required");
  return {
    async save(input, principal) {
      if (!principal || principal.subject !== writerId || !principal.scopes?.includes("reports:write")) fail("Forbidden", 403);
      const report = validateReport(input, now());
      const key = report.code + ":" + report.reportDate;
      return repository.transaction(async tx => {
        const latest = await tx.latest(report.code);
        if (latest?.reportDate > report.reportDate) fail("Older report rejected", 409);
        if (latest?.sourceDigest === report.sourceDigest) {
          return { saved: false, code: report.code, reportDate: report.reportDate, receipt: latest.receipt };
        }
        // A changed same-day conclusion must not silently replace a completed report.
        if (latest?.reportDate === report.reportDate) fail("Conflicting report for this date", 409);
        const stored = {
          ...report, sourceTitle: sourceTitle(report.code), syncedAt: now().toISOString(),
          receipt: report.sourceDigest, origin: "chatgpt-cloud"
        };
        await tx.insert(key, stored);
        await tx.setLatest(report.code, stored);
        return { saved: true, code: report.code, reportDate: report.reportDate, receipt: stored.receipt };
      });
    },
    async latest(code) {
      if (!Object.hasOwn(SOURCES, code)) fail("Unknown stock");
      return await repository.latest(code) || null;
    }
  };
}

function sourceTitle(code) {
  return SOURCES[code].name + "云端每日监控";
}

const SAVE_TOOL = {
  name: "save_stock_monitor_report",
  description: "保存当前已完成的云端个股监控评级。必须逐项复制原报告颜色、文字和日期，不重新打分；成功时返回保存回执。",
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  securitySchemes: [{ type: "oauth2", scopes: ["reports:write"] }],
  inputSchema: {
    type: "object", additionalProperties: false, required: ["code", "name", "reportDate", "rows"],
    properties: {
      code: { type: "string", enum: Object.keys(SOURCES) },
      name: { type: "string", maxLength: 20 },
      reportDate: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
      rows: {
        type: "array", minItems: 6, maxItems: 8,
        items: {
          type: "object", additionalProperties: false,
          required: ["label", "tone", "rating", "comparison", "evidence"],
          properties: {
            label: { type: "string", enum: Object.keys(IDS) },
            tone: { type: "string", enum: ["positive", "neutral", "negative"] },
            rating: { type: "string", minLength: 1, maxLength: 100 },
            comparison: { type: "string", minLength: 1, maxLength: 300 },
            evidence: { type: "string", maxLength: 5000 }
          }
        }
      }
    }
  }
};

module.exports = { SOURCES, SAVE_TOOL, validateReport, createReportService };
