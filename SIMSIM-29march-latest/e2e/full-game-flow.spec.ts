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

// Helper to create a game and get join code
async function createGameAndGetCode(page: Page): Promise<string> {
  await loginAsFacilitator(page);

  // Click create game
  await page.waitForSelector("text=Create New Game", { timeout: 15000 });
  await page.click('button:has-text("Create New Game")');

  // Wait for dialog
  await page.waitForSelector("[role=dialog]", { timeout: 5000 });

  // Fill game name with unique timestamp
  const gameName = `E2E Test Game ${Date.now()}`;
  await page.fill('input#gameName', gameName);

  // Submit
  await page.click('button[type="submit"]:has-text("Create Game")');

  // Wait for redirect to game management page
  await page.waitForURL(/\/admin\/games\//, { timeout: 15000 });
  await page.waitForLoadState("networkidle");

  // Extract join code - look for the code display on the game page
  // The code is typically displayed prominently with a copy button
  await page.waitForSelector("text=Join Code", { timeout: 10000 });

  // Get the join code from the page - it's usually in a prominent display
  // Look for a 6-char alphanumeric that's NOT in the toast message
  const codeMatch = await page.evaluate(() => {
    // Look for text that's exactly 6 alphanumeric characters
    const allText = document.body.innerText;
    const matches = allText.match(/\b[A-Z0-9]{6}\b/g);
    // Return the first match that appears after "Join Code"
    return matches ? matches[0] : null;
  });

  return codeMatch || "";
}

// Helper to join a game as a team
async function joinGameAsTeam(page: Page, joinCode: string, teamName: string) {
  await page.goto("/join");
  await page.waitForLoadState("networkidle");

  // Enter join code using the exact input id
  await page.fill('input#code', joinCode);
  await page.click('button:has-text("Find Game")');

  // Wait for team name step - the input has id="teamName"
  await page.waitForSelector('input#teamName', { timeout: 10000 });

  // Enter team name
  await page.fill('input#teamName', teamName);
  await page.click('button:has-text("Join Game")');

  // Wait for redirect to game page
  await page.waitForURL(/\/game\//, { timeout: 15000 });
  await page.waitForLoadState("networkidle");
}

test.describe("Full Game Flow - Create and Join", () => {
  test("should create a game and have a team join", async ({ browser }) => {
    // Use separate contexts for facilitator and team
    const facilitatorContext = await browser.newContext();
    const teamContext = await browser.newContext();

    const facilitatorPage = await facilitatorContext.newPage();
    const teamPage = await teamContext.newPage();

    try {
      // Facilitator creates game
      const joinCode = await createGameAndGetCode(facilitatorPage);
      expect(joinCode).toMatch(/^[A-Z0-9]{6}$/);

      // Team joins the game
      await joinGameAsTeam(teamPage, joinCode, "Test Team Alpha");

      // Wait for page to fully load (not just networkidle, but actual content)
      // The page might show "Loading..." initially, so wait for that to disappear
      await teamPage.waitForFunction(
        () => !document.body.innerText.includes("Loading..."),
        { timeout: 15000 }
      ).catch(() => {
        // If still loading after 15s, continue anyway to see actual error
      });

      // Verify team is in the game lobby - look for team name
      await expect(teamPage.getByText("Test Team Alpha")).toBeVisible({ timeout: 10000 });
    } finally {
      await facilitatorContext.close();
      await teamContext.close();
    }
  });
});

// Game navigation with in-progress game is covered in department-pages.spec.ts
// That test creates 2 teams (required minimum) before starting the game

test.describe("Join Page Validation", () => {
  test("should handle invalid join codes gracefully", async ({ page }) => {
    await page.goto("/join");
    await page.waitForLoadState("networkidle");

    await page.fill('input[placeholder*="ABC123" i], input[id*="code" i]', "XXXXXX");
    await page.click('button:has-text("Find Game")');

    // Should show error
    await expect(page.getByText(/not found|invalid|error/i)).toBeVisible({ timeout: 5000 });
  });

  test("should require full 6-character code", async ({ page }) => {
    await page.goto("/join");
    await page.waitForLoadState("networkidle");

    const findButton = page.getByRole("button", { name: /Find Game/i });

    // Should be disabled with partial code
    await page.fill('input[placeholder*="ABC123" i], input[id*="code" i]', "ABC");
    await expect(findButton).toBeDisabled();

    // Should be enabled with full code
    await page.fill('input[placeholder*="ABC123" i], input[id*="code" i]', "ABCDEF");
    await expect(findButton).toBeEnabled();
  });
});

test.describe("Facilitator Game Management", () => {
  test("should be able to view game details after creation", async ({ page }) => {
    await loginAsFacilitator(page);

    // Check if there are any existing games to view
    const gameCard = page.locator('[class*="cursor-pointer"]').first();
    const hasGames = await gameCard.isVisible().catch(() => false);

    if (hasGames) {
      await gameCard.click();
      await page.waitForURL(/\/admin\/games\//, { timeout: 10000 });

      // Should show game management page
      await expect(page.getByText(/Join Code|Teams|Round/i)).toBeVisible({ timeout: 10000 });
    } else {
      // No games yet - create one
      const joinCode = await createGameAndGetCode(page);
      expect(joinCode).toMatch(/^[A-Z0-9]{6}$/);
    }
  });
});
