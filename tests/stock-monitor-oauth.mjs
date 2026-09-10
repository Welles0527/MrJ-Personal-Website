import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { createOAuthServer } from "../cloudfunctions/stock-monitor-reports/oauth-server.mjs";
const require = createRequire(new URL("../cloudfunctions/stock-monitor-reports/package.json", import.meta.url));
const { generateKeyPair, exportJWK } = await import(pathToFileURL(require.resolve("jose")).href);
const { privateKey } = await generateKeyPair("RS256", { extractable: true });
const privateJwk = await exportJWK(privateKey); privateJwk.kid = "test-key";
const data = new Map(); let queue = Promise.resolve();
const repository = {
  get: async id => structuredClone(data.get(id)),
  set: async (id, value) => data.set(id, structuredClone(value)),
  transaction(callback) {
    const result = queue.then(async () => {
      const draft = new Map(data);
      const result = await callback({
        get: async id => structuredClone(draft.get(id)),
        set: async (id, value) => draft.set(id, structuredClone(value))
      });
      data.clear(); draft.forEach((v, k) => data.set(k, v)); return result;
    });
    queue = result.catch(() => {}); return result;
  }
};
const issuer = "https://reports.example.test", resource = issuer + "/mcp";
const secret = randomBytes(32).toString("base64url");
const oauth = await createOAuthServer({ issuer, resource, writerId: "owner", secretHash: createHash("sha256").update(secret).digest("hex"), privateJwk, repository });
const call = (path, options) => oauth.handle(new Request(issuer + path, options), path.split("?")[0]);
const register = redirect => call("/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ redirect_uris: [redirect] }) });
assert.equal((await register("https://evil.example/callback")).status, 400);
const redirect = "https://chatgpt.com/connector_platform_oauth_redirect";
const client = await (await register(redirect)).json();
const verifier = randomBytes(32).toString("base64url");
const params = new URLSearchParams({
  client_id: client.client_id, redirect_uri: redirect, response_type: "code", resource,
  scope: "reports:write", state: "test-state", code_challenge_method: "S256",
  code_challenge: createHash("sha256").update(verifier).digest("base64url")
});
let response = await call("/authorize?" + params);
assert.equal(response.status, 200);
const html = await response.text();
const csrf = html.match(/name="csrf" value="([^"]+)"/)[1];
const cookie = response.headers.get("Set-Cookie").split(";")[0];
const approve = (code, csrfValue = csrf, origin = issuer) => call("/authorize", {
  method: "POST", headers: { Origin: origin, Cookie: cookie },
  body: new URLSearchParams({ csrf: csrfValue, secret: code })
});
assert.equal((await approve(secret, csrf, "https://evil.example")).status, 403);
assert.equal((await approve(secret, "bad")).status, 403);
assert.equal((await approve("wrong-secret")).status, 403);
response = await approve(secret);
assert.equal(response.status, 303);
const callback = new URL(response.headers.get("Location"));
assert.equal(callback.searchParams.get("state"), "test-state");
assert.equal(callback.searchParams.get("iss"), issuer);
assert.equal((await approve(secret)).status, 403);
const exchange = fields => call("/token", { method: "POST", body: new URLSearchParams(fields) });
const grant = { grant_type: "authorization_code", code: callback.searchParams.get("code"), client_id: client.client_id, redirect_uri: redirect, code_verifier: verifier, resource };
assert.equal((await exchange({ ...grant, code_verifier: "incorrect" })).status, 400);
assert.equal((await exchange({ ...grant, resource: "https://evil.example" })).status, 400);
const tokens = await (await exchange(grant)).json();
assert.ok(tokens.access_token);
assert.equal((await oauth.verify(tokens.access_token)).subject, "owner");
assert.equal((await exchange(grant)).status, 400);
const refreshGrant = { grant_type: "refresh_token", refresh_token: tokens.refresh_token, resource, client_id: client.client_id };
const refreshed = await (await exchange(refreshGrant)).json();
assert.ok(refreshed.access_token);
assert.notEqual(refreshed.refresh_token, tokens.refresh_token);
assert.equal((await oauth.verify(refreshed.access_token)).scopes[0], "reports:write");
assert.equal((await exchange(refreshGrant)).status, 400);
await assert.rejects(oauth.verify(refreshed.access_token), /Revoked/);
await assert.rejects(oauth.verify("invalid"));
console.log("OAuth flow passed: exact callback, CSRF/origin, owner proof, PKCE, single-use grant, signed access token, refresh rotation and replay revocation.");
