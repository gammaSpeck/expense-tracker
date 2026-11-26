# Smaller Encrypted Backups and Bounded Receipt Photos

- **Author:** gammaSpeck
- **Status:** Draft
- **Date:** 2026-11-24

---

## Overview

ExTrack keeps all data in the browser. It offers encrypted backups that are
saved to the device or uploaded to Google Drive. The backup is encrypted with a
key derived from the user's passphrase, so Google cannot read it. This
end-to-end encryption stays unchanged.

This design changes three things and removes one:

1.  **Backup format version 2.** The backup contents are compressed with gzip
    before encryption. The outer JSON wrapper, the `.extrack` extension and the
    Drive file type stay the same. Only the `version` field changes, from `"1"`
    to `"2"`.
2.  **A restore size rule.** The app will warn when it writes a backup that it
    would refuse to restore. One shared constant, `MAX_RESTORE_FILE_BYTES`,
    holds the limit for both backup and restore.
3.  **A built-in receipt photo pipeline.** Photos are resized and converted to
    JPEG with browser APIs (`createImageBitmap`, canvas, `toBlob`), capped at
    1 MB. The `browser-image-compression` dependency is removed.
4.  **The "Encrypt this export" toggle is removed.** Exports become plain JSON
    or CSV only. Encrypted files come only from Backup.

Photos stay inside the single encrypted backup file (option A in the brainstorm
brief). Splitting photos into separate files is recorded as a later upgrade
path, not part of this release.

## The Problem

**Backup files are larger than they need to be.** Today `src/lib/backup.ts`
builds a backup in four steps: write the data as indented JSON, encrypt it with
AES-GCM, convert the encrypted bytes to base64 text (33% larger), and wrap that
text in a second indented JSON object. The owner's 1,987 expenses make a file of
about 1,009 KB on synthetic data of that size. Encrypted bytes look random and
cannot be compressed, so the only place compression helps is before encryption.
Measured on the same data, gzip before encryption gives about 144–150 KB, which
is about 7 times smaller.

**The app can write a backup it then refuses to restore.** Restore rejects any
file over 10 MB (`src/lib/importPreview.ts:72`) before reading it. Backup never
checks its own file size. Receipt photos are what push a file over: each photo
is stored as base64 text inside its expense, and the backup base64-encodes it a
second time. A 0.5 MB photo costs about 0.9 MB in the backup, so about 11 photos
exceed the limit. After this change each photo is capped at 1 MB, which costs
about 1.33 MB in the backup, so 7 to 8 photos are enough. The backup uploads to
Drive without complaint and then cannot be restored when the user needs it. The
rows are lost along with the optional photos. Gzip does not fix this, because
gzip shrinks photo text by only about 25% and the outer base64 adds that back.

**Receipt photo size is not bounded.** The current library
(`browser-image-compression` 2.0.2, last released 2023-03-06) aims for 0.5 MB
but keeps whatever it produces after 10 attempts, even when that is larger. It
also tries to load a background worker from `cdn.jsdelivr.net`, which the site's
content-security-policy and offline use prevent.

**Proposed solution.** Treat one rule as the core of the change: _every backup
this app writes, this app can restore._ The restore limit moves to
`src/config/limits.ts` and backup warns when its finished file is over it.
Gzip (backup format version 2) shrinks the rows. A built-in photo pipeline
bounds each photo at 1 MB, and the app rejects a photo it cannot fit under that
bound. The version-2 reader rejects versions it does not know, with a clear
message, so the next format change fails clearly in this release.

## Goals

- **Every backup restores.** Backup compares its finished file size against
  `MAX_RESTORE_FILE_BYTES` (50 MiB, the same value as `MAX_CSV_FILE_BYTES`)
  and shows a warning when it is over. A backup is never refused for size.
  Restore checks the same constant before reading the file.
- **Smaller backups for row data.** A backup of 1,987 rows drops from about
  1,009 KB to about 150 KB (synthetic data, measured in the brainstorm). The
  plain JSON export and `buildBackupEnvelope` stay unchanged.
- **Backup version 2 is defined exactly.** The wrapper keeps
  `format: "extrack-encrypted-backup"` and becomes `version: "2"`. The
  ciphertext is `base64url(AES-GCM(gzip(UTF-8 JSON)))`. The inner payload keeps
  `version: "1.0"`.
- **Unknown versions fail clearly.** The reader accepts `"1"` and `"2"`. Any
  other value stops before the 600,000-iteration key derivation with: "This
  backup was made by a newer version of ExTrack. Close and reopen the app to
  update."
- **Version-1 backups keep restoring.** This includes encrypted JSON exports
  made earlier. An automated test restores a version-1 `.extrack` file that was
  committed before the writer changed.
- **Gzip failures are not reported as a wrong passphrase.** Decompression runs
  after the AES-GCM `try` block and throws its own error. The automatic
  stored-passphrase path returns `null` only for a wrong passphrase.
- **Photos are bounded.** Every new photo is stored as JPEG of at most
  `1024 * 1024` bytes, measured on the JPEG `Blob` before base64 conversion. A
  photo that cannot meet this is not attached. The expense still saves without
  it, the user sees one of three messages (too large, unsupported format,
  unreadable image), and the file input is cleared so the same file can be
  picked again.
- **`browser-image-compression` is removed** from `package.json` and the code.
- **The export toggle is removed.** `useExportAction` becomes
  `useExportAction(formatType, onDone)`.
- **Safe rollback.** The version-2 reader and the version-2 writer land as
  separate commits in the same release, reader first. Reverting the writer
  commit alone leaves an app that still reads version-2 files.
- **Measurable triggers.** Telemetry records backup size, photo counts, photo
  rejections and decompression failures so most of the revisit triggers (a
  backup over half the restore limit, a failed Drive upload, 30–50 photos) can
  be seen. A restore that crashes the tab sends no event, so that trigger stays
  invisible.

## Non-Goals

- Recompressing photos that are already stored.
- A separate tool for migrating old backups. Restoring an old backup and then
  taking a new one already converts it.
- Restoring directly from Google Drive.
- Compressing plain exports. Excel and Google Sheets cannot open `.csv.gz`.
- A dedicated "update the app" message for old app versions that open a version
  2 file. Already-shipped code cannot be changed.
- Splitting photos into separate files (options B, C, E) or into sealed
  compartments (option D) in this release.
- Resumable Drive upload, and deleting old Drive backups, until telemetry or a
  manual 6 MB upload test shows a need.
- A size limit on `attachment` in the database record rules
  (`expenseRecordSchema`).
- Changing the Drive file type (`application/json`), the filename pattern, the
  key derivation or its iteration count.
- HEIC decoding on non-Apple devices.
- A fallback that writes version 1 when `CompressionStream` is missing.
- A separate limit on decompressed size.
- Padding backups to hide their size.
- Recording successful restores in telemetry. Only failures are recorded.
- Keeping the old photo when its replacement is rejected. The form hides the
  file input while a photo is attached, so replacing a photo already means
  removing it first. A "Replace" control is a separate change.

## Open Questions

- **Does Drive multipart upload accept a file over 5 MB?** Google's guidance
  says multipart is for files of 5 MB or less. Nobody has checked whether a
  larger request fails. Resolved by uploading one real backup of 6 MB or more
  by hand before release. If it fails, switch to resumable upload.
- **How much memory does restore need at 50 MiB on the oldest supported
  phone?** Restore holds several full copies of the file at once (outer JSON
  parsed twice, base64 decode, decrypt, decompress, parse). The 50 MiB value
  was chosen to match `MAX_CSV_FILE_BYTES`, not measured. A crash loses no
  data, because the restore write is one Dexie transaction, but the rows would
  not come back on that device.
- **Do receipt photos come out sideways on the oldest supported Chrome?** The
  photo pipeline calls `createImageBitmap(file)` without options and relies on
  the default, which the current HTML spec sets to `from-image` (apply the EXIF
  rotation). MDN's compatibility data lists that value from Chrome 112, Firefox
  111 and Safari 16. The brief sets the minimum at Chrome 80. On Chrome 80–111
  the default may ignore the rotation, so a portrait photo could be stored
  sideways [INFERENCE: not tested]. Passing `imageOrientation: "from-image"`
  explicitly is not an option, because browsers that lack the value would
  reject every photo. Resolved by testing a rotated JPEG in the oldest Chrome
  the owner cares about, or by raising the Chrome minimum to 112.

## Critical User Journeys (CUJs)

### CUJ 1: Save a backup to the device

- **Given**: A passphrase is set. The browser holds expenses, some with
  receipt photos.
- **When**: The user opens Settings → Data → Create Backup and chooses Save to
  device.
