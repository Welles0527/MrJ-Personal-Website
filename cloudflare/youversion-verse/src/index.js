const ALLOWED_ORIGINS = new Set([
  "https://magicj.cn",
  "https://www.magicj.cn",
  "http://127.0.0.1:4321",
  "http://127.0.0.1:4322",
  "http://localhost:4321",
  "http://localhost:4322"
]);

const ALLOWED_BOOKS = new Set([
  "GEN", "EXO", "LEV", "NUM", "DEU", "JOS", "JDG", "RUT", "1SA", "2SA",
  "1KI", "2KI", "1CH", "2CH", "EZR", "NEH", "EST", "JOB", "PSA", "PRO",
  "ECC", "SNG", "ISA", "JER", "LAM", "EZK", "DAN", "HOS", "JOL", "AMO",
  "OBA", "JON", "MIC", "NAM", "HAB", "ZEP", "HAG", "ZEC", "MAL", "MAT",
  "MRK", "LUK", "JHN", "ACT", "ROM", "1CO", "2CO", "GAL", "EPH", "PHP",
  "COL", "1TH", "2TH", "1TI", "2TI", "TIT", "PHM", "HEB", "JAS", "1PE",
  "2PE", "1JN", "2JN", "3JN", "JUD", "REV"
]);

function corsHeaders(origin) {
  return {
    ...(ALLOWED_ORIGINS.has(origin) ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

function jsonResponse(origin, status, body, cacheControl = "no-store") {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": cacheControl,
      ...corsHeaders(origin)
    }
  });
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

async function loadVerse(reference, env) {
  const bibleId = String(env.YVP_BIBLE_ID || "36").trim();
  const upstreamUrl = new URL(
    `https://api.youversion.com/v1/bibles/${encodeURIComponent(bibleId)}/passages/${encodeURIComponent(reference.passageId)}`
  );
  upstreamUrl.searchParams.set("format", "text");
  upstreamUrl.searchParams.set("include_headings", "false");
  upstreamUrl.searchParams.set("include_notes", "false");

  const response = await fetch(upstreamUrl, {
    headers: {
      "Accept": "application/json",
      "X-YVP-App-Key": env.YVP_APP_KEY
    }
  });

  if (!response.ok) {
    const error = new Error(`YouVersion returned ${response.status}`);
    error.status = response.status;
    throw error;
  }

  const payload = await response.json();
  if (!payload || typeof payload.content !== "string" || !payload.content.trim()) {
    throw new Error("YouVersion returned an empty passage");
  }

  return {
    id: typeof payload.id === "string" ? payload.id : reference.passageId,
    reference: typeof payload.reference === "string" ? payload.reference : reference.passageId,
    content: payload.content.trim(),
    version: bibleId === "36" ? "CCB" : `YouVersion ${bibleId}`,
    bibleId
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (url.pathname === "/health" && request.method === "GET") {
      return jsonResponse(origin, 200, {
        ok: true,
        configured: Boolean(env.YVP_APP_KEY),
        bibleId: String(env.YVP_BIBLE_ID || "36")
      });
    }

    if (url.pathname !== "/" && url.pathname !== "/api/bible-translation") {
      return jsonResponse(origin, 404, { error: "Not Found" });
    }
    if (request.method !== "GET") {
      return jsonResponse(origin, 405, { error: "Method Not Allowed" });
    }
    if (!env.YVP_APP_KEY) {
      return jsonResponse(origin, 503, { error: "Translation service is not configured" });
    }

    const reference = parseReference(url);
    if (!reference) {
      return jsonResponse(origin, 400, { error: "Invalid Bible reference" });
    }

    try {
      const verse = await loadVerse(reference, env);
      return jsonResponse(origin, 200, verse, "private, max-age=300");
    } catch (error) {
      const status = error?.status === 404 ? 404 : 502;
      return jsonResponse(origin, status, {
        error: status === 404
          ? "Translation not available for this verse"
          : "Translation service is temporarily unavailable"
      });
    }
  }
};
