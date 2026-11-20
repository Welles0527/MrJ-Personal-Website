"use strict";

const crypto = require("crypto");
const http = require("http");
const https = require("https");
const { readFile } = require("node:fs/promises");
const { join } = require("node:path");
const { EDGE_TTS, synthesizeEdgeSpeech } = require("./edge-tts");

const PORT = Number(process.env.PORT || 9000);
const APP_KEY = String(process.env.YVP_APP_KEY || "").trim();
const HEYGEN_API_KEY = String(process.env.HEYGEN_API_KEY || "").trim();
const BIBLE_ID = String(process.env.YVP_BIBLE_ID || "36").trim();
const YVP_API_IPS = String(process.env.YVP_API_IPS || "151.101.1.55,151.101.65.55,151.101.129.55,151.101.193.55")
  .split(",")
  .map(value => value.trim())
  .filter(value => /^\d{1,3}(?:\.\d{1,3}){3}$/.test(value));
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;
const TTS_MAX_TEXT_LENGTH = 12000;
const MAX_TTS_CACHE_ENTRIES = 8;
const HEYGEN_PART_LENGTH = 180;
const MAX_HEYGEN_CACHE_ENTRIES = 64;
const BIBLE_TEXT_URL = "https://www.magicj.cn/officialwebsite/data/bible/chi-cuv-simp.json";
const HEYGEN_VOICES = Object.freeze({
  guoliang: "1ddd191b2454466e9527983c9dcb4c14",
  shuxian: "6c364011f30747c9a0a89eec3787cadc"
});
const BOOK_TITLES = {
  GEN: "创世记", EXO: "出埃及记", LEV: "利未记", NUM: "民数记", DEU: "申命记",
  JOS: "约书亚记", JDG: "士师记", RUT: "路得记", "1SA": "撒母耳记上", "2SA": "撒母耳记下",
  "1KI": "列王纪上", "2KI": "列王纪下", "1CH": "历代志上", "2CH": "历代志下", EZR: "以斯拉记",
  NEH: "尼希米记", EST: "以斯帖记", JOB: "约伯记", PSA: "诗篇", PRO: "箴言",
  ECC: "传道书", SNG: "雅歌", ISA: "以赛亚书", JER: "耶利米书", LAM: "耶利米哀歌",
  EZK: "以西结书", DAN: "但以理书", HOS: "何西阿书", JOL: "约珥书", AMO: "阿摩司书",
  OBA: "俄巴底亚书", JON: "约拿书", MIC: "弥迦书", NAM: "那鸿书", HAB: "哈巴谷书",
  ZEP: "西番雅书", HAG: "哈该书", ZEC: "撒迦利亚书", MAL: "玛拉基书",
  MAT: "马太福音", MRK: "马可福音", LUK: "路加福音", JHN: "约翰福音", ACT: "使徒行传",
  ROM: "罗马书", "1CO": "哥林多前书", "2CO": "哥林多后书", GAL: "加拉太书", EPH: "以弗所书",
  PHP: "腓立比书", COL: "歌罗西书", "1TH": "帖撒罗尼迦前书", "2TH": "帖撒罗尼迦后书", "1TI": "提摩太前书",
  "2TI": "提摩太后书", TIT: "提多书", PHM: "腓利门书", HEB: "希伯来书", JAS: "雅各书",
  "1PE": "彼得前书", "2PE": "彼得后书", "1JN": "约翰一书", "2JN": "约翰二书", "3JN": "约翰三书",
  JUD: "犹大书", REV: "启示录"
};
const responseCache = new Map();
const speechCache = new Map();
const heyGenSpeechCache = new Map();
const pendingHeyGenSpeech = new Map();
let speechChapters;
let heyGenAvailability;

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

