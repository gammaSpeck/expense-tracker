import type { Page } from "@playwright/test";
import { test, expect } from "../support/fixtures";
import { gotoApp } from "../support/app";

const lastSeenVersion = (page: Page) =>
  page.evaluate(
    () => JSON.parse(localStorage.getItem("expense-tracker-whats-new") ?? "{}").lastSeenVersion,
  );

test.describe("whats-new", () => {
  test("a fresh install sees no dialog and is marked up to date", async ({ page }) => {
    await gotoApp(page, "/");
    await expect(page.getByText("No expenses yet. Add your first one!")).toBeVisible();
    await expect(page.getByRole("dialog", { name: "What's new" })).toHaveCount(0);
    expect(await lastSeenVersion(page)).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test("an upgrading user sees the dialog once", async ({ page }) => {
    await page.addInitScript(() => {
      const now = new Date().toISOString();
      if (!localStorage.getItem("expense-tracker-install")) {
        localStorage.setItem(
          "expense-tracker-install",
          JSON.stringify({ installedAt: now, lastSeenAt: now, lastSeenExpenseCount: 0 }),
        );
      }
      if (!localStorage.getItem("expense-tracker-whats-new")) {
        localStorage.setItem(
          "expense-tracker-whats-new",
          JSON.stringify({ lastSeenVersion: "0.0.0", lastSeenAt: now }),
        );
      }
    });
    await gotoApp(page, "/");

    const dialog = page.getByRole("dialog", { name: "What's new" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Got it" }).click();
    await expect(dialog).toHaveCount(0);
    expect(await lastSeenVersion(page)).not.toBe("0.0.0");

    await page.reload();
    await expect(page.getByText("No expenses yet. Add your first one!")).toBeVisible();
    await expect(dialog).toHaveCount(0);
  });
});
