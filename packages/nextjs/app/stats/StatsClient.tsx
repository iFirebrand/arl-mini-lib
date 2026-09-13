"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, Container, PageHeader } from "~~/components/ui/Page";
import { PLACEHOLDER_BOOK_COVER, safeImageSrc, safeLinkHref } from "~~/lib/media";

interface StatsClientProps {
  last50Books: {
    title: string;
    thumbnail: string;
    sourceURL: string;
    libraryId: string;
    libraryName: string;
    itemInfo: string;
  }[];
  totalBooks: number;
  totalLibraries: number;
  totalUsers: number;
  newLibrariesCount: number;
  topUsers: {
    id: string;
    displayName: string;
    points: number;
  }[];
  librariesWithDescriptionCount: number;
}

const Stat = ({
  label,
  value,
  note,
  href,
  className: extra = "",
}: {
  label: string;
  value: number;
  note: string;
  href?: string;
  className?: string;
}) => {
  const body = (
    <>
      <span className="text-sm font-medium text-base-content/70">{label}</span>
      <span className="font-display text-4xl font-semibold tabular-nums">{value}</span>
      <span className="text-xs text-base-content/60">{note}</span>
    </>
  );
  const className = `flex flex-col gap-1 rounded-box border border-base-300/70 bg-base-100 p-4 shadow-card sm:p-5 transition ${extra}`;
  return href ? (
    <Link href={href} className={`${className} hover:-translate-y-0.5`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
};

export default function StatsClient({
  last50Books,
  totalBooks,
  totalLibraries,
  totalUsers,
  topUsers,
  newLibrariesCount,
  librariesWithDescriptionCount,
}: StatsClientProps) {
  return (
    <Container className="pb-12">
      <PageHeader eyebrow="Across Arlington" title="Latest Stats">
        What the community has mapped and cataloged so far.
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
        <Stat label="Total Books" value={totalBooks} note="across all libraries" />
        <Stat label="Total Libraries" value={totalLibraries} note="on ArLib.me" />
        <Stat label="New Libraries" value={newLibrariesCount} note="in the last 7 days" />
        <Stat
          label="Libs with Character"
          value={librariesWithDescriptionCount}
          note="a catalog gives personality"
          href="/stats/personality"
        />
        {/* Spans the row on phones, so no tile sits alone. */}
        <Stat
          label="Readers With Points"
          value={totalUsers}
          note="Random names, no email"
          className="col-span-2 sm:col-span-1"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
        <Card className="p-5">
          <h2 className="text-xl font-semibold">Top 10 Readers</h2>
          <p className="mt-1 text-sm text-base-content/65">
            Everyone gets a random name. Save your points with a passkey to keep them on any device.
          </p>
          {topUsers.length === 0 ? (
            <p className="mt-4 text-base-content/70">No points earned yet.</p>
          ) : (
            <ol className="mt-4 flex flex-col">
              {topUsers.map((user, index) => (
                <li
                  key={user.id}
                  className="flex items-center gap-3 border-t border-base-300/70 py-2.5 first:border-t-0"
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums ${
                      index === 0 ? "bg-flag-yellow text-neutral" : "bg-base-200"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="flex-1 font-medium">{user.displayName}</span>
                  <span className="tabular-nums text-base-content/80">{user.points}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="text-xl font-semibold">Last 50 Books Added</h2>
          <ul className="mt-3 grid gap-x-6 sm:grid-cols-2">
            {last50Books.map((book, index) => (
              // The same book can be in several libraries, so the title alone isn't a unique key.
              <li
                key={`${index}-${book.libraryId}-${book.title}`}
                className="flex items-center gap-3 border-t border-base-300/70 py-2.5"
              >
                <a
                  href={safeLinkHref(book.itemInfo)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0"
                  tabIndex={-1}
                  aria-hidden="true"
                >
                  <Image
                    src={safeImageSrc(book.thumbnail, PLACEHOLDER_BOOK_COVER)}
                    alt={`Thumbnail of ${book.title}`}
                    width={40}
                    height={60}
                    className="h-[60px] w-10 rounded bg-base-300 object-cover"
                    onError={e => {
                      e.currentTarget.src = PLACEHOLDER_BOOK_COVER;
                    }}
                  />
                </a>
                <div className="min-w-0">
                  <a
                    href={safeLinkHref(book.itemInfo)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="line-clamp-2 font-medium leading-snug hover:underline"
                  >
                    {book.title}
                  </a>
                  <Link href={`/browse/${book.libraryId}`} className="text-sm text-link hover:underline">
                    {book.libraryName}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </Container>
  );
}
