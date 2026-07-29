"use strict";

const https = require("https");

const QUOTE_ENDPOINT = "https://push2.eastmoney.com/api/qt/stock/get";
const ANNOUNCEMENT_ENDPOINT = "https://np-anotice-stock.eastmoney.com/api/security/ann";
const NEWS_ENDPOINT = "https://search-api-web.eastmoney.com/search/jsonp";
const CACHE = new Map();
const CACHE_TTL = {
  quote: 10 * 1000,
  announcements: 2 * 60 * 1000,
  news: 5 * 60 * 1000
};

function marketIdFor(code) {
  return /^(5|6|9)/.test(code) ? "1" : "0";
}

function scaled(value, divisor = 1) {
  const number = Number(value);
  return Number.isFinite(number) ? number / divisor : null;
}

function plainText(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function compactText(value, limit = 180) {
  const text = plainText(value);
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

function shanghaiIsoFromUnix(value) {
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return new Date().toISOString();
  const date = new Date(timestamp * 1000);
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(date);
  const part = type => parts.find(item => item.type === type)?.value || "00";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}:${part("second")}+08:00`;
}

function normalizeDate(value) {
  const text = String(value || "").trim();
  if (!text) return new Date().toISOString();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(?::\d{2})?$/.test(text)) {
    return `${text.replace(" ", "T")}${text.length === 16 ? ":00" : ""}+08:00`;
  }
  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) return text;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function importanceFromTitle(title) {
  if (/(重大|处罚|诉讼|立案|退市|停牌|复牌|减持|质押|回购|业绩预告|控制权|风险警示)/.test(title)) return "高";
  if (/(公告|订单|合同|项目|融资|解禁|大宗交易|机构|业绩|财报)/.test(title)) return "中";
  return "低";
}

function sentimentFromTitle(title) {
  if (/(增长|中标|签订|回购|增持|扭亏|突破|上涨|提价|扩产|净流入)/.test(title)) return "利好";
  if (/(下降|亏损|处罚|诉讼|减持|质押|跌破|风险|终止|下跌|死叉|净流出)/.test(title)) return "利空";
  return "中性";
}

function categoryFromNews(title, content) {
  const text = `${title} ${content}`;
  return /(行业|板块|黄金|白银|贵金属|铂|钯|原材料|政策|供需|概念股)/.test(text)
    ? "industry"
    : "company";
}

function allowedOrigin(origin) {
  if (!origin) return "";
  try {
    const url = new URL(origin);
    if (url.hostname === "www.magicj.cn" || url.hostname === "magicj.cn") return origin;
    if ((url.hostname === "127.0.0.1" || url.hostname === "localhost") && url.protocol === "http:") return origin;
  } catch {
    return "";
  }
  return "";
}

function corsHeaders(originHeader) {
  const origin = allowedOrigin(originHeader);
  return {
    ...(origin ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

function jsonResponse(origin, statusCode, data, cacheControl = "no-store") {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": cacheControl,
      ...corsHeaders(origin)
    },
    body: JSON.stringify(data),
    isBase64Encoded: false
  };
}

function requestText(url, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      headers: {
        "Accept": "application/json,text/plain,*/*",
        "Referer": "https://quote.eastmoney.com/",
        "User-Agent": "Mozilla/5.0 (compatible; MagicJStockTracking/1.0)"
      }
    }, response => {
      response.setEncoding("utf8");
      let body = "";
      response.on("data", chunk => {
        body += chunk;
        if (body.length > 1024 * 1024) request.destroy(new Error("Upstream response is too large"));
      });
      response.on("end", () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`Upstream returned HTTP ${response.statusCode}`));
          return;
        }
        resolve(body);
      });
    });
    const timeout = setTimeout(() => request.destroy(new Error("Upstream request timed out")), timeoutMs);
    request.once("close", () => clearTimeout(timeout));
    request.on("error", reject);
  });
}

async function requestJson(url) {
  return JSON.parse(await requestText(url));
}

function parseJsonp(text) {
  const start = text.indexOf("(");
  const end = text.lastIndexOf(")");
  if (start < 0 || end <= start) throw new Error("Upstream returned invalid JSONP");
  return JSON.parse(text.slice(start + 1, end));
}

function readCache(key) {
  const cached = CACHE.get(key);
  if (!cached || cached.expiresAt <= Date.now()) {
    CACHE.delete(key);
    return null;
  }
  return cached.value;
}

function writeCache(key, value, ttl) {
  if (CACHE.size > 300) CACHE.delete(CACHE.keys().next().value);
  CACHE.set(key, { value, expiresAt: Date.now() + ttl });
  return value;
}

async function cachedLoad(key, ttl, loader, force = false) {
  if (!force) {
    const cached = readCache(key);
    if (cached) return cached;
  }
  return writeCache(key, await loader(), ttl);
}

async function fetchQuote(code) {
  const url = new URL(QUOTE_ENDPOINT);
  url.searchParams.set("secid", `${marketIdFor(code)}.${code}`);
  url.searchParams.set("fields", "f43,f44,f45,f46,f47,f48,f57,f58,f60,f86,f116,f117,f168,f169,f170,f171");
  url.searchParams.set("_", Date.now());
  const payload = await requestJson(url);
  const item = payload?.data;
  if (!item || String(item.f57) !== code || !Number.isFinite(Number(item.f43))) {
    throw new Error("实时行情暂不可用");
  }
  return {
    code,
    name: plainText(item.f58),
    price: scaled(item.f43, 100),
    previousClose: scaled(item.f60, 100),
    change: scaled(item.f169, 100),
    changePct: scaled(item.f170, 100),
    open: scaled(item.f46, 100),
    high: scaled(item.f44, 100),
    low: scaled(item.f45, 100),
    volume: scaled(item.f47),
    amount: scaled(item.f48),
    turnoverRate: scaled(item.f168, 100),
    amplitude: scaled(item.f171, 100),
    totalMarketValue: scaled(item.f116),
    circulatingMarketValue: scaled(item.f117),
    updatedAt: shanghaiIsoFromUnix(item.f86),
    quoteKind: "realtime",
    source: "东方财富公开实时行情"
  };
}

async function fetchAnnouncements(code, limit) {
  const callbackName = `stockTrackingAnnouncement_${Date.now()}`;
  const url = new URL(ANNOUNCEMENT_ENDPOINT);
  url.searchParams.set("cb", callbackName);
  url.searchParams.set("sr", "-1");
  url.searchParams.set("page_size", String(limit));
  url.searchParams.set("page_index", "1");
  url.searchParams.set("ann_type", "A");
  url.searchParams.set("client_source", "web");
  url.searchParams.set("stock_list", code);
  url.searchParams.set("_", Date.now());
  const payload = parseJsonp(await requestText(url));
  const items = Array.isArray(payload?.data?.list) ? payload.data.list : [];
  return items.map(item => {
    const originalTitle = plainText(item.title);
    const title = originalTitle.replace(/^[^:：]{1,24}[:：]\s*/, "") || originalTitle;
    const columns = (item.columns || []).map(column => plainText(column.column_name)).filter(Boolean).slice(0, 2);
    const categoryText = columns.length ? columns.join("、") : "公司公告";
    return {
      id: `live-announcement-${item.art_code}`,
      category: "company",
      title,
      publishedAt: normalizeDate(item.display_time || item.notice_date),
      source: "公司公告",
      sourceUrl: `https://data.eastmoney.com/notices/detail/${code}/${item.art_code}.html`,
      summary: `${categoryText}。该信息来自公开披露，点击可查看公告原文。`,
      detail: `公告标题：${originalTitle}。当前页面仅同步公开披露事实，不对公告影响作确定性判断。`,
      evidence: "事实",
      importance: importanceFromTitle(title),
      sentiment: sentimentFromTitle(title),
      live: true
    };
  });
}

