import { test, expect } from "../support/fixtures";
import { gotoApp } from "../support/app";
import { seedExpenses } from "../support/db";
import { thisMonthWithAdhoc } from "../support/data";

test.describe("storage-persistence", { tag: "@smoke" }, () => {
  test("data survives a reload", async ({ page }) => {
    await gotoApp(page, "/");
    await seedExpenses(page, thisMonthWithAdhoc());
    await page.goto("/transactions");
    await expect(page.getByText("Showing 3 transactions")).toBeVisible();

    await page.reload();
    await expect(page.getByText("Showing 3 transactions")).toBeVisible();
  });
});
