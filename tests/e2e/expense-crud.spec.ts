import { test, expect } from "../support/fixtures";
import { gotoApp, daysAgo } from "../support/app";
import { readExpenses, seedExpenses } from "../support/db";

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
    // default date is already today; verify the popover opens over it and dismiss without
    // touching the value (re-clicking the selected day is covered by its own test).
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
      {
        value: 100,
        categoryName: "Others",
        description: "Edit me",
        date: daysAgo(0),
        time: "10:00",
      },
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
      {
        value: 50,
        categoryName: "Others",
        description: "Delete me",
        date: daysAgo(0),
        time: "10:00",
      },
    ]);

    const card = page.getByTestId("expense-card").filter({ hasText: "Delete me" });
    await card.click({ button: "right" });
    await page.getByRole("menuitem", { name: "Delete" }).click();

    const dialog = page.getByRole("alertdialog");
    await expect(dialog.getByText("Delete Expense?")).toBeVisible();
    await expect(
      dialog.getByText(
        "Are you sure you want to delete this expense? This action cannot be undone.",
      ),
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

  test("clicking the selected day keeps the date", async ({ page }) => {
    await gotoApp(page, "/add");
    await page.getByLabel("Amount").fill("50");
    await page.getByLabel("Date").click();
    await page.getByRole("button", { name: /^Today,/ }).click();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("Expense added")).toBeVisible();
    const [row] = await readExpenses(page);
    expect(row.date).toBe(daysAgo(0));
  });

  test("a legacy expense with an empty date lists under Unknown date", async ({ page }) => {
    await gotoApp(page, "/transactions");
    await seedExpenses(page, [
      { value: 42, categoryName: "Others", description: "Dateless", date: "", time: "10:00" },
    ]);

    await expect(page.getByRole("heading", { name: "Unknown date" })).toBeVisible();
    await expect(page.getByText("Dateless")).toBeVisible();

    await page.goto("/");
    await expect(page.getByText("Dateless")).toBeVisible();

    await page.goto("/transactions");
    await page.getByTestId("expense-card").filter({ hasText: "Dateless" }).click();
    await expect(page).toHaveURL(/\/expense\//);
    await expect(page.getByLabel("Date")).toHaveText("Pick a date");
    await page.getByRole("button", { name: "Update" }).click();
    await expect(page.locator("p", { hasText: "Pick a date" })).toBeVisible();
  });

  test("a cleared time is rejected", async ({ page }) => {
    await gotoApp(page, "/add");
    await page.getByLabel("Amount").fill("50");
    await page.getByLabel("Time").fill("");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("Pick a time")).toBeVisible();
    expect(await readExpenses(page)).toEqual([]);
  });

  test("a missing expense says so instead of loading forever", async ({ page }) => {
    await gotoApp(page, "/expense/does-not-exist/edit");
    await expect(page.getByText("This expense doesn't exist anymore.")).toBeVisible();
    await page.getByRole("button", { name: "Go to Home" }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("duplicate drops the attachment", async ({ page }) => {
    await gotoApp(page, "/transactions");
    await seedExpenses(page, [
      {
        value: 75,
        categoryName: "Others",
        description: "With receipt",
        date: daysAgo(0),
        time: "10:00",
        attachment: "data:image/png;base64,iVBORw0KGgo=",
      },
    ]);

    const card = page.getByTestId("expense-card").filter({ hasText: "With receipt" });
    await card.click({ button: "right" });
    await page.getByRole("menuitem", { name: "Duplicate" }).click();
    await expect(page).toHaveURL(/\/add$/);
    await expect(page.getByAltText("Attachment preview")).toHaveCount(0);

    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Expense added")).toBeVisible();
    const rows = await readExpenses(page);
    expect(rows).toHaveLength(2);
    expect(rows.filter((r) => r.attachment)).toHaveLength(1);
  });
});
