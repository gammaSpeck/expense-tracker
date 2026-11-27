# Goldfish Review Report: Stage 7 (Critic Review)

**Target:** `docs/features/designs/smaller-encrypted-backups-and-bounded-receipt-photos.md` (FeatureRange, lines 1-509)

**GoldfishContext:** `src/lib/backup.ts`, `src/hooks/useEncryptedFileImport.ts`,
`src/hooks/useImageAttachment.ts`, `src/lib/importPreview.ts`, `src/lib/EGM.md`,
`EGM.md`, `mdn-createImageBitmap.html`, `mdn-bcd-createImageBitmap.json`.

## Reviewer Status

| Reviewer         | Standard                                              | Status    |
| ---------------- | ----------------------------------------------------- | --------- |
| `egm-design`     | `feature-spec-standard.md`                            | completed |
| `egm-structural` | `feature-spec-standard.md` + template `design_doc.md` | completed |
| `egm-style`      | persona only                                          | completed |

## Severity Breakdown

| Reviewer         | Blocker | Major | Nit |
| ---------------- | ------- | ----- | --- |
| `egm-design`     | 1       | 7     | 8   |
| `egm-structural` | 0       | 6     | 9   |
| `egm-style`      | 0       | 10    | 8   |

## Consolidated Themes (deduplicated)

| #   | Theme                                                                                                  | Findings here | Also raised earlier |
| --- | ------------------------------------------------------------------------------------------------------ | ------------- | ------------------- |
| 1   | No alternatives for the export-toggle removal (Blocker)                                                | D1            | —                   |
| 2   | Restore marker: two contradicting lifecycles, misses the Dexie write, uncaught errors count as crashes | S4, T1, D3    | R2-Z3, Stage 6 #1   |
| 3   | Restore crash reaches telemetry only; the user is not told                                             | S10, T13, D4  | R2-C2, Stage 6 #16  |
| 4   | Threshold measured on version-1 files, applied to version-2 files                                      | D5            | R2-C1, Stage 6 #5   |
| 5   | "Gzip does not help photos" is wrong (about 0.89 → 0.67 MB per photo)                                  | S1, D9        | R2-C1               |
| 6   | Out-of-memory failures appear as "wrong passphrase" or as an unhandled rejection                       | D2            | —                   |
| 7   | Old browsers lose backup entirely; the "update" advice cannot always be followed                       | D8            | R2-C3               |
| 8   | No Risks & Mitigations section; Known limitations lack mitigations                                     | T4, D7        | —                   |
| 9   | Legibility floor and ladder defined only in the implementation plan                                    | S8, T2, D12   | Stage 6 #7          |
| 10  | Alternative C cites "learning", which Goals do not list                                                | S7, T3, D16   | R2-Z1               |
| 11  | Rotation risk "closed" but the floor is not enforced                                                   | S6, D11       | Stage 6 #14         |
| 12  | Newer-version message's update advice                                                                  | S5, D15       | Stage 6 #12         |
| 13  | Security section assumptions (CSV import text; PostHog now sees `bytes`)                               | S9, D10       | —                   |
| 14  | Resources not under version control; every `EGM.md` is gitignored                                      | T5, D16       | R2-Z8               |
| 15  | CUJs miss Drive backup, the old-browser message and crash reporting                                    | T6            | —                   |
| 16  | "Rejected by author" wording                                                                           | D6            | —                   |
| 17  | Drive 5 MB test tied to PR 3, but the risk exists today                                                | D14           | Stage 6 #6          |
| 18  | Decoding a 48 MP photo can run out of memory and is reported as damage                                 | D13           | —                   |

**Fact checks by the drafting session.**

- **Theme 14 is confirmed, and the cause is an uncommitted local change.**
  `.gitignore` has two new lines, `EGM.md` and `*_DRIFT_REPORT.md`, that are
  not committed. `git ls-files` lists no `EGM.md` file, and
  `git check-ignore` matches both `EGM.md` and `src/lib/EGM.md`. The design
  plans edits to eight `EGM.md` files "in the same PR", and those edits
  would never reach a PR.
