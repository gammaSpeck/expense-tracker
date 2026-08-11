import { test, expect } from "../support/fixtures";
import { isDeployed } from "../support/env";

test.describe("security-headers", { tag: "@smoke" }, () => {
  test.skip(!isDeployed, "Netlify headers are not served by vite preview");

  test("/ response carries the documented security headers", async ({ page }) => {
    const response = await page.goto("/");
    const headers = response!.headers();

    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["permissions-policy"]).toContain("camera=()");

    const csp = headers["content-security-policy"];
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("https://oauth2.googleapis.com");
  });
});
