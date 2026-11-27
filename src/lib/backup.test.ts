import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vite-plus/test";
import {
  NEWER_VERSION_MESSAGE,
  WRONG_PASSPHRASE_MESSAGE,
  b64uDecode,
  b64uEncode,
  decryptData,
  readEnvelopeVersion,
} from "@/lib/backup";
import { buildImportPreview } from "@/lib/importPreview";

const PASSPHRASE = "correcthorse123";
const TEXT = JSON.stringify({ exportDate: "2026-01-01", version: "1.0", expenses: [] });

const random = (n: number) => crypto.getRandomValues(new Uint8Array(n)) as Uint8Array<ArrayBuffer>;
const utf8 = (s: string) => new TextEncoder().encode(s) as Uint8Array<ArrayBuffer>;
const gzip = (s: string) => new Uint8Array(gzipSync(s)) as Uint8Array<ArrayBuffer>;

/** A wrapper as the app writes it, with 1,000 iterations (the reader uses the file's value). */
async function buildWrapper(opts: {
  version: string;
  passphrase: string;
  plaintext: Uint8Array<ArrayBuffer>;
  check?: boolean;
}) {
  const salt = random(16);
  const iv = random(12);
  const material = await crypto.subtle.importKey("raw", utf8(opts.passphrase), "PBKDF2", false, [
    "deriveKey",
  ]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: 1_000 },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"],
  );
  const seal = async (nonce: Uint8Array<ArrayBuffer>, bytes: Uint8Array<ArrayBuffer>) =>
    new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, bytes));
  const checkIv = random(12);
  return {
    format: "extrack-encrypted-backup",
    version: opts.version,
    algorithm: "AES-GCM",
    kdf: "PBKDF2-SHA256",
    iterations: 1_000,
    salt: b64uEncode(salt),
    iv: b64uEncode(iv),
    ciphertext: b64uEncode(await seal(iv, opts.plaintext)),
    ...(opts.check && {
      check: b64uEncode(new Uint8Array([...checkIv, ...(await seal(checkIv, utf8("extrack")))])),
    }),
  };
}

describe("decryptData", () => {
  it("restores the committed version-1 fixture", async () => {
    const fixture = readFileSync("tests/fixtures/backup-v1.extrack", "utf-8");
    const plaintext = await decryptData(fixture, "fixture-passphrase-v1");
    expect(JSON.parse(plaintext).version).toBe("1.0");
    const preview = buildImportPreview(plaintext);
    const expenses = preview?.data.expenses ?? [];
    expect(expenses.map((e) => e.description).sort()).toEqual([
      "Fixture cab",
      "Fixture lunch",
      "Fixture receipt",
    ]);
    expect(
      expenses.filter((e) => e.attachment?.startsWith("data:image/jpeg;base64,")),
    ).toHaveLength(1);
    expect(preview?.skipped).toEqual([]);
  });

  it("reads a version-2 wrapper with a passphrase check", async () => {
    const wrapper = await buildWrapper({
      version: "2",
      passphrase: PASSPHRASE,
      plaintext: gzip(TEXT),
      check: true,
    });
    await expect(decryptData(JSON.stringify(wrapper), PASSPHRASE)).resolves.toBe(TEXT);
  });

  it("rejects an unknown version before decoding any field", async () => {
    const wrapper = {
      format: "extrack-encrypted-backup",
      version: "3",
      algorithm: "AES-GCM",
      kdf: "PBKDF2-SHA256",
      iterations: 1_000,
      salt: "!!!",
      iv: "!!!",
      ciphertext: "!!!",
    };
    await expect(decryptData(JSON.stringify(wrapper), PASSPHRASE)).rejects.toThrow(
      NEWER_VERSION_MESSAGE,
    );
  });

  it("checks the passphrase before the ciphertext", async () => {
    const wrapper = await buildWrapper({
      version: "2",
      passphrase: PASSPHRASE,
      plaintext: gzip(TEXT),
      check: true,
    });
    wrapper.ciphertext = b64uEncode(random(64));
    await expect(decryptData(JSON.stringify(wrapper), "wrong-passphrase")).rejects.toThrow(
      new Error(WRONG_PASSPHRASE_MESSAGE),
    );
  });

  it("does not blame the passphrase when the check passes and the ciphertext fails", async () => {
    const wrapper = await buildWrapper({
      version: "2",
      passphrase: PASSPHRASE,
      plaintext: gzip(TEXT),
      check: true,
    });
    const bytes = b64uDecode(wrapper.ciphertext);
    bytes[0] ^= 1;
    wrapper.ciphertext = b64uEncode(bytes);
    await expect(decryptData(JSON.stringify(wrapper), PASSPHRASE)).rejects.toThrow(
      new Error("Backup could not be decrypted"),
    );
  });

  it("reports a version-2 payload that is not gzip as unpacking, not decryption", async () => {
    const wrapper = await buildWrapper({
      version: "2",
      passphrase: PASSPHRASE,
      plaintext: utf8(TEXT),
      check: true,
    });
    await expect(decryptData(JSON.stringify(wrapper), PASSPHRASE)).rejects.toThrow(
      new Error("Backup decrypted but could not be unpacked"),
    );
  });
});

describe("readEnvelopeVersion", () => {
  it("returns the version of an ExTrack wrapper and null for anything else", () => {
    const wrapper = { format: "extrack-encrypted-backup", version: "2" };
    expect(readEnvelopeVersion(JSON.stringify(wrapper))).toBe("2");
    expect(readEnvelopeVersion('{"foo":1}')).toBeNull();
    expect(readEnvelopeVersion(JSON.stringify({ ...wrapper, format: "other" }))).toBeNull();
    expect(readEnvelopeVersion(JSON.stringify({ ...wrapper, version: 2 }))).toBeNull();
    expect(readEnvelopeVersion("not json")).toBeNull();
  });
});
