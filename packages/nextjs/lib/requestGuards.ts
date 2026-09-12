import { headers } from "next/headers";

// Checks shared by API routes and server actions that change data.

const toOrigin = (url: string | null | undefined) => {
  try {
    return url ? new URL(url).origin : null;
  } catch {
    return null;
  }
};

// Compares whole origins, so look-alikes such as https://arlib.me.example.com are rejected.
// Referers can be forged outside a browser; this only stops other websites from using our APIs.
export function isAllowedReferer(referer: string | null): boolean {
  const origin = toOrigin(referer);
  if (!origin) return false;
  const allowed = ["https://arlib.me", "https://www.arlib.me", process.env.NEXT_PUBLIC_APP_URL];
  if (process.env.NODE_ENV !== "production") {
    allowed.push("http://localhost:3000", "http://192.168.1.232:3000");
  }
  return allowed.some(url => toOrigin(url) === origin);
}

// x-forwarded-for can be a list; the first entry is the client.
export function getClientIp(request: Request | { headers: Headers }): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "anonymous";
}

// Server actions have no Request object, so read the current request's headers instead.
// (Next.js already rejects server action calls from other origins.)
export async function getActionClientIp(): Promise<string> {
  return getClientIp({ headers: (await headers()) as unknown as Headers });
}
