# Goldfish Annotated Review Report: Stage 5 Resolution

**Status: resolved** (2026-11-25, "auto accept"). Applied 15 of 17 proposals,
each with its suggested option. Contested: 0. Escalated: 0. Declined: 2
(C3's rows-only copy, which is now a Future Improvement, and C6's two-release
rollout, which is now a Non-Goal). The design was rewritten in one pass (Z7).
It is now 968 lines, down from 1,289.

**Adjustments made while applying:**

- **Z11 is subsumed by C1.** The soft limit moves the size check into
  `readAndCheckFile`, and `validateImportFile` is deleted. No module under unit
  test reads the config barrel any more.
- **C2 is placed by convention.** The restore marker lives in
  `userPreferences`, which owns every other `localStorage` key, instead of
  `backup.ts`. It is cleared in `finally` blocks rather than at each exit, so
  Cancel is covered without extra calls.
- **Z6 + C4 add messages for old browsers.** Both sides of version 2 now say
  "update your browser" instead of showing a raw error or "file may be
  damaged". There is one message for backup and one for restore.

**Target:** `docs/features/designs/smaller-encrypted-backups-and-bounded-receipt-photos.md` (full file, lines 1-1289)

**Source findings:** `zoom_out_report.md` (Z1–Z11 from `egm-zoom-out`, C1–C6 from `egm-inventive-catalyst`).

**Verified by the drafting session before classifying:**

- Z3: the installed library does read EXIF orientation and tests whether the
  browser rotates images itself (`browser-image-compression.d.ts`:
  `exifOrientation`, `getExifOrientation`; `.mjs`: `isAutoOrientationInBrowser`).
  Its worker loads from `cdn.jsdelivr.net/npm/browser-image-compression@2.0.2`,
  which the site CSP (`netlify.toml:35`, `script-src 'self'`,
  `worker-src 'self'`) blocks. `useWebWorker: false` avoids that load.
- Z2: an encrypted JSON export is `encryptData(buildBackupEnvelope(data))`
  (`src/lib/exportData.ts:17-21`). That is byte-for-byte the same content as a
  backup, but it does not call `markBackupCompleted`, so the backup reminder
  does not see it. An encrypted CSV export produces a `.extrack` file that
  restore rejects. The design states neither fact.
- C1: the repo already uses `window.confirm` for a destructive choice
  (`useBulkAddController.ts:handleRemoveBlock`, `src/hooks/EGM.md:92`), so a
  confirmation needs no new dialog state.
- C3: merge restore skips an expense whose ID already exists
  (`ImportData.tsx:113-118`). The reviewer's claim holds.
- New gap found while checking Z1: on a browser without
  `DecompressionStream` (Safari before 16.4, Firefox before 113), restoring a
  version-2 file throws a `ReferenceError` after a successful decrypt. Under
  the current design that is reported as "could not be unpacked. The file may
  be damaged", which is false. The fix under Z6 covers it.

**Decisions needed from the author.** Four items reverse or change a choice made
during brainstorming: Z1, Z3, Z4 and Z5/C1. Each lists a suggested fix and the
alternative. "Auto accept" applies the suggested fix. Use "interactive
breakdown" to choose the alternative instead.

## Prioritized Findings & AI Suggestions

### Z1. Gzip and format version 2 fix a problem the document never shows [`egm-zoom-out`] - Severity: Major

- **Affected Scope:** Overview item 1 (18–21); The Problem, first paragraph (37–44); Alternatives C and F (513–523, 541–548).
- **Discrepancy Description:** No harm from a 1 MB backup of rows is shown. Gzip carries most of the cost: a permanent format version, reader-then-writer commits, a fixture, a version check, a higher browser floor, and a false message on old app versions. The plan never says what users see when `CompressionStream` is missing (`useBackupAction.ts:70-72` would show the raw `ReferenceError`).
- **Rationale:** YAGNI. The stated reasons ("learning", "cheapest now") are preferences, not a root problem.
- _**AI Suggestion:**_ PROPOSE FIX (author decision)
- _**Justification:**_ The critique is accurate: the design never states a harm. There is one concrete harm the design omits. Nothing deletes old Drive backups (Technical Plan section 7), so daily Drive backups at the owner's size add about 360 MB a year today and about 55 MB a year with gzip. That is a real but modest benefit for users without photos. The missing-`CompressionStream` gap is real whichever way this is decided.
- _**Proposed Edit (suggested: keep gzip):**_
  - Location: The Problem, first paragraph; Goals; Alternative C.
  - Change: State the harm in numbers (yearly Drive growth for daily backups of 1,987 rows, about 360 MB vs about 55 MB) and say plainly that gzip is headroom for rows and does not help photos. In `createEncryptedBackupFile`, when `CompressionStream` is undefined, throw "This browser is too old to create backups. Update it and try again." The existing toast shows that message. The read-side check is in Z6.
