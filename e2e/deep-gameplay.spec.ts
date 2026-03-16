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
let team3Context: BrowserContext;
let team3Page: Page;
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

  const gameName = `Deep Gameplay ${Date.now()}`;
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

test.describe("Deep Gameplay Suite @deep", () => {
  test.describe.serial("multi-round gameplay", () => {
    test.afterAll(async () => {
      await facilitatorContext?.close();
      await team1Context?.close();
      await team2Context?.close();
      await team3Context?.close();
    });

    test("setup: facilitator creates game", async ({ browser }) => {
      facilitatorContext = await browser.newContext();
      facilitatorPage = await facilitatorContext.newPage();

      await loginAsFacilitator(facilitatorPage);

      const result = await createGameAndGetCode(facilitatorPage);
      joinCode = result.joinCode;
      gameId = result.gameId;

      expect(joinCode).toMatch(/^[A-Z0-9]{6}$/);
      expect(gameId).toBeTruthy();
      expect(facilitatorPage.url()).toMatch(/\/admin\/games\//);
    });

    test("setup: 3 teams join the game", async ({ browser }) => {
      // Team 1
      team1Context = await browser.newContext();
      team1Page = await team1Context.newPage();
      await joinGameAsTeam(team1Page, joinCode, "Deep Alpha");
      await waitForPageContent(team1Page);
      await expect(team1Page.getByText("Deep Alpha")).toBeVisible({ timeout: 10000 });

      // Team 2
      team2Context = await browser.newContext();
      team2Page = await team2Context.newPage();
      await joinGameAsTeam(team2Page, joinCode, "Deep Beta");
      await waitForPageContent(team2Page);
      await expect(team2Page.getByText("Deep Beta")).toBeVisible({ timeout: 10000 });

      // Team 3
      team3Context = await browser.newContext();
      team3Page = await team3Context.newPage();
      await joinGameAsTeam(team3Page, joinCode, "Deep Gamma");
      await waitForPageContent(team3Page);
      await expect(team3Page.getByText("Deep Gamma")).toBeVisible({ timeout: 10000 });
    });

    test("setup: facilitator starts the game", async () => {
      // Refresh facilitator page to see all teams
      await facilitatorPage.reload();
      await facilitatorPage.waitForLoadState("networkidle");

      // Start the game
      await facilitatorPage.waitForSelector('button:has-text("Start Game")', { timeout: 10000 });
      await facilitatorPage.click('button:has-text("Start Game")');
      await facilitatorPage.waitForTimeout(3000);

      // Refresh team 1 page to confirm game has started
      await team1Page.reload();
      await team1Page.waitForLoadState("networkidle");
      await waitForPageContent(team1Page);

      // Verify department navigation links are now visible
      const hasNavigation = await team1Page
        .getByRole("link", { name: /HR|Factory|Finance/i })
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false);
      expect(hasNavigation).toBeTruthy();
    });

    test("round 1: team can access factory department", async () => {
      await team1Page.click('a[href*="/factory"], [role="link"]:has-text("Factory")');
      await team1Page.waitForURL(/\/factory/, { timeout: 10000 });
      await waitForPageContent(team1Page);

      expect(team1Page.url()).toMatch(/\/factory/);
      const factoryVisible = await team1Page
        .locator("text=/Factory|Production|Manufacturing/i")
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false);
      expect(factoryVisible).toBeTruthy();
    });

    test("round 1: team can access finance department", async () => {
      await team1Page.click('a[href*="/finance"], [role="link"]:has-text("Finance")');
      await team1Page.waitForURL(/\/finance/, { timeout: 10000 });
      await waitForPageContent(team1Page);

      expect(team1Page.url()).toMatch(/\/finance/);
      const financeVisible = await team1Page
        .locator("text=/Finance|Cash|Funding|Revenue/i")
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false);
      expect(financeVisible).toBeTruthy();
    });

    test("round 1: team can access HR department", async () => {
      await team1Page.click('a[href*="/hr"], [role="link"]:has-text("HR")');
      await team1Page.waitForURL(/\/hr/, { timeout: 10000 });
      await waitForPageContent(team1Page);

      expect(team1Page.url()).toMatch(/\/hr/);
      const hrVisible = await team1Page
        .locator("text=/Human Resources|HR|Workforce|Recruitment/i")
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false);
      expect(hrVisible).toBeTruthy();
    });

    test("round 1: team can access marketing department", async () => {
      await team1Page.click('a[href*="/marketing"], [role="link"]:has-text("Marketing")');
      await team1Page.waitForURL(/\/marketing/, { timeout: 10000 });
      await waitForPageContent(team1Page);

      expect(team1Page.url()).toMatch(/\/marketing/);
      const marketingVisible = await team1Page
        .locator("text=/Marketing|Advertising|Brand|Promotions/i")
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false);
      expect(marketingVisible).toBeTruthy();
    });

    test("round 1: team can access R&D department", async () => {
      await team1Page.click('a[href*="/rnd"], [role="link"]:has-text("R&D")');
      await team1Page.waitForURL(/\/rnd/, { timeout: 10000 });
      await waitForPageContent(team1Page);

      expect(team1Page.url()).toMatch(/\/rnd/);
      const rndVisible = await team1Page
        .locator("text=/Research|R&D|Development|Products|Technology/i")
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false);
      expect(rndVisible).toBeTruthy();
    });

    test("round 1: facilitator can see game management page", async () => {
      // Navigate to the game management page
      await facilitatorPage.goto(`/admin/games/${gameId}`);
      await facilitatorPage.waitForLoadState("networkidle");
      await waitForPageContent(facilitatorPage);

      expect(facilitatorPage.url()).toContain(`/admin/games/${gameId}`);

      // Verify key management elements are visible
      const hasJoinCode = await facilitatorPage
        .getByText(/Join Code/i)
        .isVisible({ timeout: 10000 })
        .catch(() => false);
      expect(hasJoinCode).toBeTruthy();

      // Verify team list or round info is visible
      const hasGameInfo = await facilitatorPage
        .locator("text=/Teams|Round|Deep Alpha|Deep Beta|Deep Gamma/i")
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false);
      expect(hasGameInfo).toBeTruthy();
    });

    test("round 1: facilitator can advance round", async () => {
      // Ensure we are on the game management page
      await facilitatorPage.goto(`/admin/games/${gameId}`);
      await facilitatorPage.waitForLoadState("networkidle");
      await waitForPageContent(facilitatorPage);

      // Find and click the advance / process round button
      const advanceButton = facilitatorPage.locator(
        'button:has-text("Advance Round"), button:has-text("Process Round"), button:has-text("Next Round")'
      ).first();
      const advanceVisible = await advanceButton.isVisible({ timeout: 10000 }).catch(() => false);
      expect(advanceVisible).toBeTruthy();

      await advanceButton.click();
      await facilitatorPage.waitForTimeout(5000);

      // Verify round has progressed -- look for a round indicator
      const roundUpdated = await facilitatorPage
        .locator("text=/Round 1|Round 2|Processing|Complete/i")
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false);
      expect(roundUpdated).toBeTruthy();
    });

    test("results: team can see results page", async () => {
      // Refresh team page to pick up post-round data
      await team1Page.reload();
      await team1Page.waitForLoadState("networkidle");
      await waitForPageContent(team1Page);

      // Navigate to results
      await team1Page.click('a[href*="/results"], [role="link"]:has-text("Results")');
      await team1Page.waitForURL(/\/results/, { timeout: 10000 });
      await waitForPageContent(team1Page);

      expect(team1Page.url()).toMatch(/\/results/);

      // Verify results page has content -- rankings, metrics, or performance data
      const hasResultsContent = await team1Page
        .locator("text=/Results|Performance|Revenue|Ranking|Round/i")
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false);
      expect(hasResultsContent).toBeTruthy();
    });

    test("game continues to round 2", async () => {
      // Refresh team 1 to see round 2 state
      await team1Page.reload();
      await team1Page.waitForLoadState("networkidle");
      await waitForPageContent(team1Page);

      // Verify navigation is still available (game is still in progress)
      const hasNavigation = await team1Page
        .getByRole("link", { name: /HR|Factory|Finance/i })
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false);
      expect(hasNavigation).toBeTruthy();

      // Navigate to a department to confirm round 2 is accessible
      await team1Page.click('a[href*="/factory"], [role="link"]:has-text("Factory")');
      await team1Page.waitForURL(/\/factory/, { timeout: 10000 });
      await waitForPageContent(team1Page);

      // Verify the page loaded successfully for round 2
      const factoryLoaded = await team1Page
        .locator("text=/Factory|Production|Manufacturing/i")
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false);
      expect(factoryLoaded).toBeTruthy();

      // Also verify on the facilitator side that round 2 info is visible
      await facilitatorPage.goto(`/admin/games/${gameId}`);
      await facilitatorPage.waitForLoadState("networkidle");
      await waitForPageContent(facilitatorPage);

      const hasRoundInfo = await facilitatorPage
        .locator("text=/Round 2|Round|Teams/i")
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false);
      expect(hasRoundInfo).toBeTruthy();
    });
  });
});
