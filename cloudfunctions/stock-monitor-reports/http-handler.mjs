import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { createRemoteJWKSet, jwtVerify } from "jose";
import serviceModule from "./report-service.cjs";
const { SAVE_TOOL } = serviceModule;

const json = (value, status = 200, headers = {}) => Response.json(value, {
  status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...headers }
});

export function createTokenVerifier({ issuer, audience, jwksUrl }) {
  for (const value of [issuer, audience, jwksUrl]) {
    if (!value || new URL(value).protocol !== "https:") throw new Error("HTTPS OAuth configuration required");
  }
  const jwks = createRemoteJWKSet(new URL(jwksUrl));
  return async token => {
    const { payload } = await jwtVerify(token, jwks, {
      issuer, audience, algorithms: ["RS256", "ES256"],
      requiredClaims: ["sub", "exp", "iat"], clockTolerance: 5
    });
    return { subject: payload.sub, scopes: typeof payload.scope === "string" ? payload.scope.split(" ") : [] };
  };
}

export function createHandler({ service, verifyToken, resource, issuer, allowedOrigins = ["https://www.magicj.cn", "https://chatgpt.com"] }) {
  if (!service || !verifyToken || !resource || !issuer) throw new Error("Report service and OAuth required");
  const metadataUrl = issuer + "/.well-known/oauth-protected-resource";
  const challenge = 'Bearer resource_metadata="' + metadataUrl + '", scope="reports:write"';
  return async request => {
    const origin = request.headers.get("origin");
    if (origin && !allowedOrigins.includes(origin)) return json({ error: "Forbidden origin" }, 403);
    const cors = origin ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : {};
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: {
      ...cors, "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type, MCP-Protocol-Version",
      "Access-Control-Expose-Headers": "WWW-Authenticate"
    } });
    if (request.method === "GET" && url.pathname === "/health") return json({ service: "stock-monitor-reports" }, 200, cors);
    if (request.method === "GET" && url.pathname === "/.well-known/oauth-protected-resource") {
      return json({ resource, authorization_servers: [issuer], scopes_supported: ["reports:write"] }, 200, cors);
    }
    try {
      if (request.method === "GET" && url.pathname === "/reports/latest") {
        const report = await service.latest(url.searchParams.get("code"));
        return json({ report }, 200, cors);
      }
      if (url.pathname !== "/mcp") return json({ error: "Not found" }, 404, cors);
      const token = request.headers.get("authorization")?.match(/^Bearer (\S+)$/i)?.[1];
      let principal;
      try {
        if (!token) throw new Error("Missing token");
        principal = await verifyToken(token);
        if (!principal.subject || !principal.scopes.includes("reports:write")) throw new Error("Missing scope");
      } catch {
        return json({ error: "Authorization required" }, 401, { ...cors, "WWW-Authenticate": challenge });
      }
      const server = new Server({ name: "stock-monitor-reports", version: "1.0.0" }, { capabilities: { tools: {} } });
      server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [SAVE_TOOL] }));
      server.setRequestHandler(CallToolRequestSchema, async ({ params }) => {
        if (params.name !== SAVE_TOOL.name) return { isError: true, content: [{ type: "text", text: "Unknown tool" }] };
        try {
          const receipt = await service.save(params.arguments, principal);
          return { content: [{ type: "text", text: JSON.stringify(receipt) }], structuredContent: receipt };
        } catch (error) {
          return { isError: true, content: [{ type: "text", text: error.status ? error.message : "Report storage unavailable; retry later" }] };
        }
      });
      const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: undefined, enableJsonResponse: true, maxRequestBodySize: 65536
      });
      try {
        await server.connect(transport);
        const response = await transport.handleRequest(request);
        const body = await response.arrayBuffer();
        return new Response(body.byteLength ? body : null, {
          status: response.status, headers: { ...Object.fromEntries(response.headers), ...cors, "Cache-Control": "no-store" }
        });
      } finally { await server.close(); }
    } catch (error) {
      return json({ error: error.status ? error.message : "Report service unavailable" }, error.status || 503, cors);
    }
  };
}
