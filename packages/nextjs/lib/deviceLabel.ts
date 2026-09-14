// A coarse label for the browser and device type, like "Safari on iPhone", from a User-Agent
// header. Only these two words are kept (never versions or the full header), so people can tell
// their passkeys apart without the site learning more about them.

const OPERATING_SYSTEMS: [RegExp, string][] = [
  [/iPhone/, "iPhone"],
  [/iPad/, "iPad"],
  [/Android/, "Android"],
  [/CrOS/, "ChromeOS"],
  // iPads asking for desktop sites also say Macintosh.
  [/Macintosh|Mac OS X/, "Mac"],
  [/Windows/, "Windows"],
  [/Linux/, "Linux"],
];

// Order matters: most browsers also claim to be Chrome and Safari.
const BROWSERS: [RegExp, string][] = [
  [/EdgiOS|EdgA\/|Edg\//, "Edge"],
  [/SamsungBrowser/, "Samsung Internet"],
  [/OPiOS|OPR\//, "Opera"],
  [/FxiOS|Firefox\//, "Firefox"],
  [/CriOS|Chrome\//, "Chrome"],
  [/Version\/[\d.]+.*Safari\//, "Safari"],
];

const first = (userAgent: string, patterns: [RegExp, string][]) =>
  patterns.find(([pattern]) => pattern.test(userAgent))?.[1] ?? null;

export function deviceLabel(userAgent: string | null | undefined): string | null {
  if (!userAgent) return null;
  const browser = first(userAgent, BROWSERS);
  const os = first(userAgent, OPERATING_SYSTEMS);
  if (browser && os) return `${browser} on ${os}`;
  return browser ?? os;
}
