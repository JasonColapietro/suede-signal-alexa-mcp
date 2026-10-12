// Synthetic Signal reports shaped like the live API's output.
import type { AuditReport, Lane } from "../src/signal.js";

function lane(id: string, title: string, weight: number, score: number, failed: Array<[string, string]> = []): Lane {
  return {
    id,
    title,
    weight,
    score,
    checks: [
      { id: `${id}-ok`, label: "Passing check", passed: true, detail: "ok" },
      ...failed.map(([label, fix], i) => ({ id: `${id}-${i}`, label, passed: false, detail: "missing", fix })),
    ],
  };
}

export const weakReport: AuditReport = {
  url: "https://www.example.com",
  finalUrl: "https://www.example.com/",
  fetchedAt: "2026-10-12T21:00:00.000Z",
  grade: "F",
  score: 17,
  lanes: [
    lane("crawler-access", "AI Crawler Access", 25, 50, [["llms.txt present", "Add /llms.txt: a short markdown file listing your key pages."]]),
    lane("metadata", "Metadata &amp; Sharing", 20, 20, [["Title tag", "Write a 15–70 character title that names what you do and who it's for."]]),
    lane("schema", "Structured Data", 20, 0, [["JSON-LD", "Add JSON-LD (Organization + WebSite at minimum). Structured data is how AI engines verify who you are."]]),
    lane("citability", "Citability", 25, 0, [
      ["Single H1", "Use exactly one H1 that states the page's answer in plain language."],
      ["H2 sections", "Break content into H2 sections. AI engines cite passages, and passages need boundaries."],
      ["Word count", "Thin pages don't get cited. Add substantive, specific content."],
      ["Lists", "Convert key points to bullet lists, the format AI answers extract most often."],
    ]),
    lane("trust", "Trust Signals", 10, 0, [["About page", "Link an About page. Entity verification is a core AI trust signal."]]),
  ],
  topFixes: [
    "Add /llms.txt: a short markdown file listing your key pages with one-line descriptions.",
    "Use exactly one H1 that states the page's answer in plain language.",
    "Break content into H2 sections. AI engines cite passages, and passages need boundaries.",
    "Thin pages don't get cited. Add substantive, specific content.",
  ],
};

export const strongReport: AuditReport = {
  url: "https://seo.suedeai.ai",
  finalUrl: "https://seo.suedeai.ai",
  fetchedAt: "2026-10-12T21:00:00.000Z",
  grade: "A",
  score: 97,
  lanes: [
    lane("crawler-access", "AI Crawler Access", 25, 100),
    lane("metadata", "Metadata & Sharing", 20, 100),
    lane("schema", "Structured Data", 20, 100),
    lane("citability", "Citability", 25, 88, [["Lists", "Convert key points to bullet lists, the format AI answers extract most often."]]),
    lane("trust", "Trust Signals", 10, 100),
  ],
  topFixes: ["Convert key points to bullet lists, the format AI answers extract most often."],
};

export const perfectReport: AuditReport = {
  ...strongReport,
  grade: "A",
  score: 100,
  lanes: strongReport.lanes.map((l) => ({ ...l, score: 100, checks: l.checks.filter((c) => c.passed) })),
  topFixes: [],
};
