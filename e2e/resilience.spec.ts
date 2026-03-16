import { test, expect, Page, BrowserContext } from "@playwright/test";

// Test credentials
const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PASSWORD = "admin123";

// Helper to login as facilitator using actual login form
async function loginAsFacilitator(page: Page) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.fill('input[type="email"], input[placeholder*="email" i]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"], button:has-text("Sign In")');
  await page.waitForURL(/\/admin/, { timeout: 15000 });
  await page.waitForLoadState("networkidle");
}

// Helper to create a game and extract the join code + game ID
async function createGameAndGetCode(page: Page): Promise<{ joinCode: string; gameId: string }> {
  await loginAsFacilitator(page);
  await page.waitForSelector("text=Create New Game", { timeout: 15000 });
  await page.click('button:has-text("Create New Game")');
  await page.waitForSelector("[role=dialog]", { timeout: 5000 });

  const gameName = `Resilience Test ${Date.now()}`;
  await page.fill('input#gameName', gameName);
  await page.click('button[type="submit"]:has-text("Create Game")');

  await page.waitForURL(/\/admin\/games\//, { timeout: 15000 });
  await page.waitForLoadState("networkidle");

  // Extract game ID from URL
  const url = page.url();
  const extractedGameId = url.match(/\/admin\/games\/([^\/]+)/)?.[1] || "";

  // Extract join code from the page
  await page.waitForSelector("text=Join Code", { timeout: 10000 });
  const codeMatch = await page.evaluate(() => {
    const allText = document.body.innerText;
    const matches = allText.match(/\b[A-Z0-9]{6}\b/g);
    return matches ? matches[0] : null;
  });

  return { joinCode: codeMatch || "", gameId: extractedGameId };
}

// Helper to join a game as a team
async function joinGameAsTeam(page: Page, code: string, teamName: string) {
  await page.goto("/join");
  await page.waitForLoadState("networkidle");
  await page.fill('input#code', code);
  await page.click('button:has-text("Find Game")');
  await page.waitForSelector('input#teamName', { timeout: 10000 });
  await page.fill('input#teamName', teamName);
  await page.click('button:has-text("Join Game")');
  await page.waitForURL(/\/game\//, { timeout: 15000 });
  await page.waitForLoadState("networkidle");
}

// Helper to wait for loading states to resolve
async function waitForPageContent(page: Page) {
  await page.waitForFunction(
    () => !document.body.innerText.includes("Loading..."),
    { timeout: 15000 }
  ).catch(() => {});
}

test.describe("Resilience Suite", () => {
  test.describe("State Recovery", () => {
    let facilitatorContext: BrowserContext;
    let facilitatorPage: Page;
    let teamContext: BrowserContext;
    let teamPage: Page;
    let joinCode: string;
    let gameId: string;

    test.beforeAll(async ({ browser }) => {
      // Set up a game with one team joined for recovery tests
      facilitatorContext = await browser.newContext();
      facilitatorPage = await facilitatorContext.newPage();

      const result = await createGameAndGetCode(facilitatorPage);
      joinCode = result.joinCode;
      gameId = result.gameId;

      teamContext = await browser.newContext();
      teamPage = await teamContext.newPage();
      await joinGameAsTeam(teamPage, joinCode, "Resilience Team");
      await waitForPageContent(teamPage);
    });

    test.afterAll(async () => {
      await facilitatorContext?.close();
      await teamContext?.close();
    });

    test("page refresh preserves team session", async () => {
      // Capture URL before refresh
      const urlBeforeRefresh = teamPage.url();
      expect(urlBeforeRefresh).toMatch(/\/game\//);

      // Refresh the page
      await teamPage.reload();
      await teamPage.waitForLoadState("networkidle");
      await waitForPageContent(teamPage);

      // Verify we are still on the game page (not redirected to login/join)
      expect(teamPage.url()).toMatch(/\/game\//);

      // Verify team name is still visible (session preserved)
      await expect(teamPage.getByText("Resilience Team")).toBeVisible({ timeout: 10000 });
    });

    test("navigating away and back preserves context", async () => {
      // Capture the current game URL
      const gameUrl = teamPage.url();
      expect(gameUrl).toMatch(/\/game\//);

      // Navigate away to the home page
      await teamPage.goto("/");
      await teamPage.waitForLoadState("networkidle");
      expect(teamPage.url()).not.toMatch(/\/game\//);

      // Navigate back to the game page
      await teamPage.goto(gameUrl);
      await teamPage.waitForLoadState("networkidle");
      await waitForPageContent(teamPage);

      // Verify we are back in the game and the session is intact
      expect(teamPage.url()).toMatch(/\/game\//);
      await expect(teamPage.getByText("Resilience Team")).toBeVisible({ timeout: 10000 });
    });

    test("direct URL to game page without session shows appropriate response", async ({ browser }) => {
      // Open a completely fresh browser context with no cookies
      const freshContext = await browser.newContext();
      const freshPage = await freshContext.newPage();

      try {
        // Navigate directly to a game page with a fake/non-existent game ID
        await freshPage.goto("/game/non-existent-game-id-12345");
        await freshPage.waitForLoadState("networkidle");
        await freshPage.waitForTimeout(3000);

        // The app should show one of: redirect to login/join, error message, or 404
        const currentUrl = freshPage.url();
        const showsLoginOrJoin =
          currentUrl.includes("/login") ||
          currentUrl.includes("/join") ||
          currentUrl === new URL("/", freshPage.url()).href;
        const showsErrorContent = await freshPage
          .locator("text=/not found|error|invalid|sign in|join|login/i")
          .first()
          .isVisible({ timeout: 5000 })
          .catch(() => false);

        // At least one of these responses should be true
        expect(showsLoginOrJoin || showsErrorContent).toBeTruthy();
      } finally {
        await freshContext.close();
      }
    });

    test("cleared session cookie shows login/join option", async ({ browser }) => {
      // Create a fresh context, join a game, then clear cookies
      const tempContext = await browser.newContext();
      const tempPage = await tempContext.newPage();

      try {
        await joinGameAsTeam(tempPage, joinCode, "Cookie Test Team");
        await waitForPageContent(tempPage);

        // Confirm we are in the game
        expect(tempPage.url()).toMatch(/\/game\//);

        // Capture the game URL before clearing cookies
        const gameUrl = tempPage.url();

        // Clear all cookies
        await tempContext.clearCookies();

        // Reload the game page
        await tempPage.goto(gameUrl);
        await tempPage.waitForLoadState("networkidle");
        await tempPage.waitForTimeout(3000);

        // After cookies are cleared, the app should redirect or show login/join options
        const currentUrl = tempPage.url();
        const redirectedAway =
          currentUrl.includes("/login") ||
          currentUrl.includes("/join") ||
          currentUrl === new URL("/", tempPage.url()).href;
        const showsAuthPrompt = await tempPage
          .locator("text=/sign in|login|join|enter.*code/i")
          .first()
          .isVisible({ timeout: 5000 })
          .catch(() => false);

        expect(redirectedAway || showsAuthPrompt).toBeTruthy();
      } finally {
        await tempContext.close();
      }
    });
  });

  test.describe("Accessibility Basics", () => {
    test("home page has proper heading structure", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // There should be at least one level-1 heading on the home page
      const h1 = page.getByRole("heading", { level: 1 });
      await expect(h1.first()).toBeVisible({ timeout: 10000 });

      // Verify the heading has meaningful text content
      const headingText = await h1.first().textContent();
      expect(headingText).toBeTruthy();
      expect(headingText!.trim().length).toBeGreaterThan(0);
    });

    test("join page has labeled form inputs", async ({ page }) => {
      await page.goto("/join");
      await page.waitForLoadState("networkidle");

      // The code input should be accessible via its label
      const codeInput = page.getByLabel(/Join Code|Code/i);
      await expect(codeInput.first()).toBeVisible({ timeout: 10000 });

      // Verify the input is focusable and accepts text
      await codeInput.first().focus();
      await codeInput.first().fill("ABC123");
      await expect(codeInput.first()).toHaveValue("ABC123");
    });

    test("login page has accessible form structure", async ({ page }) => {
      await page.goto("/login");
      await page.waitForLoadState("networkidle");

      // Email input should be findable by type or label
      const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]');
      await expect(emailInput.first()).toBeVisible({ timeout: 10000 });

      // Password input should be findable by type
      const passwordInput = page.locator('input[type="password"]');
      await expect(passwordInput.first()).toBeVisible({ timeout: 10000 });

      // There should be a submit button
      const submitButton = page.locator('button[type="submit"], button:has-text("Sign In")');
      await expect(submitButton.first()).toBeVisible({ timeout: 5000 });

      // Verify the form has a heading or label to identify its purpose
      const formHeading = page.locator("text=/Sign In|Login|Facilitator Access/i");
      await expect(formHeading.first()).toBeVisible({ timeout: 5000 });
    });

    test("game dashboard navigation is discoverable", async ({ browser }) => {
      // This test creates a game, joins with 2 teams, starts it,
      // then checks that navigation elements are accessible via roles
      const facCtx = await browser.newContext();
      const facPage = await facCtx.newPage();
      const t1Ctx = await browser.newContext();
      const t1Page = await t1Ctx.newPage();
      const t2Ctx = await browser.newContext();
      const t2Page = await t2Ctx.newPage();

      try {
        // Create game and join with 2 teams
        const result = await createGameAndGetCode(facPage);

        await joinGameAsTeam(t1Page, result.joinCode, "Nav Test Alpha");
        await joinGameAsTeam(t2Page, result.joinCode, "Nav Test Beta");

        // Start the game
        await facPage.reload();
        await facPage.waitForLoadState("networkidle");
        await facPage.waitForSelector('button:has-text("Start Game")', { timeout: 10000 });
        await facPage.click('button:has-text("Start Game")');
        await facPage.waitForTimeout(3000);

        // Refresh team page to see in-progress state
        await t1Page.reload();
        await t1Page.waitForLoadState("networkidle");
        await waitForPageContent(t1Page);

        // Check that navigation links are discoverable via role-based queries
        const navLinks = t1Page.getByRole("link");
        const linkCount = await navLinks.count();
        expect(linkCount).toBeGreaterThan(0);

        // Check for specific department links using getByRole
        const departmentNames = [/Factory/i, /Finance/i, /HR/i, /Marketing/i, /R&D/i];
        let foundDepartments = 0;

        for (const deptName of departmentNames) {
          const deptLink = t1Page.getByRole("link", { name: deptName });
          const isVisible = await deptLink.isVisible().catch(() => false);
          if (isVisible) {
            foundDepartments++;
          }
        }

        // At least some department links should be discoverable via accessible roles
        expect(foundDepartments).toBeGreaterThan(0);
      } finally {
        await facCtx.close();
        await t1Ctx.close();
        await t2Ctx.close();
      }
    });
  });
});
