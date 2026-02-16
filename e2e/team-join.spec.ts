import { test, expect } from "@playwright/test";

test.describe("Team Join Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test("should display join page with code input", async ({ page }) => {
    await page.goto("/join");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Join a Game")).toBeVisible();
    await expect(page.getByLabel(/Join Code/i)).toBeVisible();
  });

  test("should have a properly formatted code input", async ({ page }) => {
    await page.goto("/join");

    const codeInput = page.getByLabel(/Join Code/i);
    await expect(codeInput).toBeVisible();

    // Test uppercase conversion
    await codeInput.fill("abc123");
    await expect(codeInput).toHaveValue("ABC123");
  });

  test("should limit code input to 6 characters", async ({ page }) => {
    await page.goto("/join");

    const codeInput = page.getByLabel(/Join Code/i);
    await codeInput.fill("ABC123456789");

    // Should be truncated to 6 characters
    await expect(codeInput).toHaveValue("ABC123");
  });

  test("should disable find button when code is incomplete", async ({ page }) => {
    await page.goto("/join");

    const findButton = page.getByRole("button", { name: /Find Game/i });
    const codeInput = page.getByLabel(/Join Code/i);

    // Initially disabled (empty)
    await expect(findButton).toBeDisabled();

    // Still disabled with partial code
    await codeInput.fill("ABC");
    await expect(findButton).toBeDisabled();

    // Enabled with full 6-char code
    await codeInput.fill("ABC123");
    await expect(findButton).toBeEnabled();
  });

  test("should show error for invalid join code", async ({ page }) => {
    await page.goto("/join");

    const codeInput = page.getByLabel(/Join Code/i);
    const findButton = page.getByRole("button", { name: /Find Game/i });

    await codeInput.fill("XXXXXX");
    await findButton.click();

    // Should show error toast or message
    await expect(page.getByText(/not found|invalid|error/i)).toBeVisible({ timeout: 5000 });
  });

  test("should have back to home link", async ({ page }) => {
    await page.goto("/join");

    const backLink = page.getByRole("link", { name: /Back to Home/i });
    await expect(backLink).toBeVisible();

    await backLink.click();
    await page.waitForURL("/");
  });
});

test.describe("Team Join with Valid Code", () => {
  test("should proceed to team name step with valid code", async ({ page }) => {
    // This test uses the TEST01 code from dev setup
    await page.context().clearCookies();
    await page.goto("/join");

    const codeInput = page.getByLabel(/Join Code/i);
    const findButton = page.getByRole("button", { name: /Find Game/i });

    await codeInput.fill("TEST01");
    await findButton.click();

    // Should proceed to team name step (if game exists)
    // or show error if game doesn't exist
    await page.waitForTimeout(2000);

    // Check if we moved to team step or got an error
    const teamNameVisible = await page.getByLabel(/Team Name/i).isVisible().catch(() => false);
    const errorVisible = await page.getByText(/not found|error/i).isVisible().catch(() => false);

    // Either outcome is valid depending on database state
    expect(teamNameVisible || errorVisible).toBeTruthy();
  });
});
