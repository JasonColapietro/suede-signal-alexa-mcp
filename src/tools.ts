// The MCP server: three read-only tools that answer "how ready is my site for
// AI?" by voice. Every tool calls Suede Signal; none writes, spends, or stores.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { AuditError, createSignalClient, type AuditFn, type AuditReport } from "./signal.js";
import { LANE_IDS, compareReports, describeLane, shortFix, summarizeReport } from "./speech.js";

export const SERVER_INFO = { name: "suede-signal-alexa", title: "Suede Signal", version: "1.0.0" };

const INSTRUCTIONS =
  "Suede Signal grades deterministic website readiness checks, not measured citations or rankings in AI answers, " +
  "on an A to F scale out of 100, across five areas: AI crawler access, metadata, structured data, citability and trust. " +
  "Use check_ai_visibility when someone asks about website AI readiness. " +
  "Use compare_ai_visibility when they name a competitor. " +
  "Use explain_ai_visibility_area when they ask for more detail on one area. " +
  "Each tool returns text written to be spoken. Only check and comparison return structured results. Do not imply a native Alexa+ connection, autonomous remediation, or conversation memory.";

const url = z
  .string()
  .trim()
  .min(3)
  .max(2048)
  .describe("The website to audit, as a domain or full address, for example example.com or https://example.com/pricing.");

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true } as const;

const reportShape = {
  url: z.string(),
  grade: z.string(),
  score: z.number(),
  areas: z.array(z.object({ id: z.string(), title: z.string(), score: z.number() })),
  topFixes: z.array(z.string()),
  checkedAt: z.string(),
};

function structured(report: AuditReport) {
  return {
    url: report.finalUrl || report.url,
    grade: report.grade,
    score: report.score,
    areas: report.lanes.map((l) => ({ id: l.id, title: l.title, score: l.score })),
    topFixes: report.topFixes.map(shortFix),
    checkedAt: report.fetchedAt,
  };
}

function failure(error: unknown): CallToolResult {
  const message =
    error instanceof AuditError ? error.message : "Something went wrong running the audit. Try again in a moment.";
  return { isError: true, content: [{ type: "text", text: message }] };
}

export function createServer(audit: AuditFn = createSignalClient()): McpServer {
  const server = new McpServer(SERVER_INFO, { instructions: INSTRUCTIONS });

  server.registerTool(
    "check_ai_visibility",
    {
      title: "Check AI readiness",
      description:
        "Grade a website against deterministic AI readiness checks. This does not measure actual citations or rankings. Returns an A to F grade, a score out of 100, " +
        "the strongest and weakest areas, and the top fixes, phrased to be read aloud.",
      inputSchema: { url },
      outputSchema: reportShape,
      annotations: { title: "Check AI readiness", ...READ_ONLY },
    },
    async ({ url }) => {
      try {
        const report = await audit(url);
        return { content: [{ type: "text", text: summarizeReport(report) }], structuredContent: structured(report) };
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    "compare_ai_visibility",
    {
      title: "Compare AI readiness with a competitor",
      description:
        "Grade two websites side by side for AI readiness: who leads, by how much, and the area where the first site " +
        "trails the competitor most, with the first fix for it.",
      inputSchema: {
        url: url.describe("The user's own website."),
        competitorUrl: url.describe("The competitor's website."),
      },
      outputSchema: { mine: z.object(reportShape), competitor: z.object(reportShape) },
      annotations: { title: "Compare AI readiness", ...READ_ONLY },
    },
    async ({ url, competitorUrl }) => {
      try {
        const [mine, theirs] = await Promise.all([audit(url), audit(competitorUrl)]);
        return {
          content: [{ type: "text", text: compareReports(mine, theirs) }],
          structuredContent: { mine: structured(mine), competitor: structured(theirs) },
        };
      } catch (error) {
        return failure(error);
      }
    },
  );

  server.registerTool(
    "explain_ai_visibility_area",
    {
      title: "Explain one AI readiness area",
      description:
        "Go deeper on one of the five areas for a website: its score, how many checks passed, and what to fix. " +
        "Areas: crawler-access (can AI crawlers reach the site, llms.txt), metadata (title, description, sharing tags), " +
        "schema (structured data that describes the page and organization), citability (headings and passages AI can quote), " +
        "trust (about, contact and other credibility signals).",
      inputSchema: {
        url,
        area: z.enum(LANE_IDS).describe("Which area to explain."),
      },
      annotations: { title: "Explain an AI readiness area", ...READ_ONLY },
    },
    async ({ url, area }) => {
      try {
        const report = await audit(url);
        return { content: [{ type: "text", text: describeLane(report, area) }] };
      } catch (error) {
        return failure(error);
      }
    },
  );

  return server;
}
