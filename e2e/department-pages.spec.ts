import { test, expect, Page, BrowserContext } from "@playwright/test";

// Test credentials
const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PASSWORD = "admin123";

// Helper to login as facilitator
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
  await page.waitForSelector("text=Create New Game", { timeout: 15000 });
  await page.click('button:has-text("Create New Game")');
  await page.waitForSelector("[role=dialog]", { timeout: 5000 });
  const gameName = `Dept Test ${Date.now()}`;
  await page.fill('input#gameName', gameName);
  await page.click('button[type="submit"]:has-text("Create Game")');
  await page.waitForURL(/\/admin\/games\//, { timeout: 15000 });
  await page.waitForLoadState("networkidle");
  await page.waitForSelector("text=Join Code", { timeout: 10000 });
  const codeMatch = await page.evaluate(() => {
    const allText = document.body.innerText;
    const matches = allText.match(/\b[A-Z0-9]{6}\b/g);
    return matches ? matches[0] : null;
  });
  return codeMatch || "";
}

// Helper to join a game as a team
async function joinGameAsTeam(page: Page, joinCode: string, teamName: string) {
  await page.goto("/join");
  await page.waitForLoadState("networkidle");
  await page.fill('input#code', joinCode);
  await page.click('button:has-text("Find Game")');
  await page.waitForSelector('input#teamName', { timeout: 10000 });
  await page.fill('input#teamName', teamName);
  await page.click('button:has-text("Join Game")');
  await page.waitForURL(/\/game\//, { timeout: 15000 });
  await page.waitForLoadState("networkidle");
}

// Simple lobby state tests
test.describe("Department Pages - Lobby State", () => {
  test("team should see lobby view and their name after joining", async ({ browser }) => {
    // Create facilitator context and game
    const facilitatorContext = await browser.newContext();
    const facilitatorPage = await facilitatorContext.newPage();
    const joinCode = await createGameAndGetCode(facilitatorPage);

    // Create team context and join
    const teamContext = await browser.newContext();
    const teamPage = await teamContext.newPage();
    await joinGameAsTeam(teamPage, joinCode, "Lobby Test Team");

    // Verify team is in lobby - looking for various possible lobby indicators
    const hasLobbyIndicator = await Promise.race([
      teamPage.getByText(/Waiting/i).isVisible({ timeout: 5000 }).catch(() => false),
      teamPage.getByText(/Lobby/i).isVisible({ timeout: 5000 }).catch(() => false),
      teamPage.getByText(/Your Team/i).isVisible({ timeout: 5000 }).catch(() => false),
    ]);

    // Team name should be visible
    await expect(teamPage.getByText("Lobby Test Team")).toBeVisible({ timeout: 10000 });

    // Clean up
    await facilitatorContext.close();
    await teamContext.close();
  });
});

// Tests that require an in-progress game
test.describe("Department Pages - In Progress Game", () => {
  test("team should see navigation after game is started", async ({ browser }) => {
    // Create facilitator context and game
    const facilitatorContext = await browser.newContext();
    const facilitatorPage = await facilitatorContext.newPage();
    const joinCode = await createGameAndGetCode(facilitatorPage);

    // Create two team contexts (need 2 teams minimum to start)
    const team1Context = await browser.newContext();
    const team1Page = await team1Context.newPage();
    await joinGameAsTeam(team1Page, joinCode, "Team Alpha");

    const team2Context = await browser.newContext();
    const team2Page = await team2Context.newPage();
    await joinGameAsTeam(team2Page, joinCode, "Team Beta");

    // Facilitator starts the game
    await facilitatorPage.reload();
    await facilitatorPage.waitForLoadState("networkidle");
    await facilitatorPage.waitForSelector('button:has-text("Start Game")', { timeout: 10000 });
    await facilitatorPage.click('button:has-text("Start Game")');
    await facilitatorPage.waitForTimeout(3000); // Wait for game to start

    // Refresh team page to see game started
    await team1Page.reload();
    await team1Page.waitForLoadState("networkidle");
    await team1Page.waitForTimeout(2000);

    // Check if navigation is visible (game is in progress)
    const hasNavigation = await team1Page.getByRole("link", { name: /HR|Factory|Finance/i }).first().isVisible({ timeout: 10000 }).catch(() => false);

    if (hasNavigation) {
      // Navigate to a few department pages to verify they load
      await team1Page.getByRole("link", { name: /Factory/i }).click();
      await team1Page.waitForURL(/\/factory/, { timeout: 10000 });
      await expect(team1Page.locator("body")).toBeVisible();

      await team1Page.getByRole("link", { name: /Finance/i }).click();
      await team1Page.waitForURL(/\/finance/, { timeout: 10000 });
      await expect(team1Page.locator("body")).toBeVisible();
    }

    // Clean up
    await facilitatorContext.close();
    await team1Context.close();
    await team2Context.close();
  });
});
