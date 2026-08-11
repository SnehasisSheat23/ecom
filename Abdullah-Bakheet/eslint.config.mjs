import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Allow unescaped quotes/apostrophes in JSX — content strings are fine
      "react/no-unescaped-entities": "off",
      // Allow setState in useEffect — we use it intentionally for post-mount setup
      "react-hooks/set-state-in-effect": "off",
      // Downgrade <img> warning — project uses external URLs not suited for next/image
      "@next/next/no-img-element": "warn",
    },
  },
]);

export default eslintConfig;
