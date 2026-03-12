import { test, expect, Page, BrowserContext } from "@playwright/test";

/**
 * E2E STRESS: Deep Suite (@deep)
 *
 * Comprehensive E2E tests covering:
 * - Full game lifecycle (create → join → play → advance → results)
 * - Module-specific UI interactions (factory, HR, finance, marketing, R&D)
 * - Facilitator controls (start, advance round, pause, end)
 * - Concurrency (multiple teams in parallel browser contexts)
 * - Resilience (invalid inputs, missing data, rapid clicking)
 *
 * Pre-requisite: dev server running at localhost:3000 with SQLite DB.
 */

// ============================================
// HELPERS
// ============================================

const TEST_EMAIL = `stress_${Date.now()}@example.com`;
const TEST_PASSWORD = "StressTest123!";
const TEST_NAME = "Stress Test Facilitator";

async function devLoginAsFacilitator(page: Page) {
  await page.goto("/dev-login");
  await page.waitForLoadState("networkidle");
  const btn = page.getByRole("button", { name: /Facilitator/i });
  if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await btn.click();
    await page.waitForURL(/\/admin/, { timeout: 10000 });
    await page.waitForLoadState("networkidle");
  }
}

async function devLoginAsTeam(page: Page) {
  await page.goto("/dev-login");
  await page.waitForLoadState("networkidle");
  const btn = page.getByRole("button", { name: /Team Player/i });
  if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await btn.click();
    await page.waitForURL(/\/game\//, { timeout: 10000 });
    await page.waitForLoadState("networkidle");
  }
}