- **Then**: The browser downloads `extrack-backup-yyyy-MM-dd.extrack`. Its
  wrapper has `version: "2"`. A backup of 1,987 rows with no photos is about
  150 KB. `backup_succeeded` records `target`, `expenseCount`,
  `attachmentCount` and `bytes`. If the file is over `MAX_RESTORE_FILE_BYTES`,
  the file is still saved and a warning says this app cannot restore it.

### CUJ 2: Restore a version-1 or version-2 backup

- **Given**: A `.extrack` file made by ExTrack 1.9.x (version 1), by this
  release (version 2), or an encrypted JSON export made earlier with the old
  toggle (version 1).
- **When**: The user picks the file in the Import flow. The stored passphrase
  is tried first. If none is stored or it does not match, the user types one.
- **Then**: The preview shows counts as it does today. Confirming writes
  everything in one Dexie transaction. A file over `MAX_RESTORE_FILE_BYTES` is
  refused before it is read.

### CUJ 3: Open a backup from a newer ExTrack

- **Given**: A `.extrack` whose wrapper says `version: "3"` (or any value other
  than `"1"` and `"2"`).
- **When**: The user picks the file.
- **Then**: Key derivation does not run. The user sees "This backup was made by
  a newer version of ExTrack. Close and reopen the app to update." and the file
  input is reset. If no passphrase is stored on the device, the passphrase
  prompt appears first and the message follows after the user submits it (see
  Known limitations).

### CUJ 4: Attach a receipt photo

- **Given**: The expense form is open and no photo is attached.
- **When**: The user picks a 12-megapixel camera photo.
- **Then**: The photo is scaled so its long edge is at most 2048 px, encoded as
  JPEG, and stored as a data URL of at most 1 MB of JPEG bytes. The preview
  appears.

### CUJ 5: Pick a photo that cannot be stored

- **Given**: The expense form is open and no photo is attached.
- **When**: The user picks a photo that is still over 1 MB after the last
  resize attempt, a HEIC file the browser cannot decode, or a damaged file.
- **Then**: A message names the cause, no photo is attached, the file input is
  cleared, and the expense can still be saved. `attachment_rejected` records
  the reason.

### CUJ 6: Export plain data

- **Given**: Any app state.
- **When**: The user opens Export Data.
- **Then**: The dialog shows only the Format choice (JSON or CSV). The download
  is a plain `.json` or `.csv`. No `.extrack` file comes from Export.

## Technical Plan (Architecture)

### 1. Backup file format (version 2)

| Field                                          | Version 1                                                 | Version 2                              |
| ---------------------------------------------- | --------------------------------------------------------- | -------------------------------------- |
| `format`                                       | `"extrack-encrypted-backup"`                              | unchanged                              |
| `version`                                      | `"1"`                                                     | `"2"`                                  |
| `algorithm`, `kdf`, `iterations`, `salt`, `iv` | AES-GCM, PBKDF2-SHA256, 600,000, 16-byte salt, 12-byte IV | unchanged                              |
| `ciphertext`                                   | `base64url(AES-GCM(UTF-8 JSON))`                          | `base64url(AES-GCM(gzip(UTF-8 JSON)))` |
| Inner payload                                  | `{ exportDate, version: "1.0", expenses, categories }`    | unchanged                              |

There is no `compression` field: version 2 means gzip. `format` stays the same
because `isEncryptedFile` tests it, and a changed value would make the new app
reject its own files. The inner payload stays `"1.0"` because the plain JSON
export shares it, so `buildBackupEnvelope` is not touched. gzip makes the
indentation in the inner JSON irrelevant (150 KB with it, 144 KB without).

### 2. Read path

```text
file picked
 ├─ validateImportFile: file.size > MAX_RESTORE_FILE_BYTES → "File too large (max 50 MB)"
 ├─ file.text(); isEncryptedFile (format check)
 └─ decryptWithStoredPassphrase(text)  |  decryptData(text, typedPassphrase)
      ├─ parse wrapper; check format
      ├─ check version: "1" | "2"; else BackupReadError("version")   ← before key derivation
      ├─ derive key (iterations read from the file)
      ├─ AES-GCM decrypt ── fails → BackupReadError("wrong-passphrase")
      ├─ version "2": gunzip ── fails → BackupReadError("decompress")  ← outside the decrypt try
      └─ UTF-8 decode → resolvePlaintext → buildImportPreview → confirm → one Dexie transaction
```

`src/lib/backup.ts` gains one exported error class, `BackupReadError`, with a
`reason` of `"wrong-passphrase"`, `"version"` or `"decompress"`. Distinct
reasons fix two problems in the current code:

- `decryptData` reports any failure inside its `try` block as "Wrong
  passphrase — decryption failed" (`backup.ts:166-171`). Gunzip runs after that
  block, so a damaged gzip stream cannot be reported as a wrong passphrase.
- `decryptWithStoredPassphrase` currently turns every error into `null`
  (`backup.ts:183-190`). It will return `null` only for
  `BackupReadError("wrong-passphrase")` and re-throw everything else.

Gzip and gunzip are private helpers in `backup.ts` built on `CompressionStream`
and `DecompressionStream`. There is no limit on decompressed size: only the
passphrase holder can produce a valid file, so the only "decompression bomb" is
the user's own data, and the file-size limit still applies.

**Changes to `useEncryptedFileImport.ts`:**

- The automatic path (`performFileSelect`) has no `try/catch` around
  `decryptWithStoredPassphrase` today. It gains one. On an error it calls
  `captureError("import_failed", err, { stage })`, shows the message below and
  resets the file input. `stage` is `"decompress"` for a decompress error and
  `"decrypt"` for everything else, which keeps today's tag for the existing
  paths.
- Behaviour change: a file with a damaged wrapper (for example, invalid base64
  in `salt`) used to fall through to the passphrase prompt and then fail with
  "The file may be corrupted". It now fails at once with that message.
- The manual path (`performManualDecrypt`) resets the pending file and the
  file input on a `"version"` or `"decompress"` error, since typing another
  passphrase cannot help.
- `decryptErrorMessage` maps by `reason`:

  | Reason             | Message                                                                                   |
  | ------------------ | ----------------------------------------------------------------------------------------- |
  | `wrong-passphrase` | "Wrong passphrase — try again" (unchanged)                                                |
  | `version`          | "This backup was made by a newer version of ExTrack. Close and reopen the app to update." |
  | `decompress`       | "This backup unlocked but could not be unpacked. The file may be damaged."                |
  | anything else      | "Decryption failed. The file may be corrupted." (unchanged)                               |

- `rejectNonBackupPlaintext` text becomes: "This file is an encrypted CSV
  export from an older version and can't be restored." Only an old encrypted
  CSV export can reach this branch, because the toggle that made it is gone.

### 3. Write path

```text
Create Backup → exportAllData → createEncryptedBackupFile(data)
   passphrase = getStoredPassphrase()            (throws "No encryption passphrase set" if none)
   json       = buildBackupEnvelope(data)        (unchanged)
   encrypted  = encryptData(json, passphrase)    gzip → AES-GCM → base64url → wrapper v2
   stats      = { expenseCount, attachmentCount, bytes }
 → saveBackupToDevice | uploadBackupToDrive      (capture backup_succeeded with stats)
 → if stats.bytes > MAX_RESTORE_FILE_BYTES: warning toast
```

- `encryptData(plaintext, passphrase)` takes the passphrase as a parameter. The
  "No encryption passphrase set" check moves to `createEncryptedBackupFile`,
  which is the only caller once the export toggle is gone. A Node unit test can
  then run a full round trip. `idb-keyval` opens its database only on first
  use, and `backup.ts` imports under Bun without IndexedDB (checked while
  drafting), so no IndexedDB mock is needed.
- `bytes` is `encrypted.length`. The wrapper is plain ASCII (base64url fields,
  fixed strings, numbers), so characters equal bytes.
- The warning appears after a successful save or upload, as a second toast. It
  states the file size, the limit, and that the backup was saved but this app
  will refuse to restore it. It stays up for 15 seconds. Backup is never
  refused for size.
- The wrapper stays 2-space indented JSON (`JSON.stringify(envelope, null,
  2)`). Changing it saves a few hundred bytes and is not part of this design.

### 4. Restore size rule

`MAX_RESTORE_FILE_BYTES = 50 * 1024 * 1024` is added to `src/config/limits.ts`
next to `MAX_CSV_FILE_BYTES` and exported through the existing `@/config`
barrel. `validateImportFile` in `src/lib/importPreview.ts` reads the constant,
and its message is built from it. Backup compares its finished file to the same
constant, so the two can never disagree. At about 1.33 MB per photo, roughly 37
photos reach the limit. The value is not yet tied to a measurement of restore
memory (see Open Questions).

### 5. Receipt photo pipeline

New module `src/lib/receiptPhoto.ts` exports `prepareReceiptPhoto(file)`, which
returns a JPEG data URL or throws `ReceiptPhotoError` with a `reason` of
`"too-large"`, `"unsupported"` or `"unreadable"`.

