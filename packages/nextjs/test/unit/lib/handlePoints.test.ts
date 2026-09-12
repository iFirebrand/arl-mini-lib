import { jsonResponse } from "../../fixtures/openLibrary";
import { describe, expect, it, vi } from "vitest";
import { handlePoints } from "~~/app/utils/points/handlePoints";

const WALLET = "0x1234567890abcdef1234567890abcdef12345678";

describe("handlePoints", () => {
  it("keeps points locally when no wallet is connected", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const addPoints = vi.fn();
    const setBanked = vi.fn();

    await handlePoints(undefined, 50, "CREATE_LIBRARY", addPoints, setBanked);

    expect(addPoints).toHaveBeenCalledWith(50, "CREATE_LIBRARY");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(setBanked).not.toHaveBeenCalled();
  });

  it("banks points on the server when a wallet is connected", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ success: true, currentTotal: 105 }));
    vi.stubGlobal("fetch", fetchMock);
    const setBanked = vi.fn();

    await handlePoints(WALLET, 5, "ADD_BOOK", vi.fn(), setBanked);

    expect(fetchMock).toHaveBeenCalledWith("/api/points", expect.objectContaining({ method: "POST" }));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toEqual({
      walletAddress: WALLET,
      pointActions: [{ points: 5, type: "ADD_BOOK", timestamp: expect.any(String) }],
    });
    expect(setBanked).toHaveBeenCalledWith(105);
  });

  it("calls addPoints with a negative amount when a wallet is connected (ignored by PointsContext)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ success: true, currentTotal: 5 })));
    const addPoints = vi.fn();

    await handlePoints(WALLET, 5, "ADD_BOOK", addPoints, vi.fn());

    expect(addPoints).toHaveBeenCalledWith(-5, "ADD_BOOK");
  });

  it("leaves the banked total alone when the server rejects the request", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: "Unauthorized request origin" }, 403)));
    const setBanked = vi.fn();

    await handlePoints(WALLET, 5, "ADD_BOOK", vi.fn(), setBanked);

    expect(setBanked).not.toHaveBeenCalled();
  });

  it("swallows network errors instead of throwing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(handlePoints(WALLET, 5, "ADD_BOOK", vi.fn(), vi.fn())).resolves.toBeUndefined();
  });
});
