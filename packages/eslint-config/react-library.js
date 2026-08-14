import { defineConfig } from "eslint/config";
import next from "./next.js";

/**
 * For packages that hold React components but are not Next apps. Same rules,
 * minus the ones that go looking for a routes directory that will never exist.
 */
export default defineConfig([
  ...next,
  { rules: { "@next/next/no-html-link-for-pages": "off" } },
]);