```text
file
 └─ createImageBitmap(file)  ── rejects ─┬─ HEIC/HEIF by file.type or extension → "unsupported"
                                         └─ otherwise                          → "unreadable"
 └─ for each rung in [ (2048 px, q 0.75), (2048 px, q 0.60), (1600 px, q 0.70) ]
       scale = min(1, rungEdge / longEdge)            never upscales
       canvas: fill white, drawImage(bitmap) at scaled size
       canvas.toBlob("image/jpeg", q)
       blob null or blob.type ≠ "image/jpeg"           → "unreadable"
       blob.size ≤ MAX_ATTACHMENT_BYTES                → read as data URL, return
 └─ no rung fits                                       → "too-large"
 bitmap.close() in a finally block
```

- `MAX_ATTACHMENT_BYTES = 1024 * 1024` is added to `src/config/limits.ts` and
  is measured on `blob.size` before base64 conversion.
- The white fill matters because a transparent PNG would otherwise turn black
  when encoded as JPEG.
- The `blob.type` check guards against a browser silently returning PNG when it
  cannot encode the requested type.
- The HEIC test runs only after decode fails, so Safari, which can decode HEIC,
  still succeeds. Checking the extension as well as `file.type` covers browsers
  that report an empty type for `.heic` files.
- A long-edge limit squeezes tall scanner crops. A pixel budget of about 4 MP
  would not. Camera photos are 4:3 or 16:9 whatever the receipt's shape, so
  this matters only for scanner crops, and the ladder stays as decided.
- `useImageAttachment.handleImageUpload` calls `prepareReceiptPhoto`. On
  success it sets `attachment` and the preview. On failure it clears the file
  input (`input.value = ""`, captured before the first `await`), shows the
  message for the reason, and records `attachment_rejected { reason }`.

| Reason        | Message                                                                                                     |
| ------------- | ----------------------------------------------------------------------------------------------------------- |
| `too-large`   | "This photo is too detailed to save under 1 MB. Crop closer to the receipt and try again."                  |
| `unsupported` | "This browser can't open HEIC photos. Take a screenshot of the photo or save it as a JPEG, then try again." |
| `unreadable`  | "Couldn't open this photo. Try a JPEG or PNG, or take a screenshot of it."                                  |

**What "reject" does and does not touch.**

- The limit lives only in the upload path. `expenseRecordSchema.attachment`
  stays `z.string().startsWith("data:image/")`. A size rule there would block
  editing any expense that already holds a large photo, because an edit
  re-validates every field (`useExpenseFormController.ts:67`,
  `expenseTrackerDb.ts:105-108`). It would also make `keepValid`
  (`importPreview.ts:17-23`) drop whole expenses on restore.
- Stored photos are not recompressed.
- The brief says "a photo already attached stays". In the current UI that case
  cannot occur: `AttachmentField.tsx:14-41` renders the file input only when no
  photo is attached. A user replaces a photo by tapping Remove first, and that
  already clears `attachment` in the form. A rejection therefore leaves the
  form as it was (no photo), and the old photo is lost only if the user had
  already tapped Remove. This design does not change that (see Non-Goals).

### 6. Export toggle removal

- `useExportAction(formatType, onDone)` no longer imports `encryptData`. It
  always downloads plain content with its original name and MIME type.
  `export_failed` loses its `encrypted` property.
- `ExportData.tsx` drops the `encrypt` state, `usePassphraseGate` and
  `SetupPassphraseDialog`. `BackupData.tsx` still uses both.
- `ExportDialogContent.tsx` drops the `encrypt` and `setEncrypt` props and the
  `EncryptToggleRow`. `EncryptToggleRow.tsx` is deleted.
- The e2e helper `exportEncrypted` (set a passphrase, take an encrypted file)
  switches to Backup → Save to device and is renamed `backupToDevice`.

### 7. Google Drive

- `application/json` stays. `findExistingFile` finds and replaces a same-day
  backup only by `mimeType = 'application/json'` (`driveApi.ts:94-96`), and
  `buildMetadataBlob` sets that type. Version 2 keeps the JSON wrapper, so it
  stays accurate. A code comment will say so. The e2e Drive mock answers every
  query with the folder, so tests would never catch a mismatch.
- Multipart upload stays. A manual upload of one real backup of 6 MB or more
  must succeed before release. If it fails, switch to resumable upload (one
  extra request, about 20 lines).
- Drive storage grows as photos × number of backups, because nothing deletes
  old backups. A "keep the newest N" clean-up is deferred until measured.

### 8. Telemetry

Counts and error strings only, as `src/lib/telemetry.ts` requires.

| Event                 | Change                                                                       |
| --------------------- | ---------------------------------------------------------------------------- |
| `backup_succeeded`    | Adds `bytes` and `attachmentCount` to `target` and `expenseCount`.           |
| `attachment_rejected` | New. `{ reason: "too-large" \| "unsupported" \| "unreadable" }`.             |
| `import_failed`       | Gains `stage: "decompress"`. Existing `stage: "decrypt"` and `"write"` stay. |
| `export_failed`       | Drops `encrypted`.                                                           |

### 9. Security note: compress before encrypt

Compression attacks such as CRIME and BREACH need an attacker who can mix chosen
text with a secret and watch sizes repeatedly. Here the only party that sees the
file is Google, which sees one size per backup, and no outsider can write into
the user's data between backups. The passphrase and Drive tokens are not in the
backup. Version 1 already reveals the exact plaintext length. Padding is not
needed.

### 10. Browser support

`CompressionStream` needs Chrome 80, Firefox 113 and Safari/iOS 16.4. There is no
fallback to writing version 1: a fallback means two writer paths to keep
forever. A `ponytail:` comment next to the gzip helpers records the floor. The
photo pipeline already assumes Safari 16 or newer.

### 11. Rollout and commit order

```text
PR 1  fix   MAX_RESTORE_FILE_BYTES + backup-time warning            ← removes today's data-loss risk
PR 2  feat  remove export toggle; e2e restore tests → Backup → device
PR 3  feat  (a) reader: v1 fixture + tests, version check, BackupReadError,
                 encryptData(plaintext, passphrase)
            (b) writer: gzip, version "2", telemetry fields
PR 4  feat  photo pipeline, MAX_ATTACHMENT_BYTES, telemetry, remove dependency, e2e photo tests
```

- PR 2 comes before PR 3 because `encryptData` then has one caller, so gzip goes
  straight in with no flag. The five e2e restore tests in
  `tests/e2e/data-management.spec.ts` (lines 97, 139, 162, 189, 252) call
  `exportEncrypted`. They must move to Backup → Save to device, or they keep
  passing while testing version 1.
- In PR 3, commit (a) lands before commit (b). A rollback is then
  `git revert` of commit (b) only. If the whole change were reverted, every
  backup made in between would become unrestorable.
- Generate the version-1 fixture from `main` before commit (b), with synthetic
  data and a known passphrase. Nothing tests version-1 restore after version 2
  ships, because every e2e restore test builds its file with the current app.
- Commit (a) also needs a version-2 read test. The writer does not exist yet,
  so the test builds a version-2 file by hand with WebCrypto, using a low
  iteration count (the reader uses the `iterations` stored in the file).
- The release is 1.10.0, with `feat` and `fix` commits and no `feat!`, so
  release-please does not bump to 2.0.0. Release notes are plain language and
  do not say "gzip" or "version 2".

### Known limitations

- If no passphrase is stored on the device, a version-3 file first shows the
  passphrase prompt and only then the "newer version" message, because the
  version check lives in `decryptData`. Checking at file selection would need a
  second function and is not included.
- Old app versions that open a version-2 file show the false message "This file
  is an encrypted export, not a restorable backup". Shipped code cannot change.
- Version 2 is all-or-nothing, like version 1: one damaged byte fails every row
  along with every photo. Each day's backup is a separate dated file and older
  files are not deleted, so earlier backups remain as a fallback. Options D
  (two sealed compartments in one file) and E (a separate photos file) are the
  recorded upgrade paths. Triggers to revisit: a real backup over half of
  `MAX_RESTORE_FILE_BYTES`, a Drive upload failing for size, a restore crashing
  a tab, or the owner passing about 30–50 photos.

## Alternatives Considered

Letters below name alternatives in this document only. The brainstorm brief's own
option names (A, A+, B, C, D, E for photo placement) appear in the titles.

### Alternative A: Compress the finished `.extrack` file

- **Pros**: No change to the encryption step.
- **Cons**: Encrypted bytes look random and do not compress. Only the base64
  overhead (33%) could be recovered.
- **Reason for Rejection**: Rejected by author: it does not shrink the data.
  Compression has to happen before encryption.

### Alternative B: Binary backup file instead of a JSON wrapper

