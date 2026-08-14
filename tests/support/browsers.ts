import { existsSync } from "node:fs";

const firstExisting = (...paths: string[]) => paths.find(existsSync);

export const BRAVE_PATH = firstExisting(
  "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
  "/usr/bin/brave-browser",
  "/opt/brave.com/brave/brave-browser",
  "/snap/bin/brave",
);

export const CHROME_INSTALLED = !!firstExisting(
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/opt/google/chrome/chrome",
);
