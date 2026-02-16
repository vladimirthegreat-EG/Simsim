import { test, expect, Page } from "@playwright/test";

// Helper to login as facilitator using actual login form
async function loginAsFacilitator(page: Page) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  // Fill login form
  await page.fill('input[type="email"], input[placeholder*="email" i]', "admin@example.com");
  await page.fill('input[type="password"]', "admin123");

  // Click sign in button
  await page.click('button[type="submit"], button:has-text("Sign In")');

  // Wait for redirect to admin
  await page.waitForURL(/\/admin/, { timeout: 15000 });
  await page.waitForLoadState("networkidle");
}

test.describe("Facilitator Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await loginAsFacilitator(page);
  });

  test("should display facilitator dashboard", async ({ page }) => {
    // Wait for page to fully load
    await page.waitForSelector("text=Facilitator Dashboard", { timeout: 15000 });
    await expect(page.getByText("Facilitator Dashboard")).toBeVisible();
  });

  test("should show welcome message", async ({ page }) => {
    await page.waitForSelector("text=Welcome", { timeout: 15000 });
    await expect(page.getByText(/Welcome/i)).toBeVisible();
  });

  test("should have create game button", async ({ page }) => {
    await page.waitForSelector("text=Create New Game", { timeout: 15000 });
    const createButton = page.getByRole("button", { name: /Create New Game/i });
    await expect(createButton).toBeVisible();
  });

  test("should have logout button", async ({ page }) => {
    await page.waitForSelector("text=Logout", { timeout: 15000 });
    const logoutButton = page.getByRole("button", { name: /Logout/i });
    await expect(logoutButton).toBeVisible();
  });
});

test.describe("Game Creation", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await loginAsFacilitator(page);
  });

  test("should open create game dialog", async ({ page }) => {
    // Wait for page to load
    await page.waitForSelector("text=Create New Game", { timeout: 15000 });

    // Click create game button
    const createButton = page.getByRole("button", { name: /Create New Game/i });
    await createButton.click();

    // Verify dialog opened
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
  });

  test("should have game name input in create dialog", async ({ page }) => {
    await page.waitForSelector("text=Create New Game", { timeout: 15000 });
    const createButton = page.getByRole("button", { name: /Create New Game/i });
    await createButton.click();

    // Wait for dialog
    await page.waitForSelector("[role=dialog]", { timeout: 5000 });

    // Look for name input by label
    await expect(page.getByLabel(/Game Name/i)).toBeVisible({ timeout: 5000 });
  });

  test("should have complexity settings in create dialog", async ({ page }) => {
    await page.waitForSelector("text=Create New Game", { timeout: 15000 });
    const createButton = page.getByRole("button", { name: /Create New Game/i });
    await createButton.click();

    // Wait for dialog
    await page.waitForSelector("[role=dialog]", { timeout: 5000 });

    // Look for complexity label
    await expect(page.getByText(/Game Complexity/i)).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Game Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await loginAsFacilitator(page);
  });

  test("should display existing games if any", async ({ page }) => {
    // Wait for page to fully load
    await page.waitForSelector("text=Your Games", { timeout: 15000 });
    await expect(page.getByText("Your Games")).toBeVisible();
  });

  test("should show stats cards", async ({ page }) => {
    // Wait for stats to load
    await page.waitForSelector("text=Total Games", { timeout: 15000 });
    await expect(page.getByText("Total Games")).toBeVisible();
    await expect(page.getByText("Active Games")).toBeVisible();
  });
});
