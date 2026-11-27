# Smaller Encrypted Backups and Bounded Receipt Photos

- **Author:** gammaSpeck
- **Date:** 2026-11-24

## Overview

ExTrack keeps all data in the browser and offers encrypted backups. A backup is saved to the device or uploaded to Google Drive. It is encrypted with a key derived from the user's passphrase, so Google cannot read it. This end-to-end encryption is the product's key property.

The backup file grows faster than it needs to. Today `src/lib/backup.ts` builds it in four steps:

1. Write all expenses and categories as indented JSON.
2. Encrypt that JSON with AES-GCM.
3. Convert the encrypted bytes to base64 text, which adds 33%.
4. Wrap the result in a second indented JSON object.

The owner's data comes to about 450 bytes per expense: 1,987 expenses make a file of about 900 KB. Encrypted bytes look random and cannot be compressed, so the only place compression helps is before encryption.

Receipt photos are the larger growth risk. Each photo is stored inside its expense as base64 text. The current image library (`browser-image-compression` 2.0.2, last released 2023-03-06) aims for 0.5 MB, but it keeps whatever it produces after 10 attempts, even if the result is larger. In the backup, a 0.5 MB photo costs about 0.9 MB, because it is base64-encoded twice. About 11 such photos push a backup past the app's own 10 MB restore check (`src/lib/importPreview.ts:72`). Such a backup uploads fine and then cannot be restored.

## Analysis

### Reviewer status

| Lens                        | Reviewer                       | Status    | Photo verdict |
| --------------------------- | ------------------------------ | --------- | ------------- |
| Hostile design critic       | `egm-design`                   | completed | A+            |
| Codebase details            | `egm-codebase-details`         | completed | A             |
| Skeptical architect (YAGNI) | `egm-zoom-out`                 | completed | A             |
| Naive reader                | `egm-comprehension`            | completed | A             |
| Pragmatic tech lead         | `egm-implementation-readiness` | completed | A+            |
| Structural                  | `egm-structural`               | completed | A             |
| Inventive catalyst          | `egm-inventive-catalyst`       | completed | A+            |

### 1. The real danger: the app can write a backup it then refuses to restore (Blocker, raised by every reviewer)

Nothing checks a backup's size when it is created. Restore rejects any file over 10 MB before reading it (`src/lib/importPreview.ts:71-72`, called first in `src/hooks/useEncryptedFileImport.ts:11`). Photos are what push a file over. After this change each photo is capped at 1 MB, but a 1 MB photo still costs about 1.33 MB in the backup, so 7 to 8 such photos are enough. The user then holds a backup that looks fine. The day they need it, the app refuses it, and the critical rows are lost along with the optional photos.

None of the options fixes this by itself: not gzip, not version 2, not splitting photos out. The fix is a single rule: **every backup this app writes, this app can restore.** In practice:

- Add one constant, `MAX_RESTORE_FILE_BYTES`, to `src/config/limits.ts`.
- Restore checks it, as today.
- Backup also checks its finished file against the same constant. If the file is over, it still saves (a backup is never refused) and shows a warning.
- The value is still open. Raising it to 50 MiB would match the existing `MAX_CSV_FILE_BYTES` precedent. Keeping 10 MB until the warning fires would be the cautious choice. Measuring on the owner's oldest phone is the evidence-based choice.

The real limit is phone memory. Restore reads the whole file into one string, parses the outer JSON twice (`isEncryptedFile`, then `decryptData`), decodes base64, decrypts, decompresses and parses again. Several full copies exist at once. A crash during restore loses nothing, because the restore write happens inside one Dexie transaction (`src/db/expenseTrackerDb.ts:358-387`). Even so, a crash still means the rows don't come back on that device.

### 2. Gzip helps rows, not photos

Measured on synthetic data of the owner's size (1,987 rows):

| Backup content                             | Approx. file size             |
| ------------------------------------------ | ----------------------------- |
| Today (indented JSON, encrypted, base64)   | 1,009 KB                      |
| Indentation removed only, no format change | 741 KB (−27%)                 |
| gzip before encryption, JSON wrapper kept  | 144–150 KB (about 7× smaller) |

Once the data is gzipped, indentation no longer matters (150 KB vs 144 KB). So `buildBackupEnvelope`, which also produces the plain JSON export, can stay exactly as it is.

Photos are different. A photo is stored as base64 text, which gzip shrinks by only about 25%. The outer base64 on the encrypted bytes adds that back, so a photo costs about the same in version 2 as in version 1.

