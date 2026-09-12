import React from "react";
import { bookInfo } from "../../fixtures/openLibrary";
import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LibraryClient from "~~/app/libs/[id]/LibraryClient";

const mocks = vi.hoisted(() => ({
  address: undefined as string | undefined,
  addPoints: vi.fn(),
  setBankedPointsTotal: vi.fn(),
  handlePoints: vi.fn(),
  fetchBookData: vi.fn(),
  saveBookToDatabase: vi.fn(),
  confirmBookInLibrary: vi.fn(),
  onScan: undefined as undefined | ((isbn: string) => Promise<void>),
  toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
}));

vi.mock("wagmi", () => ({ useAccount: () => ({ address: mocks.address }) }));
vi.mock("~~/app/contexts/PointsContext", () => ({ usePoints: () => ({ addPoints: mocks.addPoints }) }));
vi.mock("~~/app/contexts/BankedPointsContext", () => ({
  useBankedPoints: () => ({ setBankedPointsTotal: mocks.setBankedPointsTotal }),
}));
vi.mock("~~/app/utils/points/handlePoints", () => ({ handlePoints: mocks.handlePoints }));
vi.mock("~~/app/libs/[id]/fetchBookData", () => ({ fetchBookData: mocks.fetchBookData }));
vi.mock("~~/app/libs/[id]/saveBookToDatabase", () => ({ saveBookToDatabase: mocks.saveBookToDatabase }));
vi.mock("~~/actions/actions", () => ({ confirmBookInLibrary: mocks.confirmBookInLibrary }));
vi.mock("react-hot-toast", () => ({ toast: mocks.toast }));
vi.mock("react-dom-confetti", () => ({ default: () => null }));
// The real scanner needs a camera; capture its onScan callback instead.
vi.mock("~~/app/libs/[id]/App", () => ({
  default: ({ onScan }: { onScan: (isbn: string) => Promise<void> }) => {
    mocks.onScan = onScan;
    return <div>camera scanner</div>;
  },
}));

const library = { id: "lib_1", locationName: "Maple St", latitude: 38.883839, longitude: -77.107249 };
const DAY = 24 * 60 * 60 * 1000;

const setUserPosition = (latitude: number, longitude: number) => {
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: {
      getCurrentPosition: (ok: PositionCallback) => ok({ coords: { latitude, longitude } } as GeolocationPosition),
    },
  });
};

const book = (isbn13: string, title = `Book ${isbn13}`) => ({ ...bookInfo, isbn13, title });

const renderAtLibrary = async (isbn13s: { isbn13: string; updatedAt: Date }[] = []) => {
  setUserPosition(library.latitude, library.longitude);
  render(<LibraryClient library={library} isbn13s={isbn13s} />);
  await screen.findByText("camera scanner");
};

const scan = async (isbn: string) => {
  const onScan = mocks.onScan;
  if (!onScan) throw new Error("Scanner was not rendered");
  await act(async () => {
    await onScan(isbn);
  });
};

// Points awarded per handlePoints call, in order.
const awarded = () => mocks.handlePoints.mock.calls.map(call => call[1]);