function newsId(url) {
  const articleCode = String(url || "").match(/\d{12,}/)?.[0];
  return articleCode || Buffer.from(String(url || "")).toString("base64url").slice(0, 24);
}

async function fetchNews(code, name, limit) {
  const parameter = {
    uid: "",
    keyword: code,
    type: ["cmsArticleWebOld"],
    client: "web",
    clientType: "web",
    clientVersion: "curr",
    param: {
      cmsArticleWebOld: {
        searchScope: "default",
        sort: "time",
        pageIndex: 1,
        pageSize: Math.max(limit, 12),
        preTag: "",
        postTag: ""
      }
    }
  };
  const url = new URL(NEWS_ENDPOINT);
  url.searchParams.set("cb", `stockTrackingNews_${Date.now()}`);
  url.searchParams.set("param", JSON.stringify(parameter));
  const payload = parseJsonp(await requestText(url));
  const items = Array.isArray(payload?.result?.cmsArticleWebOld) ? payload.result.cmsArticleWebOld : [];
  return items.slice(0, limit).map(item => {
    const title = plainText(item.title);
    const content = compactText(item.content || title);
    const sourceUrl = String(item.url || "").replace(/^http:/, "https:");
    return {
      id: `live-news-${newsId(sourceUrl)}`,
      category: categoryFromNews(title, content),
      title,
      publishedAt: normalizeDate(item.date),
      source: plainText(item.mediaName) || "东方财富资讯",
      sourceUrl,
      summary: content || "点击查看新闻原文。",
      detail: content || title,
      evidence: "推断",
      importance: importanceFromTitle(title),
      sentiment: sentimentFromTitle(title),
      live: true
    };
  });
}

