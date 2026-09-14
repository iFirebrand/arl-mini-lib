import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PasskeyList, { REMOVE_LAST, REMOVE_ONE } from "~~/app/account/PasskeyList";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  savePointsWithPasskey: vi.fn(),
  sendSignal: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("~~/app/contexts/AccountContext", () => ({
  useAccountContext: () => ({
    refresh: mocks.refresh,
    savePointsWithPasskey: mocks.savePointsWithPasskey,
    signInWithPasskey: vi.fn(),
  }),
}));
vi.mock("@simplewebauthn/browser", () => ({ browserSupportsWebAuthn: () => true, sendSignal: mocks.sendSignal }));
vi.mock("react-hot-toast", () => ({ toast: mocks.toast }));

const phone = {
  id: "cred_phone",
  name: null,
  provider: "Apple Passwords",
  synced: true,
  createdAt: "2026-09-13T20:00:00.000Z",
  createdFrom: "Safari on iPhone",
  lastUsedAt: "2026-09-14T09:00:00.000Z",
  lastUsedFrom: "Safari on iPhone",
};
const key = {
  id: "cred_key",
  name: "Security key",
  provider: null,
  synced: false,
  createdAt: "2026-09-14T10:00:00.000Z",
  createdFrom: "Chrome on Mac",
  lastUsedAt: null,
  lastUsedFrom: null,
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

// Answers /api/account/passkeys with `listed`, and records rename and remove calls.
const serve = (listed: object[], answers: Record<string, () => Response> = {}) => {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    if (method === "GET") return json({ passkeys: listed });
    return answers[method]?.() ?? json({ error: "unexpected" }, 500);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

const row = async (name: string) => (await screen.findByText(name)).closest("li") as HTMLElement;

describe("PasskeyList", () => {
  beforeEach(() => {
    Object.values(mocks).forEach(value => typeof value === "function" && value.mockReset());
    mocks.toast.success.mockReset();
    mocks.toast.error.mockReset();
    mocks.sendSignal.mockResolvedValue(undefined);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("lists each passkey with where it lives, when it was added and last used", async () => {
    serve([phone, key]);
    render(<PasskeyList />);

    const first = await row("Apple Passwords");
    expect(within(first).getByText("Syncs to your other devices")).toBeInTheDocument();
    expect(within(first).getByText(/Added Sep 13, 2026 from Safari on iPhone\./)).toBeInTheDocument();
    expect(within(first).getByText(/Last signed in Sep 14, 2026 from Safari on iPhone\./)).toBeInTheDocument();

    const second = await row("Security key");
    expect(within(second).getByText("Only on the device that made it")).toBeInTheDocument();
    expect(within(second).getByText(/Not used to sign in yet\./)).toBeInTheDocument();
  });

  it("renames a passkey", async () => {
    const fetchMock = serve([phone], { PATCH: () => json({ ok: true, name: "My iPhone" }) });
    render(<PasskeyList />);

    await userEvent.click(await screen.findByRole("button", { name: "Rename Apple Passwords" }));
    await userEvent.type(screen.getByLabelText("Passkey name"), "My iPhone");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("My iPhone")).toBeInTheDocument();
    // The provider moves to the details line once the passkey has a name of its own.
    expect(screen.getByText("Apple Passwords · Syncs to your other devices")).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls.find(([, init]) => init?.method === "PATCH") ?? [];
    expect(url).toBe("/api/account/passkeys/cred_phone");
    expect(JSON.parse(String(init?.body))).toEqual({ name: "My iPhone" });
  });

  it("warns that removing the only passkey leaves the account in this browser, then removes it", async () => {
    serve([phone], {
      DELETE: () => json({ remaining: [], rpID: "localhost", userID: "YWNjXzE" }),
    });
    render(<PasskeyList />);

    await userEvent.click(await screen.findByRole("button", { name: "Remove Apple Passwords" }));
    expect(screen.getByText(REMOVE_LAST)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Remove passkey" }));

    await waitFor(() => expect(screen.queryByText("Apple Passwords")).not.toBeInTheDocument());
    expect(mocks.toast.success).toHaveBeenCalledWith("Passkey removed. It no longer signs in.");
    // The header and the page learn the account no longer has a passkey.
    expect(mocks.refresh).toHaveBeenCalled();
    // The password manager is told which passkeys are still good (none).
    expect(mocks.sendSignal).toHaveBeenCalledWith({
      signalName: "allAcceptedCredentials",
      rpID: "localhost",
      userID: "YWNjXzE",
      allAcceptedCredentialIDs: [],
    });
  });

  it("uses the gentler warning when other passkeys remain, and can be cancelled", async () => {
    const fetchMock = serve([phone, key]);
    render(<PasskeyList />);

    await userEvent.click(await screen.findByRole("button", { name: "Remove Security key" }));
    expect(screen.getByText(REMOVE_ONE)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Keep it" }));

    expect(screen.queryByText(REMOVE_ONE)).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "DELETE")).toBe(false);
  });

  it("says why a removal failed and keeps the passkey", async () => {
    serve([phone], { DELETE: () => json({ error: "That passkey isn't on your account" }, 404) });
    render(<PasskeyList />);

    await userEvent.click(await screen.findByRole("button", { name: "Remove Apple Passwords" }));
    await userEvent.click(screen.getByRole("button", { name: "Remove passkey" }));

    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith("That passkey isn't on your account"));
    expect(screen.getByText("Apple Passwords")).toBeInTheDocument();
  });

  it("adds a passkey on this device and shows it", async () => {
    const fetchMock = serve([phone]);
    mocks.savePointsWithPasskey.mockImplementation(async () => {
      fetchMock.mockImplementation(async () => json({ passkeys: [phone, key] }));
      return { ok: true };
    });
    render(<PasskeyList />);

    await userEvent.click(await screen.findByRole("button", { name: "Add a passkey on this device" }));

    expect(await screen.findByText("Security key")).toBeInTheDocument();
    expect(mocks.toast.success).toHaveBeenCalledWith("Passkey added. It signs you in from this device.");
  });

  it("offers to try again when the list can't load", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    render(<PasskeyList />);

    expect(await screen.findByText(/couldn't be loaded/)).toBeInTheDocument();
    serve([phone]);
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Apple Passwords")).toBeInTheDocument();
  });
});
