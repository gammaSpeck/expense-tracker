import type { Page } from "@playwright/test";
import { test, expect } from "../support/fixtures";
import { gotoApp } from "../support/app";
import { seedExpenses } from "../support/db";
import { mixed5 } from "../support/data";

async function createCategory(page: Page, name: string) {
  await page.getByRole("button", { name: "Add Category" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name").fill(name);
  await dialog.getByLabel("Dumbbell").click();
  await dialog.getByLabel("#EF4444").click();
  await dialog.getByRole("button", { name: "Create" }).click();
}

test.describe("categories", () => {
  test("create a category", { tag: "@smoke" }, async ({ page }) => {
    await gotoApp(page, "/categories");
    await createCategory(page, "Gym");
    await expect(page.getByText("Category created")).toBeVisible();
    const row = page.locator("div").filter({ hasText: /^Gym0 expenses$/ }).last();
    await expect(row).toBeVisible();
  });

  test("duplicate category name is rejected", async ({ page }) => {
    await gotoApp(page, "/categories");
    await page.getByRole("button", { name: "Add Category" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Name").fill("Others");
    await dialog.getByRole("button", { name: "Create" }).click();
    await expect(page.getByText("A category with this name already exists")).toBeVisible();
  });

  test("name over 30 characters is rejected", async ({ page }) => {
    await gotoApp(page, "/categories");
    await page.getByRole("button", { name: "Add Category" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Name").fill("a".repeat(31));
    await dialog.getByRole("button", { name: "Create" }).click();
    await expect(page.getByText("Max 30 characters")).toBeVisible();
  });

  test("edit renames a category", async ({ page }) => {
    await gotoApp(page, "/categories");
    await createCategory(page, "Gym");
    await page.getByLabel("Edit Gym").click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Name").fill("Fitness");
    await dialog.getByRole("button", { name: "Update" }).click();
    await expect(page.getByText("Category updated")).toBeVisible();
    await expect(page.getByText("Fitness", { exact: true })).toBeVisible();
  });

  test("delete an empty category", { tag: "@smoke" }, async ({ page }) => {
    await gotoApp(page, "/categories");
    await createCategory(page, "Gym");
    await page.getByLabel("Delete Gym").click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog.getByText('Delete "Gym"?')).toBeVisible();
    await expect(dialog.getByText("This action cannot be undone.")).toBeVisible();
    await dialog.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("Category deleted")).toBeVisible();
    await expect(page.getByText("Gym", { exact: true })).toHaveCount(0);
  });

  test("delete a category with expenses in move mode", async ({ page }) => {
    await gotoApp(page, "/");
    await seedExpenses(page, mixed5());
    await page.goto("/categories");

    await page.getByLabel("Delete Transport").click();
    const dialog = page.getByRole("alertdialog");
    await dialog.getByRole("combobox").click();
    await page.getByRole("option", { name: "Food & Dining" }).click();
    await dialog.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("Category deleted")).toBeVisible();

    const foodRow = page.locator("div").filter({ hasText: /^Food & Dining3 expenses$/ }).last();
    await expect(foodRow).toBeVisible();
  });

  test("delete a category with expenses in cascade mode", async ({ page }) => {
    await gotoApp(page, "/");
    await seedExpenses(page, mixed5());
    await page.goto("/categories");

    await page.getByLabel("Delete Shopping").click();
    const dialog = page.getByRole("alertdialog");
    await dialog.getByRole("radio", { name: /Delete all \d+ expenses/ }).click();
    await dialog.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("Category deleted")).toBeVisible();

    await page.goto("/transactions");
    await expect(page.getByText("Showing 3 transactions")).toBeVisible();
  });

  test("Others category cannot be deleted", async ({ page }) => {
    await gotoApp(page, "/categories");
    await page.getByLabel("Delete Others").click();
    await expect(page.getByText('The "Others" category cannot be deleted')).toBeVisible();
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
  });
});