- **Theme 12:** the app's own update-stall toast already says "Close and
  reopen the app to update." (`useReloadPromptState.ts:51`). A waiting
  service worker takes over once every tab of the app is closed, so the
  advice works when the update has already downloaded. If it has not, the
  user sees the update prompt instead.
- **Theme 16:** the EGM draft skill and its template require the form
  "Rejected by author: <rationale>"
  (`skills/egm-draft/references/design_doc.md:100`). The standard forbids
  attributing a rejection to a _maintainer_ without a link.

## Style Findings

### S1. Contradictory claim about gzip and photos - Severity: Major

- **Reviewer Lens:** `egm-style`
- **Affected Scope:** The Problem (39–40, 59–60); Alternative G (453).
- **Discrepancy Description:** "Gzip does not help photos" contradicts the document's own numbers. A 0.5 MB photo costs about 0.9 MB in version 1 and about 0.67 MB in version 2. Line 453's "about 11 photos" uses the version-1 cost; under version 2 it is about 14.
- **Rationale & Recommendation:** Say what gzip does: it removes the inner base64 overhead but cannot shrink the JPEG bytes. Restate per-photo cost and photo count for each version, and the assumption behind "about 11 photos".

### S2. "No backup is refused at restore" is broader than the design - Severity: Major

- **Reviewer Lens:** `egm-style`
- **Affected Scope:** Overview (18); Goals (78–81).
- **Discrepancy Description:** The design does refuse unknown versions, version-2 files on browsers without `DecompressionStream`, and encrypted CSV exports. Only size refusal goes. Line 80–81 repeats the heading.
- **Rationale & Recommendation:** "No backup is refused for size." Delete the repeat.

### S3. Two different definitions of the threshold device - Severity: Major

- **Reviewer Lens:** `egm-style`
- **Affected Scope:** 70; 82–83; 383.
- **Discrepancy Description:** "Oldest supported phone" versus "the oldest phone the owner uses". They decide who runs the test and which device counts.
- **Rationale & Recommendation:** Use one term; if it is the owner's phone, name the model in the Verification Plan.

### S4. Restore marker lifetime contradicts itself - Severity: Major

- **Reviewer Lens:** `egm-style`
- **Affected Scope:** Section 2 diagram (222, 234); section 4 (274–275).
- **Discrepancy Description:** Section 4 describes two short windows (read; typed-passphrase decrypt). The diagram keeps the marker set from the read until the flow ends, including while the user types. The crash counts differ when a user closes the tab at the prompt.
- **Rationale & Recommendation:** Make the diagram and section 4 agree.

### S5. Wrong update instruction in the newer-version message - Severity: Major

- **Reviewer Lens:** `egm-style`
- **Affected Scope:** CUJ 3 (175–176).
- **Discrepancy Description:** The service worker is prompt-based and "never updates automatically" (root `EGM.md:13`, `:78`), so reopening the app does not update it.
- **Rationale & Recommendation:** Point to the real update path, for example "accept the update prompt".

### S6. Rotation risk is called "closed", but the floor is not enforced - Severity: Major

- **Reviewer Lens:** `egm-style`
- **Affected Scope:** Alternative D (422–424); section 5 (297–300); section 10 (352–354).
- **Discrepancy Description:** Alternative D says the floor closes the rotation risk; section 10 says nothing blocks older browsers and photos may be sideways before Chrome 112.
- **Rationale & Recommendation:** "Accepted for Chrome below 112, the documented floor." Say where "floor" first appears that it is not enforced.

### S7. Rejection rationale cites a goal the Goals section does not list - Severity: Major

- **Reviewer Lens:** `egm-style`
- **Affected Scope:** Alternative C (411–413).
- **Discrepancy Description:** "Learning is a stated goal" — Goals has no such goal.
- **Rationale & Recommendation:** Add the goal or delete the phrase.

### S8. "Legibility floor" is never defined in the spec part - Severity: Major

- **Reviewer Lens:** `egm-style`
- **Affected Scope:** 96, 188, 290, 466.
- **Discrepancy Description:** Used as an acceptance condition three times, defined only at line 692 in the implementation plan. "Encoded up to three times" (466) depends on the ladder, also stated only at 691.
- **Rationale & Recommendation:** Define the ladder and the 1200 px floor (with its 150 ppi reason) once in section 5.

