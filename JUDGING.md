# Judge guide

## Run in a browser

Open https://suede-signal-alexa-mcp.vercel.app/demo.html. No sign-in, API key, hardware, or microphone permission is required.

1. Click **Connect**. Expect “Connected · 3 tools · 2025-11-25.”
2. Click **Check AI readiness** for the prefilled example.com address. Read the returned score and fixes.
3. Click **Compare sites** to compare with suedeai.ai, or edit both inputs to other public sites.
4. Select an area and click **Explain this area**. This tool returns text; it does not return a structured report.
5. Expand a protocol entry for actual request arguments and response. Check/comparison also expose **Structured result**.
6. Optional **Read answer with browser voice** uses browser speech synthesis, not Alexa speech.

The example scores are not fixed acceptance values: public content can change. Errors are visible and retryable. The client never substitutes a saved report.

## Run from source

Use Node 24. Run `npm ci`, then `npm run dev`, and open http://localhost:3333/demo.html. Source and all demo assets are in this repository. Calls use the public Signal audit API by default, so internet connectivity is required. See README for the API URL and browser-origin configuration.

## Submission scope

Primary track: Alexa+, through the working MCP/simulated-experience path. This project does not connect directly to a production Alexa+ device. It does not include autonomous remediation, cross-session memory, or measured citation outcomes.

Existing foundation: Signal audit API. New work: this MCP adapter, speech formatting, comparison/area tools, test suite, browser client, and recorder. The Open Source mini-challenge contribution is separate: https://github.com/a2aproject/a2a-tck/pull/239 (open/unmerged at preparation time). No AWS Builder integration is claimed.

## Product-feedback evidence

- MCP SDK: initialization, schema registration, and stateless HTTP transport work in local and live checks. Browser Origin configuration needs to be explicit.
- Signal API: real audits provide scores and fixes without a model call. Results need clear readiness labels and depend on the public page/API being available.
- Vercel: existing commit f3b556e records accidental root-server detection; renaming the source module and explicit framework/static configuration resolved it. The browser app also requires exact origin configuration.
- Zod: tool argument validation and the first two structured output schemas are used. Area explanation currently remains text-only.
- Node/TypeScript: lockfile-based setup and tests are repeatable under Node 24.

These are technical observations. Entrant declarations, original onboarding opinions, and willingness-to-reuse answers are supplied/approved by Jason, not inferred from a successful test.
