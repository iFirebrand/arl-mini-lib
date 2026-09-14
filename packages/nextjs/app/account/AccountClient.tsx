"use client";

import Link from "next/link";
import PasskeyList from "./PasskeyList";
import { CheckCircleIcon, ExclamationTriangleIcon, KeyIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { useAccountContext } from "~~/app/contexts/AccountContext";
import { Card, Container, PageHeader } from "~~/components/ui/Page";
import { usePasskeyActions } from "~~/hooks/usePasskeyActions";

// What to do when a phone changes hands. Shown to everyone, since it matters before it happens.
const RECOVERY = [
  {
    title: "New phone, same Apple or Google account",
    text: "A passkey saved in Apple Passwords or Google Password Manager comes along. Sign in with it and your points are there.",
  },
  {
    title: "Lost or sold a phone",
    text: "Sign in on another device, then remove the old phone's passkey under Your passkeys so it can't sign in any more.",
  },
  {
    title: "A passkey that doesn't sync",
    text: "It lives on one device only. Sign in on a second device and add a passkey there too, so losing one device doesn't lose your points.",
  },
];

const FACTS = [
  {
    title: "No email, no password",
    text: "Your account is a random name like “Reader K7Q2M” and your points. For each passkey we also note the kind of browser and device that added and last used it (like “Safari on iPhone”) so you can tell them apart. Nothing else about you is stored.",
  },
  {
    title: "Points create the account",
    text: "Adding a library or a book starts an account on this device automatically. You can also create one up front.",
  },
  {
    title: "A passkey keeps it",
    text: "Saving a passkey (Face ID, Touch ID or your device PIN) lets you sign in on any device. Apple Passwords (iCloud Keychain) and Google Password Manager sync it to your other devices.",
  },
  {
    title: "Losing every passkey loses the account",
    text: "With no email there's nothing to reset. If your passkey syncs, a new phone gets it back; if not, save a passkey on a second device too.",
  },
];

// Everything about the visitor's account in one place. On phones this is where the passkey buttons live.
export default function AccountClient() {
  const { account, loading } = useAccountContext();
  const { busy, supported, createAccount, savePoints, signIn } = usePasskeyActions();

  return (
    <Container width="narrow" className="pb-16">
      <PageHeader eyebrow="Your account" title={account ? account.displayName : "Keep your points"}>
        {account
          ? "Your points and how you sign in."
          : "Accounts on ArLib.me need no email or password: a passkey on your phone is the key."}
      </PageHeader>

      {loading ? (
        <div className="h-40 animate-pulse rounded-box bg-base-300" />
      ) : (
        <Card className="flex flex-col gap-5 p-6">
          {account ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-5xl font-semibold tabular-nums">{account.points}</span>
                <span className="text-lg text-base-content/70">points</span>
              </div>
              {account.hasPasskey ? (
                <p className="flex items-start gap-2 text-base-content/85">
                  <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
                  Saved with a passkey. Sign in with it on any device.
                </p>
              ) : (
                <p className="flex items-start gap-2 text-base-content/85">
                  <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
                  Only on this browser for now. Save it with a passkey so clearing your browser or changing phones
                  doesn&apos;t lose your points.
                </p>
              )}
              {supported && !account.hasPasskey && (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button className="btn btn-neutral rounded-full" disabled={busy} onClick={savePoints}>
                    <KeyIcon className="h-5 w-5" aria-hidden="true" />
                    Save with passkey
                  </button>
                  <button className="btn btn-ghost rounded-full" disabled={busy} onClick={signIn}>
                    I already have a passkey: Sign in
                  </button>
                </div>
              )}
              {account.isModerator && (
                <Link href="/moderate" className="btn btn-primary w-fit rounded-full">
                  <ShieldCheckIcon className="h-5 w-5" aria-hidden="true" />
                  Moderate libraries and books
                </Link>
              )}
            </>
          ) : (
            <>
              <p className="text-base-content/85">You don&apos;t have an account on this device yet.</p>
              {supported ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button className="btn btn-neutral rounded-full" disabled={busy} onClick={createAccount}>
                    <KeyIcon className="h-5 w-5" aria-hidden="true" />
                    Create account
                  </button>
                  <button className="btn btn-ghost rounded-full" disabled={busy} onClick={signIn}>
                    Sign in with a passkey
                  </button>
                </div>
              ) : (
                <p className="text-sm text-base-content/70">
                  This browser doesn&apos;t support passkeys. You can still earn points here; they stay in this browser.
                </p>
              )}
            </>
          )}
        </Card>
      )}

      {!loading && account?.hasPasskey && (
        <div className="mt-10">
          <PasskeyList />
        </div>
      )}

      <section aria-labelledby="recovery" className="mt-10">
        <h2 id="recovery" className="text-2xl font-semibold tracking-tight">
          Changing or losing a phone
        </h2>
        <dl className="mt-4 grid gap-5 sm:grid-cols-3">
          {RECOVERY.map(tip => (
            <div key={tip.title} className="flex flex-col gap-1">
              <dt className="font-semibold">{tip.title}</dt>
              <dd className="text-base-content/75">{tip.text}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="how" className="mt-10">
        <h2 id="how" className="text-2xl font-semibold tracking-tight">
          How accounts work
        </h2>
        <dl className="mt-4 grid gap-5 sm:grid-cols-2">
          {FACTS.map(fact => (
            <div key={fact.title} className="flex flex-col gap-1">
              <dt className="font-semibold">{fact.title}</dt>
              <dd className="text-base-content/75">{fact.text}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-sm text-base-content/70">
          Earned points with a crypto wallet before accounts existed? Those points are kept, and that wallet will be
          able to claim them when wallet linking arrives. Questions:{" "}
          <a href="mailto:ArlingtonAndUkraine+arlib@gmail.com" className="break-all text-link underline">
            ArlingtonAndUkraine+arlib@gmail.com
          </a>
        </p>
      </section>
    </Container>
  );
}
