import assert from "node:assert/strict";
import { test } from "node:test";
import { createLocalServer } from "../src/local.js";

test("local judge path serves the demo and exact MCP endpoint, not arbitrary files", async () => {
  const server = createLocalServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`;
  try {
    for (const path of ["/", "/demo.html", "/demo.js", "/demo.css"]) {
      const response = await fetch(origin + path);
      assert.equal(response.status, 200, path);
      assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    }
    assert.equal((await fetch(origin + "/package.json")).status, 404);
    assert.equal((await fetch(origin + "/mcp-extra")).status, 404);
    const response = await fetch(origin + "/mcp", {
      method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-11-25", capabilities: {}, clientInfo: { name: "local-test", version: "1" } } }),
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).result.protocolVersion, "2025-11-25");
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