The skeptical architect argued for deferring gzip. Rows are 8 to 15 times below any limit, removing indentation alone saves 27% with no format change, and every format version must stay readable forever. The counter-argument: gzip costs about two lines with the browser's built-in `CompressionStream`, the owner is still the main user (so a format change is cheapest now), and learning is a stated goal. The brief keeps gzip and describes it as headroom for rows. Photo size is handled by the photo limit and by the size rule in section 1.

### 3. Version 2 must be defined exactly, and must reject versions it doesn't know

A backup contains two version fields: the outer wrapper's `version: "1"` and the inner payload's `version: "1.0"`. Two developers could build incompatible "version 2" formats. The reviewers converged on this definition:

- **Outer wrapper:** `format` stays `"extrack-encrypted-backup"`. Changing it would make the new app's own `isEncryptedFile` reject new files. `version` becomes `"2"`. `ciphertext` = base64url(AES-GCM(gzip(UTF-8 JSON))). The file extension stays `.extrack`. No separate `compression` field is needed, because version 2 means gzip.
- **Inner payload:** unchanged (`version: "1.0"`), because the plain JSON export shares it.
- **Reading:** `"1"` → current behaviour. `"2"` → decrypt, then gunzip. Any other value → stop with "This backup was made by a newer version of ExTrack. Close and reopen the app to update." That wording matches the app's existing update-stall toast. Check the version before the 600,000-iteration key derivation.

The owner already accepted that _old_ app versions fail on version 2 files. That cannot be fixed, because shipped code can't change. Today an old app shows the false message "This file is an encrypted export, not a restorable backup". The unknown-version check is a different matter: it makes _this_ release fail clearly on whatever comes next, and it only works if it ships before version 3 exists. Four reviewers recommend it; the owner earlier declined a special message, so this point is reopened for decision.

### 4. Error handling would hide gzip problems behind a passphrase prompt

In `decryptData`, the `try` block around `crypto.subtle.decrypt` reports any failure as "Wrong passphrase — decryption failed" (`src/lib/backup.ts:166-171`). If decompression goes inside that block, a gzip failure tells the user their passphrase is wrong.

On the automatic path, `decryptWithStoredPassphrase` swallows every error and returns `null` (`src/lib/backup.ts:183-190`). The app then asks for the passphrase by hand, the manual attempt fails with "The file may be corrupted", and nothing is reported.

The fix:

- Decompress _after_ the decrypt `try` block, and throw a distinct error.
- Have `decryptWithStoredPassphrase` return `null` only for the wrong-passphrase case and re-throw everything else.
- Record `captureError("import_failed", err, { stage: "decompress" })`.

### 5. Photo limit: enforce it only at upload, and define what "reject" means

All reviewers agree: **never** put the 1 MB limit in the database record rules (`expenseRecordSchema`).

- **Edits would break.** Saving an expense edit sends every form field, `attachment` included, through `guardTable`'s update check (`src/hooks/useExpenseFormController.ts:67`, `src/db/expenseTrackerDb.ts:105-108`). Any expense that already has a large photo could no longer be edited.
- **Restore would lose data.** `keepValid` drops a whole expense when any field fails (`src/lib/importPreview.ts:17-23`).

"Reject" needs a user-visible definition:

- The expense still saves, just without the photo. A photo already attached stays.
- The file input is cleared (`e.target.value = ""`). Otherwise picking the same file again does nothing, because the input stays mounted.
- The limit is `1024 * 1024` bytes, measured on the JPEG `Blob` before conversion to base64.
- There are three distinct messages: too large, unsupported format (HEIC on non-Apple devices), and unreadable image.

The built-in path is `createImageBitmap` with EXIF orientation applied, then a white-filled canvas, then `toBlob('image/jpeg')`. Check `blob.type`, because Safari silently returns PNG for formats it can't encode. Use one fixed step-down sequence. The skeptical architect noted that reconfiguring the old library would take three lines (`fileType: 'image/jpeg'`, `useWebWorker: false`, plus a size check). The owner chose built-in APIs; that is the rung above an installed dependency, and the library is dormant.

The inventive catalyst noted that a long-edge limit squeezes tall scanned receipts, and that a pixel budget (about 4 MP) would not. Camera photos are 4:3 or 16:9 whatever the receipt's shape, so this matters only for scanner crops.

