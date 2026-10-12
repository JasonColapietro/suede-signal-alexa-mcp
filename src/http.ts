// Streamable HTTP endpoint (MCP spec 2025-11-25), stateless: each request gets
// a fresh server and transport, so it runs unchanged on serverless functions.

import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createServer } from "./tools.js";
import type { AuditFn } from "./signal.js";

// The spec requires servers to validate Origin to block DNS rebinding. Voice
// and agent clients send no Origin at all; a browser page does, and only the
// origins listed in ALLOWED_ORIGINS may call this server from one.
function originAllowed(origin: string | null): boolean {
  if (!origin) return true;
  const allowed = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  return allowed.includes(origin);
}

function jsonRpcError(status: number, message: string): Response {
  return new Response(JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message }, id: null }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function handleMcpRequest(request: Request, audit?: AuditFn): Promise<Response> {
  if (!originAllowed(request.headers.get("origin"))) {
    return jsonRpcError(403, "Origin not allowed.");
  }

  const server = createServer(audit);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  try {
    return await transport.handleRequest(request);
  } finally {
    // JSON responses are fully built before handleRequest resolves, so closing
    // here releases the per-request server without cutting a reply short.
    await server.close();
  }
}
