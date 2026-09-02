import type { Page } from "@playwright/test";

export type MockDriveHandle = {
  /** The "file" part's content from the most recent Drive upload — the raw bytes the app
   *  actually sent over the wire, not just what it intended to send. `undefined` until an
   *  upload happens. */
  lastUpload(): string | undefined;
  /** The `name` field from the most recent upload's `metadata` part — the actual filename Drive
   *  received, not just what the caller intended. `undefined` until an upload happens. */
  lastUploadName(): string | undefined;
};

/** Extracts one named part's body from a `multipart/form-data` request. Google's upload API
 *  (and `uploadFileToDrive`) sends the backup as a real multipart body via `fetch(FormData)`,
 *  so this is the only way to see what was actually uploaded — not what the caller intended. */
function extractMultipartPart(contentType: string, body: string, partName: string): string | undefined {
  const match = /boundary=(?:"([^"]+)"|([^;]+))/.exec(contentType);
  const boundary = match?.[1] ?? match?.[2];
  if (!boundary) return undefined;
  const marker = `--${boundary}`;
  for (const part of body.split(marker)) {
    if (!part.includes(`name="${partName}"`)) continue;
    const headerEnd = part.indexOf("\r\n\r\n");
    if (headerEnd === -1) continue;
    return part.slice(headerEnd + 4).replace(/\r\n$/, "");
  }
  return undefined;
}

/**
 * Mocks the full Google Drive OAuth + Files API surface used by `src/lib/driveApi.ts` and
 * `src/lib/driveAuth.ts`. Register before navigation. Local/CI only — never used against a
 * live deployment.
 */
export async function mockDrive(page: Page): Promise<MockDriveHandle> {
  let lastUploadContent: string | undefined;
  let lastUploadFilename: string | undefined;

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

  await page.route("**www.googleapis.com/upload/drive/v3/files**", (route) => {
    const req = route.request();
    const contentType = req.headers()["content-type"] ?? "";
    const body = req.postData() ?? "";
    lastUploadContent = extractMultipartPart(contentType, body, "file");
    const metadataPart = extractMultipartPart(contentType, body, "metadata");
    if (metadataPart) {
      // Written by buildMetadataBlob in src/lib/driveApi.ts — always { name, mimeType, parents? }.
      const metadata: { name: string } = JSON.parse(metadataPart);
      lastUploadFilename = metadata.name;
    } else {
      lastUploadFilename = undefined;
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "file-1",
        webViewLink: "https://drive.google.com/file/d/file-1/view",
      }),
    });
  });

  await page.route("**oauth2.googleapis.com/revoke*", (route) =>
    route.fulfill({ status: 200, contentType: "text/plain", body: "" }),
  );

  return { lastUpload: () => lastUploadContent, lastUploadName: () => lastUploadFilename };
}
