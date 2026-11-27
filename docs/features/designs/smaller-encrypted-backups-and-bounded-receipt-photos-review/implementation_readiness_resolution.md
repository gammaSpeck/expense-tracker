# Goldfish Annotated Review Report: Stage 9 Resolution

**Status: resolved** (2026-11-27, "auto accept"). Applied all 33 proposals
to the design. Contested: 0. Escalated: 0. Declined: 0. The design header now
reads `Status: Approved`.

**Target:** `docs/features/designs/smaller-encrypted-backups-and-bounded-receipt-photos.md` (DetailedRange, lines 648-1131; edits to the FeatureRange only where a fix must keep the two consistent)

**Source findings:** `implementation_readiness_report.md` (IR1–IR10, CD1–CD11, ST1–ST21). Duplicates are merged into one entry.

**Summary.** 33 entries cover all 42 findings. PROPOSE FIX: 33. CONTEST: 0. ESCALATE: 0. DECLINE: 0.

**Verified by the drafting session before classifying:**

- IR1: re-measured in headless Chromium with the file 15 pipeline. 3000 × 2000
  noise gives 790,731 / 576,866 / 307,619 bytes (step 3 fits under 524,288).
  1200 × 1200 noise gives 825,398 / 640,784 / 640,784 bytes (over the cap at every step).
- IR3: in Node 24.14.1, the writer pattern on non-gzip bytes raises an
  unhandled `TypeError`; `new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer()`
  rejects once, is caught, and round-trips gzip correctly.
- IR4/CD3: `.fallowrc.json` `thresholdOverrides` accept `maxCrap`,
  `maxCyclomatic` and `maxCognitive` per file and function
  (`node_modules/fallow/schema.json`, `HealthThresholdOverride`).
- CD2: `src/components/ui/checkbox.tsx` has one importer
  (`EncryptToggleRow.tsx:2`) and is the only user of `@radix-ui/react-checkbox`.
- IR6/ST21: `src/components/more/import-csv/CsvFileSummary.tsx:5-9` has a
  private `humanizeFileSize`; no shared byte formatter exists.

## Prioritized Findings & AI Suggestions

### 1. PR 5 noise fixture fits under the cap at the floor (IR1) [`egm-implementation-readiness`] - Severity: Blocker

- **Affected Scope:** File 22, row "Photo over the cap at the floor is rejected" (1015).
- **Discrepancy Description:** 3000 × 2000 noise compresses to about 307 KB at 1200@0.6, so the photo is stored and the test fails.
- **Rationale:** Use a source that is never downscaled.
- _**AI Suggestion:**_ PROPOSE FIX
- _**Justification:**_ Confirmed by measurement (above).
- _**Proposed Edit:**_
  - Location: file 22 table, Setup cell of that row.
  - Change: "1200 × 1200 opaque random noise (never downscaled; measured about 825 KB at quality 0.75 and 641 KB at 0.6, over the cap at every step)".

### 2. `gunzip` is labelled PR 4 but PR 3 needs it (IR2, CD1) [`egm-implementation-readiness`, `egm-codebase-details`] - Severity: Major

- **Affected Scope:** File 2, PR 4 helper bullet (717–719); PR 3 step 7 (703–704); file 19 cases 2, 6.
- **Discrepancy Description:** PR 3's `decryptData` and unit cases need `gunzip`, defined only under PR 4.
- **Rationale:** Split the helper bullet by PR.
- _**AI Suggestion:**_ PROPOSE FIX
- _**Justification:**_ Valid; `backup.ts` has no compression code today.
- _**Proposed Edit:**_
  - Location: file 2, PR 3 list (new first bullet) and PR 4 helper bullet.
  - Change: PR 3 gains "Private `gunzip(bytes: Uint8Array): Promise<Uint8Array>`: `new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer())`." PR 4's bullet becomes "Private `gzip(bytes)`, the same expression with `CompressionStream("gzip")`."

### 3. Stream feeding is unpinned; the writer pattern breaks unit case 6 (IR3) [`egm-implementation-readiness`] - Severity: Major

