import assert from "node:assert/strict";
import { test } from "node:test";
import { handleMcpRequest } from "../src/http.js";
import { weakReport } from "./fixtures.js";

const audit = async () => weakReport;

function rpc(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("https://mcp.test/mcp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      "mcp-protocol-version": "2025-11-25",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

test("initialize negotiates protocol 2025-11-25 over Streamable HTTP", async () => {
  const res = await handleMcpRequest(
    rpc({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "alexa-test", version: "1" } },
    }),
    audit,
  );
  assert.equal(res.status, 200);
  const body = (await res.json()) as { result: { protocolVersion: string; serverInfo: { name: string } } };
  assert.equal(body.result.protocolVersion, "2025-11-25");
  assert.equal(body.result.serverInfo.name, "suede-signal-alexa");
});

test("tools/call works statelessly without a session", async () => {
  const res = await handleMcpRequest(
    rpc({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "check_ai_visibility", arguments: { url: "example.com" } } }),
    audit,
  );
  assert.equal(res.status, 200);
  const body = (await res.json()) as { result: { content: Array<{ text: string }> } };
  assert.match(body.result.content[0].text, /example\.com gets an F/);
});

test("browser origins are refused unless allow-listed", async () => {
  const call = { jsonrpc: "2.0", id: 3, method: "tools/list", params: {} };
  const blocked = await handleMcpRequest(rpc(call, { origin: "https://evil.test" }), audit);
  assert.equal(blocked.status, 403);

  process.env.ALLOWED_ORIGINS = "https://signal.suedeai.ai";
  try {
    const allowed = await handleMcpRequest(rpc(call, { origin: "https://signal.suedeai.ai" }), audit);
    assert.equal(allowed.status, 200);
  } finally {
    delete process.env.ALLOWED_ORIGINS;
  }
});
