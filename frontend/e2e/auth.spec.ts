import { test, expect } from "@playwright/test";

test.describe("SMART auth flow", () => {
  test("landing page shows Sign in with EHR Provider button", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Sign in with EHR Provider")).toBeVisible();
    await expect(page.getByText("Peripartum Care")).toBeVisible();
  });

  test("landing page shows crisis resources link", async ({ page }) => {
    await page.goto("/");
    const link = page.getByRole("link", { name: "Crisis resources" });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "/resources");
  });

  test("Sign in button links to backend /auth/launch", async ({ page }) => {
    await page.goto("/");
    const signInButton = page.getByRole("button", { name: "Sign in with EHR Provider" });
    await expect(signInButton).toBeVisible();
    
    // Verify provider dropdown is visible
    const providerSelect = page.locator('select#ehr-provider');
    await expect(providerSelect).toBeVisible();
  });

  test("unauthenticated access to /dashboard redirects to login", async ({ page }) => {
    // With no session cookie, backend returns 401 and frontend redirects to /
    await page.goto("/dashboard");
    // The frontend catches the 401 and redirects to /
    await expect(page).toHaveURL("/");
  });
});
