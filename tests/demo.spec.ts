import { test, expect } from "@playwright/test";

const report = { url: "https://example.com", grade: "F", score: 17, areas: [], topFixes: ["Add /llms.txt"], checkedAt: "2026-10-20T00:00:00Z" };

test("a judge connects and runs all three tools through the visible controls", async ({ page }) => {
  const methods: string[] = [];
  const toolArgs: unknown[] = [];
  await page.route("**/mcp", async (route) => {
    const body = route.request().postDataJSON();
    methods.push(body.method);
    if (body.method !== "tools/call") return route.continue();
    toolArgs.push(body.params);
    const name = body.params.name;
    const result = name === "check_ai_visibility"
      ? { content: [{ type: "text", text: "example.com gets an F for AI readiness, 17 out of 100." }], structuredContent: report }
      : name === "compare_ai_visibility"
      ? { content: [{ type: "text", text: "The two sites are tied for AI readiness." }], structuredContent: { mine: report, competitor: { ...report, url: "https://suedeai.ai" } } }
      : { content: [{ type: "text", text: "Structured data: 0 of 3 checks passed." }] };
    await route.fulfill({ json: { jsonrpc: "2.0", id: body.id, result } });
  });
  await page.goto("/demo.html");
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Connected · 3 tools · 2025-11-25");
  expect(methods).toEqual(["initialize", "notifications/initialized", "tools/list"]);
  await page.getByLabel("Your website").fill("example.com");
  await page.getByRole("button", { name: "Check AI readiness" }).click();
  await expect(page.locator("#answer")).toContainText("17 out of 100");
  await expect(page.locator("#scores")).toContainText("F · 17/100");
  await page.getByRole("button", { name: "Compare sites" }).click();
  await expect(page.locator("#answer")).toContainText("tied");
  await expect(page.locator(".score")).toHaveCount(2);
  await page.getByRole("button", { name: "Explain this area" }).click();
  await expect(page.locator("#answer")).toContainText("0 of 3");
  await expect(page.locator("#data-panel")).toBeHidden();
  expect(toolArgs).toEqual([
    { name: "check_ai_visibility", arguments: { url: "https://example.com/" } },
    { name: "compare_ai_visibility", arguments: { url: "https://example.com/", competitorUrl: "https://suedeai.ai/" } },
    { name: "explain_ai_visibility_area", arguments: { url: "https://example.com/", area: "schema" } },
  ]);
  await expect(page.locator("#rpc-log li")).toHaveCount(6);
});

test("connection errors are visible and a retry can reconnect", async ({ page }) => {
  await page.route("**/mcp", (route) => route.fulfill({ status: 503, body: "Service unavailable" }));
  await page.goto("/demo.html");
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("unreadable response");
  await expect(page.getByRole("button", { name: "Connect", exact: true })).toBeEnabled();
  await page.unroute("**/mcp");
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Connected");
  await expect(page.getByRole("alert")).toBeHidden();
});

test("tool errors clear prior results and render remote text safely", async ({ page }) => {
  let fail = false;
  await page.route("**/mcp", (route) => {
    const body = route.request().postDataJSON();
    if (body.method !== "tools/call") return route.continue();
    const result = fail ? { isError: true, content: [{ type: "text", text: "<img src=x onerror=alert(1)> Audit unavailable" }] }
      : { content: [{ type: "text", text: "A successful old answer" }], structuredContent: report };
    return route.fulfill({ json: { jsonrpc: "2.0", id: body.id, result } });
  });
  await page.goto("/demo.html");
  await page.getByRole("button", { name: "Check AI readiness" }).click();
  await expect(page.locator("#answer")).toContainText("successful old answer");
  fail = true;
  await page.getByRole("button", { name: "Check AI readiness" }).click();
  await expect(page.getByRole("alert")).toContainText("Audit unavailable");
  await expect(page.locator("#error img")).toHaveCount(0);
  await expect(page.locator("#answer")).not.toContainText("successful old answer");
  await expect(page.locator("#scores")).toBeHidden();
});

test("mobile controls stay in bounds and invalid URLs do not dispatch tools", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const calls: string[] = [];
  page.on("request", (request) => { if (request.url().endsWith("/mcp")) calls.push(request.url()); });
  await page.goto("/demo.html");
  await page.getByLabel("Your website").fill("javascript:bad");
  await page.getByRole("button", { name: "Check AI readiness" }).click();
  await expect(page.getByRole("alert")).toContainText("public http or https");
  expect(calls).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
