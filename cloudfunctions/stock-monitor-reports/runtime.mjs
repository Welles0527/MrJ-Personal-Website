import cloudbase from "@cloudbase/node-sdk";
import { createCloudBaseRepository, createOAuthRepository } from "./cloudbase-repository.mjs";
import { createHandler } from "./http-handler.mjs";
import { createOAuthServer } from "./oauth-server.mjs";
import serviceModule from "./report-service.cjs";

export async function createRuntime(config, db) {
  const { baseUrl, writerId, secretHash, privateJwk } = config;
  if (!baseUrl || new URL(baseUrl).protocol !== "https:" || baseUrl.endsWith("/")) throw new Error("Canonical HTTPS base URL required");
  const resource = baseUrl + "/mcp";
  const oauth = await createOAuthServer({
    issuer: baseUrl, resource, writerId, secretHash, privateJwk, repository: createOAuthRepository(db)
  });
  const service = serviceModule.createReportService({ repository: createCloudBaseRepository(db), writerId });
  const reports = createHandler({ service, verifyToken: oauth.verify, resource, issuer: baseUrl });
  const prefix = new URL(baseUrl).pathname.replace(/\/$/, "");
  return async request => {
    const url = new URL(request.url);
    if (url.pathname === "/.well-known/oauth-authorization-server" + prefix) {
      return oauth.handle(request, "/.well-known/oauth-authorization-server");
    }
    if (prefix && url.pathname !== prefix && !url.pathname.startsWith(prefix + "/")) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    url.pathname = url.pathname.slice(prefix.length) || "/";
    const normalized = new Request(url, request);
    return await oauth.handle(normalized, url.pathname) || reports(normalized);
  };
}

export async function productionRuntime() {
  const { CLOUDBASE_ENV_ID, REPORT_WRITER_ID, REPORT_BASE_URL, REPORT_OWNER_SECRET_HASH, REPORT_PRIVATE_JWK_B64 } = process.env;
  if (!CLOUDBASE_ENV_ID || !REPORT_PRIVATE_JWK_B64) throw new Error("Report service configuration missing");
  const db = cloudbase.init({ env: CLOUDBASE_ENV_ID }).database();
  return createRuntime({
    baseUrl: REPORT_BASE_URL, writerId: REPORT_WRITER_ID,
    secretHash: REPORT_OWNER_SECRET_HASH, privateJwk: JSON.parse(Buffer.from(REPORT_PRIVATE_JWK_B64, "base64").toString("utf8"))
  }, db);
}
