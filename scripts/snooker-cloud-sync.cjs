"use strict";

const WST_ENDPOINT = "https://tournaments.snooker.web.gc.wstservices.co.uk/v2/";
const RANKINGS_ENDPOINT = 'https://rankings.snooker.web.gc.wstservices.co.uk/v2?rankingsLimit=200&showOfficial=true';
const normalizeRankings = (payload, fetchedAt) => {
  const board = payload?.data?.find(item => item.id === 'abfba8fe-1423-5a2a-a96b-d77e8b413ca8');
  if (!board || board.attributes.live !== false || board.attributes.published !== true) throw new Error('Official world rankings unavailable');
  const rows = [...board.attributes.positions].sort((a, b) => a.position - b.position).slice(0, 16);
  if (rows.length !== 16 || rows.some((row, i) => row.position !== i + 1 || !row.playerID ||
      !row.player?.firstName || !row.player?.surname || !Number.isFinite(row.prizeMoney) || row.prizeMoney < 0) ||
      new Set(rows.map(row => row.playerID)).size !== 16) throw new Error('Invalid official top 16');
  return { fetchedAt, basis: board.attributes.recalculateAfter, source: 'https://www.wst.tv/rankings/',
    players: rows.map(row => ({ id: row.playerID, rank: row.position,
      name: `${row.player.firstName} ${row.player.surname}`, amount: row.prizeMoney })) };
};
const CALENDAR_URL = "https://www.magicj.cn/officialwebsite/snooker-calendar/index.html";
const COLLECTION = "snookerLiveScores";
const INTERVAL_MS = 20 * 60 * 1000;
const SNAPSHOT_ID = "current";

const normalize = (name) => String(name || "")
  .toLowerCase()
  .replace(/world snooker championship/g, "world championship")
  .replace(/^the /, "")
  .replace(/\b20\d{2}\b/g, "")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const readEvents = (html) => [...String(html || "").matchAll(
  /add\('([^']+)','[^']+','([^']+)','(\d{2}-\d{2})','(\d{2}-\d{2})'/gm
)].map(([, id, name, start, end]) => ({
  id,
  name,
  start: `2026-${start}`,
  end: `2026-${end}`,
}));

const findTournament = (event, tournaments) => {
  const wanted = normalize(event.name);
  const candidates = tournaments.filter((item) => {
    const attributes = item.attributes || {};
    return normalize(attributes.name).endsWith(wanted)
      && Math.abs(Date.parse(attributes.customStartDate || attributes.startDate) - Date.parse(event.start)) <= 3 * 86400000;
  });
  return candidates.length === 1 ? candidates[0] : null;
};

const normalizeTournament = (id, tournament, fetchedAt) => {
  const attributes = tournament?.data?.attributes;
  if (!attributes || !Array.isArray(attributes.matches)) throw new Error("WST tournament response has no matches array");
  const statusMap = {
    Scheduled: "upcoming",
    Live: "live",
    Completed: "ended",
    Postponed: "postponed",
    Suspended: "suspended",
    Cancelled: "cancelled",
    Abandoned: "cancelled",
  };
  const playerName = (player, fallback) => player
    ? [player.customFirstName || player.firstName, player.customSurname || player.surname]
      .filter(Boolean).join(" ").replace(/\s+/g, " ").trim()
    : String(fallback || "To be decided").replace(/\s+/g, " ").trim();
  const matches = attributes.matches
    .filter((match) => match.published !== false)
    .map((match) => {
      if (!match.matchID || !match.round || !statusMap[match.status]) {
        throw new Error(`Unknown WST match status/shape: ${match.status}`);
      }
      const names = String(match.name || "").split(" vs ");
      const scores = [match.homePlayerScore, match.awayPlayerScore];
      if (scores.some((score) => score !== null && (!Number.isInteger(score) || score < 0))) {
        throw new Error("Invalid WST score");
      }
      if (["Live", "Completed"].includes(match.status) && scores.some((score) => score === null)) {
        throw new Error("Missing WST score");
      }
      const startsAt = match.startDateTime ? `${match.startDateTime.replace(" ", "T")}Z` : null;
      if (startsAt && !Number.isFinite(Date.parse(startsAt))) throw new Error("Invalid WST start time");
      return {
        id: match.matchID,
        round: match.round,
        number: match.fixtureNumber,
        home: playerName(match.homePlayer, names[0]),
        away: playerName(match.awayPlayer, names[1]),
        homeScore: scores[0],
        awayScore: scores[1],
        startsAt,
        status: statusMap[match.status],
        sourceStatus: match.status,
        sourceDetail: match.statusMeta || null,
        source: `https://www.wst.tv/match-centre/${match.matchID}`,
      };
    })
    .sort((left, right) => (left.startsAt || "9999").localeCompare(right.startsAt || "9999") || left.number - right.number);
  const final = matches.find((match) => /^(the )?final$/i.test(match.round) && match.status === "ended");
  return {
    id,
    name: attributes.name,
    status: attributes.winner || final ? "ended"
      : matches.some((match) => ["live", "ended", "suspended"].includes(match.status)) ? "live" : "upcoming",
    fetchedAt,
    matches,
    winner: attributes.winner || (final
      ? final.homeScore > final.awayScore ? final.home : final.away
      : null),
    source: `https://www.wst.tv/matches/${tournament.data.id}`,
  };
};

