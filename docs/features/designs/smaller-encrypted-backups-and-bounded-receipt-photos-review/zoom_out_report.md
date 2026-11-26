# Goldfish Review Report: Stage 5 (Initial Zoom Out)

**Target:** `docs/features/designs/smaller-encrypted-backups-and-bounded-receipt-photos.md` (full file, lines 1-1289)

**GoldfishContext:** `src/lib/backup.ts`, `src/hooks/useEncryptedFileImport.ts`,
`src/hooks/useImageAttachment.ts`, `src/lib/importPreview.ts`, `src/lib/EGM.md`,
`EGM.md`, `mdn-createImageBitmap.html` (saved copy of the MDN `createImageBitmap()`
page; its compatibility table is rendered in the browser and is not in the file).

## Reviewer Status

| Reviewer                 | Standard                    | Status    |
| ------------------------ | --------------------------- | --------- |
| `egm-zoom-out`           | `zoom-out-standard.md`      | completed |
| `egm-inventive-catalyst` | persona only (Mode: REVIEW) | completed |

## Severity Breakdown

| Reviewer                 | Blocker | Major | Nit |
| ------------------------ | ------- | ----- | --- |
| `egm-zoom-out`           | 0       | 7     | 4   |
| `egm-inventive-catalyst` | 0       | 3     | 3   |

**Overlaps.** C1 (soft restore limit) and Z5 (unmeasured 50 MiB) both target the
restore limit and reach opposite fixes: C1 removes the hard refusal, Z5 keeps it
at 10 MB until measured. C4 and Z6 both touch the version check: C4 moves it to
file selection, Z6 keeps it in `decryptData` and drops the rest of the error
machinery. Z2 and C6 both concern release staging.

**Decisions these findings reopen.** Z1 (gzip), Z3 (built-in photo pipeline),
Z4 (1 MB per photo) and Z5 (50 MiB) challenge choices the author made during
brainstorming. The design records the author's reasons for Z1 (Alternative C)
and Z3 (Alternatives I and J), but not for Z4, and Z5 gives only "matches
`MAX_CSV_FILE_BYTES`".

**Fact check by the drafting session.** Z3 says the MDN version numbers (Chrome
112, Firefox 111, Safari 16) cannot be checked from the repository. That is
accurate for the saved page. The numbers came from MDN's browser-compat-data
source file (`api/_globals/createImageBitmap.json`, key
`options_imageOrientation_parameter.from-image`), which no reviewer was given.

## Inventive Catalyst Findings

The reviewer says these trade-offs hold and did not flag them: compressing before
encrypting (section 9), no `CompressionStream` fallback (Alternative F), keeping
the JSON wrapper (Alternative B), and checking a 6 MB Drive upload by hand
(Alternative W).

### C1. Restore refuses the files that backup now only warns about - Severity: Major

- **Reviewer Lens:** `egm-inventive-catalyst`
- **Affected Scope:** The Problem (46–55, 63–69); Goals, "Every backup restores" (73–76); Open Questions, memory (144–149); CUJ 1 and 2 (172–184); Technical Plan sections 3–4 (306, 324–332); Alternative R (663–671); file 6 (919–932).
- **Discrepancy Description:** The rule "every backup this app writes, this app can restore" still does not hold. Backup only warns when a file is over `MAX_RESTORE_FILE_BYTES`, and restore refuses that file before reading it (`importPreview.ts:72`, called before `file.text()` at `useEncryptedFileImport.ts:11-13`). The only thing the refusal guards against is a tab crash. The design says such a crash loses no data, because the restore write is one Dexie transaction. So the refusal turns a possible failure into a certain one, with the same outcome: the rows do not come back on that device.
- **Rationale & Recommendation:** Make the limit soft. When `file.size > MAX_RESTORE_FILE_BYTES`, ask the user to confirm instead of refusing: "This backup is X MB, larger than ExTrack has tested. Restoring may fail on this device. Try anyway?" Reword the backup-time warning to "may not restore on low-memory devices". This takes about three lines in `readAndCheckFile`. It also means the 10 MB vs 50 MiB choice (Alternative R) only sets where the confirmation appears, so it is no longer a data-loss decision. Costs: a user on a low-memory device can now crash the tab, which today is impossible (finding C2 gives the crash signal). It adds one dialog state. The PR 1 manual check and the e2e expectations change.

