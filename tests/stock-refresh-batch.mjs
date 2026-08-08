import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requests = [];
const localValues = new Map();
let rateLimited = false;
const window = {
  location: { hostname: "www.magicj.cn", origin: "https://www.magicj.cn" },
  setTimeout,
  clearTimeout,
  localStorage: {
    getItem: key => localValues.get(key) || null,
    setItem: (key, value) => localValues.set(key, String(value))
  },
  fetch: async url => {
    const requestUrl = new URL(String(url));
    requests.push(requestUrl);
    if (rateLimited) return { ok: false, status: 429, json: async () => ({}) };
    const sections = requestUrl.searchParams.get("include").split(",");
    const codes = requestUrl.searchParams.get("codes").split(",");
    return {
      ok: true,
      status: 200,
      json: async () => ({
        checkedAt: "2026-08-08T10:00:00+08:00",
        stocks: codes.map(code => ({
          code,
          ...(sections.includes("quote") ? { quote: { code, price: 20 } } : {}),
          ...(sections.includes("announcements") ? { announcements: [] } : {}),
          ...(sections.includes("news") ? { news: [] } : {}),
          ...(sections.includes("events") ? { events: [{ id: `event-${code}`, sentiment: "中性" }] } : {}),
          errors: {}
        }))
      })
    };
  }
};
const context = vm.createContext({ window, document: {}, URL, AbortController, Intl, Date, Math, console });
vm.runInContext(
  fs.readFileSync(path.join(root, "public", "stock-tracking", "stock-live-data-provider.js"), "utf8"),
  context
);

const Provider = window.StockTrackingLiveData.EastmoneyStockLiveDataProvider;
const stocks = [
  { code: "301026", name: "浩通科技" },
  { code: "688633", name: "星球石墨" }
];
const provider = new Provider();
const first = await provider.getWatchlistSnapshot(stocks, {
  sections: ["quote", "announcements", "news", "events"],
  force: true
});
assert.strictEqual(requests.length, 1);
assert.strictEqual(requests[0].searchParams.get("codes"), "301026,688633");
assert.ok(first.every(item => item.quote && item.events.length === 1));

rateLimited = true;
const restored = await new Provider().getWatchlistSnapshot(stocks, {
  sections: ["quote", "announcements", "news", "events"],
  force: true
});
assert.deepStrictEqual([...restored].map(item => item.events[0].id), ["event-301026", "event-688633"]);
assert.ok(restored.every(item => item.stale === true));

const appSource = fs.readFileSync(path.join(root, "public", "stock-tracking", "app.js"), "utf8");
assert.match(appSource, /sameRefreshCodes[\s\S]{0,500}getWatchlistSnapshot\(feedStocks/);

console.log("stock refresh batch regression passed");
