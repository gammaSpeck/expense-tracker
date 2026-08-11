import { test as base, expect } from "@playwright/test";
import { installHarness } from "./app";

export const test = base.extend<{ consoleGuard: void; consoleErrorAllowlist: RegExp[] }>({
  consoleErrorAllowlist: [[], { option: true }],
  page: async ({ page }, runTest) => {
    await installHarness(page);
    await runTest(page);
  },

  consoleGuard: [
    async ({ page, consoleErrorAllowlist }, runTest, testInfo) => {
      const errors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() !== "error") return;
        const text = msg.text();
        if (consoleErrorAllowlist.some((re) => re.test(text))) return;
        errors.push(`console.error: ${text}`);
      });
      page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));

      await runTest();

      if (testInfo.status === testInfo.expectedStatus) {
        expect(errors, `unexpected console/page errors:\n${errors.join("\n")}`).toEqual([]);
      }
    },
    { auto: true },
  ],
});

export { expect };
