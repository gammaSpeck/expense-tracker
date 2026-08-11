import { test, expect } from "../support/fixtures";
import { gotoApp } from "../support/app";
import { BASE_URL, isDeployed } from "../support/env";
import { mockDrive } from "../support/mock-drive";

test.describe("drive-oauth", () => {
  test.describe("offline error branches", () => {
    test("access_denied", { tag: "@smoke" }, async ({ page }) => {
      await page.goto("/oauth/callback?error=access_denied");
      await expect(
        page.getByText(
          "You declined Google Drive access. You can connect anytime from Settings.",
        ),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: "Back to Settings" })).toBeVisible();
    });

    test("server_error", { tag: "@smoke" }, async ({ page }) => {
      await page.goto("/oauth/callback?error=server_error");
      await expect(page.getByText("Google returned an error: server_error")).toBeVisible();
    });

    test("no authorization code", { tag: "@smoke" }, async ({ page }) => {
      await page.goto("/oauth/callback");
      await expect(
        page.getByText("No authorization code received. Please try again."),
      ).toBeVisible();
    });
  });

  test("auth URL construction", { tag: "@smoke" }, async ({ page }) => {
    await gotoApp(page, "/settings/data");

    let capturedUrl = "";
    await page.route("**accounts.google.com/o/oauth2/v2/auth*", (route) => {
      capturedUrl = route.request().url();
      return route.abort();
    });

    await page.getByRole("button", { name: "Connect" }).click();
    await expect.poll(() => capturedUrl).not.toBe("");

    const url = new URL(capturedUrl);
    expect(url.searchParams.get("redirect_uri")).toBe(`${BASE_URL}/oauth/callback`);
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("code_challenge")).toBeTruthy();
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("scope")).toContain("drive.file");
  });

  test(
    "mocked full flow: connect, backup to Drive, unlink",
    async ({ page }) => {
      test.skip(isDeployed, "mocked Drive endpoints are not exercised against deployments");

      await mockDrive(page);
      // exchangeCodeForTokens requires a PKCE verifier in sessionStorage (normally written by
      // initiateGoogleAuth before the real redirect) — seed it directly since this test jumps
      // straight to the callback.
      await page.goto("/settings/data");
      await page.evaluate(() => sessionStorage.setItem("expense-tracker-pkce-verifier", "test-verifier"));
      await page.goto("/oauth/callback?code=test-code");
      await expect(page).toHaveURL(/\/settings\/data$/);
      await expect(page.getByText("e2e@example.com")).toBeVisible();
      await expect(page.getByText("Folder:")).toBeVisible();
      await expect(page.getByText("ExTrack Backups")).toBeVisible();

      // Backups are always encrypted — set a passphrase first.
      await page.getByRole("button", { name: "Set Passphrase" }).click();
      const setupDialog = page.getByRole("dialog");
      await setupDialog.getByLabel("Passphrase", { exact: true }).fill("correcthorse123");
      await setupDialog.getByLabel("Confirm Passphrase").fill("correcthorse123");
      await setupDialog.getByRole("button", { name: "Set Passphrase" }).click();
      await expect(page.getByText("Encryption passphrase saved")).toBeVisible();

      await page.getByRole("button", { name: "Create Backup" }).first().click();
      const backupDialog = page.getByRole("dialog");
      await backupDialog.getByRole("button", { name: "Google Drive" }).click();
      await backupDialog.getByRole("button", { name: "Create Backup" }).click();
      await expect(page.getByText("Backup saved to Google Drive")).toBeVisible();

      await page.getByRole("button", { name: "Unlink" }).click();
      await page.getByRole("alertdialog").getByRole("button", { name: "Disconnect" }).click();
      await expect(page.getByText("Google Drive disconnected.")).toBeVisible();
    },
  );
});
