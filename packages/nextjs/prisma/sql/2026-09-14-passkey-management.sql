-- Passkey management: names, which password manager holds each passkey, the browser and device
-- type that added and last used it, and removal (a timestamp; the app's role can't delete rows).
-- Generated with `prisma migrate diff` from the previous schema.prisma and reviewed. Additive only:
-- the code on main before this change keeps working with it.
--
-- Production rollout, as the database owner (postgres), in order:
--   1. This file.
--   2. prisma/sql/app-role.sql (arlib_app may update only a passkey's counter, last use, name and
--      removal time, instead of the whole row).

begin;

-- AlterTable
ALTER TABLE "Passkey" ADD COLUMN     "aaguid" TEXT,
ADD COLUMN     "createdFrom" TEXT,
ADD COLUMN     "lastUsedFrom" TEXT,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "revokedAt" TIMESTAMP(3);

commit;
