# Suede Signal for Alexa+

Ask Alexa how visible your website is to AI.

> "Alexa, how does example.com show up in AI answers?"
>
> "example.com gets an F for AI visibility, 17 out of 100. Its strongest area is AI crawler access; citability needs the most work. Top 3 fixes: Add /llms.txt; Use exactly one H1 that states the page's answer in plain language; and Break content into H2 sections."

Buyers now ask ChatGPT, Claude, Perplexity and Gemini what to buy, and those assistants recommend the sites they can read, verify and quote. This is a self-hosted MCP server for the Alexa+ track of Build, Ship, Shape: it gives Alexa+ a grade, the weakest area and the three fixes that move the score, in a reply built to be spoken.

## Tools

| Tool | Ask it | Returns |
|---|---|---|
| `check_ai_visibility` | "How visible is my site to AI?" | A–F grade, score out of 100, strongest and weakest areas, top three fixes |
| `compare_ai_visibility` | "How do I stack up against competitor.com?" | Who leads and by how much, the area where you trail most, and its first fix |
| `explain_ai_visibility_area` | "Tell me more about my structured data." | One area's score, checks passed, and what to fix |

Every tool is read-only (`readOnlyHint: true`) and also returns `structuredContent` that matches its declared `outputSchema`, so a screen-equipped Echo or any other MCP client can render the numbers.

The five areas come from Suede Signal's weighted audit: **AI crawler access** (25), **citability** (25), **metadata** (20), **structured data** (20) and **trust** (10).

## How it works

```
Alexa+ ──Streamable HTTP (MCP 2025-11-25)──▶ /mcp  (Vercel function, stateless)
                                               │
                                               ▼
                                   Suede Signal audit API
                                   signal.suedeai.ai/api/audit
                                   deterministic checks, no LLM calls
```

- **Transport:** MCP Streamable HTTP, protocol `2025-11-25`, via `@modelcontextprotocol/sdk` 1.32. Stateless, with JSON responses, so every request gets its own server and transport and the function scales to zero.
- **Audit engine:** [Suede Signal](https://signal.suedeai.ai), which grades a page across up to 23 checks without calling a model, so answers are instant, free to run and identical on repeat.
- **Speech layer:** `src/speech.ts` turns a report into a reply that reads well aloud: no URLs, no markup, HTML entities decoded, fixes cut to the action, at most three per reply. Ties for "needs the most work" go to the area that carries the most weight, so the advice points at the fix that moves the score most.
- **Safety:** this server never fetches the audited site; Signal does, behind its own SSRF guard against private and reserved addresses. Browser requests are refused unless their `Origin` is listed in `ALLOWED_ORIGINS`, per the spec's DNS-rebinding rule. Errors from Signal are passed through as speakable tool errors; anything unexpected is replaced with a generic message so internals never reach the listener.

## Connect

Endpoint: `https://<deployment>/mcp` (Streamable HTTP, no auth required).

Try it with the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector
```

Choose **Streamable HTTP** and enter the endpoint URL.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3333/mcp
npm test           # 19 tests: speech, tools, Streamable HTTP
npm run typecheck
```

| Variable | Default | Purpose |
|---|---|---|
| `SIGNAL_API_URL` | `https://signal.suedeai.ai/api/audit` | Audit API to call |
| `ALLOWED_ORIGINS` | empty | Comma-separated browser origins allowed to call `/mcp` |

## Deploy

```bash
npx vercel deploy --prod
```

`vercel.json` rewrites `/mcp` to `api/mcp.ts` and serves `public/` at the root.

## Built during the hackathon

Suede Signal's audit engine and public API existed before Build, Ship, Shape. Everything in this repository was built for it: the MCP server and its three tools, the Streamable HTTP endpoint, the voice-first speech layer, the competitor comparison, the per-area explanations, and the test suite.

## License

MIT. See [LICENSE](LICENSE).
