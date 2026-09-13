"use client";

import React from "react";
import Link from "next/link";
import { KeyIcon, StarIcon } from "@heroicons/react/24/outline";
import { useAccountContext } from "~~/app/contexts/AccountContext";
import { usePasskeyActions } from "~~/hooks/usePasskeyActions";

// Header control: points (a link to /account), plus the passkey actions that make sense right now.
// Accounts need no email: creating one saves a passkey on this device, which signs in anywhere.
// On phones and tablets the passkey buttons live on /account, to keep the bar uncluttered.
export const AccountWidget = () => {
  const { account, loading } = useAccountContext();
  const { busy, supported, createAccount, savePoints, signIn } = usePasskeyActions();

  if (loading) return null;

  const button = "btn btn-sm rounded-full hidden xl:inline-flex";

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/account"
        className="btn btn-primary btn-sm rounded-full px-3.5 font-semibold"
        title={
          account ? `${account.displayName}: your account` : "Your account. Earn points by adding libraries and books."
        }
      >
        <StarIcon className="h-4 w-4" aria-hidden="true" />
        <span>{account?.points ?? 0} points</span>
      </Link>

      {supported && !account && (
        <button
          className={`${button} btn-secondary`}
          disabled={busy}
          title="Create an account with a passkey. No email or password."
          onClick={createAccount}
        >
          <KeyIcon className="h-4 w-4" aria-hidden="true" />
          Create account
        </button>
      )}

      {supported && account && !account.hasPasskey && (
        <button
          className={`${button} btn-secondary`}
          disabled={busy}
          title="Keep your points on any device. No email or password."
          onClick={savePoints}
        >
          <KeyIcon className="h-4 w-4" aria-hidden="true" />
          Save with passkey
        </button>
      )}

      {/* Also for anonymous players: signing in to an existing passkey account merges their points. */}
      {supported && !account?.hasPasskey && (
        <button
          className={`${button} btn-ghost`}
          disabled={busy}
          title="Already saved points with a passkey? Sign in to use them here."
          onClick={signIn}
        >
          <KeyIcon className="h-4 w-4" aria-hidden="true" />
          Sign in
        </button>
      )}

      {account?.hasPasskey && (
        <span className="hidden text-sm text-base-content/70 xl:inline" title="Signed in with a passkey">
          {account.displayName}
        </span>
      )}
    </div>
  );
};
