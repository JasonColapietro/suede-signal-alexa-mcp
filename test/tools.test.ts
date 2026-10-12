import assert from "node:assert/strict";
import { test } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/tools.js";
import { AuditError, createSignalClient, type AuditFn } from "../src/signal.js";
import { strongReport, weakReport } from "./fixtures.js";

async function connect(audit: AuditFn) {
  const server = createServer(audit);
  const client = new Client({ name: "test", version: "0.0.0" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  return client;
}

const fakeAudit: AuditFn = async (url) => (url.includes("suedeai") ? strongReport : weakReport);

test("lists three read-only tools", async () => {
  const client = await connect(fakeAudit);
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((t) => t.name).sort(), [
    "check_ai_visibility",
    "compare_ai_visibility",
    "explain_ai_visibility_area",
  ]);
  for (const tool of tools) {
    assert.equal(tool.annotations?.readOnlyHint, true, tool.name);
    assert.equal(tool.annotations?.destructiveHint, false, tool.name);
  }
});

test("check_ai_visibility returns speech plus schema-valid structured content", async () => {
  const client = await connect(fakeAudit);
  const result = await client.callTool({ name: "check_ai_visibility", arguments: { url: "example.com" } });
  assert.notEqual(result.isError, true);
  const [first] = result.content as Array<{ type: string; text: string }>;
  assert.match(first.text, /gets an F/);
  const data = result.structuredContent as { grade: string; score: number; topFixes: string[] };
  assert.equal(data.grade, "F");
  assert.equal(data.score, 17);
  assert.equal(data.topFixes[0], "Add /llms.txt");
});

test("compare_ai_visibility audits both sites", async () => {
  const seen: string[] = [];
  const client = await connect(async (url) => {
    seen.push(url);
    return fakeAudit(url);
  });
  const result = await client.callTool({
    name: "compare_ai_visibility",
    arguments: { url: "example.com", competitorUrl: "seo.suedeai.ai" },
  });
  assert.deepEqual(seen.sort(), ["example.com", "seo.suedeai.ai"]);
  const [first] = result.content as Array<{ text: string }>;
  assert.match(first.text, /seo\.suedeai\.ai leads, 97 to 17/);
});

test("explain_ai_visibility_area rejects an unknown area", async () => {
  const client = await connect(fakeAudit);
  const result = await client.callTool({
    name: "explain_ai_visibility_area",
    arguments: { url: "example.com", area: "vibes" },
  });
  assert.equal(result.isError, true);
});

test("audit failures come back as a speakable tool error", async () => {
  const client = await connect(async () => {
    throw new AuditError("Could not reach nowhere.invalid. Check the address and try again.");
  });
  const result = await client.callTool({ name: "check_ai_visibility", arguments: { url: "nowhere.invalid" } });
  assert.equal(result.isError, true);
  const [first] = result.content as Array<{ text: string }>;
  assert.equal(first.text, "Could not reach nowhere.invalid. Check the address and try again.");
});

test("unexpected failures do not leak internals", async () => {
  const client = await connect(async () => {
    throw new Error("ECONNRESET at internal-host:8443");
  });
  const result = await client.callTool({ name: "check_ai_visibility", arguments: { url: "example.com" } });
  const [first] = result.content as Array<{ text: string }>;
  assert.doesNotMatch(first.text, /ECONNRESET|internal-host/);
});

test("signal client posts the url and surfaces API errors", async () => {
  let sent: { url: string; body: string } | undefined;
  const ok = createSignalClient("https://signal.test/api/audit", async (input, init) => {
    sent = { url: String(input), body: String(init?.body) };
    return new Response(JSON.stringify(weakReport), { status: 200 });
  });
  assert.equal((await ok("example.com")).grade, "F");
  assert.deepEqual(sent, { url: "https://signal.test/api/audit", body: '{"url":"example.com"}' });

  const bad = createSignalClient("https://signal.test/api/audit", async () =>
    new Response(JSON.stringify({ error: "Could not reach x.invalid." }), { status: 422 }),
  );
  await assert.rejects(bad("x.invalid"), { message: "Could not reach x.invalid." });

  const down = createSignalClient("https://signal.test/api/audit", async () => {
    throw new TypeError("fetch failed");
  });
  await assert.rejects(down("example.com"), /did not respond/);
});
