import { test, expect } from "../support/fixtures";
import { isDeployed } from "../support/env";

/** Parses a CSP header into `{ directive: sources[] }`. Per spec, a directive name repeated
 *  in the same policy is invalid — the browser enforces only the first occurrence and
 *  silently ignores the rest, so `.toContain()` on the raw header string can pass on a
 *  regression that the browser itself does not honor. `duplicates` surfaces that case. */
function parseCsp(header: string): { directives: Record<string, string[]>; duplicates: string[] } {
  const directives: Record<string, string[]> = {};
  const duplicates: string[] = [];
  for (const raw of header.split(";")) {
    const [name, ...sources] = raw.trim().split(/\s+/).filter(Boolean);
    if (!name) continue;
    if (name in directives) {
      duplicates.push(name);
      continue;
    }
    directives[name] = sources;
  }
  return { directives, duplicates };
}

test.describe("security-headers", { tag: "@smoke" }, () => {
  test.skip(!isDeployed, "Netlify headers are not served by vite preview");

  test("/ response carries the documented security headers", async ({ page }) => {
    const response = await page.goto("/");
    const headers = response!.headers();

    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["permissions-policy"]).toContain("camera=()");

    const { directives, duplicates } = parseCsp(headers["content-security-policy"]!);
    expect(duplicates, "duplicate CSP directives are silently ignored by the browser").toEqual([]);
    expect(directives["frame-ancestors"]).toEqual(["'none'"]);
    expect(directives["script-src"]).not.toContain("'unsafe-inline'");
    expect(directives["connect-src"]).toContain("https://oauth2.googleapis.com");
  });
});