### 6. Photos inside or outside the backup: the contradiction

The core contradiction: the backup must contain photos (so it is complete) and must not (because of size, and because rows matter more).

**Option A (photos stay inside), adopted by four reviewers.**

- End-to-end encryption, the single file, the single download and the single Drive upload all stay exactly as they are.
- The size rule in section 1 removes the size threat.
- Restore is a single-file picker (`ImportDropzone.tsx:16`, `accept=".extrack"`, no `multiple`). Option B would force users to pick two files on a phone.
- Option C needs Drive listing, diffing, orphan cleanup and a Drive download path. None of these exist, and C can't work for device backups.

**A+ (drop the photo, keep the expense, when a photo fails restore validation): reviewers split 4 to 3.**

- Against (codebase details, skeptical architect, naive reader, structural): today the photo check is only the `data:image/` prefix, and AES-GCM rejects a damaged file as a whole, so no realistic file triggers A+. It protects only against hand-edited files. Build it when the photo rule gets stricter.
- For (design critic, inventive catalyst, tech lead): it is about five lines, and it writes "rows over photos" into code.
- **Owner decision: A.** A+ ships in the same change that ever tightens the `attachment` rule.

**A vs A+, step by step.** Both options produce the same file and use the same backup flow. Restore is also identical up to the validation step:

1. Pick one `.extrack` file.
2. Size check against `MAX_RESTORE_FILE_BYTES`.
3. Read the outer wrapper and check `version`.
4. Derive the key and decrypt with AES-GCM. This is all-or-nothing: one damaged byte anywhere, in a photo or in a row, fails the whole restore, under both A and A+.
5. gunzip and parse the JSON.
6. **Validate each category and expense** (`keepValid`, `src/lib/importPreview.ts:17-23`).
7. The preview shows the counts, and "⚠️ N invalid records will be skipped (bad …)" (`ImportPreviewPanel.tsx:25-29`).
8. Confirm, and everything is written in one transaction.

The options differ only at step 6, and only for an expense whose _only_ problem is its `attachment` value:

- **A:** that whole expense is skipped. The preview says "1 invalid record will be skipped (bad attachment)", and its amount, date and category are not restored.
- **A+:** the expense is kept without its photo. The preview adds a line saying a receipt photo couldn't be restored and its expense was kept. The change is about 5–10 lines in `buildImportPreview`, a preview line and a unit test.

| Situation                                                                                             | A                                                    | A+                          |
| ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | --------------------------- |
| Normal backup made by the app                                                                         | Everything restores                                  | Everything restores         |
| One damaged byte anywhere in the file                                                                 | Nothing restores                                     | Nothing restores            |
| File larger than the restore limit                                                                    | Refused (the backup-time warning flagged it earlier) | Same                        |
| Photo text hand-edited into something that isn't `data:image/…`                                       | That expense is lost                                 | Expense kept, photo dropped |
| A future release tightens the photo rule (say "JPEG only"), and an old backup still holds a PNG photo | That expense is lost                                 | Expense kept, photo dropped |

The last row is why A+ is tied to any future tightening of the photo rule. Shipping a stricter rule without A+ would silently drop expenses from old backups.

**The strongest case against A.** AES-GCM is all-or-nothing. One flipped bit anywhere fails the authentication tag, and every row is lost with it. In a photo-heavy backup most of the bytes are photos, so optional data carries most of that risk. Two things soften it:

- Each day's backup is a separate dated file, and older files are never deleted, so earlier backups remain as a fallback.
- The inventive catalyst described two upgrade paths, kept for later:
  - **D:** one file with two separately encrypted compartments, rows and photos, sharing one salt and one key derivation. A damaged photo compartment no longer takes the rows with it. A truncated file still fails.
  - **E:** a rows file that restores on its own, plus an optional `-photos.extrack` side file restored by a separate action that matches photos to expenses by ID and ignores IDs it doesn't know.

  Both are possible later without rework, because the `version` field and the per-file envelope already exist.

**Triggers to revisit.**

- A real backup exceeds half of `MAX_RESTORE_FILE_BYTES`.
- A Drive upload fails for size.
- A restore crashes a tab.
- The owner passes about 30–50 photos.

### 7. Drive: keep the file type, and know the 5 MB guidance

