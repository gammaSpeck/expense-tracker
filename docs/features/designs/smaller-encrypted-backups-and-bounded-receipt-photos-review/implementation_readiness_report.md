# Goldfish Review Report: Stage 9 (Implementation Readiness)

**Target:** `docs/features/designs/smaller-encrypted-backups-and-bounded-receipt-photos.md` (DetailedRange, lines 648-1131; lines 1-647 read as context)

**GoldfishContext:** `src/lib/backup.ts`, `src/hooks/useEncryptedFileImport.ts`,
`src/hooks/useImageAttachment.ts`, `src/lib/importPreview.ts`, `src/lib/EGM.md`,
`EGM.md`, `mdn-createImageBitmap.html`, `mdn-bcd-createImageBitmap.json`.
Reviewers could read any other source file to verify claims.

## Reviewer Status

| Reviewer                       | Standard                               | Status                                                          |
| ------------------------------ | -------------------------------------- | --------------------------------------------------------------- |
| `egm-implementation-readiness` | `implementation-readiness-standard.md` | completed                                                       |
| `egm-codebase-details`         | `implementation-readiness-standard.md` | completed (first run failed on an API rate limit; retried once) |
| `egm-style`                    | persona only                           | completed                                                       |

## Severity Breakdown

| Reviewer                       | Blocker | Major | Nit |
| ------------------------------ | ------- | ----- | --- |
| `egm-implementation-readiness` | 1       | 4     | 5   |
| `egm-codebase-details`         | 0       | 4     | 7   |
| `egm-style`                    | 0       | 6     | 15  |

## Consolidated Themes (deduplicated)

| #   | Theme                                                                                                                                                       | Findings here                                | Also raised earlier                                  |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------- |
| 1   | PR 5 noise fixture fits under the cap at the floor (Blocker)                                                                                                | IR1                                          | —                                                    |
| 2   | `gunzip` labelled PR 4 but needed by PR 3; stream feeding not pinned                                                                                        | IR2, IR3, CD1                                | —                                                    |
| 3   | Fallow CI gate and per-function complexity ceilings not addressed                                                                                           | IR4, CD3                                     | —                                                    |
| 4   | PR 2 leaves `ui/checkbox.tsx` and `@radix-ui/react-checkbox` unused                                                                                         | CD2                                          | —                                                    |
| 5   | No tests for the restore marker, startup toast or backup warning; `boot`/`data-loss` specs not listed; older-CSV text and PR 4 fallback untested end to end | IR5, IR10 (part), CD4                        | Stage 7 D4 (crash toast)                             |
| 6   | Unit case 4 "garbage" ciphertext must be valid base64url                                                                                                    | IR9, ST5                                     | —                                                    |
| 7   | `{mb}` formatter location for its second user                                                                                                               | IR6, ST21                                    | S8-6 (`toFixed(1)` stays in the plan, contested)     |
| 8   | A superseded run's `finally` clears a newer run's marker                                                                                                    | IR7, CD9                                     | Stage 7 D3 (marker lifecycle)                        |
| 9   | Doc edits labelled to the wrong PR or describing unshipped behaviour; `featureset.md` lines missed                                                          | IR10, ST6, ST13, ST14                        | —                                                    |
| 10  | User-facing wording overclaims (release notes, `TOO_LARGE_MESSAGE`, confirm text, "or later")                                                               | ST1, ST2, ST9, ST10, ST11                    | —                                                    |
| 11  | Test instructions an implementer could misread (download order, "Try anyway", units, attach method, fixture loading, helper location)                       | ST3, ST4, ST19, CD7, CD8, CD11               | —                                                    |
| 12  | Small unpinned decisions (telemetry for `{ error }` results, `check` plaintext compare, `as const` typing, PR 1 release-note version)                       | IR8, CD5, CD6, CD10                          | —                                                    |
| 13  | Wording precision (thrown strings, "Constant" header, file 20 redundancy, "nothing committed", lint list, "Record" steps, PR 1 terms, `ponytail:` verb)     | ST7, ST8, ST12, ST15, ST16, ST17, ST18, ST20 | S8-4 (internal labels), Stage 7 S14 (quoted strings) |

**Fact checks by the drafting session.**

