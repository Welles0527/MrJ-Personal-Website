import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { importJWK, exportJWK, SignJWT, jwtVerify } from "jose";

const hash = value => createHash("sha256").update(value).digest("hex");
const random = () => randomBytes(32).toString("base64url");
const invalid = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const json = (value, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
const escape = value => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const safeEqual = (a, b) => typeof a === "string" && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

// A dedicated, single-owner authorization server. The high-entropy setup secret
// is entered by the owner in the browser, never supplied to the model as a tool argument.
export async function createOAuthServer({ issuer, resource, writerId, secretHash, privateJwk, repository, now = () => Date.now() }) {
  if (new URL(issuer).protocol !== "https:" || !writerId || !/^[a-f0-9]{64}$/.test(secretHash)) throw new Error("Invalid OAuth configuration");
  const key = await importJWK(privateJwk, "RS256");
  const publicJwk = await exportJWK(await importJWK(Object.fromEntries(Object.entries(privateJwk).filter(([k]) => !["d", "p", "q", "dp", "dq", "qi", "oth"].includes(k))), "RS256"));
  publicJwk.kid = privateJwk.kid;
  publicJwk.alg = "RS256";
  publicJwk.use = "sig";
  const publicKey = await importJWK(publicJwk, "RS256");
  const seconds = () => Math.floor(now() / 1000);
  const metadata = {
    issuer, authorization_endpoint: issuer + "/authorize", token_endpoint: issuer + "/token",
    registration_endpoint: issuer + "/register", jwks_uri: issuer + "/jwks",
    response_types_supported: ["code"], grant_types_supported: ["authorization_code", "refresh_token"],
    token_endpoint_auth_methods_supported: ["none"], code_challenge_methods_supported: ["S256"],
    scopes_supported: ["reports:write"], authorization_response_iss_parameter_supported: true
  };
  const verify = async token => {
    const { payload } = await jwtVerify(token, publicKey, { issuer, audience: resource, algorithms: ["RS256"], requiredClaims: ["sub", "exp", "iat", "jti"], currentDate: new Date(now()) });
    const family = await repository.get("family_" + payload.family);
    if (!family || family.revoked || family.expiresAt <= now()) invalid("Revoked authorization", 401);
    return { subject: payload.sub, scopes: payload.scope.split(" ") };
  };
  const issue = async (tx, grant, familyId) => {
    const access = await new SignJWT({ scope: "reports:write", family: familyId })
      .setProtectedHeader({ alg: "RS256", kid: privateJwk.kid }).setSubject(writerId).setIssuer(issuer)
      .setAudience(resource).setIssuedAt(seconds()).setExpirationTime(seconds() + 900).setJti(random()).sign(key);
    const refresh = random();
    await tx.set("refresh_" + hash(refresh), { ...grant, familyId, used: false, expiresAt: now() + 30 * 86400000 });
    return { access_token: access, token_type: "Bearer", expires_in: 900, refresh_token: refresh, scope: "reports:write" };
  };
  const authorization = async params => {
    const client = await repository.get("client_" + params.get("client_id"));
    if (!client || !client.redirect_uris.includes(params.get("redirect_uri"))) invalid("Invalid client or callback");
    if (params.get("response_type") !== "code" || params.get("resource") !== resource || params.get("scope") !== "reports:write" ||
        params.get("code_challenge_method") !== "S256" || !/^[A-Za-z0-9_-]{43}$/.test(params.get("code_challenge") || "") ||
        !params.get("state") || params.get("state").length > 2048) invalid("Invalid authorization request");
    return { clientId: params.get("client_id"), redirectUri: params.get("redirect_uri"), challenge: params.get("code_challenge"), state: params.get("state"), resource };
  };
  async function handle(request, pathname) {
    try {
      if (request.method === "GET" && pathname === "/.well-known/oauth-authorization-server") return json(metadata);
      if (request.method === "GET" && pathname === "/jwks") return json({ keys: [publicJwk] });
      if (request.method === "POST" && pathname === "/register") {
        const body = await request.json();
        if (!Array.isArray(body.redirect_uris) || body.redirect_uris.length !== 1 ||
            body.redirect_uris[0] !== "https://chatgpt.com/connector_platform_oauth_redirect" ||
            ![undefined, "none"].includes(body.token_endpoint_auth_method)) invalid("Unsupported client registration");
        const clientId = random();
        const client = { client_id: clientId, redirect_uris: body.redirect_uris, token_endpoint_auth_method: "none", grant_types: ["authorization_code", "refresh_token"], response_types: ["code"] };
        await repository.set("client_" + clientId, client);
        return json(client, 201);
      }
      if (request.method === "GET" && pathname === "/authorize") {
        const grant = await authorization(new URL(request.url).searchParams);
        const nonce = random();
        await repository.set("pending_" + hash(nonce), { ...grant, expiresAt: now() + 600000 });
        const html = '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>授权监控报告同步</title><style>body{background:#101214;color:#eee;font:16px system-ui;max-width:480px;margin:8vh auto;padding:24px}input,button{box-sizing:border-box;width:100%;padding:14px;margin:12px 0;border-radius:8px}button{background:#c6a56b;border:0;font-weight:bold}</style><h1>授权监控报告同步</h1><p>允许 ChatGPT 保存浩通科技、振江股份、星球石墨和回盛生物的评级结论到你的网站。</p><form method="post" action="' + escape(issuer + "/authorize") + '"><input type="hidden" name="csrf" value="' + nonce + '"><label>网站连接授权码<input type="password" name="secret" required autocomplete="off"></label><button>授权写入评级结论</button></form><p>此授权不提供其他网站数据的访问权限。</p></html>';
        return new Response(html, { headers: {
          "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store",
          "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
          "Referrer-Policy": "no-referrer",
          "Set-Cookie": "monitor_oauth=" + nonce + "; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600"
        } });
      }
      if (request.method === "POST" && pathname === "/authorize") {
        if (request.headers.get("origin") !== new URL(issuer).origin) invalid("Invalid origin", 403);
        const form = await request.formData();
        const nonce = String(form.get("csrf") || "");
        const cookie = request.headers.get("cookie")?.match(/(?:^|;\s*)monitor_oauth=([^;]+)/)?.[1];
        if (!/^[A-Za-z0-9_-]{43}$/.test(nonce) || !safeEqual(nonce, cookie || "")) invalid("Invalid authorization session", 403);
        const secret = String(form.get("secret") || "");
        const code = random();
        const result = await repository.transaction(async tx => {
          const pending = await tx.get("pending_" + hash(nonce));
          if (!pending || pending.used || pending.expiresAt <= now()) return { error: "Expired authorization session" };
          const throttle = await tx.get("owner_attempts") || { count: 0, resetAt: now() + 600000 };
          if (throttle.resetAt <= now()) { throttle.count = 0; throttle.resetAt = now() + 600000; }
          if (throttle.count >= 10) return { error: "Too many attempts; retry in ten minutes" };
          if (secret.length > 256 || !safeEqual(hash(secret), secretHash)) {
            await tx.set("owner_attempts", { ...throttle, count: throttle.count + 1 });
            return { error: "Invalid authorization code" };
          }
          await tx.set("pending_" + hash(nonce), { ...pending, used: true });
          await tx.set("code_" + hash(code), { ...pending, used: false, expiresAt: now() + 120000 });
          return pending;
        });
        if (result.error) invalid(result.error, 403);
        const redirect = new URL(result.redirectUri);
        redirect.searchParams.set("code", code); redirect.searchParams.set("state", result.state); redirect.searchParams.set("iss", issuer);
        return new Response(null, { status: 303, headers: { Location: redirect.href, "Cache-Control": "no-store", "Set-Cookie": "monitor_oauth=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0" } });
      }
      if (request.method === "POST" && pathname === "/token") {
        const form = await request.formData();
        if (form.get("resource") !== resource) invalid("Invalid resource");
        const type = form.get("grant_type");
        if (!["authorization_code", "refresh_token"].includes(type)) invalid("Unsupported grant");
        const raw = String(form.get(type === "authorization_code" ? "code" : "refresh_token") || "");
        if (!/^[A-Za-z0-9_-]{43}$/.test(raw)) invalid("Invalid grant");
        const result = await repository.transaction(async tx => {
          const id = (type === "authorization_code" ? "code_" : "refresh_") + hash(raw);
          const grant = await tx.get(id);
          if (!grant || grant.expiresAt <= now() || grant.clientId !== form.get("client_id")) return { error: "invalid_grant" };
          if (type === "authorization_code") {
            const verifier = String(form.get("code_verifier") || "");
            const challenge = createHash("sha256").update(verifier).digest("base64url");
            if (grant.used || !/^[A-Za-z0-9._~-]{43,128}$/.test(verifier) || challenge !== grant.challenge || form.get("redirect_uri") !== grant.redirectUri) return { error: "invalid_grant" };
            const familyId = random();
            await tx.set("family_" + familyId, { revoked: false, expiresAt: now() + 90 * 86400000 });
            await tx.set(id, { ...grant, used: true });
            return issue(tx, grant, familyId);
          }
          const family = await tx.get("family_" + grant.familyId);
          if (!family || family.revoked || family.expiresAt <= now()) return { error: "invalid_grant" };
          if (grant.used) {
            await tx.set("family_" + grant.familyId, { ...family, revoked: true });
            return { error: "invalid_grant" };
          }
          await tx.set(id, { ...grant, used: true });
          return issue(tx, grant, grant.familyId);
        });
        return json(result, result.error ? 400 : 200);
      }
      return null;
    } catch (error) {
      return json({ error: error.status ? error.message : "Authorization service unavailable" }, error.status || 503);
    }
  }
  return { handle, verify };
}