- **Affected Scope:** File 2 helper bullet (717–719); file 19 case 6.
- **Discrepancy Description:** The writer pattern leaves an unhandled `TypeError` on bad input; `vp test` fails on unhandled errors.
- **Rationale:** Pin the `Blob.stream().pipeThrough(...)` expression.
- _**AI Suggestion:**_ PROPOSE FIX
- _**Justification:**_ Confirmed in Node 24.14.1 (above).
- _**Proposed Edit:**_ Covered by entry 2's exact expressions, plus one sentence: "Do not feed the stream through `writable.getWriter()`: on non-gzip input it leaves an unhandled rejection."

### 4. Fallow CI gate and complexity ceilings not addressed (IR4, CD3) [`egm-implementation-readiness`, `egm-codebase-details`] - Severity: Major

- **Affected Scope:** Verification Plan (1088–1104); Target Files list.
- **Discrepancy Description:** PR Checks runs `fallow audit` (`gate: new-only`) and `fallow health --min-score 95`. PRs 1, 3 and 5 add branches to functions with tight ceilings, and the engineer must choose between overrides and splits.
- **Rationale:** Pin the gate and the rule.
- _**AI Suggestion:**_ PROPOSE FIX
- _**Justification:**_ `.fallowrc.json` already records the convention: overrides at "reported score + headroom", with a reason, for "necessary business logic … not a code smell to refactor away". The fix adopts that convention as the one rule, so there is no split-versus-override choice.
- _**Proposed Edit:**_
  - Location: Verification Plan, new bullet after Static Analysis; new file entry 28.
  - Change: Verification: "**CI gates**: `bun run audit:pr` and `bunx fallow health --score --min-score 95` per PR (PR Checks runs both). When either flags a function this PR changes, add or raise that function's `thresholdOverrides` entry in `.fallowrc.json`: set the flagged metric (`maxCrap`, `maxCyclomatic` or `maxCognitive`) to the reported value rounded up to the next multiple of 5, with a `reason` naming the branches this PR added, in the style of the existing entries. Do not split functions to satisfy the gate." File entry "28. `.fallowrc.json` (Modify) — any PR, only by the CI-gates rule in the Verification Plan."

### 5. PR 2 leaves `ui/checkbox.tsx` and `@radix-ui/react-checkbox` unused (CD2) [`egm-codebase-details`] - Severity: Major

- **Affected Scope:** Files 13–14 (865–874); file 17; Target Files list.
- **Discrepancy Description:** Deleting `EncryptToggleRow` leaves its only dependency chain unused, which fallow reports as `unused-files` and `unused-dependencies` errors.
- **Rationale:** Clean cutover.
- _**AI Suggestion:**_ PROPOSE FIX
- _**Justification:**_ Confirmed (above).
- _**Proposed Edit:**_ New file entry "27. `src/components/ui/checkbox.tsx` (Delete) — PR 2: delete; its only importer is file 14." File 17 gains "PR 2: `bun remove @radix-ui/react-checkbox` (its only user is file 27); commit both files." File 14's line becomes "PR 2: delete. Its only user is file 13; it is the only importer of file 27."

### 6. No tests for the restore marker, startup toast or backup warning; specs missing; fallback and CSV text untested (IR5, CD4, IR10 test part) [`egm-implementation-readiness`, `egm-codebase-details`] - Severity: Major

- **Affected Scope:** File 21 (981–1002); Verification Plan e2e (1100–1104).
- **Discrepancy Description:** PR 1's marker, startup toast and backup warning are untested; PR 1 edits `useAppStartup` but `boot.spec.ts`/`data-loss.spec.ts` are not run; the PR 4 fallback has no browser test; the PR 2 older-CSV text is untested.
- **Rationale:** The standard requires happy-path and edge-case tests.
- _**AI Suggestion:**_ PROPOSE FIX
- _**Justification:**_ The marker and warning are consumer-visible branches. `data-loss.spec.ts:11-17` has the `addInitScript` seeding pattern. The older-CSV text is one string on a path the app can no longer create after PR 2, so it is recorded as untested instead of building an encrypted CSV in the test.
- _**Proposed Edit:**_ File 21 PR 1 gains:
  - "unfinished restore is reported at the next start": `page.addInitScript` sets `localStorage["expense-tracker-restore-in-progress"]` to `'{"step":"read","bytes":1}'`; `gotoApp(page, "/")`; the toast "Your last restore didn't finish…" is visible; `expect.poll` of `localStorage.getItem` for the key is `null`.
  - "an unreadable restore marker is dropped silently": the same with the value `"{"`; `expect.poll` of the key is `null`, then the toast text has count 0.
  - "a backup over the threshold warns": `gotoApp(page, "/settings/data")`; `seedExpenses` 14 expenses, each with `attachment: "data:image/jpeg;base64," + randomBytes(750_000).toString("base64")` (`node:crypto`; random so gzip cannot shrink it below the threshold after PR 4); `setPassphrase`; click the first "Create Backup"; in the dialog named "Backup", start `page.waitForEvent("download")`, click "Create Backup", await the download; the warning "Restoring it may fail on phones with little memory" is visible.
  - In "encrypted round trip", after the import succeeds, the key is `null`.
  - File 21 PR 4 gains: "with `addInitScript` deleting `window.CompressionStream`, `backupToDevice` returns a wrapper with `version` `"1"` and a `check`".
  - File 4 PR 2 gains: "Not covered by an automated test: after PR 2 the app cannot create an encrypted CSV, and the change is one string."
  - Verification e2e list adds `tests/e2e/boot.spec.ts tests/e2e/data-loss.spec.ts` with "(PR 1 changes `useAppStartup`)".