### C2. The revisit trigger "restore crashes a tab" cannot be observed - Severity: Major

- **Reviewer Lens:** `egm-inventive-catalyst`
- **Affected Scope:** Goals, "Measurable triggers" (106–110); Open Questions (144–149); Known limitations (482–488); Alternative V (697–708); Future Improvements, Option D (775–779); manual 40 MB phone check (1278–1280).
- **Discrepancy Description:** A restore crash is one of the four triggers for revisiting options D and E. Lines 109–110 say that trigger "stays invisible". The 50 MiB limit is also unmeasured (146–147). The only evidence planned is one manual run on one phone, so the deferral depends on a signal the design says cannot arrive.
- **Rationale & Recommendation:** Use a breadcrumb. Before `file.text()` in `performFileSelect`, write a `localStorage` key `restore-in-progress = { bytes }`. Clear it on success, on every handled failure, and on Cancel (`resetEncryptedState`). At startup, if the key is still present, send `import_failed { stage: "crash", bytes }` and clear it. This follows the existing startup-check pattern (`touchInstallMarker` plus the comparison in `initializeDatabase`, root `EGM.md:67`) and sends counts only, as the telemetry policy requires (`src/lib/EGM.md:47`). Costs: false positives when the user closes or reloads the tab during a restore (acceptable as an upper bound), one more `localStorage` key, and one startup read.

### C3. The over-limit fix asks the user to delete receipts - Severity: Major

- **Reviewer Lens:** `egm-inventive-catalyst`
- **Affected Scope:** The Problem (53–55); file 6 warning text (927–929); Known limitations (482–488); Alternative O and Future Improvements, Option E (627–639, 780–782).
- **Discrepancy Description:** The only remedy for an oversized backup is "Remove some receipt photos and back up again". The user must destroy data to get a backup that restores. The real fix, keeping rows separate from photos (option E), is deferred.
- **Rationale & Recommendation:** Use the smallest form of segmentation. When `stats.bytes > MAX_RESTORE_FILE_BYTES`, also write a rows-only copy, `extrack-backup-yyyy-MM-dd-rows.extrack`. It uses the same version-2 format with `attachment` removed from each expense. It needs no new reader and no ID matching, because `attachment` is already optional in the restore schema, and merge restore skips expenses that already exist (`ImportData.tsx`). Costs: two files and two Drive uploads per oversized backup. The second upload needs a distinct name so `findExistingFile` does not replace the full backup. The user has to pick the right file. An override restore of the rows-only file drops every photo, so the preview must label it. Drive storage grows faster.

### C4. One envelope parse would remove two accepted limitations - Severity: Nit

- **Reviewer Lens:** `egm-inventive-catalyst`
- **Affected Scope:** Open Questions, memory (144–147); Known limitations, first bullet (476–479); Alternative G (550–559); Future Improvements, version check (792–793).
- **Discrepancy Description:** File selection already parses the wrapper in `isEncryptedFile` (`backup.ts:174-181`, called at `useEncryptedFileImport.ts:14`), then throws the result away. `decryptData` parses it again (`backup.ts:134`). Alternative G rejects an early version check because it "needs a second exported function".
- **Rationale & Recommendation:** Replace `isEncryptedFile` with `inspectEnvelope(text)`, which returns `{ ok, version }`. `readAndCheckFile` then rejects unknown versions before any passphrase prompt, and the check inside `decryptData` stays. The number of exported functions does not change. Share one `KNOWN_VERSIONS` constant so the two checks agree. This does not by itself free the second full copy of the file, because `pendingEncryptedText` still holds the string.

### C5. The fixed three-step photo ladder ends in rejection rather than adapting - Severity: Nit

