// One-off runnable check for the b64uEncode stack-overflow fix (RC1).
// Run with: bun scripts/check-b64.ts
import { b64uEncode, b64uDecode } from "@/lib/backup";

// crypto.getRandomValues rejects inputs over 65,536 bytes per spec — fill large
// buffers in bounded chunks instead of one oversized call.
function randomBytes(length: number): Uint8Array {
  const buf = new Uint8Array(length);
  const CHUNK = 65536;
  for (let i = 0; i < length; i += CHUNK) {
    crypto.getRandomValues(buf.subarray(i, Math.min(i + CHUNK, length)));
  }
  return buf;
}

function assertEq(actual: unknown, expected: unknown, msg: string): void {
  if (actual !== expected) {
    throw new Error(`FAIL: ${msg} — expected ${expected}, got ${actual}`);
  }
}

// 1. Old implementation must throw past the JavaScriptCore argument limit.
function oldB64uEncode(buf: Uint8Array): string {
  return btoa(String.fromCharCode(...buf))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

let oldThrew = false;
try {
  oldB64uEncode(randomBytes(5 * 1024 * 1024));
} catch (err) {
  oldThrew = err instanceof RangeError && /Maximum call stack size exceeded/.test(err.message);
}
if (!oldThrew) {
  throw new Error("FAIL: expected the pre-fix b64uEncode to throw RangeError on a 5 MB buffer");
}
console.log("OK: pre-fix b64uEncode reproduces RangeError: Maximum call stack size exceeded");

// 2. New implementation must not throw, and must match Node's own base64url encoding.
const big = randomBytes(5 * 1024 * 1024);
const encoded = b64uEncode(big);
assertEq(encoded, Buffer.from(big).toString("base64url"), "5 MB base64url encoding");
assertEq(
  Buffer.compare(Buffer.from(b64uDecode(encoded)), Buffer.from(big)),
  0,
  "5 MB round-trip byte-identity",
);
console.log("OK: 5 MB buffer encodes without throwing and matches Buffer.toString('base64url')");

// 3. Boundary sizes around B64_CHUNK (0x8000 = 32768) must round-trip exactly.
for (const size of [0, 1, 2, 32767, 32768, 32769, 65536]) {
  const buf = crypto.getRandomValues(new Uint8Array(size));
  const roundTripped = b64uDecode(b64uEncode(buf));
  assertEq(Buffer.compare(Buffer.from(roundTripped), Buffer.from(buf)), 0, `round-trip at size ${size}`);
}
console.log("OK: sizes 0,1,2,32767,32768,32769,65536 all round-trip byte-identical");

// 4. Full AES-GCM envelope round-trip at 5 MB, using the same shape as encryptData/decryptData.
async function checkEnvelopeRoundTrip(): Promise<void> {
  const passphrase = "correct horse battery staple";
  const plaintext = randomBytes(5 * 1024 * 1024);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 600_000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );

  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext));
  const envelope = {
    format: "extrack-encrypted-backup",
    version: "1",
    algorithm: "AES-GCM",
    kdf: "PBKDF2-SHA256",
    iterations: 600_000,
    salt: b64uEncode(salt),
    iv: b64uEncode(iv),
    ciphertext: b64uEncode(ciphertext),
  };

  const decrypted = new Uint8Array(
    await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: b64uDecode(envelope.iv) },
      key,
      b64uDecode(envelope.ciphertext),
    ),
  );
  assertEq(Buffer.compare(Buffer.from(decrypted), Buffer.from(plaintext)), 0, "5 MB AES-GCM envelope round-trip");
}

await checkEnvelopeRoundTrip();
console.log("OK: 5 MB AES-GCM envelope round-trip decrypts to the original plaintext");

console.log("\nAll checks passed.");
