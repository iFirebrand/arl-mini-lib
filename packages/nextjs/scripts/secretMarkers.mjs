// Strings that must never appear in JavaScript sent to browsers.

// A JWT payload is base64url, so `"role":"service_role"` can show up at any of three byte
// alignments. Return the part of each encoding that doesn't depend on surrounding bytes.
function base64Fragments(text) {
  return [0, 1, 2].map(offset => {
    const encoded = Buffer.from("x".repeat(offset) + text).toString("base64url");
    const start = offset === 0 ? 0 : offset + 2;
    const usableChars = Math.floor(((offset + text.length) * 4) / 3);
    return encoded.slice(start, usableChars - 1);
  });
}

export const CLIENT_SECRET_MARKERS = [
  // New-format Supabase secret keys.
  "sb_secret_",
  // Legacy Supabase service_role JWTs.
  ...base64Fragments('"role":"service_role"'),
];

/**
 * Values of server-only env vars that look like credentials (NEXT_PUBLIC_ vars are public by design).
 * @param {Record<string, string | undefined>} [env]
 */
export function serverSecretValues(env = process.env) {
  return Object.entries(env)
    .filter(([name, value]) => !name.startsWith("NEXT_PUBLIC_") && value && value.length >= 20)
    .filter(([name]) => /KEY|SECRET|PASSWORD|TOKEN|DATABASE_URL|DIRECT_URL/.test(name))
    .map(([name, value]) => ({ name, value }));
}
