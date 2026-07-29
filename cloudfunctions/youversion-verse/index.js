"use strict";

const crypto = require("crypto");
const http = require("http");
const https = require("https");
const { EDGE_TTS, synthesizeEdgeSpeech } = require("./edge-tts");

const PORT = Number(process.env.PORT || 9000);
const APP_KEY = String(process.env.YVP_APP_KEY || "").trim();
const BIBLE_ID = String(process.env.YVP_BIBLE_ID || "36").trim();
const YVP_API_IPS = String(process.env.YVP_API_IPS || "151.101.1.55,151.101.65.55,151.101.129.55,151.101.193.55")
  .split(",")
  .map(value => value.trim())
  .filter(value => /^\d{1,3}(?:\.\d{1,3}){3}$/.test(value));
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;
const TTS_MAX_TEXT_LENGTH = 12000;
const MAX_TTS_CACHE_ENTRIES = 8;
const ALLOWED_BOOKS = new Set([
  "GEN", "EXO", "LEV", "NUM", "DEU", "JOS", "JDG", "RUT", "1SA", "2SA",
  "1KI", "2KI", "1CH", "2CH", "EZR", "NEH", "EST", "JOB", "PSA", "PRO",
  "ECC", "SNG", "ISA", "JER", "LAM", "EZK", "DAN", "HOS", "JOL", "AMO",
  "OBA", "JON", "MIC", "NAM", "HAB", "ZEP", "HAG", "ZEC", "MAL", "MAT",
  "MRK", "LUK", "JHN", "ACT", "ROM", "1CO", "2CO", "GAL", "EPH", "PHP",
  "COL", "1TH", "2TH", "1TI", "2TI", "TIT", "PHM", "HEB", "JAS", "1PE",
  "2PE", "1JN", "2JN", "3JN", "JUD", "REV"
]);
const responseCache = new Map();
const speechCache = new Map();

function allowedOrigin(origin) {
  if (!origin) return "";
  try {
    const url = new URL(origin);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
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
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

function audioResponse(origin, audio, cacheStatus = "MISS") {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=86400",
      "X-TTS-Voice": EDGE_TTS.voice,
      "X-Worker-Cache": cacheStatus,
      ...corsHeaders(origin)
    },
    body: audio.toString("base64"),
    isBase64Encoded: true
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

function requestJsonFromIp(url, ipAddress, timeoutMs) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const request = https.get({
      hostname: target.hostname,
      servername: target.hostname,
      path: `${target.pathname}${target.search}`,
      lookup: (_hostname, options, callback) => {
        if (options && options.all) {
          callback(null, [{ address: ipAddress, family: 4 }]);
          return;
        }
        callback(null, ipAddress, 4);
      },
      headers: {
        "Accept": "application/json",
        "X-YVP-App-Key": APP_KEY
      }
    }, response => {
      response.setEncoding("utf8");
      let body = "";
      response.on("data", chunk => {
        body += chunk;
        if (body.length > 256 * 1024) request.destroy(new Error("Upstream response is too large"));
      });
      response.on("end", () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(Object.assign(new Error(`YouVersion returned ${response.statusCode}`), { statusCode: response.statusCode }));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch {
          reject(new Error("YouVersion returned invalid JSON"));
        }
      });
    });
    const timeoutHandle = setTimeout(
      () => request.destroy(new Error("YouVersion request timed out")),
      timeoutMs
    );
    request.once("close", () => clearTimeout(timeoutHandle));
    request.on("error", reject);
  });
}

async function requestJson(url, timeoutMs = 5000) {
  let lastError;
  const startIndex = Math.floor(Date.now() / 1000) % YVP_API_IPS.length;
  for (let offset = 0; offset < Math.min(2, YVP_API_IPS.length); offset += 1) {
    const ipAddress = YVP_API_IPS[(startIndex + offset) % YVP_API_IPS.length];
    try {
      return await requestJsonFromIp(url, ipAddress, timeoutMs);
    } catch (error) {
      if (error && Number(error.statusCode) >= 400) throw error;
      lastError = error;
    }
  }
  throw lastError || new Error("YouVersion request failed");
}

function readCached(key) {
  const cached = responseCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.createdAt > CACHE_TTL_MS) {
    responseCache.delete(key);
    return null;
  }
  return cached.value;
}

function writeCached(key, value) {
  if (responseCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = responseCache.keys().next().value;
    if (oldestKey) responseCache.delete(oldestKey);
  }
  responseCache.set(key, { createdAt: Date.now(), value });
}

