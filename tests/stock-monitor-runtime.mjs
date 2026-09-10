import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { createHash, randomBytes } from "node:crypto";
import { createRuntime } from "../cloudfunctions/stock-monitor-reports/runtime.mjs";
const require = createRequire(new URL("../cloudfunctions/stock-monitor-reports/package.json", import.meta.url));
const { generateKeyPair, exportJWK } = await import(pathToFileURL(require.resolve("jose")).href);
const { privateKey } = await generateKeyPair("RS256", { extractable: true });
const privateJwk = await exportJWK(privateKey); privateJwk.kid = "runtime-test";
const records = new Map(); let queue = Promise.resolve();
const access = data => ({ collection: name => ({ doc: id => ({
  get: async () => ({ data: data.has(name + id) ? [structuredClone(data.get(name + id))] : [] }),
  set: async row => { data.set(name + id, structuredClone(row)); return { updated: 1 }; }
}) }) });
const db = {
  ...access(records),
  runTransaction(fn) {
    const result = queue.then(async () => {
      const draft = new Map(records);
      const result = await fn(access(draft));
      records.clear(); draft.forEach((v, k) => records.set(k, v)); return result;
    });
    queue = result.catch(() => {}); return result;
  }
};
const baseUrl = "https://www.magicj.cn/api/stock-monitor-reports";
const secret = randomBytes(32).toString("base64url");
const config = { baseUrl, writerId: "owner", privateJwk, secretHash: createHash("sha256").update(secret).digest("hex") };
let handler = await createRuntime(config, db);
const call = (path, options) => handler(new Request(baseUrl + path, options));
const post = body => ({ method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" }, body: JSON.stringify(body) });
const discovery = await (await call("/.well-known/oauth-protected-resource")).json();
assert.equal(discovery.authorization_servers[0], baseUrl);
let response = await call("/mcp", post({}));
assert.equal(response.status, 401);
assert.ok(response.headers.get("WWW-Authenticate").includes(baseUrl + "/.well-known/"));
const client = await (await call("/register", post({ redirect_uris: ["https://chatgpt.com/connector_platform_oauth_redirect"] }))).json();
const verifier = randomBytes(32).toString("base64url");
const params = new URLSearchParams({
  client_id: client.client_id, redirect_uri: client.redirect_uris[0], response_type: "code", resource: baseUrl + "/mcp",
  scope: "reports:write", state: "state", code_challenge_method: "S256", code_challenge: createHash("sha256").update(verifier).digest("base64url")
});
response = await call("/authorize?" + params);
const cookie = response.headers.get("Set-Cookie").split(";")[0];
const html = await response.text();
const csrf = html.match(/name="csrf" value="([^"]+)"/)[1];
response = await call("/authorize", { method: "POST", headers: { Origin: new URL(baseUrl).origin, Cookie: cookie }, body: new URLSearchParams({ csrf, secret }) });
assert.equal(response.status, 303);
const code = new URL(response.headers.get("Location")).searchParams.get("code");
response = await call("/token", { method: "POST", body: new URLSearchParams({
  grant_type: "authorization_code", code, code_verifier: verifier, client_id: client.client_id,
  redirect_uri: client.redirect_uris[0], resource: baseUrl + "/mcp"
}) });
const tokens = await response.json();
assert.ok(tokens.access_token);
const input = {
  code: "301026", name: "浩通科技", reportDate: "2026-09-09",
  rows: ["基本面", "机构", "筹码", "资金面", "风险事项", "综合"].map(label => ({ label, tone: "neutral", rating: "中性", comparison: "不变", evidence: "仅本地测试" }))
};
const options = post({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "save_stock_monitor_report", arguments: input } });
options.headers.Authorization = "Bearer " + tokens.access_token;
options.headers["MCP-Protocol-Version"] = "2025-03-26";
response = await call("/mcp", options);
const saved = await response.json();
assert.equal(saved.result.structuredContent.saved, true);
handler = await createRuntime(config, db);
const report = (await (await call("/reports/latest?code=301026")).json()).report;
assert.equal(report.code, "301026"); assert.equal(report.rows.length, 6);
assert.equal(report.receipt, saved.result.structuredContent.receipt);
console.log("Runtime integration passed: prefixed OAuth authorization, MCP write, transactional adapter, recreate runtime and readback. Storage remains a test double.");