- **Reviewer Lens:** `egm-inventive-catalyst`
- **Affected Scope:** Technical Plan section 5 (340–352, 363–365); file 12 (999–1010); file 20, noise test (1149).
- **Discrepancy Description:** When none of the three fixed steps fits under 1 MB, the photo is rejected. The last step, 1600 px, is far above what a receipt needs to stay readable, so the rejection point is where an arbitrary list ends, not a legibility floor.
- **Rationale & Recommendation:** Compute the next scale from the overshoot (`edge *= sqrt(MAX / blob.size) * 0.9`). Keep going down to an explicit legibility floor, for example about 1000 px at quality 0.6, capped at about 5 attempts. Reject only below the floor. Costs: output quality varies from photo to photo, the worst case does more encoding work, and the noise e2e test must target the floor instead of a step count.

### C6. Alternative U's rejection does not answer Alternative U's benefit - Severity: Nit

- **Reviewer Lens:** `egm-inventive-catalyst`
- **Affected Scope:** Alternative U (688–695); Known limitations, second bullet (480–481); Non-Functional Requirements, Rollout (750–755); release note 3b (1061).
- **Discrepancy Description:** The benefit of Alternative U is that devices left on "Later" can already read version-2 files before any exist. Such devices are expected, because the service worker updates only when the user accepts (root `EGM.md:78`). The rejection answers rollback instead, which is a different concern. The design accepts a false "not a restorable backup" message on old devices and a release note asking users to update.
- **Rationale & Recommendation:** Ship PR 3a (the reader) in 1.10.0 and PR 3b (the writer) in 1.11.0. Costs: one extra release cycle before backups shrink, and the writer commit waits unreleased and may need rebasing. It does not help devices that never update.

## Zoom Out Findings

### Z1. Gzip and format version 2 fix a problem the document never shows to be a problem - Severity: Major

- **Reviewer Lens:** `egm-zoom-out`
- **Affected Scope:** Overview item 1 (18–21); The Problem, first paragraph (37–44); Goals (77–93); Technical Plan sections 1–2, 10–11 (223–295, 438–472); Known limitations (476–481); Alternatives C and F (513–523, 541–548).
- **Discrepancy Description:** The Problem says rows make a backup of about 1 MB but names no harm from that size: no quota problem, no upload failure, no user complaint. Alternative C admits rows sit "8 to 15 times below any limit". The harm the document does show, backups that cannot be restored, comes from photos, and gzip does not help there (54–55). Yet gzip brings most of the design's cost: a format version that must stay readable forever, ordered reader and writer commits, a version-1 fixture, a check for a future version 3, a raised browser floor (Safari/iOS 16.4, Firefox 113; today only WebCrypto is needed, `backup.ts:103-129`), and a false error on older app versions (480–481). The plan also never says what users see when `CompressionStream` is missing: the `catch` at `useBackupAction.ts:70-72` would show the raw `ReferenceError` text in a toast.
- **Rationale & Recommendation:** Under the YAGNI rule this is speculative. The only reasons given are "learning is a stated goal" and "a format change is cheapest now" (520–522), which are owner preferences, not a root problem. Either state the concrete harm of a 1 MB backup, or drop gzip and use Alternative C (remove indentation, no format change). If gzip stays, define what users on older browsers see when a backup fails.

### Z2. Removing the export toggle is unrelated scope, and its stated reason does not hold - Severity: Major

- **Reviewer Lens:** `egm-zoom-out`
- **Affected Scope:** Overview item 4 (28–29); Goals (101–102); CUJ 6 (214–219); Technical Plan section 6 (393–403) and section 11 note (456–460); file entries 8–11, 19 (PR 2 part), 24, 25, 28.
- **Discrepancy Description:** None of the three problems in The Problem is about exports. The one reason given is "PR 2 comes before PR 3 because `encryptData` then has one caller, so gzip goes straight in with no flag" (456–457). That does not hold: one `encryptData` that always gzips serves both callers (`useExportAction.ts:24`, `backup.ts:199`) with no flag. Encrypted exports would become version-2 files that the version-2 reader restores, and the existing e2e restore tests would test version 2 without being rewritten. As written, the removal adds about nine files, a deleted component, rewritten e2e helpers, three contract-doc edits and a release note.
- **Rationale & Recommendation:** Split the toggle removal into its own small change with its own motivation, or drop it from this design, so the design stays focused on backup size and photo bounds.

### Z3. Replacing the image library adds a rotation risk the library already handles - Severity: Major

