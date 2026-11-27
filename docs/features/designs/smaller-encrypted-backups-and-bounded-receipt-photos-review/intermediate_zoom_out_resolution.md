# Goldfish Annotated Review Report: Stage 8 Resolution

**Status: resolved** (2026-11-26). Applied: S8-3, S8-4, S8-5 and the
sideways-photo part of S8-6. Contested: S8-1 and the remaining parts of S8-6.
Rejected by the owner: S8-2. One owner-directed change that is not a reviewer
finding: PR 3 is split into a reader PR and a writer PR.

**Target:** `docs/features/designs/smaller-encrypted-backups-and-bounded-receipt-photos.md` (full file, lines 1-1125)

**Source findings:** `intermediate_zoom_out_report.md` (S8-1 to S8-6 from `egm-zoom-out`).

## Prioritized Findings & Resolutions

### S8-1. The passphrase `check` field adds a permanent format field to fix a failure the design rates Low [`egm-zoom-out`] - Severity: Major

- _**Resolution:**_ CONTEST
- _**Justification:**_ The design's Goal reads "Messages say what happened.
  'Wrong passphrase' appears only when the passphrase is wrong." Without
  `check`, a failed decrypt of a large file is ambiguous: the reader cannot
  tell a wrong passphrase from a memory failure inside decryption. The
  proposed combined message ("Wrong passphrase, or this backup is too large
  for this device's memory") breaks that Goal, and the owner rejected it.
  `check` stays.

### S8-2. The data-loss fix (PR 1) is held back by the bundled release and the phone test [`egm-zoom-out`] - Severity: Major

- _**Resolution:**_ Rejected by the owner.
- _**Justification:**_ All five PRs ship together as release 1.10.0. The
  design records this as a Non-Goal: "Releasing PR 1 alone as a 1.9.x patch.
  All five PRs ship together as 1.10.0 (owner's choice)."

### S8-3. The restore marker stores data only telemetry uses [`egm-zoom-out`] - Severity: Nit

- _**Resolution:**_ PROPOSE FIX, applied.
- _**Edit:**_ One marker shape, `{ step: "read" | "decrypt" | "write",
  bytes?: number }`, set in section 4, section 8 and files 4–7. `bytes` is
  the file size for the read and decrypt windows. `takeInterruptedRestore`
  returns the parsed object, or `null` when the key is absent or its value
  is not valid JSON. Startup sends `import_failed { stage: "crash", step,
  bytes }`.

### S8-4. The read-path diagram shows messages users never see [`egm-zoom-out`] - Severity: Nit

- _**Resolution:**_ PROPOSE FIX, applied.
- _**Edit:**_ "could not decrypt" and "could not be unpacked" are labelled
  "(internal)" in the read-path diagram, and a bullet under it says those
  labels reach telemetry only and points to the message table.

### S8-5. CUJ 7 and Alternative I add nothing new [`egm-zoom-out`] - Severity: Nit

- _**Resolution:**_ PROPOSE FIX, applied.
- _**Edit:**_ CUJ 7 is folded into CUJ 1 ("Save a backup to the device or
  Google Drive"); CUJ 8 and 9 become CUJ 7 and 8. Alternative I becomes the
  Non-Goal "A JavaScript gzip library (fflate, pako) for old browsers. The
  version-1 fallback keeps backup working there with no dependency."

### S8-6. Accepted findings remain and code-level detail grew [`egm-zoom-out`] - Severity: Nit

- _**Resolution:**_ Split.
  - **Sideways-photo risk stated once:** PROPOSE FIX, applied. Section 10
    and Alternative D now point to the section 12 Risks table instead of
    restating it.
  - **Moving `toFixed(1)`, `15_000` and `102_400` into code:** CONTEST.
    The implementation-readiness standard's Zero-Decision Rule
    (`resources/document_standards/implementation-readiness-standard.md`
    lines 12–18) requires the plan to leave no design choice to the
    implementer. The rounding of sizes shown to users, the warning's
    display time and the telemetry rounding are such choices, so they stay
    in the Detailed Implementation Plan.
  - **Replacing the numbered `decryptData` steps with a behaviour
    contract:** CONTEST. The step order is load-bearing: the version check
    comes before key derivation, the passphrase check before the
    ciphertext, and gunzip sits outside the decrypt `try`. A contract
    without the order would let an implementer reorder them and break
    CUJ 3 or the wrong-passphrase routing. The same Zero-Decision Rule
    applies.

## Owner-directed change (not a reviewer finding)

**PR 3 is split into a reader PR (PR 3) and a writer PR (PR 4).** The
repository allows only squash merges (`allow_merge_commit: false`,
`allow_rebase_merge: false`). The previous rollback, "PR 3 is never squashed so
commit (b) can be reverted alone", is therefore impossible. With two PRs,
reverting PR 4's squash commit stops version-2 writes while PR 3 keeps reading
the version-2 backups already made. The photo PR becomes PR 5, section 11 is
rewritten for five squash-merged PRs, and PR 3 gains its own release note
because `AGENTS.md` requires one for every `feat`. The phone test moves to
staging after PR 4 merges, and the threshold follow-up becomes a
`chore(backup)` PR.
