const path = require("path");

// Next.js 16 removed `next lint`; run ESLint directly on the staged files.
const eslintCommand = filenames =>
  `yarn workspace @se-2/nextjs eslint --fix ${filenames
    .map(f => path.relative(path.join("packages", "nextjs"), f))
    .join(" ")}`;

const checkTypesNextCommand = () => "yarn next:check-types";

module.exports = {
  "packages/nextjs/**/*.{ts,tsx}": [eslintCommand, checkTypesNextCommand],
};
