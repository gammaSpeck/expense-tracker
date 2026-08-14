import { format, parseISO } from "date-fns";
import { test, expect } from "../support/fixtures";
import { gotoApp, daysAgo } from "../support/app";
import { seedExpenses } from "../support/db";
import { mixed5 } from "../support/data";

test.describe("transactions", () => {
  test("mixed5 shows grouped headers and the correct count", async ({ page }) => {
    await gotoApp(page, "/transactions");
    await seedExpenses(page, mixed5());

    await expect(page.getByText("Showing 5 transactions")).toBeVisible();

    const fourDaysAgoLabel = format(parseISO(daysAgo(4)), "EEEE, d MMM");
    const todayHeader = page.getByRole("heading", { name: "Today", exact: true });
    const yesterdayHeader = page.getByRole("heading", { name: "Yesterday", exact: true });
    const olderHeader = page.getByRole("heading", { name: fourDaysAgoLabel, exact: true });

    await expect(todayHeader).toBeVisible();
    await expect(yesterdayHeader).toBeVisible();
    await expect(olderHeader).toBeVisible();

    await expect(todayHeader.locator("..").getByTestId("expense-card")).toHaveCount(2);
    await expect(yesterdayHeader.locator("..").getByTestId("expense-card")).toHaveCount(1);
    await expect(olderHeader.locator("..").getByTestId("expense-card")).toHaveCount(2);
  });

  test("singular pluralization with one seeded row", async ({ page }) => {
    await gotoApp(page, "/");
    await seedExpenses(page, [
      { value: 100, categoryName: "Others", description: "Solo expense", date: daysAgo(0), time: "10:00" },
    ]);
    await page.goto("/transactions");
    await expect(page.getByText("Showing 1 transaction", { exact: true })).toBeVisible();
  });

  test("search filters by description, category name, and tag", async ({ page }) => {
    await gotoApp(page, "/transactions");
    await seedExpenses(page, mixed5());

    const search = page.getByPlaceholder("Search transactions...");

    await search.fill("coffee");
    await expect(page.getByTestId("expense-card")).toHaveCount(1);

    await search.fill("Shopping");
    await expect(page.getByTestId("expense-card")).toHaveCount(2);

    await search.fill("travel");
    await expect(page.getByTestId("expense-card")).toHaveCount(2);

    await search.locator("..").getByRole("button").click();
    await expect(page.getByTestId("expense-card")).toHaveCount(5);

    await search.fill("zzzz");
    await expect(page.getByText("No matching transactions")).toBeVisible();
  });

  test("empty state with zero expenses", async ({ page }) => {
    await gotoApp(page, "/transactions");
    await expect(page.getByText("No transactions yet")).toBeVisible();
  });
});