- **Reviewer Lens:** `egm-zoom-out`
- **Affected Scope:** Overview item 3 (25–27); The Problem, third paragraph (57–61); Open Question 3 (150–159); Technical Plan section 5 (334–391); Alternatives I, J, K (571–597); file entries 12–14, 20.
- **Discrepancy Description:** The installed library already reads EXIF orientation and checks whether the browser rotates images itself (`getExifOrientation` and `exifOrientation` at `node_modules/browser-image-compression/dist/browser-image-compression.d.ts:15,41`; `isAutoOrientationInBrowser` at `browser-image-compression.mjs:8`). The built-in pipeline gives this up, which is why Open Question 3 admits portrait photos may be stored sideways on Chrome 80–111. The two faults named in the library can be fixed with settings: the CDN worker load fails under the site's CSP (`script-src 'self'`, `worker-src 'self'`, root `EGM.md:38-43`), which `useWebWorker: false` avoids, and the size is not a hard limit, which one size check after compression fixes. Alternative J puts that at about three lines. The custom pipeline needs a new module, a resize ladder, HEIC detection, a white fill, a blob-type guard, three messages and a new e2e spec.
- **Rationale & Recommendation:** This rebuilds what an installed dependency already does and adds a regression risk. "Dormant" (no release since 2023) is not a defect by itself. Change the settings now (Alternative J). Write a custom pipeline only if the library actually breaks.

### Z4. The 1 MB photo cap works against the backup-size goal and is never justified - Severity: Major

- **Reviewer Lens:** `egm-zoom-out`
- **Affected Scope:** The Problem, second paragraph (50–53); Goals, "Photos are bounded" (94–99); Technical Plan sections 4–5 (330, 354–355); file entry 1, PR 4 (822–823).
- **Discrepancy Description:** Today the code targets 0.5 MB per photo (`useImageAttachment.ts:19`). The design doubles that to 1 MB. By the document's own figures, the photos that fit under a 10 MB restore limit drop from about 11 to 7 or 8 (50–53). The document never says why 1 MB was chosen.
- **Rationale & Recommendation:** The core problem is photos pushing backups past the restore limit. Raising the per-photo budget makes that worse, and the design then offsets it by raising the restore limit fivefold. Keep 0.5 MB as a hard limit, or give an evidence-based reason for 1 MB.

### Z5. The headline rule depends on a restore limit nobody has measured - Severity: Major

- **Reviewer Lens:** `egm-zoom-out`
- **Affected Scope:** Proposed solution (63–65); Goals, "Every backup restores" (73–76); Open Question 2 (144–149); Technical Plan section 4 (326–332); Alternative R (663–671); manual check (1278–1280).
- **Discrepancy Description:** The core rule is "every backup this app writes, this app can restore". But 50 MiB is borrowed from `MAX_CSV_FILE_BYTES` (`src/config/limits.ts:11`), whose comment describes a CSV parsing bound, not a restore bound. Restore holds several full copies of the file in memory at once (145–146). The check on the oldest phone is scheduled "before releasing PR 3", after PR 1 has already shipped the new limit as a `fix`.
- **Rationale & Recommendation:** With an unmeasured limit, the rule only promises that a backup passes a size check, not that it restores. The cheapest version that keeps the rule true is to share the existing 10 MB value between backup and restore and add the warning. Raise the limit only after measuring on a device, or measure before PR 1 and pick the value from the result.

### Z6. The new error types are more machinery than the failures justify - Severity: Major

- **Reviewer Lens:** `egm-zoom-out`
- **Affected Scope:** Goals, "Unknown versions fail clearly" and "Gzip failures…" (84–93); Technical Plan section 2 (254–295); CUJ 3 (186–195); Known limitations, first bullet (476–479); Alternatives G and H (550–569); file entry 4 (884–906); file entry 19, PR 3a tests (1126–1132).
- **Discrepancy Description:**
  - **Decompress failures:** AES-GCM verifies the ciphertext before gunzip runs, and only the passphrase holder can make a valid file (266–268). A gunzip failure after a successful decrypt therefore means a writer bug or a hand-made file, yet it gets its own reason, message, telemetry stage, manual-path reset branch and unit test.
  - **Version check:** the check before key derivation is cheap and worth keeping, but it also brings an e2e test, a Known limitation and Alternative G for a version 3 that does not exist.
  - **Automatic-path rewrite:** `performFileSelect` gets a new `try/catch`, an `importFailureStage` helper and a behaviour change for damaged wrappers (278–280). Today those cases go to the passphrase prompt and then to the generic error (`useEncryptedFileImport.ts:69-81`, `:107-110`), which is adequate.