- **Pros**: Saves about 25% more than the JSON wrapper with base64 fields.
- **Cons**: Harder to read when debugging. It also needs changes to restore
  detection (`isEncryptedFile` parses JSON and reads `format`) and to Drive's
  file matching (`mimeType = 'application/json'`).
- **Reason for Rejection**: Rejected by author: the JSON wrapper is easier to
  debug, and leaving restore detection and Drive file matching alone is worth
  more than the extra 25%.

### Alternative C: Remove indentation only and defer gzip

- **Pros**: Cuts a 1,987-row backup from 1,009 KB to 741 KB (−27%) with no
  format change and no new version to keep readable forever. Rows are 8 to 15
  times below any limit. This was the skeptical architect's position.
- **Cons**: Saves far less than gzip (about 150 KB). A format change is
  cheapest while the owner is the main user.
- **Reason for Rejection**: Rejected by author: gzip costs about two lines with
  the browser's `CompressionStream`, a format change is cheapest now, and
  learning is a stated goal. This stays the fallback if version 2 runs into
  trouble.

### Alternative D: Optional gzip for plain exports

- **Pros**: Smaller export files.
- **Cons**: Excel and Google Sheets cannot open `.csv.gz`, and Windows
  Explorer support for plain `.gz` is not documented.
- **Reason for Rejection**: Rejected by author: users open exports in
  spreadsheets.

### Alternative E: A dedicated migration utility for version-1 backups

- **Pros**: Converts an old backup without restoring it.
- **Cons**: A tool to build, test and keep. Restoring an old backup and then
  taking a new one does the same conversion.
- **Reason for Rejection**: Rejected by author: restore followed by backup
  already converts.

### Alternative F: Fall back to writing version 1 when `CompressionStream` is missing

- **Pros**: Backups keep working on Safari before 16.4. The fallback is one
  line.
- **Cons**: Two writer paths to keep forever. The photo pipeline already
  assumes Safari 16 or newer.
- **Reason for Rejection**: Rejected by author: the minimum is iOS/Safari 16.4,
  Chrome 80 and Firefox 113, with no fallback.

### Alternative G: Check the backup version at file selection as well as in `decryptData`

- **Pros**: A user with no stored passphrase sees the "newer version" message
  before being asked for a passphrase.
- **Cons**: Needs a second exported function next to the check inside
  `decryptData`. That inner check must stay, because every caller of
  `decryptData` must refuse unknown versions.
- **Reason for Rejection**: Not adopted in this draft: the case needs a future
  version-3 file and a device with no stored passphrase. It is recorded under
  Known limitations.

### Alternative H: Match on error message text instead of adding `BackupReadError`

- **Pros**: No new class. `decryptErrorMessage` already tests
  `msg.includes("Wrong passphrase")`.
- **Cons**: `decryptWithStoredPassphrase` would decide whether to re-throw from
  message wording, so rewording a message could turn a wrong passphrase into a
  thrown error, or the reverse.
- **Reason for Rejection**: Not adopted in this draft: control flow should not
  depend on user-facing text.

### Alternative I: Keep `browser-image-compression`, or switch to `compressorjs`

- **Pros**: No new photo code.
- **Cons**: `browser-image-compression` is dormant (last release 2023-03-06)
  and tries to load a background worker from `cdn.jsdelivr.net`, which the
  site's content-security-policy and offline use prevent.
- **Reason for Rejection**: Rejected by author in favour of built-in browser
  APIs, which need no dependency.

### Alternative J: Reconfigure the old image library

- **Pros**: Three settings (`fileType: 'image/jpeg'`, `useWebWorker: false`, a
  size check) would deliver JPEG plus a hard limit with about three lines of
  change. This was the skeptical architect's position.
- **Cons**: Keeps a dormant dependency.
- **Reason for Rejection**: Rejected by author in favour of built-in APIs and
  dropping the dependency.

### Alternative K: Pass `imageOrientation: "from-image"` to `createImageBitmap`

- **Pros**: Makes the rotation rule explicit. On current engines it gives the
  same result as the default.
- **Cons**: MDN lists the `from-image` value from Chrome 112, Firefox 111 and
  Safari 16. A browser without the value would reject the call, so every photo
  would fail as "unreadable" [INFERENCE: not tested].
- **Reason for Rejection**: Not adopted in this draft: the plan passes no
  option. The remaining risk on Chrome 80–111 is an Open Question.

### Alternative L: Two photo messages instead of three

- **Pros**: One `catch` branch for every non-size failure. Telemetry can still
  record three reasons.
- **Cons**: A corrupt file gets "Try a JPEG or PNG", which does not help.
- **Reason for Rejection**: Rejected by author in favour of three messages
  (too large, unsupported format, unreadable image). The cost accepted is the
  HEIC/HEIF check on `file.type` and the file extension.

### Alternative M: Two encrypted files per backup (brief's option B)

- **Pros**: Rows restore without depending on photo bytes. Photo-free backups
  stay small.
- **Cons**: Two downloads, partial Drive failures, a two-file restore picker
  (`ImportDropzone.tsx:16` accepts one file, with no `multiple`), and
  mismatched pairs. Separate files also reveal per-file sizes and the timing of
  each new receipt.
- **Reason for Rejection**: Rejected by author for this release; all seven
  brainstorm reviewers agreed. Few users attach photos.

### Alternative N: Incremental per-photo files on Drive (brief's option C)

- **Pros**: Each photo uploads once, so backups do not repeat photo bytes.
- **Cons**: Needs Drive listing, diffing, orphan cleanup and a Drive download
  path, none of which exist. It cannot work for device backups.
- **Reason for Rejection**: Rejected by author: it depends on Drive machinery
  that does not exist, and it cannot work for device backups.

### Alternative O: Sealed compartments or a photo side file (brief's options D and E)

- **Pros**: Option D keeps rows and photos in one file as two separately
  encrypted compartments that share one salt and one key derivation. A damaged
  photo compartment no longer takes the rows with it. Option E is a rows file
  that restores on its own plus an optional `-photos.extrack` side file,
  matched to expenses by ID.
- **Cons**: More format and code. A truncated file still fails under D. E needs
  a separate restore action.
- **Reason for Rejection**: Deferred by author, not rejected. D is the upgrade
  path if damage isolation matters. E is the path if photo volume grows. Both
  fit later because the `version` field and the per-file envelope already
  exist.

### Alternative P: Drop the photo and keep the expense when a photo fails restore validation (brief's option A+)

- **Pros**: About 5–10 lines in `buildImportPreview`, one preview line and a
  unit test. It writes "rows over photos" into code and protects old backups
  when the `attachment` rule is tightened later. Three brainstorm reviewers
  were for it.
- **Cons**: Today the photo check is only the `data:image/` prefix, and AES-GCM
  rejects a damaged file whole, so no realistic file triggers it. It covers
  only hand-edited files. Four reviewers were against it.
- **Reason for Rejection**: Deferred by author: it ships in the same change
  that ever tightens the `attachment` rule in `src/db/recordSchemas.ts`.

### Alternative Q: Enforce the 1 MB photo limit in `expenseRecordSchema`

- **Pros**: One rule applies at every write.
- **Cons**: An edit re-validates every field, so any expense that already holds
  a photo over 1 MB could no longer be edited. On restore, `keepValid` drops a
  whole expense when any field fails.
- **Reason for Rejection**: Rejected by author: it blocks edits and loses
  expenses on restore. All seven brainstorm reviewers agreed. The limit lives
  only in the upload path.

### Alternative R: Keep the restore limit at 10 MB, or measure the oldest phone first

- **Pros**: 10 MB is the cautious value until the new warning fires. A
  measurement on the owner's oldest phone is the evidence-based choice.
- **Cons**: At about 1.33 MB per photo in the backup, 7 to 8 photos exceed
  10 MB. A measurement needs a device test before the change can ship.
- **Reason for Rejection**: Rejected by author: 50 MiB matches the existing
  `MAX_CSV_FILE_BYTES`. Restore memory at 50 MiB is unmeasured and is an Open
  Question.

### Alternative S: A separate limit on decompressed size

- **Pros**: Guards against a decompression bomb.
- **Cons**: Only the passphrase holder can produce a valid file, so a bomb can
  only come from the user's own data.
- **Reason for Rejection**: Rejected by author: the file-size limit, plus its
  documented memory ceiling, is enough for now.

### Alternative T: Pad backups to hide their size

- **Pros**: Hides the file size from Google.
- **Cons**: Adds bytes to every backup for no gain.
- **Reason for Rejection**: Rejected by author: compression before encryption
  leaks nothing useful here (Technical Plan, section 9).

### Alternative U: Ship the reader one release before the writer

- **Pros**: Devices left on "Later" already read version-2 files before any
  exist.