function audioResponse(origin, audio, cacheStatus = "MISS", voice = EDGE_TTS.voice, parts = 1) {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=86400",
      "Access-Control-Expose-Headers": "X-TTS-Parts",
      "X-TTS-Voice": voice,
      "X-TTS-Parts": String(parts),
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

function readSpeechCache(cache, key) {
  const audio = cache.get(key);
  if (!audio) return null;
  cache.delete(key);
  cache.set(key, audio);
  return audio;
}

function writeSpeechCache(cache, key, audio, maxEntries) {
  cache.set(key, audio);
  if (cache.size > maxEntries) cache.delete(cache.keys().next().value);
}

function loadSpeechChapters() {
  speechChapters ??= readFile(join(__dirname, "../../public/data/bible/chi-cuv-simp.json"), "utf8")
    .catch(async error => {
      if (error.code !== "ENOENT") throw error;
      const response = await fetch(BIBLE_TEXT_URL, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error("Bible text is unavailable");
      return response.text();
    })
    .then(source => {
      const { chapters } = JSON.parse(source);
      if (!chapters || typeof chapters !== "object") throw new Error("Invalid Bible text");
      return chapters;
    })
    .catch(error => {
      speechChapters = undefined;
      throw error;
    });
  return speechChapters;
}

function splitSpeechChapter(title, verses) {
  const parts = [title];
  for (const verse of verses) {
    const text = normalizeSpeechText(verse);
    if (!text) continue;
    const last = parts.length - 1;
    if (parts[last].length + text.length > HEYGEN_PART_LENGTH) parts.push(text);
    else parts[last] += text;
  }
  return parts;
}

async function checkHeyGenAvailability() {
  if (!HEYGEN_API_KEY) return false;
  if (!heyGenAvailability || heyGenAvailability.expiresAt <= Date.now()) {
    const available = fetch("https://api.heygen.com/v3/users/me", {
      headers: { "X-Api-Key": HEYGEN_API_KEY },
      redirect: "error",
      signal: AbortSignal.timeout(4000)
    }).then(async response => {
      await response.body?.cancel();
      return response.ok;
    }).catch(() => false);
    heyGenAvailability = { available, expiresAt: Date.now() + 60_000 };
  }
  return heyGenAvailability.available;
}

async function synthesizeHeyGenSpeech(text, voiceId, signal) {
  const synthesis = await fetch("https://api.heygen.com/v3/models/audio/tts", {
    method: "POST",
    headers: { "X-Api-Key": HEYGEN_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      voice_id: voiceId,
      language: "zh",
      text,
      output_format: { encoding: "mp3", sample_rate_hertz: 24000, bitrate_bps: 48000 }
    }),
    redirect: "error",
    signal
  });
  if (!synthesis.ok) {
    await synthesis.body?.cancel();
    throw Object.assign(new Error("HeyGen rejected the request"), { statusCode: synthesis.status });
  }

  const { data } = await synthesis.json();
  const audioUrl = new URL(data?.audio_url);
  if (audioUrl.protocol !== "https:" || audioUrl.username || audioUrl.password) throw new Error("Invalid HeyGen audio URL");

  const response = await fetch(audioUrl, { signal });
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error("HeyGen audio could not be downloaded");
  }
  const audio = Buffer.from(await response.arrayBuffer());
  const hasMp3Header = audio.toString("ascii", 0, 3) === "ID3" || (audio[0] === 0xff && (audio[1] & 0xe0) === 0xe0);
  if (audio.length <= 3 || !hasMp3Header) throw new Error("Invalid HeyGen audio");
  return audio;
}

