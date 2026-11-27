# Journey-Catalog End-to-End Test Revamp for ExTrack

- **Author:** gammaSpeck
- **Date:** 2026-11-28
- **Status:** Brainstorm, after two Goldfish review rounds (7 lenses each, all completed)

## Overview

ExTrack is a local-first expense tracker. It is a React 18 app built with Vite and installed as a PWA (an installable web app). Data lives in IndexedDB through Dexie, and the app can upload encrypted backups to Google Drive. The owner wants the end-to-end tests to act as a runnable description of how the app behaves. They should give confidence through dependency upgrades, such as a React upgrade, and make a later rebuild easier, for example a move to SQLite or a native app. In both cases, passing tests should mean the same user flows still work.

**Today:**

- 4 Vitest unit test files: `src/lib/*.test.ts`.
- 24 Playwright files in `tests/e2e/`, 131 tests in total, plus helpers in `tests/support/` and data files in `tests/fixtures/`. `tests/e2e` and `tests/support` together hold 3,364 lines.
- The `.test` / `.spec` split follows each tool's default and is enforced in `vite.config.ts:72`.
- The full local suite runs on `feat/`, `fix/` and Dependabot PRs in under 2 minutes (author-reported).
- Nothing exercises real Google Drive or a real phone.

**The concept, after review:**

1. **A catalog of user journeys.** The test titles are the feature list. A one-time audit against `src/content/releaseNotes.ts` links each feature to the test that proves it.
2. **Better coverage on PRs and staging.** The full suite runs on PRs, and again on staging after each deploy.
3. **On-demand checks against the real world:**
   - real Google Drive, using a dedicated test account, run locally and in CI;
   - the PWA installed from Brave on a spare Android phone, connected over ADB (Android Debug Bridge, the USB debugging connection).
4. **Evidence for a person to look at.** Screenshots and video on request, and a trace for every failure. Pictures are never compared pixel by pixel.

**Phone check, run on 2026-11-28 (verified):**

- **Device:** realme X50 Pro (RMX2076), Android 12.
- **Connection:** Brave owns Chrome's debugging socket, `@chrome_devtools_remote`. After `adb forward tcp:9222 localabstract:chrome_devtools_remote`, Playwright's `chromium.connectOverCDP("http://127.0.0.1:9222")` attached to the running ExTrack PWA.
- **What worked:**
  - the page reported standalone display mode, a 360x762 viewport, an active service worker, and both IndexedDB databases;
  - a screenshot was captured;
  - clicking the Analysis link moved to `/analysis` and back;
  - disconnecting left the app running.