- **Cons**: One extra release cycle.
- **Reason for Rejection**: Rejected by author: the reader and writer ship in
  the same release as separate commits, reader first. Reverting the writer
  commit alone restores a working state.

### Alternative V: Record `import_succeeded` in telemetry

- **Pros**: With `{ version, expenseCount }`, it shows version-1 versus
  version-2 restores and successes next to `import_failed`. With
  `{ expenseCount }` only, it needs one call in `ImportData.tsx`, as
  `csv_import_succeeded` does.
- **Cons**: The `version` form changes `decryptData`'s return type and
  `ImportPreview`, because the preview does not carry the backup version.
  Every version stays readable anyway, so the split cannot retire a reader.
  A restore that crashes the tab sends no event under any form.
- **Reason for Rejection**: Rejected by author: no restore-success event.
  Only failures are recorded.

### Alternative W: Resumable Drive upload now

- **Pros**: Google documents multipart upload for files of 5 MB or less, so
  resumable upload is the documented path for larger backups.
- **Cons**: One extra request and about 20 lines. Nobody has shown that a
  larger multipart upload fails.
- **Reason for Rejection**: Deferred by author: upload one real backup of 6 MB
  or more by hand first. Switch only if that fails, or when telemetry shows
  backups nearing 5 MB.

### Alternative X: A Replace control so the old photo survives a rejected replacement

- **Pros**: The brief's sentence "a photo already attached stays" would hold. A
  user who picks a photo that is rejected keeps the receipt already on the
  expense.
- **Cons**: `AttachmentField.tsx` renders the file input only when no photo is
  attached (lines 14–41), so a replacement today means tapping Remove first.
  Keeping the old photo needs a control that stays visible next to the preview,
  a design for that control under the `shadcn/*` lint rules, a new e2e case,
  and updates to the expenses contract docs.
- **Reason for Rejection**: Rejected by author: removing a photo first stays the
  only way to replace it. This release is about backups and the photo limit.
  The case where the user removes a photo, picks a replacement that is
  rejected, and then saves, loses the old photo. Listed under Non-Goals.

---

## Non-Functional Requirements

- **Security & Privacy**: Backups stay end-to-end encrypted with the same key
  derivation. Compression before encryption leaks nothing useful in this
  threat model (Technical Plan, section 9). Telemetry carries counts, a reason
  or stage label, and capped error text: `bytes`, `attachmentCount`,
  `reason`, `stage`. The new error messages are fixed strings. No description,
  amount, tag, category name, passphrase or Drive token enters an event.
- **Performance & Latency**: A backup of 1,987 rows drops from about 1,009 KB to
  about 150 KB. The 600,000-iteration key derivation is unchanged on both read
  and write, and gzip adds one stream pass. The photo pipeline decodes a photo
  once and encodes it up to three times (one per ladder rung); that time is not
  measured. Restore memory at 50 MiB is not measured (see Open Questions).
- **Rollout & Rollback**: The version-2 reader lands in a commit before the
  writer. Reverting the writer commit alone leaves an app that still reads
  version-2 files. Reverting the reader would strand every version-2 backup
  made in between. App versions that predate this release cannot open a
  version-2 file and show a false message; the release note for PR 3 tells users
  to update each device before restoring a new backup there.

---

### Additional Resources

- Brainstorm brief: `concepts_brief.md` (repository root, dated 2026-11-24).
- Contract docs: `src/lib/EGM.md`, `src/hooks/EGM.md`, `src/config/EGM.md`,
  `src/components/more/EGM.md`, `src/components/more/export/EGM.md`,
  `src/content/EGM.md`.
