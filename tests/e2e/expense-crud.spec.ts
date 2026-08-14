import { test, expect } from "../support/fixtures";
import { gotoApp, daysAgo } from "../support/app";
import { seedExpenses } from "../support/db";

test.describe("expense-crud", () => {
  test("add an expense through the real UI", { tag: "@smoke" }, async ({ page }) => {
    await gotoApp(page, "/add");

    await page.getByLabel("Amount").fill("249.50");
    await page.getByLabel("Category").click();
    await page.getByRole("option", { name: "Transport" }).click();
    await page.getByLabel("Description (optional)").fill("Airport cab");

    const tagInput = page.getByPlaceholder("Add tag");
    await tagInput.fill("work");
    await tagInput.press("Enter");
    await tagInput.fill("travel");
    await tagInput.press("Enter");

    await page.getByLabel("Adhoc Expense").click();

    await page.getByLabel("Date").click();
    // ponytail: default date is already today (RDP marks it "selected"); clicking that same
    // cell in single mode *deselects* it instead of re-picking, so just verify the popover
    // opens over today's date and dismiss without touching the value.
    await expect(page.getByRole("button", { name: /^Today,/ })).toBeVisible();
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("Expense added")).toBeVisible();
    await expect(page).toHaveURL(/\/$/);

    const card = page.getByTestId("expense-card").filter({ hasText: "Airport cab" });
    await expect(card).toBeVisible();
    await expect(card.getByText("₹249.5")).toBeVisible();
  });

  test("validation errors", async ({ page }) => {
    await gotoApp(page, "/add");

    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Amount is required")).toBeVisible();

    await page.getByLabel("Amount").fill("-5");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Must be positive")).toBeVisible();

    await page.getByLabel("Amount").fill("10000001");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Maximum 10,000,000")).toBeVisible();
  });

  test("tag cap at 4", async ({ page }) => {
    await gotoApp(page, "/add");
    const tagInput = page.getByPlaceholder("Add tag");
    for (const tag of ["one", "two", "three", "four"]) {
      await tagInput.fill(tag);
      await tagInput.press("Enter");
    }
    await expect(page.getByPlaceholder("Add tag")).toHaveCount(0);
  });

  test("edit an expense", async ({ page }) => {
    await gotoApp(page, "/");
    await seedExpenses(page, [
      { value: 100, categoryName: "Others", description: "Edit me", date: daysAgo(0), time: "10:00" },
    ]);

    await page.getByTestId("expense-card").filter({ hasText: "Edit me" }).click();
    await expect(page).toHaveURL(/\/expense\/[\w-]+$/);

    await page.getByLabel("Amount").fill("200");
    await page.getByRole("button", { name: "Update" }).click();
    await expect(page.getByText("Expense updated")).toBeVisible();

    const card = page.getByTestId("expense-card").filter({ hasText: "Edit me" });
    await expect(card.getByText("₹200")).toBeVisible();
  });

  test("delete an expense from /transactions via the context menu", async ({ page }) => {
    await gotoApp(page, "/transactions");
    await seedExpenses(page, [
      { value: 50, categoryName: "Others", description: "Delete me", date: daysAgo(0), time: "10:00" },
    ]);

    const card = page.getByTestId("expense-card").filter({ hasText: "Delete me" });
    await card.click({ button: "right" });
    await page.getByRole("menuitem", { name: "Delete" }).click();

    const dialog = page.getByRole("alertdialog");
    await expect(dialog.getByText("Delete Expense?")).toBeVisible();
    await expect(
      dialog.getByText("Are you sure you want to delete this expense? This action cannot be undone."),
    ).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(card).toBeVisible();

    await card.click({ button: "right" });
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();

    await expect(page.getByText("Expense deleted")).toBeVisible();
    await expect(page.getByTestId("expense-card")).toHaveCount(0);
    await expect(page.getByText("No transactions yet")).toBeVisible();
  });

  test("duplicate an expense via the context menu", async ({ page }) => {
    await gotoApp(page, "/transactions");
    await seedExpenses(page, [
      { value: 75, categoryName: "Others", description: "Dup me", date: daysAgo(0), time: "10:00" },
    ]);

    const card = page.getByTestId("expense-card").filter({ hasText: "Dup me" });
    await card.click({ button: "right" });
    await page.getByRole("menuitem", { name: "Duplicate" }).click();

    await expect(page).toHaveURL(/\/add$/);
    await expect(page.getByLabel("Amount")).toHaveValue("75");
    await expect(page.getByLabel("Description (optional)")).toHaveValue("Dup me");
  });
});
