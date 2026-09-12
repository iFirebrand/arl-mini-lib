import React from "react";
import { bookInfo } from "../../fixtures/openLibrary";
import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LibraryClient from "~~/app/libs/[id]/LibraryClient";

const mocks = vi.hoisted(() => ({
  account: null as null | { displayName: string; points: number; hasPasskey: boolean },
  refresh: vi.fn(),
  setPoints: vi.fn(),
  fetchBookData: vi.fn(),
  saveBookToDatabase: vi.fn(),
  confirmBookInLibrary: vi.fn(),
  onScan: undefined as undefined | ((isbn: string) => Promise<void>),
  toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
}));

vi.mock("~~/app/contexts/AccountContext", () => ({
  useAccountContext: () => ({ account: mocks.account, refresh: mocks.refresh, setPoints: mocks.setPoints }),
}));
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
const award = (pointsAwarded: number, total: number, newBooksThisVisit = 1) => ({
  pointsAwarded,
  total,
  newBooksThisVisit,
});

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

const sessionPoints = () => screen.getByText("Points This Session").nextSibling;

describe("LibraryClient", () => {
  beforeEach(() => {
    mocks.account = { displayName: "Reader K7Q2M", points: 40, hasPasskey: false };
    mocks.onScan = undefined;
    mocks.refresh.mockReset();
    mocks.setPoints.mockReset();
    mocks.fetchBookData.mockReset().mockImplementation(async (isbn: string) => book(isbn));
    mocks.saveBookToDatabase.mockReset().mockResolvedValue(award(5, 45));
    mocks.confirmBookInLibrary.mockReset().mockResolvedValue({ confirmed: true, pointsAwarded: 2, total: 42 });
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

  it("saves a new book and shows the points the server awarded", async () => {
    await renderAtLibrary();

    await scan("9780063345164");

    expect(mocks.saveBookToDatabase).toHaveBeenCalledWith(book("9780063345164"));
    expect(mocks.toast.success).toHaveBeenCalledWith("Book added successfully!");
    expect(screen.getByText(/Scanned Books: 1/)).toBeInTheDocument();
    expect(screen.getByText("New Book Points").nextSibling).toHaveTextContent("5");
    expect(sessionPoints()).toHaveTextContent("5");
    expect(mocks.setPoints).toHaveBeenCalledWith(45);
  });

  it("adds up points across scans using the server's amounts", async () => {
    mocks.saveBookToDatabase.mockResolvedValueOnce(award(5, 45, 3)).mockResolvedValueOnce(award(10, 55, 4));
    await renderAtLibrary();

    await scan("9780000000001");
    await scan("9780000000002");

    expect(sessionPoints()).toHaveTextContent("15");
    expect(screen.getByText("Double points for new books")).toBeInTheDocument();
  });

  it("loads the new account after the first points of a visitor without one", async () => {
    mocks.account = null;
    await renderAtLibrary();

    await scan("9780063345164");

    expect(mocks.refresh).toHaveBeenCalled();
    expect(mocks.setPoints).not.toHaveBeenCalled();
  });

  it("does not save or score a book scanned twice in a visit", async () => {
    await renderAtLibrary();

    await scan("9780063345164");
    await scan("9780063345164");

    expect(mocks.saveBookToDatabase).toHaveBeenCalledTimes(1);
    expect(mocks.toast).toHaveBeenCalledWith("No more updates needed for this book.", { icon: "ℹ️" });
  });

  it("confirms a stale book the library already has and shows the server's bonus", async () => {
    await renderAtLibrary([{ isbn13: "9780063345164", updatedAt: new Date(Date.now() - 10 * DAY) }]);

    await scan("9780063345164");

    expect(mocks.saveBookToDatabase).not.toHaveBeenCalled();
    expect(mocks.confirmBookInLibrary).toHaveBeenCalledWith("lib_1", "9780063345164");
    expect(screen.getByText("Book Recency Bonus").nextSibling).toHaveTextContent("2");
    expect(mocks.setPoints).toHaveBeenCalledWith(42);
  });

  it("does nothing for a book someone confirmed within the last day", async () => {
    await renderAtLibrary([{ isbn13: "9780063345164", updatedAt: new Date(Date.now() - DAY / 2) }]);

    await scan("9780063345164");

    expect(mocks.confirmBookInLibrary).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith("No more updates needed for this book.", { icon: "ℹ️" });
  });

  it("shows an error when the book could not be confirmed", async () => {
    mocks.confirmBookInLibrary.mockResolvedValue({ confirmed: false, pointsAwarded: 0 });
    await renderAtLibrary([{ isbn13: "9780063345164", updatedAt: new Date(Date.now() - 40 * DAY) }]);

    await scan("9780063345164");

    expect(mocks.toast.error).toHaveBeenCalledWith("Error processing book");
    expect(sessionPoints()).toHaveTextContent("0");
  });

  it("reports books OpenLibrary doesn't know", async () => {
    mocks.fetchBookData.mockResolvedValue(null);
    await renderAtLibrary();

    await scan("0000000000000");

    expect(mocks.toast.error).toHaveBeenCalledWith("Not found. Try again? Newer books only for now.");
    expect(mocks.saveBookToDatabase).not.toHaveBeenCalled();
  });

  it("shows an error and no points when saving fails", async () => {
    mocks.saveBookToDatabase.mockRejectedValue(new Error("Save book API failed with status: 500"));
    await renderAtLibrary();

    await scan("9780063345164");

    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith("Error processing book"));
    expect(screen.getByText(/Scanned Books: 0/)).toBeInTheDocument();
    expect(sessionPoints()).toHaveTextContent("0");
  });

  it("shows no points when the server awards none (e.g. the daily cap)", async () => {
    mocks.saveBookToDatabase.mockResolvedValue(award(0, 500));
    await renderAtLibrary();

    await scan("9780063345164");

    expect(screen.queryByText("New Book Points")).not.toBeInTheDocument();
    expect(sessionPoints()).toHaveTextContent("0");
  });
});