### S9. Absolute security claim ignores imported third-party text - Severity: Major

- **Reviewer Lens:** `egm-style`
- **Affected Scope:** Section 9 (340–341); Non-Functional Requirements (462).
- **Discrepancy Description:** "No outsider can write into the user's data" ignores CSV import, which brings in third-party text such as bank or merchant descriptions. "Leaks nothing useful" is subjective.
- **Rationale & Recommendation:** State the real conditions: an attacker needs to inject chosen text and see many backup sizes; Google sees one size per backup; imports are user-initiated.

### S10. "Restore crashes are visible" claims more than the design delivers - Severity: Major

- **Reviewer Lens:** `egm-style`
- **Affected Scope:** Goals (84–85).
- **Discrepancy Description:** Section 4 only sends telemetry, which does nothing without `VITE_POSTHOG_KEY` (root `EGM.md:75`), and the count includes closed tabs.
- **Rationale & Recommendation:** "A restore that does not finish is reported to telemetry as `import_failed { stage: "crash" }` at the next start (an upper bound)."

### S11. "Proposed solution" repeats the Overview - Severity: Nit

- **Reviewer Lens:** `egm-style`
- **Affected Scope:** 69–74.
- **Discrepancy Description:** Restates the four changes and the Goals; "fails clearly" is vague.
- **Rationale & Recommendation:** Delete or reduce to a cross-reference.

### S12. The refusal-versus-crash argument appears three times - Severity: Nit

- **Reviewer Lens:** `egm-style`
- **Affected Scope:** 42–44, 269–272, 452–453.
- **Discrepancy Description:** Repeated reasoning; "never worse for the user's data" is absolute. The single-transaction premise is confirmed at `ImportData.tsx:92`.
- **Rationale & Recommendation:** Keep it once in section 4, with the specific fact instead of "never worse".

### S13. The "false message" limitation appears three times - Severity: Nit

- **Reviewer Lens:** `egm-style`
- **Affected Scope:** 110–111, 132–133, 379–380.
- **Rationale & Recommendation:** Keep it in Known limitations; refer to it elsewhere.

### S14. Misquoted error text - Severity: Nit

- **Reviewer Lens:** `egm-style`
- **Affected Scope:** 93; 232; 243.
- **Discrepancy Description:** The app says "Decryption failed. The file may be corrupted." (`useEncryptedFileImport.ts:38`), not "file may be damaged". "Could not be unpacked" never reaches the user, because `decryptErrorMessage` maps every non-passphrase error to the "corrupted" toast (`:34-39`).
- **Rationale & Recommendation:** Quote the real string; say which text the user sees and which goes to telemetry.

### S15. MDN data describes the value, not the default - Severity: Nit

- **Reviewer Lens:** `egm-style`
- **Affected Scope:** 298–299; 483–484.
- **Discrepancy Description:** The compatibility entry records when the `from-image` value is supported. The MDN page (`mdn-createImageBitmap.html:1684`) is what calls it the default.
- **Rationale & Recommendation:** Attribute the versions to the data and "default" to the page.

### S16. Browser floor versions for `CompressionStream` have no source - Severity: Nit

- **Reviewer Lens:** `egm-style`
- **Affected Scope:** Section 10 table (348–350).
- **Rationale & Recommendation:** Cite a source, as for `createImageBitmap`.

### S17. Unmeasured performance claim - Severity: Nit

- **Reviewer Lens:** `egm-style`
- **Affected Scope:** Non-Functional Requirements (465–466).
- **Discrepancy Description:** "The key derivation dominates both" is not measured.
- **Rationale & Recommendation:** Measure it or mark it as an expectation.

### S18. Vague or subjective wording - Severity: Nit

- **Reviewer Lens:** `egm-style`
- **Affected Scope:** 41–42 ("taking the rows with the optional photos"); 59 ("headroom for rows"); 66–67 ("confuse which file is the backup"); 73, 90, 92 ("clearly", "clear message"); 100 ("Safe rollback"); 319 ("it stays accurate"); 355 (`ponytail:` jargon); 369 ("removes the data-loss risk"); 407 ("any limit"); 408 ("far less"); 440–441 ("rows over photos"); 450 ("the tab never crashes"); 503 ("near 5 MB").
- **Rationale & Recommendation:** Replace each with the concrete figure or subject, or delete it.

