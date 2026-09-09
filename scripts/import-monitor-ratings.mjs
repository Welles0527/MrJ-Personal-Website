import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const dimensions = [
  ["fundamentals", "基本面"], ["institution", "机构"], ["chips", "筹码"],
  ["capital", "资金面"], ["risk", "风险事项"], ["overall", "综合"]
];
const prefix = "window.STOCK_MONITOR_RATINGS = ";
const sources = {
  "6a9294d2-ca1c-83ec-a637-b1b8388a418a": ["688633", "星球石墨", "星球石墨监控"],
  "6a8809b8-351c-83ee-a818-8ed768f014df": ["301026", "浩通科技", "浩通科技每日监控"],
  "6a7e0008-23c8-83e9-8836-806ed56cd63a": ["603507", "振江股份", "振江股份每日监控"],
  "6a9929cf-4fd0-83ec-ad04-21df9042b7e7": ["300871", "回盛生物", "回盛生物每日监控"]
};
const clean = value => value.replace(/\uE200[^\uE201]*\uE201/g, "").replace(/\*\*/g, "").trim();

export function parseMonitor(input, now = new Date()) {
  const source = sources[input.threadId];
  if (!source || input.sourceTitle !== source[2] || !input.messageId) throw new Error("Unexpected monitor source");
  const [code, name] = source;
  const text = String(input.text || "");
  const title = text.trimStart().split("\n")[0];
  const date = title.match(new RegExp(`^#{1,6}\\s*${name}[^\\n｜|]*[｜|]\\s*(\\d{4})年(\\d{1,2})月(\\d{1,2})日`));
  if (!date) throw new Error("Missing report date or stock identity");
  const reportDate = `${date[1]}-${date[2].padStart(2, "0")}-${date[3].padStart(2, "0")}`;
  const parsedDate = new Date(reportDate);
  if (!Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== reportDate || reportDate > now.toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" })) throw new Error("Invalid report date");
  const section = text.match(/^#{1,6}\s*(?:\d+[.、．]\s*)?今日(?:红绿灯)?综合评级\s*\n([\s\S]*?)(?=^#{1,6}\s*(?:\d+[.、．]\s*)?今日结论|(?![\s\S]))/m)?.[1];
  if (!section) throw new Error("Missing complete rating section");
  const normalized = clean(section).replace(/^#{1,6}\s*(?=综合[：:])/gm, "").replace(/^---\s*$/gm, "").trim();
  const expected = code === "300871" ? [dimensions[0], dimensions[1], dimensions[2], ["financial", "财务质量"], ["industry", "行业景气"], dimensions[4], ["capital", "量价资金"], dimensions[5]] : dimensions;
  const matches = [...(normalized + "\n").matchAll(/^(基本面|机构|筹码|资金面|量价资金|财务质量|行业景气|风险事项|综合)[：:]\s*([🟢🔴🟡])([^\n]*)\n([\s\S]*?)(?=^(?:基本面|机构|筹码|资金面|量价资金|财务质量|行业景气|风险事项|综合)[：:]|(?![\s\S]))/gmu)];
  if (matches.length !== expected.length || new Set(matches.map(item => item[1])).size !== expected.length) throw new Error("Complete unique ratings are required");
  const rows = expected.map(([id, label]) => {
    const match = matches.find(item => item[1] === label);
    if (!match) throw new Error(`Missing ${label} rating`);
    const header = match[3].match(/^(.*?)\s*[｜|]\s*较昨日[：:]\s*(.+)$/);
    if (!header) throw new Error(`Incomplete ${label} rating`);
    const [rating, ...inlineReason] = header[1].split("——");
    const evidence = clean([inlineReason.join("——"), match[4]].filter(Boolean).join("\n"));
    if (!evidence && id !== "overall") throw new Error(`Incomplete ${label} rating`);
    return { id, label, tone: { "🟢": "positive", "🔴": "negative", "🟡": "neutral" }[match[2]], rating: rating.trim() || { "🟢": "偏积极", "🔴": "偏消极", "🟡": "中性" }[match[2]], comparison: header[2].trim(), evidence: evidence || "原文未单列理由" };
  });
  return { code, name, reportDate, sourceTitle: input.sourceTitle, syncedAt: now.toISOString(), sourceDigest: createHash("sha256").update(reportDate + normalized).digest("hex"), rows };
}

export function importMonitor(input, target, now) {
  const report = parseMonitor(input, now);
  const current = fs.existsSync(target) ? JSON.parse(fs.readFileSync(target, "utf8").trim().slice(prefix.length).replace(/;$/, "")) : { schemaVersion: 1, stocks: {} };
  const previous = current.stocks[report.code];
  if (previous?.reportDate > report.reportDate) throw new Error("Refusing an older report");
  if (previous?.sourceDigest === report.sourceDigest) return false;
  current.stocks[report.code] = report;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target + ".tmp", prefix + JSON.stringify(current, null, 2) + ";\n");
  fs.renameSync(target + ".tmp", target);
  return true;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
  const target = path.resolve("public/stock-tracking/daily-monitor-ratings.js");
  const changed = importMonitor(input, target);
  const digest = createHash("sha256").update(fs.readFileSync(target)).digest("hex").slice(0, 12);
  const entry = path.resolve("src/pages/stock-tracking/index.astro");
  const before = fs.readFileSync(entry, "utf8");
  const after = before.replace(/daily-monitor-ratings\.js\?v=[^"\s]+/, `daily-monitor-ratings.js?v=monitor-${digest}`);
  if (before !== after) fs.writeFileSync(entry, after);
  console.log(changed ? "Updated monitor ratings" : "Unchanged monitor ratings");
}
