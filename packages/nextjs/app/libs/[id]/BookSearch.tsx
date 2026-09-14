"use client";

import React, { useState } from "react";
import Image from "next/image";
import { searchCatalogs } from "./bookSearchClient";
import { ChevronDownIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import type { SearchResult } from "~~/lib/bookSearch";
import { PLACEHOLDER_BOOK_COVER, safeImageSrc } from "~~/lib/media";

// Match SEARCHED_BOOK_POINTS and SEARCHED_BOOKS_PER_LIBRARY_PER_DAY on the server.
export const SEARCHED_BOOK_POINTS = 2;
export const SEARCHED_BOOKS_PER_LIBRARY_PER_DAY = 10;

export const SEARCH_NO_RESULTS =
  "No matches in OpenLibrary or Google Books. Check the spelling, or try the title without the author.";
export const SEARCH_FAILED = "The book catalogs didn't answer. Try again in a moment.";
export const MISS_NOTED = "Thanks, we've noted this one so we can look for a better catalog. Skip it for now.";

type Query = { title: string; author: string };
type Status = "idle" | "searching" | "done" | "error" | "noted";

interface BookSearchProps {
  // Resolves true once the book is saved (or was already in the catalog).
  onPick: (book: SearchResult) => Promise<boolean>;
  onNoMatch: (query: Query) => void;
  isLoading: boolean;
}

// For books without a barcode or ISBN: find the book by title and author, then tap the one in hand.
export default function BookSearch({ onPick, onNoMatch, isLoading }: BookSearchProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState<Query>({ title: "", author: "" });

  const search = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = { title: title.trim(), author: author.trim() };
    if (query.title.length < 2) return;
    setStatus("searching");
    setResults([]);
    try {
      const found = await searchCatalogs(query.title, query.author);
      setResults(found);
      setSearched(query);
      setStatus("done");
      if (found.length === 0) onNoMatch(query);
    } catch {
      setStatus("error");
    }
  };

  const pick = async (book: SearchResult) => {
    if (!(await onPick(book))) return;
    // Ready for the next book.
    setResults([]);
    setStatus("idle");
    setTitle("");
    setAuthor("");
  };

  const noneOfThese = () => {
    onNoMatch(searched);
    setResults([]);
    setStatus("noted");
  };

  return (
    <section className="rounded-box border border-base-300/70 bg-base-100 shadow-card">
      <button
        type="button"
        className="flex w-full items-center gap-2 p-4 text-left font-medium"
        aria-expanded={open}
        aria-controls="book-search"
        onClick={() => setOpen(value => !value)}
      >
        <MagnifyingGlassIcon className="h-5 w-5 shrink-0 text-link" aria-hidden="true" />
        <span className="flex-1">No ISBN anywhere? Search by title</span>
        <ChevronDownIcon className={`h-5 w-5 shrink-0 transition ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open && (
        <div id="book-search" className="flex flex-col gap-4 px-4 pb-4">
          <form onSubmit={search} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end" noValidate>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Title
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                maxLength={120}
                autoComplete="off"
                enterKeyHint="search"
                className="input input-bordered rounded-full bg-base-100 font-normal"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              <span>
                Author <span className="font-normal text-base-content/60">(optional)</span>
              </span>
              <input
                value={author}
                onChange={e => setAuthor(e.target.value)}
                maxLength={100}
                autoComplete="off"
                enterKeyHint="search"
                className="input input-bordered rounded-full bg-base-100 font-normal"
              />
            </label>
            <button
              type="submit"
              className="btn btn-primary rounded-full"
              disabled={status === "searching" || title.trim().length < 2}
            >
              {status === "searching" && <span className="loading loading-spinner loading-xs" aria-hidden="true" />}
              Search
            </button>
          </form>

          {status === "searching" && (
            <p role="status" className="text-sm text-base-content/70">
              Searching OpenLibrary and Google Books…
            </p>
          )}
          {status === "error" && (
            <p role="status" className="rounded-xl border border-warning bg-warning/15 px-4 py-3 text-sm">
              {SEARCH_FAILED}
            </p>
          )}
          {status === "done" && results.length === 0 && (
            <p role="status" className="rounded-xl border border-warning bg-warning/15 px-4 py-3 text-sm">
              {SEARCH_NO_RESULTS}
            </p>
          )}
          {status === "noted" && (
            <p role="status" className="rounded-xl bg-base-200 px-4 py-3 text-sm">
              {MISS_NOTED}
            </p>
          )}

          {status === "done" && results.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Tap the book in your hand</p>
              <ul className="flex flex-col divide-y divide-base-300/70 rounded-xl border border-base-300/70">
                {results.map(book => (
                  <li key={book.isbn13 ?? book.editionKey}>
                    <button
                      type="button"
                      onClick={() => pick(book)}
                      disabled={isLoading}
                      className="flex w-full items-center gap-3 p-3 text-left transition hover:bg-base-200 disabled:opacity-60"
                    >
                      <Image
                        src={safeImageSrc(book.thumbnail, PLACEHOLDER_BOOK_COVER)}
                        alt=""
                        width={48}
                        height={72}
                        // Small and mostly seen once; not worth the image optimizer's quota.
                        unoptimized
                        className="h-[72px] w-12 shrink-0 rounded bg-base-300 object-cover"
                      />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="font-semibold leading-snug">{book.title}</span>
                        <span className="text-sm text-base-content/70">
                          {[book.authors, book.year].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold text-link">Add</span>
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" className="btn btn-ghost btn-sm self-start rounded-full" onClick={noneOfThese}>
                None of these
              </button>
            </div>
          )}

          <p className="text-xs text-base-content/60">
            Books found by search earn {SEARCHED_BOOK_POINTS} points each, for up to{" "}
            {SEARCHED_BOOKS_PER_LIBRARY_PER_DAY} books per library a day. Scanning a barcode earns more.
          </p>
        </div>
      )}
    </section>
  );
}