- **Keep `application/json`.** Drive finds and replaces a same-day backup only when its file type is `application/json` (`src/lib/driveApi.ts:94-96`, `buildMetadataBlob`). Version 2 keeps the JSON wrapper, so that stays accurate. Add a code comment so nobody "fixes" it. The e2e Drive mock answers every query with the folder, so tests would never catch a mismatch.
- **The 5 MB guidance.** Google documents multipart upload for files of 5 MB or less; `files.create` accepts up to 5,120 GB. Nobody verified whether a larger multipart request actually fails. The cheapest step is to upload one real 6+ MB backup by hand before relying on large photo backups. Switch to resumable upload (one extra request; about 20 lines) only if that test fails, or when telemetry shows backups nearing 5 MB.
- **Drive storage grows.** No code ever deletes old backups, so Drive usage grows as photos × number of backups. Deferred: an opt-in "keep the newest N" clean-up, after measuring.

### 8. Compress before encrypt: no meaningful leak

Compression-based attacks (CRIME/BREACH) need an attacker who can mix chosen text with a secret and observe sizes repeatedly. Here the only reader of the file is Google, which sees one size per backup. No outsider can write into the user's data between backups. The passphrase and Drive tokens are not in the backup. Version 1 already reveals the exact plaintext length. Splitting the backup (B or C) would leak _more_: per-file sizes, and the timing of each new receipt.

### 9. Browser support

`CompressionStream` is available in Chrome 80, Firefox 113 and Safari/iOS 16.4 (MDN). On older Safari every backup would fail. There are two options: fall back to writing version 1 when `CompressionStream` is missing (one line, but two writer paths to keep forever), or declare iOS/Safari 16.4 the minimum. The photo pipeline already assumes Safari 16 or newer.

### 10. Tests: lock in version 1 before writing version 2

- **Nothing will test version-1 restore once version 2 ships.** Every e2e restore test builds its file with the current app (`exportEncrypted` in `tests/e2e/data-management.spec.ts:25-35`, used at lines 97, 139, 162, 189, 252).
- **Commit a v1 fixture first.** Before changing the writer, commit a small v1 `.extrack` file made by the current build with a known passphrase. Restore it in a unit test (`decryptData` takes the passphrase as a parameter; Node 24 provides `crypto.subtle` and `CompressionStream`) or an e2e test.
- **No test uploads a photo today.** One e2e test should: draw a canvas, attach it through `attachment-input`, and check that the stored value starts with `data:image/jpeg` and is within the limit.

### 11. Telemetry

Every trigger to revisit above is measured in file sizes, and today nothing records them. Counts only, which the telemetry rule allows:

- Add `bytes` and `attachmentCount` to `backup_succeeded`.
- Add `import_succeeded { version, expenseCount }`.
- Add `attachment_rejected { reason }`.
- Drop `encrypted` from `export_failed`.

If the owner prefers minimal telemetry, keep only the decompression `captureError` from section 4.

### 12. Structure, order and paperwork

This is three features and a chore, so the reviewers suggest one branch and separate PRs:

1. Remove the export toggle.
2. Backup version 2, plus moving the restore limit.
3. The built-in photo pipeline.

Removing the toggle must land first, for two reasons:

- `encryptData` then has a single caller (the backup), so gzip goes straight into it with no flag.
- The five e2e restore tests that use `exportEncrypted` must switch to the Backup → Save to device path. Otherwise they keep passing while still testing version 1.

**Release notes and contracts:**

- Release notes are 1.10.0 with three plain-language entries. Use `feat`, not `feat!`, so release-please does not bump to 2.0.0.
- Contract and doc files to update: `src/lib/EGM.md`, `src/hooks/EGM.md`, `src/config/EGM.md`, `src/components/more/EGM.md`, `src/components/more/export/EGM.md`, the root `EGM.md`, `docs/features/featureset.md`, and `README.md:167`.
- The remaining encrypted-CSV restore message should become: "This file is an encrypted CSV export from an older version and can't be restored."

### Ideal Final Result

One encrypted file and one key derivation. Rows always restore, however many photos there are, however big they are, and whether or not the photo bytes are damaged. The app never writes a file it refuses to read. Option A with the size rule, the version check and the error fixes meets all of this except damage isolation. Option D is the known next step if damage isolation becomes important.

### 13. Rollout: a rollback must undo the writer, never the reader (tech lead)

Suppose version 2 ships and the whole change is then reverted. The reverted app reads only version 1, so every backup made in between becomes unrestorable. The owner's acceptance of "old apps fail" covered stale devices, not a deliberate rollback that strands new backups. The fix is to ship the version-2 _reader_ (with the version-1 fixture test and the unknown-version check) as its own commit, before the commit that changes the _writer_. A rollback is then `git revert` of the writer commit only.