- **IR1 confirmed.** Re-measured in headless Chromium with the file 15
  pipeline: 3000 × 2000 noise gives 790,731 / 576,866 / 307,619 bytes at the
  three steps, so step 3 fits under 524,288. 1200 × 1200 noise gives
  825,398 / 640,784 / 640,784 bytes, over the cap at every step.
- **CD2 confirmed.** `src/components/ui/checkbox.tsx` is imported only by
  `EncryptToggleRow.tsx:2`, and it is the only importer of
  `@radix-ui/react-checkbox` (`package.json:32`).
- **IR4/CD3 confirmed.** `.github/workflows/pr-checks.yml` runs `fallow audit`
  (`gate: new-only`) and `bunx fallow health --score --min-score 95` on every
  PR; `package.json` has `audit:pr` = `fallow audit`.

**Settled, not reopened.** No Stage 9 finding reopens the passphrase `check`
field (S8-1, contested) or asks to drop `toFixed(1)`, `15_000`, `102_400` or
the ordered `decryptData` steps (S8-6, contested under the Zero-Decision
Rule). IR6 and ST21 ask the opposite: they want the `{mb}` formula's location
pinned, which is consistent with the S8-6 contest.

## Implementation Readiness Findings

### IR1. PR 5 "too large" e2e test cannot fail as intended: 3000 × 2000 noise fits under the cap at the floor - Severity: Blocker

- **Reviewer Lens:** `egm-implementation-readiness`
- **Affected Scope:** File 22 `tests/e2e/receipt-photo.spec.ts`, row "Photo over the cap at the floor is rejected" (1015); ladder (883–895).
- **Discrepancy Description:** The reviewer ran the file 15 pipeline in headless Chromium (white canvas, `drawImage` scaled to the long edge, `toBlob("image/jpeg", q)`). A 3000 × 2000 random-noise source measured about 790 KB at 1600@0.75, about 577 KB at 1600@0.6 and **about 307 KB at 1200@0.6**: downscaling averages the noise away. The third step fits under 524,288 bytes, the photo is stored, and every assertion of the test fails.
- **Rationale & Recommendation:** Specify a source that is never downscaled, for example "1200 × 1200 random noise (opaque)": about 825 KB at 0.75 and about 640 KB at 0.6 in the same run, so every step exceeds the cap.

### IR2. `gunzip` is labelled PR 4 but PR 3's reader and its tests need it - Severity: Major

- **Reviewer Lens:** `egm-implementation-readiness`
- **Affected Scope:** File 2, PR 4 bullet "Private `gzip(bytes)` and `gunzip(bytes)`" (716–719) against PR 3 `decryptData` step 7 (703–704), section 11 PR 3 (459–460), file 19 cases 2 and 6 (955, 959).
- **Discrepancy Description:** An engineer implementing PR 3 gets step 7 ("gunzip in its own `try`") but no helper; the helper is defined only under PR 4. `src/lib/backup.ts:131-172` has no decompression code today.
- **Rationale & Recommendation:** Split the bullet: "PR 3: private `gunzip(bytes)` …" and "PR 4: private `gzip(bytes)` …".

### IR3. How the gzip streams are fed is unspecified, and the common pattern breaks unit case 6 - Severity: Major

- **Reviewer Lens:** `egm-implementation-readiness`
- **Affected Scope:** File 2 helper bullet (717–719); file 19 case 6 (959).
- **Discrepancy Description:** Only the read side (`new Response(stream).arrayBuffer()`) is fixed. In Node 24 the writer pattern (`ds.writable.getWriter(); w.write(bytes); w.close()`) on non-gzip input rejects `arrayBuffer()` (caught) but also raises an **unhandled** `TypeError` from the writer; `vp test` fails the run on unhandled errors. `new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer()` raised none.
- **Rationale & Recommendation:** Pin `new Response(new Blob([bytes]).stream().pipeThrough(new (De)CompressionStream("gzip"))).arrayBuffer()` for both helpers.

### IR4. The Fallow CI gate is missing from the Verification Plan and `.fallowrc.json` is missing from the file list - Severity: Major

