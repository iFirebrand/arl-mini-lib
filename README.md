# ArLib.me

[ArLib.me](https://arlib.me) maps and catalogs the little free libraries of Arlington, Virginia.
Anyone can add a library (a photo and its GPS location) and scan the barcodes of the books inside
to catalog them, earning points along the way. No email or password: accounts are anonymous
("Reader K7Q2M") and can be saved with a passkey.

## Stack

- Next.js 16 (App Router, Turbopack) and React 19, hosted on Vercel
- Tailwind CSS 3 and daisyUI 4
- PostgreSQL 17 on Supabase, through Prisma 6; photos in Supabase Storage
- Book lookups: OpenLibrary, then Google Books
- Barcode scanning: [`barcode-detector`](https://github.com/Sec-ant/barcode-detector) (the browser's
  own reader where there is one, ZXing WebAssembly elsewhere, including iPhones)
- Passkeys: SimpleWebAuthn
- Tests: Vitest (unit and integration) and Playwright (browser)

## Repository layout

The app is in `packages/nextjs`; the repository root only holds the Yarn workspace and CI.

| Path | What's there |
| --- | --- |
| `app/` | Pages and API routes (`app/api/*`: book lookup, saving books, photo upload, passkeys) |
| `actions/` | Server actions (libraries, points, moderation) |
| `lib/` | Server code: database, sessions, passkeys, book lookup, ISBN checks, rate limits |
| `components/` | UI; `components/ui/Page.tsx` holds the page layout pieces |
| `prisma/schema.prisma` | Database schema |
| `prisma/sql/` | Reviewed SQL for production: schema changes and `app-role.sql` (database permissions) |
| `scripts/` | Build helpers: copying the ZXing WebAssembly file, checking browser bundles for secrets |
| `test/`, `e2e/` | Unit and integration tests; Playwright smoke and flow tests |

## Getting started

You need Node 22 (20.9 or later works), Docker (for the test database) and Yarn 4, which Corepack
provides:

```sh
corepack enable
yarn install
cd packages/nextjs
```

### Run the site against a local database (recommended)

This uses the same throwaway Postgres as the integration tests, so nothing you click touches real
data.

```sh
yarn test:db:up        # starts Postgres in Docker on port 54329
yarn test:integration  # creates the tables and the app's database role (and runs the tests)

DATABASE_URL=postgresql://arlib_app:arlib_app_test_only@localhost:54329/arlib_test \
DIRECT_URL=postgresql://arlib:arlib@localhost:54329/arlib_test \
NEXT_PUBLIC_SUPABASE_URL=http://supabase.test \
yarn dev
```

Open <http://localhost:3000>. The database starts empty, and the integration tests empty it again
each time they run. Everything works except adding a library, which needs photo storage
(`SUPABASE_SECRET_KEY`); book lookups use OpenLibrary alone unless `GOOGLE_BOOKS_API_KEY` is set.
`yarn test:db:down` stops the database.

### Run the site against production data

`vercel env pull` writes the Vercel project's development variables to `packages/nextjs/.env.local`,
and `yarn dev` then reads them. **That `DATABASE_URL` is the production database.** Use it only to
look at pages or run the read-only smoke tests; don't add libraries, scan books or sign in, because
those write real data. Keep `.env.local` out of Git (it already is) and don't share it.

### Environment variables

| Variable | Needed for | Notes |
| --- | --- | --- |
| `DATABASE_URL` | everything | Postgres connection for the running site. In production it signs in as `arlib_app` (see below). |
| `DIRECT_URL` | Prisma commands | Owner connection used by `prisma db push`/`migrate`; not needed by the running site. |
| `NEXT_PUBLIC_SUPABASE_URL` | photos | Supabase project URL. Photos must come from its `library-images` bucket. |
| `SUPABASE_SECRET_KEY` | adding a library | Server-only key for photo uploads. Never give it a `NEXT_PUBLIC_` prefix. |
| `SESSION_SECRET` | sign-in (production) | At least 32 characters; signs the session cookie. Development uses a built-in value. |
| `GOOGLE_BOOKS_API_KEY` | book lookup | Optional. Books OpenLibrary doesn't know are looked up in Google Books. Server-only. |
| `NEXT_PUBLIC_APP_URL` | production | The site's public URL, allowed as an origin for passkeys and form posts. |
| `WEBAUTHN_RP_ID` | passkeys | Optional. Defaults to `arlib.me` in production and `localhost` in development. |

`yarn build` fails if any server-only secret shows up in the JavaScript sent to browsers.

## Tests

All commands run from `packages/nextjs`.

| Command | What it does | Database |
| --- | --- | --- |
| `yarn test` | Unit tests (Vitest, jsdom) | none |
| `yarn test:integration` | Server actions and API routes against real Postgres, signed in as `arlib_app`, the same least-privilege role as production | local test database (`yarn test:db:up` first) |
| `yarn test:e2e` | Read-only smoke tests in Chrome, desktop and phone sizes. Starts `yarn dev` unless `E2E_BASE_URL` is set | whatever the server uses |
| `yarn test:e2e:flows` | Passkey sign-up and sign-in, and real barcode scanning through Chrome's fake camera. Starts its own server | local test database only |
| `yarn check-types`, `yarn lint` | TypeScript and ESLint | none |

The first Playwright run needs a browser: `npx playwright install chromium`.

Smoke-test production (read-only, safe):

```sh
E2E_BASE_URL=https://www.arlib.me yarn test:e2e
```

The integration and flow tests refuse to run against anything but `localhost`, because they wipe
tables.

## Continuous integration and monitoring

- **Every pull request** (`.github/workflows/test.yaml`): type check, lint, unit tests,
  integration tests, a production build with the secret scan, and the flow tests, against a
  Postgres service container.
- **Every hour** (`.github/workflows/production-watch.yml`): the smoke tests run against
  www.arlib.me. A failure opens an issue labeled `production-alert`; the next passing run closes it.
- **In production**: Vercel Web Analytics and Speed Insights alongside Google Analytics. Automated
  browsers (`navigator.webdriver`) are left out of all three.

## Deploying

Vercel deploys `main` to production automatically (project root `packages/nextjs`, Node 22). The
build runs `prisma generate`, copies the ZXing WebAssembly file into `public/zxing/<version>/`, builds
Next.js and scans the browser bundles for secrets. Environment variables live in the Vercel project
settings.

The workflow: open a pull request, wait for CI, squash-merge, then check production with the smoke
tests above and Vercel's runtime logs. The Hobby plan builds no previews of branches, so for UI
changes attach before/after screenshots to the pull request.

## Content Security Policy

`proxy.ts` gives every page a fresh nonce and the policy in `lib/csp.ts`: only scripts carrying
the nonce run (plus what they load), and images, connections and frames may come only from the
hosts listed there, each with the reason it's needed. It is **report-only** for now: browsers
report what it would block without blocking it. Reports arrive at `/api/csp-report` and show up
in Vercel's runtime logs as `CSP violation: <rule> blocked <what> on <page>`. The hourly smoke
tests fail on any violation too.

- Adding a third-party service (a new image host, script or embed): add its host to `lib/csp.ts`
  (and to `lib/imageHosts.json` for images) in the same pull request.
- Enforcing it: once the logs stay clean, rename the header in `proxy.ts` to
  `Content-Security-Policy`.

## Database

The running site connects as `arlib_app`, a role that can only do what the code does
(`prisma/sql/app-role.sql`): read what the site shows, add libraries, books, accounts, passkeys and
point history, and update a few specific columns (a library's visibility, a book's last-confirmed
time and visibility, point totals, a passkey's counter, last use, name and removal). It can't delete
anything, change the schema, or make anyone a moderator; a removed passkey is kept with the time it
was removed and no longer signs in. The `postgres` owner role is only for schema changes and admin work.

Changing the schema:

1. Edit `prisma/schema.prisma`.
2. Generate the SQL with `prisma migrate diff` (from the old schema to the new one) and save it as
   `prisma/sql/<date>-<name>.sql`. Keep it additive where possible, so the code already deployed
   keeps working.
3. Update `prisma/sql/app-role.sql`: grants and row-level security for new tables and columns. The
   integration tests apply it, so they show what the app can and can't do.
4. After review, run the SQL file on production as the owner, then re-run `app-role.sql`.

Books no catalog could find (an ISBN neither OpenLibrary nor Google Books knew, or a title search
that ended without a match) go into `LookupMiss`. The app can add rows but not read them; as the
owner:

```sql
select kind, query, count(*) from "LookupMiss" group by kind, query order by count(*) desc;
```

Moderators are added by the owner, by the account's pseudonym (shown next to the points in the
header):

```sql
insert into "Moderator" ("accountId")
select id from "Account" where "displayName" = 'Reader XXXXX';
```

## Contributing

Issues and pull requests are welcome. Keep each pull request to one change, with tests, and run the
tests above before opening it. Please report security problems by email to
[ArlingtonAndUkraine+arlib@gmail.com](mailto:ArlingtonAndUkraine+arlib@gmail.com) rather than in a
public issue.

## License

MIT. See [LICENCE](LICENCE). The project started from [Scaffold-ETH 2](https://scaffoldeth.io/).
