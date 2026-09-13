import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon, ChartBarIcon, InformationCircleIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { totalBookCount, totalLibraryCount } from "~~/actions/actions";
import { GeolocationButton } from "~~/components/GeolocationButton";
import { VideoCard } from "~~/components/VideoCard";
import { Container } from "~~/components/ui/Page";
import prisma from "~~/lib/db";
import { PLACEHOLDER_LIBRARY_IMAGE, safeImageSrc } from "~~/lib/media";

// Live counts and the newest libraries, so the page reflects what people just added.
export const dynamic = "force-dynamic";

async function loadHome() {
  try {
    const [libraries, books, recent] = await Promise.all([
      totalLibraryCount(),
      totalBookCount(),
      prisma.library.findMany({
        where: { active: true, imageUrl: { not: null } },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { id: true, locationName: true, imageUrl: true },
      }),
    ]);
    return { libraries, books, recent };
  } catch (error) {
    // The home page still works without the numbers.
    console.error("Error loading home page data:", error);
    return null;
  }
}

const STEPS = [
  {
    title: "Find a library",
    text: "Spot one on your walk, or look it up on the map before you head out.",
    points: null,
  },
  {
    title: "Put it on the map",
    text: "Standing at a library nobody has added yet? Tap “I'm at a library”, snap a photo and give it a name.",
    points: "+50 points",
  },
  {
    title: "Catalog its books",
    text: "Scan the barcode on the back of each book, so neighbors can browse the shelf from home.",
    points: "+5 per new book",
  },
];

const EXPLORE = [
  {
    href: "/stats/personality",
    icon: SparklesIcon,
    title: "Libraries with character",
    text: "A few cataloged books give a library its own personality.",
  },
  {
    href: "/stats",
    icon: ChartBarIcon,
    title: "Stats and top readers",
    text: "What's been added lately, and who's adding it.",
  },
  {
    href: "/about",
    icon: InformationCircleIcon,
    title: "About the project",
    text: "Why ArLib exists, how points work, and how to help.",
  },
];

export default async function Home() {
  const data = await loadHome();

  return (
    <>
      <section>
        <Container className="grid items-center gap-8 py-10 sm:py-14 lg:grid-cols-[1.3fr_1fr] lg:gap-12 lg:py-20">
          <div className="flex flex-col gap-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-link">Arlington, Virginia</p>
            <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Arlington Mini Libraries
            </h1>
            <p className="max-w-xl text-lg text-base-content/80 sm:text-xl">
              Little free libraries are all over Arlington. Find them on the map, see what&apos;s on their shelves
              before you walk over, and add the ones you discover. Every library and book you add earns points.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <GeolocationButton className="btn-lg" />
              <Link href="/browse" className="btn btn-lg btn-primary rounded-full px-6">
                Browse the map
              </Link>
            </div>
            <p className="text-sm text-base-content/65">
              “I&apos;m at a library” uses your phone&apos;s location to find the library you&apos;re standing at, or to
              add it.
            </p>
            {data && (
              <dl className="flex gap-8 border-t border-base-300 pt-5">
                <div>
                  <dt className="text-sm text-base-content/70">Libraries mapped</dt>
                  <dd className="font-display text-3xl font-semibold tabular-nums">{data.libraries}</dd>
                </div>
                <div>
                  <dt className="text-sm text-base-content/70">Books cataloged</dt>
                  <dd className="font-display text-3xl font-semibold tabular-nums">{data.books}</dd>
                </div>
              </dl>
            )}
          </div>
          <VideoCard />
        </Container>
      </section>

      <section className="border-y border-base-300/70 bg-base-100">
        <Container className="py-12 sm:py-16">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">How it works</h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex flex-col gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary font-display text-lg font-semibold text-secondary-content">
                  {index + 1}
                </span>
                <h3 className="text-lg font-semibold">{step.title}</h3>
                <p className="text-base-content/75">{step.text}</p>
                {step.points && (
                  <span className="w-fit rounded-full bg-flag-yellow/60 px-2.5 py-0.5 text-sm font-semibold text-neutral">
                    {step.points}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {data && data.recent.length > 0 && (
        <section>
          <Container className="py-12 sm:py-16">
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Recently added</h2>
              <Link href="/browse" className="flex items-center gap-1 font-medium text-link hover:underline">
                All {data.libraries} libraries <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {data.recent.map(library => (
                <li key={library.id}>
                  <Link href={`/browse/${library.id}`} className="group flex flex-col gap-2">
                    <span className="block overflow-hidden rounded-box bg-base-300">
                      <Image
                        src={safeImageSrc(library.imageUrl, PLACEHOLDER_LIBRARY_IMAGE)}
                        alt={`${library.locationName} library`}
                        width={400}
                        height={300}
                        sizes="(min-width: 1024px) 270px, (min-width: 640px) 33vw, 50vw"
                        className="aspect-[4/3] h-auto w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                      />
                    </span>
                    <span className="line-clamp-2 font-medium group-hover:underline">{library.locationName}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}

      <section className="pb-4">
        <Container className="pb-12 sm:pb-16">
          <ul className="grid gap-4 sm:grid-cols-3">
            {EXPLORE.map(({ href, icon: Icon, title, text }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="flex h-full flex-col gap-2 rounded-box border border-base-300/70 bg-base-100 p-5 shadow-card transition hover:-translate-y-0.5"
                >
                  <Icon className="h-6 w-6 text-link" aria-hidden="true" />
                  <span className="font-display text-lg font-semibold">{title}</span>
                  <span className="text-base-content/75">{text}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>
    </>
  );
}
