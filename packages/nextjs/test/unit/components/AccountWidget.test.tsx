import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountWidget } from "~~/components/AccountWidget";

const mocks = vi.hoisted(() => ({
  state: {
    account: null as null | { displayName: string; points: number; hasPasskey: boolean },
    loading: false,
  },
  savePointsWithPasskey: vi.fn(),
  signInWithPasskey: vi.fn(),
  supported: true,
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("~~/app/contexts/AccountContext", () => ({
  useAccountContext: () => ({
    ...mocks.state,
    savePointsWithPasskey: mocks.savePointsWithPasskey,
    signInWithPasskey: mocks.signInWithPasskey,
  }),
}));
vi.mock("@simplewebauthn/browser", () => ({ browserSupportsWebAuthn: () => mocks.supported }));
vi.mock("react-hot-toast", () => ({ toast: mocks.toast }));

describe("AccountWidget", () => {
  beforeEach(() => {
    mocks.state = { account: null, loading: false };
    mocks.supported = true;
    mocks.savePointsWithPasskey.mockReset().mockResolvedValue({ ok: true });
    mocks.signInWithPasskey.mockReset().mockResolvedValue({ ok: true });
    mocks.toast.success.mockReset();
    mocks.toast.error.mockReset();
  });

  it("shows nothing while the account loads", () => {
    mocks.state.loading = true;
    const { container } = render(<AccountWidget />);
    expect(container).toBeEmptyDOMElement();
  });

  it("offers sign-in to a visitor without an account", async () => {
    render(<AccountWidget />);
    expect(screen.getByText("0 points")).toBeInTheDocument();

    await userEvent.click(await screen.findByRole("button", { name: "Sign in" }));

    expect(mocks.signInWithPasskey).toHaveBeenCalled();
    await waitFor(() => expect(mocks.toast.success).toHaveBeenCalledWith("Signed in"));
  });

  it("offers to save points with a passkey once an anonymous account has some", async () => {
    mocks.state.account = { displayName: "Reader K7Q2M", points: 45, hasPasskey: false };
    render(<AccountWidget />);
    expect(screen.getByText("45 points")).toBeInTheDocument();
    // They may already have a passkey account from another device; signing in merges these points.
    expect(await screen.findByRole("button", { name: "Sign in" })).toBeInTheDocument();

    await userEvent.click(await screen.findByRole("button", { name: "Save with passkey" }));

    expect(mocks.savePointsWithPasskey).toHaveBeenCalled();
    await waitFor(() => expect(mocks.toast.success).toHaveBeenCalledWith("Points saved to your passkey"));
  });

  it("shows the pseudonym and no passkey buttons once a passkey is saved", () => {
    mocks.state.account = { displayName: "Reader K7Q2M", points: 45, hasPasskey: true };
    render(<AccountWidget />);

    expect(screen.getByText("Reader K7Q2M")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("explains failures", async () => {
    mocks.state.account = { displayName: "Reader K7Q2M", points: 45, hasPasskey: false };
    mocks.savePointsWithPasskey.mockResolvedValue({ ok: false, error: "Passkey prompt was closed." });
    render(<AccountWidget />);

    await userEvent.click(await screen.findByRole("button", { name: "Save with passkey" }));

    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith("Passkey prompt was closed."));
  });

  it("hides passkey buttons in browsers without passkey support", () => {
    mocks.supported = false;
    mocks.state.account = { displayName: "Reader K7Q2M", points: 45, hasPasskey: false };
    render(<AccountWidget />);

    expect(screen.getByText("45 points")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