- **Rationale & Recommendation:** Keep two small changes in `decryptData`: run gunzip outside the decrypt `try` so it cannot be reported as a wrong passphrase, and check the version before key derivation. Drop the `"decompress"` reason, its message, its telemetry stage and the automatic-path rewrite until a decompress failure is actually seen.

### Z7. The design is stated three times, and the architecture section is written at code level - Severity: Major

- **Reviewer Lens:** `egm-zoom-out`
- **Affected Scope:** Whole document. Examples: photo message table at 371–375 and again at 1029–1033; backup error messages at 286–291 and 840–843; option D at 121–122, 482–488, 627–639 and 775–779; pseudocode in the Architecture section at 340–352, with the scale formula at 345 and 1002; doc edits pinned to line numbers at 1156–1187 and 1222–1229; details such as the 15-second toast (319, 927) and 65,536-byte noise chunks (1143–1144).
- **Discrepancy Description:** The file is 1,289 lines for one feature. Goals, the Technical Plan and the Detailed Implementation Plan each restate the same decisions down to string literals. The Technical Plan (Architecture) holds code-level pseudocode instead of components and data flow.
- **Rationale & Recommendation:** Copies drift apart, and line-number anchors go stale after the first PR lands. Keep each fact in one place: interfaces and data flow in the Technical Plan; message strings, the resize ladder and test details only in the Detailed Implementation Plan. Use symbol anchors, as `src/lib/EGM.md` already does (`[backup.ts:encryptData]`), instead of line numbers.

### Z8. `BackupStats.bytes` duplicates data the backup targets already receive - Severity: Nit

- **Reviewer Lens:** `egm-zoom-out`
- **Affected Scope:** Technical Plan section 3 (303–306, 315–316); file entries 2 (832–837), 5 (911–917), 6 (923–934).
- **Discrepancy Description:** Both targets already receive `encrypted` (`backupTargets.ts:15`, `:37`), so `bytes` is just `encrypted.length`. The interface, return shape and parameter changes exist mostly to carry a value already in hand. The only new fact is `attachmentCount`.
- **Rationale & Recommendation:** Compute `bytes` inside the targets and have the warning in `useBackupAction` read `encrypted.length`. Pass `attachmentCount` as one extra number, or drop `BackupStats`.

### Z9. Most of the "Alternatives" are really Non-Goals - Severity: Nit

- **Reviewer Lens:** `egm-zoom-out`
- **Affected Scope:** Alternatives Considered A–X (490–733).
- **Discrepancy Description:** The section lists 24 alternatives. Many are small decisions or restated Non-Goals rather than competing designs, for example L (two messages versus three), S (decompressed-size limit), T (padding), U (reader one release earlier), V (`import_succeeded`) and X (Replace control).
- **Rationale & Recommendation:** Keep the real design alternatives (A, B, C, J, M, N, O). Move the rest to one-line Non-Goals entries, which mostly exist already.

### Z10. The version-1 fixture is generated in a needlessly heavy way - Severity: Nit

- **Reviewer Lens:** `egm-zoom-out`
- **Affected Scope:** Technical Plan section 11 (464–466); file entries 17–18 (1080–1107).
- **Discrepancy Description:** The plan uses a throwaway Playwright script against a `main` checkout to seed data and drive the UI. But in commit (a), `encryptData(plaintext, passphrase)` is already a pure function that still writes version 1 (858–860), and the test helper already builds envelopes for any version (1080–1081).
- **Rationale & Recommendation:** Generate the fixture once by calling the version-1 `encryptData` from a one-off Bun or vitest snippet in commit (a), and drop the UI script.

### Z11. Unresolved "if" about importing the config barrel - Severity: Nit

