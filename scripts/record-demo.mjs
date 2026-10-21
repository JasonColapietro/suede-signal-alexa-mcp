import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const base = new URL(process.env.DEMO_BASE_URL || "https://suede-signal-alexa-mcp.vercel.app");
if (!["http:", "https:"].includes(base.protocol)) throw new Error("DEMO_BASE_URL must be an http(s) origin.");
const out = resolve(process.env.DEMO_OUTPUT_DIR || "recordings");
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, recordVideo: { dir: out, size: { width: 1920, height: 1080 } }, reducedMotion: "reduce" });
const page = await context.newPage();
const started = Date.now();
const chapters = [];
const traffic = [];
page.on("response", async (response) => {
  if (new URL(response.url()).pathname !== "/mcp") return;
  const request = response.request();
  const text = await response.text().catch(() => "");
  traffic.push({ request: request.postDataJSON(), status: response.status(), response: text ? JSON.parse(text) : null });
});
const mark = (title, narration) => chapters.push({ start: (Date.now() - started) / 1000, title, narration });
const hold = (ms) => page.waitForTimeout(ms);
async function clickAndWait(name) {
  await page.getByRole("button", { name, exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Complete · real audit result", { timeout: 65000 });
  await expect(page.getByRole("alert")).toBeHidden();
}
try {
  await page.goto(new URL("/demo.html", base).href, { waitUntil: "networkidle" });
  mark("The idea", "Suede Signal for Alexa Plus turns website readiness checks into a clear next step. This is a simulated interaction with a real MCP server. It does not connect to a production Alexa device.");
  await hold(15500);
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Connected · 3 tools · 2025-11-25", { timeout: 20000 });
  mark("A real MCP connection", "Connect negotiates MCP version twenty twenty-five, eleven, twenty-five, then initializes the client and discovers three tools. The entries below contain the actual requests and responses.");
  await hold(14500);
  await clickAndWait("Check AI readiness");
  mark("Check a website", "The first tool audits example dot com. It returns a grade, a readiness score, and up to three spoken fixes. These are deterministic page checks. They do not measure actual citations or recommendations in AI answers.");
  await hold(19500);
  await page.getByText("Structured result", { exact: true }).click();
  mark("Text and structured evidence", "The same check also returns structured data for a visual client. The result includes area scores, suggested fixes, and a timestamp. These are live audit results, not recorded sample answers.");
  await hold(15500);
  await page.getByText("Structured result", { exact: true }).click();
  await page.locator("header").scrollIntoViewIfNeeded();
  await clickAndWait("Compare sites");
  mark("Compare two sites", "The comparison tool audits both sites and identifies the largest weighted area deficit. The two example sites demonstrate the workflow. We are not claiming they are business competitors, or that a score predicts commercial outcomes.");
  await page.screenshot({ path: resolve(out, "cover.png") });
  await hold(18500);
  await clickAndWait("Explain this area");
  mark("Explore the findings", "The third tool explains one selected area. Here, structured data. It reports checks passed and possible repairs. This tool currently returns text only. No website changes are made.");
  await hold(15500);
  await page.locator("#protocol-title").scrollIntoViewIfNeeded();
  await page.locator("#rpc-log details").last().locator("summary").click();
  mark("Scope and source", "The existing Signal API provides the audit engine. The hackathon work adds this MCP adapter, speech formatting, comparison and explanation tools, the working browser demo, and tests. The adapter is MIT licensed. Source and setup instructions are linked above.");
  await hold(19500);
  const duration = (Date.now() - started) / 1000;
  if (duration >= 175) throw new Error(`Recording is too long: ${duration}s. Review timing before publication.`);
  await writeFile(resolve(out, "chapters.json"), JSON.stringify({ base: base.origin, duration, chapters }, null, 2));
  await writeFile(resolve(out, "live-protocol.json"), JSON.stringify(traffic, null, 2));
  await context.close();
  await page.video().saveAs(resolve(out, "demo-raw.webm"));
  console.log(JSON.stringify({ out, duration, chapters: chapters.length, calls: traffic.length }));
} finally {
  await context.close().catch(() => {});
  await browser.close();
}
