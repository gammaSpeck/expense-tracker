import { test, expect } from "../support/fixtures";
import { gotoApp } from "../support/app";

test.describe("settings", () => {
  test("theme switching", { tag: "@smoke" }, async ({ page }) => {
    await gotoApp(page, "/settings");

    await page.getByLabel("light").click();
    await expect(page.locator("html")).toHaveClass(/light/);
    expect(await page.evaluate(() => localStorage.getItem("expense-tracker-theme"))).toBe(
      "light",
    );

    await page.getByLabel("dark").click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    expect(await page.evaluate(() => localStorage.getItem("expense-tracker-theme"))).toBe("dark");

    await page.emulateMedia({ colorScheme: "light" });
    await page.getByLabel("system").click();
    expect(await page.evaluate(() => localStorage.getItem("expense-tracker-theme"))).toBe(
      "system",
    );
    await expect(page.locator("html")).toHaveClass(/light/);
  });

  test("currency switching", { tag: "@smoke" }, async ({ page }) => {
    await gotoApp(page, "/settings");

    await page.getByRole("button", { name: /₹.*INR/ }).click();
    await page.getByPlaceholder("Search currency...").fill("USD");
    await page.getByText("USD — US Dollar").click();

    expect(await page.evaluate(() => localStorage.getItem("expense-tracker-currency"))).toBe(
      "USD",
    );

    await page.getByRole("link", { name: "Home" }).first().click();
    await expect(page.getByText("$0", { exact: true })).toBeVisible();
  });

  test("currency search with no matches shows the empty state", async ({ page }) => {
    await gotoApp(page, "/settings");
    await page.getByRole("button", { name: /₹.*INR/ }).click();
    await page.getByPlaceholder("Search currency...").fill("zzzz");
    await expect(page.getByText("No currencies found.")).toBeVisible();
  });

  test("Data Management and About App rows navigate", async ({ page }) => {
    await gotoApp(page, "/settings");
    await page.getByRole("button", { name: "Data Management" }).click();
    await expect(page).toHaveURL(/\/settings\/data$/);

    await page.goto("/settings");
    await page.getByRole("button", { name: "About App" }).click();
    await expect(page).toHaveURL(/\/settings\/about$/);
  });
});
