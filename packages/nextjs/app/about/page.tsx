import React from "react";
import Link from "next/link";
import { VideoCard } from "~~/components/VideoCard";
import { Container } from "~~/components/ui/Page";

export const metadata = {
  title: "About",
  description: "Why ArLib.me maps and catalogs Arlington's mini libraries, how points work, and how to help.",
};

const SECTIONS = [
  { id: "map-and-catalog", title: "Map the libraries" },
  { id: "catalog-books", title: "Catalog the books" },
  { id: "earn-points", title: "Earn points" },
  { id: "browse-books", title: "Browse books from home" },
  { id: "accounts", title: "Accounts and points" },
  { id: "sponsor-quest", title: "Make this happen" },
  { id: "epilogue", title: "Epilogue" },
];

const Section = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
  <section id={id} className="scroll-mt-24 border-t border-base-300/70 pt-8">
    <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
    <div className="mt-3 flex flex-col gap-4 text-lg leading-relaxed text-base-content/85">{children}</div>
  </section>
);

const list = "flex list-decimal flex-col gap-2 pl-6 marker:font-semibold marker:text-base-content/60";

export default function AboutPage() {
  return (
    <Container className="pb-16">
      <div className="grid gap-10 py-8 sm:py-12 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16">
        <nav aria-label="On this page" className="hidden lg:block">
          <ul className="sticky top-24 flex flex-col gap-2 text-sm">
            {SECTIONS.map(section => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="text-base-content/70 hover:text-base-content">
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <article className="flex max-w-2xl flex-col gap-8">
          <header id="intro" className="flex flex-col gap-4">
            <p className="text-sm font-semibold uppercase tracking-wider text-link">About</p>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">About ArLib.me</h1>
            <p className="text-xl leading-relaxed text-base-content/85">
              ArLib.me is a public goods community project to map and catalog Arlington&apos;s mini libraries. Mini
              libraries are more than book collections—they&apos;re neighborhood gems of creativity and connection.
              ArLib puts these spaces on the map and in your pocket, making it easy to explore, share, and discover
              books nearby. Each cataloged book links to its openlibrary.org page, helping you decide your next great
              read.
            </p>
            <p className="text-lg">
              <a
                href="https://www.arlnow.com/2025/01/08/new-arlington-mini-libraries-map-uses-community-help-to-locate-free-books/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-link underline"
              >
                Read the article about the project on ARLnow
              </a>
            </p>
            <VideoCard className="lg:hidden" />
          </header>

          <Section id="map-and-catalog" title="Map the libraries">
            <p>
              It&apos;s simple and fun. Use your phone to <strong>add a library</strong> and earn <strong>50</strong>{" "}
              points:
            </p>
            <ol className={list}>
              <li>You must be at the library. This is an IRL experience.</li>
              <li>Snap a pic of the library and name it to place it on the map.</li>
            </ol>
          </Section>

          <Section id="catalog-books" title="Catalog the books">
            <p>Scan the barcodes on books to catalog them.</p>
            <ol className={list}>
              <li>Scan the barcode on the back of the book with your phone.</li>
              <li>Best in daylight. ISBN 13 barcodes to start.</li>
            </ol>
            <p>Over time the catalog can get stale. A 5 minute re-scan of the books will keep it up to date.</p>
          </Section>

          <Section id="earn-points" title="Earn points">
            <p>
              Earn points for discovering libraries and scanning books. Get on top of the leaderboards. Rewards in the
              future?
            </p>
            <ol className={list}>
              <li>
                Never before scanned books earn <strong>5</strong> points.
              </li>
              <li>Rescans of books in the catalog earn points based on freshness.</li>
              <li>
                Point <strong>multipliers</strong> kick in after a <strong>streak</strong> of scans.
              </li>
            </ol>
          </Section>

          <Section id="browse-books" title="Browse books from home">
            <p>
              Looking for a good book but don&apos;t feel like trekking to a mini library? Need something for your book
              club or just curious about what others nearby are reading? Find a library on the{" "}
              <Link href="/browse" className="text-link underline">
                map
              </Link>{" "}
              and browse its collection—quick and simple. Spotted a book but not sure if it&apos;s worth your time? Look
              it up later and decide.
            </p>
          </Section>

          <Section id="accounts" title="Accounts and points">
            <p>
              You start earning points the moment you add a library or a book—no sign-up. Your points belong to an
              anonymous account with a random name like &ldquo;Reader K7Q2M&rdquo;. To keep them if you clear your
              browser or switch devices, tap <strong>Save with passkey</strong>: your phone or password manager creates
              a passkey, secured by Face ID, Touch ID or your device PIN, and you can sign in with it anywhere. You can
              also tap <strong>Create account</strong> before earning anything.
            </p>
            <p>
              The site stores no email, name or password—only your random name, your points and the passkey&apos;s
              public key. Leaderboards show random names only. If rewards are introduced in the future, points will
              determine eligibility, and you will be able to link a wallet to your account then. Points earned with a
              wallet before accounts existed are kept and can be claimed by that wallet at that point.{" "}
              <Link href="/account" className="text-link underline">
                Your account
              </Link>{" "}
              has the details.
            </p>
          </Section>

          <Section id="sponsor-quest" title="Make this happen">
            <p>
              <strong>Quests</strong> are how Arlington&apos;s libraries stay on the map and their catalogs stay fresh.
              A few ideas:
            </p>
            <ul className="flex list-disc flex-col gap-2 pl-6 marker:text-base-content/60">
              <li>Hide a small reward in a few libraries for whoever catalogs them next.</li>
              <li>
                Walks with a purpose: a route that takes you and a friend on a healthy walk to the libraries whose books
                need refreshing.
              </li>
            </ul>
            <p>
              Got an idea for a quest, or want to sponsor one? Email{" "}
              <a href="mailto:ArlingtonAndUkraine+arlib@gmail.com" className="break-all text-link underline">
                ArlingtonAndUkraine+arlib@gmail.com
              </a>
              .
            </p>
          </Section>

          <Section id="epilogue" title="Epilogue">
            <p>
              Every library and book you add becomes part of a growing, mapped network that anyone can explore.
              It&apos;s a community-driven way to make books more accessible while celebrating the stories in our
              neighborhoods.
            </p>
          </Section>

          <p
            id="ukraine"
            className="flex items-center gap-3 rounded-box bg-base-100 p-5 text-lg font-medium shadow-card"
          >
            <span role="img" aria-label="Ukraine and United States flags" className="text-2xl">
              🇺🇦 🇺🇸
            </span>
            Victory for Ukraine is a victory for all of us.
          </p>
        </article>
      </div>
    </Container>
  );
}
