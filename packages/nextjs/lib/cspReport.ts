// Reading the violation reports browsers send for our Content Security Policy: report-uri posts
// {"csp-report": {...}}. The Reporting API's format (an array of {type: "csp-violation", body}) is
// read too, in case report-to is used later. Only the rule, what was blocked (without any query
// string) and the page path are kept.

export interface CspViolation {
  directive: string;
  blocked: string;
  page: string;
}

const MAX_REPORTS = 10;

const clip = (value: unknown, max = 200) => (typeof value === "string" ? value.slice(0, max) : "");

// A blocked URL as origin + path; keywords such as "inline" or "eval" stay as they are.
function where(value: unknown): string {
  const text = clip(value, 500);
  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:"
      ? `${url.origin}${url.pathname}`.slice(0, 200)
      : url.protocol;
  } catch {
    return text.slice(0, 40) || "(none)";
  }
}

function page(value: unknown): string {
  try {
    return new URL(clip(value, 500)).pathname.slice(0, 120);
  } catch {
    return "(unknown)";
  }
}

export function parseCspReports(data: unknown): CspViolation[] {
  const legacy = (data as { "csp-report"?: Record<string, unknown> } | null)?.["csp-report"];
  if (legacy && typeof legacy === "object") {
    return [
      {
        directive: clip(legacy["effective-directive"] || legacy["violated-directive"], 60),
        blocked: where(legacy["blocked-uri"]),
        page: page(legacy["document-uri"]),
      },
    ];
  }
  if (!Array.isArray(data)) return [];
  return data
    .filter(report => report?.type === "csp-violation" && report.body && typeof report.body === "object")
    .slice(0, MAX_REPORTS)
    .map(({ body }) => ({
      directive: clip(body.effectiveDirective, 60),
      blocked: where(body.blockedURL),
      page: page(body.documentURL),
    }));
}
