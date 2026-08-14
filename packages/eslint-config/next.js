import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/** Shared flat config for every tool in the repo. */
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // Restore the ignores eslint-config-next drops when it is extended.
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);
