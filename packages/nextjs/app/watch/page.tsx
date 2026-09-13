import Link from "next/link";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { GeolocationButton } from "~~/components/GeolocationButton";
import { Container } from "~~/components/ui/Page";

export const metadata = {
  title: "How it works",
  description: "A one-minute video: adding a mini library to the map and scanning its books.",
};

const VIDEO_ID = "EH-OhAvPn_g";

// The video was recorded on a phone in portrait, so it plays in a tall frame, not a wide one.
export default function WatchPage() {
  return (
    <Container className="grid gap-8 py-8 sm:py-12 lg:grid-cols-[auto_1fr] lg:items-center lg:gap-16">
      <div className="mx-auto w-full max-w-[min(100%,calc((100dvh-10rem)*9/16),420px)] lg:mx-0 lg:w-[380px]">
        <div className="overflow-hidden rounded-[1.75rem] bg-neutral shadow-card ring-8 ring-neutral">
          <iframe
            className="aspect-[9/16] h-auto w-full"
            src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}?rel=0&playsinline=1`}
            title="ArLib.me library onboarding"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      </div>

      <div className="flex max-w-xl flex-col gap-5">
        <p className="text-sm font-semibold uppercase tracking-wider text-link">How it works</p>
        <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          Adding a library and scanning its books
        </h1>
        <p className="text-lg text-base-content/80">
          A one-minute walkthrough recorded at a real Arlington library: checking in with your phone&apos;s location,
          then scanning book barcodes to put the shelf online.
        </p>
        <p className="rounded-xl border border-base-300/70 bg-base-100 px-4 py-3 text-sm text-base-content/75">
          This video was recorded on the previous version of the site, so the screens look different today. The steps
          are the same.
        </p>
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-base-content/85 marker:font-semibold">
          <li>At the library, tap “I&apos;m at a library”.</li>
          <li>New library? Add a photo and a name: 50 points.</li>
          <li>Scan the barcode on the back of each book: 5 points for each new one.</li>
        </ol>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <GeolocationButton />
          <a
            href={`https://www.youtube.com/shorts/${VIDEO_ID}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost rounded-full"
          >
            Watch on YouTube
            <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
        <p className="text-sm text-base-content/65">
          More about the project on the{" "}
          <Link href="/about" className="text-link underline">
            About page
          </Link>
          .
        </p>
      </div>
    </Container>
  );
}
