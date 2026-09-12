-- Stand-in for the roles every Supabase project has, with the broad table grants Supabase
-- gives them by default, so prisma/sql/app-role.sql is tested against the same starting point.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
end
$$;

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;

-- One of the old per-person policies, to check the script removes them.
alter table "Library" enable row level security;
drop policy if exists "Allow constantin to select libraries" on "Library";
create policy "Allow constantin to select libraries" on "Library" for select using (false);
