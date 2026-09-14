"use client";

import { useState } from "react";
import { browserSupportsWebAuthn } from "@simplewebauthn/browser";
import { toast } from "react-hot-toast";
import { useAccountContext } from "~~/app/contexts/AccountContext";
import { useIsClient } from "~~/hooks/useIsClient";

type Result = { ok: true } | { ok: false; error: string };

// The three passkey actions, with a toast for the outcome. Shared by the header and /account.
export function usePasskeyActions() {
  const { savePointsWithPasskey, signInWithPasskey } = useAccountContext();
  const [busy, setBusy] = useState(false);
  // Checked only in the browser, so server and first client render agree.
  const supported = useIsClient() && browserSupportsWebAuthn();

  // Resolves true if the action worked.
  const run = async (action: () => Promise<Result>, success: string) => {
    setBusy(true);
    const result = await action();
    setBusy(false);
    if (result.ok) toast.success(success);
    else toast.error(result.error);
    return result.ok;
  };

  return {
    busy,
    supported,
    // Creating an account and saving an anonymous one are the same step: a passkey for this account.
    createAccount: () => run(savePointsWithPasskey, "Account created. Your passkey signs you in on any device."),
    savePoints: () => run(savePointsWithPasskey, "Points saved to your passkey"),
    signIn: () => run(signInWithPasskey, "Signed in"),
    // Another passkey for an account that has one, e.g. on a second device.
    addPasskey: () => run(savePointsWithPasskey, "Passkey added. It signs you in from this device."),
  };
}