describe("LibraryClient", () => {
  beforeEach(() => {
    mocks.address = undefined;
    mocks.onScan = undefined;
    mocks.fetchBookData.mockReset();
    mocks.saveBookToDatabase.mockReset().mockResolvedValue(undefined);
    mocks.confirmBookInLibrary.mockReset().mockResolvedValue(true);
    mocks.fetchBookData.mockImplementation(async (isbn: string) => book(isbn));
  });

  it("shows 'Library not found' for an unknown library", () => {
    render(<LibraryClient library={null} isbn13s={[]} />);
    expect(screen.getByText("Library not found")).toBeInTheDocument();
  });

  it("hides the scanner when the user is not at the library", async () => {
    setUserPosition(library.latitude + 0.05, library.longitude);
    render(<LibraryClient library={library} isbn13s={[]} />);

    expect(await screen.findByText("You must be at the library to scan")).toBeInTheDocument();
    expect(screen.queryByText("camera scanner")).not.toBeInTheDocument();
  });

  it("hides the scanner when location is denied", async () => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (_ok: PositionCallback, fail: PositionErrorCallback) =>
          fail({} as GeolocationPositionError),
      },
    });
    render(<LibraryClient library={library} isbn13s={[]} />);

    expect(await screen.findByText("You must be at the library to scan")).toBeInTheDocument();
  });

  it("saves a new book, awards 5 points and counts it", async () => {
    await renderAtLibrary();

    await scan("9780063345164");

    expect(mocks.fetchBookData).toHaveBeenCalledWith("9780063345164", "lib_1");
    expect(mocks.saveBookToDatabase).toHaveBeenCalledWith(book("9780063345164"));
    expect(mocks.toast.success).toHaveBeenCalledWith("Book added successfully!");
    expect(screen.getByText(/Scanned Books: 1/)).toBeInTheDocument();
    expect(screen.getByText("Book 9780063345164")).toBeInTheDocument();
    expect(mocks.handlePoints).toHaveBeenCalledWith(
      undefined,
      5,
      "ADD_BOOK",
      mocks.addPoints,
      mocks.setBankedPointsTotal,
    );
  });

  it("passes the connected wallet through to handlePoints", async () => {
    mocks.address = "0xabc";
    await renderAtLibrary();

    await scan("9780063345164");

    expect(mocks.handlePoints.mock.calls[0][0]).toBe("0xabc");
  });

  it("doubles new book points after the first 3 new books", async () => {
    await renderAtLibrary();

    for (const isbn of ["9780000000001", "9780000000002", "9780000000003", "9780000000004"]) {
      await scan(isbn);
    }

    expect(awarded()).toEqual([5, 5, 5, 10]);
  });

  it("does not save or award points for a book scanned twice in a session", async () => {
    await renderAtLibrary();

    await scan("9780063345164");
    await scan("9780063345164");

    expect(mocks.saveBookToDatabase).toHaveBeenCalledTimes(1);
    expect(awarded()).toEqual([5]);
    expect(mocks.toast).toHaveBeenCalledWith("No more updates needed for this book.", { icon: "ℹ️" });
  });

  it("confirms a book the library already has instead of saving a duplicate", async () => {
    await renderAtLibrary([{ isbn13: "9780063345164", updatedAt: new Date(Date.now() - 10 * DAY) }]);

    await scan("9780063345164");

    expect(mocks.saveBookToDatabase).not.toHaveBeenCalled();
    expect(mocks.confirmBookInLibrary).toHaveBeenCalledWith("lib_1", "9780063345164");
    expect(mocks.toast.success).toHaveBeenCalledWith("Thanks for confirming this book is still here!");
    expect(screen.getByText(/Scanned Books: 1/)).toBeInTheDocument();
  });

  it("does nothing for a book someone confirmed within the last day", async () => {
    await renderAtLibrary([{ isbn13: "9780063345164", updatedAt: new Date(Date.now() - DAY / 2) }]);

    await scan("9780063345164");

    expect(mocks.confirmBookInLibrary).not.toHaveBeenCalled();
    expect(mocks.handlePoints).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith("No more updates needed for this book.", { icon: "ℹ️" });
  });

  it.each([
    [3, "1"],
    [10, "2"],
    [18, "3"],
    [25, "4"],
    [40, "5"],
  ])("shows a recency bonus for a book last seen %i days ago", async (days, bonus) => {
    await renderAtLibrary([{ isbn13: "9780063345164", updatedAt: new Date(Date.now() - days * DAY) }]);

    await scan("9780063345164");

    expect(screen.getByText("Book Recency Bonus").nextSibling).toHaveTextContent(bonus);
  });

  it("awards the recency bonus once per book per visit", async () => {
    await renderAtLibrary([{ isbn13: "9780063345164", updatedAt: new Date(Date.now() - 40 * DAY) }]);

    await scan("9780063345164");
    await scan("9780063345164");

    expect(awarded()).toEqual([5]);
    expect(mocks.confirmBookInLibrary).toHaveBeenCalledTimes(1);
  });

  it("awards nothing when the book could not be confirmed", async () => {
    mocks.confirmBookInLibrary.mockResolvedValue(false);
    await renderAtLibrary([{ isbn13: "9780063345164", updatedAt: new Date(Date.now() - 40 * DAY) }]);

    await scan("9780063345164");

    expect(mocks.handlePoints).not.toHaveBeenCalled();
    expect(mocks.toast.error).toHaveBeenCalledWith("Error processing book");
  });

  it("counts failed lookups toward the persistence bonus", async () => {
    mocks.fetchBookData.mockResolvedValue(null);
    await renderAtLibrary();

    await scan("0000000000000");
    await scan("0000000000000");

    expect(mocks.toast.error).toHaveBeenCalledWith("Not found. Try again? Newer books only for now.");
    expect(screen.getByText("20%")).toBeInTheDocument();
    expect(mocks.saveBookToDatabase).not.toHaveBeenCalled();
  });

  it("adds a one-time 5 point persistence bonus to the next points after 10 failures", async () => {
    await renderAtLibrary();
    mocks.fetchBookData.mockResolvedValue(null);
    for (let i = 0; i < 10; i++) await scan("0000000000000");

    mocks.fetchBookData.mockImplementation(async (isbn: string) => book(isbn));
    await scan("9780000000001");
    await scan("9780000000002");

    expect(awarded()).toEqual([10, 5]);
    expect(screen.getByText("Persistency Bonus")).toBeInTheDocument();
  });

  it("still gives the persistence bonus when there were more than 10 failures", async () => {
    await renderAtLibrary();
    mocks.fetchBookData.mockResolvedValue(null);
    for (let i = 0; i < 12; i++) await scan("0000000000000");

    mocks.fetchBookData.mockImplementation(async (isbn: string) => book(isbn));
    await scan("9780063345164");

    expect(awarded()).toEqual([10]);
  });

  it("shows an error toast when saving fails", async () => {
    mocks.saveBookToDatabase.mockRejectedValue(new Error("Save book API failed with status: 500"));
    await renderAtLibrary();

    await scan("9780063345164");

    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith("Error processing book"));
    expect(screen.getByText(/Scanned Books: 0/)).toBeInTheDocument();
    expect(mocks.handlePoints).not.toHaveBeenCalled();
  });
});
