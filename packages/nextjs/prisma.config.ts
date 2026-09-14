import { defineConfig } from "prisma/config";

// Settings for Prisma commands (prisma generate, db push, db execute, migrate diff). They don't read
// .env files: put DIRECT_URL, the owner connection, in the command's environment. `prisma generate`
// needs no database.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: { url: process.env.DIRECT_URL },
});
