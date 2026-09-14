import { parseCspReports } from "../../../lib/cspReport";
import { rateLimit } from "../../../lib/rate-limit";
import { getClientIp } from "../../../lib/requestGuards";

// A page can trigger several reports at once; beyond this, one browser's reports aren't news.
const limiter = rateLimit({ interval: 60 * 1000, uniqueTokenPerInterval: 500, limit: 30 });

// Browsers post here what our Content Security Policy blocked (or, while report-only, would have
// blocked). Each becomes one line in the runtime logs: "CSP violation: script-src blocked
// https://example.com/x.js on /browse". Always answers 204, so browsers don't retry.
export async function POST(request: Request) {
  if (limiter.check(getClientIp(request)).success) {
    const text = (await request.text()).slice(0, 20_000);
    let data: unknown = null;
    try {
      data = JSON.parse(text);
    } catch {
      // Not a report.
    }
    for (const { directive, blocked, page } of parseCspReports(data)) {
      console.warn(`CSP violation: ${directive} blocked ${blocked} on ${page}`);
    }
  }
  return new Response(null, { status: 204 });
}