- **Reviewer Lens:** `egm-implementation-readiness`
- **Affected Scope:** Verification Plan (1088–1104); Target Files (658–1048); files 2, 4, 7, 8, 15, 16.
- **Discrepancy Description:** `.github/workflows/pr-checks.yml:36-43` runs `fallow audit` (`gate: new-only`) and `:66-68` runs `fallow health --score --min-score 95` on every PR. `.fallowrc.json` notes that any function with cyclomatic complexity 5 or more breaks the default `maxCrap` 30 and carries per-function ceilings (`performFileSelect` 60, `performManualDecrypt` 45, `handleBackup` 75). The plan adds branches to all three and to `decryptData`, `readAndCheckFile` and the new `prepareReceiptPhoto`. [INFERENCE] Several will exceed their ceilings, and the engineer must choose between overrides and extraction.
- **Rationale & Recommendation:** Add `bun run audit:pr` and `bunx fallow health --score --min-score 95` to per-PR verification, and either list `.fallowrc.json` changes per PR or name the helpers to extract.

### IR5. Test Plan has no case for the restore marker, startup message or backup-size warning - Severity: Major

- **Reviewer Lens:** `egm-implementation-readiness`
- **Affected Scope:** Files 6, 7, 8 PR 1 (794–828); file 4 PR 2 older-CSV text (777); file 21 (980–1002); Verification Plan (1096–1104).
- **Discrepancy Description:** No test covers `markRestoreStarted`/`markRestoreEnded`/`takeInterruptedRestore` (including invalid JSON → `null`), the startup `toast.warning` and its telemetry (`src/hooks/useAppStartup.ts:15`), or the over-threshold backup warning (`src/hooks/useBackupAction.ts:66-67`). The PR 2 older-CSV message is untested, and after PR 2 the UI can no longer produce such a file.
- **Rationale & Recommendation:** Add an e2e test: set `localStorage["expense-tracker-restore-in-progress"] = '{"step":"read","bytes":1}'`, reload, assert the toast and that the key is gone, reload again and assert no toast. Assert the key is absent after a successful restore. Add an encrypted-CSV fixture for the PR 2 text, or record that it is untested.

### IR6. `{mb}` formula is defined only in file 4 but file 8 uses it too - Severity: Nit

- **Reviewer Lens:** `egm-implementation-readiness`
- **Affected Scope:** File 4 (752); file 8 PR 1 (824–827).
- **Discrepancy Description:** `useBackupAction.ts` needs the same `(bytes / (1024 * 1024)).toFixed(1)`; duplicate or shared helper (and which module) is not decided.
- **Rationale & Recommendation:** Name the decision.

### IR7. Overlapping file selections can clear another run's marker - Severity: Nit

- **Reviewer Lens:** `egm-implementation-readiness`
- **Affected Scope:** File 4 PR 1, `performFileSelect` `finally` (762–768) and `performManualDecrypt` (772–776).
- **Discrepancy Description:** Runs overlap (`src/hooks/useEncryptedFileImport.ts:54,130,150`). A superseded run's `finally` removes the marker a newer run set, so a crash in the newer run goes unreported. Risk row 4 covers only over-counting.
- **Rationale & Recommendation:** Accept the undercount in section 12, or clear the marker in `finally` only when `isCurrent()`.

### IR8. Telemetry is unspecified for file-selection rejections that return `{ error }` - Severity: Nit

- **Reviewer Lens:** `egm-implementation-readiness`
- **Affected Scope:** File 4 PR 1 catch (763–767), PR 3 checks (781–785), section 2 telemetry bullet.
- **Discrepancy Description:** Section 2 says `stage: "read"` covers "failures during file selection"; file 4 sends telemetry only from the `catch`. `{ error }` results reach the toast at `src/hooks/useEncryptedFileImport.ts:63-66` with no telemetry.
- **Rationale & Recommendation:** Pin one behaviour.

### IR9. Unit case 4 "garbage" ciphertext must be valid base64url - Severity: Nit

- **Reviewer Lens:** `egm-implementation-readiness`
- **Affected Scope:** File 19 case 4 (957); `decryptData` step 4 (694–695).
- **Discrepancy Description:** Step 4 decodes every field before the check; non-base64url garbage makes `atob` throw at `src/lib/backup.ts:44` first.
- **Rationale & Recommendation:** "ciphertext replaced with `b64uEncode` of 64 random bytes".

