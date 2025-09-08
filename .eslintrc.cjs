// .eslintrc.cjs
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "react"],
  extends: [
    "next",
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended",
  ],
  rules: {
    // So your code compiles now; you can tighten later, file-by-file
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": ["warn", {
      argsIgnorePattern: "^_",
      varsIgnorePattern: "^_",
      ignoreRestSiblings: true,
    }],
    // You used @ts-ignore in a few spots; allow it with a note
    "@typescript-eslint/ban-ts-comment": ["warn", {
      "ts-ignore": "allow-with-description",
      "ts-expect-error": "allow-with-description"
    }],
    "react-hooks/exhaustive-deps": "warn",
    "react/no-unescaped-entities": "off",
    "prefer-const": "warn",
  },
  // That "File appears to be binary" error — just ignore it for ESLint
  ignorePatterns: [
    "src/types/supabase.ts", // or rename/remove if it was added by mistake
  ],
};
