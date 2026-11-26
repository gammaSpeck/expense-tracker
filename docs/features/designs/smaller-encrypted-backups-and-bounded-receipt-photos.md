# Smaller Encrypted Backups and Bounded Receipt Photos

- **Author:** gammaSpeck
- **Status:** Approved
- **Date:** 2026-11-27

---

## Overview

ExTrack keeps all data in the browser. It offers encrypted backups that are
saved to the device or uploaded to Google Drive. The backup is encrypted with a
key derived from the user's passphrase, so Google cannot read it. This
end-to-end encryption does not change.

This design makes four changes, listed in the order they ship (Technical Plan,
section 11):

1.  **No backup is refused for size.** Restore stops rejecting large files.
    Above a size threshold it asks the user before reading the file, and backup
    warns when it writes a file that large.
2.  **Export makes plain files only.** The "Encrypt this export" toggle is
    removed. Encrypted files come only from Backup.
3.  **Backup format version 2.** The backup contents are compressed with gzip
    before encryption, and the file carries a small passphrase check. The outer
    JSON wrapper, the `.extrack` extension and the Drive file type stay the same.
4.  **Bounded receipt photos.** Photos are resized and converted to JPEG with
    built-in browser APIs and capped at 0.5 MB. The `browser-image-compression`
    dependency is removed.

Photos stay inside the single encrypted backup file. Splitting photos into
separate files is a recorded upgrade path, not part of this release.

"The owner" in this document is the maintainer, who is also the app's main user.

## The Problem

**The app can write a backup it then refuses to restore.** Restore rejects any
file over 10 MB before reading it. Backup never checks its own size. Receipt
photos push a file over the limit: each photo is stored as base64 text inside
its expense, and the backup base64-encodes the whole payload again, so a 0.5 MB
photo costs about 0.89 MB. With about 1 MB of rows, about 11 photos exceed
10 MB. Such a backup uploads to Drive without complaint, and on the day it is
needed restore refuses it, rows included. The refusal protects no data:
restore writes everything in one Dexie (IndexedDB) transaction, so a restore
that runs out of memory writes nothing. Running out of memory shows up in one
of two ways: the tab crashes, or a step throws an error. Today the second case
can surface as "Wrong passphrase" or as no message at all.

**Export makes a second kind of encrypted file.** An encrypted JSON export
contains exactly what a backup contains (`exportData.ts` calls the same
`buildBackupEnvelope`), but it does not mark a backup as done, so the backup
reminder never sees it. An encrypted CSV export produces a `.extrack` file that
restore rejects after the passphrase is entered. Users have two ways to make
the same kind of file, and one of them cannot be restored.

**Backup files carry data inefficiently.** A backup writes the data as indented
JSON, encrypts it, converts the encrypted bytes to base64 text (33% larger),
and wraps that text in a second indented JSON object. On synthetic data of the
owner's size (1,987 expenses, no photos) the file is about 1,009 KB. Nothing
deletes old Drive backups, so a daily Drive backup at that size adds about
360 MB a year. Encrypted bytes cannot be compressed, so compression has to
happen before encryption. Gzip there reduces rows to about 150 KB (about 55 MB
a year). For photos, gzip removes the inner base64 overhead but cannot shrink
the JPEG bytes: a 0.5 MB photo drops from about 0.89 MB to about 0.67 MB, about
25% less. A 10 MB file then holds about 15 photos instead of about 11.

**Receipt photo size is not bounded.** The current library
(`browser-image-compression` 2.0.2, last released 2023-03-06) aims for 0.5 MB but
keeps whatever it produces after 10 attempts, even when that is larger. It also
tries to load a background worker from `cdn.jsdelivr.net`, which the site's
content-security-policy (`script-src 'self'`, `worker-src 'self'`) blocks.

The Overview lists the four changes that address these problems.

## Goals

- **No backup is refused for size.** A file larger than
  `MAX_RESTORE_FILE_BYTES` gets a confirmation instead of an error. Backup
  warns when its finished file is larger than the same constant.
- **Messages say what happened.** "Wrong passphrase" appears only when the
  passphrase is wrong. A file too large for the device's memory gets its own
  message, and a file that fails to read gets a message instead of silence.
- **An unfinished restore is reported.** At the next start the user sees a
  message, and a telemetry event is sent. Closing the tab during a restore
  also counts, so the count is an upper bound.
- **The size threshold is measured** on the owner's oldest phone with
  version-2 backups before release 1.10.0.
- **Export is plain-only.**
- **Smaller backups.** A backup of 1,987 rows drops from about 1,009 KB to
  about 150 KB, and each photo costs about 25% less.
- **Version-1 backups keep restoring,** including encrypted JSON exports made
  earlier. An automated test restores a committed version-1 file.
- **Unknown versions are rejected when the file is picked,** before any
  passphrase prompt or key derivation.
- **Backup keeps working on old browsers.** A browser without
  `CompressionStream` writes a version-1 file.
- **A gzip failure is not reported as a wrong passphrase.**
- **Photos are bounded.** Every new photo is stored as JPEG of at most 0.5 MB.
  A photo that does not fit at the legibility floor (section 5) is not
  attached; the user sees why, and the expense still saves.
- **`browser-image-compression` is removed.**
- **Rollback path.** The version-2 reader lands in a commit before the
  version-2 writer, so reverting the writer alone leaves an app that reads
  both versions.

## Non-Goals

- Recompressing photos that are already stored.
- A migration tool for old backups. Restoring an old backup and taking a new one
  converts it.
- Restoring directly from Google Drive.
- Compressing plain exports. Excel and Google Sheets cannot open `.csv.gz`.
- A dedicated "update the app" message for app versions released before this
  one. Shipped code cannot change (section 12).
- Splitting photos out of the backup in this release (Alternative E).
- Resumable Drive upload, unless the manual 6 MB upload test fails (Open
  Questions). Deleting old Drive backups.
- A size limit on `attachment` in the database record rules
  (`expenseRecordSchema`). An edit re-validates every field, so existing large
  photos would block edits, and restore would drop whole expenses.
- Changing the Drive file type (`application/json`), the filename pattern, the
  key derivation or its iteration count.
- HEIC decoding on browsers that cannot decode it.
- A separate limit on decompressed size. Only the passphrase holder can make a
  valid file.
- Padding backups to hide their size.
- Recording successful restores in telemetry.
- Shipping the reader one release before the writer. It helps only devices that
  accept an update between the two releases and delays smaller backups for
  everyone.
- Keeping the old photo when its replacement is rejected. The form shows the
  file input only when no photo is attached, so replacing a photo already means
  removing it first.
