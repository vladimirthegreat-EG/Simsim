import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test.beforeEach(async ({ page }) => {
    // Clear cookies before each test
    await page.context().clearCookies();
  });

  test("should display dev login page", async ({ page }) => {
    await page.goto("/dev-login");

    await expect(page.getByRole("heading", { name: "Dev Login" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Facilitator/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Team Player/i })).toBeVisible();
  });

  test("should login as facilitator and redirect to admin", async ({ page }) => {
    await page.goto("/dev-login");

    await page.getByRole("button", { name: /Facilitator/i }).click();

    // Wait for redirect
    await page.waitForURL(/\/admin/, { timeout: 5000 });

    // Verify we're on admin page
    expect(page.url()).toContain("/admin");
  });

  test("should login as team and redirect to game", async ({ page }) => {
    await page.goto("/dev-login");

    await page.getByRole("button", { name: /Team Player/i }).click();

    // Wait for redirect
    await page.waitForURL(/\/game\//, { timeout: 5000 });

    // Verify we're on a game page
    expect(page.url()).toContain("/game/");
  });

  test("should clear cookies when clicking clear button", async ({ page }) => {
    await page.goto("/dev-login");

    // Login first
    await page.getByRole("button", { name: /Facilitator/i }).click();
    await page.waitForURL(/\/admin/, { timeout: 5000 });

    // Go back to dev-login
    await page.goto("/dev-login");

    // Clear cookies
    await page.getByRole("button", { name: /Clear All Cookies/i }).click();

    // Verify status shows cookies cleared
    await expect(page.getByText("Cookies cleared!")).toBeVisible();
  });
});
