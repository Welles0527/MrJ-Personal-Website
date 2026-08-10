"use strict";

const https = require("https");

const QUOTE_ENDPOINT = "https://push2.eastmoney.com/api/qt/stock/get";
const QUOTE_FALLBACK_ENDPOINT = "https://push2delay.eastmoney.com/api/qt/stock/get";
const DAILY_KLINE_ENDPOINT = "https://push2his.eastmoney.com/api/qt/stock/kline/get";
const TENCENT_KLINE_ENDPOINT = "https://web.ifzq.gtimg.cn/appstock/app/fqkline/get";
const ANNOUNCEMENT_ENDPOINT = "https://np-anotice-stock.eastmoney.com/api/security/ann";
const NEWS_ENDPOINT = "https://search-api-web.eastmoney.com/search/jsonp";
const DATA_CENTER_ENDPOINT = "https://datacenter-web.eastmoney.com/api/data/v1/get";
const CACHE = new Map();
const CACHE_TTL = {
  quote: 10 * 1000,
  history: 10 * 60 * 1000,
  announcements: 2 * 60 * 1000,
  news: 5 * 60 * 1000,
  events: 5 * 60 * 1000
};

function marketIdFor(code) {
  return /^(5|6|9)/.test(code) ? "1" : "0";
}

function shanghaiClock() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    minuteOfDay: Number(values.hour) * 60 + Number(values.minute)
  };
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
  const localDate = text.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}(?::\d{2})?)(?::\d{1,6})?$/);
  if (localDate) {
    const stableTime = localDate[1];
    return `${stableTime.replace(" ", "T")}${stableTime.length === 16 ? ":00" : ""}+08:00`;
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

function requestTextOnce(url, timeoutMs = 8000) {
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

async function requestText(url, timeoutMs = 8000) {
  try {
    return await requestTextOnce(url, timeoutMs);
  } catch (error) {
    const isTransient = ["ECONNRESET", "ETIMEDOUT", "EAI_AGAIN"].includes(error?.code)
      || /socket hang up|timed out/i.test(String(error?.message || ""));
    if (!isTransient) throw error;
    return requestTextOnce(url, timeoutMs);
  }
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

function stableId(value) {
  let hash = 2166136261;
  for (const character of String(value || "")) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function companyEventKind(eventType) {
  if (eventType === "大宗交易") return { kind: "block-trade", label: "大宗交易" };
  if (["预约披露日", "股东大会", "限售解禁日"].includes(eventType)) {
    return { kind: "calendar", label: "个股日历" };
  }
  return { kind: "reminder", label: "大事提醒" };
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
  const quoteUrl = endpoint => {
    const url = new URL(endpoint);
    url.searchParams.set("secid", `${marketIdFor(code)}.${code}`);
    url.searchParams.set("fields", "f43,f44,f45,f46,f47,f48,f57,f58,f60,f86,f116,f117,f168,f169,f170,f171");
    url.searchParams.set("_", Date.now());
    return url;
  };
  let payload;
  let quoteKind = "realtime";
  let source = "东方财富公开实时行情";
  try {
    payload = JSON.parse(await requestTextOnce(quoteUrl(QUOTE_ENDPOINT), 3500));
  } catch {
    payload = JSON.parse(await requestTextOnce(quoteUrl(QUOTE_FALLBACK_ENDPOINT), 5000));
    quoteKind = "delayed";
    source = "东方财富公开延迟行情";
  }
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
    quoteKind,
    source
  };
}

function normalizeHistoryPeriod(value) {
  return ["day", "week", "month"].includes(String(value)) ? String(value) : "day";
}

async function fetchEastmoneyHistory(code, limit = 360, period = "day") {
  const normalizedPeriod = normalizeHistoryPeriod(period);
  const klt = { day: "101", week: "102", month: "103" }[normalizedPeriod];
  const periodLabel = { day: "日线", week: "周线", month: "月线" }[normalizedPeriod];
  const minimumLimit = normalizedPeriod === "day" ? 260 : normalizedPeriod === "week" ? 120 : 60;
  const url = new URL(DAILY_KLINE_ENDPOINT);
  url.searchParams.set("secid", `${marketIdFor(code)}.${code}`);
  url.searchParams.set("klt", klt);
  url.searchParams.set("fqt", "1");
  url.searchParams.set("lmt", String(Math.max(minimumLimit, Math.min(500, Number(limit) || 360))));
  url.searchParams.set("end", "20500101");
  url.searchParams.set("iscca", "1");
  url.searchParams.set("fields1", "f1,f2,f3,f4,f5,f6");
  url.searchParams.set("fields2", "f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61");
  url.searchParams.set("_", Date.now());
  const payload = JSON.parse(await requestTextOnce(url, 5000));
  const item = payload?.data;
  if (!item || String(item.code) !== code || !Array.isArray(item.klines)) throw new Error(`${periodLabel}行情暂不可用`);
  let candles = item.klines.map(line => {
    const [date, open, close, high, low, volume, amount, amplitude, changePct, change, turnoverRate] = String(line).split(",");
    return {
      date,
      open: scaled(open),
      high: scaled(high),
      low: scaled(low),
      close: scaled(close),
      volume: scaled(volume),
      amount: scaled(amount),
      turnoverRate: scaled(turnoverRate),
      amplitude: scaled(amplitude),
      changePct: scaled(changePct),
      change: scaled(change)
    };
  }).filter(candle => candle.date && [candle.open, candle.high, candle.low, candle.close, candle.volume, candle.amount].every(Number.isFinite));
  const clock = shanghaiClock();
  if (normalizedPeriod === "day" && candles.at(-1)?.date === clock.date && clock.minuteOfDay < 15 * 60 + 5) candles = candles.slice(0, -1);
  if (!candles.length) throw new Error(`未返回已完成${periodLabel}行情`);
  return {
    code,
    name: plainText(item.name),
    period: normalizedPeriod,
    adjustment: "forward",
    candles,
    lastCompletedDate: candles.at(-1).date,
    updatedAt: `${candles.at(-1).date}T15:00:00+08:00`,
    source: `东方财富公开前复权${periodLabel}行情`
  };
}

async function fetchTencentHistory(code, limit = 360, period = "day") {
  const normalizedPeriod = normalizeHistoryPeriod(period);
  const periodLabel = { day: "日线", week: "周线", month: "月线" }[normalizedPeriod];
  const symbol = `${/^(5|6|9)/.test(code) ? "sh" : "sz"}${code}`;
  const minimumLimit = normalizedPeriod === "day" ? 260 : normalizedPeriod === "week" ? 120 : 60;
  const candleLimit = Math.max(minimumLimit, Math.min(500, Number(limit) || 360));
  const url = new URL(TENCENT_KLINE_ENDPOINT);
  url.searchParams.set("param", `${symbol},${normalizedPeriod},,,${candleLimit},qfq`);
  url.searchParams.set("_", Date.now());
  const payload = JSON.parse(await requestTextOnce(url, 5000));
  const item = payload?.data?.[symbol];
  const rows = item?.[`qfq${normalizedPeriod}`] || item?.[normalizedPeriod];
  if (!Array.isArray(rows)) throw new Error(`腾讯${periodLabel}行情暂不可用`);
  let previousClose = null;
  let candles = rows.map(row => {
    const [date, open, close, high, low, volumeLots] = Array.isArray(row) ? row : [];
    const closeValue = scaled(close);
    const highValue = scaled(high);
    const lowValue = scaled(low);
    const volume = Number.isFinite(Number(volumeLots)) ? Number(volumeLots) * 100 : null;
    const change = Number.isFinite(previousClose) && Number.isFinite(closeValue) ? closeValue - previousClose : null;
    const changePct = Number.isFinite(change) && previousClose !== 0 ? change / previousClose * 100 : null;
    const amplitude = Number.isFinite(previousClose) && previousClose !== 0 && Number.isFinite(highValue) && Number.isFinite(lowValue)
      ? (highValue - lowValue) / previousClose * 100
      : null;
    if (Number.isFinite(closeValue)) previousClose = closeValue;
    return {
      date,
      open: scaled(open),
      high: highValue,
      low: lowValue,
      close: closeValue,
      volume,
      amount: null,
      turnoverRate: null,
      amplitude,
      changePct,
      change
    };
  }).filter(candle => candle.date && [candle.open, candle.high, candle.low, candle.close, candle.volume].every(Number.isFinite));
  const clock = shanghaiClock();
  if (normalizedPeriod === "day" && candles.at(-1)?.date === clock.date && clock.minuteOfDay < 15 * 60 + 5) candles = candles.slice(0, -1);
  if (!candles.length) throw new Error(`未返回已完成${periodLabel}行情`);
  return {
    code,
    name: "",
    period: normalizedPeriod,
    adjustment: "forward",
    candles,
    lastCompletedDate: candles.at(-1).date,
    updatedAt: `${candles.at(-1).date}T15:00:00+08:00`,
    source: `腾讯证券公开前复权${periodLabel}行情`
  };
}

async function fetchHistory(code, limit = 360, period = "day") {
  try {
    return await fetchEastmoneyHistory(code, limit, period);
  } catch (error) {
    const history = await fetchTencentHistory(code, limit, period);
    history.fallbackReason = error?.message || "东方财富周期行情暂不可用";
    return history;
  }
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

function mapCompanyEvent(code, item) {
  const eventType = plainText(item.EVENT_TYPE);
  const title = plainText(item.LEVEL1_CONTENT);
  const publishedAt = normalizeDate(item.NOTICE_DATE);
  const event = companyEventKind(eventType);
  return {
    id: `live-event-${code}-${item.EVENT_TYPE_CODE || "other"}-${stableId(`${publishedAt}-${title}`)}`,
    category: "company",
    title,
    publishedAt,
    source: "东方财富Choice数据",
    sourceUrl: "",
    evidence: "事实",
    importance: importanceFromTitle(`${eventType} ${title}`),
    sentiment: "中性",
    eventKind: event.kind,
    eventLabel: event.label,
    eventType,
    live: true
  };
}

async function fetchCompanyEvents(code, limit) {
  const url = new URL(DATA_CENTER_ENDPOINT);
  url.searchParams.set("reportName", "RPT_STOCKCALENDAR");
  url.searchParams.set(
    "columns",
    "SECUCODE,SECURITY_CODE,NOTICE_DATE,INFO_CODE,EVENT_TYPE,EVENT_TYPE_CODE,LEVEL1_CONTENT,CHANGE_RATE,CLOSE_PRICE,DAILY_RANK"
  );
  url.searchParams.set("filter", `(SECURITY_CODE="${code}")`);
  url.searchParams.set("pageNumber", "1");
  url.searchParams.set("pageSize", String(Math.max(Number(limit) * 4, 64)));
  url.searchParams.set("sortColumns", "NOTICE_DATE,DAILY_RANK");
  url.searchParams.set("sortTypes", "-1,1");
  url.searchParams.set("source", "WEB");
  url.searchParams.set("client", "WEB");
  const payload = await requestJson(url);
  const items = Array.isArray(payload?.result?.data) ? payload.result.data : [];
  return items
    .filter(item => {
      const eventType = plainText(item.EVENT_TYPE);
      return eventType && !["公告", "研报"].includes(eventType);
    })
    .slice(0, limit)
    .map(item => mapCompanyEvent(code, item));
}

function validateCode(value) {
  const code = String(value || "").trim();
  return /^\d{6}$/.test(code) ? code : "";
}

function validateCodes(value) {
  return [...new Set(String(value || "")
    .split(",")
    .map(validateCode)
    .filter(Boolean))]
    .slice(0, 30);
}

async function loadSections(code, sections, force, historyOptions = {}) {
  const results = {};
  const errors = {};
  await Promise.all(sections.map(async section => {
    try {
      if (section === "quote") {
        results.quote = await cachedLoad(`${code}:quote`, CACHE_TTL.quote, () => fetchQuote(code), force);
      } else if (section === "history") {
        const period = normalizeHistoryPeriod(historyOptions.period);
        const limit = Math.max(1, Math.min(500, Number(historyOptions.limit) || 360));
        results.history = await cachedLoad(`${code}:history:${period}:${limit}`, CACHE_TTL.history, () => fetchHistory(code, limit, period), force);
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
      } else if (section === "events") {
        results.events = await cachedLoad(
          `${code}:events`,
          CACHE_TTL.events,
          () => fetchCompanyEvents(code, 16),
          force
        );
      }
    } catch (error) {
      errors[section] = error?.message || `${section}暂不可用`;
    }
  }));
  return { results, errors };
}

async function loadStockBatch(codes, sections, force, historyOptions = {}) {
  const stocks = new Array(codes.length);
  let nextIndex = 0;
  const workerCount = Math.min(2, codes.length);
  const workers = Array.from({ length: workerCount }, async () => {
    while (nextIndex < codes.length) {
      const index = nextIndex;
      nextIndex += 1;
      const code = codes[index];
      const { results, errors } = await loadSections(code, sections, force, historyOptions);
      stocks[index] = { code, ...results, errors };
    }
  });
  await Promise.all(workers);
  return stocks;
}

async function handleRequest(method, url, origin = "") {
  if (method === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(origin), body: "", isBase64Encoded: false };
  }
  if (url.pathname.endsWith("/health") && method === "GET") {
    return jsonResponse(origin, 200, { ok: true, service: "stock-tracking-live" });
  }
  if (method !== "GET") return jsonResponse(origin, 405, { error: "Method Not Allowed" });

  const requested = String(url.searchParams.get("include") || "quote,announcements,news,events")
    .split(",")
    .map(value => value.trim())
    .filter(value => ["quote", "history", "announcements", "news", "events"].includes(value));
  const sections = [...new Set(requested.length ? requested : ["quote"])];
  const force = url.searchParams.get("force") === "1";
  const historyOptions = {
    period: normalizeHistoryPeriod(url.searchParams.get("period")),
    limit: Math.max(1, Math.min(500, Number(url.searchParams.get("limit")) || 360))
  };
  const batchCodes = validateCodes(url.searchParams.get("codes"));
  if (batchCodes.length) {
    const stocks = await loadStockBatch(batchCodes, sections, force, historyOptions);
    const succeeded = stocks.some(stock => sections.some(section => Object.hasOwn(stock, section)));
    return jsonResponse(origin, succeeded ? 200 : 502, {
      codes: batchCodes,
      checkedAt: new Date().toISOString(),
      stocks
    }, succeeded ? "public, max-age=5, s-maxage=10" : "no-store");
  }

  const code = validateCode(url.searchParams.get("code"));
  if (!code) return jsonResponse(origin, 400, { error: "股票代码必须为6位数字" });
  const { results, errors } = await loadSections(code, sections, force, historyOptions);
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
  validateCodes,
  normalizeHistoryPeriod,
  importanceFromTitle,
  sentimentFromTitle,
  categoryFromNews,
  fetchQuote,
  fetchHistory,
  fetchTencentHistory,
  fetchAnnouncements,
  fetchNews,
  fetchCompanyEvents,
  mapCompanyEvent,
  companyEventKind,
  loadSections,
  loadStockBatch,
  handleRequest,
  main
};