- **Reviewer Lens:** `egm-zoom-out`
- **Affected Scope:** File entry 3 (879–882); Verification (1258–1259).
- **Discrepancy Description:** The plan falls back to `@/config/limits` "if vitest cannot load the `@/config` barrel". The barrel reads `import.meta.env` and build-time globals (`src/config/index.ts:19-28`). No `src/lib` module under unit test imports it today; its only importers (`csvImport.ts:2`, `driveAuth.ts:13`, `telemetry.ts:2`) are untested.
- **Rationale & Recommendation:** Settle it before implementation. Importing `@/config/limits` directly removes the question.

---

# Round 2: Re-audit After Fixes (2026-11-25)

**Outcome (2026-11-26):** the author chose "Proceed to Stage 6". None of the
Round 2 findings were applied. They stay open as accepted trade-offs for this
stage, and later stages may raise them again. That includes the factual error
"Gzip does not help photos" (R2-C1), which remains in the design.

**Target:** same file, rewritten (lines 1-968). **GoldfishContext:** round 1 list
plus `mdn-bcd-createImageBitmap.json` (saved MDN browser-compat-data).
**Reviewers:** fresh instances; both `completed`. This is Stage 5's one allowed
re-audit.

| Reviewer                 | Blocker | Major | Nit |
| ------------------------ | ------- | ----- | --- |
| `egm-zoom-out`           | 0       | 3     | 5   |
| `egm-inventive-catalyst` | 0       | 3     | 1   |

**Round 1 fixes the reviewers confirmed:** both checked the Chrome 112 / Firefox
111 / Safari 16 figures against the saved compatibility data and found them
right. The export-toggle reasons, the error-handling cut and the 0.5 MB cap
drew no findings.

**Overlaps.** R2-Z2 and R2-C1 both reach the same fix from different sides:
ship PR 1 at 10 MB without waiting on the phone test. R2-C1 adds that a test
run on version-1 files would mis-set the threshold for version-2 files. R2-Z3
and R2-C2 both concern the restore crash marker, with opposite fixes: R2-Z3
says drop it, R2-C2 says show it to the user.

**Fact check by the drafting session.** R2-C1's "smaller error" holds, and it
contradicts the brief. A 0.5 MB JPEG costs about 0.89 MB in version 1
(base64 twice) and about 0.67 MB in version 2 (base64, gzip back to about the
JPEG size, base64 again), which is about 25% less. The design's "Gzip does not
help photos" is wrong. This also weakens R2-Z1, which rests on gzip not
helping photos.

**Isolation note.** R2-Z8 says the brief "was put there for the drafting step,
and committing it was left to the owner", marked [INFERENCE]. That matches a
decision the reviewer was not given. Its finding stands either way.

## Zoom Out Findings (Round 2)

### R2-Z1. Gzip shrinks the part that is not the problem, and its costs are permanent - Severity: Major

- **Reviewer Lens:** `egm-zoom-out`
- **Affected Scope:** Overview item 2 (21–24); The Problem, "Backup files carry rows inefficiently" (52–60); Technical Plan sections 1–3, 9–10; Alternative C (404–413); file entries 2, 18, 19, 29–32.
- **Discrepancy Description:** Rows are far below any limit, and photos cause the restore problem. The stated Drive saving (360 → 55 MB a year) disappears once a user has a few receipts, because "Gzip does not help photos" (59–60). Version 2 brings permanent costs: a version list, a fixed reader-then-writer order, a higher browser floor, old-browser checks on both paths with e2e tests, a gunzip error path, a fixture and its script, and a false message on old app installs (confirmed: gzip plaintext fails `startsWith("{")` at `useEncryptedFileImport.ts:27` and hits the message at `:46`). The rejection of Alternative C rests partly on "learning is a stated goal".
- **Rationale & Recommendation:** Use Alternative C: remove the outer indentation at `backup.ts:128`. It is one line with no format change. Defer version 2 until rows approach a limit. If gzip stays as a deliberate choice, say in the doc that it is a learning or nice-to-have item, not a fix for the stated problem.

### R2-Z2. PR 1 is the data-loss fix but waits on a manual phone measurement - Severity: Major

