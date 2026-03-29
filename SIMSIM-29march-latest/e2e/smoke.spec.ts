import { test, expect, Page, BrowserContext } from "@playwright/test";

// Test credentials
const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PASSWORD = "admin123";

// Shared state across serial tests
let facilitatorContext: BrowserContext;
let facilitatorPage: Page;
let team1Context: BrowserContext;
let team1Page: Page;
let team2Context: BrowserContext;
let team2Page: Page;
let joinCode: string;
let gameId: string;

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
  await page.waitForSelector("text=Create New Game", { timeout: 15000 });
  await page.click('button:has-text("Create New Game")');
  await page.waitForSelector("[role=dialog]", { timeout: 5000 });

  const gameName = `Smoke Test ${Date.now()}`;
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

test.describe("Smoke Suite @smoke", () => {
  test.describe.serial("smoke flow", () => {
    test.afterAll(async () => {
      await facilitatorContext?.close();
      await team1Context?.close();
      await team2Context?.close();
    });

    test("facilitator can login and reach admin dashboard", async ({ browser }) => {
      facilitatorContext = await browser.newContext();
      facilitatorPage = await facilitatorContext.newPage();

      await loginAsFacilitator(facilitatorPage);

      // Verify we landed on the admin dashboard
      expect(facilitatorPage.url()).toMatch(/\/admin/);
      await expect(facilitatorPage.getByText(/Facilitator Dashboard|Dashboard/i)).toBeVisible({
        timeout: 10000,
      });
    });

    test("facilitator can create a new game session", async () => {
      const result = await createGameAndGetCode(facilitatorPage);
      joinCode = result.joinCode;
      gameId = result.gameId;

      // Verify the join code is a valid 6-character alphanumeric string
      expect(joinCode).toMatch(/^[A-Z0-9]{6}$/);
      expect(gameId).toBeTruthy();

      // Verify we are on the game management page
      expect(facilitatorPage.url()).toMatch(/\/admin\/games\//);
      await expect(facilitatorPage.getByText(/Join Code/i)).toBeVisible({ timeout: 5000 });
    });

    test("team can join with valid join code", async ({ browser }) => {
      team1Context = await browser.newContext();
      team1Page = await team1Context.newPage();

      await joinGameAsTeam(team1Page, joinCode, "Smoke Team Alpha");
      await waitForPageContent(team1Page);

      // Verify team landed on a game page and their name is visible
      expect(team1Page.url()).toMatch(/\/game\//);
      await expect(team1Page.getByText("Smoke Team Alpha")).toBeVisible({ timeout: 10000 });
    });

    test("game can be started with 2 teams", async ({ browser }) => {
      // Join a second team (minimum required to start)
      team2Context = await browser.newContext();
      team2Page = await team2Context.newPage();

      await joinGameAsTeam(team2Page, joinCode, "Smoke Team Beta");
      await waitForPageContent(team2Page);
      await expect(team2Page.getByText("Smoke Team Beta")).toBeVisible({ timeout: 10000 });

      // Facilitator refreshes to see both teams, then starts the game
      await facilitatorPage.reload();
      await facilitatorPage.waitForLoadState("networkidle");
      await facilitatorPage.waitForSelector('button:has-text("Start Game")', { timeout: 10000 });
      await facilitatorPage.click('button:has-text("Start Game")');
      await facilitatorPage.waitForTimeout(3000);

      // Refresh team 1 to see game started state
      await team1Page.reload();
      await team1Page.waitForLoadState("networkidle");
      await waitForPageContent(team1Page);

      // Verify navigation links appear (game is now in progress)
      const hasNavigation = await team1Page
        .getByRole("link", { name: /HR|Factory|Finance/i })
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false);
      expect(hasNavigation).toBeTruthy();
    });

    test("team sees game dashboard after start", async () => {
      // Navigate to the game overview / dashboard
      const gameUrl = `/game/${gameId}`;
      await team1Page.goto(gameUrl);
      await team1Page.waitForLoadState("networkidle");
      await waitForPageContent(team1Page);

      // Verify key dashboard elements are present
      expect(team1Page.url()).toContain(`/game/${gameId}`);

      // Check for at least one stats-related keyword visible on the dashboard
      const hasDashboardContent = await Promise.race([
        team1Page.getByText(/Cash|Revenue|Round|Market/i).first().isVisible({ timeout: 10000 }),
        team1Page.getByText("Smoke Team Alpha").isVisible({ timeout: 10000 }),
      ]).catch(() => false);
      expect(hasDashboardContent).toBeTruthy();
    });

    test("team can navigate to factory department page", async () => {
      // Click Factory navigation link
      await team1Page.click('a[href*="/factory"], [role="link"]:has-text("Factory")');
      await team1Page.waitForURL(/\/factory/, { timeout: 10000 });
      await waitForPageContent(team1Page);

      // Verify the Factory page loaded with relevant content
      expect(team1Page.url()).toMatch(/\/factory/);
      const factoryLoaded = await team1Page
        .locator("text=/Factory|Production|Manufacturing/i")
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false);
      expect(factoryLoaded).toBeTruthy();
    });
  });
});