### 7. PR 1 release-note title promises "always" (ST1) [`egm-style`] - Severity: Major

- **Affected Scope:** File 18, PR 1 row (933).
- _**AI Suggestion:**_ PROPOSE FIX
- _**Justification:**_ The body and file 4 both say a restore may fail.
- _**Proposed Edit:**_ Title "Large backups are no longer refused".

### 8. `TOO_LARGE_MESSAGE` states a memory cause as fact (ST2) [`egm-style`] - Severity: Major

- **Affected Scope:** File 4 message table (745).
- _**AI Suggestion:**_ PROPOSE FIX
- _**Justification:**_ The routing is size-based; damage is also possible. The Goal says messages say what happened.
- _**Proposed Edit:**_ "This backup may be too large for this device's memory. Try restoring it on a computer."

### 9. "Try anyway" is not a button (ST3) [`egm-style`] - Severity: Major

- **Affected Scope:** Manual checks (1118–1119).
- _**AI Suggestion:**_ PROPOSE FIX
- _**Proposed Edit:**_ "choosing OK at the "Try anyway?" prompt".

### 10. e2e helper steps read as wait-then-click (ST4) [`egm-style`] - Severity: Major

- **Affected Scope:** File 21 PR 2 (987–991).
- _**AI Suggestion:**_ PROPOSE FIX
- _**Proposed Edit:**_ "`setPassphrase`; click the first "Create Backup"; in the dialog named "Backup", start `page.waitForEvent("download")`, click "Create Backup", then await the download; assert the name …".

### 11. Unit case 4 "garbage" must be valid base64url (ST5, IR9) [`egm-style`, `egm-implementation-readiness`] - Severity: Major

- **Affected Scope:** File 19 case 4 (957).
- _**AI Suggestion:**_ PROPOSE FIX
- _**Justification:**_ `b64uDecode` runs before the check (`src/lib/backup.ts:42-45`).
- _**Proposed Edit:**_ "wrong passphrase on version 2, ciphertext replaced with `b64uEncode` of 64 random bytes".

### 12. Doc edits labelled to the wrong PR; `featureset.md` lines missed (ST6, IR10 doc part, ST13, ST14) [`egm-style`, `egm-implementation-readiness`] - Severity: Major

- **Affected Scope:** Files 23 (1018–1029), 24 (1031–1036); local docs (1055–1057).
- **Discrepancy Description:** File 24 claims version 2 in PR 2; file 23 puts unknown-version rejection in PR 4, misses `featureset.md:164-166, 366` and the PR 1 unfinished-restore message; "(PR 3/4)" is ambiguous.
- _**AI Suggestion:**_ PROPOSE FIX
- _**Proposed Edit:**_
  - File 23 becomes a per-PR list. PR 1: "File size cap" becomes "Large files: the app asks before reading a file over the threshold"; add "Unfinished restore: at the next start the app says the last restore didn't finish". PR 2: Export Data loses "Optional encryption" and the encrypted filename; "CSV export guard" shows the older-CSV message; the roadmap line "End-to-end encryption for backups and exports" becomes "… for backups". PR 3: unknown versions are rejected when the file is picked; "Manual passphrase fallback" applies when no passphrase is stored or the stored one is wrong. PR 4: sample envelope `"version": "2"` with `check`; version `"1"` still read; Backup compressed before encryption with the version-1 fallback; "Wrong passphrase detection" uses the file's passphrase check, and files without one keep today's behaviour. PR 5: Attachments JPEG of at most 0.5 MB; tech stack replaces `browser-image-compression` with the built-in canvas pipeline.
  - File 24: "PR 2: one line under the title saying export encryption was removed, linking this design. PR 4: append that the backup format is now version 2. The plan text stays as history."
  - Local docs: split into "PR 3: `encryptData(plaintext, passphrase)`, `readEnvelopeVersion` replacing `isEncryptedFile`, the three exported constants, optional `check` in the envelope type" and "PR 4: every new file carries `check` (envelope invariant)".