- **Reviewer Lens:** `egm-zoom-out`
- **Affected Scope:** Goals, "The size threshold is measured" (82–83); Open Questions (144–148); section 11 (361, 369); Verification Plan, manual checks (951–958).
- **Discrepancy Description:** PR 1 "removes the data-loss risk that exists today", yet cannot merge until 10/20/30/40 MB backups are built with a throwaway seeding script and restored on the oldest phone. The threshold is soft: it only decides when a confirmation and a warning appear. The crash marker answers the same question, so there are two mechanisms for one unknown, and the expensive one blocks the urgent fix.
- **Rationale & Recommendation:** Merge PR 1 at today's 10 MB, drop the pre-merge measurement gate, and tune later from one source of evidence.

### R2-Z3. The restore crash marker is speculative and misses the restore's write step - Severity: Major

- **Reviewer Lens:** `egm-zoom-out`
- **Affected Scope:** Goals (84–85); read path diagram (222, 234); section 4 (273–280); file entries 4–6, 23, 24; Future Improvements trigger (497–499).
- **Discrepancy Description:** The marker needs a new key, three `userPreferences` methods and a private `removeItem`, a startup side effect, set/clear calls on two paths, and three doc edits. Its only consumer is a "revisit when the crash count is non-zero" trigger, and the count is an upper bound. It is cleared when the preview appears (234), but the Dexie write runs later, after the user confirms (`ImportData.tsx:92`), with the whole dataset in memory. A crash there is never reported, though the goal says restore crashes are reported.
- **Rationale & Recommendation:** Drop the marker; the owner sees a crashed tab directly. If it stays, it must cover the confirm-and-write step, or the goal must say it covers only reading and decrypting.

### R2-Z4. Custom photo pipeline instead of reconfiguring the library - Severity: Nit

- **Reviewer Lens:** `egm-zoom-out`
- **Affected Scope:** Overview item 3; section 5 (282–306); Alternative D (415–424); file entries 14–16, 21, 33.
- **Discrepancy Description:** Alternative D reaches the goal with about three lines in `useImageAttachment.ts:18-23`. The chosen path adds a module, a ladder, an error class, HEIC detection, a white fill, a JPEG check and an e2e spec, and drops the library's own EXIF handling, so photos can be sideways on Chrome below 112.
- **Rationale & Recommendation:** The owner's choice is recorded and reversible, so not a blocker. Consider shipping Alternative D now, with the canvas pipeline as the upgrade path.

### R2-Z5. `attachmentCount` widens two signatures for a speculative trigger - Severity: Nit

- **Reviewer Lens:** `egm-zoom-out`
- **Affected Scope:** Section 8 telemetry table (331); file entries 7–8 (637–647).
- **Discrepancy Description:** Both targets gain a parameter, and `useBackupAction` gains a count, only to feed the "about 50 photos" trigger. `bytes` already feeds the size triggers.
- **Rationale & Recommendation:** Send `bytes` only. Add `attachmentCount` when a decision depends on photo count rather than size.

### R2-Z6. The second version check in `decryptData` cites callers that do not exist - Severity: Nit

- **Reviewer Lens:** `egm-zoom-out`
- **Affected Scope:** Read path (229); file entry 2 (544–547); unit test case 3 (763).
- **Discrepancy Description:** After PR 2, both `decryptData` callers (`backup.ts:187`, `useEncryptedFileImport.ts:93`) run after `readAndCheckFile`, which already rejects unknown versions.
- **Rationale & Recommendation:** Keep one check, or call the second a library invariant instead of a defence for hypothetical callers.

### R2-Z7. Altitude drops into code-level detail - Severity: Nit

- **Reviewer Lens:** `egm-zoom-out`
- **Affected Scope:** File entries 4, 7, 14, 17, 21.
- **Discrepancy Description:** The plan spells out `toFixed(1)`, `duration: 15_000`, the scale formula, the minimum canvas size, 65,536-byte fill chunks, and full release-note and toast wording.
- **Rationale & Recommendation:** Keep interfaces, reasons and data flow. Drop formulas and constants any implementer would write.

### R2-Z8. The design cites a root-level scratch file as a resource - Severity: Nit

- **Reviewer Lens:** `egm-zoom-out`
- **Affected Scope:** Additional Resources (474).
- **Discrepancy Description:** `concepts_brief.md` sits at the repository root, uncommitted, so the reference will break once it is cleaned up.
- **Rationale & Recommendation:** Commit the brief next to the design, or remove the reference.