function validateCode(value) {
  const code = String(value || "").trim();
  return /^\d{6}$/.test(code) ? code : "";
}

async function loadSections(code, sections, force) {
  const results = {};
  const errors = {};
  await Promise.all(sections.map(async section => {
    try {
      if (section === "quote") {
        results.quote = await cachedLoad(`${code}:quote`, CACHE_TTL.quote, () => fetchQuote(code), force);
      } else if (section === "announcements") {
        results.announcements = await cachedLoad(
          `${code}:announcements`,
          CACHE_TTL.announcements,
          () => fetchAnnouncements(code, 16),
          force
        );
      } else if (section === "news") {
        const quote = results.quote || await cachedLoad(`${code}:quote`, CACHE_TTL.quote, () => fetchQuote(code), force);
        results.news = await cachedLoad(
          `${code}:news`,
          CACHE_TTL.news,
          () => fetchNews(code, quote.name, 16),
          force
        );
      }
    } catch (error) {
      errors[section] = error?.message || `${section}暂不可用`;
    }
  }));
  return { results, errors };
}

async function handleRequest(method, url, origin = "") {
  if (method === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(origin), body: "", isBase64Encoded: false };
  }
  if (url.pathname.endsWith("/health") && method === "GET") {
    return jsonResponse(origin, 200, { ok: true, service: "stock-tracking-live" });
  }
  if (method !== "GET") return jsonResponse(origin, 405, { error: "Method Not Allowed" });

  const code = validateCode(url.searchParams.get("code"));
  if (!code) return jsonResponse(origin, 400, { error: "股票代码必须为6位数字" });

  const requested = String(url.searchParams.get("include") || "quote,announcements,news")
    .split(",")
    .map(value => value.trim())
    .filter(value => ["quote", "announcements", "news"].includes(value));
  const sections = [...new Set(requested.length ? requested : ["quote"])];
  const force = url.searchParams.get("force") === "1";
  const { results, errors } = await loadSections(code, sections, force);
  const succeeded = Object.keys(results).length;
  const statusCode = succeeded ? 200 : 502;
  return jsonResponse(origin, statusCode, {
    code,
    checkedAt: new Date().toISOString(),
    ...results,
    errors
  }, succeeded ? "public, max-age=5, s-maxage=10" : "no-store");
}

function eventUrl(event) {
  const path = String(event.path || event.rawPath || "/");
  const url = new URL(path, "http://127.0.0.1");
  if (typeof event.rawQueryString === "string" && event.rawQueryString) {
    url.search = event.rawQueryString;
    return url;
  }
  Object.entries(event.queryStringParameters || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  });
  return url;
}

async function main(event = {}) {
  const method = String(event.httpMethod || event.requestContext?.http?.method || event.requestContext?.httpMethod || "GET").toUpperCase();
  const origin = String(event.headers?.origin || event.headers?.Origin || "");
  return handleRequest(method, eventUrl(event), origin);
}

module.exports = {
  validateCode,
  importanceFromTitle,
  sentimentFromTitle,
  categoryFromNews,
  fetchQuote,
  fetchAnnouncements,
  fetchNews,
  loadSections,
  handleRequest,
  main
};