## Structural Findings

The reviewer confirmed: every template section is present, in order, with the
template's heading nesting; every alternative has Pros, Cons and a Reason; every
CUJ uses Given/When/Then; every code fence is closed.

### T1. Restore marker lifecycle described two different ways - Severity: Major

- **Reviewer Lens:** `egm-structural`
- **Affected Scope:** Section 2 (222, 234) versus section 4 (273–280).
- **Discrepancy Description:** Same as S4. Two contradicting contracts for one piece of state.
- **Rationale & Recommendation:** Pick one lifecycle. If per-step, draw the set/clear points beside the `decryptData` branch.

### T2. "Legibility floor" and the photo ladder are never defined in the specification - Severity: Major

- **Reviewer Lens:** `egm-structural`
- **Affected Scope:** Goals (95–97); CUJ 5 (188); section 5 (289–294); Non-Functional Requirements (466–467).
- **Discrepancy Description:** Same as S8. Nothing in the spec points to file 14, where the values live.
- **Rationale & Recommendation:** State the floor and the three steps in section 5, or cross-reference file 14.

### T3. Alternative C is rejected for a goal the document never states - Severity: Major

- **Reviewer Lens:** `egm-structural`
- **Affected Scope:** Alternative C (411–413).
- **Discrepancy Description:** Same as S7. "Learning" is also not a technical or scope trade-off, which the Alternatives Rule requires (`feature-spec-standard.md:15-21`).
- **Rationale & Recommendation:** Add the goal, or rest the rejection on the measured trade-offs (270 MB vs 55 MB a year; format change cheapest now).

### T4. Risks are split up, and Known limitations has no mitigations and sits outside the numbering - Severity: Major

- **Reviewer Lens:** `egm-structural`
- **Affected Scope:** Known limitations (377–384); risk material in Open Questions, sections 9–10, Non-Functional Requirements.
- **Discrepancy Description:** An unnumbered H3 after sections 1–11. Item 3 has no mitigation; item 1's mitigation sits in Non-Goals.
- **Rationale & Recommendation:** Number it (section 12) or move it under Non-Functional Requirements, and pair each limitation with a mitigation or "accepted" (`feature-spec-standard.md:25-27`).

### T5. Additional Resources points to files that are not under version control - Severity: Major

- **Reviewer Lens:** `egm-structural`
- **Affected Scope:** Additional Resources (474–477).
- **Discrepancy Description:** `concepts_brief.md` is untracked. Every `EGM.md` contract doc is gitignored (`.gitignore:56`, confirmed with `git check-ignore`), so a fresh clone lacks them. Root `EGM.md`, which file 29 edits, is missing from the list. Code-span paths and Markdown links are mixed.
- **Rationale & Recommendation:** Commit them or mark them local-only; add root `EGM.md`; use one link style.

### T6. CUJs do not cover all Goals or the Drive path - Severity: Major

- **Reviewer Lens:** `egm-structural`
- **Affected Scope:** CUJs (150–198) versus Goals (76–101).
- **Discrepancy Description:** No CUJ for Drive upload (including over 5 MB), the old-browser message, or restore crash reporting.
- **Rationale & Recommendation:** Add CUJs for Drive backup and the old-browser message, or say which Goals are verified only by tests.

### T7. Read-path diagram notation is inconsistent - Severity: Nit

- **Reviewer Lens:** `egm-structural`
- **Affected Scope:** Section 2 diagram (219–235) and bullet (240–246).
- **Discrepancy Description:** Line 234 floats outside the tree. Branch labels mix thrown text and toast text; the thrown text is "Wrong passphrase — decryption failed" (`backup.ts:170`).
- **Rationale & Recommendation:** Attach line 234 to the tree; label branches consistently.

### T8. Browser table rows are not parallel; "default" is misattributed - Severity: Nit

- **Reviewer Lens:** `egm-structural`
- **Affected Scope:** Section 10 table (346–350); section 5 (297–299); 483.
- **Discrepancy Description:** Column order differs between rows. Same attribution issue as S15. The key is partial; the full key is `api.createImageBitmap.options_imageOrientation_parameter.from-image`.
- **Rationale & Recommendation:** Parallel rows; attribute correctly; full key.

