import type { Page } from "@playwright/test";

/**
 * Mocks the full Google Drive OAuth + Files API surface used by `src/lib/driveApi.ts` and
 * `src/lib/driveAuth.ts`. Register before navigation. Local/CI only — never used against a
 * live deployment.
 */
export async function mockDrive(page: Page): Promise<void> {
  await page.route("**oauth2.googleapis.com/token", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        access_token: "test-access",
        refresh_token: "test-refresh",
        expires_in: 3600,
        token_type: "Bearer",
      }),
    }),
  );

  await page.route("**www.googleapis.com/oauth2/v3/userinfo", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ email: "e2e@example.com" }),
    }),
  );

  await page.route("**www.googleapis.com/drive/v3/files*", (route) => {
    if (route.request().method() === "POST") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: "folder-1", name: "ExTrack Backups" }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ files: [{ id: "folder-1", name: "ExTrack Backups" }] }),
    });
  });

  await page.route("**www.googleapis.com/upload/drive/v3/files**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "file-1",
        webViewLink: "https://drive.google.com/file/d/file-1/view",
      }),
    }),
  );

  await page.route("**oauth2.googleapis.com/revoke*", (route) =>
    route.fulfill({ status: 200, contentType: "text/plain", body: "" }),
  );
}
