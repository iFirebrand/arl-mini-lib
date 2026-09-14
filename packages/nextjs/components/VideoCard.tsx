import Image from "next/image";
import Link from "next/link";
import { PlayIcon } from "@heroicons/react/24/solid";

// The onboarding video is a portrait phone recording, so it gets its own page (/watch) where it
// can play large. This card links there: a compact row on phones, a phone-shaped poster on desktop.
export const VideoCard = ({ className = "" }: { className?: string }) => (
  <Link
    href="/watch"
    className={`group flex items-center gap-4 rounded-box border border-base-300/70 bg-base-100 p-3 shadow-card transition hover:-translate-y-0.5 lg:flex-col lg:items-stretch lg:gap-3 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none ${className}`}
  >
    <span className="relative block w-20 shrink-0 overflow-hidden rounded-xl bg-neutral shadow-card ring-1 ring-base-300 sm:w-24 lg:mx-auto lg:w-64 lg:rounded-4xl lg:ring-8 lg:ring-neutral">
      <Image
        src="/images/onboarding-video.jpg"
        alt=""
        width={332}
        height={720}
        className="aspect-332/720 h-auto w-full object-cover"
        sizes="(min-width: 1024px) 256px, 96px"
      />
      <span className="absolute inset-0 flex items-center justify-center bg-neutral/10 transition group-hover:bg-neutral/20">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-base-100/95 text-neutral shadow-card lg:h-14 lg:w-14">
          <PlayIcon className="ml-0.5 h-5 w-5 lg:h-7 lg:w-7" aria-hidden="true" />
        </span>
      </span>
    </span>
    <span className="flex flex-col gap-0.5 lg:items-center lg:text-center">
      <span className="font-semibold">Watch how it works</span>
      <span className="text-sm text-base-content/70">Adding a library and scanning books, in one minute</span>
    </span>
  </Link>
);
