# Stage 6: Comprehension Test

**Target:** `docs/features/designs/smaller-encrypted-backups-and-bounded-receipt-photos.md`
(FeatureRange lines 1-509, DetailedRange lines 510-968)

**Reviewer:** `egm-comprehension`, Mode: REVIEW, no document standard and no reading
list (it read only the design). **Status:** completed.

**What this proposes**

ExTrack is an expense tracker that keeps all its data in the browser. This design changes it in four ways, delivered as four PRs in release 1.10.0:

1. Restore no longer refuses large backup files. Above `MAX_RESTORE_FILE_BYTES` (a size to be measured on the owner's oldest phone), restore asks the user to confirm and Backup shows a warning. A `localStorage` marker lets the next app start report a restore that crashed the tab.
2. A new backup format, wrapper `version: "2"`, gzips the JSON before AES-GCM encryption. The reader is released before the writer. Unknown versions and browsers without `DecompressionStream` are rejected as soon as the file is picked.
3. A built-in canvas pipeline (`prepareReceiptPhoto`) replaces `browser-image-compression`. It stores receipt photos as JPEG of at most 512 KiB. It tries three size and quality steps, and if none fits it rejects the photo with a named reason, while the expense still saves.
4. Export Data loses its "Encrypt this export" toggle, so encrypted files come only from Backup.

**How the existing system works, per this document**

Backups are `.extrack` files: a JSON wrapper (`format`, `version: "1"`, PBKDF2 and AES-GCM parameters) around base64url AES-GCM ciphertext of indented JSON. They are saved to the device or uploaded to Google Drive by multipart upload. Restore rejects any file over 10 MB before reading it. Backup never checks its own size, and photos are base64-encoded twice (about 0.9 MB per 0.5 MB photo), so about 11 photos make a backup that cannot be restored. A restore tries the stored passphrase and then a typed one, shows a preview, and writes everything in one Dexie transaction. Photos go through `browser-image-compression`, which does not enforce its 0.5 MB target and tries to load a CDN worker that the site's content-security policy blocks. Export can also produce encrypted JSON, which is the same thing as a backup but does not count as one, and encrypted CSV, which restore rejects.

## Paraphrase Check (drafting session)

The paraphrase matches the intended design, with one misreading. "The reader is
released before the writer" is not the plan: the reader and the writer ship in
the same release as two commits, reader first. The design caused this
misreading, and finding 4 names the cause.

## Severity Breakdown

| Blocker | Major | Nit |
| ------- | ----- | --- |
| 0       | 6     | 13  |

Two findings repeat open Stage 5 Round 2 items: finding 1 matches R2-Z3 (the
marker misses the write step), and finding 5 matches R2-C1 (the threshold is
measured on version-1 files).

## Findings

### Major

1. **Severity**: Major
   **Affected Scope**: Goals "Restore crashes are visible" (l.84-85); Technical Plan §2 diagram (l.233-234); §4 restore marker (l.273-280); file 4 (l.589-596)
   **Discrepancy Description & Rationale**: The Problem section explains that a restore which runs out of memory "writes nothing" because it uses one Dexie transaction. That suggests the write is a point where a crash can happen. But the marker is cleared "when the flow ends (preview, error, or Cancel)", which is before the user confirms the preview and the Dexie transaction runs. The goal says every restore crash is reported. A reader cannot tell whether a crash during the write is meant to go unreported, or whether this window was overlooked. The doc should say which restore phases the marker covers and why.

2. **Severity**: Major
   **Affected Scope**: Goals "A gzip failure is not reported as a wrong passphrase" (l.94); §2 bullets (l.240-246); file 4 PR 3a ("`decryptErrorMessage` do not change", l.606)
   **Discrepancy Description & Rationale**: These parts do not connect:
   - `decryptData` throws "Backup decrypted but could not be unpacked".
   - The manual path is said to show only "Wrong passphrase — try again" or "The file may be corrupted".
   - `decryptErrorMessage` is unchanged, and its mapping is never described.
   - On the automatic path, a gunzip failure returns `null`, which seems to drop the user into a typed-passphrase prompt.

   So the doc does not show what message the user actually sees after a gunzip failure, or how the goal is met. Three different wrong-passphrase strings also appear ("Wrong passphrase", "Wrong passphrase — try again", "Wrong passphrase — decryption failed") with no explanation of which layer produces which.

3. **Severity**: Major
   **Affected Scope**: "Contract docs" / "EGM docs" / `[file:symbol]` anchors (l.475-477, l.513-514); files 22-29
   **Discrepancy Description & Rationale**: EGM and the `EGM.md` "contract docs" are project conventions, and the doc never defines them. Files 22-29 tell the implementer to edit their "Interface", "Invariants", "Side Effects" and "Verification" sections and to use `[file:symbol]` anchors. A newcomer does not know what these documents are, what belongs in each section, or why they must change in the same PR as the code. The doc needs a one-line definition or a link to the convention.

4. **Severity**: Major
   **Affected Scope**: §11 Rollout and PR order (l.358-375); Non-Goals "Shipping the reader one release before the writer" (l.130-133); Open Questions (l.140-143); file 17 release notes (l.738-748)
   **Discrepancy Description & Rationale**: The unit of release is unclear, and the rollback argument depends on it:
   - Line 374 says all four PRs ship as "Release 1.10.0".
   - Other passages ("Before PR 3 is released", l.142; "PR 1 comes first because it removes the data-loss risk") suggest each PR ships on its own.
   - "Commit (a) lands before commit (b). A rollback reverts commit (b) only" assumes PR 3 is merged with its two commits kept separate (not squashed). The doc does not say so.
   - Release-note entries carry "the PR's authoring date" yet all share `version: "1.10.0"`.

   A reader cannot work out when users receive each change, or whether reverting commit (b) alone is possible.

5. **Severity**: Major
   **Affected Scope**: Goals "The size threshold is measured" (l.82-83); Verification Plan, manual threshold test (l.951-958); Non-Goals "A separate limit on decompressed size" (l.123-124)
   **Discrepancy Description & Rationale**: The threshold is measured on the PR 1 deploy preview, which still writes version-1 (uncompressed) files. Under version 2, a file of a given size can expand to much more plaintext: the doc says rows compress about 7 times. That means more memory per file byte. The doc does not explain why a threshold measured on version-1 files still holds for version-2 files. The decompressed-size non-goal answers only a security concern, not a memory one. The procedure also does not say what to do if all four test sizes restore (is the value capped at 40 MB?) or if even the 10 MB file fails.

6. **Severity**: Major
   **Affected Scope**: Open Questions "Does Drive multipart upload accept a file over 5 MB?" (l.140-143); Non-Goals resumable upload (l.114-115); §7 (l.322); Verification Plan (l.959-960)
   **Discrepancy Description & Rationale**:
   - **Why PR 3?** The upload test is tied to "before PR 3 is released". But PR 3 makes files smaller, and gzip does not shrink photos, so backups over 5 MB seem possible today. The doc does not explain why PR 3 is the gate.
   - **The fallback has no plan.** "If it fails, switch to resumable upload" names work that is a stated non-goal and has no entry in the 33-file plan. It is unclear whether that would block the release or become a new PR.
   - **Unintroduced name.** The fallback names `uploadFileToDrive`, which is introduced nowhere else. The plan only mentions `uploadBackupToDrive` and `driveApi.ts` (`buildMetadataBlob`, `findExistingFile`).

### Nit

7. **Severity**: Nit
   **Affected Scope**: "legibility floor" (l.96, l.188, l.290)
   **Discrepancy Description & Rationale**: The term is used from the Goals onward but only defined at l.692, in the Detailed plan (1200 px long edge, about 150 ppi on a 20 cm receipt). A short definition at first use would help.

8. **Severity**: Nit
   **Affected Scope**: "the owner" (l.55, l.83, l.412, l.499); "oldest supported phone" (l.70) vs "oldest phone the owner uses" (l.83)
   **Discrepancy Description & Rationale**: The doc never says who "the owner" is. It reads as both the maintainer and the main user, so the size threshold depends on one person's device. The two phrasings also differ: "supported" implies a support policy, while "the owner uses" does not.

9. **Severity**: Nit
   **Affected Scope**: `ponytail:` comment convention (l.355, l.561, l.707)
   **Discrepancy Description & Rationale**: This is a project-specific comment tag and is not defined. A reader cannot tell what it signals (a deliberate simplification with an upgrade path) or whether tooling reads it.

10. **Severity**: Nit
    **Affected Scope**: §4 "the same pattern as the install marker that startup already checks" (l.279-280)
    **Discrepancy Description & Rationale**: The install marker is an existing mechanism the doc points to as precedent but does not describe.

11. **Severity**: Nit
    **Affected Scope**: Known limitations, first bullet (l.379-380)
    **Discrepancy Description & Rationale**: The doc does not explain why older app versions show "This file is an encrypted export, not a restorable backup" for a version-2 file. That needs the old detection logic, which the doc never describes. One clause would make the limitation understandable.

12. **Severity**: Nit
    **Affected Scope**: CUJ 3 "reopen the app to update" (l.175-176); `NEWER_VERSION_MESSAGE` (l.538-539)
    **Discrepancy Description & Rationale**: The message assumes reopening the app installs an update (presumably a PWA or service-worker update). The doc never states how ExTrack updates, so a reader cannot check that the message's advice is correct.

13. **Severity**: Nit
    **Affected Scope**: §6 and file 4 PR 2 (l.312-314, l.597-598)
    **Discrepancy Description & Rationale**: The doc does not say how an encrypted CSV export is recognised. It is implied that the user must first decrypt it and `rejectNonBackupPlaintext` then inspects the plaintext. So the passphrase prompt comes before the "older version" message, and the doc should say that.

14. **Severity**: Nit
    **Affected Scope**: §10 "Floor" (l.346-356) vs Alternative D "closed by the Chrome 112 floor" (l.423-424)
    **Discrepancy Description & Rationale**: "Floor" is used as if it were enforced, but §10 says "Nothing blocks older browsers" and photos may be stored sideways before Chrome 112. Alternative D's claim that the rotation risk is "closed" overstates this. Calling it a "supported minimum" would be clearer.

15. **Severity**: Nit
    **Affected Scope**: Alternative C "Rows are 8 to 15 times below any limit" (l.407); Alternative F "rows over photos" (l.441)
    **Discrepancy Description & Rationale**: "Any limit" does not say which limits are meant. "Rows over photos" is quoted as if it were an established principle but is never stated.

16. **Severity**: Nit
    **Affected Scope**: Goals "Restore crashes are visible … reported at the next app start" (l.84-85)
    **Discrepancy Description & Rationale**: "Reported" means telemetry to the developer (§4, file 6), not a message to the user. A first read suggests the user is told, so the goal's wording should say who sees the report.

17. **Severity**: Nit
    **Affected Scope**: Merge restore / "factory reset, merge import" (l.489-490, l.797-798); backup reminder (l.64-65)
    **Discrepancy Description & Rationale**: Merge versus other import modes, and the backup reminder (what "marks a backup as done"), are existing features the doc relies on without a one-line description.

18. **Severity**: Nit
    **Affected Scope**: Verification Plan "every `shadcn/*` error must be fixed" (l.941); test helpers `b64uEncode`, `readExpenses`, `setPassphrase`, `readDownload`, `tests/support/db.ts` (l.757, l.793-796, l.819, l.954); `vite-plus/test` (l.752)
    **Discrepancy Description & Rationale**: These project-specific lint rules, helpers and test runner are referenced without description. Each is minor alone, but together they assume the reader already knows the test and lint setup.

19. **Severity**: Nit
    **Affected Scope**: file 17 "`CHANGELOG.md` is not edited"; §11 "Release notes do not say 'gzip' or 'version 2'" (l.375, l.748)
    **Discrepancy Description & Rationale**: Neither rule gives its reason (presumably release-please writes the changelog, and release notes are written for users). Both point to rules in `AGENTS.md`, a file the doc relies on but does not summarise.
