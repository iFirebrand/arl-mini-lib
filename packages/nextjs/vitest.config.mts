import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    alias: { "server-only": fileURLToPath(new URL("./test/mocks/serverOnly.ts", import.meta.url)) },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["test/unit/**/*.test.{ts,tsx}"],
          environment: "jsdom",
          setupFiles: ["test/setup/unit.ts"],
          restoreMocks: true,
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["test/integration/**/*.test.ts"],
          environment: "node",
          globalSetup: ["test/setup/integrationGlobal.ts"],
          setupFiles: ["test/setup/integration.ts"],
          // Tests share one database, so run every file in a single worker, one after another.
          pool: "forks",
          poolOptions: { forks: { singleFork: true } },
          hookTimeout: 30_000,
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: ["actions/**", "app/**", "components/**", "lib/**", "media/**"],
      exclude: ["components/scaffold-eth/**"],
    },
  },
});
