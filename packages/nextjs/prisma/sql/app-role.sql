-- Least-privilege database access for arlib.me.
--
-- The app (Prisma at runtime) connects as arlib_app, which can only do what the code does:
-- read everything it shows, add libraries/books/accounts/passkeys/point history/moderation log
-- entries and a log of books no catalog found (which it can't read back), and update book "last
-- confirmed" times, point totals, passkey counters and the hidden/visible flags moderators set.
-- No DELETE, TRUNCATE or schema changes, and it can't make anyone a moderator. The postgres role is
-- kept for migrations (DIRECT_URL) and never used by the running site.
--
-- Safe to re-run. The role's password is set separately and never stored in the repo:
--   alter role arlib_app with password '<generated>';

-- 1. The runtime role.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'arlib_app') then
    create role arlib_app with login noinherit;
  end if;
end
$$;

grant usage on schema public to arlib_app;
revoke all on all tables in schema public from arlib_app;

-- INSERT ... RETURNING (every Prisma create) needs SELECT on the returned columns too.
-- Updates are limited to the columns the app changes: a library's visibility, and a book's
-- "last confirmed" time and visibility. Revoking table privileges above also revokes these.
grant select, insert         on "Library"       to arlib_app;
grant update ("active")      on "Library"       to arlib_app;
grant select, insert         on "Item"          to arlib_app;
grant update ("updatedAt", "hidden") on "Item"  to arlib_app;
grant select, insert, update on "User"          to arlib_app;
grant select                 on "Poll"          to arlib_app;
grant select                 on "ArlibSettings" to arlib_app;
grant select, insert, update on "Account"       to arlib_app;
grant select, insert, update on "Passkey"       to arlib_app;
-- Update moves a player's history when an anonymous account is merged into a passkey account.
grant select, insert, update on "PointEvent"    to arlib_app;
-- Moderators are added only by the database owner; the app just checks the list.
grant select                 on "Moderator"       to arlib_app;
grant select, insert         on "ModerationEvent" to arlib_app;
-- Books no catalog could find. The app only adds them (createMany, so no RETURNING); the owner reads them.
grant insert                 on "LookupMiss"      to arlib_app;

-- Row-level security on every app table (Prisma creates new tables with it off), and arlib_app
-- gets exactly the matching policies.
alter table "Library" enable row level security;
alter table "Item" enable row level security;
alter table "User" enable row level security;
alter table "Poll" enable row level security;
alter table "ArlibSettings" enable row level security;
alter table "_LibraryCurators" enable row level security;
alter table "Account" enable row level security;
alter table "Passkey" enable row level security;
alter table "PointEvent" enable row level security;
alter table "Moderator" enable row level security;
alter table "ModerationEvent" enable row level security;
alter table "LookupMiss" enable row level security;

-- The rewards-pool poll was removed from the site; votes stay, but nothing adds new ones.
drop policy if exists "arlib_app insert" on "Poll";

do $$
declare
  rule record;
begin
  for rule in
    select * from (values
      ('Library', 'select'), ('Library', 'insert'), ('Library', 'update'),
      ('Item', 'select'), ('Item', 'insert'), ('Item', 'update'),
      ('User', 'select'), ('User', 'insert'), ('User', 'update'),
      ('Poll', 'select'),
      ('ArlibSettings', 'select'),
      ('Account', 'select'), ('Account', 'insert'), ('Account', 'update'),
      ('Passkey', 'select'), ('Passkey', 'insert'), ('Passkey', 'update'),
      ('PointEvent', 'select'), ('PointEvent', 'insert'), ('PointEvent', 'update'),
      ('Moderator', 'select'),
      ('ModerationEvent', 'select'), ('ModerationEvent', 'insert'),
      ('LookupMiss', 'insert')
    ) as t(tbl, cmd)
  loop
    execute format('drop policy if exists %I on %I', 'arlib_app ' || rule.cmd, rule.tbl);
    if rule.cmd = 'insert' then
      execute format('create policy %I on %I for insert to arlib_app with check (true)', 'arlib_app ' || rule.cmd, rule.tbl);
    elsif rule.cmd = 'update' then
      execute format('create policy %I on %I for update to arlib_app using (true) with check (true)', 'arlib_app ' || rule.cmd, rule.tbl);
    else
      execute format('create policy %I on %I for select to arlib_app using (true)', 'arlib_app ' || rule.cmd, rule.tbl);
    end if;
  end loop;
end
$$;

-- 2. Close the Supabase Data API. The app never uses it, but anon and authenticated held every
-- privilege on every table (TRUNCATE included), and service_role would let a leaked secret key
-- read or change all data. The secret key is only for photo storage.
revoke all on all tables in schema public from anon, authenticated, service_role;
revoke all on all sequences in schema public from anon, authenticated, service_role;
alter default privileges in schema public revoke all on tables from anon, authenticated, service_role;
alter default privileges in schema public revoke all on sequences from anon, authenticated, service_role;

-- 3. Drop the per-person policies. Both Supabase Auth users they named were deleted on
-- 2026-09-12, so they match nobody.
do $$
declare
  p record;
begin
  for p in
    select policyname, tablename from pg_policies
    where schemaname = 'public' and (policyname like 'Allow constantin %' or policyname like 'Allow optimistck %')
  loop
    execute format('drop policy %I on %I', p.policyname, p.tablename);
  end loop;
end
$$;
