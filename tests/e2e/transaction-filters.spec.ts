import { test, expect } from "../support/fixtures";
import { gotoApp } from "../support/app";
import { seedExpenses } from "../support/db";
import { mixed5, thisMonthAndLastYear } from "../support/data";

// All non-PWA specs run under chromium-desktop only; this feature is mobile-first, so opt
// this file into a phone viewport with touch support.
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test.describe("transaction filters", () => {
  test("FAB opens sheet, category filters live", async ({ page }) => {
    await gotoApp(page, "/transactions");
    await seedExpenses(page, mixed5());

    await page.getByLabel("Filters").click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Shopping", exact: true }).click();

    await expect(dialog.getByRole("button", { name: "Show 2 transactions" })).toBeVisible();
  });

  test("chip appears and removes", async ({ page }) => {
    await gotoApp(page, "/transactions");
    await seedExpenses(page, mixed5());

    await page.getByLabel("Filters").click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Shopping", exact: true }).click();
    await dialog.getByRole("button", { name: "Show 2 transactions" }).click();
    await expect(dialog).toHaveCount(0);

    await expect(page.getByTestId("expense-card")).toHaveCount(2);
    await expect(page.getByLabel("Remove filter: Shopping")).toBeVisible();

    await page.getByLabel("Remove filter: Shopping").click();
    await expect(page.getByTestId("expense-card")).toHaveCount(5);
    await expect(page.getByLabel("Filters").locator("span")).toHaveCount(0);
  });

  test("amount bounds are inclusive", async ({ page }) => {
    await gotoApp(page, "/transactions");
    await seedExpenses(page, mixed5());

    await page.getByLabel("Filters").click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Min").fill("320");
    await dialog.getByLabel("Max").fill("1499");

    await expect(page.getByTestId("expense-card")).toHaveCount(2);
    await expect(page.getByText("Team lunch")).toBeVisible();
    await expect(page.getByText("Running shoes")).toBeVisible();
    await expect(page.getByText("Airport cab")).toHaveCount(0);
  });

  test("OR within a facet", async ({ page }) => {
    await gotoApp(page, "/transactions");
    await seedExpenses(page, mixed5());

    await page.getByLabel("Filters").click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "#travel", exact: true }).click();
    await dialog.getByRole("button", { name: "#fitness", exact: true }).click();

    await expect(page.getByTestId("expense-card")).toHaveCount(3);
  });

  test("AND across facets", async ({ page }) => {
    await gotoApp(page, "/transactions");
    await seedExpenses(page, mixed5());

    await page.getByLabel("Filters").click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "#travel", exact: true }).click();
    await dialog.getByRole("button", { name: "#fitness", exact: true }).click();
    await dialog.getByRole("button", { name: "Shopping", exact: true }).click();

    await expect(page.getByTestId("expense-card")).toHaveCount(2);
    await expect(page.getByText("Running shoes")).toBeVisible();
    await expect(page.getByText("Flight to Goa")).toBeVisible();
  });

  test("ad-hoc exclusion", async ({ page }) => {
    await gotoApp(page, "/transactions");
    await seedExpenses(page, mixed5());

    await page.getByLabel("Filters").click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Exclude Adhoc Expenses").click();

    await expect(page.getByTestId("expense-card")).toHaveCount(4);
    await expect(page.getByText("Flight to Goa")).toHaveCount(0);
  });

  test("date preset", async ({ page }) => {
    await gotoApp(page, "/transactions");
    await seedExpenses(page, thisMonthAndLastYear());

    await page.getByLabel("Filters").click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "This month", exact: true }).click();

    await expect(page.getByTestId("expense-card")).toHaveCount(1);
    await expect(page.getByText("Recent bill")).toBeVisible();
    await expect(page.getByText("Old bill")).toHaveCount(0);
  });

  test("Reset button", async ({ page }) => {
    await gotoApp(page, "/transactions");
    await seedExpenses(page, mixed5());

    await page.getByLabel("Filters").click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Shopping", exact: true }).click();
    await dialog.getByLabel("Min").fill("100");

    await dialog.getByRole("button", { name: "Reset" }).click();

    await expect(dialog.getByRole("button", { name: "Show 5 transactions" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Reset" })).toBeDisabled();
    await expect(dialog.getByRole("button", { name: "Shopping", exact: true })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  test("Clear all chip action", async ({ page }) => {
    await gotoApp(page, "/transactions");
    await seedExpenses(page, mixed5());

    await page.getByLabel("Filters").click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Shopping", exact: true }).click();
    await dialog.getByLabel("Min").fill("100");
    await dialog.getByRole("button", { name: /Show \d+ transactions?/ }).click();

    await page.getByRole("button", { name: "Clear all" }).click();

    await expect(page.getByTestId("expense-card")).toHaveCount(5);
    await expect(page.getByRole("button", { name: "Clear all" })).toHaveCount(0);
  });

  test("composes with search", async ({ page }) => {
    await gotoApp(page, "/transactions");
    await seedExpenses(page, mixed5());

    await page.getByLabel("Filters").click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Food & Dining", exact: true }).click();
    await dialog.getByRole("button", { name: /Show \d+ transactions?/ }).click();

    await page.getByPlaceholder("Search transactions...").fill("coffee");
    await expect(page.getByTestId("expense-card")).toHaveCount(1);
  });

  test("no matches", async ({ page }) => {
    await gotoApp(page, "/transactions");
    await seedExpenses(page, mixed5());

    await page.getByLabel("Filters").click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Min").fill("99999");

    await expect(page.getByText("No matching transactions")).toBeVisible();
  });

  test("resets on leaving", async ({ page }) => {
    await gotoApp(page, "/transactions");
    await seedExpenses(page, mixed5());

    await page.getByLabel("Filters").click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Shopping", exact: true }).click();
    await dialog.getByRole("button", { name: /Show \d+ transactions?/ }).click();

    await page.goto("/");
    await page.goto("/transactions");

    await expect(page.getByTestId("expense-card")).toHaveCount(5);
    await expect(page.getByText("Shopping", { exact: true })).toHaveCount(0);
    await expect(page.getByLabel("Filters").locator("span")).toHaveCount(0);
  });

  test("tag deep link (fixes TagTab.tsx:17)", async ({ page }) => {
    await gotoApp(page, "/");
    await seedExpenses(page, mixed5());
    await page.goto("/categories");
    await page.getByRole("tab", { name: "Tags" }).click();

    await page.getByRole("button", { name: "travel Used in 2 expenses" }).click();

    await expect(page).toHaveURL(/\/transactions$/);
    await expect(page.getByTestId("expense-card")).toHaveCount(2);
    await expect(page.getByText("#travel", { exact: true })).toBeVisible();
  });

  test("category deep link (new)", async ({ page }) => {
    await gotoApp(page, "/");
    await seedExpenses(page, mixed5());
    await page.goto("/categories");

    await page.getByRole("button", { name: "Shopping 2 expenses" }).click();

    await expect(page).toHaveURL(/\/transactions$/);
    await expect(page.getByTestId("expense-card")).toHaveCount(2);
    await expect(page.getByText("Shopping", { exact: true })).toBeVisible();
  });
});