async function handleHeyGenTtsRequest(payload, origin) {
  if (!allowedOrigin(origin)) return jsonResponse(origin, 403, { error: "Origin not allowed" });
  const { chapter, startVerse = 1, part = 0, voice } = payload;
  const book = typeof payload.book === "string" ? payload.book.toUpperCase() : "";
  if (!Object.hasOwn(BOOK_TITLES, book) || !Number.isInteger(chapter) || chapter < 1 || chapter > 150 ||
      !Number.isInteger(startVerse) || startVerse < 1 ||
      !Number.isInteger(part) || part < 0 || typeof voice !== "string" || !Object.hasOwn(HEYGEN_VOICES, voice)) {
    return jsonResponse(origin, 400, { error: "Invalid chapter, voice or audio part" });
  }
  if (!HEYGEN_API_KEY) return jsonResponse(origin, 503, { error: "HeyGen speech service is not configured" });

  const signal = AbortSignal.timeout(12000);
  try {
    const chapterKey = `${book.toLowerCase()}-${chapter}`;
    const verses = (await loadSpeechChapters())[chapterKey];
    if (!Array.isArray(verses) || !verses.length) return jsonResponse(origin, 404, { error: "Chapter not found" });

    if (startVerse > verses.length) return jsonResponse(origin, 400, { error: "Invalid starting verse" });

    const startCue = startVerse > 1 ? `从第${startVerse}节开始。` : "";
    const parts = splitSpeechChapter(`${BOOK_TITLES[book]}，第${chapter}章。${startCue}`, verses.slice(startVerse - 1));
    if (part >= parts.length) return jsonResponse(origin, 400, { error: "Invalid audio part" });

    const voiceId = HEYGEN_VOICES[voice];
    const cacheKey = `${voiceId}:${chapterKey}:${startVerse}:${part}`;
    const cached = readSpeechCache(heyGenSpeechCache, cacheKey);
    if (cached) return audioResponse(origin, cached, "HIT", voiceId, parts.length);

    let pending = pendingHeyGenSpeech.get(cacheKey);
    if (!pending) {
      pending = synthesizeHeyGenSpeech(parts[part], voiceId, signal)
        .then(audio => {
          writeSpeechCache(heyGenSpeechCache, cacheKey, audio, MAX_HEYGEN_CACHE_ENTRIES);
          return audio;
        })
        .finally(() => pendingHeyGenSpeech.delete(cacheKey));
      pendingHeyGenSpeech.set(cacheKey, pending);
    }
    return audioResponse(origin, await pending, "MISS", voiceId, parts.length);
  } catch (error) {
    console.error("HeyGen chapter speech failed", error?.statusCode ?? error?.name);
    if (error?.statusCode === 429) return jsonResponse(origin, 429, { error: "HeyGen speech service is busy" });
    return jsonResponse(origin, 502, { error: "HeyGen speech service is temporarily unavailable" });
  }
}

async function handleTtsRequest(body, origin) {
  let payload;
  try {
    payload = JSON.parse(String(body || ""));
  } catch {
    return jsonResponse(origin, 400, { error: "Invalid JSON body" });
  }
  if (payload?.voice !== undefined) return handleHeyGenTtsRequest(payload, origin);
  const text = normalizeSpeechText(payload?.text);
  if (!text || text.length > TTS_MAX_TEXT_LENGTH) {
    return jsonResponse(origin, 400, { error: "Speech text must contain 1 to 12000 characters" });
  }
  const cacheKey = crypto
    .createHash("sha256")
    .update([EDGE_TTS.voice, EDGE_TTS.rate, EDGE_TTS.pitch, text].join("\n"))
    .digest("hex");
  const cached = readSpeechCache(speechCache, cacheKey);
  if (cached) return audioResponse(origin, cached, "HIT");
  try {
    let audio;
    try {
      audio = await synthesizeEdgeSpeech(text);
    } catch (error) {
      if (error?.message !== "Edge TTS returned no audio") throw error;
      audio = await synthesizeEdgeSpeech(text);
    }
    writeSpeechCache(speechCache, cacheKey, audio, MAX_TTS_CACHE_ENTRIES);
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
  if (!Object.hasOwn(BOOK_TITLES, book)) return null;
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
    const checkHeyGen = url.searchParams.get("tts") === "1";
    return jsonResponse(origin, 200, {
      ok: true,
      configured: Boolean(APP_KEY),
      bibleId: BIBLE_ID,
      ttsVoice: EDGE_TTS.voice,
      heyGenTtsConfigured: Boolean(HEYGEN_API_KEY),
      ...(checkHeyGen ? { heyGenTtsAvailable: await checkHeyGenAvailability() } : {})
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