- _**Alternative (drop gzip):**_ Remove format version 2, PR 3, the fixture, the version check and the browser floor. Keep the version-1 writer and remove indentation from the outer wrapper only (`JSON.stringify(envelope)`). The inner JSON is shared with the plain export, so it stays indented. Saves less than gzip. A future format change still needs the reader-first rollout.

### Z2. Removing the export toggle is unrelated scope, and its stated reason does not hold [`egm-zoom-out`] - Severity: Major

- **Affected Scope:** Overview item 4 (28–29); Goals (101–102); CUJ 6 (214–219); Technical Plan sections 6 and 11 (393–403, 456–460).
- **Discrepancy Description:** No problem in The Problem concerns exports. The only reason given, "`encryptData` then has one caller, so gzip goes straight in with no flag", is false: an `encryptData` that always gzips serves both callers.
- **Rationale:** Split it out or drop it, so it does not ride on a false dependency.
- _**AI Suggestion:**_ PROPOSE FIX
- _**Justification:**_ The dependency claim is wrong. The removal still has two real reasons the design never states (see the verified facts above): an encrypted JSON export is a backup that the reminder never records, and an encrypted CSV export is a `.extrack` file that restore rejects. It is already its own PR.
- _**Proposed Edit:**_
  - Location: The Problem (new short paragraph); Technical Plan sections 6 and 11.
  - Change: Add "Export makes a second kind of encrypted file" to The Problem with the two facts above. Delete the "one caller" sentence. The ordering reason becomes: PR 2 lands before PR 3 only so the five e2e restore tests move to Backup → Save to device once, rather than being rewritten again.

### Z3. Replacing the image library adds a rotation risk the library already handles [`egm-zoom-out`] - Severity: Major

- **Affected Scope:** Overview item 3 (25–27); Open Question 3 (150–159); Technical Plan section 5 (334–391); Alternatives I, J, K (571–597).
- **Discrepancy Description:** The library handles EXIF rotation. The built-in pipeline gives that up, which is why Open Question 3 admits sideways photos on Chrome 80–111. The library's two faults can be fixed with settings (Alternative J, about three lines).
- **Rationale:** Rebuilding an installed dependency adds a regression risk. Being dormant is not a defect.
- _**AI Suggestion:**_ PROPOSE FIX (author decision)
- _**Justification:**_ The reviewer's evidence holds. But MDN's compatibility data lists the `from-image` default from Chrome 112, Firefox 111 and Safari 16. The design's floor is already Firefox 113 and Safari 16.4 because of `CompressionStream`. Raising only the Chrome floor from 80 to 112 (released April 2023) puts every supported browser on the `from-image` default. That closes Open Question 3 and removes the regression on supported browsers without keeping the dependency. Choosing the library instead is defensible; the author rejected it during brainstorming (Alternative J) to drop a dormant dependency.
- _**Proposed Edit (suggested: keep built-in, raise Chrome floor):**_
  - Location: Technical Plan section 10; Open Question 3; Alternative K; Verification manual checks.
  - Change: Minimum browsers become Chrome 112, Firefox 113, Safari/iOS 16.4. Delete Open Question 3. Cite the source as the MDN browser-compat-data file `api/_globals/createImageBitmap.json` (URL in Additional Resources). Keep one manual rotation check on iOS Safari. Alternative K records that passing the option explicitly is unnecessary at this floor.
- _**Alternative (Alternative J, reconfigure the library):**_ Keep `browser-image-compression` with `useWebWorker: false`, `fileType: "image/jpeg"` and a size check after compression. Delete `receiptPhoto.ts`, the ladder, HEIC detection, the white fill and the blob-type guard. The rejection messages and the e2e photo tests stay.

### Z4. The 1 MB photo cap works against the backup-size goal and is never justified [`egm-zoom-out`] - Severity: Major

