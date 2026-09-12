import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import "server-only";

// The session is a signed, httpOnly cookie holding only the account id. Nothing identifying
// about the person is stored anywhere.
const SESSION_COOKIE = "arlib_session";
const CHALLENGE_COOKIE = "arlib_webauthn";
const SESSION_MAX_AGE = 400 * 24 * 60 * 60; // the longest browsers allow
const CHALLENGE_MAX_AGE = 5 * 60;

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return new TextEncoder().encode(secret);
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set to at least 32 characters");
  }
  return new TextEncoder().encode("development-only-session-secret-not-for-production");
}

const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge,
});

async function sign(payload: Record<string, string>, maxAge: number) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${maxAge}s`)
    .sign(secretKey());
}

async function verify(token: string | undefined): Promise<Record<string, unknown> | null> {
  if (!token) return null;
  try {
    return (await jwtVerify(token, secretKey(), { algorithms: ["HS256"] })).payload;
  } catch {
    return null;
  }
}

/** The signed-in account id, or null. */
export async function readSessionAccountId(): Promise<string | null> {
  const payload = await verify((await cookies()).get(SESSION_COOKIE)?.value);
  return typeof payload?.sub === "string" ? payload.sub : null;
}

export async function writeSession(accountId: string) {
  (await cookies()).set(
    SESSION_COOKIE,
    await sign({ sub: accountId }, SESSION_MAX_AGE),
    cookieOptions(SESSION_MAX_AGE),
  );
}

/** Remembers a WebAuthn challenge for the next step of a passkey ceremony (5 minutes). */
export async function writeChallenge(challenge: string, purpose: "register" | "login") {
  (await cookies()).set(
    CHALLENGE_COOKIE,
    await sign({ challenge, purpose }, CHALLENGE_MAX_AGE),
    cookieOptions(CHALLENGE_MAX_AGE),
  );
}

/** Returns and forgets the pending challenge for this purpose, or null. */
export async function takeChallenge(purpose: "register" | "login"): Promise<string | null> {
  const payload = await verify((await cookies()).get(CHALLENGE_COOKIE)?.value);
  (await cookies()).delete(CHALLENGE_COOKIE);
  return payload?.purpose === purpose && typeof payload.challenge === "string" ? payload.challenge : null;
}
