import { test, expect } from "@playwright/test";

test("portal login page loads", async ({ page }) => {
  await page.goto("/portal/login");
  await expect(page.getByRole("heading", { name: /employee sign in/i })).toBeVisible();
});