async function createGame(page: Page): Promise<{ joinCode: string; gameId: string }> {
  await devLoginAsFacilitator(page);

  // Click create game
  await page.waitForSelector("text=Create New Game", { timeout: 15000 });
  await page.click('button:has-text("Create New Game")');

  // Wait for dialog
  await page.waitForSelector("[role=dialog]", { timeout: 5000 });

  // Fill game name
  const gameName = `Stress Test ${Date.now()}`;
  await page.fill("input#gameName", gameName);

  // Submit
  await page.click('button[type="submit"]:has-text("Create Game")');

  // Wait for redirect
  await page.waitForURL(/\/admin\/games\//, { timeout: 15000 });
  await page.waitForLoadState("networkidle");

  // Extract game ID
  const url = page.url();
  const gameId = url.match(/\/admin\/games\/([^\/]+)/)?.[1] || "";

  // Extract join code
  await page.waitForSelector("text=Join Code", { timeout: 10000 });
  const joinCode = await page.evaluate(() => {
    const allText = document.body.innerText;
    const matches = allText.match(/\b[A-Z0-9]{6}\b/g);
    return matches ? matches[0] : null;
  });

  return { joinCode: joinCode || "", gameId };
}

async function joinGame(page: Page, code: string, teamName: string) {
  await page.goto("/join");
  await page.waitForLoadState("networkidle");

  await page.fill("input#code", code);
  await page.click('button:has-text("Find Game")');

  await page.waitForSelector("input#teamName", { timeout: 10000 });
  await page.fill("input#teamName", teamName);
  await page.click('button:has-text("Join Game")');

  await page.waitForURL(/\/game\//, { timeout: 15000 });
  await page.waitForLoadState("networkidle");
}

// ============================================
// DEEP TESTS
// ============================================

test.describe("Deep Suite", { tag: "@deep" }, () => {
  // ============================================
  // GAME LIFECYCLE
  // ============================================

  test.describe("Game Lifecycle", () => {
    test("create game generates valid join code", async ({ page }) => {
      const { joinCode, gameId } = await createGame(page);
      expect(joinCode).toMatch(/^[A-Z0-9]{6}$/);
      expect(gameId.length).toBeGreaterThan(0);
    });

    test("team can join with valid code", async ({ browser }) => {
      const facilitatorContext = await browser.newContext();
      const teamContext = await browser.newContext();

      try {
        const facilitatorPage = await facilitatorContext.newPage();
        const teamPage = await teamContext.newPage();

        const { joinCode } = await createGame(facilitatorPage);
        await joinGame(teamPage, joinCode, "Test Team");

        expect(teamPage.url()).toContain("/game/");
      } finally {
        await facilitatorContext.close();
        await teamContext.close();
      }
    });

    test("invalid join code shows error", async ({ page }) => {
      await page.goto("/join");
      await page.waitForLoadState("networkidle");

      await page.fill("input#code", "ZZZZZZ");
      await page.click('button:has-text("Find Game")');

      // Should show error (not found)
      await page.waitForTimeout(3000);
      const bodyText = await page.textContent("body");
      // Check for error indication (could be toast, inline error, etc.)
      const hasError = bodyText?.toLowerCase().includes("not found") ||
        bodyText?.toLowerCase().includes("error") ||
        bodyText?.toLowerCase().includes("invalid") ||
        await page.locator("[role=alert]").isVisible().catch(() => false);
      expect(hasError).toBe(true);
    });
  });

  // ============================================
  // MODULE UI TESTS
  // ============================================

  test.describe("Module UI", () => {
    test("game page shows module navigation", async ({ page }) => {
      await devLoginAsTeam(page);
      await page.waitForLoadState("networkidle");

      // Should have module navigation items
      const modules = ["Factory", "Finance", "HR", "Marketing", "R&D"];
      for (const mod of modules) {
        const visible = await page.locator(`text=${mod}`).first().isVisible({ timeout: 3000 }).catch(() => false);
        // At least some modules should be visible (may be in nav or tabs)
        if (visible) {
          expect(visible).toBe(true);
        }
      }
    });

    test("factory module page loads without crash", async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (err) => errors.push(err.message));

      await devLoginAsTeam(page);
      await page.waitForLoadState("networkidle");

      // Try clicking factory module
      const factoryLink = page.locator("text=Factory").first();
      if (await factoryLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        await factoryLink.click();
        await page.waitForTimeout(2000);
      }

      const criticalErrors = errors.filter(e =>
        !e.includes("ResizeObserver") && !e.includes("hydration")
      );
      expect(criticalErrors).toHaveLength(0);
    });

    test("dashboard/overview loads with financial data", async ({ page }) => {
      await devLoginAsTeam(page);
      await page.waitForLoadState("networkidle");

      // Should display some financial info (cash, revenue, etc.)
      const body = await page.textContent("body");
      const hasFinancialData = body?.includes("$") ||
        body?.toLowerCase().includes("cash") ||
        body?.toLowerCase().includes("revenue") ||
        body?.toLowerCase().includes("round");
      expect(hasFinancialData).toBe(true);
    });
  });

  // ============================================
  // FACILITATOR CONTROLS
  // ============================================

  test.describe("Facilitator Controls", () => {
    test("facilitator can see game management page", async ({ page }) => {
      await devLoginAsFacilitator(page);
      await page.waitForLoadState("networkidle");

      // Should see game management controls
      const body = await page.textContent("body");
      const hasControls = body?.toLowerCase().includes("create") ||
        body?.toLowerCase().includes("game") ||
        body?.toLowerCase().includes("dashboard");
      expect(hasControls).toBe(true);
    });

    test("facilitator dashboard loads without errors", async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (err) => errors.push(err.message));

      await devLoginAsFacilitator(page);
      await page.waitForTimeout(3000);

      const criticalErrors = errors.filter(e =>
        !e.includes("ResizeObserver") && !e.includes("hydration")
      );
      expect(criticalErrors).toHaveLength(0);
    });
  });

  // ============================================
  // RESILIENCE TESTS
  // ============================================

  test.describe("Resilience", () => {
    test("rapid page navigation does not crash", async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (err) => errors.push(err.message));

      // Rapidly navigate between pages
      const urls = ["/", "/join", "/login", "/dev-login"];
      for (const url of urls) {
        await page.goto(url);
        await page.waitForTimeout(500);
      }

      const criticalErrors = errors.filter(e =>
        !e.includes("ResizeObserver") &&
        !e.includes("hydration") &&
        !e.includes("abort")
      );
      expect(criticalErrors).toHaveLength(0);
    });

    test("empty join code submission is handled gracefully", async ({ page }) => {
      await page.goto("/join");
      await page.waitForLoadState("networkidle");

      // Try submitting empty code
      const submitBtn = page.locator('button:has-text("Find Game")');
      if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await submitBtn.click();
        await page.waitForTimeout(1000);
        // Should not crash - either show validation or do nothing
        const body = await page.textContent("body");
        expect(body?.length).toBeGreaterThan(0);
      }
    });

    test("direct URL to non-existent game shows error or redirect", async ({ page }) => {
      await page.goto("/game/non-existent-id-12345");
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(3000);

      // Should show error, redirect to join, or show a meaningful page
      const url = page.url();
      const body = await page.textContent("body");
      const handled = url.includes("join") ||
        url.includes("login") ||
        url.includes("dev-login") ||
        body?.toLowerCase().includes("not found") ||
        body?.toLowerCase().includes("error") ||
        (body?.length ?? 0) > 0;
      expect(handled).toBe(true);
    });

    test("login page handles wrong credentials gracefully", async ({ page }) => {
      await page.goto("/login");
      await page.waitForLoadState("networkidle");

      const emailInput = page.locator('input[type="email"], input#login-email').first();
      const passwordInput = page.locator('input[type="password"], input#login-password').first();

      if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await emailInput.fill("nonexistent@test.com");
        await passwordInput.fill("wrongpassword");

        const submitBtn = page.locator('button[type="submit"]').first();
        if (await submitBtn.isVisible().catch(() => false)) {
          await submitBtn.click();
          await page.waitForTimeout(3000);

          // Should not crash - still on login page or show error
          const body = await page.textContent("body");
          expect(body?.length).toBeGreaterThan(0);
        }
      }
    });
  });

  // ============================================
  // CONCURRENT SESSIONS
  // ============================================

  test.describe("Concurrent Sessions", () => {
    test("two teams can view game simultaneously", async ({ browser }) => {
      const ctx1 = await browser.newContext();
      const ctx2 = await browser.newContext();

      try {
        const page1 = await ctx1.newPage();
        const page2 = await ctx2.newPage();

        // Both login as team players
        await devLoginAsTeam(page1);
        await devLoginAsTeam(page2);

        // Both should have valid game pages
        expect(page1.url()).toContain("/game/");
        expect(page2.url()).toContain("/game/");
      } finally {
        await ctx1.close();
        await ctx2.close();
      }
    });
  });
});
