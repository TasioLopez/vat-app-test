// .eslintrc.cjs
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "react"],
  extends: ["next", "next/core-web-vitals", "plugin:@typescript-eslint/recommended"],
  rules: {
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": ["warn", {
      argsIgnorePattern: "^_",
      varsIgnorePattern: "^_",
      ignoreRestSiblings: true,
    }],
    "@typescript-eslint/ban-ts-comment": ["warn", {
      "ts-ignore": "allow-with-description",
      "ts-expect-error": "allow-with-description"
    }],
    "react-hooks/exhaustive-deps": "warn",
    "react/no-unescaped-entities": "off",
    "prefer-const": "warn",
  },
  ignorePatterns: ["src/types/supabase.ts"],
};
