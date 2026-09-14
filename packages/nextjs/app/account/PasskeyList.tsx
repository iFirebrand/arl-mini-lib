"use client";

import React, { useCallback, useEffect, useState } from "react";
import { sendSignal } from "@simplewebauthn/browser";
import { toast } from "react-hot-toast";
import { KeyIcon, PlusIcon } from "@heroicons/react/24/outline";
import { useAccountContext } from "~~/app/contexts/AccountContext";
import { usePasskeyActions } from "~~/hooks/usePasskeyActions";

export interface PasskeyItem {
  id: string;
  name: string | null;
  provider: string | null;
  synced: boolean;
  createdAt: string;
  createdFrom: string | null;
  lastUsedAt: string | null;
  lastUsedFrom: string | null;
}

export const REMOVE_LAST =
  "This is your only passkey. Once it's removed, your account lives only in this browser until you add another, and clearing the browser would lose your points.";
export const REMOVE_ONE =
  "It will stop signing in to your account. If your password manager still lists it, you can delete it there too.";
export const MAX_NAME = 40;

const date = (value: string) =>
  new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

/** What to call a passkey its owner hasn't named. */
export const passkeyTitle = (passkey: PasskeyItem) =>
  passkey.name ?? passkey.provider ?? (passkey.synced ? "Synced passkey" : "Passkey on one device");

const request = async (url: string, method: string, body?: unknown) => {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
};

/** The signed-in account's passkeys, or null if they couldn't be loaded. */
async function fetchPasskeys(): Promise<PasskeyItem[] | null> {
  try {
    const response = await fetch("/api/account/passkeys", { cache: "no-store" });
    return response.ok ? (await response.json()).passkeys : null;
  } catch {
    return null;
  }
}

// The signed-in account's passkeys: where each lives, when it was added and last used, and
// controls to rename or remove it, or to add one on this device.
export default function PasskeyList() {
  const { refresh } = useAccountContext();
  const { busy, supported, addPasskey } = usePasskeyActions();
  const [passkeys, setPasskeys] = useState<PasskeyItem[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const show = useCallback((loaded: PasskeyItem[] | null) => {
    if (loaded) setPasskeys(loaded);
    setLoadFailed(loaded === null);
  }, []);
  const load = useCallback(async () => show(await fetchPasskeys()), [show]);

  useEffect(() => {
    let active = true;
    fetchPasskeys().then(loaded => active && show(loaded));
    return () => {
      active = false;
    };
  }, [show]);

  const startRename = (passkey: PasskeyItem) => {
    setConfirming(null);
    setEditing(passkey.id);
    setDraft(passkey.name ?? "");
  };

  const rename = async (event: React.FormEvent<HTMLFormElement>, id: string) => {
    event.preventDefault();
    setWorking(true);
    try {
      const { name } = await request(`/api/account/passkeys/${encodeURIComponent(id)}`, "PATCH", { name: draft });
      setPasskeys(current => current?.map(passkey => (passkey.id === id ? { ...passkey, name } : passkey)) ?? null);
      setEditing(null);
      toast.success("Passkey renamed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't rename the passkey");
    } finally {
      setWorking(false);
    }
  };

  const remove = async (id: string) => {
    setWorking(true);
    try {
      const { remaining, rpID, userID } = await request(`/api/account/passkeys/${encodeURIComponent(id)}`, "DELETE");
      // Ask the password manager on this device to hide the removed passkey. Best effort: browsers
      // without the Signal API skip it.
      sendSignal({ signalName: "allAcceptedCredentials", rpID, userID, allAcceptedCredentialIDs: remaining }).catch(
        () => {},
      );
      setPasskeys(current => current?.filter(passkey => passkey.id !== id) ?? null);
      setConfirming(null);
      toast.success("Passkey removed. It no longer signs in.");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't remove the passkey");
    } finally {
      setWorking(false);
    }
  };

  const add = async () => {
    if (await addPasskey()) await load();
  };

  return (
    <section aria-labelledby="passkeys-heading" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="passkeys-heading" className="text-2xl font-semibold tracking-tight">
          Your passkeys
        </h2>
        {supported && (
          <button type="button" className="btn btn-ghost btn-sm rounded-full" disabled={busy} onClick={add}>
            <PlusIcon className="h-4 w-4" aria-hidden="true" />
            Add a passkey on this device
          </button>
        )}
      </div>

      {loadFailed ? (
        <p role="status" className="rounded-xl border border-warning bg-warning/15 px-4 py-3 text-sm">
          Your passkeys couldn&apos;t be loaded.{" "}
          <button type="button" className="font-semibold underline" onClick={load}>
            Try again
          </button>
        </p>
      ) : passkeys === null ? (
        <div className="h-28 animate-pulse rounded-box bg-base-300" />
      ) : (
        <ul className="flex flex-col divide-y divide-base-300/70 rounded-box border border-base-300/70 bg-base-100 shadow-card">
          {passkeys.map(passkey => (
            <li key={passkey.id} className="flex flex-col gap-3 p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <KeyIcon className="mt-0.5 h-5 w-5 shrink-0 text-link" aria-hidden="true" />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  {editing === passkey.id ? (
                    <form className="flex flex-col gap-2 sm:flex-row" onSubmit={event => rename(event, passkey.id)}>
                      <label htmlFor={`passkey-name-${passkey.id}`} className="sr-only">
                        Passkey name
                      </label>
                      <input
                        id={`passkey-name-${passkey.id}`}
                        value={draft}
                        onChange={event => setDraft(event.target.value)}
                        maxLength={MAX_NAME}
                        placeholder={passkeyTitle(passkey)}
                        autoComplete="off"
                        autoFocus
                        className="input input-bordered input-sm min-w-0 flex-1 rounded-full bg-base-100"
                      />
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="btn btn-primary btn-sm rounded-full"
                          disabled={working || !draft.trim()}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm rounded-full"
                          onClick={() => setEditing(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <p className="break-words font-semibold">{passkeyTitle(passkey)}</p>
                  )}
                  <p className="text-sm text-base-content/70">
                    {[
                      passkey.name && passkey.provider,
                      passkey.synced ? "Syncs to your other devices" : "Only on the device that made it",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <p className="text-sm text-base-content/70">
                    Added {date(passkey.createdAt)}
                    {passkey.createdFrom && ` from ${passkey.createdFrom}`}.{" "}
                    {passkey.lastUsedAt
                      ? `Last signed in ${date(passkey.lastUsedAt)}${passkey.lastUsedFrom ? ` from ${passkey.lastUsedFrom}` : ""}.`
                      : "Not used to sign in yet."}
                  </p>
                </div>
              </div>

              {confirming === passkey.id ? (
                <div className="flex flex-col gap-3 rounded-xl border border-warning bg-warning/15 p-4 sm:ml-8">
                  <p className="text-sm">{passkeys.length === 1 ? REMOVE_LAST : REMOVE_ONE}</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn btn-error btn-sm rounded-full"
                      disabled={working}
                      onClick={() => remove(passkey.id)}
                    >
                      Remove passkey
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm rounded-full"
                      onClick={() => setConfirming(null)}
                    >
                      Keep it
                    </button>
                  </div>
                </div>
              ) : (
                editing !== passkey.id && (
                  <div className="flex gap-2 sm:ml-8">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm rounded-full"
                      aria-label={`Rename ${passkeyTitle(passkey)}`}
                      onClick={() => startRename(passkey)}
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm rounded-full text-red-700 dark:text-red-300"
                      aria-label={`Remove ${passkeyTitle(passkey)}`}
                      onClick={() => {
                        setEditing(null);
                        setConfirming(passkey.id);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                )
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
