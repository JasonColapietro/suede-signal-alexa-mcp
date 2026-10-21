# Suede Signal for Alexa+

A website audit with a clear next step. Check a public page, compare another site, or explore one audit area through a working MCP client.

**[Run the judge demo](https://suede-signal-alexa-mcp.vercel.app/demo.html)** · [Source](https://github.com/JasonColapietro/suede-signal-alexa-mcp)

This is an **Alexa+ simulation with real MCP calls**, not a native Alexa+ device integration. Optional spoken playback uses the browser's voice. The demo connects, discovers tools, and shows the actual requests and responses; it never substitutes recorded audit answers.

## What the scores mean

The existing Suede Signal API performs deterministic website-readiness checks across AI crawler access, metadata, structured data, citability, and trust. Scores do **not** measure actual AI citations, rankings, recommendations, or business outcomes. The adapter does not query answer engines, edit a website, or maintain conversation memory. A perfect score means the checks in that audit passed.

| Stable MCP tool name | Result |
|---|---|
| `check_ai_visibility` | Grade, score, strongest/weakest areas, up to three spoken fixes; structured report |
| `compare_ai_visibility` | Two reports, score leader, largest weighted area deficit and an available fix; structured reports |
| `explain_ai_visibility_area` | One area's score, checks passed, and recommendations; text only |

The existing tool identifiers are retained for client compatibility. Their descriptions and spoken results use “AI readiness.”

## Run locally

Requires Node 24 and npm. No account or API key is required.

```bash
npm ci
npm run dev
```

Open **http://localhost:3333/demo.html**. Click **Connect**, then **Check AI readiness**, **Compare sites**, or **Explain this area**. Inputs are editable; example.com and suedeai.ai are demonstration sites, not a business-competitor claim. Expand the protocol entries to inspect `initialize`, `notifications/initialized`, `tools/list`, and `tools/call`. Optional browser speech requires a click and is not Alexa's voice.

The local server serves the landing page, demo assets, and `/mcp` on one origin. Only exact loopback origins for its configured port are allowed by default. Arbitrary local files are not served. `PORT` defaults to `3333`.

| Environment variable | Default | Purpose |
|---|---|---|
| `SIGNAL_API_URL` | `https://signal.suedeai.ai/api/audit` | Existing audit API dependency |
| `ALLOWED_ORIGINS` | Empty in hosted runtime; exact loopback origins in local dev | Comma-separated browser origins allowed to call `/mcp` |

**External dependency:** the three tools need the Signal API and public pages to be reachable; this is not an offline audit engine. Upstream errors are shown in the demo and can be retried. Unit/browser tests use explicit fixtures for their tool responses; the public demo and recorder use real results.

## Connect another MCP client

Endpoint: `https://suede-signal-alexa-mcp.vercel.app/mcp`, Streamable HTTP, protocol `2025-11-25`, no authentication. Local endpoint: `http://localhost:3333/mcp`.

For MCP Inspector, run `npx @modelcontextprotocol/inspector`, select Streamable HTTP, connect to the endpoint, and list/call the tools. Browser clients need their exact origin in the hosted `ALLOWED_ORIGINS` setting. Do not add a wildcard or trust arbitrary request Host headers.

## Verify

```bash
npm test
npm run typecheck
npx playwright install chromium
npm run test:browser
```

Tests cover speech, tools, API errors, HTTP transport, local asset serving, visible controls, protocol initialization, retries, stale-result clearing, safe text rendering, and mobile layout. Browser tests mock only tool outputs; the initialization and discovery sequence uses the real local MCP server. Hosted behavior is checked separately with live calls. CI runs these checks on Node 24.

## Record the real demo

```bash
# Uses the live hosted app by default; requires Chromium installed above.
npm run record:demo
# Or, with npm run dev already running:
DEMO_BASE_URL=http://localhost:3333 npm run record:demo
```

The recorder clicks the same visible controls a judge uses, waits for successful real results, saves a 1920×1080 WebM, a cover screenshot, protocol evidence, and chapter timings under ignored `recordings/`. It fails on tool/network errors. No responses are mocked or replayed. Timings include actual waits; the video is not sped up to imply faster audits. It does not upload or publish anything. See [JUDGING.md](JUDGING.md) for the demo route and submission boundaries.

## Deployment

`vercel.json` serves `public/` and rewrites `/mcp` to `api/mcp.ts`. The SDK transport and tools run in a stateless function, with one server/transport per request. Set `ALLOWED_ORIGINS` to the exact public app origin before browser testing a deployment; otherwise the browser receives 403. Explicitly add any preview origin you intend to test.

```bash
npx vercel deploy --prod
```

Deploying and contest submission are separate actions. No repository script submits to Devpost or publishes video.

## New work versus existing foundation

The Signal audit engine and public API existed before the hackathon. This repository adds the MCP adapter, three tools, Streamable HTTP endpoint, speech formatting, comparison and area explanations, tests, and simulation UI. Initial adapter work was committed October 12, 2026; the operable judge demo and reproducible recorder are subsequent in-window updates. Do not describe the whole existing Signal product as newly built.

## License

The code in this adapter repository is MIT licensed. See [LICENSE](LICENSE). The separate Signal service is an API dependency; this license does not grant rights to its separate source. No claim of Amazon endorsement or production Alexa+ availability is made.
