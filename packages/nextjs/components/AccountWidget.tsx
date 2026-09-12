"use client";

import React, { useState } from "react";
import { browserSupportsWebAuthn } from "@simplewebauthn/browser";
import { toast } from "react-hot-toast";
import { KeyIcon, StarIcon } from "@heroicons/react/24/outline";
import { useAccountContext } from "~~/app/contexts/AccountContext";
import { useIsClient } from "~~/hooks/useIsClient";

// Header control: points, plus the one passkey action that makes sense right now.
export const AccountWidget = () => {
  const { account, loading, savePointsWithPasskey, signInWithPasskey } = useAccountContext();
  const [busy, setBusy] = useState(false);
  // Checked only in the browser, so server and first client render agree.
  const passkeysSupported = useIsClient() && browserSupportsWebAuthn();

  const run = async (action: () => Promise<{ ok: true } | { ok: false; error: string }>, success: string) => {
    setBusy(true);
    const result = await action();
    setBusy(false);
    if (result.ok) toast.success(success);
    else toast.error(result.error);
  };

  if (loading) return null;

  return (
    <div className="flex gap-2 items-center">
      <span
        className="btn btn-primary btn-sm px-4 rounded-full no-animation cursor-default"
        title={account ? account.displayName : "Earn points by adding libraries and books"}
      >
        <StarIcon className="h-4 w-4 mr-1" aria-hidden="true" />
        <span>{account?.points ?? 0} points</span>
      </span>

      {passkeysSupported && account && !account.hasPasskey && (
        <button
          className="btn btn-secondary btn-sm rounded-full"
          disabled={busy}
          title="Keep your points on any device. No email or password."
          onClick={() => run(savePointsWithPasskey, "Points saved to your passkey")}
        >
          <KeyIcon className="h-4 w-4" aria-hidden="true" />
          Save with passkey
        </button>
      )}

      {/* Also for anonymous players: signing in to an existing passkey account merges their points. */}
      {passkeysSupported && !account?.hasPasskey && (
        <button
          className="btn btn-ghost btn-sm rounded-full"
          disabled={busy}
          title="Already saved points with a passkey? Sign in to use them here."
          onClick={() => run(signInWithPasskey, "Signed in")}
        >
          <KeyIcon className="h-4 w-4" aria-hidden="true" />
          Sign in
        </button>
      )}

      {account?.hasPasskey && (
        <span className="text-xs opacity-70 hidden sm:inline" title="Signed in with a passkey">
          {account.displayName}
        </span>
      )}
    </div>
  );
};
