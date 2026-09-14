-- Title search for books without a barcode, and a log of books no catalog could find.
-- Generated with `prisma migrate diff` from the previous schema.prisma and reviewed. Additive only:
-- the code on main before this change keeps working with it.
--
-- Production rollout, as the database owner (postgres), in order:
--   1. This file.
--   2. prisma/sql/app-role.sql (arlib_app may add LookupMiss rows but not read them).

begin;

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "addedVia" TEXT,
ADD COLUMN     "editionKey" TEXT;

-- CreateTable
CREATE TABLE "LookupMiss" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "libraryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LookupMiss_pkey" PRIMARY KEY ("id")
);

commit;