- **Affected Scope:** The Problem, second paragraph (50–53); Goals, "Photos are bounded" (94–99); Technical Plan sections 4–5 (330, 354–355).
- **Discrepancy Description:** Today's target is 0.5 MB (`useImageAttachment.ts:19`). The design doubles it with no stated reason, which halves the number of photos that fit under the restore limit.
- **Rationale:** Keep 0.5 MB as a hard limit, or justify 1 MB with evidence.
- _**AI Suggestion:**_ PROPOSE FIX (author decision)
- _**Justification:**_ No evidence for 1 MB exists in the design or the brief. A receipt stays readable well below 2048 px. At 1600 px on the long edge, a 20 cm receipt is about 200 pixels per inch, and at 1200 px about 150. A 0.5 MB cap about doubles the photos per backup. It combines with C5: a fixed ladder that ends at a stated legibility floor. [INFERENCE: typical JPEG sizes at these settings were not measured.]
- _**Proposed Edit (suggested: 0.5 MB):**_
  - Location: Goals; Technical Plan section 5; file entries 1, 12, 13, 15, 20; Verification.
  - Change: `MAX_ATTACHMENT_BYTES = 512 * 1024`. Ladder: 1600 px at quality 0.75, 1600 px at 0.6, then 1200 px at 0.6. 1200 px is stated as the legibility floor, below which the photo is rejected. The too-large message says "0.5 MB". The release note title becomes "Receipt photos are kept small". The e2e test asserts at most 524,288 bytes and a long edge of at most 1600.
- _**Alternative (keep 1 MB):**_ Keep the current ladder and add a stated legibility floor rung (1200 px at 0.6), and add one sentence giving the reason for 1 MB.

### Z5 + C1. The restore limit is unmeasured, and the hard refusal turns a possible failure into a certain one [`egm-zoom-out`, `egm-inventive-catalyst`] - Severity: Major

- **Affected Scope:** Proposed solution (63–65); Goals, "Every backup restores" (73–76); Open Question 2 (144–149); CUJ 1 and 2 (172–184); Technical Plan sections 3–4 (306–332); Alternative R (663–671); file entries 3, 6; manual check (1278–1280).
- **Discrepancy Description:** Z5: 50 MiB is borrowed from a CSV bound and is not measured, yet PR 1 ships it before the phone check. C1: restore refuses an oversized file before reading it, even though the design says a crash loses no data. So the rule "every backup this app writes, this app can restore" still does not hold.
- **Rationale:** Z5 says share today's 10 MB and measure before raising it. C1 says replace the refusal with a confirmation.
- _**AI Suggestion:**_ PROPOSE FIX (author decision). Adopt both. They do not conflict once the limit is soft.
- _**Justification:**_ A refusal guarantees the rows do not come back. An attempt either succeeds or crashes, and a crash writes nothing, because the restore is one Dexie transaction. A soft limit is therefore never worse for the user's data. The confirmation also protects against picking a huge wrong file by mistake. With a soft limit, the number only decides when a warning appears, so it should come from a measurement rather than from the CSV limit.
- _**Proposed Edit:**_
  - Location: Goals; CUJ 1 and 2; Technical Plan sections 3–4; file entries 1, 3, 4, 6, 15; Verification; Alternative R; Open Question 2.
  - Change: `MAX_RESTORE_FILE_BYTES` keeps today's 10 MB until the oldest-phone check, which moves to before PR 1 merges. The value then becomes the largest backup that restored on that phone, rounded down to a whole MB. `validateImportFile` stops rejecting oversized files. In `readAndCheckFile`, an oversized file asks `window.confirm("This backup is {size} MB. Restoring files this large may fail on phones with little memory. Try anyway?")` before `file.text()`, and Cancel resets the input. The backup-time warning becomes "This backup is {size} MB. Restoring it may fail on phones with little memory." The rule is rewritten as "no backup is refused at restore". Open Question 2 becomes the pre-PR-1 measurement step.
- _**Alternative (Z5 only):**_ Keep the hard refusal, share 10 MB between backup and restore, and raise it only after measurement.

### Z6 + C4. The new error types are more machinery than the failures justify; one envelope parse removes two limitations [`egm-zoom-out`, `egm-inventive-catalyst`] - Severity: Major (Z6) / Nit (C4)