### IR10. Doc entries omit affected lines, and some describe behaviour before it ships - Severity: Nit

- **Reviewer Lens:** `egm-implementation-readiness`
- **Affected Scope:** Files 23 (1018–1029) and 24 (1031–1036); Verification Plan e2e list (1100–1104); file 21 PR 4 (999–1002).
- **Discrepancy Description:** File 23 misses `docs/features/featureset.md:164` (auto-decrypt fallback), `:165` (wrong-passphrase detection), `:166` (CSV guard text, changes in PR 2), `:366` ("encryption for backups and exports"), and has no PR 1 bullet for the unfinished-restore message; it places unknown-version rejection in PR 4 (ships in PR 3). File 24 (PR 2) says the format is version 2 while PR 2 still writes version 1. The e2e list omits `boot.spec.ts` and `data-loss.spec.ts`, though PR 1 edits `useAppStartup`. No e2e test covers the PR 4 version-1 fallback.
- **Rationale & Recommendation:** Add the `featureset.md` lines with PR labels; move file 24's version-2 sentence to PR 4; add the two specs to PR 1; add a PR 4 e2e case (`addInitScript` deletes `window.CompressionStream`, Backup → device, assert `version` `"1"` and `check`) or state that unit case 9 alone covers it.

## Codebase Details Findings

The reviewer checked every other claim about existing code in lines 648–1131
and found it accurate: symbols, signatures, quoted "today's text" strings, the
`@/config` barrel, `limits.ts` having no imports, the five `exportEncrypted`
callers, `seedExpenses`/`readExpenses`, `buildMetadataBlob`/`findExistingFile`,
`clearAll` using `storage.clear()`, and `.node-version` 24.

### CD1. `gunzip` is assigned to PR 4, but PR 3 needs it - Severity: Major

- **Reviewer Lens:** `egm-codebase-details`
- **Affected Scope:** File 2, PR 3 step 7 (703–704) and PR 4 helper bullet (716–719); file 19 cases 2 and 6 (955, 959).
- **Discrepancy Description:** Same as IR2. `src/lib/backup.ts:1-201` has no compression code.
- **Rationale & Recommendation:** Move `gunzip(bytes)` to PR 3; leave `gzip(bytes)` under PR 4.

### CD2. Deleting `EncryptToggleRow` leaves `ui/checkbox.tsx` and `@radix-ui/react-checkbox` unused, which fails fallow - Severity: Major

- **Reviewer Lens:** `egm-codebase-details`
- **Affected Scope:** Files 13–14 (865–874); Target Files list.
- **Discrepancy Description:** `checkbox.tsx` has one importer, `EncryptToggleRow.tsx`, and is the only user of `@radix-ui/react-checkbox`. `.fallowrc.json:16-17` sets `unused-dependencies` and `unused-files` to `error`; the audit runs with `gate: new-only` (`.github/workflows/pr-checks.yml:20-41`). The design lists neither file.
- **Rationale & Recommendation:** Add to PR 2: delete `src/components/ui/checkbox.tsx`; `bun remove @radix-ui/react-checkbox`; commit `package.json` and `bun.lock`.

### CD3. The fallow complexity gates and per-function ceilings are not addressed - Severity: Major

- **Reviewer Lens:** `egm-codebase-details`
- **Affected Scope:** Verification Plan (1088–1104); file 2 `decryptData` (689–705); file 4 PR 1 and PR 3 (753–785); file 8 PR 1 (823–828).
- **Discrepancy Description:** Same gate as IR4. `.fallowrc.json:45-109` pins ceilings as "reported score + headroom" (`:42-44`): `performFileSelect` 60, `performManualDecrypt` 45, `handleBackup` 75. `decryptData` has no override and gains about six branches; default `maxCognitive` is 15 (`:34`).
- **Rationale & Recommendation:** Add `.fallowrc.json` entries per PR, or specify the function splits; add `bun run audit:pr` to per-PR verification.

### CD4. No automated test for the restore marker, the startup message or the backup size warning; the startup specs are not in the e2e list - Severity: Major

