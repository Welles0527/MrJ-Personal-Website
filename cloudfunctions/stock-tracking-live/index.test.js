"use strict";

const assert = require("assert");
const service = require("./index");

async function run() {
  assert.strictEqual(service.validateCode("301026"), "301026");
  assert.strictEqual(service.validateCode("30102"), "");
  assert.strictEqual(service.sentimentFromTitle("公司拟回购股份"), "利好");
  assert.strictEqual(service.sentimentFromTitle("股东计划减持"), "利空");
  assert.strictEqual(service.categoryFromNews("黄金板块走强", ""), "industry");
  assert.deepStrictEqual(service.companyEventKind("预约披露日"), { kind: "calendar", label: "个股日历" });
  assert.deepStrictEqual(service.companyEventKind("大宗交易"), { kind: "block-trade", label: "大宗交易" });
  assert.deepStrictEqual(service.companyEventKind("高管持股"), { kind: "reminder", label: "大事提醒" });

  const quote = await service.fetchQuote("301026");
  assert.strictEqual(quote.code, "301026");
  assert.ok(Number.isFinite(quote.price) && quote.price > 0);
  assert.match(quote.updatedAt, /^\d{4}-\d{2}-\d{2}T/);

  const events = await service.fetchCompanyEvents("301026", 16);
  assert.ok(events.length > 0);
  assert.ok(events.every(item => item.category === "company" && item.sentiment === "中性"));
  assert.ok(events.every(item => ["个股日历", "大事提醒", "大宗交易"].includes(item.eventLabel)));
  assert.ok(events.every(item => item.eventType !== "公告"));
  assert.ok(events.some(item => item.eventLabel === "大宗交易"));

  const response = await service.handleRequest(
    "GET",
    new URL("/api/stock-tracking-live?code=301026&include=quote,announcements,news,events", "http://127.0.0.1"),
    "https://www.magicj.cn"
  );
  assert.strictEqual(response.statusCode, 200);
  const payload = JSON.parse(response.body);
  assert.strictEqual(payload.code, "301026");
  assert.ok(payload.quote?.price > 0);
  assert.ok(Array.isArray(payload.announcements));
  assert.ok(Array.isArray(payload.news));
  assert.ok(Array.isArray(payload.events));
  assert.ok(payload.announcements.every(item => ["利好", "利空", "中性"].includes(item.sentiment)));
  assert.ok(payload.news.every(item => ["利好", "利空", "中性"].includes(item.sentiment)));
  assert.ok(payload.events.every(item => item.sentiment === "中性"));
  assert.strictEqual(response.headers["Access-Control-Allow-Origin"], "https://www.magicj.cn");

  console.log(JSON.stringify({
    quote: payload.quote,
    announcements: payload.announcements.length,
    news: payload.news.length,
    events: payload.events.length,
    errors: payload.errors
  }, null, 2));
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