### T9. Reason for Rejection wording does not follow one pattern - Severity: Nit

- **Reviewer Lens:** `egm-structural`
- **Affected Scope:** Alternatives D, E, F, G.
- **Discrepancy Description:** A–C use "Rejected by author: <reason>". D and G use "in favour of"; E gives no reason for its rejected sub-options; F is "Deferred".
- **Rationale & Recommendation:** One "Rejected/Deferred by author: <rationale>" form; give E's reasons inline.

### T10. The four changes are listed in a different order in each section - Severity: Nit

- **Reviewer Lens:** `egm-structural`
- **Affected Scope:** Overview, The Problem, Technical Plan, section 11.
- **Rationale & Recommendation:** Use one order, ideally PR order.

### T11. PR numbers and the Verification Plan are referenced before they are introduced - Severity: Nit

- **Reviewer Lens:** `egm-structural`
- **Affected Scope:** Goals (83); Open Questions (142, 147–148).
- **Rationale & Recommendation:** Add "(Technical Plan, section 11)" at the first PR reference.

### T12. Constants and keys are not described consistently - Severity: Nit

- **Reviewer Lens:** `egm-structural`
- **Affected Scope:** Sections 2, 4, 5.
- **Discrepancy Description:** Only `MAX_RESTORE_FILE_BYTES` gets a location. `MAX_ATTACHMENT_BYTES`, `KNOWN_BACKUP_VERSIONS` and the marker's `localStorage` key get no definition in the spec.
- **Rationale & Recommendation:** One line each: name, value, file.

### T13. Goal heading promises more than the mechanism delivers - Severity: Nit

- **Reviewer Lens:** `egm-structural`
- **Affected Scope:** Goals (84–85).
- **Discrepancy Description:** Same as S10.
- **Rationale & Recommendation:** "Restore crashes are counted in telemetry."

### T14. Code-block lines are much wider than the prose - Severity: Nit

- **Reviewer Lens:** `egm-structural`
- **Affected Scope:** 254–255, 290, 361.
- **Rationale & Recommendation:** Wrap to about 80 columns.

### T15. One Future Improvements bullet breaks the pattern - Severity: Nit

- **Reviewer Lens:** `egm-structural`
- **Affected Scope:** 497–499. (Heading levels for Additional Resources and Future Improvements follow the template and are not a deviation.)
- **Rationale & Recommendation:** Give the bullet a bold lead-in or make it a closing sentence.

## Design Critic Findings

### D1. No alternatives for removing the export encryption toggle - Severity: Blocker

- **Reviewer Lens:** `egm-design`
- **Affected Scope:** Overview change 4 (28–29); The Problem (62–67); section 6 (308–314); Alternatives (386–455).
- **Discrepancy Description:** Removing the toggle takes away a feature users can see today (`useExportAction.ts:23-29`), and no alternative covers it. At least two designs would work: keep encrypted export for JSON only and have it call `markBackupCompleted`, or route encrypted export through `createEncryptedBackupFile` so it becomes a real backup.
- **Rationale & Recommendation:** The Alternatives Rule fails a spec that proposes a single path. Add an alternative covering both, with concrete trade-offs: code paths kept, reliance on encrypted CSV, how the reminder treats the file.

### D2. "Succeeds or crashes" is false: running out of memory also surfaces as wrongly worded errors - Severity: Major

- **Reviewer Lens:** `egm-design`
- **Affected Scope:** The Problem (42–44); section 2 (231); section 4 (269–272); Goal (94).
- **Discrepancy Description:** Large allocations can throw (`RangeError`, `NotReadableError`, a WebCrypto `OperationError`):
  - The decrypt `try` turns any failure into "Wrong passphrase — decryption failed" (`backup.ts:166-171`), so a user who typed the right passphrase is told "Wrong passphrase — try again".
  - `decryptWithStoredPassphrase` swallows the failure as `null` (`backup.ts:186-190`) and sends the user to the prompt.
  - `file.text()` (`useEncryptedFileImport.ts:13`) has no `try` in `performFileSelect` (`:57-82`), so a read failure becomes an unhandled rejection with no message.
