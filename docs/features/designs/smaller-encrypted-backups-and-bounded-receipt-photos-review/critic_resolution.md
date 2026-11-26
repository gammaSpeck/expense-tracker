# Goldfish Annotated Review Report: Stage 7 Resolution

**Status: resolved** (2026-11-26). The author chose to keep the docs local
(E1), accepted the suggested option for item 7 (version-1 fallback), and
accepted all other proposals except item 6, which was changed by
instruction (below). Contested: 1 (item 17; Alternative E's reason was fixed).
Declined: part of T10 (the Technical Plan keeps its order). The design is now
1,125 lines; the FeatureRange ends at line 646.

**Item 6 as changed by the author:** "Wrong passphrase" appears only when the
passphrase is wrong, and a file too large for the device gets its own message,
with no combined wording. A failed AES-GCM decrypt cannot tell a wrong key from
a memory failure, so the design adds a passphrase check to every file written
from 1.10.0 on. The new optional wrapper field `check` holds a 12-byte IV
followed by AES-GCM of `"extrack"`. Decrypting it is cheap, so a failure there
means the passphrase is wrong, with certainty. After the check passes, a failed
decrypt reads "could not be decrypted", which becomes the too-large message
above the threshold and the corrupted-file message below it.
`decryptWithStoredPassphrase` returns `null` only for a wrong passphrase.
Files written before 1.10.0 have no `check` and keep today's behaviour. This
residual risk is listed in section 12.

**Target:** `docs/features/designs/smaller-encrypted-backups-and-bounded-receipt-photos.md` (FeatureRange, lines 1-509; fixes that change a contract also update the matching Detailed Implementation entries so the two parts agree)

**Source findings:** `critic_report.md` (D1–D16 `egm-design`, T1–T15 `egm-structural`, S1–S18 `egm-style`). Items 2–5 also close open findings from Stage 5 Round 2 and Stage 6, listed per item. The Stage 5 resolution report was renamed `zoom_out_resolution.md`.

**Verified by the drafting session before classifying:**

- `.gitignore` has two new uncommitted lines, `EGM.md` and `*_DRIFT_REPORT.md`.
  No `EGM.md` is tracked (`git ls-files`), and `git check-ignore` matches
  both the root and `src/lib/EGM.md`.
- The app's update-stall toast says "Update failed. Close and reopen the app
  to update." (`useReloadPromptState.ts:51`). The service worker is
  `registerType: 'prompt'` (root `EGM.md:13`). The prompt says "New version
  available!" (`ReloadPrompt.tsx:38`).
- MDN browser-compat-data gives `CompressionStream` and `DecompressionStream`
  as Chrome 80, Firefox 113, Safari 16.4 (`api/CompressionStream.json`,
  `api/DecompressionStream.json`).
- The EGM template requires the form "Rejected by author: technical
  rationale" (`skills/egm-draft/references/design_doc.md:100`).
- Per-photo cost: version 1 is base64(base64(JPEG)), about 1.78×, so 0.89 MB
  for a 0.5 MB photo. Version 2 is base64(gzip(base64(JPEG))), about 1.33×,
  so 0.67 MB. With about 1 MB of rows (version 1) or 0.15 MB (version 2), a
  10 MB file holds about 11 or about 15 photos.

## Escalated (needs your knowledge)

### E1. Every `EGM.md` contract doc is gitignored, and the brief is uncommitted [T5, D16; Stage 5 R2-Z8; Stage 6 #3] - Severity: Major

- **Affected Scope:** Additional Resources (472–484); Detailed Implementation intro and files 22–29.
- **Discrepancy Description:** The design lists `EGM.md` files and `concepts_brief.md` as resources and plans edits to eight `EGM.md` files "in the same PR as the code". A fresh clone has none of them, so those edits cannot reach a PR. Root `EGM.md` is also missing from the list.
- _**AI Suggestion:**_ ESCALATE
- _**Justification:**_ The ignore lines are your uncommitted local change. No reviewer could know whether the `EGM.md` files are meant to be shared or to stay local working files. This decides what the plan does with eight file entries.
- _**Options:**_
  - **Keep them local (match your `.gitignore`).** Contract docs are updated locally after each PR merges and are not part of any PR. Files 22–29 move to a "Local docs (not committed)" list. Additional Resources marks them local-only. Remove the `concepts_brief.md` reference and state the brief's decisions in the design, which it already does.
  - **Commit them.** Remove the `EGM.md` line from `.gitignore` in PR 1 and commit the docs. Files 22–29 stay as written. Move the brief to `docs/features/designs/smaller-encrypted-backups-and-bounded-receipt-photos-brief.md` and link it.
- _**Also applied either way:**_ add root `EGM.md` to the list, and define "contract doc" in one line where it first appears: "a per-directory `EGM.md` describing interface, invariants, side effects and verification".

## Prioritized Findings & AI Suggestions

### 1. No alternatives for removing the export encryption toggle [D1] - Severity: Blocker

- **Affected Scope:** Overview change 4; The Problem, export paragraph; section 6; Alternatives.
- _**AI Suggestion:**_ PROPOSE FIX
- _**Justification:**_ Valid under the Alternatives Rule. Both alternatives the reviewer names are real and fail for stated reasons.
- _**Proposed Edit:**_
  - Location: new Alternative H.
  - Change: "**Keep encrypted export.** (a) JSON only, and it marks a backup as done: it then makes the same file as Create Backup → Save to device under a different name, so two buttons do one job, and the export dialog keeps its passphrase gate. (b) Route it through `createEncryptedBackupFile`: identical to Create Backup → Save to device. Either keeps an encrypted CSV path only if CSV is kept, and restore cannot read an encrypted CSV. There is no usage data for encrypted export; the owner is the main user. Rejected by author: both keep a second entry point that duplicates Create Backup, and removing the toggle deletes the encrypt branch, the export passphrase gate and `EncryptToggleRow`."

### 2. Restore marker: contradicting lifecycles, misses the write, uncaught errors count as crashes [S4, T1, D3; Stage 5 R2-Z3; Stage 6 #1] - Severity: Major

- _**AI Suggestion:**_ PROPOSE FIX
- _**Justification:**_ Five reviewers across three stages flagged it. The diagram and section 4 disagree, the Dexie write is uncovered, and an error that is never caught would leave the marker set. You accepted the marker in Stage 5. R2-Z3's alternative, dropping it, stays available. Fixing the scope keeps the signal and costs one more set/clear pair.
- _**Proposed Edit:**_
  - Location: section 2 diagram, section 4, files 4 and 5, new entry for `src/components/more/ImportData.tsx`.
  - Change: one rule, "the marker is set only while the app is doing memory-heavy restore work, never while it waits for the user". Three windows:
    1.  From before `file.text()` until `performFileSelect` ends, covering the read, the automatic decrypt and the preview build. It ends in a `finally`.
    2.  The typed-passphrase decrypt, in `performManualDecrypt`'s `finally`.
    3.  The Dexie write, in `performImport`'s `finally` in `ImportData.tsx`.

    It is not held while the passphrase prompt or the preview waits. Because the windows end in `finally` blocks, an error (item 6) clears the marker. Risks table: a second app tab opened during a restore reads the marker and reports a false crash. This is accepted as rare and counted as an upper bound.

### 3. Restore crash reaches telemetry only; the user is not told [S10, T13, D4; Stage 5 R2-C2; Stage 6 #16] - Severity: Major

- _**AI Suggestion:**_ PROPOSE FIX
- _**Justification:**_ Valid. Telemetry is off without `VITE_POSTHOG_KEY`, and the install marker cited as precedent does show the user a dialog. A toast is one line beside the existing `capture`.
- _**Proposed Edit:**_
  - Location: Goals; section 4; file 6; new CUJ 9.
  - Change: Goal becomes "An unfinished restore is reported: the user sees a message at the next start, and a telemetry event is sent (an upper bound, since closing the tab also counts)". At startup, when `takeInterruptedRestore()` returns a size: `toast.warning("Your last restore didn't finish. The file may be too large for this device's memory. Try restoring it on a computer.")` and `capture("import_failed", { stage: "crash", bytes })`.

### 4. Threshold measured on version-1 files, applied to version-2 files; the measurement blocks PR 1 [D5; Stage 5 R2-C1, R2-Z2; Stage 6 #5] - Severity: Major

- _**AI Suggestion:**_ PROPOSE FIX
- _**Justification:**_ Valid. Memory per file byte is about 0.75 for version 1 and about 1.0 for a photo-heavy version-2 file. A row-heavy version-2 file reaches 10 MB only at around 65,000 rows, far beyond any user (the owner has about 2,000), so the threshold in practice governs photo-heavy files. PR 1 ships the urgent fix and should not wait.
- _**Proposed Edit:**_
  - Location: Goals; Open Questions; section 4; section 11; Verification Plan; file 1.
  - Change: PR 1 ships with `MAX_RESTORE_FILE_BYTES` at today's 10 MB and no pre-merge gate. The phone test moves to the PR 3b preview and uses photo-heavy version-2 backups of about 10, 20, 30 and 40 MB. The constant becomes the largest size that restored, rounded down to a whole MB: 40 MB if all restore, or 10 MB with the failure recorded if none do. The constant's comment records the phone model, the format and the file composition. Version-1 files need less memory per byte, so the same threshold is conservative for them.

### 5. "Gzip does not help photos" is wrong [S1, D9; Stage 5 R2-C1] - Severity: Major

- _**AI Suggestion:**_ PROPOSE FIX
- _**Justification:**_ Arithmetic verified above. The error came from the brief.
- _**Proposed Edit:**_ The Problem: "Gzip removes the inner base64 overhead but cannot shrink the JPEG bytes: a 0.5 MB photo costs about 0.89 MB in version 1 and about 0.67 MB in version 2, about 25% less. A 10 MB file holds about 11 photos in version 1 and about 15 in version 2." Alternative G uses both figures.

### 6. Running out of memory surfaces as "wrong passphrase" or an uncaught error [D2] - Severity: Major

- _**AI Suggestion:**_ PROPOSE FIX
- _**Justification:**_ Valid and new. `performFileSelect` has no `catch` around `file.text()`, and the decrypt `try` turns any failure, including an allocation failure, into "wrong passphrase". A soft threshold makes oversized restores possible, so this path must say something true.
- _**Proposed Edit:**_
  - Location: The Problem; section 2; section 4; file 4.
  - Change: State a third outcome: an allocation failure thrown as an error.
    - `performFileSelect` gains a `catch`: `captureError("import_failed", err, { stage: "read" })`, toast "Couldn't read this file. It may be too large for this device's memory. Try restoring it on a computer.", and the file input is reset.
    - `decryptErrorMessage` takes whether the pending file is over `MAX_RESTORE_FILE_BYTES`. When it is, a wrong-passphrase failure shows "Wrong passphrase, or this file is too large for this device's memory. Check the passphrase, or restore on a computer.", and any other failure shows the too-large message.
    - Files under the threshold keep today's messages.

### 7. Old browsers lose backup entirely; the "update" advice cannot always be followed [D8; Stage 5 R2-C3] - Severity: Major

- _**AI Suggestion:**_ PROPOSE FIX (author decision; reverses brainstorm decision 11, "no fallback")
- _**Justification:**_ Two reviewers in two stages. Devices stuck on iOS 15 cannot reach Safari 16.4, and backup is the only safety net for data that lives in the browser. The version-1 reader is permanent anyway, so the fallback is one branch. It replaces the planned old-browser backup error and its test with a branch and its test, at the same cost. A JS gzip library (`fflate`) would add a dependency to keep the smaller format on old browsers. That is not worth it, because the fallback already keeps backups working.
- _**Proposed Edit (suggested: version-1 fallback):**_
  - Location: Non-Goals; Goals; section 3; section 10; files 2, 20; release note 3b.
  - Change: When `CompressionStream` is undefined, `encryptData` skips gzip and writes `version: "1"`. A `ponytail:` comment says: kept for browsers below the supported minimum; remove when backups from such browsers stop appearing. Delete the old-browser backup error. The e2e test becomes: with `CompressionStream` deleted, Create Backup downloads a file whose `version` is `"1"`. The restore-side message becomes "This backup needs a newer browser (Chrome 80, Firefox 113 or Safari 16.4 or later). Restore it on another device." Add an Alternative for `fflate`, rejected for the dependency.
- _**Alternative (accept the loss):**_ Keep "no fallback", state that devices below Safari 16.4 / Firefox 113 cannot back up after this release, and use the "needs a newer browser … another device" wording for the backup error too.

### 8. No Risks & Mitigations section [T4, D7] - Severity: Major

- _**AI Suggestion:**_ PROPOSE FIX
- _**Proposed Edit:**_ Replace "Known limitations" with "### 12. Risks and mitigations", a table with columns Risk, Likelihood, Mitigation or "Accepted", and Revisit trigger. Rows:
  - old app versions show a false message (mitigation: the release note);
  - all-or-nothing damage (accepted; older dated backups remain);
  - the threshold rests on one phone (accepted; the crash signal);
  - the crash count over-counts closed tabs and a second tab (accepted, upper bound);
  - out-of-memory errors (item 6 messages);
  - backup sizes sent to PostHog (item 13 rounding);
  - out of memory while decoding a 48 MP photo (item 15);
  - Drive storage growth (accepted; trigger);
  - Drive multipart over 5 MB (item 14 test).

### 9. Legibility floor and ladder defined only in the implementation plan [S8, T2, D12; Stage 6 #7] - Severity: Major

- _**AI Suggestion:**_ PROPOSE FIX
- _**Proposed Edit:**_ Section 5 states: the cap is 0.5 MB (`MAX_ATTACHMENT_BYTES = 512 * 1024`, measured on the JPEG blob); the ladder is 1600 px at quality 0.75, then 1600 px at 0.6, then 1200 px at 0.6; and the legibility floor is the last step, a 1200 px long edge, about 150 pixels per inch on a 20 cm receipt. File 14 refers back to section 5.

### 10. Alternative C cites "learning", which the Goals do not list [S7, T3, D16] - Severity: Major

- _**AI Suggestion:**_ PROPOSE FIX
- _**Justification:**_ The Alternatives Rule needs technical or scope reasons, and item 5 supplies a stronger one.
- _**Proposed Edit:**_ The reason rests on measured trade-offs: rows shrink to 150 KB instead of 741 KB; photos shrink about 25% instead of 0%; a daily Drive backup of rows grows about 55 MB a year instead of about 270 MB; and a format change is cheapest while the owner is the main user. Drop "learning".

### 11. Rotation risk is called "closed", but the minimum is not enforced [S6, D11; Stage 6 #14] - Severity: Major

- _**AI Suggestion:**_ PROPOSE FIX
- _**Proposed Edit:**_ Rename "floor" to "supported minimum" and say once, in section 10, that it is documented, not enforced. Alternative D: "accepted for Chrome below 112". Avoid "legibility floor" clashing: that term stays only for the photo ladder.

### 12. The newer-version message's update advice [S5, D15; Stage 6 #12] - Severity: Major (S5) / Nit (D15)

- _**AI Suggestion:**_ PROPOSE FIX (partial CONTEST)
- _**Justification:**_ The advice is not wrong. A waiting service worker takes over once every tab of the app is closed, and the app's own stall toast uses the same words (`useReloadPromptState.ts:51`). It is incomplete when the update has not downloaded yet, because the user then sees the "New version available!" prompt.
- _**Proposed Edit:**_ `NEWER_VERSION_MESSAGE` = "This backup was made by a newer version of ExTrack. Close and reopen the app, and accept the update if asked." CUJ 3 matches.

### 13. Security section assumptions [S9, D10] - Severity: Major (S9) / Nit (D10)

- _**AI Suggestion:**_ PROPOSE FIX
- _**Proposed Edit:**_ Section 9 states the conditions instead of absolutes. An attacker would need to place chosen text in the user's data (possible only through text the user imports, such as merchant names in a CSV) and then observe the size of many backups taken after each change. Google sees one size per backup. PostHog sees `bytes` rounded to the nearest 100 KB. There is no adaptive loop. `backup_succeeded.bytes` is sent rounded to 100 KB (file 8).

### 14. Drive 5 MB test is tied to the wrong PR, and its fallback has no plan [D14; Stage 6 #6] - Severity: Nit

- _**AI Suggestion:**_ PROPOSE FIX
- _**Proposed Edit:**_ The manual 6 MB upload runs before PR 1 merges, because the risk exists today and PR 1 makes large backups more likely to be relied on. If it fails, a fix PR lands before PR 1 that switches `uploadFileToDrive` (`src/lib/driveApi.ts`, which builds the multipart request today) to Google's resumable upload: a POST with `uploadType=resumable` and the metadata, then a PUT of the bytes to the returned `Location`. That PR adds its own design entry.

### 15. Decoding a 48 MP photo can run out of memory and is described as damage [D13] - Severity: Nit

- _**AI Suggestion:**_ PROPOSE FIX (text and manual check); DECLINE code changes
- _**Justification:**_ The `unreadable` message already suggests a screenshot, which works for oversized photos, and never says "damaged". Only CUJ 5's wording does.
- _**Proposed Edit:**_ CUJ 5: "a file the browser cannot open" instead of "a damaged file". Add a 48 MP photo to the oldest-phone manual check. Add a risks row.

### 16. CUJs miss Drive backup, the old-browser path and crash reporting [T6] - Severity: Major

- _**AI Suggestion:**_ PROPOSE FIX
- _**Proposed Edit:**_ Add CUJ 7 "Back up to Google Drive" (same-day file replaced; the size warning applies the same way). Add CUJ 8 "Back up and restore on an old browser" (backup still saves, as version 1 under item 7; a version-2 file shows the "needs a newer browser" message). Add CUJ 9 "A restore did not finish" (the startup message from item 3).

### 17. "Rejected by author" wording [D6] - Severity: Major

- _**AI Suggestion:**_ CONTEST, with PROPOSE FIX for Alternative E's missing reason (T9)
- _**Justification:**_ The EGM template requires "Rejected by author: technical rationale" (`skills/egm-draft/references/design_doc.md:100`). The standard bars attributing a rejection to a _maintainer_ without a link (`feature-spec-standard.md:19-21`). The author of this design is not citing an upstream maintainer. The valid part is that Alternative E's rejected sub-options have no reason in the reason line.
- _**Proposed Edit:**_ Every reason line uses "Rejected by author: <reason>" or "Deferred by author: <reason>" (T9). Alternative E: "Rejected by author: partial upload failures, a multi-file restore picker, mismatched pairs, and per-file size and timing leaks".

### 18. Release unit and squash merges [carried from Stage 6 #4] - Severity: Major

- _**AI Suggestion:**_ PROPOSE FIX
- _**Justification:**_ The rollback argument only works if PR 3 keeps its two commits. A fresh reader also took "reader first" to mean a separate release.
- _**Proposed Edit:**_ Section 11: all four PRs ship together as release 1.10.0; release-please cuts one release after they merge. PR 3 is merged with a merge commit or rebase, never squashed, so commit (b) can be reverted alone. "Before PR 3 is released" becomes "before release 1.10.0".

### 19. Style and structure Nits [S11–S18, T7–T15]

- _**AI Suggestion:**_ PROPOSE FIX for each, except as noted
- _**Proposed Edit:**_ In the same pass:
  - **S11:** "Proposed solution" shrinks to one sentence pointing at the Overview.
  - **S12, S13:** the refusal-versus-crash argument and the false-message limitation each appear once.
  - **S14:** quote real strings, and say which text reaches the user and which reaches telemetry.
  - **S15, T8:** versions come from the compatibility data and "default" from the MDN page; give the full key; table rows are parallel.
  - **S16:** cite `api/CompressionStream.json`.
  - **S17:** call "dominates" an estimate.
  - **S18:** replace each vague phrase listed.
  - **T7:** fix the diagram (no floating line; branch labels are the user-facing toasts).
  - **T10:** Overview, The Problem and Goals follow PR order (restore, export, format, photos). The Technical Plan keeps format first, because the read and write paths build on it. This part of the Nit is declined.
  - **T11:** cross-reference section 11 at the first PR mention.
  - **T12:** one line each for every new constant and key (name, value, file).
  - **T13:** covered by item 3.
  - **T14:** wrap code lines to about 80 columns.
  - **T15:** bold lead-in for the trigger bullet.
