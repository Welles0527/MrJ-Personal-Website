import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const dimensions = [
  ["fundamentals", "基本面"], ["institution", "机构"], ["chips", "筹码"],
  ["capital", "资金面"], ["risk", "风险事项"], ["overall", "综合"]
];
const prefix = "window.STOCK_MONITOR_RATINGS = ";
const clean = value => value.replace(/\uE200[^\uE201]*\uE201/g, "").replace(/\*\*/g, "").trim();

export function parseMonitor(input, now = new Date()) {
  if (input.threadId !== "6a9294d2-ca1c-83ec-a637-b1b8388a418a" || input.sourceTitle !== "星球石墨监控" || !input.messageId) throw new Error("Unexpected monitor source");
  const text = String(input.text || "");
  const date = text.match(/^##\s*星球石墨[｜|]\s*(\d{4})年(\d{1,2})月(\d{1,2})日/m);
  if (!date) throw new Error("Missing report date or stock identity");
  const reportDate = `${date[1]}-${date[2].padStart(2, "0")}-${date[3].padStart(2, "0")}`;
  const parsedDate = new Date(reportDate);
  if (!Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== reportDate || reportDate > now.toLocaleDateString("sv-SE", { timeZone: "Asia/Shanghai" })) throw new Error("Invalid report date");
  const section = text.match(/^#{1,6}\s*6[.、．]\s*今日综合评级\s*\n([\s\S]*?)(?=^#{1,6}\s*7[.、．]|(?![\s\S]))/m)?.[1];
  if (!section) throw new Error("Missing complete rating section");
  const normalized = clean(section);
  const matches = [...normalized.matchAll(/^(基本面|机构|筹码|资金面|风险事项|综合)[：:]\s*([🟢🔴🟡])([^\n]*)\n([\s\S]*?)(?=^(?:基本面|机构|筹码|资金面|风险事项|综合)[：:]|(?![\s\S]))/gmu)];
  if (matches.length !== 6 || new Set(matches.map(item => item[1])).size !== 6) throw new Error("Six unique ratings are required");
  const rows = dimensions.map(([id, label]) => {
    const match = matches.find(item => item[1] === label);
    const header = match[3].match(/^(.*?)\s*[｜|]\s*较昨日[：:]\s*(.+)$/);
    const evidence = clean(match[4]);
    if (!header || !evidence) throw new Error(`Incomplete ${label} rating`);
    return { id, label, tone: { "🟢": "positive", "🔴": "negative", "🟡": "neutral" }[match[2]], rating: header[1].trim() || { "🟢": "偏积极", "🔴": "偏消极", "🟡": "中性" }[match[2]], comparison: header[2].trim(), evidence };
  });
  return { code: "688633", name: "星球石墨", reportDate, sourceTitle: input.sourceTitle, syncedAt: now.toISOString(), sourceDigest: createHash("sha256").update(reportDate + normalized).digest("hex"), rows };
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
  const digest = parseMonitor(input).sourceDigest.slice(0, 12);
  const entry = path.resolve("src/pages/stock-tracking/index.astro");
  const before = fs.readFileSync(entry, "utf8");
  const after = before.replace(/daily-monitor-ratings\.js\?v=[^"\s]+/, `daily-monitor-ratings.js?v=monitor-${digest}`);
  if (before !== after) fs.writeFileSync(entry, after);
  console.log(changed ? "Updated monitor ratings" : "Unchanged monitor ratings");
}