const requestJson = async (url, fetchImpl) => {
  const target = new URL(url);
  if (![new URL(WST_ENDPOINT).origin, new URL(RANKINGS_ENDPOINT).origin].includes(target.origin)) throw new Error("Unexpected WST pagination host");
  const response = await fetchImpl(target, {
    signal: AbortSignal.timeout(25000),
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`WST HTTP ${response.status}`);
  return response.json();
};

const requestText = async (url, fetchImpl) => {
  const response = await fetchImpl(url, {
    signal: AbortSignal.timeout(25000),
    headers: { Accept: "text/html" },
  });
  if (!response.ok) throw new Error(`Calendar HTTP ${response.status}`);
  return response.text();
};

const emptySnapshot = () => ({ version: 1, intervalMs: INTERVAL_MS, events: {}, failures: {} });

async function readSnookerSnapshot(db) {
  try {
    const result = await db.collection(COLLECTION).doc(SNAPSHOT_ID).get();
    const record = result.data?.[0];
    return record?.snapshot || null;
  } catch (error) {
    if (String(error?.code || '').includes('COLLECTION_NOT_EXIST')) return null;
    throw error;
  }
}

async function ensureSnookerCollection(db) {
  try {
    await db.createCollection(COLLECTION);
  } catch (error) {
    const message = `${error?.code || ''} ${error?.message || ''}`;
    if (!/already|exist|duplicate/i.test(message)) throw error;
  }
}

async function refreshSnookerScores(db, { now = new Date(), fetchImpl = fetch } = {}) {
  await ensureSnookerCollection(db);
  const previous = (await readSnookerSnapshot(db)) || emptySnapshot();
  const fetchedAt = now.toISOString();
  const next = { ...previous, intervalMs: INTERVAL_MS, checkedAt: fetchedAt, failures: {}, events: { ...previous.events } };
  // The existing timer runs every 20 minutes; only fetch rankings when at least 30 minutes old.
  if (!previous.rankings || now - Date.parse(previous.rankings.fetchedAt) >= 30 * 60 * 1000) {
    try {
      next.rankings = normalizeRankings(await requestJson(RANKINGS_ENDPOINT, fetchImpl), fetchedAt);
    } catch (error) {
      next.failures.rankings = { checkedAt: fetchedAt, message: error.message };
    }
  }
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(now);
  const cutoff = new Date(Date.parse(today) - 2 * 86400000).toISOString().slice(0, 10);
  const horizon = new Date(Date.parse(today) + 30 * 86400000).toISOString().slice(0, 10);
  const events = readEvents(await requestText(CALENDAR_URL, fetchImpl))
    .filter((event) => event.end >= cutoff && event.start <= horizon);
  const tournaments = [];
  let url = WST_ENDPOINT;
  try {
    for (let page = 0; url && page < 10; page += 1) {
      const response = await requestJson(url, fetchImpl);
      if (!Array.isArray(response.data)) throw new Error("Invalid WST tournament list");
      tournaments.push(...response.data);
      url = response.links?.next || null;
    }
    if (url) throw new Error("Incomplete WST tournament list");
    for (const event of events) {
      try {
        const tournament = findTournament(event, tournaments);
        if (!tournament) throw new Error("WST 尚无可匹配的赛事数据");
        const result = normalizeTournament(event.id, await requestJson(WST_ENDPOINT + tournament.id, fetchImpl), fetchedAt);
        if (!result.matches.length) throw new Error("WST 尚未公布场次");
        if (previous.events[event.id]?.matches.length > result.matches.length) {
          throw new Error("WST 返回场次数量减少，保留上次完整记录");
        }
        next.events[event.id] = result;
      } catch (error) {
        next.failures[event.id] = { checkedAt: fetchedAt, message: error.message };
      }
    }
  } catch (error) {
    next.failures.source = { checkedAt: fetchedAt, message: error.message };
  }
  await db.collection(COLLECTION).doc(SNAPSHOT_ID).set({
    snapshot: next,
    updatedAt: fetchedAt,
    source: "WST 官方赛事数据",
  });
  const updated = Object.values(next.events).filter((event) => event.fetchedAt === fetchedAt);
  return {
    success: true,
    checkedAt: fetchedAt,
    updated: updated.map((event) => ({
      id: event.id,
      matches: event.matches.length,
      live: event.matches.filter((match) => match.status === "live").length,
      completed: event.matches.filter((match) => match.status === "ended").length,
    })),
    failures: next.failures,
  };
}

module.exports = { findTournament, normalizeTournament, normalizeRankings, readEvents, readSnookerSnapshot, refreshSnookerScores };
