import { test, expect, Page, BrowserContext } from "@playwright/test";

/**
 * E2E STRESS: Smoke Suite (@smoke)
 *
 * Fast-running smoke tests that verify critical paths work.
 * These should run on every commit / CI push.
 *
 * Pre-requisite: dev server running at localhost:3000 with SQLite DB seeded.
 */

// ============================================
// HELPERS
// ============================================

async function devLoginAsFacilitator(page: Page) {
  await page.goto("/dev-login");
  await page.waitForLoadState("networkidle");
  const btn = page.getByRole("button", { name: /Facilitator/i });
  if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await btn.click();
    await page.waitForURL(/\/admin/, { timeout: 10000 });
  }
}

async function devLoginAsTeam(page: Page) {
  await page.goto("/dev-login");
  await page.waitForLoadState("networkidle");
  const btn = page.getByRole("button", { name: /Team Player/i });
  if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await btn.click();
    await page.waitForURL(/\/game\//, { timeout: 10000 });
  }
}

// ============================================
// SMOKE TESTS
// ============================================

test.describe("Smoke Suite", { tag: "@smoke" }, () => {
  test("homepage loads without errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Page should load something (not a blank 500 error)
    const body = await page.textContent("body");
    expect(body?.length).toBeGreaterThan(0);

    // No uncaught JS errors
    expect(errors).toHaveLength(0);
  });

  test("dev-login page renders both login buttons", async ({ page }) => {
    await page.goto("/dev-login");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("button", { name: /Facilitator/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Team Player/i })).toBeVisible();
  });

  test("facilitator login redirects to admin dashboard", async ({ page }) => {
    await devLoginAsFacilitator(page);
    expect(page.url()).toContain("/admin");
  });

  test("team login redirects to game page", async ({ page }) => {
    await devLoginAsTeam(page);
    expect(page.url()).toContain("/game/");
  });

  test("join page loads and has input for join code", async ({ page }) => {
    await page.goto("/join");
    await page.waitForLoadState("networkidle");

    // Should have an input for the join code
    const codeInput = page.locator("input#code, input[placeholder*='code' i], input[name*='code' i]");
    await expect(codeInput.first()).toBeVisible({ timeout: 5000 });
  });

  test("admin dashboard shows game list or create button", async ({ page }) => {
    await devLoginAsFacilitator(page);
    await page.waitForLoadState("networkidle");

    // Should have either a game list or a create button
    const hasContent = await page.locator("text=/Create|Games|Dashboard/i").first().isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasContent).toBe(true);
  });

  test("no console errors on game page", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await devLoginAsTeam(page);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Filter out known benign errors
    const criticalErrors = errors.filter(e =>
      !e.includes("ResizeObserver") &&
      !e.includes("hydration")
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test("login page accessible at /login", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    const body = await page.textContent("body");
    expect(body?.length).toBeGreaterThan(0);
  });
});
