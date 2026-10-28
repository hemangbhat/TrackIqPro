import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Resolve TS path aliases (e.g. "@/*") natively from tsconfig.json.
    tsconfigPaths: true,
  } as never,
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", ".next", "dist"],
    css: true,
    // The default 5s is too tight for the heavier UI and property tests when the
    // whole suite runs in parallel (they pass alone but time out under load).
    testTimeout: 15000,
  },
});
