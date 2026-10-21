// Turns Signal reports into short replies that read well aloud. MCP clients
// choose how to present them, so these stay plain: no markdown, no URLs, no
// HTML entities, and at most three fixes per reply.

import type { AuditReport, Lane } from "./signal.js";

export const LANE_IDS = ["crawler-access", "metadata", "schema", "citability", "trust"] as const;
export type LaneId = (typeof LANE_IDS)[number];

const MAX_SPOKEN_FIXES = 3;

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", apos: "'" };

export function plain(text: string): string {
  return text
    .replace(/&(amp|lt|gt|quot|#39|apos);/g, (_, name: string) => ENTITIES[name])
    .replace(/&/g, " and ")
    .replace(/\s+/g, " ")
    .trim();
}

export function spokenHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// Signal's fixes lead with the action ("Add /llms.txt: a short markdown file...")
// and follow it with the reason, after a full stop, a colon, or ", the ...".
// The action alone is what a listener can act on.
export function shortFix(fix: string): string {
  const action = fix.split(/(?<=\.)\s|:\s|,\s(?=the\b)/)[0].replace(/\.$/, "");
  return /^Thin pages don.t get cited$/i.test(action) ? "Add substantive page content" : plain(action);
}

function laneName(lane: Lane): string {
  return plain(lane.title).toLowerCase().replace(/\bai\b/g, "AI");
}

// Ties go to the heavier lane: the strongest area is the one carrying the most
// weight, and the area that "needs the most work" is where fixing pays most.
function strongestAndWeakest(report: AuditReport): { strongest: Lane; weakest: Lane } {
  const byWeight = (a: Lane, b: Lane) => b.weight - a.weight;
  const strongest = [...report.lanes].sort((a, b) => b.score - a.score || byWeight(a, b))[0];
  const weakest = [...report.lanes].sort((a, b) => a.score - b.score || byWeight(a, b))[0];
  return { strongest, weakest };
}

function joinSpoken(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join("; ")}; and ${items[items.length - 1]}`;
}

export function summarizeReport(report: AuditReport): string {
  const host = spokenHost(report.finalUrl || report.url);
  const parts = [`${host} gets ${article(report.grade)} ${report.grade} for AI readiness, ${report.score} out of 100.`];

  if (report.lanes.length > 0) {
    const { strongest, weakest } = strongestAndWeakest(report);
    if (strongest.score === weakest.score) {
      parts.push(`Every area scores ${strongest.score}.`);
    } else {
      parts.push(`Its strongest area is ${laneName(strongest)}; ${laneName(weakest)} needs the most work.`);
    }
  }

  const fixes = report.topFixes.slice(0, MAX_SPOKEN_FIXES).map(shortFix);
  if (fixes.length === 0) {
    parts.push("Every check in this audit passed. This does not measure actual citations or rankings.");
  } else {
    parts.push(`Top ${fixes.length === 1 ? "fix" : `${fixes.length} fixes`}: ${joinSpoken(fixes)}.`);
  }
  return parts.join(" ");
}

export function compareReports(mine: AuditReport, theirs: AuditReport): string {
  const myHost = spokenHost(mine.finalUrl || mine.url);
  const theirHost = spokenHost(theirs.finalUrl || theirs.url);
  const gap = mine.score - theirs.score;

  const lead =
    gap === 0
      ? `${myHost} and ${theirHost} are tied at ${mine.score} out of 100 for AI readiness.`
      : `${gap > 0 ? myHost : theirHost} leads, ${Math.max(mine.score, theirs.score)} to ${Math.min(mine.score, theirs.score)} for AI readiness.`;

  const behind = mine.lanes
    .map((lane) => ({ lane, rival: theirs.lanes.find((l) => l.id === lane.id) }))
    .filter((p): p is { lane: Lane; rival: Lane } => !!p.rival && p.rival.score > p.lane.score)
    .sort((a, b) => (b.rival.score - b.lane.score) * b.lane.weight - (a.rival.score - a.lane.score) * a.lane.weight);

  if (behind.length === 0) {
    return `${lead} ${myHost} matches or beats ${theirHost} in every area.`;
  }
  const worst = behind[0];
  const fix = worst.lane.checks.find((c) => !c.passed && c.fix)?.fix;
  return [
    lead,
    `${myHost} trails most on ${laneName(worst.lane)}, ${worst.lane.score} versus ${worst.rival.score}.`,
    fix ? `The first fix there: ${shortFix(fix)}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function describeLane(report: AuditReport, laneId: LaneId): string {
  const lane = report.lanes.find((l) => l.id === laneId);
  const host = spokenHost(report.finalUrl || report.url);
  if (!lane) return `Signal did not return a ${laneId} result for ${host}.`;

  const failed = lane.checks.filter((c) => !c.passed);
  const head = `${host} scores ${lane.score} out of 100 on ${laneName(lane)}.`;
  if (failed.length === 0) return `${head} Every check in that area passed.`;

  const fixes = failed
    .slice(0, MAX_SPOKEN_FIXES)
    .map((c) => (c.fix ? shortFix(c.fix) : `${plain(c.label)} is missing`));
  const passed = lane.checks.length - failed.length;
  return `${head} ${passed} of ${lane.checks.length} checks passed. To fix: ${joinSpoken(fixes)}.`;
}

function article(grade: string): string {
  return /^[AEF]/.test(grade) ? "an" : "a";
}
