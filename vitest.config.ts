import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    // Default to node for fast pure-logic tests; component/render tests opt into
    // jsdom via the *.dom.test.tsx suffix below.
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    environmentMatchGlobs: [["src/**/*.dom.{test,spec}.{ts,tsx}", "jsdom"]],
    setupFiles: ["src/test/setup.ts"],
  },
});
