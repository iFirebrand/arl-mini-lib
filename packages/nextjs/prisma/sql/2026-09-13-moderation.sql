-- Moderation: a hidden flag for books, the list of moderators, and a log of every hide/unhide.
-- Generated with `prisma migrate diff` from the previous schema.prisma and reviewed. Additive only:
-- the code on main before this change keeps working with it.
--
-- Production rollout, as the database owner (postgres), in order:
--   1. This file.
--   2. prisma/sql/app-role.sql (grants and row-level security for the new tables and columns).
--   3. Make an account a moderator, by its pseudonym (shown next to the points in the header):
--        insert into "Moderator" ("accountId")
--        select id from "Account" where "displayName" = 'Reader XXXXX';

begin;

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "hidden" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Moderator" (
    "accountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Moderator_pkey" PRIMARY KEY ("accountId")
);

-- CreateTable
CREATE TABLE "ModerationEvent" (
    "id" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "hidden" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ModerationEvent_targetType_targetId_idx" ON "ModerationEvent"("targetType", "targetId");

-- AddForeignKey
ALTER TABLE "Moderator" ADD CONSTRAINT "Moderator_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

commit;