- **Rationale & Recommendation:** List this third outcome. Wrap file selection in a `try`. When the file is over `MAX_RESTORE_FILE_BYTES`, have the manual-decrypt error say the file may be too large for this device instead of "wrong passphrase".

### D3. The crash marker's set and clear points contradict each other and miss the write - Severity: Major

- **Reviewer Lens:** `egm-design`
- **Affected Scope:** Section 2 diagram (222, 234) versus section 4 (273–280).
- **Discrepancy Description:** The diagram holds the marker through the passphrase prompt. Section 4 is unclear about the automatic decrypt, the step with the most memory. Neither covers the Dexie write after the preview is confirmed (`ImportData.tsx:92`, `expenseTrackerDb.ts:359-387`), where memory likely peaks. An uncaught rejection (D2) would never clear the marker and would count as a crash.
- **Rationale & Recommendation:** One scope: set on file pick; clear on Cancel, on an error, or when the Dexie transaction settles; not held during the passphrase prompt. Diagram and section 4 must match.

### D4. Restore crashes are visible only through telemetry; the user is not told - Severity: Major

- **Reviewer Lens:** `egm-design`
- **Affected Scope:** Goals (84–85); section 4 (276–280).
- **Discrepancy Description:** Telemetry is off without `VITE_POSTHOG_KEY` (root `EGM.md:75`) and can be blocked. The user gets no explanation and will likely retry into the same crash. The install marker cited as "the same pattern" opens a dialog (`App.tsx:56-57`, `DataLossDialog`).
- **Rationale & Recommendation:** Show a one-time toast at startup when the marker is found, for example "Your last restore did not finish; the file may be too large for this device. Try a computer."

### D5. The threshold is measured on version 1, but memory depends on decompressed size - Severity: Major

- **Reviewer Lens:** `egm-design`
- **Affected Scope:** Goals (82–83); Open Questions (144–148); section 11 (361); Non-Goals (123).
- **Discrepancy Description:** A version-1 file of X bytes holds about 0.75X of plaintext. A version-2 file holds about X (photo-heavy) to about 7X (row-heavy), and gunzip keeps both buffers alive. After PR 3 the threshold is about 1.3× to 9× too generous.
- **Rationale & Recommendation:** Re-measure with a realistic photo-heavy version-2 file before PR 3b ships, or state the margin applied. Record the test file's composition next to the value.

### D6. Rejections are credited to the author with no link - Severity: Major

- **Reviewer Lens:** `egm-design`
- **Affected Scope:** Alternatives A–G reason lines.
- **Discrepancy Description:** Every rejection reads "Rejected/Deferred by author". In Alternative E, the reason line for per-photo and paired files is only that credit.
- **Rationale & Recommendation:** Remove "by author" and state each reason in the reason line. For E: partial upload failures, a multi-file picker, mismatched pairs, size and timing leaks.

### D7. No Risks & Mitigations section - Severity: Major

- **Reviewer Lens:** `egm-design`
- **Affected Scope:** Known limitations (377–384); Non-Functional Requirements (459–468).
- **Discrepancy Description:** Risks are scattered, and Known limitations has no mitigations. Unlisted risks:
  - out-of-memory errors (D2);
  - false crash counts from several open tabs, since a second tab opening during a restore reads the marker;
  - backup sizes now sent to PostHog;
  - out of memory while decoding a full-resolution photo;
  - Drive storage growth.
- **Rationale & Recommendation:** Add a table: risk → likelihood → mitigation or accepted-by-whom → trigger to revisit.

### D8. Backup stops working on browsers below the floor, and the update advice cannot always be followed - Severity: Major

- **Reviewer Lens:** `egm-design`
- **Affected Scope:** Non-Goals (122); section 10 (344–356); Goal (92–93).
- **Discrepancy Description:** After PR 3b, a browser without `CompressionStream` (Safari before 16.4, Firefox before 113) cannot back up at all. Devices stuck on iOS 15 (iPhone 6s/7 and others) cannot reach Safari 16.4. No figure is given for how many users this affects. A small JS gzip library (for example `fflate`) is never evaluated; none is installed.
- **Rationale & Recommendation:** State the share of users affected and accept the loss explicitly, or evaluate a JS gzip fallback, or make the backup error not promise that updating fixes it.

