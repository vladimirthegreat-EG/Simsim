import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    // Exclude Playwright tests in /e2e/ — Vitest integration tests are in /__tests__/integration/
    exclude: ["**/node_modules/**", "e2e/**", "SIMSIM-*/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
