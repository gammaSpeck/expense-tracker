import { test, expect } from "../support/fixtures";
import { gotoApp } from "../support/app";
import { readExpenses } from "../support/db";

test.describe("csv-import", () => {
  test("MoneyManager fixture imports with mappings intact", async ({ page }) => {
    await gotoApp(page, "/settings/data");
    await page.getByTestId("csv-import-entry").click();
    await page.getByRole("button", { name: "Skip, continue" }).click();
    await page.setInputFiles(
      '[data-testid="csv-import-file-input"]',
      "tests/fixtures/money-manager-realbyte.csv",
    );

    await expect(page.getByText("Detected: MoneyManager (Realbyte)")).toBeVisible();
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("2024-06-01 10:00")).toBeVisible();

    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Next" }).click();

    await expect(page.getByTestId("csv-stat-total")).toHaveText("6");
    await expect(page.getByTestId("csv-stat-importing")).toHaveText("3");
    await expect(page.getByTestId("csv-stat-skipped")).toHaveText("2");
    await expect(page.getByTestId("csv-stat-errors")).toHaveText("1");

    await page.getByTestId("csv-import-submit").click();
    await expect(page.getByRole("main").getByText("Imported 3 expenses")).toBeVisible();

    const expenses = await readExpenses(page);
    expect(expenses).toHaveLength(3);
    expect(expenses.some((e) => e.value === 1234.56)).toBe(true);
    for (const expense of expenses) {
      expect(expense.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(expense.time).toMatch(/^\d{2}:\d{2}$/);
    }
    // "Bills " (trailing space, from the row with a trailing-space category) is stored trimmed.
    expect(expenses.some((e) => e.categoryName === "Bills")).toBe(true);
    // "Household" was not a pre-existing category — the "create" rule must have added it.
    expect(expenses.some((e) => e.categoryName === "Household")).toBe(true);
  });

  test("ISO-format fixture imports", async ({ page }) => {
    await gotoApp(page, "/settings/data");
    await page.getByTestId("csv-import-entry").click();
    await page.getByRole("button", { name: "Skip, continue" }).click();
    await page.setInputFiles(
      '[data-testid="csv-import-file-input"]',
      "tests/fixtures/expense-manager-amitm29.csv",
    );

    await expect(page.getByText("Detected: Money Manager & Expense tracker (Amit Mohan)")).toBeVisible();
    await page.getByRole("button", { name: "Next" }).click();

    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Next" }).click();

    await expect(page.getByTestId("csv-stat-total")).toHaveText("6");
    await expect(page.getByTestId("csv-stat-importing")).toHaveText("6");
    await expect(page.getByTestId("csv-stat-skipped")).toHaveText("0");
    await expect(page.getByTestId("csv-stat-errors")).toHaveText("0");

    await expect(page.getByTestId("csv-preview-row")).toHaveCount(6);
    await page.getByPlaceholder("Search preview...").fill("Pharmacy");
    await expect(page.getByTestId("csv-preview-row")).toHaveCount(1);
    await page.getByPlaceholder("Search preview...").fill("");

    await page.getByTestId("csv-import-submit").click();
    await expect(page.getByRole("main").getByText("Imported 6 expenses")).toBeVisible();

    const expenses = await readExpenses(page);
    expect(expenses).toHaveLength(6);
    const first = expenses.find((e) => e.description === "Breakfast");
    expect(first?.date).toBe("2025-01-01");
    expect(first?.time).toBe("09:00");
    for (const expense of expenses) {
      expect(expense.date).not.toBe("");
    }
  });

  test("locale amount formats classify and import correctly", async ({ page }) => {
    await gotoApp(page, "/settings/data");
    await page.getByTestId("csv-import-entry").click();
    await page.getByRole("button", { name: "Skip, continue" }).click();
    await page.setInputFiles(
      '[data-testid="csv-import-file-input"]',
      "tests/fixtures/money-manager-locale.csv",
    );

    await expect(page.getByText("Detected: MoneyManager (Realbyte)")).toBeVisible();
    await page.getByRole("button", { name: "Next" }).click();

    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Next" }).click();

    await expect(page.getByTestId("csv-stat-total")).toHaveText("9");
    await expect(page.getByTestId("csv-stat-importing")).toHaveText("6");
    await expect(page.getByTestId("csv-stat-skipped")).toHaveText("1");
    await expect(page.getByTestId("csv-stat-errors")).toHaveText("2");

    await page.getByTestId("csv-import-submit").click();
    await expect(page.getByRole("main").getByText("Imported 6 expenses")).toBeVisible();

    const expenses = await readExpenses(page);
    expect(expenses).toHaveLength(6);
    const values = expenses.map((e) => e.value).sort((a, b) => a - b);
    expect(values).toEqual([45.5, 60, 1234.56, 1234.56, 1234.56, 2500]);
  });

  test("preset ignore rules only seed for values present in the file", async ({ page }) => {
    await gotoApp(page, "/settings/data");
    await page.getByTestId("csv-import-entry").click();
    await page.getByRole("button", { name: "Skip, continue" }).click();
    await page.setInputFiles(
      '[data-testid="csv-import-file-input"]',
      "tests/fixtures/money-manager-realbyte.csv",
    );

    await expect(page.getByText("Detected: MoneyManager (Realbyte)")).toBeVisible();
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Next" }).click();

    await page.getByText("Advanced Rules").click();
    await expect(page.getByRole("button", { name: "Remove ignore rule" })).toHaveCount(1);
    await expect(page.getByText("Income", { exact: true })).toBeVisible();

    await gotoApp(page, "/settings/data");
    await page.getByTestId("csv-import-entry").click();
    await page.getByRole("button", { name: "Skip, continue" }).click();
    await page.setInputFiles(
      '[data-testid="csv-import-file-input"]',
      "tests/fixtures/money-manager-locale.csv",
    );

    await expect(page.getByText("Detected: MoneyManager (Realbyte)")).toBeVisible();
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Next" }).click();

    await page.getByText("Advanced Rules").click();
    await expect(page.getByText("Configure which rows to skip during import")).toBeVisible();
    await expect(page.getByRole("button", { name: "Remove ignore rule" })).toHaveCount(0);
  });

  test("unknown headers fall back to manual setup and the mapping gate holds", async ({ page }) => {
    await gotoApp(page, "/settings/data");
    await page.getByTestId("csv-import-entry").click();
    await page.getByRole("button", { name: "Skip, continue" }).click();
    await page.setInputFiles(
      '[data-testid="csv-import-file-input"]',
      "tests/fixtures/generic-unknown.csv",
    );

    await expect(page.getByText(/^Detected:/)).toHaveCount(0);
    await page.getByRole("button", { name: "Set up manually" }).click();

    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("Column Mapping — Step 1 of 3")).toBeVisible();
    await expect(page.getByText("Select the Amount column.")).toBeVisible();
  });

  test("selecting a second file before the first finishes parsing keeps the second file's result", async ({
    page,
  }) => {
    // Real FileReader timing on small in-memory fixtures is unreliable to race against --
    // delay the "first" file's read deterministically so it resolves after the second file's,
    // regardless of machine speed. This only fakes *ordering*; both files still parse for real.
    await page.addInitScript(() => {
      const NativeFileReader = window.FileReader;
      class DelayedFileReader extends NativeFileReader {
        readAsText(blob: Blob, encoding?: string) {
          if ((blob as File).name === "first.csv") {
            setTimeout(() => super.readAsText(blob, encoding), 50);
          } else {
            super.readAsText(blob, encoding);
          }
        }
      }
      window.FileReader = DelayedFileReader;
    });

    await gotoApp(page, "/settings/data");
    await page.getByTestId("csv-import-entry").click();
    await page.getByRole("button", { name: "Skip, continue" }).click();

    const first = "Date,Time,Amount,Category,Note\n2024-01-01,10:00,1,Food,first file marker\n";
    const second = "Date,Time,Amount,Category,Note\n2024-06-01,10:00,42,Food,second file marker\n";

    // Dispatch both native `change` events synchronously in one `page.evaluate` -- two
    // separate `setInputFiles()` calls each round-trip through CDP, which would let the
    // first selection's async work finish before the second one even starts.
    await page.evaluate(
      ([firstCsv, secondCsv]) => {
        const input = document.querySelector<HTMLInputElement>('[data-testid="csv-import-file-input"]')!;
        const selectFile = (name: string, content: string) => {
          const dt = new DataTransfer();
          dt.items.add(new File([content], name, { type: "text/csv" }));
          input.files = dt.files;
          input.dispatchEvent(new Event("change", { bubbles: true }));
        };
        selectFile("first.csv", firstCsv);
        selectFile("second.csv", secondCsv);
      },
      [first, second],
    );

    await expect(page.getByText(/replace second\.csv/)).toBeVisible();
    // Let the deliberately-delayed first-file parse finish in the background; it must not
    // overwrite second.csv's already-applied result once it resolves late.
    await page.waitForTimeout(500);
    await expect(page.getByText(/replace second\.csv/)).toBeVisible();
    await expect(page.getByText(/replace first\.csv/)).toHaveCount(0);
  });
});
