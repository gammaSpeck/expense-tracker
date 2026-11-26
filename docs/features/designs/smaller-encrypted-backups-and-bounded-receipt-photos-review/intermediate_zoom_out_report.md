# Goldfish Review Report: Stage 8 (Intermediate Zoom Out)

**Target:** `docs/features/designs/smaller-encrypted-backups-and-bounded-receipt-photos.md` (full file, lines 1-1125), with `zoom_out_report.md` as prior context.

**GoldfishContext:** `src/lib/backup.ts`, `src/hooks/useEncryptedFileImport.ts`,
`src/hooks/useImageAttachment.ts`, `src/lib/importPreview.ts`, `src/lib/EGM.md`,
`EGM.md`, `mdn-createImageBitmap.html` (saved copy of the MDN `createImageBitmap()`
page; its compatibility table is not in the file), `mdn-bcd-createImageBitmap.json`
(saved MDN browser-compat-data).

## Reviewer Status

| Reviewer       | Standard               | Status    |
| -------------- | ---------------------- | --------- |
| `egm-zoom-out` | `zoom-out-standard.md` | completed |

## Severity Breakdown

| Reviewer       | Blocker | Major | Nit |
| -------------- | ------- | ----- | --- |
| `egm-zoom-out` | 0       | 2     | 4   |

**Resolved since Stage 5** (reviewer confirmed, not re-raised): R2-Z1 (Drive
cost named, photo figure corrected), R2-Z3 (marker covers the DB write), R2-Z6
(second version check labelled a library invariant), R2-Z8 (brief reference
removed), R2-C1 (phone test on version-2 files), R2-C3 (version-1 fallback).
Alternative H accepted. `from-image` versions confirmed in
`mdn-bcd-createImageBitmap.json:125,133,140`.

## Zoom Out Findings

### S8-1. The passphrase `check` field adds a permanent format field to fix a failure the design rates Low - Severity: Major

- **Reviewer Lens:** `egm-zoom-out`
- **Affected Scope:** Overview item 3 (24–26); section 1 `check` row and "The passphrase check" (234, 240–247); read path (263–265, 283, 288–290); Risks row (480); NFR Security (590–591); file 2 (677, 694–700, 709, 724–725); file 19 cases 4, 5, 8, 9 (953–958); file 21 (996–998); local doc edits.
- **Discrepancy Description:** `check` only separates "wrong passphrase" from "decryption failed for another reason, such as memory", which the Risks table rates Low (480). It adds a permanent field, an extra AES-GCM step on both writer paths, an internal error users never see, two unit cases and doc edits. Size-based routing (`isLarge`) already exists.
- **Rationale & Recommendation:** YAGNI. Drop `check`; on a file over `MAX_RESTORE_FILE_BYTES`, show one combined "Wrong passphrase, or this backup is too large for this device's memory. Try a computer." Add `check` only when a "right passphrase refused" report arrives (the revisit condition at line 480).

### S8-2. The data-loss fix (PR 1) is held back by the bundled release and the phone test - Severity: Major

- **Reviewer Lens:** `egm-zoom-out`
- **Affected Scope:** Goals "The size threshold is measured" (87–88); Open Questions (143–145); section 4 "Its value" (323–331); section 11 (461–465); manual checks (1108–1113); release-note row 1 (930).
- **Discrepancy Description:** Section 11 says all four PRs ship together as 1.10.0, so the fix waits for three unrelated feature PRs and the phone test. Release-please runs on every push to `main` and keeps a release PR open (`.github/workflows/release-please.yml:3-20`), so a lone `fix` commit can ship as a 1.9.x patch.
- **Rationale & Recommendation:** Release PR 1 alone as a patch; let the phone test change the value later via the follow-up `fix` commit. Drop "measured before release 1.10.0" from Goals; only PR 1's release-note version changes.

### S8-3. The restore marker stores data only telemetry uses - Severity: Nit

- **Reviewer Lens:** `egm-zoom-out`
- **Affected Scope:** section 4 (333–350); section 8 `import_failed` row; files 5–7 (785–814).
- **Discrepancy Description:** Two payload shapes (`{ bytes }` / `{ expenseCount }`) and a strict validator; the user message uses neither.
- **Rationale & Recommendation:** One shape, e.g. `{ stage: "read" | "decrypt" | "write", bytes? }`, or a flag; a failed parse returns `null`.

### S8-4. The read-path diagram shows messages users never see - Severity: Nit

- **Reviewer Lens:** `egm-zoom-out`
- **Affected Scope:** read path (264–266) vs message table (281–286) and file 4.
- **Discrepancy Description:** "could not decrypt" and "could not be unpacked" are internal strings that become the too-large or corrupted message.
- **Rationale & Recommendation:** Label them internal (telemetry only) or drop them from the diagram.

### S8-5. CUJ 7 and Alternative I add nothing new - Severity: Nit

- **Reviewer Lens:** `egm-zoom-out`
- **Affected Scope:** CUJ 7 (199–204); Alternative I (577–586).
- **Rationale & Recommendation:** Fold Drive into CUJ 1's "When"; turn Alternative I into a one-line Non-Goal.

### S8-6. Accepted findings remain and code-level detail grew - Severity: Nit

- **Reviewer Lens:** `egm-zoom-out`
- **Affected Scope:** whole document (1,125 lines). New detail: eight numbered `decryptData` steps (687–705), `takeInterruptedRestore` validation (802–804). Still present: `toFixed(1)` (750), `duration: 15_000` (824), `Math.ceil(…/102_400)` (836). Sideways-photo limit stated four times (≈374–379, 438–441, 483, 525–527). R2-Z4 (custom pipeline) and R2-Z5 (`attachmentCount`) unchanged and not reopened.
- **Rationale & Recommendation:** State each risk once in the section 12 table and link to it. Replace the numbered `decryptData` steps with the behaviour contract. Move constants such as `15_000` and `102_400` into the code.

### Reviewer's critical files for implementation

- `src/lib/backup.ts` — `encryptData`/`decryptData` (103–178).
- `src/hooks/useEncryptedFileImport.ts` — `readAndCheckFile`, `performFileSelect` (10–18, 58–81).
- `src/components/more/ImportData.tsx` — `performImport` (10–33), Dexie transaction (92).
- `src/db/userPreferences.ts` — `STORAGE_KEYS`, `clearAll` (30, 207).
- `.github/workflows/release-please.yml` — PR 1 can ship as its own patch.