A stricter variant is to ship the reader one release before the writer. Devices left on "Later" would then already read version-2 files before any exist. It costs one extra release cycle.

For testability, `encryptData` should take the passphrase as a parameter instead of reading IndexedDB itself. The "No encryption passphrase set" check moves into `createEncryptedBackupFile`, which becomes its only caller once the export toggle is gone. That lets a Node unit test cover the round trip without mocking IndexedDB.

The tech lead also ordered the work so that each step ships on its own. The restore-limit fix comes first, because it is the only step that removes a data-loss risk that already exists today.

## Goals vs. Non-Goals

- **In-Scope Goals:**
  - Compress backup contents with gzip before encryption. Keep the readable JSON wrapper and mark it version 2.
  - Keep restoring every existing version-1 `.extrack` file, including encrypted JSON exports made earlier.
  - Replace `browser-image-compression` with built-in browser APIs. Photos are always stored as JPEG of 1 MB or less. Any photo that cannot meet that is rejected with a clear message.
  - Remove the "Encrypt this export" toggle. Exports become plain JSON or CSV only.
  - Move the restore size limit into `src/config/limits.ts`, and make backup warn whenever it writes a file larger than restore accepts.
  - Restore a version-1 backup in an automated test, using a v1 file committed before the writer changes.
  - Reject unknown future backup versions with "This backup was made by a newer version of ExTrack. Close and reopen the app to update."
- **Out-of-Scope Non-Goals:**
  - Recompressing photos that are already stored.
  - A separate tool for migrating old backups. Restoring an old backup and then taking a new one already converts it.
  - Restoring directly from Google Drive.
  - Compressing plain exports. Excel and Google Sheets cannot open `.csv.gz`.
  - Showing a dedicated "update the app" message to old app versions that open a new backup. Already-shipped code cannot be changed.
  - Splitting photos into separate files (options B, C, E) or sealed compartments (option D) in this release.
  - Resumable Drive upload, and deleting old Drive backups, until telemetry or a manual 6 MB upload test shows a need.
  - A size limit on `attachment` in the database record rules.
  - Changing the Drive file type (`application/json`), the filename pattern, the key derivation or its iteration count.
  - HEIC decoding on non-Apple devices.

## Alternatives Weighed

- **Compress the finished `.extrack` file.** Rejected because encrypted output does not compress. Only the base64 overhead would be recovered.
- **Binary backup file instead of a JSON wrapper.** It saves about 25% more. Rejected by the owner because the JSON wrapper is easier to debug, and a binary file would also require changes to restore detection and to Drive's file matching.
- **Keep `browser-image-compression`, or switch to `compressorjs`.** Rejected by the owner in favour of built-in browser APIs. Those APIs need no dependency, and the old library tries to load a background worker from `cdn.jsdelivr.net`, which the site's content-security-policy and offline use prevent.
- **Optional gzip for plain exports.** Rejected because Excel and Google Sheets cannot open `.csv.gz`, and Windows Explorer support for plain `.gz` is not documented.
- **A dedicated migration utility for v1 backups.** Rejected because restoring and then backing up does the same conversion.
- **Defer gzip; only remove indentation (skeptical architect).** It saves 27% with no format change, and rows are far from any limit. Not adopted. gzip costs about two lines, a format change is cheapest while the owner is the main user, and learning is a stated goal. Kept as the fallback if version 2 runs into trouble.
- **Reconfigure the old image library (skeptical architect).** Three options (`fileType: 'image/jpeg'`, `useWebWorker: false`, a size check) would deliver JPEG plus a hard limit. Rejected by the owner in favour of built-in APIs and dropping a dormant dependency.
- **Option B: two encrypted files per backup.** Rejected by all seven reviewers for this release. It brings two downloads, partial Drive failures, a two-file restore picker and mismatched pairs, for photos that few users attach.
- **Option C: incremental per-photo files on Drive.** Rejected because it needs Drive listing, diffing, orphan cleanup and a Drive download path, none of which exist, and it cannot work for device backups.
- **Options D and E (inventive catalyst): sealed compartments, or a photo side file.** Not rejected, but deferred. D is the recorded upgrade path if corruption isolation becomes important. E is the path if photo volume grows.
- **A separate limit on decompressed size.** Not adopted. Only the passphrase holder can produce a valid file, so a "decompression bomb" can only come from the user's own data. The single on-disk limit, plus its documented memory ceiling, is enough for now.
- **Padding backups to hide their size.** Rejected, because compression before encryption leaks nothing useful here (section 8).

