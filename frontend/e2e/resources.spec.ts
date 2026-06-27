import { test, expect } from "@playwright/test";

// Resources page is always accessible — no session required
test.describe("Resources page", () => {
  test("loads without authentication", async ({ page }) => {
    await page.goto("/resources");
    await expect(page).toHaveURL("/resources");
    await expect(page.getByText("Support Resources")).toBeVisible();
  });

  test("displays National Maternal Mental Health Hotline prominently", async ({ page }) => {
    await page.goto("/resources");
    await expect(page.getByText("1-833-943-5746")).toBeVisible();
    await expect(page.getByText("National Maternal Mental Health Hotline")).toBeVisible();
  });

  test("hotline number is a callable tel link", async ({ page }) => {
    await page.goto("/resources");
    const link = page.getByRole("link", { name: "1-833-943-5746" });
    await expect(link).toHaveAttribute("href", "tel:18339435746");
  });

  test("displays 988 crisis lifeline", async ({ page }) => {
    await page.goto("/resources");
    await expect(page.getByText("988")).toBeVisible();
  });

  test("displays EPDS explanation section", async ({ page }) => {
    await page.goto("/resources");
    await expect(page.getByText("About the EPDS Screening")).toBeVisible();
  });

  test("displays coping strategies", async ({ page }) => {
    await page.goto("/resources");
    await expect(page.getByText("Coping Strategies")).toBeVisible();
  });
});
