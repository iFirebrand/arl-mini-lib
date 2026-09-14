import React from "react";
import { bookInfo } from "../../fixtures/openLibrary";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MISS_NOTED, SEARCH_NO_RESULTS } from "~~/app/libs/[id]/BookSearch";
import LibraryClient, {
  ALREADY_IN_CATALOG,
  BOOK_NOT_FOUND,
  SEARCH_LIMIT_REACHED,
} from "~~/app/libs/[id]/LibraryClient";

const mocks = vi.hoisted(() => ({
  account: null as null | { displayName: string; points: number; hasPasskey: boolean },
  refresh: vi.fn(),
  setPoints: vi.fn(),
  fetchBookData: vi.fn(),
  saveBookToDatabase: vi.fn(),
  confirmBookInLibrary: vi.fn(),
  searchCatalogs: vi.fn(),
  reportLookupMiss: vi.fn(),
  onScan: undefined as undefined | ((isbn: string, source: string) => Promise<void>),
  toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
}));

vi.mock("~~/app/contexts/AccountContext", () => ({
  useAccountContext: () => ({ account: mocks.account, refresh: mocks.refresh, setPoints: mocks.setPoints }),
}));
vi.mock("~~/app/libs/[id]/fetchBookData", () => ({ fetchBookData: mocks.fetchBookData }));
vi.mock("~~/app/libs/[id]/saveBookToDatabase", () => ({ saveBookToDatabase: mocks.saveBookToDatabase }));
vi.mock("~~/app/libs/[id]/bookSearchClient", () => ({
  searchCatalogs: mocks.searchCatalogs,
  reportLookupMiss: mocks.reportLookupMiss,
}));
vi.mock("~~/actions/actions", () => ({ confirmBookInLibrary: mocks.confirmBookInLibrary }));
vi.mock("react-hot-toast", () => ({ toast: mocks.toast }));
vi.mock("react-dom-confetti", () => ({ default: () => null }));
// The real scanner needs a camera; capture its onScan callback instead.
vi.mock("~~/app/libs/[id]/App", () => ({
  default: ({ onScan }: { onScan: (isbn: string, source: string) => Promise<void> }) => {
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
  added: true,
  award: { pointsAwarded, total, newBooksThisVisit },
});
// An old book OpenLibrary knows only by its edition id.
const oldBook = {
  title: "Controversial essays",
  authors: "John Sparrow",
  year: "1966",
  thumbnail: "https://covers.openlibrary.org/b/id/10066834-M.jpg",
  isbn13: null,
  editionKey: "OL6014553M",
};

const renderAtLibrary = async (isbn13s: { isbn13: string; updatedAt: Date }[] = []) => {
  setUserPosition(library.latitude, library.longitude);
  render(<LibraryClient library={library} isbn13s={isbn13s} />);
  await screen.findByText("camera scanner");
};

const scan = async (isbn: string, source = "camera") => {
  const onScan = mocks.onScan;
  if (!onScan) throw new Error("Scanner was not rendered");
  await act(async () => {
    await onScan(isbn, source);
  });
};

const searchFor = async (title: string, author = "") => {
  await userEvent.click(screen.getByRole("button", { name: /Search by title/ }));
  await userEvent.type(screen.getByLabelText("Title"), title);
  if (author) await userEvent.type(screen.getByLabelText(/Author/), author);
  await userEvent.click(screen.getByRole("button", { name: "Search" }));
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
    mocks.searchCatalogs.mockReset().mockResolvedValue([oldBook]);
    mocks.reportLookupMiss.mockReset();
    mocks.toast.mockReset();
    mocks.toast.error.mockReset();
    mocks.toast.success.mockReset();
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

    await scan("9780063345164", "photo");

    expect(mocks.saveBookToDatabase).toHaveBeenCalledWith({
      isbn13: "9780063345164",
      libraryId: "lib_1",
      via: "photo",
    });
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

  it("reports books no catalog knows", async () => {
    mocks.fetchBookData.mockResolvedValue(null);
    await renderAtLibrary();

    await scan("0000000000000");

    expect(mocks.toast.error).toHaveBeenCalledWith(BOOK_NOT_FOUND);
    expect(mocks.saveBookToDatabase).not.toHaveBeenCalled();
    expect(mocks.reportLookupMiss).toHaveBeenCalledWith({ kind: "isbn", isbn: "0000000000000" }, "lib_1");
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

  describe("searching by title", () => {
    it("adds the chosen book for the server's searched-book points", async () => {
      mocks.saveBookToDatabase.mockResolvedValue({ added: true, award: { pointsAwarded: 2, total: 42 } });
      await renderAtLibrary();

      await searchFor("controversial essays", "sparrow");
      expect(mocks.searchCatalogs).toHaveBeenCalledWith("controversial essays", "sparrow");
      await userEvent.click(await screen.findByRole("button", { name: /Controversial essays/ }));

      expect(mocks.saveBookToDatabase).toHaveBeenCalledWith({
        libraryId: "lib_1",
        isbn13: null,
        editionKey: "OL6014553M",
        via: "search",
      });
      expect(mocks.toast.success).toHaveBeenCalledWith("Book added successfully!");
      expect(screen.getByText("Searched Book Points").nextSibling).toHaveTextContent("2");
      expect(screen.getByText(/Scanned Books: 1/)).toBeInTheDocument();
      expect(mocks.setPoints).toHaveBeenCalledWith(42);
      // Ready for the next book.
      expect(screen.getByLabelText("Title")).toHaveValue("");
      expect(screen.queryByRole("button", { name: /Controversial essays/ })).not.toBeInTheDocument();
    });

    it("says when the library already has the book", async () => {
      mocks.saveBookToDatabase.mockResolvedValue({ added: false, award: null });
      await renderAtLibrary();

      await searchFor("controversial essays");
      await userEvent.click(await screen.findByRole("button", { name: /Controversial essays/ }));

      expect(mocks.toast).toHaveBeenCalledWith(ALREADY_IN_CATALOG, { icon: "ℹ️" });
      expect(screen.getByText(/Scanned Books: 0/)).toBeInTheDocument();
    });

    it("says when searched books stop earning points for the day", async () => {
      mocks.saveBookToDatabase.mockResolvedValue({
        added: true,
        award: { pointsAwarded: 0, total: 60, searchLimitReached: true },
      });
      await renderAtLibrary();

      await searchFor("controversial essays");
      await userEvent.click(await screen.findByRole("button", { name: /Controversial essays/ }));

      expect(mocks.toast.success).toHaveBeenCalledWith(SEARCH_LIMIT_REACHED);
      expect(screen.queryByText("Searched Book Points")).not.toBeInTheDocument();
    });

    it("keeps the results when saving fails, so the book can be tapped again", async () => {
      mocks.saveBookToDatabase.mockRejectedValue(new Error("Save book API failed with status: 502"));
      await renderAtLibrary();

      await searchFor("controversial essays");
      await userEvent.click(await screen.findByRole("button", { name: /Controversial essays/ }));

      expect(mocks.toast.error).toHaveBeenCalledWith("Error adding book");
      expect(screen.getByRole("button", { name: /Controversial essays/ })).toBeInTheDocument();
    });

    it("notes a search with no matches", async () => {
      mocks.searchCatalogs.mockResolvedValue([]);
      await renderAtLibrary();

      await searchFor("a book nobody has", "someone");

      expect(await screen.findByText(SEARCH_NO_RESULTS)).toBeInTheDocument();
      expect(mocks.reportLookupMiss).toHaveBeenCalledWith(
        { kind: "search", title: "a book nobody has", author: "someone" },
        "lib_1",
      );
    });

    it("notes a search where none of the matches was the book", async () => {
      await renderAtLibrary();

      await searchFor("controversial essays");
      await userEvent.click(await screen.findByRole("button", { name: "None of these" }));

      expect(screen.getByText(MISS_NOTED)).toBeInTheDocument();
      expect(mocks.reportLookupMiss).toHaveBeenCalledWith(
        { kind: "search", title: "controversial essays", author: "" },
        "lib_1",
      );
      expect(mocks.saveBookToDatabase).not.toHaveBeenCalled();
    });
  });
});
