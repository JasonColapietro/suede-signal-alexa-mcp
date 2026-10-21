// Client for the Suede Signal audit API (https://signal.suedeai.ai).
// Signal runs deterministic page-readiness checks with no LLM calls. Public
// page content and service availability can change between audits. This server never fetches the audited site itself: Signal
// owns the fetch, including its SSRF guard against private and reserved hosts.

export type CheckResult = {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
  fix?: string;
};

export type Lane = {
  id: string;
  title: string;
  weight: number;
  score: number;
  checks: CheckResult[];
};

export type AuditReport = {
  url: string;
  finalUrl: string;
  fetchedAt: string;
  grade: string;
  score: number;
  lanes: Lane[];
  topFixes: string[];
};

export const DEFAULT_SIGNAL_API_URL = "https://signal.suedeai.ai/api/audit";
const TIMEOUT_MS = 25_000;

export class AuditError extends Error {}

export type AuditFn = (url: string) => Promise<AuditReport>;

export function createSignalClient(
  apiUrl = process.env.SIGNAL_API_URL ?? DEFAULT_SIGNAL_API_URL,
  fetchImpl: typeof fetch = fetch,
): AuditFn {
  return async function audit(url: string): Promise<AuditReport> {
    let res: Response;
    try {
      res = await fetchImpl(apiUrl, {
        method: "POST",
        headers: { "content-type": "application/json", "user-agent": "SuedeSignalAlexaMCP/1.0" },
        body: JSON.stringify({ url }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      throw new AuditError("The Suede Signal audit service did not respond. Try again in a moment.");
    }

    const body = (await res.json().catch(() => null)) as (AuditReport & { error?: string }) | null;
    if (!res.ok || !body || typeof body.grade !== "string") {
      throw new AuditError(body?.error ?? `The audit failed with status ${res.status}.`);
    }
    return body;
  };
}
