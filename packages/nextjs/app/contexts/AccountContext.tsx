"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";

export interface Account {
  displayName: string;
  points: number;
  hasPasskey: boolean;
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

const postJson = async (url: string, body?: unknown) => {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
};

// The browser rejects with NotAllowedError when the person closes the passkey prompt.
const describe = (error: unknown) =>
  error instanceof Error && error.name === "NotAllowedError"
    ? "Passkey prompt was closed."
    : error instanceof Error
      ? error.message
      : "Something went wrong.";

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/account", { cache: "no-store" });
      setAccount((await response.json()).account ?? null);
    } catch (error) {
      console.error("Error loading account:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

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
      await postJson("/api/passkey/login/verify", await startAuthentication({ optionsJSON }));
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