- **How Brave installs it:** this is not a WebAPK (Android's packaged form of an installed web app). It runs inside Brave's `WebappActivity`, so the "installed app" is the Brave browser showing the site without browser controls.
- **Where it points:** at **production** (`extrack.madhukm.com`), where it holds the owner's real transactions.
- **Not tested:** starting the app from ADB without a person opening it.

## Analysis

### Round 1 findings and what became of them

| #     | Finding (round 1)                                                                                                                                  | Outcome                                                                                                                                                                                                                             |
| :---- | :------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Unlink calls Google's real `/revoke` (`useDriveConnection.ts:24` → `driveAuth.ts:174`). A real-Google unlink run would kill the stored test token. | **Accepted.** Round 2 extended it: the real token must never reach the browser at all. See Decisions → Real Google.                                                                                                                 |
| 2     | Brave's debugging connection exposes the production PWA and its real data.                                                                         | **Accepted.** The device harness checks a hard-coded staging origin. Round 2 extended this; see Decisions → Phone.                                                                                                                  |
| 3     | Tests read IndexedDB and localStorage to check results, so "check through the screen" is already broken in many places.                            | **Accepted for new and touched tests.** Storage consolidation is future work.                                                                                                                                                       |
| 4     | Running only `@smoke` on PRs would lower protection for no measured gain.                                                                          | **Accepted.** The full suite stays on PRs.                                                                                                                                                                                          |
| 5     | Release-please, `chore/` and `refactor/` PRs run no end-to-end tests, and staging only deploys `feat`/`fix` commits.                               | **Accepted.** `refactor/` and dependency PRs were added, and release-please is skipped. Staging now deploys every push to `main` except the release commit (author decision).                                                       |
| 6     | The staging release gate has no mechanism.                                                                                                         | **Accepted.** It needs the SHA exposed plus polling. Netlify posts no GitHub deployment statuses: the repo has 0 deployment records (`gh api repos/{owner}/{repo}/deployments`), so `on: deployment_status` is unavailable.         |
| 7     | Tags need a fixed list and a safe default.                                                                                                         | **Accepted, corrected in round 2.** `grepInvert` alone does not stop on-demand projects from running; see Decisions → Projects.                                                                                                     |
| 8     | Seeding through `db.ts` ties tests to Dexie.                                                                                                       | **Deferred.** The `db.ts` helpers stay; one storage module is future work. Import has its own journeys, most of which already exist.                                                                                                |
| 9     | `getByTestId` (82 uses) ties tests to markup.                                                                                                      | **Accepted.** Roles and labels come first; locators switch when a file is touched.                                                                                                                                                  |
| 10    | Titles describe implementation ("fixes TagTab.tsx:17", "mixed5…", "…persists to localStorage").                                                    | **Accepted.** Title format and areas are in Decisions.                                                                                                                                                                              |
| 11    | A saved, signed-in browser profile is fragile and mints a new refresh token on every connect.                                                      | **Accepted.** The token is injected at the network layer instead.                                                                                                                                                                   |
| 12    | The app has no Drive restore.                                                                                                                      | **Out of scope.** Recorded as a future feature.                                                                                                                                                                                     |
| 13    | Every run writes to the same Drive folder and file name.                                                                                           | **Accepted.** 1 worker, a GitHub `concurrency` group, and clean-up before each test.                                                                                                                                                |
| 14    | A network error during token refresh deletes the saved Drive credentials (`driveAuth.ts:157-161`).                                                 | **Product bug, future work.** Tests avoid it, because Node answers token calls.                                                                                                                                                     |
| 15–16 | Token scope, a pre-check for a revoked token, redirect URIs, the user cap.                                                                         | **Revised in round 2.** With network injection, Google never sees the redirect, so no extra redirect URIs need registering. The console shows the client is "In production", so the 7-day Testing-mode token expiry does not apply. |
| 17–18 | The phone gives one shared, persistent session; manual setup steps aren't written down.                                                            | **Accepted.** See Decisions → Phone.                                                                                                                                                                                                |
| 19–20 | "Journey" undefined; the release-note audit has nowhere to live.                                                                                   | **Accepted.** See Decisions → Catalog.                                                                                                                                                                                              |
| 21    | Some behavior has nothing visible to assert (receipt JPEG cap, all-or-nothing bulk save, drafts).                                                  | **Decided.** These stay as end-to-end checks with storage reads until their file is touched, then move to unit tests.                                                                                                               |
| 22–25 | Screenshot switch, unit tests kept, `--list` noise, service workers on staging.                                                                    | **Accepted**, except the service-worker staging project, which is deferred.                                                                                                                                                         |
| —     | Low-value tests: `storage-persistence.spec.ts`, "service worker registers", duplicate Chrome/Brave standalone specs.                               | **Accepted.** See the deletion list.                                                                                                                                                                                                |
| —     | Release notes with no covering test.                                                                                                               | **Accepted.** They become `test.fixme` entries; see Catalog.                                                                                                                                                                        |

### Round 2 findings

**Blockers, all resolved in Decisions:**

1. **The real refresh token reached the browser.** Letting refresh calls through to Google meant the browser held the real token. Then:
   - Unlink's `/revoke` was blocked only if one route matched every time.
   - Traces record request bodies, and `e2e.yml:38-43` uploads the report as an artifact for 7 days. The repo is public, so any GitHub user could download it [INFERENCE].
   - **Fix:** the browser only ever gets a fake refresh token. Node answers both token requests (code exchange and refresh) with real access tokens that it gets from Google using the stored token. Four of seven lenses agreed.
2. **The uploaded Drive file is encrypted, so a marker search can't work.** Drive backups go through `createEncryptedBackupFile` (`useBackupAction.ts:29`), and the mocked test already asserts the marker is _not_ in the file (`drive-oauth.spec.ts:95`). **Fix:**
   1. Download the file through the Drive API.
   2. Import it through the app's import screen, with the passphrase, in a fresh browser context.
   3. Check the marker transaction on screen.

   No crypto code is needed in the tests.

3. **On-demand projects would run in every default run.** `playwright test` runs every project in the config. **Fix:** the `google-real` and `device` projects are added to the config only when an environment variable is set.
4. **Browser-wide writes on the phone reach the production app.** `installHarness(context)` writes localStorage presets across the whole browser context, and the existing standalone helper uses it that way (`installed-pwa.ts:46`). On the phone that context is the owner's real Brave profile, so a production page reloaded mid-run gets the presets. Also, a guard based on `BASE_URL` accepts production when `E2E_ENV=production` is set (`env.ts:3-14`). **Fix:**
   - page-level routes and init scripts only;
   - no `context.*` calls;
   - an origin check hard-coded to the staging URL.

**Majors:**

5. **A green staging run may be for an older commit.** Staging deploys only commits whose message starts with `feat` or `fix` (`update-staging.yml:15-18`), so `refactor` and `chore(deps)` merges ship without reaching staging. → **Resolved (author):** deploy every push to `main` except the release commit, then run the full suite. Three lenses had argued the full suite on staging mostly repeats the PR run.
6. **The PR filter, as decided, needs a file-diff mechanism and still skips risky changes.** A job-level `if:` can't see changed files. A workflow-level `paths:` filter would also gate the `fallow` and `check` jobs. Test and config changes on `chore/` branches would skip end-to-end. Dependabot is detected by actor (`pr-checks.yml:15`), which fails once you push to its branch. → **Resolved (author):** run on every PR except release PRs and PRs that change only non-code files. See Decisions → Pull requests.
7. **`@smoke` has no defined consumer.** The existing `deployed` job in `e2e.yml:45-56` runs `--grep @smoke` against staging or production on manual dispatch. → Decided: `@smoke` means that manual deployed check.
8. **"Full suite on staging" is not full.** `drive-oauth.spec.ts:51` skips on deployed sites. `security-headers.spec.ts:24` runs _only_ there. The first full staging run will expose tests that assume a local server (`mock-drive.ts:33` says it is never used against a live deployment). Budget one PR to fix them.
9. **The staging SHA wait can fail like a broken test.** Two quick merges, or a failed Netlify build, mean the expected SHA is never served. → Add a `concurrency` group, and report a timeout as "staging never served <sha>", separate from test failures.
10. **Step 5 (import journeys) is mostly done.** `csv-import.spec.ts:6,43,83,146` and `data-management.spec.ts:122,188,281` already import through the UI. What's missing is a journey for the old `backup-v1.extrack` format, plus replacing the `readExpenses` checks in `csv-import`. → Folded into the audit's gap list.
11. **Brief inconsistencies.** These are fixed in this version:
    - `seed()` was described as both decided and deferred;
    - round-1 advice read as current;
    - the catalog rules lived only in Analysis;
    - the list of specs that touch storage was incomplete;
    - release-please PRs don't change `bun.lock`: release commits touch only `package.json` and `CHANGELOG.md`.
12. **The phone gets no built-in evidence.** Pages attached with `connectOverCDP` don't get Playwright's automatic video or trace. Calling `installHarness` once per test piles up routes on the shared page. → Decided: the device fixture takes screenshots itself and installs routes once per worker.
13. **A manual real-revoke check with the test account would end the CI token's grant.** [INFERENCE] Google revokes the whole grant for that account and app, not one token. → Decided: run the manual revoke check with a second, personal account.

**Nits:**

- Sharding cost: each shard pays for setup again, including the Brave apt install. `webServer` builds the app inside the config (`playwright.config.ts:33`), so "build once" needs a preview-only path.
- "1 / 100 users means Testing mode" (zoom-out lens): **rejected**, because the console screenshot shows "In production".
- An oxlint rule that bans `indexedDB`, `localStorage` and `readExpenses` in `tests/e2e/**`, with an allow-list for today's offenders that may only shrink. → **Accepted (author).**

### Remaining contradictions (inventive lens)

| Tension                                                       | Resolution                                                                                                                                                           |
| :------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Keeping traces of failures vs. keeping the secret out of them | Only a fake refresh token reaches the browser.                                                                                                                       |
| Checking the real revoke vs. keeping the CI token alive       | Revoke is checked by hand with a second account.                                                                                                                     |
| A release check vs. checking the right commit                 | Staging deploys every `main` push except the release commit, and the run posts a commit status on the exact SHA it tested.                                           |
| Deferring storage consolidation vs. the portability goal      | A lint ratchet stops new storage reads in tests. Replacing `gotoApp`'s IndexedDB wait with an on-screen signal removes the one storage dependency every test shares. |
| Testing the deployed site vs. blocking service workers        | A staging-only project with service workers allowed is deferred.                                                                                                     |

### Runtime budget as the suite grows

- **Estimate:** wall time ≈ build + (tests × average length) ÷ workers. It grows linearly as tests are added.
- **Already saved:** the deletion list shrinks the suite.
- **When a PR run passes about 3 minutes of test time:** shard it with a GitHub Actions `strategy.matrix`.
  1. Build once and upload `dist/`.
  2. Each matrix job runs `playwright test --shard=${{ matrix.shard }}/N` with the `blob` reporter.
  3. A final job runs `playwright merge-reports`.

  The config then needs a preview-only `webServer` path. The setup each shard repeats (the Brave install) eats into the saving.

### Common industry practice (for reference)

- **User-facing locators.** Playwright recommends `getByRole`, then `getByLabel` / `getByText`. It calls `getByTestId` the most resilient but not user-facing ([Playwright locators](https://playwright.dev/docs/locators)).
- **Isolated tests:** each test sets up its own data ([Playwright best practices](https://playwright.dev/docs/best-practices)).
- **Fake third-party services at the network boundary** in the main suite. That includes OAuth token exchange and analytics. Check the real API separately, on demand or on a schedule. Sources: [Playwright best practices](https://playwright.dev/docs/best-practices) and the installed `playwright-best-practices` skill, `architecture/when-to-mock.md`.
- **Weight tests toward integration-level user flows.** Keep unit tests for logic with many input cases ("testing trophy"). For a local-first browser app, Playwright journeys with a faked network are that middle layer.
- **Keep a trace for every failure.** Turn screenshots and video on when needed.

## Goals vs. Non-Goals

- **In-Scope Goals:**
  - The suite works as a catalog of user journeys. Titles describe behavior a user can see, and a `release-note` annotation links each feature to the test that proves it.
  - New and touched tests check results only through allowed observation points: the screen (roles and text), downloaded or exported files, the URL, and network traffic at the app's edges.
  - Every PR runs the full local suite, except release-please PRs and PRs that change only non-code files (Markdown, docs, CI files other than the end-to-end ones).
  - After each staging deploy, the suite runs against the exact commit staging serves. Staging deploys every push to `main` except release-please's release commit.
  - A real-Google journey with the test account that runs locally and in CI: connect, back up, download the file, import it in a fresh context, see the marker transaction, unlink. The real refresh token never enters the browser.
  - An on-demand `@device` run from the Mac against a staging PWA installed from Brave on the Android phone. It is guarded so it can never touch the production app.
  - Screenshots and video on request, a trace for every failure, and an HTML report both locally and in CI.
  - Unit tests only for pure logic with many input combinations. All 4 existing files stay.
- **Out-of-Scope Non-Goals:**
  - Pixel-by-pixel screenshot comparison.
  - Running phone tests in CI (no self-hosted runner).
  - Automating Google's sign-in and consent screens.
  - Running anything against the production PWA or production data on the phone.
  - iOS / Safari installed-PWA automation.
  - A separate feature-specification document outside the tests.
  - Restore from Google Drive as an app feature (recorded as future work).
  - Gathering all test storage access into one module (recorded as future work).
  - Sharding (deferred until the PR run passes about 3 minutes of test time).

## Alternatives Weighed

- **Pixel-diff visual regression assertions.** Rejected by author: the UI is expected to change in a rebuild.
- **Phone tests in CI through a self-hosted runner.** Rejected by author as overkill.
- **Driving Brave on the desktop for Google tests.** Rejected by author: Playwright's bundled Chromium is enough there.
- **Removing end-to-end tests from PRs.** Rejected by author: a broken upgrade would only be found after merging.
- **`CHANGELOG.md` or `releaseNotes.ts` as the feature list.** Rejected during ideation: both list changes over time, not current behavior.
- **Signing in to Google with a password in an automated browser.** Rejected during ideation: bot detection makes it unreliable, and the password would live in test code.
- **Only `@smoke` on PRs.** Rejected after review: the full suite runs in under 2 minutes.
- **Keeping staging deploys to `feat`/`fix` commits and running only `@smoke` there.** Rejected by author: staging would lag behind `main`, and a green run could be for an older commit than the one about to ship.
- **End-to-end tests on release-please PRs.** Rejected by author: those PRs change only `package.json` and `CHANGELOG.md`.
- **Seeding every test through the import screen.** Rejected by author: import gets its own journeys, and seeding keeps the `db.ts` helpers.
- **A saved, signed-in browser profile as the real-Google path.** Rejected during ideation: Google may block automated sign-in, every connect mints a new token, and it tests Google's screens rather than the app.
- **Letting the app's refresh calls go through to Google with the real token.** Rejected after round 2: the real token would sit in the browser, in traces and in public CI artifacts, and only one route would stand between Unlink and a real revoke.
- **Checking the uploaded Drive file for a plain-text marker.** Rejected after round 2: backups are encrypted.
- **Excluding on-demand tags with `grepInvert` alone.** Rejected after round 2: `playwright test` still runs every project in the config.
- **A new mocking package such as MSW.** Rejected during ideation: Playwright's built-in `page.route` already does this (`tests/support/mock-drive.ts`), and a service-worker-based mock would clash with the app's own service worker.

## Key Decisions & Staging for Next Steps

### Decided

**Catalog**

- **Journey:** one user goal, from opening the app to a result the user can see.
- **Title format:** `user can <goal>`. The area comes from the file name. Titles contain no test-data names, file paths, test IDs or storage keys.
- **Areas**, with today's files mapped to them. Files move when they are next touched:

  | Area file                     | Today's specs                                                                  |
  | :---------------------------- | :----------------------------------------------------------------------------- |
  | `home.spec.ts`                | `home`, `boot`                                                                 |
  | `capture.spec.ts`             | `expense-crud`, `bulk-add`, `receipt-photo`                                    |
  | `history.spec.ts`             | `transactions`, `transaction-filters`                                          |
  | `categories-and-tags.spec.ts` | `categories`, `tags`                                                           |
  | `insights.spec.ts`            | `analysis`                                                                     |
  | `data-and-backup.spec.ts`     | `data-management`, `csv-import`, `backup-reminder`, `drive-oauth`, `data-loss` |
  | `install-and-update.spec.ts`  | `pwa`, `sw-update`, `whats-new`, `pwa-standalone-*`                            |
  | `settings.spec.ts`            | `settings`                                                                     |
  | `deployed-site.spec.ts`       | `security-headers` (runs only on deployed sites)                               |

- **Feature list:** `playwright test --list --project chromium-desktop`.
- **Release-note audit:**
  - Each note gets `{ type: "release-note", description: "<id>" }` on the test that proves it.
  - Notes with no test yet get a `test.fixme("user can …")` carrying the annotation, in the matching area file. Known gaps:
    - `1.4.0-description-suggestions`;
    - `1.0.2-duplicate-save`;
    - reopening What's New from Settings (`1.8.0-whats-new`);
    - importing the old `backup-v1.extrack` format (`1.10.0-smaller-backups`);
    - weekly and monthly reminders (`1.5.0-backup-reminders`).
  - Notes that can't be tested get `{ type: "release-note-untested", description: "<id>: <reason>" }` in one place, `tests/e2e/untested-release-notes.ts`. They are:
    - `1.3.1-faster-screens`;
    - `1.5.0-encrypted-backups` (superseded);
    - `1.0.1-ios-home-screen`;
    - the two layout-only fixes, which a screenshot covers.
- **AGENTS.md rule**, beside the release-note rule: any change that needs a release note also adds or updates a journey test with that note's annotation.

**Checking results**

- Only through the screen, downloaded or exported files, the URL, or network traffic at the app's edges.
- The rule covers _assertions_. Setup and readiness helpers (`db.ts` seeding, `gotoApp`, `installHarness`) are exempt until the storage module exists.
- Existing storage assertions are fixed when their file is next touched. These are: `readExpenses` in `bulk-add`, `csv-import`, `expense-crud`, `receipt-photo` and `tags`, and the localStorage checks in `settings`, `backup-reminder`, `categories`, `data-management` and `whats-new`.

**Tags and projects**

| Project            | Selects                                                       | Browser                                        | Workers | Present when                       |
| :----------------- | :------------------------------------------------------------ | :--------------------------------------------- | :------ | :--------------------------------- |
| `chromium-desktop` | everything except `@google-real`, `@standalone` and `@webkit` | bundled Chromium                               | 4 in CI | always                             |
| `brave-mobile-pwa` | `@standalone` (replaces today's file-name match)              | installed Brave, in a standalone app window    | default | always (skips if Brave is missing) |
| `webkit-mobile`    | `@webkit`                                                     | Playwright's WebKit engine, normal browser tab | default | always                             |
| `google-real`      | `@google-real`                                                | bundled Chromium                               | 1       | `E2E_GOOGLE_REAL=1`                |
| `device`           | `@device`                                                     | `connectOverCDP` to the phone                  | 1       | `E2E_DEVICE=1`                     |

- `@smoke` marks the manual deployed check that `e2e.yml`'s `deployed` job already runs (`--grep @smoke`, staging or production).
- `@device` marks shared journeys that are also safe to run on the phone. They still run in `chromium-desktop`. A test that uses `context.*` APIs is never tagged `@device`.
- Scripts: `test:e2e:google` = `E2E_GOOGLE_REAL=1 playwright test --project google-real`, and `test:e2e:device` = `E2E_ENV=staging E2E_DEVICE=1 playwright test --project device`.

**Third-party services in the main suite** are faked with Playwright's built-in `page.route` / `route.fulfill`, as `tests/support/mock-drive.ts` already does. No new package.

**Real Google (`@google-real`; a tag, not a package)**

- **Where it runs:**
  - **Locally:** from `.env`.
  - **In CI:** as part of the post-deploy staging run, and on demand through `workflow_dispatch`.
  - **Secrets:** stored as GitHub secrets: the refresh token, plus the client ID and secret. Only Node-side test code reads them; GitHub masks them in logs.
  - **What a report can contain:** the browser only ever sees `rt-fake` and a short-lived access token. Even so, the `google-real` project runs with `trace: "off"` and `video: "off"` in CI, so its report holds no request contents.
- **One-time setup:** create a refresh token for the test account, using the same OAuth client ID as the build under test (`VITE_GOOGLE_CLOUD_DRIVE_OAUTH2_CLIENT_ID`, `src/config/index.ts:21`).
- **What the test intercepts:**
  - `accounts.google.com/o/oauth2/v2/auth` → a 302 to `/oauth/callback?code=test`, copying `state` if the app ever adds one.
  - `oauth2.googleapis.com/token`, both grants → Node calls Google with the stored refresh token and returns `{ access_token: <real>, refresh_token: "rt-fake", expires_in }`.
  - `oauth2.googleapis.com/revoke` → answered locally with 200.
  - Drive API calls (`www.googleapis.com/drive/v3/…`, `upload/drive/v3/…`) → not intercepted; they go to real Drive with the real access token.
- **First test:** a token check that fails with "stored refresh token revoked or expired: create a new one".
- **Data hygiene:** 1 worker, and a GitHub `concurrency` group shared by every workflow that runs `google-real`. Delete the `ExTrack Backups` folder through the Drive API before each test. A local run and a CI run at the same moment can still collide; that is accepted.
- **Journey:** connect, set the passphrase, back up, download the file through the Drive API, import it in a fresh context, see the marker transaction, unlink.
- **Manual check before releases:** Google's consent screen and a real revoke, done with a second, personal Google account, never the test account.

**Phone (`device` project)**

- **Before a run:** the staging PWA is installed from Brave and opened by hand, the phone is unlocked, and `adb forward tcp:9222 localabstract:chrome_devtools_remote` has been run. Starting the app from ADB is not attempted.
- **The fixture:**
  - replaces `context` and `page`, and selects the page whose origin is exactly `https://staging--gamma-expense-tracker.netlify.app`;
  - ignores `E2E_ENV` and `E2E_BASE_URL`;
  - refuses to run if that page is missing;
  - repeats the origin check before every destructive helper.
- **State between tests:** cleared only with CDP `Storage.clearDataForOrigin` on that fixed origin.
- **Routes and init scripts:** installed per page, once per worker. Never at context level.
- **Evidence:** screenshots are taken by the fixture itself, since automatic video and trace don't apply over CDP.

**Pull requests (author decision):**

- **What runs:** the full local suite on every PR except two kinds:
  - release-please PRs, matched by branch name: `!startsWith(github.head_ref, 'release-please--')`;
  - PRs whose changed files are _all_ non-code.
- **How it decides:**
  - A small `changes` job runs `gh pr diff --name-only`, the pattern already in `pr-checks.yml:106`, and outputs `isCodeChanged`.
  - The `e2e` job gets `needs: changes` and `if: needs.changes.outputs.isCodeChanged == 'true'`.
  - A job skipped this way still satisfies required status checks.
- **Non-code files:** `**/*.md`, `docs/**`, `graft/**`, `LICENSE`, and `.github/**`. The exception is that anything the end-to-end run itself uses still counts as code: `.github/workflows/e2e.yml`, `.github/workflows/pr-checks.yml`, `.github/actions/e2e-setup/**`.
- **Always code:** `package.json`, `bun.lock`, `src/**`, `tests/**`, `public/**`, `playwright.config.ts`, `vite.config.ts`, `netlify.toml`. So any dependency change always runs the suite.
- **Dependabot:** detected by branch name (`dependabot/`), not by actor.

**Lint guard (author decision):**

- **Rule:** an oxlint override for `tests/e2e/**`, next to the existing overrides at `vite.config.ts:115`:
  - `no-restricted-globals` for `indexedDB` and `localStorage`;
  - `no-restricted-imports` for `readExpenses`.
- **Today's offenders:** a second override switches the rule off for the files that already break it. That list may only shrink.
- **Where it runs:** it is part of `vp lint`, which already runs on PRs through `vp check`.

**Staging (author decision: option a):**

- **Trigger:** `update-staging.yml` runs on every push to `main` except release-please's release commit, whose message starts with `chore(main): release` (seen in `git log`). It gets a `concurrency` group with `cancel-in-progress`.
- **Calling the tests:** it calls `e2e.yml` as a reusable workflow. Pushes made with `GITHUB_TOKEN` don't trigger other workflows, so a separate workflow wouldn't fire.
- **Waiting for the deploy:** the build exposes its commit as `/version.json`, written from Netlify's `COMMIT_REF`. The workflow polls it with curl, with a 10-minute timeout reported as "staging never served <sha>".
- **What runs:** the full suite plus `google-real` against staging. `e2e.yml` gains that path and keeps `--grep @smoke` for production.
- **Recording the result:** the run posts a commit status on the SHA it tested. Before merging a release PR, the author checks that status on the release PR's base commit. A required check that enforces this is not built now.
- **Expect one PR** to fix tests that assume a local server.

**Evidence and config:**

- `trace: "retain-on-failure"`.
- `screenshot` and `video` switched on by `E2E_SHOTS=1` and `E2E_VIDEO=1`.
- The HTML reporter turned on locally as well as in CI.

**Scope:** step by step, with no big rewrite. Area moves, title rewording and locator switches happen as files are touched; these are habits, not numbered steps.

### Open questions for the author

None. All four round-2 questions are resolved:

- **Staging:** option (a).
- **PR filter:** every PR except release PRs and non-code-only PRs.
- **Lint guard:** add it.
- **Standalone specs:** keep Brave and WebKit, and delete the Chrome spec.

About the WebKit spec ("Safari" today):

- **What it can't do:** Playwright opens Chromium-based browsers with an `--app=<url>` flag, which gives a real standalone app window (`display-mode: standalone`). WebKit has no such flag, so this spec runs the same journey in a normal tab (`display-mode: browser`) and skips the offline-reload check (`pwa-standalone-safari.spec.ts:4-9`, `installed-pwa.ts:51-60`).
- **What it does prove:** the journey works on Apple's browser engine.
- **What it doesn't prove:** that the app works as an iPhone home-screen app. That needs a real iPhone and stays out of scope.
- **Rename:** to "WebKit" so the name doesn't overclaim.

### Suggested order (each step its own PR, CI green after each)

1. **PR filter:** the `changes` job and the branch-based release and Dependabot rules.
2. **Lint guard:** the oxlint override and the shrinking allow-list.
3. **Evidence config:** trace on failure, `E2E_SHOTS` / `E2E_VIDEO`, the local HTML report.
4. **Deletions:**
   - `storage-persistence.spec.ts`;
   - the "service worker registers" test (`pwa.spec.ts:8-15`);
   - `pwa-standalone-chrome.spec.ts` and the `chrome-mobile-pwa` project;
   - filter journeys down to 2–3, since `transactionFilters.test.ts` covers the combinations.
5. **Release-note audit:** annotations, `test.fixme` gaps, `untested-release-notes.ts`, the AGENTS.md rule.
6. **Tags and projects** per the table, including env-gated project loading and renaming the Safari spec to WebKit.
7. **Staging run:** the deploy trigger, `/version.json`, the polling, `e2e.yml`'s full-suite path, and the commit status.
8. **`google-real` project**, including the GitHub secrets.
9. **`device` project.**

### Future work (recorded, not scheduled)

- Restore from Google Drive as an app feature. Release note `1.5.0-drive-backup` already promises it.
- One storage-aware test module (`seed()`, readiness wait, presets), so a storage swap such as IndexedDB → SQLite rewrites one file. Today that swap would touch `db.ts`, `gotoApp`, `installHarness`, and storage reads in `data-loss`, `bulk-add`, `whats-new`, `drive-oauth`, `backup-reminder`, `categories`, `data-management`, `settings`, `csv-import`, `expense-crud`, `tags` and `receipt-photo`.
- Replace `gotoApp`'s IndexedDB readiness poll with an on-screen signal.
- Sharding, when the PR run passes about 3 minutes of test time.
- A staging-only project with service workers allowed.
- Fix the product bug where a network error during token refresh deletes the saved Drive credentials (`driveAuth.ts:157-161`).
