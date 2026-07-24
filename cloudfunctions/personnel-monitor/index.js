"use strict";

const http = require("http");
const https = require("https");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store"
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8", ...CORS_HEADERS });
  res.end(JSON.stringify(data));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", chunk => {
      raw += chunk;
      if (raw.length > 128 * 1024) reject(new Error("Request body is too large"));
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch { reject(new Error("Invalid JSON body")); }
    });
    req.on("error", reject);
  });
}

function fetchText(url, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36" }
    }, response => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        fetchText(new URL(response.headers.location, url).toString(), timeoutMs).then(resolve, reject);
        return;
      }
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`Upstream returned ${response.statusCode}`));
        return;
      }
      response.setEncoding("utf8");
      let body = "";
      response.on("data", chunk => {
        body += chunk;
        if (body.length > 4 * 1024 * 1024) request.destroy(new Error("Upstream response is too large"));
      });
      response.on("end", () => resolve(body));
    });
    request.setTimeout(timeoutMs, () => request.destroy(new Error("Upstream request timed out")));
    request.on("error", reject);
  });
}

function decodeEntities(value) {
  return String(value || "")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function cleanHtml(value) {
  return decodeEntities(String(value || "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function parseManagerHistory(html, managerId) {
  const rows = [];
  for (const match of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...match[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(item => item[1]);
    if (cells.length < 8) continue;
    const code = cells[0].match(/fund\.eastmoney\.com\/(\d{6})\.html/i)?.[1];
    const period = cleanHtml(cells[5]);
    const dates = period.match(/(\d{4}-\d{2}-\d{2})\s*[~～至-]+\s*(至今|\d{4}-\d{2}-\d{2})/);
    if (!code || !dates) continue;
    rows.push({
      manager_id: managerId,
      fund_code: code,
      fund_name: cleanHtml(cells[1]) || code,
      start_date: dates[1],
      end_date: dates[2] === "至今" ? null : dates[2],
      is_current: dates[2] === "至今"
    });
  }
  const unique = new Map(rows.map(row => [`${row.fund_code}:${row.start_date}`, row]));
  return [...unique.values()];
}

function parseCurrentManagers(script, currentManagerId) {
  const source = script.match(/Data_currentFundManager\s*=\s*(\[[\s\S]*?\])\s*;/)?.[1];
  if (!source) return [];
  try {
    return JSON.parse(source)
      .map(item => ({ id: String(item.id || ""), name: String(item.name || "").trim() }))
      .filter(item => /^\d+$/.test(item.id) && item.name && item.id !== currentManagerId);
  } catch {
    return [];
  }
}

async function loadCoManagers(fundCodes, managerId) {
  const results = await Promise.allSettled(fundCodes.slice(0, 20).map(async code => {
    const script = await fetchText(`https://fund.eastmoney.com/pingzhongdata/${code}.js?v=${Date.now()}`);
    return parseCurrentManagers(script, managerId);
  }));
  const managers = new Map();
  results.forEach(result => {
    if (result.status !== "fulfilled") return;
    result.value.forEach(manager => managers.set(manager.id, manager));
  });
  return [...managers.values()];
}

async function monitorManager(managerId) {
  const managerUrl = `https://fund.eastmoney.com/manager/${managerId}.html`;
  const html = await fetchText(managerUrl);
  const history = parseManagerHistory(html, managerId);
  if (!history.length) throw new Error("经理页面未返回可识别的基金关系");
  const current = history.filter(item => item.is_current);
  const currentFunds = current.map(item => ({ code: item.fund_code, name: item.fund_name }));
  const coManagers = await loadCoManagers(currentFunds.map(item => item.code), managerId);
  const now = new Date().toISOString();
  const suspected = currentFunds.length === 0;
  return {
    manager_id: managerId,
    current_funds: currentFunds,
    co_managers: coManagers,
    news: [],
    timeline: history.sort((a, b) => String(b.end_date || b.start_date).localeCompare(String(a.end_date || a.start_date))).slice(0, 10).map(item => ({
      date: item.end_date || item.start_date,
      title: `${item.is_current ? "开始管理" : "历史任职"} ${item.fund_name}`,
      detail: `${item.start_date} 至 ${item.end_date || "至今"}`,
      source: "东方财富经理页面",
      url: managerUrl,
      kind: "relationship"
    })),
    relationship_time: now,
    news_time: null,
    refresh_time: now,
    source_status: "live",
    manager_url: managerUrl,
    status: suspected ? "suspected_departure" : "unchanged",
    status_label: suspected ? "疑似离任" : "暂无变化",
    latest_change: {
      date: now.slice(0, 10),
      title: suspected ? "未发现当前管理产品，需结合基金公司公告核验" : "当前产品关系已刷新",
      kind: suspected ? "critical" : "stable"
    },
    changes: { funds_added: [], funds_removed: [], co_managers_added: [], co_managers_removed: [], news_added: [] },
    error: null
  };
}

async function handleMonitor(body) {
  const ids = [...new Set((Array.isArray(body.manager_ids) ? body.manager_ids : [])
    .map(value => String(value))
    .filter(value => /^\d+$/.test(value)))].slice(0, 50);
  if (!ids.length) throw new Error("manager_ids must contain at least one numeric manager ID");
  const settled = await Promise.allSettled(ids.map(monitorManager));
  const records = settled.map((result, index) => result.status === "fulfilled" ? result.value : {
    manager_id: ids[index], status: "unchanged", status_label: "需要核验", current_funds: [], co_managers: [], news: [], timeline: [],
    relationship_time: null, news_time: null, refresh_time: new Date().toISOString(), source_status: "partial",
    latest_change: { date: new Date().toISOString().slice(0, 10), title: "公开页面刷新失败", kind: "warning" },
    changes: { funds_added: [], funds_removed: [], co_managers_added: [], co_managers_removed: [], news_added: [] }, error: result.reason?.message || "Unknown error"
  });
  return {
    schema_version: "personnel-monitor-v1.0.0",
    generated_at: new Date().toISOString(),
    refresh: body.refresh === true,
    source: "东方财富基金经理与基金公开页面",
    records
  };
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }
  const pathname = new URL(req.url || "/", "http://127.0.0.1").pathname;
  if (pathname === "/health" && req.method === "GET") {
    sendJson(res, 200, { ok: true });
    return;
  }
  if ((pathname === "/" || pathname === "/api/personnel-monitor") && req.method === "POST") {
    try {
      sendJson(res, 200, await handleMonitor(await readJsonBody(req)));
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }
  sendJson(res, pathname === "/" || pathname === "/api/personnel-monitor" ? 405 : 404, { error: pathname === "/" || pathname === "/api/personnel-monitor" ? "Method Not Allowed" : "Not Found" });
});

if (require.main === module) server.listen(9000);

module.exports = { cleanHtml, parseManagerHistory, parseCurrentManagers, handleMonitor };
