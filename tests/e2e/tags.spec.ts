import type { Page } from "@playwright/test";
import { test, expect } from "../support/fixtures";
import { gotoApp } from "../support/app";
import { seedExpenses } from "../support/db";
import { mixed5 } from "../support/data";

function tagRow(page: Page, tag: string) {
  return page.locator("div.rounded-xl").filter({ has: page.getByText(tag, { exact: true }) });
}

test.describe("tags", () => {
  test("mixed5 tag usage counts", async ({ page }) => {
    await gotoApp(page, "/");
    await seedExpenses(page, mixed5());
    await page.goto("/categories");
    await page.getByRole("tab", { name: "Tags" }).click();

    await expect(tagRow(page, "travel").getByText("Used in 2 expenses")).toBeVisible();
    await expect(tagRow(page, "work").getByText("Used in 2 expenses")).toBeVisible();
    await expect(tagRow(page, "cafe").getByText("Used in 1 expense", { exact: true })).toBeVisible();
    await expect(
      tagRow(page, "fitness").getByText("Used in 1 expense", { exact: true }),
    ).toBeVisible();
  });

  test("rename a tag and confirm it searches under the new name", async ({ page }) => {
    await gotoApp(page, "/");
    await seedExpenses(page, mixed5());
    await page.goto("/categories");
    await page.getByRole("tab", { name: "Tags" }).click();

    const cafeRow = tagRow(page, "cafe");
    await cafeRow.getByLabel("Rename tag").click();
    const input = page.getByRole("textbox");
    await input.fill("coffee-shop");
    await input.press("Enter");
    await expect(page.getByText('Tag renamed to "coffee-shop"')).toBeVisible();

    await page.goto("/transactions");
    await page.getByPlaceholder("Search transactions...").fill("coffee-shop");
    await expect(page.getByTestId("expense-card")).toHaveCount(1);
  });

  test("delete a tag", async ({ page }) => {
    await gotoApp(page, "/");
    await seedExpenses(page, mixed5());
    await page.goto("/categories");
    await page.getByRole("tab", { name: "Tags" }).click();

    await tagRow(page, "fitness").getByLabel("Delete tag").click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete Tag" }).click();
    await expect(page.getByText('Tag "fitness" deleted')).toBeVisible();
  });

  test("no tags shows the empty state", async ({ page }) => {
    await gotoApp(page, "/categories");
    await page.getByRole("tab", { name: "Tags" }).click();
    await expect(page.getByText("No tags created yet")).toBeVisible();
  });
});
