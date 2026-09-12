-- Copies the pre-account wallet players (the "User" table) into accounts, keeping their points.
-- Each gets a pseudonym and keeps its wallet address, so the same wallet can claim it later.
-- Safe to re-run: wallets that already have an account are skipped.
insert into "Account" (id, "displayName", points, "walletAddress", "createdAt", "updatedAt")
select
  'imported_' || u.id,
  'Reader ' || upper(substr(md5(lower(u."walletAddress")), 1, 5)),
  u.points,
  lower(u."walletAddress"),
  u."createdAt",
  now()
from "User" u
where u."walletAddress" is not null
  and not exists (select 1 from "Account" a where a."walletAddress" = lower(u."walletAddress"));

insert into "PointEvent" (id, "accountId", action, points, "createdAt")
select 'imported_' || u.id, 'imported_' || u.id, 'IMPORTED_WALLET_POINTS', u.points, now()
from "User" u
where u."walletAddress" is not null
  and u.points > 0
  and exists (select 1 from "Account" a where a.id = 'imported_' || u.id)
  and not exists (select 1 from "PointEvent" e where e.id = 'imported_' || u.id);
