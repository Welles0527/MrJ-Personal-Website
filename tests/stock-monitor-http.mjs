import assert from "node:assert/strict";
import { createHandler, createTokenVerifier } from "../cloudfunctions/stock-monitor-reports/http-handler.mjs";
import { productionRuntime } from "../cloudfunctions/stock-monitor-reports/runtime.mjs";
const resource = "https://reports.example.test/mcp";
let saves = 0;
const handler = createHandler({
  resource, issuer: "https://auth.example.test",
  verifyToken: async token => {
    if (token !== "test-only") throw new Error("Invalid token");
    return { subject: "owner", scopes: ["reports:write"] };
  },
  service: {
    latest: async code => code === "301026" ? { code, reportDate: "2026-09-09" } : null,
    save: async (_input, principal) => {
      assert.equal(principal.subject, "owner"); saves++;
      return { saved: true, receipt: "test-receipt" };
    }
  }
});
const request = (path, options) => handler(new Request(new URL(path, resource), options));
let response = await request("/mcp", { method: "POST" });
assert.equal(response.status, 401);
assert.match(response.headers.get("WWW-Authenticate"), /oauth-protected-resource/);
assert.equal(saves, 0);
response = await request("/.well-known/oauth-protected-resource");
assert.equal((await response.json()).resource, resource);
response = await request("/reports/latest?code=301026", { headers: { Origin: "https://www.magicj.cn" } });
assert.equal(response.headers.get("Cache-Control"), "no-store");
assert.equal((await response.json()).report.code, "301026");
response = await request("/mcp", { method: "POST", headers: { Origin: "https://evil.example" } });
assert.equal(response.status, 403);
const rpc = async (method, params, token = "test-only") => request("/mcp", {
  method: "POST",
  headers: {
    Authorization: "Bearer " + token, "Content-Type": "application/json",
    Accept: "application/json, text/event-stream", "MCP-Protocol-Version": "2025-03-26"
  },
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params })
});
response = await rpc("initialize", { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "test", version: "1" } });
assert.equal(response.status, 200);
assert.equal((await response.json()).result.serverInfo.name, "stock-monitor-reports");
response = await rpc("tools/list", {});
const tool = (await response.json()).result.tools[0];
assert.equal(tool.name, "save_stock_monitor_report");
assert.equal(tool.securitySchemes[0].type, "oauth2");
response = await rpc("tools/call", { name: tool.name, arguments: {} });
assert.equal((await response.json()).result.structuredContent.receipt, "test-receipt");
assert.equal(saves, 1);
response = await rpc("tools/call", { name: tool.name, arguments: {} }, "invalid");
assert.equal(response.status, 401);
assert.equal(saves, 1);
response = await rpc("tools/call", { name: "unknown", arguments: {} });
assert.equal((await response.json()).result.isError, true);
assert.equal(saves, 1);
assert.throws(() => createTokenVerifier({}), /HTTPS/);
await assert.rejects(productionRuntime(), /configuration missing/);
console.log("HTTP checks passed: MCP initialize/list/call, OAuth challenge, unauthorized/origin rejection, public no-store reads, missing configuration fails closed. OAuth issuer and real database are not exercised by this local test.");
