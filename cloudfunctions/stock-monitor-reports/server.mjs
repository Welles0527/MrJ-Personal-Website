import { createServer } from "node:http";
import { productionRuntime } from "./runtime.mjs";
let runtime;
const server = createServer(async (incoming, outgoing) => {
  try {
    let size = 0;
    const chunks = [];
    for await (const chunk of incoming) {
      size += chunk.length;
      if (size > 65536) { outgoing.writeHead(413); outgoing.end("Request too large"); return; }
      chunks.push(chunk);
    }
    if (!runtime) runtime = await productionRuntime();
    const base = process.env.REPORT_BASE_URL;
    const request = new Request(new URL(incoming.url, base), {
      method: incoming.method, headers: incoming.headers,
      ...(!["GET", "HEAD"].includes(incoming.method) ? { body: Buffer.concat(chunks) } : {})
    });
    const response = await runtime(request);
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    outgoing.writeHead(503, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    outgoing.end('{"error":"Report service unavailable"}');
  }
});
server.requestTimeout = 30000;
server.headersTimeout = 15000;
server.listen(Number(process.env.PORT || 9000), process.env.HOST || "0.0.0.0");
