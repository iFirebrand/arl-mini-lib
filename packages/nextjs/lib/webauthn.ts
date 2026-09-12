import "server-only";

// WebAuthn "relying party" settings. Passkeys are bound to the RP ID forever, so it must stay
// arlib.me in production (which also covers www.arlib.me).
export function relyingParty() {
  const production = process.env.NODE_ENV === "production";
  const rpID = process.env.WEBAUTHN_RP_ID || (production ? "arlib.me" : "localhost");
  const origins = production ? ["https://arlib.me", "https://www.arlib.me"] : ["http://localhost:3000"];
  if (process.env.NEXT_PUBLIC_APP_URL) origins.push(new URL(process.env.NEXT_PUBLIC_APP_URL).origin);
  return { rpName: "ArLib.me", rpID, origins: [...new Set(origins)] };
}