## Inventive Catalyst Findings (Round 2)

### R2-C1. The restore threshold is measured on version-1 files but applied to version-2 files - Severity: Major

- **Reviewer Lens:** `egm-inventive-catalyst`
- **Affected Scope:** The Problem (52–60); Open Questions (144–148); section 4 (264–272); Verification Plan, manual checks (951–958); file 7 (631–636).
- **Discrepancy Description:** `MAX_RESTORE_FILE_BYTES` is a stand-in for peak memory, checked against `file.size`. It is measured on the PR 1 preview, which still writes version 1. Memory per file byte is about 0.75 for version 1, about 1.0 for a photo-heavy version-2 file, and about 5 for a row-heavy version-2 file, before `JSON.parse` expands it further. A version-2 file under the threshold can need several times the memory of the version-1 file that set it, and neither the confirmation nor the backup warning fires. Separately, "Gzip does not help photos" is wrong: a 0.5 MB photo costs about 0.89 MB in version 1 and about 0.68 MB in version 2.
- **Rationale & Recommendation:** Keep 10 MB in PR 1 and run the oldest-phone measurement on the PR 3b preview, using version-2 files. Record phone and format in the constant's comment. A more durable option is a second budget on decompressed size, checked after gunzip. That is a refusal that fires after key derivation, so it must be chosen deliberately.

### R2-C2. Restore crashes are recorded as telemetry only, and the warning offers no action - Severity: Major

- **Reviewer Lens:** `egm-inventive-catalyst`
- **Affected Scope:** Goals (84–85); section 4 (273–280); file 6 (620–625); CUJ 1 (156–158); file 7 (631–636).
- **Discrepancy Description:** After a crash, the user sees nothing at the next start and will likely pick the same file and crash again. The design calls this "the same pattern as the install marker", but that marker also opens a dialog for the user (`useAppStartup.ts:31-36`). The backup warning says restore may fail but offers nothing that changes the outcome.
- **Rationale & Recommendation:** When `takeInterruptedRestore()` returns a size, also show one message at startup, for example "Your last restore ({mb} MB) didn't finish. This device may not have enough memory; try on a device with more." Its wording must allow for tabs closed on purpose. Later, write the rows-only companion file when the warning fires, so the warning points to a file that will restore.

### R2-C3. Refusing to back up on old browsers trades backup availability for one branch - Severity: Major

- **Reviewer Lens:** `egm-inventive-catalyst`
- **Affected Scope:** Non-Goals (122); section 3 (252); section 10 (352–356); file 2, PR 3b (559–568).
- **Discrepancy Description:** Without `CompressionStream`, Create Backup now fails. The stated reason, "two writer paths to keep forever", overstates the cost. The version-1 reader is permanent anyway, and the version-1 writer is today's `encryptData` without gzip, so the fallback is one branch. In a local-only app, a device below Safari 16.4 goes from "backs up" to "cannot back up", and the release note does not say so.
- **Rationale & Recommendation:** Write version 1 when `CompressionStream` is missing, with a `ponytail:` comment naming the floor and when to remove the branch. Costs: old-browser files stay large; one more branch with an `addInitScript` test; restoring a version-2 file on that old device still fails.

### R2-C4. Alternative B is rejected without counting its effect on restore memory - Severity: Nit

- **Reviewer Lens:** `egm-inventive-catalyst`
- **Affected Scope:** Alternative B (396–402); Open Questions (144–147); read path (219–235).
- **Discrepancy Description:** Restore holds the whole file as a string (`useEncryptedFileImport.ts:13`), which stays in React state during manual decrypt (`:81`, `:93`), plus a second ciphertext string in the parsed wrapper (`backup.ts:134`) and the decoded bytes (`backup.ts:148`). A binary body would remove two whole-file copies. Holding the `File` instead of its text in `pendingEncryptedText` removes the lingering string with no format change.
- **Rationale & Recommendation:** Hold the `File`, not the text, in pending state. Record in Alternative B that a binary body also removes about two whole-file copies from peak restore memory, and revisit it with the Future Improvements triggers.
