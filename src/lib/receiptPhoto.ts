import { MAX_ATTACHMENT_BYTES } from "@/config/limits";

export type ReceiptPhotoRejection = "too-large" | "unsupported" | "unreadable";

export class ReceiptPhotoError extends Error {
  readonly reason: ReceiptPhotoRejection;

  constructor(reason: ReceiptPhotoRejection) {
    super(`Receipt photo rejected: ${reason}`);
    this.name = "ReceiptPhotoError";
    this.reason = reason;
  }
}

// Tried in order. The last step is the legibility floor: 1200 px across a 20 cm receipt is
// about 150 pixels per inch, below which small print stops being readable.
// ponytail: a long-edge cap shrinks the short edge of tall scanner crops; a pixel budget
// (about 4 MP) is the upgrade.
const LADDER = [
  { edge: 1600, quality: 0.75 },
  { edge: 1600, quality: 0.6 },
  { edge: 1200, quality: 0.6 },
] as const;

function isHeic(file: File): boolean {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  return (
    type === "image/heic" ||
    type === "image/heif" ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  );
}

function encodeJpeg(bitmap: ImageBitmap, edge: number, quality: number): Promise<Blob | null> {
  // Never upscale.
  const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  // At least 1 px: a very thin image would otherwise round its short side to 0 and fail toBlob.
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ReceiptPhotoError("unreadable");
  // White fill: transparent PNG pixels would otherwise turn black as JPEG.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  // Not Promise.withResolvers: it needs Safari 17.4 / Chrome 119, above the supported minimum.
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new ReceiptPhotoError("unreadable"));
    reader.readAsDataURL(blob);
  });
}

/**
 * Scales a picked photo down and encodes it as a JPEG data URL of at most
 * `MAX_ATTACHMENT_BYTES`. Throws `ReceiptPhotoError` when it cannot.
 */
export async function prepareReceiptPhoto(file: File): Promise<string> {
  let bitmap: ImageBitmap;
  try {
    // No options: `imageOrientation` defaults to `from-image`, which applies EXIF rotation.
    bitmap = await createImageBitmap(file);
  } catch {
    throw new ReceiptPhotoError(isHeic(file) ? "unsupported" : "unreadable");
  }

  try {
    for (const { edge, quality } of LADDER) {
      const blob = await encodeJpeg(bitmap, edge, quality);
      // Guards against a browser silently returning PNG.
      if (!blob || blob.type !== "image/jpeg") throw new ReceiptPhotoError("unreadable");
      if (blob.size <= MAX_ATTACHMENT_BYTES) return await readAsDataUrl(blob);
    }
    throw new ReceiptPhotoError("too-large");
  } finally {
    bitmap.close();
  }
}