### 13. `{mb}` formatter location (IR6, ST21) [`egm-implementation-readiness`, `egm-style`] - Severity: Nit

- _**AI Suggestion:**_ PROPOSE FIX
- _**Justification:**_ Two uses; the only existing formatter is private to a CSV component and mixes units.
- _**Proposed Edit:**_ File 4: "`{mb}` is `(bytes / (1024 * 1024)).toFixed(1)`, written inline in both `useEncryptedFileImport.ts` and `useBackupAction.ts` (file 8); no shared helper."

### 14. A superseded run's `finally` clears a newer run's marker (IR7, CD9) [`egm-implementation-readiness`, `egm-codebase-details`] - Severity: Nit

- _**AI Suggestion:**_ PROPOSE FIX (accept the undercount)
- _**Justification:**_ Guarding the `finally` with `isCurrent()` would leave the marker set after Cancel unless `resetEncryptedState` also clears it: two edits and a branch to fix a rare undercount in an upper-bound signal.
- _**Proposed Edit:**_ Section 12, marker row: "Marker miscounts: a closed tab or a second app tab during a restore over-counts; picking a second file while the first is still being read lets the first run's `finally` clear the second's marker and under-count" — Low — "Accepted; the count is a revisit signal, not a metric" — "Counts look implausible".

### 15. Telemetry for `{ error }` results is unspecified (IR8) [`egm-implementation-readiness`] - Severity: Nit

- _**AI Suggestion:**_ PROPOSE FIX
- _**Proposed Edit:**_ File 4 PR 1: "`{ error }` and `{ cancelled }` results send no telemetry; only errors thrown during file selection reach `captureError(…, { stage: "read" })`." Section 2 telemetry bullet: "`stage: "read"` for errors thrown during file selection".

### 16. `as const` will not type-check against a `string` version (CD5) [`egm-codebase-details`] - Severity: Nit

- _**AI Suggestion:**_ PROPOSE FIX
- _**Proposed Edit:**_ "`KNOWN_BACKUP_VERSIONS: readonly string[] = ["1", "2"]`".

### 17. PR 1 release-note version vs AGENTS.md (CD6) [`egm-codebase-details`] - Severity: Nit

- _**AI Suggestion:**_ PROPOSE FIX
- _**Proposed Edit:**_ After the file 18 table: "PR 1 uses 1.10.0, not 1.9.2, because all five PRs ship together (section 11)."

### 18. `readDownload` location (CD7) [`egm-codebase-details`] - Severity: Nit

- _**AI Suggestion:**_ PROPOSE FIX
- _**Proposed Edit:**_ "(`setPassphrase` is spec-local; `readDownload` is in `tests/support/app.ts`)".

### 19. Fixture loading and record fields (CD8) [`egm-codebase-details`] - Severity: Nit

- _**AI Suggestion:**_ PROPOSE FIX
- _**Proposed Edit:**_ File 19 case 1 loads with `readFileSync("tests/fixtures/backup-v1.extrack", "utf-8")` from `node:fs`. File 20: records follow the valid shapes in `src/lib/importPreview.test.ts:4-15` (categories with `id`, `name`, `icon`, `color` `#RRGGBB`, `createdAt`; expenses with `id`, `value`, `category`, `tags: []`, `date`, `time`, `isAdhoc: false`, `createdAt`, `updatedAt`, plus `description`).

### 20. Whether the `check` plaintext is compared (CD10) [`egm-codebase-details`] - Severity: Nit

- _**AI Suggestion:**_ PROPOSE FIX
- _**Proposed Edit:**_ Step 5 adds: "A successful decrypt is enough (the GCM tag authenticates it); the plaintext is not compared."

