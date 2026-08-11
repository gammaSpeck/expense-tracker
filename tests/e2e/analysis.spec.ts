import { test, expect } from "../support/fixtures";
import { gotoApp, readDownload } from "../support/app";
import { seedExpenses } from "../support/db";
import { thisMonth3 } from "../support/data";

test.describe("analysis", () => {
  test("zero data shows the empty state and no chart testids", async ({ page }) => {
    await gotoApp(page, "/analysis");
    await expect(page.getByText("No expense data for this period")).toBeVisible();
    await expect(page.getByTestId("category-breakdown-chart")).toHaveCount(0);
    await expect(page.getByTestId("spending-trend-chart")).toHaveCount(0);
  });

  test("exclude-adhoc toggle changes the total, then stats/legend/charts render", async ({
    page,
  }) => {
    await gotoApp(page, "/");
    await seedExpenses(page, thisMonth3());
    await page.goto("/analysis");

    // Default: Month period, Exclude Adhoc Expenses ON.
    await expect(page.getByText("₹1,500", { exact: true })).toBeVisible();

    await page.getByLabel("Exclude Adhoc Expenses").click();
    await expect(page.getByText("₹4,000", { exact: true })).toBeVisible();

    // Now that adhoc is included, all 3 categories have a non-zero total.
    await expect(page.getByText("Total", { exact: true })).toBeVisible();
    await expect(page.getByText("Transactions", { exact: true })).toBeVisible();
    await expect(page.getByText("Average", { exact: true })).toBeVisible();
    await expect(page.getByText("Top Category", { exact: true })).toBeVisible();

    const legend = page.getByTestId("category-breakdown-legend");
    await expect(legend).toBeVisible();
    await expect(legend.getByText("Food & Dining")).toBeVisible();
    await expect(legend.getByText("₹1,000")).toBeVisible();
    await expect(legend.getByText("25.0%")).toBeVisible();
    await expect(legend.getByText("Transport")).toBeVisible();
    await expect(legend.getByText("₹500")).toBeVisible();
    await expect(legend.getByText("12.5%")).toBeVisible();
    await expect(legend.getByText("Shopping")).toBeVisible();
    await expect(legend.getByText("₹2,500")).toBeVisible();
    await expect(legend.getByText("62.5%")).toBeVisible();

    await expect(page.getByTestId("category-breakdown-chart")).toBeVisible();
    await expect(page.getByTestId("spending-trend-chart")).toBeVisible();
  });

  test("period tabs and navigation", async ({ page }) => {
    await gotoApp(page, "/");
    await seedExpenses(page, thisMonth3());
    await page.goto("/analysis");

    const prevButton = page.getByLabel("Previous period");
    const nextButton = page.getByLabel("Next period");

    await expect(prevButton).toBeVisible();
    await expect(nextButton).toBeVisible();

    await page.getByRole("tab", { name: "Week" }).click();
    const weekDisplay = await page.locator("span.font-semibold").innerText();
    await prevButton.click();
    await expect(page.locator("span.font-semibold")).not.toHaveText(weekDisplay);

    await page.getByRole("tab", { name: "Month" }).click();
    await page.getByRole("tab", { name: "Year" }).click();
    await expect(prevButton).toBeVisible();

    await page.getByRole("tab", { name: "Custom" }).click();
    await expect(prevButton).toHaveCount(0);
    await expect(page.getByText("Start Date")).toBeVisible();
    await expect(page.getByText("End Date")).toBeVisible();
  });

  test("CSV export downloads a header row plus one row per expense", async ({ page }) => {
    await gotoApp(page, "/");
    await seedExpenses(page, thisMonth3());
    await page.goto("/analysis");

    await page.getByRole("button", { name: "Export" }).click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export as CSV" }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^expenses-\d{4}-\d{2}-\d{2}\.csv$/);

    const csv = await readDownload(download);
    const lines = csv.trim().split("\n");

    expect(lines[0]).toBe("Date,Time,Category,Description,Value,Tags,IsAdhoc");
    expect(lines.length).toBe(4); // header + 3 seeded expenses
  });
});