- **Reviewer Lens:** `egm-codebase-details`
- **Affected Scope:** Files 6–8 (794–828); file 21 PR 1 (981–986); Verification Plan e2e (1100–1104).
- **Discrepancy Description:** Same gap as IR5. The pattern exists: `tests/e2e/data-loss.spec.ts:11-17` seeds `localStorage` with `page.addInitScript` and asserts startup UI. PR 1 changes `useAppStartup.ts` but the e2e list omits `boot.spec.ts` and `data-loss.spec.ts`.
- **Rationale & Recommendation:** Seed `expense-tracker-restore-in-progress` with `{"step":"read","bytes":1}` via `addInitScript` and assert the toast; seed invalid JSON and assert no toast; add both specs to the e2e list; name a test or a manual check for the backup warning.

### CD5. `KNOWN_BACKUP_VERSIONS ... as const` will not type-check against a `string` version - Severity: Nit

- **Reviewer Lens:** `egm-codebase-details`
- **Affected Scope:** File 2 (680, 692–693); file 4 PR 3 (783).
- **Discrepancy Description:** `readonly ["1", "2"]`.includes(`string`) fails with TS2345; `vp check` type-checks in CI.
- **Rationale & Recommendation:** Type the array `readonly string[]`, or state the cast.

### CD6. Release-note version for PR 1 differs from the AGENTS.md rule without saying so - Severity: Nit

- **Reviewer Lens:** `egm-codebase-details`
- **Affected Scope:** File 18 (928–933).
- **Discrepancy Description:** `AGENTS.md` says a fix bumps the patch (1.9.2); file 18 gives PR 1 1.10.0 without saying why.
- **Rationale & Recommendation:** "PR 1 uses 1.10.0, not 1.9.2, because all five PRs ship together (section 11)."

### CD7. `readDownload` is called a spec helper but lives in a support file - Severity: Nit

- **Reviewer Lens:** `egm-codebase-details`
- **Affected Scope:** File 21 PR 2 (991).
- **Discrepancy Description:** `setPassphrase` is spec-local (`tests/e2e/data-management.spec.ts:15`); `readDownload` is in `tests/support/app.ts:42`.
- **Rationale & Recommendation:** Name both locations.

### CD8. How the unit test loads the fixture, and which fields the fixture records need, are not specified - Severity: Nit

- **Reviewer Lens:** `egm-codebase-details`
- **Affected Scope:** File 19 case 1 (954); file 20 (964–975).
- **Discrepancy Description:** No unit test reads from disk today. "Valid records" names no fields, and "no skipped records" requires every field to pass `src/db/recordSchemas.ts:13-34`.
- **Rationale & Recommendation:** `readFileSync("tests/fixtures/backup-v1.extrack", "utf-8")` from `node:fs`; point the script at the valid-record shape in `src/lib/importPreview.test.ts:4-15`.

### CD9. A superseded file selection's `finally` can clear the newer selection's marker - Severity: Nit

- **Reviewer Lens:** `egm-codebase-details`
- **Affected Scope:** File 4 PR 1 (762–768).
- **Discrepancy Description:** Same as IR7 (`src/hooks/useEncryptedFileImport.ts:54`).
- **Rationale & Recommendation:** `if (deps.isCurrent()) markRestoreEnded()`, or accept the undercount in section 12.

### CD10. The check step does not say whether the decrypted bytes are compared with "extrack" - Severity: Nit

- **Reviewer Lens:** `egm-codebase-details`
- **Affected Scope:** File 2 PR 3 step 5 (696–698).
- **Rationale & Recommendation:** "A successful decrypt is enough (the GCM tag authenticates it); the plaintext is not compared."

### CD11. How the receipt-photo e2e moves a page-built image into the file input is not specified - Severity: Nit

- **Reviewer Lens:** `egm-codebase-details`
- **Affected Scope:** File 22 (1007–1010).
- **Discrepancy Description:** `page.setInputFiles` needs a Node-side buffer; the existing precedent passes Node buffers (`tests/e2e/data-management.spec.ts:146-150`).
- **Rationale & Recommendation:** Return the bytes as base64 from `page.evaluate`, then `page.setInputFiles(selector, { name, mimeType, buffer })`.

## Style Findings

### ST1. Release-note title for PR 1 promises "always", which the design does not support - Severity: Major