### D9. The photo arithmetic under gzip understates the gain - Severity: Nit

- **Reviewer Lens:** `egm-design`
- **Affected Scope:** The Problem (38–40, 59–60); Alternative G (453).
- **Discrepancy Description:** Version 1 costs about 1.78× the photo (0.89 MB); version 2 about 1.33× (0.67 MB), about 25% less. "About 11 photos" becomes about 15.
- **Rationale & Recommendation:** Restate both numbers per version; the revisit triggers depend on them.

### D10. The security section's assumptions contradict the design - Severity: Nit

- **Reviewer Lens:** `egm-design`
- **Affected Scope:** Section 9 (338–342); NFR Security (461–463); section 8 (331).
- **Discrepancy Description:** `backup_succeeded` now sends `bytes` to PostHog, so a second party sees each backup's size. CSV import brings in text others partly control (payment notes, merchant names).
- **Rationale & Recommendation:** The conclusion probably holds (one observation per day, no adaptation). Fix the assumptions; consider rounding `bytes` to 100 KB buckets.

### D11. Alternative D's rationale contradicts section 10 - Severity: Nit

- **Reviewer Lens:** `egm-design`
- **Affected Scope:** Alternative D (422–424) versus section 10 (352–354).
- **Discrepancy Description:** The risk is accepted, not closed. Android 6 devices are stuck below Chrome 112. The cited compatibility values match `mdn-bcd-createImageBitmap.json:124-140`.
- **Rationale & Recommendation:** "Accepted for Chrome below 112."

### D12. The legibility floor and photo cap are not defined in the spec - Severity: Nit

- **Reviewer Lens:** `egm-design`
- **Affected Scope:** Overview (25–26); Goals (95–97); CUJ 5 (188); section 5 (290).
- **Discrepancy Description:** Only the plan gives the floor. "0.5 MB" also differs from the plan's `512 * 1024`.
- **Rationale & Recommendation:** State the floor, the three steps, and "0.5 MB = 512 KiB, measured on the JPEG blob" in section 5.

### D13. Running out of memory while decoding a full-resolution photo is reported as damage - Severity: Nit

- **Reviewer Lens:** `egm-design`
- **Affected Scope:** Section 5 (289, 297–300); CUJ 4 (181).
- **Discrepancy Description:** `createImageBitmap(file)` decodes at full resolution: about 48 MB for 12 MP, about 190 MB for 48 MP. On older phones it can reject, and the pipeline reports `unreadable`.
- **Rationale & Recommendation:** Add a 48 MP case to the oldest-phone check, or list it as a risk. A valid but large file should not be described as damaged.

### D14. The Drive 5 MB upload test is tied to the wrong PR - Severity: Nit

- **Reviewer Lens:** `egm-design`
- **Affected Scope:** Open Questions (140–143); section 7 (322).
- **Discrepancy Description:** Every upload is already multipart (`driveApi.ts:136,141`), and version-1 files with about 6 photos already exceed 5 MB. PR 1 makes large backups more likely to be relied on.
- **Rationale & Recommendation:** Run the manual test before PR 1, or check existing `backup_failed { target: "drive" }` telemetry first.

### D15. The newer-version message's update advice does not match how the app updates - Severity: Nit

- **Reviewer Lens:** `egm-design`
- **Affected Scope:** CUJ 3 (175–176).
- **Discrepancy Description:** The service worker is `registerType: 'prompt'`, so reopening shows the reload prompt and the user must accept it.
- **Rationale & Recommendation:** "Reopen the app and accept the update prompt."

### D16. Small consistency gaps - Severity: Nit

- **Reviewer Lens:** `egm-design`
- **Affected Scope:** 412; 474; 465–467.
- **Discrepancy Description:** Alternative C cites "learning", which Goals omit. `concepts_brief.md` may not exist for a reader. "The key derivation dominates" is unmeasured; for multi-MB photo files, `b64uDecode`'s per-byte callback (`backup.ts:45`) and the gzip pass may take as long as PBKDF2.
- **Rationale & Recommendation:** Add the goal or drop it; make the reference self-contained; call the performance claim an estimate or time it.
