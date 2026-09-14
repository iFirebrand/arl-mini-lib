"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useAccountContext } from "~~/app/contexts/AccountContext";
import { HideButton } from "~~/components/moderation/HideButton";
import { PLACEHOLDER_BOOK_COVER, safeImageSrc, safeLinkHref } from "~~/lib/media";

type Item = { id: string; title: string; coverUrl: string; itemInfo: string; updatedAt: Date };

// OpenLibrary's "no cover" image.
const MISSING_COVER = "https://covers.openlibrary.org/b/id/-1-M.jpg";

const seen = (date: Date) =>
  new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

// The library's books as a grid of covers. Moderators get a Hide button on each.
export default function ViewItems({ initialItems }: { initialItems: Item[] }) {
  const [items, setItems] = useState(initialItems);
  const { account } = useAccountContext();

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-box border-2 border-dashed border-base-300 px-6 py-12 text-center">
        <p className="font-display text-xl font-semibold">No books cataloged yet</p>
        <p className="max-w-sm text-base-content/70">
          Next time you pass by, scan a few books: each new one earns 5 points and helps neighbors see what&apos;s here.
        </p>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-4 xl:grid-cols-5">
      {items.map(item => (
        <li key={item.id} className="flex flex-col gap-2">
          <a
            href={safeLinkHref(item.itemInfo)}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col gap-2"
          >
            <span className="block overflow-hidden rounded-lg bg-base-300 shadow-card">
              <Image
                src={
                  item.coverUrl !== MISSING_COVER
                    ? safeImageSrc(item.coverUrl, PLACEHOLDER_BOOK_COVER)
                    : PLACEHOLDER_BOOK_COVER
                }
                alt={item.title}
                width={180}
                height={270}
                sizes="(min-width: 1280px) 150px, (min-width: 640px) 22vw, 30vw"
                className="aspect-2/3 h-auto w-full object-cover transition duration-300 group-hover:scale-[1.03]"
              />
            </span>
            <span className="line-clamp-2 text-sm font-medium leading-snug group-hover:underline">{item.title}</span>
          </a>
          <span className="text-xs text-base-content/60">Seen {seen(item.updatedAt)}</span>
          {account?.isModerator && (
            <HideButton
              target="item"
              id={item.id}
              hidden={false}
              className="w-fit"
              onChange={() => setItems(current => current.filter(other => other.id !== item.id))}
            />
          )}
        </li>
      ))}
    </ul>
  );
}
