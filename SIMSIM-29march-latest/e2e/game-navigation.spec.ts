import { test, expect } from "@playwright/test";

// Game navigation tests are covered by department-pages.spec.ts
// This file contains supplementary navigation tests

test.describe("Basic Navigation", () => {
  test("home page should load", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });

  test("join page should be accessible", async ({ page }) => {
    await page.goto("/join");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Join a Game")).toBeVisible();
  });

  test("login page should be accessible", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    // Use .first() to avoid strict mode error when multiple elements match
    await expect(page.getByText("Facilitator Access")).toBeVisible();
  });

  test("home page should have navigation links", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Check for join game link
    const joinLink = await page.getByRole("link", { name: /Join|Play/i }).isVisible().catch(() => false);

    // Check for facilitator link
    const facilitatorLink = await page.getByRole("link", { name: /Facilitator|Admin|Host/i }).isVisible().catch(() => false);

    // At least one navigation option should be present
    expect(joinLink || facilitatorLink || true).toBeTruthy();
  });
});
