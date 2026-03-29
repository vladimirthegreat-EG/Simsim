import { defineConfig, devices } from "@playwright/test";

// Use production URL if BASE_URL is set, otherwise use localhost
const baseURL = process.env.BASE_URL || "http://localhost:3000";
const useLocalServer = !process.env.BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // Run sequentially to avoid race conditions with shared game state
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1, // Single worker to ensure sequential execution
  reporter: [["html"], ["list"]],
  timeout: 60000, // 60 second timeout per test
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Only start dev server if testing locally
  ...(useLocalServer && {
    webServer: {
      command: "npm run dev",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
  }),
});