function normalizeSpeechText(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function readSpeechCache(key) {
  const audio = speechCache.get(key);
  if (!audio) return null;
  speechCache.delete(key);
  speechCache.set(key, audio);
  return audio;
}

function writeSpeechCache(key, audio) {
  speechCache.delete(key);
  speechCache.set(key, audio);
  while (speechCache.size > MAX_TTS_CACHE_ENTRIES) {
    const oldestKey = speechCache.keys().next().value;
    if (!oldestKey) break;
    speechCache.delete(oldestKey);
  }
}

async function handleTtsRequest(body, origin) {
  let payload;
  try {
    payload = JSON.parse(String(body || ""));
  } catch {
    return jsonResponse(origin, 400, { error: "Invalid JSON body" });
  }
  const text = normalizeSpeechText(payload?.text);
  if (!text || text.length > TTS_MAX_TEXT_LENGTH) {
    return jsonResponse(origin, 400, { error: "Speech text must contain 1 to 12000 characters" });
  }
  const cacheKey = crypto
    .createHash("sha256")
    .update([EDGE_TTS.voice, EDGE_TTS.rate, EDGE_TTS.pitch, text].join("\n"))
    .digest("hex");
  const cached = readSpeechCache(cacheKey);
  if (cached) return audioResponse(origin, cached, "HIT");
  try {
    let audio;
    try {
      audio = await synthesizeEdgeSpeech(text);
    } catch (error) {
      if (error?.message !== "Edge TTS returned no audio") throw error;
      audio = await synthesizeEdgeSpeech(text);
    }
    writeSpeechCache(cacheKey, audio);
    return audioResponse(origin, audio);
  } catch (error) {
    console.error("Edge TTS request failed", error);
    return jsonResponse(origin, 502, { error: "Speech service is temporarily unavailable" });
  }
}

function parseReference(url) {
  const book = String(url.searchParams.get("book") || "").trim().toUpperCase();
  const chapter = Number(url.searchParams.get("chapter"));
  const verse = Number(url.searchParams.get("verse"));
  if (!ALLOWED_BOOKS.has(book)) return null;
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > 150) return null;
  if (!Number.isInteger(verse) || verse < 1 || verse > 176) return null;
  return { book, chapter, verse, passageId: `${book}.${chapter}.${verse}` };
}

async function loadVerse(reference) {
  const cached = readCached(reference.passageId);
  if (cached) return cached;
  const upstreamUrl = `https://api.youversion.com/v1/bibles/${encodeURIComponent(BIBLE_ID)}/passages/${encodeURIComponent(reference.passageId)}?format=text&include_headings=false&include_notes=false`;
  const payload = await requestJson(upstreamUrl);
  if (!payload || typeof payload.content !== "string" || !payload.content.trim()) {
    throw new Error("YouVersion returned an empty passage");
  }
  const value = {
    id: typeof payload.id === "string" ? payload.id : reference.passageId,
    reference: typeof payload.reference === "string" ? payload.reference : reference.passageId,
    content: payload.content.trim(),
    version: BIBLE_ID === "36" ? "CCB" : `YouVersion ${BIBLE_ID}`,
    bibleId: BIBLE_ID
  };
  writeCached(reference.passageId, value);
  return value;
}

async function handleRequest(method, url, origin = "", body = "") {
  if (method === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(origin), body: "", isBase64Encoded: false };
  }

  if (url.pathname.endsWith("/health") && method === "GET") {
    return jsonResponse(origin, 200, {
      ok: true,
      configured: Boolean(APP_KEY),
      bibleId: BIBLE_ID,
      ttsVoice: EDGE_TTS.voice
    });
  }

  const acceptedPath = url.pathname === "/" || url.pathname === "/api/bible-translation";
  const acceptedTtsPath = acceptedPath || url.pathname === "/api/bible-tts";
  if (method === "POST" && acceptedTtsPath) {
    return handleTtsRequest(body, origin);
  }
  if (!acceptedPath) {
    return jsonResponse(origin, 404, { error: "Not Found" });
  }
  if (method !== "GET") {
    return jsonResponse(origin, 405, { error: "Method Not Allowed" });
  }
  if (!APP_KEY) {
    return jsonResponse(origin, 503, { error: "Translation service is not configured" });
  }

  const reference = parseReference(url);
  if (!reference) {
    return jsonResponse(origin, 400, { error: "Invalid Bible reference" });
  }

  try {
    return jsonResponse(origin, 200, await loadVerse(reference), "public, max-age=3600, s-maxage=86400");
  } catch (error) {
    const statusCode = error && error.statusCode === 404 ? 404 : 502;
    return jsonResponse(origin, statusCode, {
      error: statusCode === 404 ? "Translation not available for this verse" : "Translation service is temporarily unavailable"
    });
  }
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
  const body = event.isBase64Encoded
    ? Buffer.from(String(event.body || ""), "base64").toString("utf8")
    : String(event.body || "");
  return handleRequest(method, eventUrl(event), origin, body);
}

const server = http.createServer(async (req, res) => {
  const chunks = [];
  let bodyLength = 0;
  for await (const chunk of req) {
    bodyLength += chunk.length;
    if (bodyLength <= 32 * 1024) chunks.push(chunk);
  }
  const result = await handleRequest(
    String(req.method || "GET").toUpperCase(),
    new URL(req.url || "/", "http://127.0.0.1"),
    String(req.headers.origin || ""),
    bodyLength <= 32 * 1024 ? Buffer.concat(chunks).toString("utf8") : ""
  );
  res.writeHead(result.statusCode, result.headers);
  res.end(result.isBase64Encoded ? Buffer.from(result.body, "base64") : result.body);
});

if (require.main === module) server.listen(PORT);

module.exports = { allowedOrigin, parseReference, loadVerse, handleRequest, handleTtsRequest, main };
