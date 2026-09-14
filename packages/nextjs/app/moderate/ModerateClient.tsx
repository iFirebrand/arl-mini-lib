"use client";

import { useState } from "react";
import Link from "next/link";
import { HideButton } from "~~/components/moderation/HideButton";
import { Container } from "~~/components/ui/Page";
import type { ModerationQueue } from "~~/lib/moderation";

const formatDate = (date: Date) =>
  new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default function ModerateClient({ queue }: { queue: ModerationQueue }) {
  const [libraries, setLibraries] = useState(queue.libraries);
  const [books, setBooks] = useState(queue.books);

  return (
    <Container width="narrow" className="flex flex-col gap-10 py-8 sm:py-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Moderate</h1>
        <p className="opacity-70">
          New libraries and books appear on the site right away. Hide anything that shouldn&apos;t be there; hidden
          items stay in the database and can be brought back here.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Newest libraries</h2>
        <ul className="flex flex-col divide-y divide-base-300 bg-base-100 rounded-box">
          {libraries.map(library => (
            <li key={library.id} className={`flex items-center gap-3 p-3 ${library.hidden ? "opacity-60" : ""}`}>
              <div className="flex-1 min-w-0">
                <Link href={`/browse/${library.id}`} className="font-semibold hover:underline break-words">
                  {library.locationName}
                </Link>
                <div className="text-sm opacity-70">
                  {formatDate(library.createdAt)}
                  {library.hidden && " · hidden"}
                </div>
              </div>
              <HideButton
                target="library"
                id={library.id}
                hidden={library.hidden}
                onChange={hidden =>
                  setLibraries(current =>
                    current.map(other => (other.id === library.id ? { ...other, hidden } : other)),
                  )
                }
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Newest books</h2>
        <ul className="flex flex-col divide-y divide-base-300 bg-base-100 rounded-box">
          {books.map(book => (
            <li key={book.id} className={`flex items-center gap-3 p-3 ${book.hidden ? "opacity-60" : ""}`}>
              <div className="flex-1 min-w-0">
                <div className="font-semibold break-words">{book.title || "Untitled"}</div>
                <div className="text-sm opacity-70">
                  <Link href={`/browse/${book.libraryId}`} className="hover:underline">
                    {book.libraryName}
                  </Link>{" "}
                  · {formatDate(book.createdAt)}
                  {book.addedBySearch && " · added by title search"}
                  {book.hidden && " · hidden"}
                </div>
              </div>
              <HideButton
                target="item"
                id={book.id}
                hidden={book.hidden}
                onChange={hidden =>
                  setBooks(current => current.map(other => (other.id === book.id ? { ...other, hidden } : other)))
                }
              />
            </li>
          ))}
        </ul>
      </section>
    </Container>
  );
}
