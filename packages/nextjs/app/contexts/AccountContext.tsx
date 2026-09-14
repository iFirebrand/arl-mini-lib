"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { sendSignal, startAuthentication, startRegistration } from "@simplewebauthn/browser";

export interface Account {
  displayName: string;
  points: number;
  hasPasskey: boolean;
  /** May hide libraries and books. */
  isModerator?: boolean;
}

type Result = { ok: true } | { ok: false; error: string };

interface AccountContextType {
  /** Null until the visitor earns points or signs in. */
  account: Account | null;
  loading: boolean;
  refresh: () => Promise<void>;
  /** Shows a new total right away, after the server awarded points. */
  setPoints: (total: number) => void;
  savePointsWithPasskey: () => Promise<Result>;
  signInWithPasskey: () => Promise<Result>;
}

export const AccountContext = createContext<AccountContextType | undefined>(undefined);

class RequestError extends Error {
  constructor(
    message: string,
    readonly data: Record<string, unknown>,
  ) {
    super(message);
  }
}

const postJson = async (url: string, body?: unknown) => {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new RequestError(data.error || `Request failed (${response.status})`, data);
  return data;
};

// The browser rejects with NotAllowedError when the person closes the passkey prompt, and with
// InvalidStateError when this device already holds a passkey for the account.
const describe = (error: unknown) =>
  error instanceof Error && error.name === "NotAllowedError"
    ? "Passkey prompt was closed."
    : error instanceof Error && error.name === "InvalidStateError"
      ? "This device already has a passkey for your account."
      : error instanceof Error
        ? error.message
        : "Something went wrong.";

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (): Promise<Account | null | undefined> => {
    try {
      const response = await fetch("/api/account", { cache: "no-store" });
      return (await response.json()).account ?? null;
    } catch (error) {
      console.error("Error loading account:", error);
      return undefined;
    }
  }, []);

  const refresh = useCallback(async () => {
    const loaded = await load();
    if (loaded !== undefined) setAccount(loaded);
    setLoading(false);
  }, [load]);

  useEffect(() => {
    let active = true;
    load().then(loaded => {
      if (!active) return;
      if (loaded !== undefined) setAccount(loaded);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [load]);

  const setPoints = useCallback((total: number) => {
    setAccount(current => (current ? { ...current, points: total } : current));
  }, []);

  const savePointsWithPasskey = useCallback(async (): Promise<Result> => {
    try {
      const optionsJSON = await postJson("/api/passkey/register/options");
      await postJson("/api/passkey/register/verify", await startRegistration({ optionsJSON }));
      await refresh();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: describe(error) };
    }
  }, [refresh]);

  const signInWithPasskey = useCallback(async (): Promise<Result> => {
    try {
      const optionsJSON = await postJson("/api/passkey/login/options");
      const response = await startAuthentication({ optionsJSON });
      try {
        await postJson("/api/passkey/login/verify", response);
      } catch (error) {
        // A passkey the site no longer knows (removed by its owner): ask the password manager to
        // stop offering it. Browsers without the Signal API just skip this.
        if (error instanceof RequestError && error.data.unknownCredential && optionsJSON.rpId) {
          sendSignal({ signalName: "unknownCredential", rpID: optionsJSON.rpId, credentialID: response.id }).catch(
            () => {},
          );
        }
        throw error;
      }
      await refresh();
      return { ok: true };
    } catch (error) {
      return { ok: false, error: describe(error) };
    }
  }, [refresh]);

  return (
    <AccountContext.Provider value={{ account, loading, refresh, setPoints, savePointsWithPasskey, signInWithPasskey }}>
      {children}
    </AccountContext.Provider>
  );
}

export const useAccountContext = () => {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error("useAccountContext must be used within an AccountProvider");
  }
  return context;
};
