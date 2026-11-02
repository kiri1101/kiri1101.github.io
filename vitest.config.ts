import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    include: ["worker/**/*.test.ts", "app/**/*.test.{ts,tsx}", "tests/unit/**/*.test.{ts,tsx}"],
    passWithNoTests: true,
  },
});
