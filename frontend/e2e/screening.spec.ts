import { test, expect } from "@playwright/test";

// These tests assume a mocked backend session. In CI, mock the API responses.
// For local testing against a live backend, set a real session cookie first.

test.describe("EPDS screening", () => {
  test("questionnaire page loads 10 questions when authenticated", async ({ page, context }) => {
    // Set a mock session cookie (requires a corresponding mock backend in CI)
    await context.addCookies([
      {
        name: "session_id",
        value: "test-session-id",
        domain: "localhost",
        path: "/",
        httpOnly: true,
      },
    ]);

    // Mock the questionnaire API
    await page.route("**/api/screening/questionnaire", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          questions: Array.from({ length: 10 }, (_, i) => ({
            id: i + 1,
            text: `Question ${i + 1}`,
            options: [
              { value: 0, label: "Option A" },
              { value: 1, label: "Option B" },
              { value: 2, label: "Option C" },
              { value: 3, label: "Option D" },
            ],
          })),
        }),
      });
    });

    await page.goto("/screening");
    const questions = page.locator("form [type='radio']");
    await expect(questions).toHaveCount(40); // 10 questions × 4 options
  });

  test("submit button is disabled until all questions answered", async ({ page, context }) => {
    await context.addCookies([
      { name: "session_id", value: "test-session-id", domain: "localhost", path: "/" },
    ]);

    await page.route("**/api/screening/questionnaire", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          questions: Array.from({ length: 10 }, (_, i) => ({
            id: i + 1,
            text: `Question ${i + 1}`,
            options: [{ value: 0, label: "Option A" }],
          })),
        }),
      });
    });

    await page.goto("/screening");
    const submitBtn = page.getByRole("button", { name: "Submit Screening" });
    await expect(submitBtn).toBeDisabled();
  });

  test("elevated score shows risk alert with hotline", async ({ page, context }) => {
    await context.addCookies([
      { name: "session_id", value: "test-session-id", domain: "localhost", path: "/" },
    ]);

    await page.route("**/api/screening/questionnaire", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          questions: Array.from({ length: 10 }, (_, i) => ({
            id: i + 1,
            text: `Question ${i + 1}`,
            options: [{ value: 3, label: "Maximum" }],
          })),
        }),
      });
    });

    await page.route("**/api/screening/submit", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          score: 15,
          risk: "elevated",
          message: "Please contact your care team.",
          threshold: 10,
          fhir_observation_id: "obs-001",
          fhir_questionnaire_response_id: "qr-001",
        }),
      });
    });

    await page.goto("/screening");

    // Select all answers
    const options = page.locator("input[type='radio']");
    const count = await options.count();
    for (let i = 0; i < count; i++) {
      await options.nth(i).click();
    }

    await page.getByRole("button", { name: "Submit Screening" }).click();
    await expect(page.getByText("1-833-943-5746")).toBeVisible();
    await expect(page.getByText("15")).toBeVisible();
  });
});
