import React from "react";
import { jsonResponse } from "../../fixtures/openLibrary";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountProvider, useAccountContext } from "~~/app/contexts/AccountContext";

const browser = vi.hoisted(() => ({ startRegistration: vi.fn(), startAuthentication: vi.fn(), sendSignal: vi.fn() }));
vi.mock("@simplewebauthn/browser", () => browser);

const wrapper = ({ children }: { children: React.ReactNode }) => <AccountProvider>{children}</AccountProvider>;
const account = { displayName: "Reader K7Q2M", points: 45, hasPasskey: false };

// Answers each API path; unlisted paths fail.
const stubApi = (routes: Record<string, () => Response>) => {
  const fetchMock = vi.fn(async (url: string) => (routes[url] ?? (() => jsonResponse({ error: "unexpected" }, 500)))());
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

describe("AccountContext", () => {
  beforeEach(() => {
    browser.startRegistration.mockReset().mockResolvedValue({ id: "cred_new" });
    browser.startAuthentication.mockReset().mockResolvedValue({ id: "cred_1" });
    browser.sendSignal.mockReset().mockResolvedValue(undefined);
  });

  it("loads the visitor's account", async () => {
    stubApi({ "/api/account": () => jsonResponse({ account }) });
    const { result } = renderHook(() => useAccountContext(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.account).toEqual(account);
  });

  it("is null for a visitor who hasn't earned points", async () => {
    stubApi({ "/api/account": () => jsonResponse({ account: null }) });
    const { result } = renderHook(() => useAccountContext(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.account).toBeNull();
  });

  it("updates the total after an award", async () => {
    stubApi({ "/api/account": () => jsonResponse({ account }) });
    const { result } = renderHook(() => useAccountContext(), { wrapper });
    await waitFor(() => expect(result.current.account).not.toBeNull());

    act(() => result.current.setPoints(60));

    expect(result.current.account?.points).toBe(60);
  });

  it("runs the passkey registration ceremony and reloads the account", async () => {
    let saved = false;
    const fetchMock = stubApi({
      "/api/account": () => jsonResponse({ account: { ...account, hasPasskey: saved } }),
      "/api/passkey/register/options": () => jsonResponse({ challenge: "reg" }),
      "/api/passkey/register/verify": () => {
        saved = true;
        return jsonResponse({ ok: true }, 201);
      },
    });
    const { result } = renderHook(() => useAccountContext(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let outcome;
    await act(async () => {
      outcome = await result.current.savePointsWithPasskey();
    });

    expect(outcome).toEqual({ ok: true });
    expect(browser.startRegistration).toHaveBeenCalledWith({ optionsJSON: { challenge: "reg" } });
    const verifyCall = fetchMock.mock.calls.find(([url]) => url === "/api/passkey/register/verify");
    expect(JSON.parse(String((verifyCall as unknown as [string, RequestInit])[1].body))).toEqual({ id: "cred_new" });
    expect(result.current.account?.hasPasskey).toBe(true);
  });

  it("runs the sign-in ceremony", async () => {
    stubApi({
      "/api/account": () => jsonResponse({ account: null }),
      "/api/passkey/login/options": () => jsonResponse({ challenge: "login" }),
      "/api/passkey/login/verify": () => jsonResponse({ ok: true }),
    });
    const { result } = renderHook(() => useAccountContext(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let outcome;
    await act(async () => {
      outcome = await result.current.signInWithPasskey();
    });

    expect(outcome).toEqual({ ok: true });
    expect(browser.startAuthentication).toHaveBeenCalledWith({ optionsJSON: { challenge: "login" } });
  });

  it("reports a closed passkey prompt plainly", async () => {
    stubApi({
      "/api/account": () => jsonResponse({ account }),
      "/api/passkey/register/options": () => jsonResponse({ challenge: "reg" }),
    });
    browser.startRegistration.mockRejectedValue(
      Object.assign(new Error("The operation was aborted"), { name: "NotAllowedError" }),
    );
    const { result } = renderHook(() => useAccountContext(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let outcome;
    await act(async () => {
      outcome = await result.current.savePointsWithPasskey();
    });

    expect(outcome).toEqual({ ok: false, error: "Passkey prompt was closed." });
  });

  it("passes the server's error message through", async () => {
    stubApi({
      "/api/account": () => jsonResponse({ account: null }),
      "/api/passkey/login/options": () => jsonResponse({ challenge: "login" }),
      "/api/passkey/login/verify": () => jsonResponse({ error: "This passkey isn't registered with ArLib.me" }, 404),
    });
    const { result } = renderHook(() => useAccountContext(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let outcome;
    await act(async () => {
      outcome = await result.current.signInWithPasskey();
    });

    expect(outcome).toEqual({ ok: false, error: "This passkey isn't registered with ArLib.me" });
  });

  it("asks the password manager to forget a passkey the site no longer accepts", async () => {
    stubApi({
      "/api/account": () => jsonResponse({ account: null }),
      "/api/passkey/login/options": () => jsonResponse({ challenge: "login", rpId: "arlib.me" }),
      "/api/passkey/login/verify": () =>
        jsonResponse({ error: "This passkey was removed from its ArLib.me account.", unknownCredential: true }, 404),
    });
    const { result } = renderHook(() => useAccountContext(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let outcome;
    await act(async () => {
      outcome = await result.current.signInWithPasskey();
    });

    expect(outcome).toEqual({ ok: false, error: "This passkey was removed from its ArLib.me account." });
    expect(browser.sendSignal).toHaveBeenCalledWith({
      signalName: "unknownCredential",
      rpID: "arlib.me",
      credentialID: "cred_1",
    });
  });

  it("doesn't signal for other sign-in failures", async () => {
    stubApi({
      "/api/account": () => jsonResponse({ account: null }),
      "/api/passkey/login/options": () => jsonResponse({ challenge: "login", rpId: "arlib.me" }),
      "/api/passkey/login/verify": () => jsonResponse({ error: "The passkey could not be verified" }, 400),
    });
    const { result } = renderHook(() => useAccountContext(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.signInWithPasskey();
    });

    expect(browser.sendSignal).not.toHaveBeenCalled();
  });

  it("says so when this device already has a passkey for the account", async () => {
    stubApi({
      "/api/account": () => jsonResponse({ account: { ...account, hasPasskey: true } }),
      "/api/passkey/register/options": () => jsonResponse({ challenge: "reg" }),
    });
    browser.startRegistration.mockRejectedValue(Object.assign(new Error("excluded"), { name: "InvalidStateError" }));
    const { result } = renderHook(() => useAccountContext(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let outcome;
    await act(async () => {
      outcome = await result.current.savePointsWithPasskey();
    });

    expect(outcome).toEqual({ ok: false, error: "This device already has a passkey for your account." });
  });
});
