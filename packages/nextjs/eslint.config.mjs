import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import { defineConfig, globalIgnores } from "eslint/config";

// Next.js 16 removed `next lint`; ESLint runs directly with the flat config format.
export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  prettierRecommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "prettier/prettier": ["warn", { endOfLine: "auto" }],
    },
  },
  // Next.js and Tailwind config files are CommonJS.
  {
    files: ["*.config.js", "**/*.cjs"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  globalIgnores([
    ".next/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "next-env.d.ts",
    "public/**",
    "prisma/**",
  ]),
]);
