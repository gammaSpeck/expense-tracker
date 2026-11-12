import type { Page } from "@playwright/test";
import { test, expect } from "../support/fixtures";
import { gotoApp } from "../support/app";
import { readExpenses, seedExpenses } from "../support/db";
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
    await expect(
      tagRow(page, "cafe").getByText("Used in 1 expense", { exact: true }),
    ).toBeVisible();
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

  test("renaming onto an existing tag merges after confirmation", async ({ page }) => {
    await gotoApp(page, "/");
    await seedExpenses(page, mixed5());
    await page.goto("/categories");
    await page.getByRole("tab", { name: "Tags" }).click();

    await tagRow(page, "travel").getByLabel("Rename tag").click();
    const input = page.getByRole("textbox");
    await input.fill("work");
    await input.press("Enter");

    const dialog = page.getByRole("alertdialog");
    await expect(dialog.getByText('Merge "travel" into "work"?')).toBeVisible();
    await dialog.getByRole("button", { name: "Merge" }).click();

    await expect(page.getByText('Merged "travel" into "work"')).toBeVisible();
    await expect(tagRow(page, "work").getByText("Used in 3 expenses")).toBeVisible();
    await expect(tagRow(page, "travel")).toHaveCount(0);
    const rows = await readExpenses(page);
    expect(rows.find((r) => r.description === "Airport cab")?.tags).toEqual(["work"]);
  });

  test("cancelling a merge leaves both tags unchanged", async ({ page }) => {
    await gotoApp(page, "/");
    await seedExpenses(page, mixed5());
    await page.goto("/categories");
    await page.getByRole("tab", { name: "Tags" }).click();

    await tagRow(page, "travel").getByLabel("Rename tag").click();
    const input = page.getByRole("textbox");
    await input.fill("work");
    await input.press("Enter");
    await page.getByRole("alertdialog").getByRole("button", { name: "Cancel" }).click();

    await expect(tagRow(page, "travel").getByText("Used in 2 expenses")).toBeVisible();
    await expect(tagRow(page, "work").getByText("Used in 2 expenses")).toBeVisible();
    const rows = await readExpenses(page);
    expect(rows.find((r) => r.description === "Airport cab")?.tags).toEqual(["travel", "work"]);
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