### 21. How the photo e2e attaches a page-built image (CD11) [`egm-codebase-details`] - Severity: Nit

- _**AI Suggestion:**_ PROPOSE FIX
- _**Proposed Edit:**_ File 22: "returns the encoded bytes as base64 from `page.evaluate` and attaches them with `page.setInputFiles('[data-testid="attachment-input"]', { name, mimeType, buffer })`".

### 22. Message table header and the two wrong-passphrase texts (ST7) [`egm-style`] - Severity: Nit

- _**AI Suggestion:**_ PROPOSE FIX
- _**Proposed Edit:**_ Column "Message"; row label "wrong passphrase (shown to user)"; a line under the table: "Only `TOO_LARGE_MESSAGE` becomes a constant; the other rows are inline strings."

### 23. Redundant phrase in file 20 (ST8) [`egm-style`] - Severity: Nit

- _**AI Suggestion:**_ PROPOSE FIX
- _**Proposed Edit:**_ "PR 3. Generated while `encryptData` still writes version 1 without `check`, by a one-off Bun script …".

### 24. PR 4 and PR 2 release-note wording (ST9) [`egm-style`] - Severity: Nit

- _**AI Suggestion:**_ PROPOSE FIX
- _**Proposed Edit:**_ PR 4 title "Backups are smaller", body "Backup files are now smaller, and older backups still restore. Update ExTrack on any device before restoring a new backup there." PR 2 title "Export saves plain files; Backup makes encrypted ones".

### 25. "or later" scope (ST10) [`egm-style`] - Severity: Nit

- _**AI Suggestion:**_ PROPOSE FIX
- _**Proposed Edit:**_ "This backup needs a newer browser (Chrome 80+, Firefox 113+ or Safari 16.4+). Restore it on another device."

### 26. Confirm prompt calls an unchecked file "This backup" (ST11) [`egm-style`] - Severity: Nit

- _**AI Suggestion:**_ PROPOSE FIX
- _**Proposed Edit:**_ "This file is {mb} MB. Restoring files this large may fail on phones with little memory. Try anyway?"

### 27. Thrown strings cited inconsistently (ST12) [`egm-style`] - Severity: Nit

- _**AI Suggestion:**_ PROPOSE FIX
- _**Proposed Edit:**_ Cases 5–6 assert the exact messages "Backup could not be decrypted" and "Backup decrypted but could not be unpacked". The section 2 diagram labels use the same full strings, still marked (internal).

### 28. "nothing committed" (ST15) [`egm-style`] - Severity: Nit

- _**AI Suggestion:**_ PROPOSE FIX
- _**Proposed Edit:**_ "**Manual checks** (scripts are throwaway and not committed):".

### 29. Lint note omits PR 1 (ST16) [`egm-style`] - Severity: Nit

- _**AI Suggestion:**_ PROPOSE FIX
- _**Proposed Edit:**_ "PR 1, PR 2 and PR 5 change UI code".

### 30. "Record" steps have no destination (ST17) [`egm-style`] - Severity: Nit

- _**AI Suggestion:**_ PROPOSE FIX
- _**Proposed Edit:**_ Phone test: "Report the phone model, which files restored and the restore times; the threshold PR records them in the constant's comment (phone, format, date) and its body (times)." 48 MP: "and tick the PR 5 checklist item with stored or rejected".

### 31. PR 1 terms undefined (ST18) [`egm-style`] - Severity: Nit

- _**AI Suggestion:**_ PROPOSE FIX
- _**Proposed Edit:**_ "a wrong-passphrase error (today's `message.includes("Wrong passphrase")` test, made exact in PR 3)"; "on both paths" → "in `performFileSelect` and `performManualDecrypt`".

### 32. File 22 unit and test title (ST19) [`egm-style`] - Severity: Nit

- _**AI Suggestion:**_ PROPOSE FIX
- _**Proposed Edit:**_ "a long edge of at most 1600 px"; title "Undecodable files show the unsupported or unreadable message".

### 33. Vague `ponytail:` comment (ST20) [`egm-style`] - Severity: Nit

- _**AI Suggestion:**_ PROPOSE FIX
- _**Proposed Edit:**_ "`ponytail:` comment: a long-edge cap shrinks the short edge of tall scanner crops; a pixel budget (about 4 MP) is the upgrade."