- **Reviewer Lens:** `egm-style`
- **Affected Scope:** File 18, PR 1 row (933).
- **Discrepancy Description:** "Large backups can always be restored", while the body says restoring "may fail on phones with little memory" and file 4 adds `TOO_LARGE_MESSAGE` for that failure. Users read the title only (`src/content/releaseNotes.ts:5`).
- **Rationale & Recommendation:** "Large backups are no longer refused".

### ST2. `TOO_LARGE_MESSAGE` states a memory cause as fact for failures that have other causes - Severity: Major

- **Reviewer Lens:** `egm-style`
- **Affected Scope:** File 4 message table (745); routing (759–761, 769–771).
- **Discrepancy Description:** Shown for every non-passphrase failure on a large file, including damaged ciphertext with a valid `check` (700) and `buildImportPreview` returning `null` (`src/hooks/useEncryptedFileImport.ts:28-29`). Section 12 lists damage as a risk. File 7's toast hedges ("The file may be too large").
- **Rationale & Recommendation:** "This backup may be too large for this device's memory. Try restoring it on a computer."

### ST3. Manual check refers to a "Try anyway" button that does not exist - Severity: Major

- **Reviewer Lens:** `egm-style`
- **Affected Scope:** Verification Plan manual checks (1118–1119); file 4 (746, 755–756).
- **Discrepancy Description:** `window.confirm` shows OK/Cancel; "Try anyway?" is only the prompt's last sentence.
- **Rationale & Recommendation:** "choose OK at the 'Try anyway?' prompt".

### ST4. e2e helper steps are written in an order that hangs if followed literally - Severity: Major

- **Reviewer Lens:** `egm-style`
- **Affected Scope:** File 21, PR 2 bullet (987–991).
- **Discrepancy Description:** "wait for the download, click "Create Backup"" reads as wait-then-click. The existing code registers the wait before the click (`tests/e2e/data-management.spec.ts:236-238`, `:30-32`).
- **Rationale & Recommendation:** "start `page.waitForEvent("download")`, click "Create Backup" in the dialog named "Backup", then await the download".

### ST5. Unit case 4 says "garbage" ciphertext; invalid base64 fails before the check runs - Severity: Major

- **Reviewer Lens:** `egm-style`
- **Affected Scope:** File 19 case 4 (957); file 2 step 4 (694–695).
- **Discrepancy Description:** Same as IR9 (`src/lib/backup.ts:42-45`).
- **Rationale & Recommendation:** "ciphertext replaced with valid base64url of random bytes".

### ST6. File 24 claims a version-2 format in PR 2, before version 2 exists - Severity: Major

- **Reviewer Lens:** `egm-style`
- **Affected Scope:** File 24 (1034–1036).
- **Discrepancy Description:** Version-2 writes land in PR 4; between PR 2 and PR 4 the doc on `main` describes a format the code does not write.
- **Rationale & Recommendation:** PR 2 says only that export encryption was removed; the version-2 sentence moves to PR 4.

### ST7. Message table header "Constant" fits only one row; two different wrong-passphrase texts - Severity: Nit

- **Reviewer Lens:** `egm-style`
- **Affected Scope:** File 4 (743–750); 683.
- **Discrepancy Description:** Only `TOO_LARGE_MESSAGE` is a constant; "Wrong passphrase — try again" sits next to the exported `WRONG_PASSPHRASE_MESSAGE` ("Wrong passphrase — decryption failed").
- **Rationale & Recommendation:** Rename the column "Message"; say only `TOO_LARGE_MESSAGE` becomes a constant; label the row "wrong passphrase (shown to user)".

### ST8. Redundant phrase in file 20 - Severity: Nit

- **Reviewer Lens:** `egm-style`
- **Affected Scope:** File 20 (967).
- **Rationale & Recommendation:** "PR 3. Generated while `encryptData` still writes version 1 without `check`, by …".

### ST9. Release-note wording for PR 4 is unquantified, and PR 2's title is ungrammatical - Severity: Nit

