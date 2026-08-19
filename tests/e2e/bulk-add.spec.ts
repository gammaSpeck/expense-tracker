import { test, expect } from "../support/fixtures";
import { gotoApp, daysAgo } from "../support/app";
import { readExpenses } from "../support/db";

declare global {
  interface Window {
    __vibrated: number | null;
  }
}

test.describe("bulk-add", () => {
  test("two blocks on two dates save in one atomic pass", async ({ page }) => {
    await gotoApp(page, "/add/bulk");
    await expect(page.getByRole("heading", { name: "Add many" })).toBeVisible();

    const blocks = page.getByTestId("bulk-block");
    await expect(blocks).toHaveCount(1);

    const todayBlock = blocks.nth(0);
    const todayRows = todayBlock.getByTestId("bulk-row");
    await todayRows.nth(0).getByLabel("Amount").fill("120");
    await todayRows.nth(0).getByLabel("Category").click();
    await page.getByRole("option", { name: "Food & Dining" }).click();

    await todayBlock.getByRole("button", { name: "+ Add transaction" }).click();
    await expect(todayRows).toHaveCount(2);
    await todayRows.nth(1).getByLabel("Amount").fill("450");
    await todayRows.nth(1).getByLabel("Category").click();
    await page.getByRole("option", { name: "Transport" }).click();

    await page.getByRole("button", { name: "+ Add another day" }).click();
    await expect(blocks).toHaveCount(2);

    const yesterdayBlock = blocks.nth(1);
    await yesterdayBlock.getByRole("button", { name: "Yesterday" }).click();
    const yesterdayRows = yesterdayBlock.getByTestId("bulk-row");
    await yesterdayRows.nth(0).getByLabel("Amount").fill("75");
    await yesterdayRows.nth(0).getByLabel("Category").click();
    await page.getByRole("option", { name: "Others" }).click();

    const nowWindowStart = await page.evaluate(() => new Date().toTimeString().slice(0, 5));
    await page.getByRole("button", { name: "Save all" }).click();
    const nowWindowEnd = await page.evaluate(() => new Date().toTimeString().slice(0, 5));

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText("3 expenses added")).toBeVisible();

    const rows = await readExpenses(page);
    expect(rows).toHaveLength(3);
    expect(rows.filter((r) => r.date === daysAgo(1))[0].time).toBe("12:00");
    const todayRow = rows.find((r) => r.date === daysAgo(0) && r.value === 120);
    expect(todayRow).toBeDefined();
    expect([nowWindowStart, nowWindowEnd]).toContain(todayRow!.time);
  });

  test("a partially filled row blocks the save and writes nothing", async ({ page }) => {
    await gotoApp(page, "/add/bulk");
    const row = page.getByTestId("bulk-row").first();
    await row.getByLabel("Description").fill("Something");

    await page.getByRole("button", { name: "Save all" }).click();

    await expect(page.getByText("Amount is required")).toBeVisible();
    expect(await readExpenses(page)).toEqual([]);
  });

  test("a trailing blank row is dropped, not flagged", async ({ page }) => {
    await gotoApp(page, "/add/bulk");
    const block = page.getByTestId("bulk-block").first();
    const rows = block.getByTestId("bulk-row");

    await rows.nth(0).getByLabel("Amount").fill("100");
    await rows.nth(0).getByLabel("Amount").press("Enter");
    await expect(rows).toHaveCount(2);

    await page.getByRole("button", { name: "Save all" }).click();

    await expect(page).toHaveURL(/\/$/);
    const expenses = await readExpenses(page);
    expect(expenses).toHaveLength(1);
    await expect(page.getByText(/is required/)).toHaveCount(0);
  });

  test("a draft survives reload and is resumable", async ({ page }) => {
    await gotoApp(page, "/add/bulk");
    const row = page.getByTestId("bulk-row").first();
    await row.getByLabel("Amount").fill("321");
    // debounced autosave (500ms)
    await page.waitForTimeout(800);

    await page.reload();

    await expect(page.getByText("Resume your unsaved draft (1 entry)?")).toBeVisible();
    await page.getByRole("button", { name: "Resume" }).click();
    await expect(page.getByTestId("bulk-row").first().getByLabel("Amount")).toHaveValue("321");
  });

  test.describe("FAB gesture (mobile)", () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

    test("long-pressing the FAB opens bulk add, a tap still opens /add", async ({ page }) => {
      await page.addInitScript(() => {
        window.__vibrated = null;
        // `Navigator.vibrate` carries two overlapping DOM-lib overloads; a plain stub trips a
        // false-positive mismatch. Cast at this single stub-install boundary.
        const stub = ((pattern: number) => {
          window.__vibrated = pattern;
          return true;
        }) as Navigator["vibrate"];
        navigator.vibrate = stub;
      });
      await gotoApp(page, "/");

      const fab = page.getByLabel("Add expense");
      const box = await fab.boundingBox();
      if (!box) throw new Error("FAB not found");
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;

      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.waitForTimeout(600);
      await page.mouse.up();

      await expect(page).toHaveURL(/\/add\/bulk$/);
      expect(await page.evaluate(() => window.__vibrated)).toBe(15);

      await gotoApp(page, "/");
      await page.getByLabel("Add expense").click();
      await expect(page).toHaveURL(/\/add$/);
    });

    test("the FAB coach mark shows once and never returns", async ({ page }) => {
      await gotoApp(page, "/");
      await expect(page.getByText("Hold to add several at once")).toBeVisible();

      await page.getByRole("button", { name: "Dismiss" }).click();
      await expect(page.getByText("Hold to add several at once")).toHaveCount(0);

      await page.reload();
      await expect(page.getByText("Hold to add several at once")).toHaveCount(0);
    });
  });
});
