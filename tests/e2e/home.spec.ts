import { test, expect } from "../support/fixtures";
import { gotoApp } from "../support/app";
import { seedExpenses } from "../support/db";
import { thisMonth3, thisMonthNoAdhoc, twelveToday } from "../support/data";

test.describe("home", () => {
  test("thisMonth3 summary shows total and excluding-adhoc line", async ({ page }) => {
    await gotoApp(page, "/");
    await seedExpenses(page, thisMonth3());
    await expect(page.getByText("₹4,000", { exact: true })).toBeVisible();
    await expect(page.getByText("Excluding Adhoc: ₹1,500")).toBeVisible();
  });

  test("thisMonthNoAdhoc total renders with the excluding-adhoc line absent", async ({ page }) => {
    await gotoApp(page, "/");
    await seedExpenses(page, thisMonthNoAdhoc());
    await expect(page.getByText("₹300", { exact: true })).toBeVisible();
    await expect(page.getByText("Excluding Adhoc:")).toHaveCount(0);
  });

  test("twelveToday shows exactly the 10 most recent items and See All navigates", async ({
    page,
  }) => {
    await gotoApp(page, "/");
    await seedExpenses(page, twelveToday());

    await expect(page.getByTestId("expense-card")).toHaveCount(10);
    await expect(page.getByText("Item 12", { exact: true })).toBeVisible();
    await expect(page.getByText("Item 03", { exact: true })).toBeVisible();
    await expect(page.getByText("Item 01", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Item 02", { exact: true })).toHaveCount(0);

    await page.getByRole("button", { name: "See All" }).click();
    await expect(page).toHaveURL(/\/transactions$/);
  });

  test("sidebar Add Expense navigates to /add and no FAB exists", async ({ page }) => {
    await gotoApp(page, "/");
    await expect(page.getByLabel("Add expense")).toHaveCount(0);
    await page.getByRole("button", { name: "Add Expense" }).click();
    await expect(page).toHaveURL(/\/add$/);
  });
});