- Feature docs: `docs/features/featureset.md`, `docs/features/e2ee.md`.
- Release-note rules: `AGENTS.md` and the header of `src/content/releaseNotes.ts`.
- MDN, [`createImageBitmap()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap):
  `imageOrientation` default and `from-image` support.
- Related work: `docs/old-backups/extrack-backup-2026-08-10.extrack` is an
  existing version-1 backup. It is not used as a fixture because its passphrase
  is unknown.

### Future Improvements

- **Option D, sealed compartments**: rows and photos as two separately encrypted
  parts of one file, sharing one salt and one key derivation, so a damaged photo
  part does not take the rows with it. Revisit if a real backup exceeds half of
  `MAX_RESTORE_FILE_BYTES`, a Drive upload fails for size, a restore crashes a
  tab, or the owner passes about 30–50 photos.
- **Option E, photo side file**: a rows file that restores on its own plus an
  optional `-photos.extrack` file matched to expenses by ID. Use it if photo
  volume grows.
- **Option A+**: keep an expense and drop its photo when the photo fails restore
  validation. Build it in the same change that tightens the `attachment` rule in
  `src/db/recordSchemas.ts`.
- **Resumable Drive upload**: only if the manual 6 MB upload fails or telemetry
  shows backups nearing 5 MB.
- **Delete old Drive backups**: an opt-in "keep the newest N" clean-up, after
  measuring Drive growth.
- **Replace control for photos**: keep the old photo when a replacement is
  rejected (Alternative X).
- **Version check at file selection**: show the "newer version" message before
  the passphrase prompt when no passphrase is stored (Alternative G).
- **Pixel-budget resize**: about 4 MP instead of a long-edge limit, so tall
  scanner crops keep their detail.

---

## Detailed Implementation Plan

Work ships as four PRs (Technical Plan, section 11). Each file entry names the PR
that touches it. A file touched by several PRs lists the change per PR. Update a
contract doc in the same PR as the code it describes.

- **PR 1** `fix`: restore limit constant and backup-time warning.
- **PR 2** `feat`: remove the export toggle.
- **PR 3a** `feat`: version-2 reader, version-1 fixture, version check,
  `BackupReadError`, `encryptData(plaintext, passphrase)`.
- **PR 3b** `feat`: version-2 writer (gzip) and backup telemetry. Same PR as 3a,
  separate commit, after it.
- **PR 4** `feat`: photo pipeline, photo limit, dependency removal.

### Target Files to Create/Modify

#### 1. `src/config/limits.ts` (Modify)

- **Type / Scope**: TypeScript constants module.
- **Proposed Changes**:
  - PR 1: add `MAX_RESTORE_FILE_BYTES = 50 * 1024 * 1024`, next to
    `MAX_CSV_FILE_BYTES`, with a one-line comment: restore reads the whole
    file into memory, and backup warns above this size.
  - PR 4: add `MAX_ATTACHMENT_BYTES = 1024 * 1024`, with a comment: measured
    on the JPEG `Blob`, before base64.
  - The photo resize ladder (pixel edges and qualities) is a tuning value, not
    a size ceiling, so it stays in `receiptPhoto.ts`. The file header says
    `limits.ts` holds only size and count ceilings.

#### 2. `src/lib/backup.ts` (Modify)

- **Type / Scope**: TypeScript module: encryption, envelope, reminders.
- **Proposed Changes**:
  - PR 1: export `interface BackupStats { expenseCount: number;
    attachmentCount: number; bytes: number }`. `createEncryptedBackupFile(data)`
    returns `{ filename, encrypted, stats }`. `expenseCount` is
    `data.expenses.length`. `attachmentCount` counts expenses with a truthy
    `attachment`. `bytes` is `encrypted.length`, with a comment that the
    wrapper is ASCII so characters equal bytes.
  - PR 3a, error type: export `class BackupReadError extends Error` with a
    `readonly reason: "wrong-passphrase" | "version" | "decompress"`. Messages:
    `wrong-passphrase` = "Wrong passphrase — decryption failed" (unchanged
    text); `version` = "This backup was made by a newer version of ExTrack.
    Close and reopen the app to update."; `decompress` = "This backup unlocked
    but could not be unpacked. The file may be damaged."
  - PR 3a, `ExtrackEnvelope.version` is typed `string`, because the reader
    parses files from the future.
  - PR 3a, `decryptData(encryptedJson, passphrase?)` keeps its signature and
    runs these steps in this order: parse (else "Invalid encrypted file");
    check `format` (else "Not an encrypted backup file"); check `version` is
    `"1"` or `"2"` (else `BackupReadError("version")`); resolve the passphrase
    (else "No passphrase provided"); decode `salt`, `iv`, `ciphertext`; derive
    the key with the stored `iterations`; AES-GCM decrypt inside the existing
    `try`, whose `catch` throws `BackupReadError("wrong-passphrase")`; for
    version `"2"`, gunzip in its own `try` after that block, whose `catch`
    throws `BackupReadError("decompress")`; UTF-8 decode.
  - PR 3a, `decryptWithStoredPassphrase(text)`: return `null` when no
    passphrase is stored or when the error is
    `BackupReadError("wrong-passphrase")`. Re-throw every other error.
  - PR 3a, `encryptData(plaintext, passphrase)`: takes the passphrase as a
    parameter and no longer calls `getStoredPassphrase`. Still writes version
    `"1"` in this PR.
  - PR 3a, `createEncryptedBackupFile`: calls `getStoredPassphrase()`, throws
    `Error("No encryption passphrase set")` when null (same text as before),
    then calls `encryptData(json, passphrase)`.
  - PR 3b: add private `gzip(bytes)` and `gunzip(bytes)` helpers over
    `CompressionStream("gzip")` and `DecompressionStream("gzip")`, each
    collecting the stream through `new Response(stream).arrayBuffer()`. Put a
    `ponytail:` comment next to them: requires Chrome 80, Firefox 113,
    Safari/iOS 16.4; no version-1 fallback by design. `encryptData` gzips the
    UTF-8 bytes before AES-GCM and writes `version: "2"`.
  - `buildBackupEnvelope`, `isEncryptedFile`, the key derivation and
    `ITERATIONS` do not change.

#### 3. `src/lib/importPreview.ts` (Modify)

- **Type / Scope**: TypeScript module: restore preview.
- **Proposed Changes**: PR 1: `validateImportFile` compares `file.size` with
  `MAX_RESTORE_FILE_BYTES`, imported from `@/config` as `csvImport.ts` does. The
  message becomes `File too large (max ${MAX_RESTORE_FILE_BYTES / 1024 / 1024}
  MB)`, which reads "File too large (max 50 MB)". If vitest cannot load the
  `@/config` barrel for `importPreview.test.ts` (the barrel reads
  `import.meta.env` and build-time globals), import from `@/config/limits`
  instead. `buildImportPreview` and `keepValid` do not change.

#### 4. `src/hooks/useEncryptedFileImport.ts` (Modify)

- **Type / Scope**: React hook: encrypted import flow.
- **Proposed Changes**: PR 3a:
  - Import `BackupReadError`.
  - `decryptErrorMessage(err)`: for `BackupReadError` with reason
    `wrong-passphrase`, return "Wrong passphrase — try again"; for any other
    `BackupReadError`, return `err.message`; for everything else, return
    "Decryption failed. The file may be corrupted." (unchanged).
  - New helper `importFailureStage(err)`: `"decompress"` for
    `BackupReadError` with reason `decompress`, else `"decrypt"`.
  - `performFileSelect`: wrap `decryptWithStoredPassphrase` in `try/catch`. In
    the `catch`: return if `!isCurrent()`; call
    `captureError("import_failed", err, { stage: importFailureStage(err) })`;
    `toast.error(decryptErrorMessage(err))`; reset the file input; return.
  - `performManualDecrypt`: pass `stage: importFailureStage(err)` in its
    existing `captureError`. After the toast, when `err` is a
    `BackupReadError` whose reason is not `wrong-passphrase`, clear the
    pending text, clear the manual passphrase and reset the file input.
    Wrong passphrase and unknown errors keep today's behaviour (the prompt
    stays).
  - `rejectNonBackupPlaintext` message becomes "This file is an encrypted CSV
    export from an older version and can't be restored."

#### 5. `src/lib/backupTargets.ts` (Modify)

- **Type / Scope**: TypeScript module: Drive and device backup targets.
- **Proposed Changes**: PR 3b: `uploadBackupToDrive(encrypted, filename,
  accessToken, stats: BackupStats)` and `saveBackupToDevice(encrypted, filename,
  stats: BackupStats)` replace their `expenseCount: number` parameter. Both call
  `capture("backup_succeeded", { target, ...stats })`, which adds `bytes` and
  `attachmentCount` to the existing `target` and `expenseCount`. Nothing else
  changes (`application/octet-stream` for the media part, `markBackupCompleted`,
  the success toast).

#### 6. `src/hooks/useBackupAction.ts` (Modify)

- **Type / Scope**: React hook: create-backup workflow.
- **Proposed Changes**:
  - PR 1: destructure `{ filename, encrypted, stats }` from
    `createEncryptedBackupFile`. After the save or upload succeeds (after the
    existing success toast, before `setSaveTo("device")`), when
    `stats.bytes > MAX_RESTORE_FILE_BYTES`, call `toast.warning` with
    `duration: 15_000` and the text: "This backup was saved, but at {size} MB
    it is over the {limit} MB ExTrack can restore. Remove some receipt photos
    and back up again." `{size}` is `stats.bytes / (1024 * 1024)` to one
    decimal place. `{limit}` is `MAX_RESTORE_FILE_BYTES / (1024 * 1024)`. The
    early `return` when `uploadBackupToDrive` returns `null` stays before the
    warning, since nothing was saved. A backup is never refused for size.
  - PR 3b: pass `stats` to `uploadBackupToDrive` and `saveBackupToDevice`
    instead of `data.expenses.length`.

#### 7. `src/lib/driveApi.ts` (Modify)

- **Type / Scope**: TypeScript module: Drive REST calls.
- **Proposed Changes**: PR 3b: comment only. Next to `buildMetadataBlob`
  (`mimeType: "application/json"`) and `findExistingFile`
  (`mimeType = 'application/json'`), add a comment saying the two must stay in
  step, that the version-2 wrapper is still JSON so the type is still accurate,
  and that the e2e Drive mock answers every query with the folder, so tests
  would not catch a mismatch. No behaviour change.

#### 8. `src/hooks/useExportAction.ts` (Modify)

- **Type / Scope**: React hook: export workflow.
- **Proposed Changes**: PR 2: signature becomes `useExportAction(formatType:
  ExportFormat, onDone: () => void)`. Remove the `encryptData` import and the
  encrypt branch. `handleExport` always calls
  `downloadFile(content, filename, mimeType)` with the values from
  `formatExportContent`. The `catch` records
  `captureError("export_failed", err, { format: formatType })`. The doc comment
  drops "optionally encrypt".

#### 9. `src/components/more/ExportData.tsx` (Modify)

- **Type / Scope**: React component: Export Data button and dialog owner.
- **Proposed Changes**: PR 2: remove the `encrypt` state, the `usePassphraseGate`
  and `SetupPassphraseDialog` imports and uses, the `handleExportClick` gate,
  and the passphrase-setup dialog JSX. `useExportAction(formatType, onDone)`'s
  `onDone` resets `formatType` to `"json"` and closes the dialog.
  `ExportDialogContent` receives `onExportClick={handleExport}` and no
  `encrypt` props. `BackupData.tsx` keeps using both removed imports.

#### 10. `src/components/more/export/ExportDialogContent.tsx` (Modify)

- **Type / Scope**: React component: Export dialog contents.
- **Proposed Changes**: PR 2: remove the `encrypt` and `setEncrypt` props, the
  `EncryptToggleRow` import and its element. The dialog keeps the title,
  description, `FormatToggle` and the Export button. Run `bun run lint`, since
  the `shadcn/*` rules apply.

#### 11. `src/components/more/export/EncryptToggleRow.tsx` (Delete)

- **Type / Scope**: React component.
- **Proposed Changes**: PR 2: delete the file. Its only user is
  `ExportDialogContent.tsx`. This is a clean cutover: no re-export and no
  alias.

#### 12. `src/lib/receiptPhoto.ts` (Create)

- **Type / Scope**: TypeScript module: receipt photo pipeline. Uses browser
  APIs, so it has no Node unit test (the e2e tests in file 19 cover it).
- **Proposed Changes**: PR 4. Exports:
  - `type ReceiptPhotoRejection = "too-large" | "unsupported" |
    "unreadable"`.
  - `class ReceiptPhotoError extends Error` with `readonly reason:
    ReceiptPhotoRejection`.
  - `prepareReceiptPhoto(file: File): Promise<string>`, which returns a data
    URL starting `data:image/jpeg;base64,` or throws `ReceiptPhotoError`.

  Behaviour, in order:
  1.  `createImageBitmap(file)` with no options (see Open Questions). If it
      rejects: throw `unsupported` when `file.type` is `image/heic` or
      `image/heif`, or the file name ends in `.heic` or `.heif`
      (case-insensitive); otherwise throw `unreadable`.
  2.  A module constant `LADDER` of three rungs, tried in order:
      `{ edge: 2048, quality: 0.75 }`, `{ edge: 2048, quality: 0.6 }`,
      `{ edge: 1600, quality: 0.7 }`.
  3.  For each rung: `scale = Math.min(1, edge / Math.max(width, height))`, so a
      photo is never upscaled; create a canvas of the scaled size (each side
      rounded, at least 1); `getContext("2d")` returning null throws
      `unreadable`; fill the canvas white; `drawImage` the bitmap scaled; call
      `canvas.toBlob(..., "image/jpeg", quality)` wrapped in a promise.
  4.  A `null` blob or `blob.type !== "image/jpeg"` throws `unreadable`. A blob
      with `blob.size <= MAX_ATTACHMENT_BYTES` is read with `FileReader`
      `readAsDataURL` (wrapped in a promise) and returned.
  5.  When no rung fits, throw `too-large`.
  6.  `bitmap.close()` runs in a `finally` block on every path.
  7.  A `ponytail:` comment names two ceilings: the long-edge ladder squeezes
      tall scanner crops (a pixel budget of about 4 MP would not), and
      `createImageBitmap` relies on its `from-image` default for EXIF rotation
      (older engines may ignore it).

#### 13. `src/hooks/useImageAttachment.ts` (Modify)

- **Type / Scope**: React hook: attachment state for the expense form.
- **Proposed Changes**: PR 4. Remove the `browser-image-compression` import and
  the `FileReader` callback. `handleImageUpload` reads `e.target` into a local
  `input` and `input.files?.[0]` before the first `await`. It then awaits
  `prepareReceiptPhoto(file)`. On success it calls `setValue("attachment",
  dataUrl)` and `setImagePreview(dataUrl)`. On failure it sets `input.value =
  ""`; takes `reason` from a `ReceiptPhotoError` (any other thrown value counts
  as `unreadable`); calls `capture("attachment_rejected", { reason })`; and
  calls `toast.error` with the message for that reason from this table:

  | Reason        | Message                                                                                                     |
  | ------------- | ----------------------------------------------------------------------------------------------------------- |
  | `too-large`   | "This photo is too detailed to save under 1 MB. Crop closer to the receipt and try again."                  |
  | `unsupported` | "This browser can't open HEIC photos. Take a screenshot of the photo or save it as a JPEG, then try again." |
  | `unreadable`  | "Couldn't open this photo. Try a JPEG or PNG, or take a screenshot of it."                                  |

  The returned shape `{ imagePreview, handleImageUpload, removeImage }` and the
  hook's parameters do not change, so `useExpenseFormController.ts` and
  `AttachmentField.tsx` need no edit.

#### 14. `package.json` and `bun.lock` (Modify)

- **Type / Scope**: Dependency manifest and lockfile.
- **Proposed Changes**: PR 4: run `bun remove browser-image-compression`. This
  deletes the `"browser-image-compression": "^2.0.2"` line at `package.json:43`
  and updates `bun.lock`. Commit both. The only importer is
  `src/hooks/useImageAttachment.ts`, which file 13 changes in the same PR.

#### 15. `src/content/releaseNotes.ts` (Modify)

- **Type / Scope**: Static release-note data.
- **Proposed Changes**: one entry per PR, each added at the top of
  `RELEASE_NOTES` (newest first) with `version: "1.10.0"` and `date` set to the
  PR's authoring date. None sets `needsSetup`, `isPreference`, `isSecurity` or
  `action`, and none has type `new`, so none opens the What's New dialog on its
  own. Text follows the file's header contract (benefit, no mechanism,
  `title` ≤ 60, `body` ≤ 160):

  | PR  | `id`                         | `type`     | `title`                                                  | `body`                                                                                                                                |
  | --- | ---------------------------- | ---------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
  | 1   | `1.10.0-backup-size-warning` | `fixed`    | Warning when a backup is too big to restore              | ExTrack now warns you when a backup is larger than it can restore, so you find out when you save it, not when you need it.            |
  | 2   | `1.10.0-export-plain-only`   | `improved` | Export is plain files; encrypted copies come from Backup | Export Data now saves plain JSON or CSV. For an encrypted file, use Create Backup.                                                    |
  | 3b  | `1.10.0-smaller-backups`     | `improved` | Backups take far less space                              | Backup files are now much smaller, and older backups still restore. Update ExTrack on any device before restoring a new backup there. |
  | 4   | `1.10.0-photo-limit`         | `improved` | Receipt photos are kept under 1 MB                       | Photos are resized when you attach them so backups stay small. If a photo can't be used, you see why and the expense still saves.     |

  Commit messages use `fix` for PR 1 and `feat` (not `feat!`) for PRs 2–4.
  `CHANGELOG.md` is not edited by hand.

#### 16. `src/content/EGM.md` (Modify)

- **Type / Scope**: Contract doc.
- **Proposed Changes**: PR 1: change "(currently 1.9.1 → 1.0.0)" to "(currently
  1.10.0 → 1.0.0)", since the first entry makes 1.10.0 the newest group.

#### 17. `src/lib/backup.test.ts` (Create)

- **Type / Scope**: Unit test (vitest via `vite-plus/test`, Node 24, which
  provides `crypto.subtle` and `CompressionStream`). `backup.ts` loads without
  IndexedDB (checked while drafting), and these tests pass the passphrase as a
  parameter, so no mock is needed.
- **Proposed Changes**: PR 3a creates it with five cases; PR 3b adds the sixth.
  A local helper builds an envelope from `version`, `iterations`, `passphrase`
  and the bytes to encrypt, using WebCrypto and `b64uEncode` from `backup.ts`.
  Hand-built files use a low iteration count such as 1,000, because the reader
  uses the `iterations` stored in the file.

  | #   | Case                                                               | Asserts                                                                                                                                                                                                                                                          |
  | --- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | 1   | PR 3a: restore the committed version-1 fixture                     | `decryptData(fixture, "fixture-passphrase-v1")` returns JSON with inner `version: "1.0"`, 3 expenses with the known descriptions, one `attachment` starting `data:image/jpeg;base64,`, a non-empty `categories` list, and every expense's `category` found in it |
  | 2   | PR 3a: restore a version-2 file built by hand (gzip, then AES-GCM) | `decryptData` returns the original JSON text                                                                                                                                                                                                                     |
  | 3   | PR 3a: unknown version                                             | an envelope with `version: "3"` and invalid `salt`, `iv` and `ciphertext` rejects with `BackupReadError` reason `version`, which proves the check runs before any decoding or key derivation                                                                     |
  | 4   | PR 3a: wrong passphrase on a version-2 file                        | rejects with reason `wrong-passphrase`                                                                                                                                                                                                                           |
  | 5   | PR 3a: damaged gzip                                                | a version-2 envelope whose AES-GCM plaintext is not gzip rejects with reason `decompress`, not `wrong-passphrase`                                                                                                                                                |
  | 6   | PR 3b: writer round trip                                           | `encryptData(json, pass)` yields `JSON.parse(...).version === "2"`, `decryptData` returns the original, and for about 200 repeated rows the wrapper is under half the plaintext length (fails if gzip is dropped)                                                |

#### 18. `tests/fixtures/backup-v1.extrack` (Create)

- **Type / Scope**: Test fixture: a real version-1 backup.
- **Proposed Changes**: PR 3a, generated before commit (b) with a version-1
  writer. Use a throwaway Playwright script kept outside the repo (a directory
  from `mktemp -d`), against a checkout of `main` with no version-2 code, that
  imports the repo's `tests/support` helpers. Steps: `gotoApp`; `seedExpenses`
  with three synthetic expenses ("Fixture lunch" 120.5, "Fixture cab" 250,
  "Fixture receipt" 75 carrying a tiny `data:image/jpeg;base64,` attachment);
  set the passphrase `fixture-passphrase-v1` through the UI; run Create Backup →
  Save to device; copy the download to this path. Commit the file as written
  (no reformatting). It holds only synthetic data and a throwaway passphrase.
  `docs/old-backups/extrack-backup-2026-08-10.extrack` already exists but its
  passphrase and contents are unknown, so it is not used.

#### 19. `tests/e2e/data-management.spec.ts` (Modify)

- **Type / Scope**: Playwright e2e spec.
- **Proposed Changes**:
  - PR 2: replace `exportEncrypted(page, passphrase)` with
    `backupToDevice(page, passphrase)`. It calls `setPassphrase`, clicks the
    page's first "Create Backup" button, takes the dialog named "Backup",
    starts `page.waitForEvent("download")`, clicks the dialog's "Create
    Backup" button, asserts the filename matches
    `/^extrack-backup-\d{4}-\d{2}-\d{2}\.extrack$/`, and returns
    `readDownload(download)`. Update the five callers: the tests "encrypted
    round trip: export, factory reset, merge import", "wrong manual
    passphrase is rejected", "restore skips invalid records and says why",
    "Cancel during decrypt shows no preview afterwards" and "override mode
    replaces existing data entirely". Rename "encrypted round trip: export…"
    to "encrypted round trip: backup, factory reset, merge import". The Drive
    and "Back up now" tests do not change.
  - PR 3a: add two tests. Both first call `setPassphrase` so the stored
    passphrase drives the automatic path. (1) A file with a valid `format`,
    `version: "3"` and placeholder fields shows "This backup was made by a
    newer version of ExTrack. Close and reopen the app to update." and no
    "Import Preview". (2) A file with `version: "2"` and `salt: "!!!"` shows
    "Decryption failed. The file may be corrupted." at once, with no "Decrypt"
    button.
  - PR 3b: in "encrypted round trip", assert
    `JSON.parse(backupContent).version` is `"2"`.

#### 20. `tests/e2e/receipt-photo.spec.ts` (Create)

- **Type / Scope**: Playwright e2e spec. No test uploads a photo today.
- **Proposed Changes**: PR 4. Each test uses `gotoApp(page, "/add")`, fills
  Amount and Category as `expense-crud.spec.ts` does, builds the image inside
  the page with `page.evaluate` (a canvas converted with `toBlob`, bytes passed
  back), and attaches it with `setInputFiles` on
  `[data-testid="attachment-input"]`. Noise is filled in chunks of at most
  65,536 bytes, the `crypto.getRandomValues` limit.

  | Test                                           | Setup                                                                                      | Asserts                                                                                                                                                                                                            |
  | ---------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
  | Camera-size photo is stored as JPEG under 1 MB | 3000×2000 canvas with a smooth gradient                                                    | preview image is visible; after Save, `readExpenses` returns an `attachment` starting `data:image/jpeg;base64,` that decodes to at most 1,048,576 bytes; decoding it in the page gives a long edge of at most 2048 |
  | Photo that stays over 1 MB is rejected         | 3000×2000 random-noise canvas                                                              | the too-large message shows; no preview; the input holds no file; after Save the expense is stored with no `attachment`                                                                                            |
  | Undecodable files get the right message        | two files: `receipt.heic` (type `image/heic`) and `receipt.jpg`, each with non-image bytes | the unsupported message for the first, the unreadable message for the second; the input holds no file after each                                                                                                   |

#### 21. `src/lib/EGM.md` (Modify)

- **Type / Scope**: Contract doc.
- **Proposed Changes**: update in the PR that changes the behaviour.
  - Line 14: `encryptData(plaintext, passphrase)`; `decryptData` reads versions
    `"1"` and `"2"` and throws `BackupReadError`; `decryptWithStoredPassphrase`
    returns `null` only for a wrong passphrase.
  - Line 15: `createEncryptedBackupFile` returns `{ filename, encrypted,
    stats }`; add `BackupStats` and `BackupReadError`.
  - Line 18: new `stats` parameter on both backup targets.
  - Add an interface bullet for `receiptPhoto.ts`: `prepareReceiptPhoto` and
    `ReceiptPhotoError`.
  - Line 34: envelope `version` is `"1"` or `"2"`; version `"2"` gzips before
    AES-GCM; any other version is rejected before key derivation.
  - Line 35: `decryptData` throws `BackupReadError` with three reasons;
    `encryptData` no longer checks for a stored passphrase.
  - Line 43: restore files over 50 MB (`MAX_RESTORE_FILE_BYTES`) are rejected.
  - Line 57: `backup_succeeded` carries `{ target, expenseCount,
    attachmentCount, bytes }`.
  - Add an invariant for the photo ladder and the 1 MB limit.
  - Add `CompressionStream`/`DecompressionStream` and `createImageBitmap` to
    the browser-API side-effect lines. In Verification, add `backup` to the
    unit-test coverage list on line 64.

#### 22. `src/hooks/EGM.md` (Modify)

- **Type / Scope**: Contract doc.
- **Proposed Changes**: line 35 (`useImageAttachment` rejects a photo with a
  toast, clears the input and records `attachment_rejected`); line 45 (the
  automatic decrypt path reports errors and resets the input); line 46
  (`useBackupAction` warns when the file is over the restore limit); line 48
  (`useExportAction(formatType: "csv" | "json", onDone)`); line 75 (restore size
  limit is `MAX_RESTORE_FILE_BYTES`; version and decompress errors reset the
  pending file); line 89 (replace "image compression in a web worker" with the
  `receiptPhoto.ts` pipeline); line 95 (add attachment rejection to the
  telemetry list).

#### 23. `src/config/EGM.md` (Modify)

- **Type / Scope**: Contract doc.
- **Proposed Changes**: after line 14, add `MAX_RESTORE_FILE_BYTES = 50 MiB`
  (PR 1) and `MAX_ATTACHMENT_BYTES = 1 MiB` (PR 4), each with its
  `[limits.ts:…]` anchor.

#### 24. `src/components/more/EGM.md` (Modify)

- **Type / Scope**: Contract doc.
- **Proposed Changes**: PR 2. Line 25: `SetupPassphraseDialog` is used by
  `BackupData` only. Line 49: the export subdirectory has no encrypt checkbox.
  Lines 61–63: export never encrypts and has no passphrase gate; after a
  successful export the dialog resets to `formatType = "json"` and closes.

#### 25. `src/components/more/export/EGM.md` (Modify)

- **Type / Scope**: Contract doc.
- **Proposed Changes**: PR 2. Overview: remove the "Encrypt this export"
  checkbox. Interface: drop `encrypt` and `setEncrypt` from `ExportDialogContent`
  and delete the `EncryptToggleRow` entry. Invariants: delete the checkbox
  coercion line. Side effects: "File generation and download" (no encryption).

#### 26. `EGM.md` (Modify)

- **Type / Scope**: Root contract doc.
- **Proposed Changes**: PR 3b. Line 74 (Encryption): state that backups are
  gzip-compressed before AES-GCM encryption (wrapper version `"2"`), that
  version `"1"` files still restore, and that other versions are rejected.

#### 27. `docs/features/featureset.md` (Modify)

- **Type / Scope**: Feature documentation.
- **Proposed Changes**: line 14 (attachments are resized to JPEG of at most
  1 MB); line 96 (sample envelope `"version": "2"`, with a note that version
  `"1"` files are still read); line 105 (add that unknown versions are
  rejected); line 116 (backups are compressed before encryption); lines
  127–130 and 135–136 (remove "Optional encryption" and the encrypted export
  filename; exports are plain only); line 166 (new CSV guard message); line 171
  (50 MB cap and the backup-time warning); lines 323 and 352 (replace
  `browser-image-compression` with the built-in canvas pipeline).

#### 28. `docs/features/e2ee.md` (Modify)

- **Type / Scope**: Historical plan document.
- **Proposed Changes**: PR 2. Add one line under the title: export encryption
  was removed and the backup format is now version 2 (see the design in
  `docs/features/designs/smaller-encrypted-backups-and-bounded-receipt-photos.md`).
  Leave the original plan text as history.

#### 29. `docs/gtm/project-showcase.md` (Modify)

- **Type / Scope**: Marketing document.
- **Proposed Changes**: PR 3b. In the sample envelope at line 159, change
  `"version": "1"` to `"version": "2"`.

#### 30. `README.md` (Modify)

- **Type / Scope**: Project readme.
- **Proposed Changes**: PR 4. Delete line 167,
  `- **browser-image-compression** (attachments)`. The built-in APIs need no
  entry.

### Verification Plan

Run after each PR, plus the checks named per PR.

- **Compilation/Build**: `bun run build`.
- **Unit Tests**: `bun run test`. PR 3a adds `src/lib/backup.test.ts` (five
  cases); PR 3b adds the sixth. `importPreview.test.ts` must still pass after
  PR 1, which proves the `@/config` import loads under vitest.
- **Static Analysis & Linting**: `bun run check` and `bun run lint`. PR 2 and
  PR 4 change UI code, so every `shadcn/*` error must be fixed.
- **Test Coverage Requirement**: the repo sets no coverage threshold. Every
  decision-bearing branch in `backup.ts` (version check, gunzip failure, wrong
  passphrase, writer compression) has a case in `backup.test.ts`.
- **E2E/Integration**: `bun run test:e2e tests/e2e/data-management.spec.ts
  tests/e2e/drive-oauth.spec.ts tests/e2e/backup-reminder.spec.ts
  tests/e2e/expense-crud.spec.ts tests/e2e/receipt-photo.spec.ts`.
  `drive-oauth.spec.ts` needs no edit: it restores the file the Drive mock
  captured, so after PR 3b it restores a version-2 upload.
- **Manual checks** (throwaway, nothing committed):
  - PR 1: temporarily set `MAX_RESTORE_FILE_BYTES` to 1,024, create a device
    backup and confirm the file is saved and the warning shows. Pick that
    file in Import and confirm the "File too large" message appears. Both
    messages show a fractional MB value at this setting, which is expected
    for this check. Revert the constant.
  - Before releasing PR 3: upload one real backup of 6 MB or more to Drive by
    hand. If it fails, switch `uploadFileToDrive` to resumable upload.
  - Before releasing PR 3: restore a backup of about 40 MB on the oldest
    phone the owner uses, record whether it succeeds, and revisit
    `MAX_RESTORE_FILE_BYTES` if it does not.
  - PR 4: attach an EXIF-rotated portrait JPEG on iOS Safari 16.4 or later
    and on the oldest Chrome the owner cares about, and confirm the stored
    photo is upright.

---

<!-- Provenance: Indicates initial structural drafting via EGM. -->

_Drafted with EGM_