- **Affected Scope:** Goals (84–93); Technical Plan section 2 (254–295); CUJ 3 (186–195); Known limitations, first bullet (476–479); Alternatives G and H (550–569); file entries 2, 4, 17, 19.
- **Discrepancy Description:** A decompress failure after AES-GCM succeeds means a writer bug or a hand-made file, yet it gets a reason, message, telemetry stage, reset branch and test. The automatic-path rewrite changes adequate behaviour. C4: file selection already parses the wrapper (`isEncryptedFile`) and discards the version.
- **Rationale:** Keep gunzip outside the decrypt `try` and the version check before key derivation. Drop the rest. Do the version check at file selection.
- _**AI Suggestion:**_ PROPOSE FIX
- _**Justification:**_ Combining both findings is the smallest form. A check at file selection catches unknown versions and missing `DecompressionStream` before the passphrase prompt. That removes the reason the automatic path needed rewriting and fixes the false "file may be damaged" message on old browsers. This reverses two brainstorm decisions: `decryptWithStoredPassphrase` returning `null` only for a wrong passphrase, and the telemetry stage `"decompress"`.
- _**Proposed Edit:**_
  - Location: Technical Plan section 2; Goals; CUJ 3; Known limitations; Alternatives G and H; file entries 2, 4, 17, 19.
  - Change: Replace `isEncryptedFile(text): boolean` with `readEnvelopeVersion(text): string | null` (`null` when the text is not an ExTrack wrapper). Add a shared `KNOWN_BACKUP_VERSIONS = ["1", "2"]`. `readAndCheckFile` rejects, before any decrypt, (a) a non-ExTrack file with the existing message, (b) an unknown version with the "newer version" message, and (c) version `"2"` when `DecompressionStream` is undefined with "This browser is too old to open this backup. Update it and try again." `decryptData` keeps its own version check and runs gunzip after the decrypt `try`, throwing `Error("Backup decrypted but could not be unpacked")`. No `BackupReadError` and no `importFailureStage`. `decryptWithStoredPassphrase` and `performFileSelect` stay as they are. The manual path keeps today's message mapping, and telemetry keeps `stage: "decrypt"`, whose error message tells the cases apart. Delete Known limitation 1, CUJ 3's caveat, and Alternatives G and H. Unit tests: version-3 rejection, wrong passphrase, gunzip failure not reported as a wrong passphrase. e2e: a version-3 file shows the message with or without a stored passphrase.

### Z7 + Z9. The design is stated three times, the Architecture section is at code level, and most Alternatives are Non-Goals [`egm-zoom-out`] - Severity: Major (Z7) / Nit (Z9)

- **Affected Scope:** Whole document; Alternatives A–X (490–733).
- **Discrepancy Description:** 1,289 lines; message tables, error strings and option D appear two to four times; pseudocode in the Architecture section; doc edits pinned to line numbers; 24 alternatives, many of them small decisions.
- **Rationale:** Keep each fact in one place. Use symbol anchors. Keep only real alternatives.
- _**AI Suggestion:**_ PROPOSE FIX
- _**Justification:**_ Valid. Line-number anchors go stale after PR 1 lands. This is easiest to do in the same rewrite that applies the fixes above.
- _**Proposed Edit:**_
  - Location: whole document.
  - Change: Technical Plan keeps data flow, the file format table, components and interfaces, with no message strings, ladder values or pseudocode. Strings, the ladder and test cases appear only in the Detailed Implementation Plan. Doc-edit entries name the section and symbol (for example `[backup.ts:decryptData]`), not line numbers. Alternatives keep only competing designs (compress the finished file, binary file, defer gzip, reconfigure the library, options B–E as one deferred group, A+, a schema limit, the restore limit), each in about three lines. The rest become one-line Non-Goals.

### C2. The revisit trigger "restore crashes a tab" cannot be observed [`egm-inventive-catalyst`] - Severity: Major

- **Affected Scope:** Goals, "Measurable triggers" (106–110); Known limitations (482–488); Future Improvements (775–779).
- **Discrepancy Description:** One of the four triggers for options D and E is a restore crash, which the design says stays invisible.
- **Rationale:** Write a `localStorage` breadcrumb before reading the file, clear it on every exit, and report it at the next startup if it is still there.
- _**AI Suggestion:**_ PROPOSE FIX
- _**Justification:**_ Under the soft limit (Z5 + C1), users can choose to attempt large restores, so a crash signal now tells whether the measured value is right. The repo has the same pattern at startup (`touchInstallMarker`). It sends counts only.
- _**Proposed Edit:**_
  - Location: Goals; Technical Plan, telemetry; file entries 4 and a new entry for `useAppStartup.ts`; telemetry table.
  - Change: Key `extrack-restore-in-progress`, value `{ bytes }`. It is set in `readAndCheckFile` before `file.text()`. It is cleared on preview ready, on every error toast, on Cancel (`resetEncryptedState`) and after the import write. At startup, if present, send `import_failed { stage: "crash", bytes }` and clear it. Record that a reload during a restore counts as a crash (an upper bound).
