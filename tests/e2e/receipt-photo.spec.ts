import type { Page } from "@playwright/test";
import { test, expect } from "../support/fixtures";
import { gotoApp } from "../support/app";
import { readExpenses } from "../support/db";

const INPUT = '[data-testid="attachment-input"]';

async function openAddForm(page: Page): Promise<void> {
  await gotoApp(page, "/add");
  await page.getByLabel("Amount").fill("100");
  await page.getByLabel("Category").click();
  await page.getByRole("option", { name: "Transport" }).click();
}

/** Draws a canvas in the page, encodes it with `toBlob`, and returns the bytes. */
async function drawImage(
  page: Page,
  kind: "gradient" | "noise",
  width: number,
  height: number,
  mimeType: string,
): Promise<Buffer> {
  const base64 = await page.evaluate(
    async ({ kind, width, height, mimeType }) => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      if (kind === "gradient") {
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, "#f4f1e8");
        gradient.addColorStop(1, "#1d4ed8");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      } else {
        const image = ctx.createImageData(width, height);
        // getRandomValues fills at most 65,536 bytes per call.
        for (let i = 0; i < image.data.length; i += 65_536) {
          crypto.getRandomValues(image.data.subarray(i, i + 65_536));
        }
        for (let i = 3; i < image.data.length; i += 4) image.data[i] = 255;
        ctx.putImageData(image, 0, 0);
      }
      const encoded = Promise.withResolvers<Blob | null>();
      canvas.toBlob(encoded.resolve, mimeType, 0.9);
      const blob = await encoded.promise;
      const read = Promise.withResolvers<string>();
      const reader = new FileReader();
      reader.onload = () => read.resolve(reader.result as string);
      reader.readAsDataURL(blob!);
      const dataUrl = await read.promise;
      return dataUrl.slice(dataUrl.indexOf(",") + 1);
    },
    { kind, width, height, mimeType },
  );
  return Buffer.from(base64, "base64");
}

async function saveExpense(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Expense added")).toBeVisible();
}

/** Reads the saved expense's photo: its data URL, decoded byte size, and long edge in px. */
async function readStoredPhoto(page: Page) {
  const [expense] = await readExpenses(page);
  const attachment = expense.attachment ?? "";
  const bytes = Buffer.from(attachment.slice(attachment.indexOf(",") + 1), "base64").length;
  const longEdge = await page.evaluate(async (src) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    return Math.max(img.naturalWidth, img.naturalHeight);
  }, attachment);
  return { attachment, bytes, longEdge };
}

test.describe("receipt-photo", () => {
  test("Camera-size photo is stored as JPEG within the cap", async ({ page }) => {
    await openAddForm(page);
    const buffer = await drawImage(page, "gradient", 3000, 2000, "image/jpeg");
    await page.setInputFiles(INPUT, { name: "receipt.jpg", mimeType: "image/jpeg", buffer });

    await expect(page.getByAltText("Attachment preview")).toBeVisible();
    await saveExpense(page);

    const { attachment, bytes, longEdge } = await readStoredPhoto(page);
    expect(attachment.startsWith("data:image/jpeg;base64,")).toBe(true);
    expect(bytes).toBeLessThanOrEqual(524_288);
    expect(longEdge).toBeLessThanOrEqual(1600);
  });

  test("Photo that fits only at the floor is stored at 1200 px", async ({ page }) => {
    await openAddForm(page);
    // Measured: 3000 × 2000 noise encodes to ~790 KB at 1600 px/0.75 and ~577 KB at 1600 px/0.6
    // (both over the cap), ~307 KB at 1200 px/0.6. Only the last ladder step fits.
    const buffer = await drawImage(page, "noise", 3000, 2000, "image/png");
    await page.setInputFiles(INPUT, { name: "receipt.png", mimeType: "image/png", buffer });

    await expect(page.getByAltText("Attachment preview")).toBeVisible();
    await saveExpense(page);

    const { attachment, bytes, longEdge } = await readStoredPhoto(page);
    expect(attachment.startsWith("data:image/jpeg;base64,")).toBe(true);
    expect(bytes).toBeLessThanOrEqual(524_288);
    expect(longEdge).toBe(1200);
  });

  test("Photo over the cap at the floor is rejected", async ({ page }) => {
    await openAddForm(page);
    // 1200 × 1200 is never downscaled; random noise stays over the cap at every ladder step.
    const buffer = await drawImage(page, "noise", 1200, 1200, "image/png");
    await page.setInputFiles(INPUT, { name: "receipt.png", mimeType: "image/png", buffer });

    await expect(
      page.getByText(
        "This photo is too detailed to save under 0.5 MB. Crop closer to the receipt and try again.",
      ),
    ).toBeVisible();
    await expect(page.getByAltText("Attachment preview")).toHaveCount(0);
    await expect(page.locator(INPUT)).toHaveValue("");

    await saveExpense(page);
    const [expense] = await readExpenses(page);
    expect(expense.attachment).toBeUndefined();
  });

  test("Undecodable files show the unsupported or unreadable message", async ({ page }) => {
    await openAddForm(page);
    const buffer = Buffer.from("not an image");

    await page.setInputFiles(INPUT, { name: "receipt.heic", mimeType: "image/heic", buffer });
    await expect(
      page.getByText(
        "This browser can't open HEIC photos. Take a screenshot of the photo or save it as a JPEG, then try again.",
      ),
    ).toBeVisible();
    await expect(page.locator(INPUT)).toHaveValue("");

    await page.setInputFiles(INPUT, { name: "receipt.jpg", mimeType: "image/jpeg", buffer });
    await expect(
      page.getByText("Couldn't open this photo. Try a JPEG or PNG, or take a screenshot of it."),
    ).toBeVisible();
    await expect(page.locator(INPUT)).toHaveValue("");
  });
});