- **Reviewer Lens:** `egm-style`
- **Affected Scope:** File 18 (934, 936).
- **Discrepancy Description:** "far less space" / "much smaller" hold for rows (about 7×) but not photos (about 25%). "Export is plain files" uses "is" with a plural noun.
- **Rationale & Recommendation:** PR 4: "Backups are smaller". PR 2: "Export saves plain files; Backup makes encrypted ones".

### ST10. "or later" in the needs-newer-browser message has unclear scope - Severity: Nit

- **Reviewer Lens:** `egm-style`
- **Affected Scope:** File 4 (749).
- **Rationale & Recommendation:** "(Chrome 80, Firefox 113, Safari 16.4 or newer)".

### ST11. Confirm prompt calls an unchecked file "This backup" - Severity: Nit

- **Reviewer Lens:** `egm-style`
- **Affected Scope:** File 4 (746); 755–758, 981–986.
- **Discrepancy Description:** The prompt appears before any format check, and the PR 1 e2e test picks a non-wrapper file.
- **Rationale & Recommendation:** "This file is {mb} MB. …".

### ST12. Thrown error strings are cited inconsistently - Severity: Nit

- **Reviewer Lens:** `egm-style`
- **Affected Scope:** File 19 cases 5–6 (958–959); 700, 704; diagram (267–268).
- **Rationale & Recommendation:** Quote the full strings in cases 5–6 and say "exact message"; match the diagram labels to the thrown text.

### ST13. File 23 assigns "unknown versions rejected" to PR 4 - Severity: Nit

- **Reviewer Lens:** `egm-style`
- **Affected Scope:** File 23 (1022–1023).
- **Rationale & Recommendation:** Attach it to PR 3.

### ST14. "(PR 3/4)" is ambiguous - Severity: Nit

- **Reviewer Lens:** `egm-style`
- **Affected Scope:** Local contract docs, `src/lib/EGM.md` (1057).
- **Rationale & Recommendation:** One item per PR.

### ST15. "nothing committed" conflicts with the threshold PR - Severity: Nit

- **Reviewer Lens:** `egm-style`
- **Affected Scope:** Manual checks heading (1105).
- **Rationale & Recommendation:** "(scripts are throwaway and not committed)".

### ST16. Lint note leaves out PR 1's UI change - Severity: Nit

- **Reviewer Lens:** `egm-style`
- **Affected Scope:** Static Analysis (1093–1095).
- **Discrepancy Description:** PR 1 also changes `ImportData.tsx` (file 5).
- **Rationale & Recommendation:** "PR 1, PR 2 and PR 5", or drop the list.

### ST17. "Record" steps name no destination or decision - Severity: Nit

- **Reviewer Lens:** `egm-style`
- **Affected Scope:** Verification Plan (1119, 1124–1125).
- **Rationale & Recommendation:** Name where each result goes (the threshold PR, the PR 5 checklist), or drop it.

### ST18. PR 1 instructions use terms the text does not define - Severity: Nit

- **Reviewer Lens:** `egm-style`
- **Affected Scope:** File 4 (759–761, 769–771).
- **Discrepancy Description:** "a wrong-passphrase error" is undefined in PR 1 (today: `msg.includes("Wrong passphrase")`, `src/hooks/useEncryptedFileImport.ts:36`); "on both paths" names no paths.
- **Rationale & Recommendation:** Say "keeps today's `includes("Wrong passphrase")` test" and "in `performFileSelect` and `performManualDecrypt`".

### ST19. File 22: missing unit and a vague test title - Severity: Nit

- **Reviewer Lens:** `egm-style`
- **Affected Scope:** File 22 (1014, 1016).
- **Rationale & Recommendation:** "1600 px"; retitle "Undecodable files show the unsupported or unreadable message".

### ST20. Vague verb in the `ponytail:` comment - Severity: Nit

- **Reviewer Lens:** `egm-style`
- **Affected Scope:** File 15 (897).
- **Rationale & Recommendation:** "a long-edge cap shrinks the short edge of tall scanner crops below the legibility floor; a pixel budget (about 4 MP) is the upgrade".

### ST21. `{mb}` formatter location not stated for its second user - Severity: Nit

- **Reviewer Lens:** `egm-style`
- **Affected Scope:** File 4 (752); file 8 (825–826).
- **Discrepancy Description:** Same as IR6.
- **Rationale & Recommendation:** State one choice.