- _**Alternative (cheaper):**_ Remove "a restore crashes a tab" from the triggers instead.

### C3. The over-limit fix asks the user to delete receipts [`egm-inventive-catalyst`] - Severity: Major

- **Affected Scope:** File entry 6 warning text (927–929); Future Improvements, option E (780–782).
- **Discrepancy Description:** The only remedy is "Remove some receipt photos and back up again", which destroys data.
- **Rationale:** When over the limit, also write a rows-only copy.
- _**AI Suggestion:**_ PROPOSE FIX (text only); DECLINE the rows-only copy for this release
- _**Justification:**_ The advice to delete receipts must go, and the Z5 + C1 wording removes it. A rows-only copy adds a second file, a second Drive upload with its own name, and a choice the user must get right. Under the soft limit and a 0.5 MB photo cap, it only matters past the measured threshold. It is recorded as the first step of option E, with the same triggers.
- _**Proposed Edit:**_
  - Location: file entry 6; Future Improvements.
  - Change: Warning text as in Z5 + C1, with no advice to delete. Add to Future Improvements: "Rows-only companion file when a backup is over `MAX_RESTORE_FILE_BYTES`: same format with `attachment` removed; merge restore never touches existing photos."

### Z8. `BackupStats.bytes` duplicates data the targets already receive [`egm-zoom-out`] - Severity: Nit

- **Affected Scope:** Technical Plan section 3; file entries 2, 5, 6.
- _**AI Suggestion:**_ PROPOSE FIX
- _**Justification:**_ Valid. Both targets already receive `encrypted`.
- _**Proposed Edit:**_ Drop `BackupStats`. `createEncryptedBackupFile` keeps returning `{ filename, encrypted }`. Each target gains one parameter, `attachmentCount`, and computes `bytes = encrypted.length` itself. `useBackupAction` computes `attachmentCount` from `data.expenses` and compares `encrypted.length` for the warning.

### Z10. The version-1 fixture is generated in a needlessly heavy way [`egm-zoom-out`] - Severity: Nit

- **Affected Scope:** Technical Plan section 11; file entries 17–18.
- _**AI Suggestion:**_ PROPOSE FIX
- _**Justification:**_ Valid. In commit (a), `encryptData(plaintext, passphrase)` is pure and still writes version 1, and `backup.ts` already imports under Bun (checked while drafting).
- _**Proposed Edit:**_ Generate `tests/fixtures/backup-v1.extrack` in commit (a) with a one-off Bun script kept outside the repo. It builds the same three synthetic expenses with `buildBackupEnvelope` and calls `encryptData(json, "fixture-passphrase-v1")`. Drop the Playwright script and the `main` checkout.

### Z11. Unresolved "if" about importing the config barrel [`egm-zoom-out`] - Severity: Nit

- **Affected Scope:** File entry 3; Verification.
- _**AI Suggestion:**_ PROPOSE FIX
- _**Justification:**_ Valid. A plan must not leave a contingency.
- _**Proposed Edit:**_ `importPreview.ts` imports `MAX_RESTORE_FILE_BYTES` from `@/config/limits` (no `import.meta.env` or build globals). Remove the "if" and its Verification line.

### C5. The fixed ladder ends in rejection rather than at a legibility floor [`egm-inventive-catalyst`] - Severity: Nit

- **Affected Scope:** Technical Plan section 5; file entries 12 and 20.
- _**AI Suggestion:**_ PROPOSE FIX (variant)
- _**Justification:**_ The point holds: the last rung should be a stated legibility floor. A fixed list is simpler to test than a scale computed from the overshoot, so the fix keeps a fixed list and ends it at the floor.
- _**Proposed Edit:**_ Covered by Z4: the last rung is 1200 px at 0.6, named as the floor below which a receipt is no longer readable.

### C6. Alternative U's rejection does not answer Alternative U's benefit [`egm-inventive-catalyst`] - Severity: Nit

- **Affected Scope:** Alternative U (688–695); Rollout.
- _**AI Suggestion:**_ PROPOSE FIX (text); DECLINE adopting the two-release rollout
- _**Justification:**_ The rejection answers rollback, not old devices. The honest reason is a cost trade-off: shipping the reader a release early helps only devices that update within that window, and delays smaller backups for everyone. Under Z7 + Z9 this becomes a Non-Goal line.
- _**Proposed Edit:**_ Non-Goal: "Shipping the reader one release before the writer. It helps only devices that accept an update between the two releases, and delays smaller backups for all users. Devices that stay on an old version see a false message; the release note asks users to update each device."