## Key Decisions & Staging for Next Steps

### Decided (carry into `/egm-draft`)

1. **Format.** The outer wrapper keeps `format: "extrack-encrypted-backup"`, the `.extrack` extension, base64url fields and the Drive file type `application/json`. `version` becomes `"2"`, meaning gzip before AES-GCM. There is no separate `compression` field: the tech lead proposed one, and the codebase reviewer preferred a single source of truth. The inner payload and `buildBackupEnvelope` stay unchanged.
2. **Code placement.** gzip and gunzip are private helpers in `src/lib/backup.ts` using `CompressionStream` / `DecompressionStream`. Decompression runs after the AES-GCM `try` block and throws its own error. `decryptWithStoredPassphrase` returns `null` only for a wrong passphrase. `encryptData(plaintext, passphrase)` takes the passphrase as a parameter.
3. **Restore limit.** `MAX_RESTORE_FILE_BYTES = 50 * 1024 * 1024` in `src/config/limits.ts`, matching `MAX_CSV_FILE_BYTES`. Restore checks it before reading the file. Backup compares its finished file against it and shows a warning when it is over; a backup is never refused for size.
4. **Photos.** Built-in `createImageBitmap` → white canvas → `toBlob('image/jpeg')`. The ladder is 2048 px at quality 0.75, then 2048 px at 0.6, then 1600 px at 0.7, never upscaling. `MAX_ATTACHMENT_BYTES = 1024 * 1024` on `blob.size`. A photo that fails is not attached; the expense still saves; the input is cleared. The messages are:
   - "This photo is too detailed to save under 1 MB. Crop closer to the receipt and try again."
   - "Couldn't open this photo. Try a JPEG or PNG, or take a screenshot of it."

   Remove `browser-image-compression`. Stored photos stay untouched, and the database record rules get no size limit.

5. **Export.** Remove the toggle. The signature becomes `useExportAction(formatType, onDone)`. The e2e helper `exportEncrypted` becomes `backupToDevice` (Create Backup → device). The remaining encrypted-CSV message is reworded.
6. **Photo placement: option A.** Photos stay inside the single encrypted backup. A+ is deferred: build it in the same change that ever tightens the `attachment` rule in `src/db/recordSchemas.ts` (for example, a format allowlist). Option D is the recorded upgrade path if damage isolation ever matters.
7. **Telemetry.** Add `bytes` and `attachmentCount` to `backup_succeeded`. Add `attachment_rejected { reason }` and `import_failed { stage: "decompress" }`. Drop `encrypted` from `export_failed`.
8. **Release.** Version 1.10.0, plain `feat`/`fix` commits (no `feat!`), plain-language release notes with no "gzip" or "v2".
9. **Unknown versions.** The reader accepts `"1"` and `"2"`. It rejects any other version, before the key derivation, with "This backup was made by a newer version of ExTrack. Close and reopen the app to update."
10. **Rollout.** The version-2 reader and the version-2 writer land as separate commits in the same release, reader first. A rollback reverts only the writer commit.
11. **Minimum browser.** iOS/Safari 16.4, Chrome 80, Firefox 113 (`CompressionStream`). There is no fallback to writing version 1. Record the ceiling in a `ponytail:` comment.
12. **Drive.** Keep multipart upload. Before release, upload one real backup of 6 MB or more to Drive by hand. Switch to resumable upload only if that upload fails.

### Staging (each step shippable on its own)

1. Restore limit constant, plus the backup-time warning (a `fix`).
2. Remove the export toggle and move the e2e restore tests to Backup → device.
3. Backup version 2: commit (a) the reader, the v1 fixture, the version check and the `encryptData` signature; commit (b) the writer and telemetry. Generate the v1 fixture from `main` before (b).
4. Built-in photo pipeline, the limit, telemetry, dependency removal and the e2e photo test.

Contract and doc updates ship in the same PR as the code they describe: `src/lib/EGM.md`, `src/hooks/EGM.md`, `src/config/EGM.md`, `src/components/more/EGM.md`, `src/components/more/export/EGM.md`, root `EGM.md`, `docs/features/featureset.md`, `README.md:167`.