- Releasing PR 1 alone as a 1.9.x patch. All five PRs ship together as 1.10.0
  (owner's choice).
- A JavaScript gzip library (fflate, pako) for old browsers. The version-1
  fallback keeps backup working there with no dependency.

## Open Questions

- **Does Drive multipart upload accept a file over 5 MB?** Google documents
  multipart upload for files of 5 MB or less, and every upload today is
  multipart. Resolved by uploading one real backup of 6 MB or more by hand
  before PR 1 merges, because the risk exists today. If it fails, a fix PR
  lands before PR 1 (Verification Plan).
- **What value does `MAX_RESTORE_FILE_BYTES` get?** It ships at today's 10 MB
  in PR 1. The phone test runs on staging
  (https://staging--gamma-expense-tracker.netlify.app) after PR 4 merges;
  every push to `main` redeploys it. The test sets the final value before
  release 1.10.0 (section 4).

## Critical User Journeys (CUJs)

### CUJ 1: Save a backup to the device or Google Drive

- **Given**: A passphrase is set. The browser holds expenses, some with photos.
- **When**: The user runs Create Backup and chooses Save to device or Google
  Drive.
- **Then**: `extrack-backup-yyyy-MM-dd.extrack` downloads with wrapper version
  `"2"`. If it is larger than `MAX_RESTORE_FILE_BYTES`, it is still saved and a
  warning says restoring it may fail on phones with little memory. On Google
  Drive the file goes to the "ExTrack Backups" folder and replaces a same-day
  backup.

### CUJ 2: Restore a version-1 or version-2 backup

- **Given**: A `.extrack` file from ExTrack 1.9.x, from this release, or an
  encrypted JSON export made earlier.
- **When**: The user picks the file in Import.
- **Then**: If the file is larger than `MAX_RESTORE_FILE_BYTES`, the app asks
  before reading it; Cancel leaves the import screen as it was. Otherwise, or
  after the user confirms, the stored passphrase is tried, then a typed one if
  needed, and the preview shows the counts. Confirming writes everything in one
  Dexie transaction. A wrong passphrase, a file too large for the device's
  memory, and a damaged file each get their own message.

### CUJ 3: Open a backup from a newer ExTrack

- **Given**: A `.extrack` whose wrapper `version` is not `"1"` or `"2"`.
- **When**: The user picks the file, with or without a stored passphrase.
- **Then**: The app says the backup was made by a newer version and asks the
  user to close and reopen the app and accept the update if asked. No
  passphrase prompt appears and no key derivation runs.

### CUJ 4: Attach a receipt photo

- **Given**: The expense form is open and no photo is attached.
- **When**: The user picks a 12-megapixel camera photo.
- **Then**: The photo is scaled down, encoded as JPEG of at most 0.5 MB, stored
  upright, and shown as the preview.

### CUJ 5: Pick a photo that cannot be stored

- **Given**: The expense form is open and no photo is attached.
- **When**: The user picks a photo still over 0.5 MB at the legibility floor, a
  HEIC file the browser cannot decode, or a file the browser cannot open.
- **Then**: A message names the cause, no photo is attached, the file input is
  cleared, and the expense can still be saved.

### CUJ 6: Export plain data

- **Given**: Any app state.
- **When**: The user opens Export Data.
- **Then**: The dialog offers JSON or CSV only, and the download is a plain
  `.json` or `.csv` file.

### CUJ 7: Back up and restore on an old browser

- **Given**: A browser without `CompressionStream` (Safari before 16.4,
  Firefox before 113), for example on a device that cannot update past iOS 15.
- **When**: The user creates a backup, then picks a version-2 backup made
  elsewhere.
- **Then**: The backup saves as a version-1 file, which this browser and every
  ExTrack version can restore. The version-2 file shows a message that it needs
  a newer browser and should be restored on another device.

### CUJ 8: A restore did not finish

- **Given**: A restore crashed the tab, or the user closed the tab during one.
- **When**: The user opens the app again.
- **Then**: A message says the last restore did not finish and that the file
  may be too large for this device's memory, and suggests a computer. Nothing
  was written, so the data is as it was before the restore.

## Technical Plan (Architecture)

### 1. Backup file format (version 2)

| Field                                          | Version 1                                                 | Version 2                                               |
| ---------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------- |
| `format`                                       | `"extrack-encrypted-backup"`                              | unchanged                                               |
| `version`                                      | `"1"`                                                     | `"2"`                                                   |
| `algorithm`, `kdf`, `iterations`, `salt`, `iv` | AES-GCM, PBKDF2-SHA256, 600,000, 16-byte salt, 12-byte IV | unchanged                                               |
| `ciphertext`                                   | `base64url(AES-GCM(UTF-8 JSON))`                          | `base64url(AES-GCM(gzip(UTF-8 JSON)))`                  |
| `check`                                        | absent in files written before 1.10.0                     | `base64url(checkIv ‖ AES-GCM(key, checkIv, "extrack"))` |
| Inner payload                                  | `{ exportDate, version: "1.0", expenses, categories }`    | unchanged                                               |

- Version 2 means gzip; there is no `compression` field. `format` stays the same
  so existing detection still recognises the file. The inner payload stays
  `"1.0"` because the plain JSON export shares `buildBackupEnvelope`.
- **The passphrase check.** `check` encrypts the 7-byte text `extrack` with the
  file's key and its own random 12-byte IV, stored in front of the ciphertext.
  Decrypting it takes no memory to speak of, so a failure there means the
  passphrase is wrong, with certainty. Every file this release writes carries
  it, including version-1 files from the old-browser fallback (section 3).
  Older readers ignore unknown fields. It does not make guessing a passphrase
  cheaper: each guess still costs the 600,000-iteration key derivation.

### 2. Read path

```text
file picked (useEncryptedFileImport.readAndCheckFile)
 ├─ size > MAX_RESTORE_FILE_BYTES → confirm; Cancel → reset input, stop
 ├─ [marker window 1 starts]
 ├─ file.text()
 ├─ readEnvelopeVersion(text)
 │   ├─ null → "only .extrack backups" message
 │   ├─ not in KNOWN_BACKUP_VERSIONS → newer-version message
 │   └─ "2" and no DecompressionStream → needs-newer-browser message
 ├─ stored passphrase → decryptData   (wrong → typed passphrase,
 │                                      [marker window 2] → decryptData)
 │   ├─ version check (same constant; library invariant)
 │   ├─ derive key with the file's iterations
 │   ├─ check present: decrypt check ── fails → "Wrong passphrase"
 │   ├─ decrypt ciphertext ── fails →
 │   │     check present: "Backup could not be decrypted" (internal);
 │   │     absent: "Wrong passphrase"
 │   └─ version "2": gunzip ── fails →
 │         "Backup decrypted but could not be unpacked" (internal)
 ├─ buildImportPreview → preview shown   [window 1 or 2 ends]
 └─ Confirm → [marker window 3] one Dexie transaction [window 3 ends]
```

- Labels marked (internal) are thrown error strings that reach telemetry only;
  the table below gives what the user sees.
- `readEnvelopeVersion(text)` replaces `isEncryptedFile(text)`. File selection
  already parses the wrapper to detect it; it now keeps the version. Both
  version checks use one list, `KNOWN_BACKUP_VERSIONS = ["1", "2"]` in
  `backup.ts`.
- `decryptWithStoredPassphrase` returns `null` only for the wrong-passphrase
  error, so the typed-passphrase prompt appears only then. Every other error
  is shown at once.
- Errors become one of four messages. The user-facing texts live in the
  Detailed Implementation Plan (file 4):

  | Cause                                                                        | Message shown                                               |
  | ---------------------------------------------------------------------------- | ----------------------------------------------------------- |
  | Wrong passphrase (check failed, or decrypt failed on a file without `check`) | wrong passphrase, try again                                 |
  | Any other failure, file over `MAX_RESTORE_FILE_BYTES`                        | too large for this device's memory; try a computer          |
  | Any other failure, file within the threshold                                 | decryption failed; the file may be corrupted (today's text) |
  | Version or browser problem at file selection                                 | the specific message above                                  |

- A file without `check` (every file written before 1.10.0) cannot tell a wrong
  passphrase from a failure inside decryption itself. It keeps today's
  behaviour of reporting "Wrong passphrase" (section 12).
- Telemetry: `import_failed` with `stage: "read"` for errors thrown during
  file selection and `stage: "decrypt"` for the typed-passphrase path; the
  error message tells causes apart. Rejections returned at file selection (not
  an ExTrack file, newer version, needs a newer browser) send none.

### 3. Write path

```text
Create Backup → exportAllData → createEncryptedBackupFile(data)
   passphrase = stored passphrase, else "No encryption passphrase set"
   encryptData(buildBackupEnvelope(data), passphrase)
     CompressionStream present → gzip → AES-GCM → version "2" + check
     CompressionStream missing → AES-GCM → version "1" + check
 → saveBackupToDevice | uploadBackupToDrive
     backup_succeeded { …, attachmentCount, bytes rounded up to 100 KB }
 → encrypted.length > MAX_RESTORE_FILE_BYTES → warning; the backup is kept
```

- `encryptData(plaintext, passphrase)` takes the passphrase as a parameter, so a
  Node unit test can run a full round trip without IndexedDB. Once the export
  toggle is gone, `createEncryptedBackupFile` is its only caller.
- The version-1 fallback keeps backups working on browsers below the supported
  minimum (section 10). It is one branch, because the version-1 reader stays
  forever anyway.
- The wrapper is ASCII, so `encrypted.length` is its size in bytes.

### 4. Restore size threshold and restore marker

- `MAX_RESTORE_FILE_BYTES` (`src/config/limits.ts`) is a soft threshold.
  Restore asks before reading a larger file, and backup warns after writing
  one. Neither refuses: a refusal guarantees the rows do not come back, while
  an attempt either succeeds, fails with a message (section 2), or crashes and
  writes nothing.
- **Its value.** PR 1 ships today's 10 MB. Before release 1.10.0, the owner
  restores photo-heavy version-2 backups of about 10, 20, 30 and 40 MB on their
  oldest phone, using staging
  (https://staging--gamma-expense-tracker.netlify.app) after PR 4 merges;
  every push to `main` redeploys it. The value becomes the largest size that
  restored, rounded down to a whole MB: 40 MB if all restore, or 10 MB
  (with the failure recorded) if none do. Version 2 is used because memory per
  file byte is higher for it: about 1.0 for a photo-heavy version-2 file
  against about 0.75 for version 1. A row-heavy version-2 file reaches 10 MB
  only at around 65,000 rows, far beyond any user, so photo-heavy files are the
  case that matters. Version-1 files need less memory per byte, so the same
  threshold is conservative for them.
- **The restore marker.** It records that memory-heavy restore work is in
  progress. It is a `localStorage` key, kept through `userPreferences` like
  every other key, named `expense-tracker-restore-in-progress`. It holds a
  small JSON object, `{ step: "read" | "decrypt" | "write", bytes?: number }`:
  the window's name, plus the file size as `bytes` for the read and decrypt
  windows. It is set only while the app works and never while it waits for
  the user, in three windows:
  1.  `read`: from before the file is read until the preview is built, the
      typed-passphrase prompt appears, or the attempt fails (read, automatic
      decrypt, preview);
  2.  `decrypt`: the typed-passphrase decrypt and preview;
  3.  `write`: the Dexie write after the user confirms.

  Each window ends in a `finally` block, so errors clear it too. If the marker
  is present at the next start, the restore did not finish: startup shows the
  user a message (CUJ 8), sends `import_failed { stage: "crash", step, bytes }`
  and clears it. Startup already compares an install marker with the database
  to detect data loss and shows a dialog; this works the same way.

### 5. Receipt photo pipeline

- **Limits.** `MAX_ATTACHMENT_BYTES = 512 * 1024` (0.5 MB, in
  `src/config/limits.ts`), measured on the JPEG blob before base64.
- **The ladder.** Up to three encodes, tried in order: 1600 px long edge at
  JPEG quality 0.75, 1600 px at 0.6, then 1200 px at 0.6. The last step is the
  **legibility floor**: 1200 px across a 20 cm receipt is about 150 pixels per
  inch, below which small print stops being readable. A photo is never
  upscaled.
- **Flow.** New module `src/lib/receiptPhoto.ts` exports
  `prepareReceiptPhoto(file)`, which returns a JPEG data URL or throws
  `ReceiptPhotoError` with a reason: `too-large`, `unsupported` or
  `unreadable`.

```text
file → createImageBitmap(file)
         fails → HEIC/HEIF name or type? "unsupported" : "unreadable"
     → each ladder step: draw scaled on a white canvas
                         → toBlob("image/jpeg", quality)
         not a JPEG blob → "unreadable"
         size ≤ MAX_ATTACHMENT_BYTES → data URL, done
     → no step fits → "too-large"
```

- `createImageBitmap` is called with no options. The MDN page names
  `from-image` (apply the photo's EXIF rotation) as the default for
  `imageOrientation`, and MDN's compatibility data lists support for that value
  from Chrome 112, Firefox 111 and Safari 16. All three are at or below the
  supported minimum (section 10).
- The white fill stops transparent PNGs from turning black as JPEG. The JPEG
  check guards against a browser silently returning PNG.
- `useImageAttachment` calls the module, clears the file input on failure,
  shows one message per reason, and records `attachment_rejected { reason }`.
- The limit lives only in the upload path. `expenseRecordSchema` keeps its
  `data:image/` rule (see Non-Goals).

### 6. Export toggle removal

`useExportAction(formatType, onDone)` always downloads plain content.
`ExportData` loses the encrypt state and the passphrase gate; `BackupData` keeps
both. `EncryptToggleRow` is deleted. Restore keeps accepting encrypted exports
made earlier. JSON ones restore as backups. A CSV one is recognised only after
decryption, because its plaintext does not start with `{`, so the user enters
the passphrase first and then sees a message that it is an older CSV export that
cannot be restored.

### 7. Google Drive

- `application/json` stays. `findExistingFile` matches a same-day backup by that
  type, and version 2 keeps the JSON wrapper, so the type remains true. A code
  comment records this, because the e2e Drive mock answers every query and
  would not catch a mismatch.
- Multipart upload stays, subject to the manual 6 MB test (Open Questions).
- Drive storage grows as photos × number of backups (section 12).

### 8. Telemetry

Counts, reasons and capped error text only, as `src/lib/telemetry.ts` requires.

| Event                 | Change                                                                           |
| --------------------- | -------------------------------------------------------------------------------- |
| `backup_succeeded`    | Adds `attachmentCount` and `bytes`, rounded up to the next 100 KB.               |
| `attachment_rejected` | New: `{ reason }`.                                                               |
| `import_failed`       | Adds `stage: "read"`, and `stage: "crash"` with `step` and, when known, `bytes`. |
| `export_failed`       | Drops `encrypted`.                                                               |

### 9. Security: compress before encrypt

Compression attacks such as CRIME and BREACH need two things:

- An attacker must place chosen text next to the secret. Here that is possible
  only through text the user imports, such as merchant names in a bank CSV.
- The attacker must then observe the size of many backups, one after each
  change, and adapt.

Google sees one size per backup, and PostHog sees `bytes` rounded up to 100 KB.
Neither can drive the user to import chosen text and back up again in a loop.
The passphrase and Drive tokens are not in the backup. Version 1 already reveals
the plaintext length.

### 10. Browser support

| Browser      | Supported minimum | `CompressionStream` | `createImageBitmap` `from-image` |
| ------------ | ----------------- | ------------------- | -------------------------------- |
| Chrome       | 112               | 80                  | 112                              |
| Firefox      | 113               | 113                 | 111                              |
| Safari / iOS | 16.4              | 16.4                | 16                               |

The supported minimum is documented, not enforced. On older browsers backup
still works (version 1, section 3), restoring a version-2 backup shows the
needs-newer-browser message, and the photo-rotation risk in section 12 applies.
Versions come from MDN's compatibility data. A `ponytail:` comment marks the
fallback. That is this repository's tag for a deliberate simplification, which
names its limit and when to remove it.

### 11. Rollout and PR order

```text
PR 1  fix   soft size threshold (10 MB), backup warning, restore marker,
            error messages for read and size failures
PR 2  feat  remove export toggle; e2e restore tests use Backup → device
PR 3  feat  reader: readEnvelopeVersion, version and browser checks,
            passphrase check, gunzip, encryptData(plaintext, passphrase),
            version-1 fixture and tests
PR 4  feat  writer: gzip, version "2", check field, version-1 fallback,
            backup telemetry fields
PR 5  feat  photo pipeline, MAX_ATTACHMENT_BYTES, dependency removal, tests
```

- All five PRs are squash-merged (the repository allows only squash merges)
  and ship together as release 1.10.0; release-please cuts one release after
  they merge. PR titles become the squash commit messages: `fix` for PR 1 and
  `feat` for PRs 2–5, with no `feat!`, so the version becomes 1.10.0, not
  2.0.0. Release notes describe user benefits, so they do not say "gzip" or
  "version 2".
- PR 1, PR 2 and PR 5 do not depend on each other. PR 3 starts after PR 1 and
  PR 2 merge: it builds on PR 1's error routing, and PR 2 leaves `encryptData`
  with one caller. PR 4 starts after PR 3 merges.
- PR 2 lands before PR 3 so the five e2e restore tests move to Backup → Save to
  device once; after PR 4 they exercise version-2 files with no further change.
- The reader (PR 3) and the writer (PR 4) are separate PRs so the writer can be
  reverted alone. Reverting PR 4's squash commit stops version-2 writes, and
  PR 3 keeps reading the version-2 backups already made. Reverting PR 3 as well
  would strand them.

### 12. Risks and mitigations

| Risk                                                                                                                                                                                                                | Likelihood                                                               | Mitigation or acceptance                                                            | Revisit when                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | ------------------------------------------- |
| App versions before 1.10.0 show "This file is an encrypted export, not a restorable backup" for a version-2 file, because gzip output does not start with `{`                                                       | Certain on stale devices                                                 | Release note asks users to update each device; CUJ 3 covers the reverse case        | —                                           |
| One damaged byte fails the whole file, photos and rows alike                                                                                                                                                        | Low                                                                      | Accepted; each day's backup is a separate dated file                                | Damage is reported                          |
| Threshold rests on one phone                                                                                                                                                                                        | Medium                                                                   | Accepted; the restore marker reports failures                                       | Crash count is non-zero                     |
| Marker miscounts: a closed tab or a second app tab during a restore over-counts; picking a second file while the first is still being read lets the first run's `finally` clear the second's marker and under-count | Low                                                                      | Accepted; the count is a revisit signal, not a metric; wording says "didn't finish" | Counts look implausible                     |
| Legacy file without `check` hits a memory failure inside decryption and shows "Wrong passphrase"                                                                                                                    | Low; memory failures more often crash the tab or fail outside decryption | Accepted; new backups carry `check`                                                 | Reports of a right passphrase being refused |
| Backup sizes sent to PostHog                                                                                                                                                                                        | Certain                                                                  | Rounded up to 100 KB; counts only                                                   | —                                           |
| Decoding a 48 MP photo runs out of memory on an old phone                                                                                                                                                           | Low                                                                      | The `unreadable` message suggests a screenshot, which is smaller; manual check      | Rejections with reason `unreadable` rise    |
| Photo stored sideways on Chrome below 112                                                                                                                                                                           | Low                                                                      | Accepted below the supported minimum                                                | —                                           |
| Drive storage grows with photos × backups                                                                                                                                                                           | Medium                                                                   | Accepted                                                                            | A Drive upload fails for quota              |
| Multipart upload fails above 5 MB                                                                                                                                                                                   | Unknown                                                                  | Manual test before PR 1                                                             | Test fails                                  |

## Alternatives Considered

### Alternative A: Compress the finished `.extrack` file

- **Pros**: No change to the encryption step.
- **Cons**: Encrypted bytes do not compress; only the base64 overhead would be
  recovered.
- **Reason for Rejection**: Rejected by author: it does not shrink the data,
  because compression has to happen before encryption.

### Alternative B: Binary backup file instead of a JSON wrapper

- **Pros**: About 25% smaller than the JSON wrapper with base64 fields. Restore
  would also hold about two fewer whole-file copies in memory.
- **Cons**: Harder to debug; needs new restore detection, a non-JSON Drive file
  type and new Drive file matching.
- **Reason for Rejection**: Rejected by author: the JSON wrapper keeps detection
  and Drive matching unchanged. Revisit with the Future Improvements triggers if
  restore memory becomes the limit.

### Alternative C: Remove indentation only and defer gzip

- **Pros**: Cuts 1,009 KB to 741 KB with no format change and no new version to
  read forever.
- **Cons**: Rows stay 5 times larger than with gzip (741 KB against 150 KB);
  photos get no saving instead of about 25%; a daily Drive backup of rows grows
  about 270 MB a year instead of about 55 MB.
- **Reason for Rejection**: Rejected by author: gzip saves more on both rows and
  photos for two small helpers, and a format change is cheapest while the owner
  is the main user. This stays the fallback if version 2 runs into trouble.

### Alternative D: Keep `browser-image-compression` with changed settings

- **Pros**: `useWebWorker: false` avoids the blocked CDN worker,
  `fileType: "image/jpeg"` forces JPEG, and one size check after compression
  makes the limit hard; about three lines. The library already reads EXIF
  orientation and tests whether the browser rotates images itself.
- **Cons**: Keeps a dependency with no release since 2023-03-06.
- **Reason for Rejection**: Rejected by author: built-in APIs do the same with
  one dependency fewer (rotation risk: section 12).

### Alternative E: Take photos out of the single backup file

- **Pros**: Rows would restore without depending on photo bytes or photo size.
- **Cons**: Per-photo Drive files or paired files bring partial upload failures,
  a multi-file restore picker, mismatched pairs, new Drive listing code, and
  leaks of per-file sizes and of when each receipt was added. Two sealed
  compartments in one file avoid most of that but still fail on a truncated
  file.
- **Reason for Rejection**: Rejected by author for per-photo and paired files:
  partial upload failures, a multi-file restore picker, mismatched pairs, and
  per-file size and timing leaks. Deferred by author for a photos side file
  and sealed compartments: no backup has yet come near the threshold (Future
  Improvements).

### Alternative F: Keep the expense and drop its photo when the photo fails restore validation

- **Pros**: About 5–10 lines in `buildImportPreview`. It keeps the expense row
  even when its photo is bad.
- **Cons**: The only photo rule today is the `data:image/` prefix, and AES-GCM
  rejects a damaged file whole, so only a hand-edited file triggers it.
- **Reason for Rejection**: Deferred by author: it ships in the same change that
  tightens the `attachment` rule in `src/db/recordSchemas.ts`, so old backups do
  not lose expenses.

### Alternative G: A hard restore limit

- **Pros**: A file over the limit is never read, so it cannot crash the tab.
  10 MB is today's value; 50 MiB matches `MAX_CSV_FILE_BYTES`.
- **Cons**: A refusal guarantees the rows do not come back. At 10 MB about 11
  photos (version 1) or about 15 (version 2) exceed it. 50 MiB was never
  measured.
- **Reason for Rejection**: Rejected by author: a measured soft threshold with
  clear messages loses nothing that a refusal protects.

### Alternative H: Keep encrypted export

- **Pros**: Users keep an encrypted file from the Export dialog. Two variants:
  (a) JSON only, and it marks a backup as done; (b) route it through
  `createEncryptedBackupFile` so it is a real backup.
- **Cons**: (a) makes the same file as Create Backup → Save to device under
  another name, so two buttons do one job, and the export dialog keeps its
  passphrase gate. (b) is identical to Create Backup → Save to device. An
  encrypted CSV cannot be restored in either form. There is no usage data for
  encrypted export.
- **Reason for Rejection**: Rejected by author: both keep a second entry point
  that duplicates Create Backup. Removing the toggle deletes the encrypt
  branch, the export passphrase gate and `EncryptToggleRow`.

---

## Non-Functional Requirements

- **Security & Privacy**: Encryption and key derivation are unchanged. The
  passphrase check does not make guessing cheaper (section 1). Compression
  before encryption is not exploitable under the conditions in section 9.
  New telemetry carries counts and reason labels only.
- **Performance & Latency**: Row data shrinks about 7 times and photos about
  25%. Gzip adds one stream pass to backup and restore. Estimate, not
  measured: the 600,000-iteration key derivation is the slowest step for row
  data; for multi-MB photo backups, base64 decoding and gzip may take as long.
  The phone test records restore time. A photo is decoded once and encoded up
  to three times.
- **Rollout & Rollback**: Technical Plan, section 11.

---

### Additional Resources

- MDN, [`createImageBitmap()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap):
  names `from-image` as the `imageOrientation` default.
- MDN browser-compat-data,
  [`api/_globals/createImageBitmap.json`](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/_globals/createImageBitmap.json),
  key `api.createImageBitmap.options_imageOrientation_parameter.from-image`:
  Chrome 112, Firefox 111, Safari 16.
- MDN browser-compat-data,
  [`api/CompressionStream.json`](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/CompressionStream.json)
  and
  [`api/DecompressionStream.json`](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/DecompressionStream.json):
  Chrome 80, Firefox 113, Safari 16.4.
- Release-note rules: `AGENTS.md` and the header of `src/content/releaseNotes.ts`.
- Local contract docs (gitignored, not in the repository): root `EGM.md`,
  `src/lib/EGM.md`, `src/hooks/EGM.md`, `src/db/EGM.md`, `src/config/EGM.md`,
  `src/components/more/EGM.md`, `src/components/more/export/EGM.md`,
  `src/content/EGM.md`. Each describes a directory's interface, invariants,
  side effects and verification for the owner's EGM workflow.

### Future Improvements

- **Rows-only companion file**: when a backup is over `MAX_RESTORE_FILE_BYTES`,
  also write the same backup with `attachment` removed. Merge restore skips
  existing expense IDs, so it never touches photos already on a device. First
  step towards a photos side file.
- **Sealed compartments**: rows and photos as two separately encrypted parts of
  one file, sharing one salt and key derivation, so damaged photo bytes do not
  take the rows with them.
- **Photos side file**: a rows file that restores alone plus an optional
  `-photos.extrack` file matched to expenses by ID.
- **When to revisit the three above**: a real backup passes half of
  `MAX_RESTORE_FILE_BYTES`, a Drive upload fails for size, the crash count is
  non-zero, or the owner passes about 50 photos.
- **Drop the photo, keep the expense** (Alternative F) when the `attachment`
  rule is tightened.
- **Delete old Drive backups**: an opt-in "keep the newest N".
- **Replace control for photos** that keeps the old photo when a replacement is
  rejected.
- **Pixel-budget resize** (about 4 MP) so tall scanner crops keep detail.

---

## Detailed Implementation Plan

Five PRs (Technical Plan, section 11). Each entry names the PR that changes the
file. Messages, constants and test cases are defined here once; the Technical
Plan refers to them.

The local contract docs (`EGM.md` files, Additional Resources) are gitignored.
After each PR merges, the owner updates them locally as listed under "Local
contract docs"; they are not part of any PR.

### Target Files to Create/Modify

#### 1. `src/config/limits.ts` (Modify)

- **Type / Scope**: TypeScript constants.
- **Proposed Changes**:
  - PR 1: `MAX_RESTORE_FILE_BYTES = 10 * 1024 * 1024`. Comment: restore asks
    before reading a larger file and backup warns above it; neither refuses.
    After the phone test (Verification Plan), the value and its comment
    (phone model, version-2 photo-heavy files) are updated in a follow-up
    `chore(backup)` PR before release; tuning an unreleased value needs no
    release note.
  - PR 5: `MAX_ATTACHMENT_BYTES = 512 * 1024`. Comment: measured on the JPEG
    `Blob`, before base64.

#### 2. `src/lib/backup.ts` (Modify)

- **Type / Scope**: Encryption, envelope, reminders.
- **Proposed Changes**:
  - PR 3:
    - Private `gunzip(bytes: Uint8Array): Promise<Uint8Array>`:
      `new Uint8Array(await new Response(new Blob([bytes]).stream()
      .pipeThrough(new DecompressionStream("gzip"))).arrayBuffer())`. Do
      not feed the stream through `writable.getWriter()`: on non-gzip
      input it leaves an unhandled rejection, which fails `vp test`.
    - `ExtrackEnvelope.version` is typed `string`; add optional
      `check?: string`.
    - Export `KNOWN_BACKUP_VERSIONS: readonly string[] = ["1", "2"]`,
      `NEWER_VERSION_MESSAGE = "This backup was made by a newer version of
      ExTrack. Close and reopen the app, and accept the update if
      asked."` and `WRONG_PASSPHRASE_MESSAGE = "Wrong passphrase —
      decryption failed"` (today's text, now one constant).
    - Replace `isEncryptedFile(text): boolean` with
      `readEnvelopeVersion(text): string | null`: parse JSON; return
      `version` when `format === "extrack-encrypted-backup"` and `version`
      is a string; otherwise `null`. Parse errors return `null`.
    - `decryptData(encryptedJson, passphrase?)` keeps its signature. Order:
      1.  Parse, else "Invalid encrypted file".
      2.  Check `format`, else "Not an encrypted backup file".
      3.  If the version is not in `KNOWN_BACKUP_VERSIONS`, throw
          `Error(NEWER_VERSION_MESSAGE)`.
      4.  Resolve the passphrase, then decode the fields and derive the
          key with the file's `iterations`.
      5.  When `check` is present: split it into the first 12 bytes (IV)
          and the rest, and AES-GCM decrypt it in a `try` whose `catch`
          throws `Error(WRONG_PASSPHRASE_MESSAGE)`. A successful decrypt is
          enough (the GCM tag authenticates it); the plaintext is not
          compared.
      6.  Decrypt `ciphertext` in a `try`. Its `catch` throws
          `Error("Backup could not be decrypted")` when `check` was
          present, and `Error(WRONG_PASSPHRASE_MESSAGE)` when it was
          absent.
      7.  For version `"2"`, gunzip in its own `try`; its `catch` throws
          `Error("Backup decrypted but could not be unpacked")`.
      8.  UTF-8 decode.
    - `decryptWithStoredPassphrase(text)`: return `null` when no
      passphrase is stored or the error's message is
      `WRONG_PASSPHRASE_MESSAGE`; re-throw every other error.
    - `encryptData(plaintext, passphrase)` takes the passphrase and no
      longer reads the store; it still writes version `"1"` with no
      `check` in this PR.
    - `createEncryptedBackupFile(data)` reads the stored passphrase,
      throws `Error("No encryption passphrase set")` when missing (today's
      text), and calls `encryptData(json, passphrase)`. It returns
      `{ filename, encrypted }`, as today.
  - PR 4:
    - Private `gzip(bytes)`: the same expression as `gunzip` with
      `CompressionStream("gzip")`.
    - `encryptData`: when `typeof CompressionStream !== "undefined"`, gzip
      the UTF-8 bytes before AES-GCM and write `version: "2"`; otherwise
      write `version: "1"` without gzip. A `ponytail:` comment on that
      branch says: version-1 fallback for browsers below the supported
      minimum (Chrome 112, Firefox 113, Safari/iOS 16.4); remove when
      backups from such browsers stop appearing. Both branches add
      `check`: a fresh random 12-byte IV followed by AES-GCM(key, IV,
      UTF-8 `"extrack"`), base64url-encoded.
  - Unchanged: `buildBackupEnvelope`, the key derivation, `ITERATIONS`.

#### 3. `src/lib/importPreview.ts` (Modify)

- **Type / Scope**: Restore preview.
- **Proposed Changes**: PR 1: delete `validateImportFile`. Its only caller is
  `readAndCheckFile`, which takes over the size check (file 4). Clean cutover,
  no alias.

#### 4. `src/hooks/useEncryptedFileImport.ts` (Modify)

- **Type / Scope**: React hook, encrypted import flow.
- **Proposed Changes**:
  - Messages (one place):

    | Message                          | Text                                                                                                          |
    | -------------------------------- | ------------------------------------------------------------------------------------------------------------- |
    | `TOO_LARGE_MESSAGE`              | "This backup may be too large for this device's memory. Try restoring it on a computer."                      |
    | confirm text                     | "This file is {mb} MB. Restoring files this large may fail on phones with little memory. Try anyway?"         |
    | wrong passphrase (shown to user) | "Wrong passphrase — try again" (today)                                                                        |
    | other failure                    | "Decryption failed. The file may be corrupted." (today)                                                       |
    | needs newer browser              | "This backup needs a newer browser (Chrome 80+, Firefox 113+ or Safari 16.4+). Restore it on another device." |
    | older CSV export                 | "This file is an encrypted CSV export from an older version and can't be restored."                           |

    Only `TOO_LARGE_MESSAGE` becomes a constant; the other rows are inline
    strings. `{mb}` is `(bytes / (1024 * 1024)).toFixed(1)`, written inline
    in both `useEncryptedFileImport.ts` and `useBackupAction.ts` (file 8);
    no shared helper.

  - PR 1:
    - `FileCheck` gains `{ cancelled: true }`.
    - `readAndCheckFile`: when `file.size > MAX_RESTORE_FILE_BYTES` (from
      `@/config/limits`), `window.confirm` the confirm text; Cancel returns
      `{ cancelled: true }`. Then `userPreferences.markRestoreStarted({
      step: "read", bytes: file.size })` before `file.text()`.
    - `decryptErrorMessage(err, isLarge)`: a wrong-passphrase error
      (today's `message.includes("Wrong passphrase")` test, made exact in
      PR 3) → wrong passphrase; otherwise `isLarge` → `TOO_LARGE_MESSAGE`;
      otherwise the other-failure text.
    - `performFileSelect`: on `cancelled`, reset the file input and
      return with no toast. Wrap the body after `setManualPassphrase("")`
      in `try / catch / finally`. The `catch` returns if `!isCurrent()`,
      else calls `captureError("import_failed", err, { stage: "read" })`,
      `toast.error(decryptErrorMessage(err, file.size >
      MAX_RESTORE_FILE_BYTES))`, and resets the input. The `finally`
      calls `userPreferences.markRestoreEnded()`. `{ error }` and
      `{ cancelled }` results send no telemetry; only errors thrown
      during file selection reach `captureError`.
    - A `resolvePlaintext` result of `"invalid"` on a file over the
      threshold shows `TOO_LARGE_MESSAGE` instead of "Invalid backup
      file" in `performFileSelect` and `performManualDecrypt`.
    - `performManualDecrypt`: call `userPreferences.markRestoreStarted({
      step: "decrypt", bytes: deps.pendingEncryptedText.length })` before
      `decryptData`; add `markRestoreEnded()` to its `finally`; pass
      `deps.pendingEncryptedText.length > MAX_RESTORE_FILE_BYTES` as
      `isLarge`.
  - PR 2: `rejectNonBackupPlaintext` shows the older-CSV-export text. Not
    covered by an automated test: after PR 2 the app cannot create an
    encrypted CSV, and the change is one string.
  - PR 3:
    - The wrong-passphrase test in `decryptErrorMessage` becomes
      `err.message === WRONG_PASSPHRASE_MESSAGE`.
    - `readAndCheckFile` uses `readEnvelopeVersion(text)`. `null` → "Only
      encrypted .extrack backup files can be imported" (today's text).
      Not in `KNOWN_BACKUP_VERSIONS` → `NEWER_VERSION_MESSAGE`. `"2"` with
      `typeof DecompressionStream === "undefined"` → the
      needs-newer-browser text. All three return `{ error }`.

#### 5. `src/components/more/ImportData.tsx` (Modify)

- **Type / Scope**: React component, restore write.
- **Proposed Changes**: PR 1: in `performImport`, call
  `userPreferences.markRestoreStarted({ step: "write" })` before the write,
  and `userPreferences.markRestoreEnded()` in its `finally`.

#### 6. `src/db/userPreferences.ts` (Modify)

- **Type / Scope**: `localStorage` wrapper.
- **Proposed Changes**: PR 1:
  - `STORAGE_KEYS.restoreInProgress = "expense-tracker-restore-in-progress"`.
  - Private `removeItem(key)` with the same `try/catch` as `setItem`.
  - Export `type RestoreMarker = { step: "read" | "decrypt" | "write";
    bytes?: number }`.
  - `markRestoreStarted(marker: RestoreMarker)`: store
    `JSON.stringify(marker)`.
  - `markRestoreEnded()`: remove the key.
  - `takeInterruptedRestore(): RestoreMarker | null`: read and remove the
    key; return the parsed object, or `null` when the key is absent or its
    value is not valid JSON.
  - `clearAll` already covers the key.

#### 7. `src/hooks/useAppStartup.ts` (Modify)

- **Type / Scope**: React hook, startup.
- **Proposed Changes**: PR 1: after `capture("app_opened", …)`, call
  `userPreferences.takeInterruptedRestore()`. When it returns a marker:
  `capture("import_failed", { stage: "crash", ...marker })` and
  `toast.warning("Your last restore didn't finish. The file may be too large
  for this device's memory. Try restoring it on a computer.")`.

#### 8. `src/hooks/useBackupAction.ts` (Modify)

- **Type / Scope**: React hook, create-backup workflow.
- **Proposed Changes**:
  - PR 1: after the save or upload succeeds (after the existing success toast,
    before `setSaveTo("device")`), when `encrypted.length >
    MAX_RESTORE_FILE_BYTES`, call `toast.warning` with "This backup is {mb}
    MB. Restoring it may fail on phones with little memory." and `duration:
    15_000`. The early `return` when `uploadBackupToDrive` returns `null`
    stays before it.
  - PR 4: compute `attachmentCount` as the number of `data.expenses` with a
    truthy `attachment` and pass it to both targets.

#### 9. `src/lib/backupTargets.ts` (Modify)

- **Type / Scope**: Drive and device targets.
- **Proposed Changes**: PR 4: `uploadBackupToDrive(encrypted, filename,
  accessToken, expenseCount, attachmentCount)` and
  `saveBackupToDevice(encrypted, filename, expenseCount, attachmentCount)`. Both
  send `capture("backup_succeeded", { target, expenseCount, attachmentCount,
  bytes: Math.ceil(encrypted.length / 102_400) * 102_400 })`.

#### 10. `src/lib/driveApi.ts` (Modify)

- **Type / Scope**: Drive REST calls.
- **Proposed Changes**: PR 4, comment only, next to `buildMetadataBlob` and
  `findExistingFile`: the two `application/json` values must match; the
  version-2 wrapper is still JSON; the e2e Drive mock would not catch a
  mismatch.

#### 11. `src/hooks/useExportAction.ts` (Modify)

- **Type / Scope**: React hook, export.
- **Proposed Changes**: PR 2: `useExportAction(formatType: ExportFormat, onDone:
  () => void)`. Remove the `encryptData` import and the encrypt branch; always
  `downloadFile(content, filename, mimeType)`. `captureError("export_failed",
  err, { format: formatType })`. Doc comment drops "optionally encrypt".

#### 12. `src/components/more/ExportData.tsx` (Modify)

- **Type / Scope**: React component.
- **Proposed Changes**: PR 2: remove the `encrypt` state, `usePassphraseGate`,
  `SetupPassphraseDialog` and `handleExportClick`. `onDone` resets `formatType`
  to `"json"` and closes the dialog. `ExportDialogContent` receives
  `onExportClick={handleExport}`.

#### 13. `src/components/more/export/ExportDialogContent.tsx` (Modify)

- **Type / Scope**: React component.
- **Proposed Changes**: PR 2: remove the `encrypt`/`setEncrypt` props and the
  `EncryptToggleRow` element and import.

#### 14. `src/components/more/export/EncryptToggleRow.tsx` (Delete)

- **Type / Scope**: React component.
- **Proposed Changes**: PR 2: delete. Its only user is file 13; it is the
  only importer of file 27.

#### 15. `src/lib/receiptPhoto.ts` (Create)

- **Type / Scope**: TypeScript module, browser APIs (covered by e2e, file 22).
- **Proposed Changes**: PR 5.
  - Exports `type ReceiptPhotoRejection = "too-large" | "unsupported" |
    "unreadable"`, `class ReceiptPhotoError extends Error` with `readonly
    reason`, and `prepareReceiptPhoto(file: File): Promise<string>`.
  - `LADDER` holds the three steps from Technical Plan section 5.
  - Steps:
    1.  `createImageBitmap(file)`. On rejection: `unsupported` when
        `file.type` is `image/heic` or `image/heif` or the name ends in
        `.heic`/`.heif` (case-insensitive); otherwise `unreadable`.
    2.  For each step: scale so the long edge is at most the step's edge and
        never larger than the original; a canvas of that size; a null 2D
        context → `unreadable`; fill white; `drawImage`; `toBlob("image/jpeg",
        quality)` in a promise.
    3.  A null blob or `blob.type !== "image/jpeg"` → `unreadable`. `blob.size
        <= MAX_ATTACHMENT_BYTES` → `FileReader.readAsDataURL` in a promise,
        return.
    4.  No step fits → `too-large`.
    5.  `bitmap.close()` in `finally`.
  - `ponytail:` comment: a long-edge cap shrinks the short edge of tall
    scanner crops; a pixel budget (about 4 MP) is the upgrade.

#### 16. `src/hooks/useImageAttachment.ts` (Modify)

- **Type / Scope**: React hook.
- **Proposed Changes**: PR 5. Remove the library import and the `FileReader`
  callback. `handleImageUpload` reads `const input = e.target` and the file
  before the first `await`, then awaits `prepareReceiptPhoto(file)`. Success:
  `setValue("attachment", dataUrl)` and `setImagePreview(dataUrl)`. Failure:
  `input.value = ""`; `reason` from `ReceiptPhotoError`, else `unreadable`;
  `capture("attachment_rejected", { reason })`; `toast.error` with:

  | Reason        | Message                                                                                                     |
  | ------------- | ----------------------------------------------------------------------------------------------------------- |
  | `too-large`   | "This photo is too detailed to save under 0.5 MB. Crop closer to the receipt and try again."                |
  | `unsupported` | "This browser can't open HEIC photos. Take a screenshot of the photo or save it as a JPEG, then try again." |
  | `unreadable`  | "Couldn't open this photo. Try a JPEG or PNG, or take a screenshot of it."                                  |

  The return shape does not change, so `useExpenseFormController.ts` and
  `AttachmentField.tsx` need no edit.

#### 17. `package.json` and `bun.lock` (Modify)

- **Type / Scope**: Dependencies.
- **Proposed Changes**:
  - PR 2: `bun remove @radix-ui/react-checkbox` (its only user is file 27);
    commit both files.
  - PR 5: `bun remove browser-image-compression`; commit both files.

#### 18. `src/content/releaseNotes.ts` (Modify)

- **Type / Scope**: Release-note data.
- **Proposed Changes**: one entry per PR at the top of `RELEASE_NOTES`,
  `version: "1.10.0"`, `date` = the PR's authoring date, no flags, no `action`:

  | PR  | `id`                          | `type`     | `title`                                               | `body`                                                                                                                                               |
  | --- | ----------------------------- | ---------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
  | 1   | `1.10.0-large-backup-restore` | `fixed`    | Large backups are no longer refused                   | ExTrack no longer refuses a large backup. It asks first, and warns when a backup is big enough that restoring may fail on phones with little memory. |
  | 2   | `1.10.0-export-plain-only`    | `improved` | Export saves plain files; Backup makes encrypted ones | Export Data now saves plain JSON or CSV. For an encrypted file, use Create Backup.                                                                   |
  | 3   | `1.10.0-backup-open-messages` | `improved` | Clearer messages when a backup can't be opened        | If a backup comes from a newer ExTrack or needs a newer browser, ExTrack now says so before asking for your passphrase.                              |
  | 4   | `1.10.0-smaller-backups`      | `improved` | Backups are smaller                                   | Backup files are now smaller, and older backups still restore. Update ExTrack on any device before restoring a new backup there.                     |
  | 5   | `1.10.0-photo-limit`          | `improved` | Receipt photos are kept small                         | Photos are resized when you attach them so backups stay small. If a photo can't be used, you see why and the expense still saves.                    |

  PR 1 uses 1.10.0, not 1.9.2, because all five PRs ship together (section
  11). `CHANGELOG.md` is generated by release-please and is not edited.

#### 19. `src/lib/backup.test.ts` (Create)

- **Type / Scope**: Unit test (`vite-plus/test`, the repository's vitest
  wrapper; Node 24 provides `crypto.subtle`, `CompressionStream` and
  `DecompressionStream`). The passphrase is passed as a parameter, so no
  IndexedDB is needed.
- **Proposed Changes**: A local helper builds a wrapper from `version`,
  `iterations`, `passphrase`, plaintext bytes and an optional `check`, using
  WebCrypto and `b64uEncode`, with 1,000 iterations (the reader uses the
  file's value).

  | #   | PR  | Case                                                                                                                             | Asserts                                                                                                                                                                                                                            |
  | --- | --- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | 1   | 3   | committed version-1 fixture (no `check`), loaded with `readFileSync("tests/fixtures/backup-v1.extrack", "utf-8")` from `node:fs` | `decryptData(fixture, "fixture-passphrase-v1")` gives inner `version: "1.0"`; `buildImportPreview` of it gives 3 expenses with the known descriptions, one `attachment` starting `data:image/jpeg;base64,`, and no skipped records |
  | 2   | 3   | hand-built version 2 with `check`                                                                                                | `decryptData` returns the original text                                                                                                                                                                                            |
  | 3   | 3   | version `"3"` with invalid `salt`, `iv`, `ciphertext`                                                                            | rejects with `NEWER_VERSION_MESSAGE` before decoding                                                                                                                                                                               |
  | 4   | 3   | wrong passphrase on version 2, ciphertext replaced with `b64uEncode` of 64 random bytes                                          | rejects with `WRONG_PASSPHRASE_MESSAGE`, which proves the check runs first                                                                                                                                                         |
  | 5   | 3   | right passphrase, valid `check`, one ciphertext byte flipped                                                                     | rejects with the exact message "Backup could not be decrypted", not `WRONG_PASSPHRASE_MESSAGE`                                                                                                                                     |
  | 6   | 3   | version 2 whose AES-GCM plaintext is not gzip                                                                                    | rejects with the exact message "Backup decrypted but could not be unpacked"                                                                                                                                                        |
  | 7   | 3   | `readEnvelopeVersion`                                                                                                            | `"2"` for a wrapper; `null` for `{"foo":1}`, a wrong `format`, a numeric `version`, and non-JSON text                                                                                                                              |
  | 8   | 4   | writer round trip                                                                                                                | `encryptData(json, pass)` yields `version` `"2"` and a `check`; `decryptData` returns the original; for 200 repeated rows the wrapper is under half the plaintext length                                                           |
  | 9   | 4   | fallback with `globalThis.CompressionStream` removed for the test                                                                | yields `version` `"1"` with a `check`; `decryptData` returns the original                                                                                                                                                          |

#### 20. `tests/fixtures/backup-v1.extrack` (Create)

- **Type / Scope**: Test fixture.
- **Proposed Changes**: PR 3. Generated while `encryptData` still writes
  version 1 without `check`, by a one-off Bun script kept outside the
  repository and run from the repository root (`backup.ts` loads under Bun).
  The script builds two categories (Food, Others) and three expenses
  ("Fixture lunch" 120.5, "Fixture cab" 250, "Fixture receipt" 75 with a tiny
  `data:image/jpeg;base64,` attachment) as valid records, following the
  shapes in `src/lib/importPreview.test.ts`: categories with `id`, `name`,
  `icon`, `color` (`#RRGGBB`) and `createdAt`; expenses with `id`, `value`,
  `category`, `description`, `tags: []`, `date`, `time`, `isAdhoc: false`,
  `createdAt` and `updatedAt`. It passes `buildBackupEnvelope(...)` to
  `encryptData(json, "fixture-passphrase-v1")` and writes the result
  unchanged. Synthetic data and a throwaway passphrase only.

#### 21. `tests/e2e/data-management.spec.ts` (Modify)

- **Type / Scope**: Playwright e2e.
- **Proposed Changes**:
  - PR 1:
    - "a restore file over the threshold asks first". Build a buffer of
      `MAX_RESTORE_FILE_BYTES + 1` bytes (imported from
      `../../src/config/limits`, which has no imports) that is not an
      ExTrack wrapper. Dismiss the dialog: no toast, and the file input
      holds no file. Pick again and accept: "Only encrypted .extrack
      backup files can be imported" appears.
    - "unfinished restore is reported at the next start":
      `page.addInitScript` sets
      `localStorage["expense-tracker-restore-in-progress"]` to
      `'{"step":"read","bytes":1}'`; `gotoApp(page, "/")`; the toast
      "Your last restore didn't finish…" is visible; `expect.poll` of
      `localStorage.getItem` for the key gives `null`.
    - "an unreadable restore marker is dropped silently": the same with
      the value `"{"`; `expect.poll` of the key gives `null`, then the
      toast text has count 0.
    - "a backup over the threshold warns": `gotoApp(page,
      "/settings/data")`; `seedExpenses` 14 expenses, each with
      `attachment: "data:image/jpeg;base64," +
      randomBytes(750_000).toString("base64")` (`node:crypto`; random so
      gzip cannot shrink the file below the threshold after PR 4);
      `setPassphrase`; click the first "Create Backup"; in the dialog
      named "Backup", start `page.waitForEvent("download")`, click
      "Create Backup", then await the download; the warning "Restoring it
      may fail on phones with little memory" is visible.
    - In "encrypted round trip", after the import succeeds,
      `localStorage.getItem("expense-tracker-restore-in-progress")` is
      `null`.
  - PR 2: replace `exportEncrypted` with `backupToDevice(page, passphrase)`:
    `setPassphrase`; click the first "Create Backup"; in the dialog named
    "Backup", start `page.waitForEvent("download")`, click "Create
    Backup", then await the download; assert the name matches
    `/^extrack-backup-\d{4}-\d{2}-\d{2}\.extrack$/`; return
    `readDownload(download)` (`setPassphrase` is spec-local; `readDownload`
    is in `tests/support/app.ts`). Switch its five callers; rename
    "encrypted round trip: export, factory reset, merge import" to "…
    backup, factory reset, merge import".
  - PR 3: (1) a wrapper with `version: "3"` and placeholder fields shows
    `NEWER_VERSION_MESSAGE` and no passphrase field, first with no passphrase
    stored and again after `setPassphrase`. (2) With `addInitScript`
    deleting `window.DecompressionStream`, a wrapper with `version: "2"`
    shows the needs-newer-browser text.
  - PR 4: in the round-trip test, assert `JSON.parse(backupContent).version
    === "2"` and that `check` is present. The existing "wrong manual
    passphrase is rejected" test now exercises the check and must still show
    "Wrong passphrase — try again". New test: with `addInitScript` deleting
    `window.CompressionStream`, `backupToDevice` returns a wrapper with
    `version` `"1"` and a `check`.

#### 22. `tests/e2e/receipt-photo.spec.ts` (Create)

- **Type / Scope**: Playwright e2e (no test uploads a photo today).
- **Proposed Changes**: PR 5. Each test opens `/add`, fills Amount and Category
  as `expense-crud.spec.ts` does, builds the image in the page (canvas →
  `toBlob`), returns the encoded bytes as base64 from `page.evaluate`, and
  attaches them with `page.setInputFiles('[data-testid="attachment-input"]',
  { name, mimeType, buffer })`. Stored photos are read with `readExpenses`
  from `tests/support/db.ts`.

  | Test                                                         | Setup                                                                                                                                   | Asserts                                                                                                                                                 |
  | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | Camera-size photo is stored as JPEG within the cap           | 3000 × 2000 gradient                                                                                                                    | preview visible; after Save, the `attachment` starts `data:image/jpeg;base64,`, decodes to at most 524,288 bytes and has a long edge of at most 1600 px |
  | Photo over the cap at the floor is rejected                  | 1200 × 1200 opaque random noise (never downscaled; measured about 825 KB at quality 0.75 and 641 KB at 0.6, over the cap at every step) | too-large message; no preview; input empty; after Save the expense has no `attachment`                                                                  |
  | Undecodable files show the unsupported or unreadable message | `receipt.heic` (`image/heic`) and `receipt.jpg`, both non-image bytes                                                                   | unsupported message, then unreadable message; input empty after each                                                                                    |

#### 23. `docs/features/featureset.md` (Modify)

- **Type / Scope**: Feature documentation.
- **Proposed Changes**:
  - PR 1: Import: "File size cap" becomes "Large files: the app asks before
    reading a file over the threshold"; add "Unfinished restore: at the
    next start the app says the last restore didn't finish".
  - PR 2: Export Data: remove "Optional encryption" and the encrypted
    filename. Import: "CSV export guard" shows the older-CSV message.
    Roadmap: "End-to-end encryption for backups and exports" becomes "…
    for backups".
  - PR 3: End-to-End Encryption: unknown versions are rejected when the
    file is picked. Import: "Manual passphrase fallback" applies when no
    passphrase is stored or the stored one is wrong.
  - PR 4: End-to-End Encryption: sample envelope `"version": "2"` with
    `check`; version `"1"` still read. Backup: compressed before
    encryption, version-1 fallback on old browsers. Import: "Wrong
    passphrase detection" uses the file's passphrase check; files without
    one keep today's behaviour.
  - PR 5: Attachments: JPEG of at most 0.5 MB. Performance and tech stack:
    replace `browser-image-compression` with the built-in canvas pipeline.

#### 24. `docs/features/e2ee.md` (Modify)

- **Type / Scope**: Historical plan.
- **Proposed Changes**: PR 2: one line under the title saying export
  encryption was removed, linking this design. PR 4: append to that line
  that the backup format is now version 2. The plan text stays as history.

#### 25. `docs/gtm/project-showcase.md` (Modify)

- **Type / Scope**: Marketing document.
- **Proposed Changes**: PR 4: the sample envelope's `"version"` becomes `"2"`
  and gains `"check"`.

#### 26. `README.md` (Modify)

- **Type / Scope**: Project readme.
- **Proposed Changes**: PR 5: delete the `browser-image-compression` line from
  the tech stack list.

#### 27. `src/components/ui/checkbox.tsx` (Delete)

- **Type / Scope**: shadcn UI component.
- **Proposed Changes**: PR 2: delete. Its only importer is file 14.

#### 28. `.fallowrc.json` (Modify)

- **Type / Scope**: Fallow configuration.
- **Proposed Changes**: any PR, only by the CI-gates rule in the Verification
  Plan.

### Local contract docs (not committed)

Updated by the owner after the named PR merges. Anchors use `[file:symbol]`.

- **`src/lib/EGM.md`**:
  - Backup interface (PR 3): `[backup.ts:encryptData]`
    `(plaintext, passphrase)`, `[backup.ts:readEnvelopeVersion]` replacing
    `isEncryptedFile`, the three exported constants, and optional `check`
    in the envelope type.
  - Envelope invariant (PR 4): every new file carries `check`.
  - `[backup.ts:decryptWithStoredPassphrase]` returns `null` only for a
    wrong passphrase (PR 3).
  - Remove `validateImportFile` and the 10 MB sentence (PR 1).
  - Backup targets take `attachmentCount`, and `backup_succeeded` gains its
    fields (PR 4).
  - `[receiptPhoto.ts:prepareReceiptPhoto]`, the ladder and
    `MAX_ATTACHMENT_BYTES` (PR 5).
  - Browser APIs `CompressionStream`, `DecompressionStream`,
    `createImageBitmap` (PR 4, PR 5).
  - Verification lists `backup` (PR 3).
- **`src/hooks/EGM.md`**:
  - `readAndCheckFile`: confirmation, restore marker, error messages (PR 1);
    version and browser checks (PR 3).
  - `useBackupAction`: warning (PR 1).
  - `useAppStartup`: unfinished-restore toast and telemetry (PR 1).
  - `useExportAction(formatType, onDone)` (PR 2).
  - `useImageAttachment` pipeline (PR 5).
- **`src/db/EGM.md`**: the new key and the three `userPreferences` methods
  (PR 1).
- **`src/config/EGM.md`**: both constants (PR 1, PR 5).
- **`src/components/more/EGM.md`**:
  - `ImportData` restore marker (PR 1).
  - `SetupPassphraseDialog` used by `BackupData` only; the export invariant
    changes (PR 2).
- **`src/components/more/export/EGM.md`**: remove the checkbox and
  `EncryptToggleRow` (PR 2).
- **`src/content/EGM.md`**: release-note range "1.10.0 → 1.0.0" (PR 1).
- **Root `EGM.md`**: the Encryption rule describes version 2, `check`, and the
  version-1 fallback (PR 4).

### Verification Plan

- **Compilation/Build**: `bun run build` per PR.
- **Unit Tests**: `bun run test`. PR 3 adds file 19 cases 1–7; PR 4 adds
  cases 8–9.
- **Static Analysis & Linting**: `bun run check` and `bun run lint` per PR. PR 1,
  PR 2 and PR 5 change UI code, so every error from the repository's
  `shadcn/*` design-system lint rules must be fixed.
- **CI gates**: `bun run audit:pr` and `bunx fallow health --score
  --min-score 95` per PR (PR Checks runs both). When either flags a function
  this PR changes, add or raise that function's `thresholdOverrides` entry in
  `.fallowrc.json`: set the flagged metric (`maxCrap`, `maxCyclomatic` or
  `maxCognitive`) to the reported value rounded up to the next multiple of 5,
  with a `reason` naming the branches this PR added, in the style of the
  existing entries. Do not split functions to satisfy the gate. Overrides do
  not change the health score; only raw penalties (functions over 60 lines,
  files with more than 10 importers) do. To keep the `@/config` barrel at 10
  importers, `MAX_RESTORE_FILE_BYTES` and `MAX_ATTACHMENT_BYTES` are imported
  from `@/config/limits` in every new consumer (PR 1, PR 5; owner decision,
  2026-11-27). If a PR still drops the score below 95, stop and ask the owner.
- **Test Coverage Requirement**: no repository threshold. Each decision in
  `backup.ts` (version check, passphrase check, decrypt failure with and
  without `check`, gunzip failure, compression, fallback) has a case in
  file 19.
- **E2E/Integration**: `bun run test:e2e tests/e2e/data-management.spec.ts
  tests/e2e/drive-oauth.spec.ts tests/e2e/backup-reminder.spec.ts
  tests/e2e/expense-crud.spec.ts tests/e2e/receipt-photo.spec.ts
  tests/e2e/boot.spec.ts tests/e2e/data-loss.spec.ts` (PR 1 changes
  `useAppStartup`, which the last two exercise). `drive-oauth.spec.ts`
  restores the upload the mock captured, so after PR 4 it restores a
  version-2 file with no edit.
- **Manual checks** (scripts are throwaway and not committed):
  - Before PR 1 merges: upload one real backup of 6 MB or more to Drive by
    hand. If it fails, a fix PR lands first and switches
    `uploadFileToDrive` (`src/lib/driveApi.ts`) to Google's resumable
    upload: a POST with `uploadType=resumable` and the metadata, then a PUT
    of the bytes to the returned `Location`. That PR gets its own design
    entry.
  - Before release 1.10.0, on staging
    (https://staging--gamma-expense-tracker.netlify.app) after PR 4 merges
    (every push to `main` redeploys it): make photo-heavy version-2
    backups of about 10, 20, 30 and 40 MB. Use a throwaway Playwright script
    outside the repository that seeds expenses with large image data URLs
    through `seedExpenses` (`tests/support/db.ts`) and runs Create Backup →
    Save to device. Restore each on the owner's oldest phone, choosing OK
    at the "Try anyway?" prompt. Report the phone model, which files
    restored and the restore times; the threshold PR records them in the
    constant's comment (phone, format, date) and its body (times), and sets
    `MAX_RESTORE_FILE_BYTES` by the rule in Technical Plan section 4.
  - PR 5:
    - Attach an EXIF-rotated portrait JPEG on iOS Safari 16.4 or later
      and on Chrome 112 or later, and confirm the stored photo is upright.
    - Attach one 48 MP photo on the oldest phone and tick the PR 5
      checklist item with "stored" or "rejected".

---

<!-- Provenance: Indicates initial structural drafting via EGM. -->

_Drafted with EGM_
