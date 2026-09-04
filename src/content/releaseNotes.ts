// Authoring contract — read before adding an entry:
//
// - Write the user benefit, never the mechanism. No "Dexie", "service worker", "refactor",
//   "migration".
// - `title` <= 60 chars; `body` 1-2 plain sentences <= 160 chars. Users read the first lines only.
// - Only notable user-visible changes. Skip refactors, tests, dependency bumps, internal tooling.
//   A maintenance-only release therefore contributes no entries and shows no group at all — that
//   is expected, not a gap to fill.
// - `version` is the release the change ships in. For unmerged work use the next expected version:
//   it renders as "Coming soon" on localhost/staging and stays hidden in production until tagged.
// - `action.to` must be a route that exists in `src/App.tsx`.
// - `issue` only when a real GitHub issue exists.
// - Set `needsSetup` when the feature does nothing until the user acts; `isPreference` when it
//   only adds an optional setting; `isSecurity` for privacy/security work.

export type ReleaseNoteType = "new" | "improved" | "fixed";

export interface ReleaseNote {
  id: string; // stable slug, "<version>-<short-name>"
  version: string; // "x.y.z" release this ships in
  date: string; // "YYYY-MM-DD" release date (backfill) or authoring date (new work)
  type: ReleaseNoteType;
  title: string; // <= 60 chars, sentence case, benefit first
  body: string; // 1-2 sentences, <= 160 chars
  needsSetup?: boolean; // does nothing until the user acts once
  isPreference?: boolean; // adds an optional setting the user may change
  isSecurity?: boolean; // privacy or security change
  action?: { label: string; to: string }; // route that exists in src/App.tsx
  issue?: number; // GitHub issue number
}

// Newest first. There is deliberately no 1.6.0 group — that release was a codebase refactor plus
// tests, nothing a user can see.
export const RELEASE_NOTES: readonly ReleaseNote[] = [
  {
    id: "1.8.0-whats-new",
    version: "1.8.0",
    date: "2026-09-04",
    type: "new",
    title: "See what's new after every update",
    body: "The app now shows a short summary of what changed each time it updates. You can reopen it any time from Settings.",
    action: { label: "View changelog", to: "/settings/changelog" },
  },

  {
    id: "1.7.0-bulk-add",
    version: "1.7.0",
    date: "2026-09-02",
    type: "new",
    title: "Add a whole day of expenses at once",
    body: "Log several transactions on one screen instead of one at a time, then save them together.",
    action: { label: "Try bulk add", to: "/add/bulk" },
    issue: 59,
  },

  {
    id: "1.7.0-csv-import",
    version: "1.7.0",
    date: "2026-09-02",
    type: "new",
    title: "Bring your data from another expense app",
    body: "Import a spreadsheet exported from apps like Money Manager and match its columns to your categories.",
    needsSetup: true,
    action: { label: "Import a CSV", to: "/settings/data/import-csv" },
    issue: 52,
  },

  {
    id: "1.5.2-data-loss-guard",
    version: "1.5.2",
    date: "2026-08-09",
    type: "fixed",
    title: "Your expenses no longer disappear on their own",
    body: "Fixed a bug that could empty the app's storage. If data does go missing, the app now offers to restore a backup.",
    issue: 41,
  },

  {
    id: "1.5.1-long-passphrase",
    version: "1.5.1",
    date: "2026-03-22",
    type: "fixed",
    title: "Long passphrases no longer break the screen",
    body: "The backup screen now stays readable when you use a very long passphrase.",
    issue: 38,
  },

  {
    id: "1.5.0-encrypted-backups",
    version: "1.5.0",
    date: "2026-03-16",
    type: "new",
    title: "Password-protect your backups",
    body: "Backups and exports can be locked with a passphrase, so only you can open the file.",
    isSecurity: true,
    needsSetup: true,
    action: { label: "Set up backups", to: "/settings/data" },
    issue: 36,
  },

  {
    id: "1.5.0-drive-backup",
    version: "1.5.0",
    date: "2026-03-16",
    type: "new",
    title: "Back up to your own Google Drive",
    body: "Save a copy of your data to your Google Drive and restore it on a new phone.",
    needsSetup: true,
    action: { label: "Connect Google Drive", to: "/settings/data" },
    issue: 31,
  },

  {
    id: "1.5.0-backup-reminders",
    version: "1.5.0",
    date: "2026-03-16",
    type: "new",
    title: "Reminders to back up your data",
    body: "The app can nudge you daily, weekly or monthly to take a backup. Change or switch off the schedule any time.",
    isPreference: true,
    action: { label: "Choose a schedule", to: "/settings/data" },
    issue: 29,
  },

  {
    id: "1.5.0-security-hardening",
    version: "1.5.0",
    date: "2026-03-16",
    type: "improved",
    title: "Stronger protection for the app in your browser",
    body: "Added browser-level protections so no other site can load or tamper with the app, and moved Google sign-in to a safer flow.",
    isSecurity: true,
    issue: 34,
  },

  {
    id: "1.4.0-description-suggestions",
    version: "1.4.0",
    date: "2026-03-02",
    type: "new",
    title: "Descriptions you've used before are suggested",
    body: "Start typing a description and the app offers past entries, so repeat expenses take a couple of taps.",
    issue: 25,
  },

  {
    id: "1.4.0-settings-reorg",
    version: "1.4.0",
    date: "2026-03-02",
    type: "improved",
    title: "Settings reorganised, data tools in one place",
    body: "Backup, export and import now live together under Data Management instead of being spread around.",
    action: { label: "Open Data Management", to: "/settings/data" },
    issue: 28,
  },

  {
    id: "1.3.1-faster-screens",
    version: "1.3.1",
    date: "2026-02-19",
    type: "improved",
    title: "Faster screens and a clearer analysis layout",
    body: "Cut unnecessary redraws so screens respond quicker, and reordered the analysis sections to put the useful ones first.",
    issue: 24,
  },

  {
    id: "1.3.0-analysis-redesign",
    version: "1.3.0",
    date: "2026-02-09",
    type: "improved",
    title: "A redesigned spending analysis screen",
    body: "Charts and totals were rebuilt to be easier to read on a phone.",
    action: { label: "See your analysis", to: "/analysis" },
    issue: 20,
  },

  {
    id: "1.2.2-consistent-times",
    version: "1.2.2",
    date: "2026-01-18",
    type: "fixed",
    title: "Expense times save and display consistently",
    body: "Fixed times shifting or showing in the wrong format after saving.",
    issue: 18,
  },

  {
    id: "1.2.1-list-order",
    version: "1.2.1",
    date: "2026-01-06",
    type: "fixed",
    title: "Your expenses list in the order they happened",
    body: "Transactions are now sorted by when they happened rather than when you entered them.",
    issue: 16,
  },

  {
    id: "1.2.0-currency-preference",
    version: "1.2.0",
    date: "2026-01-02",
    type: "new",
    title: "Pick your own currency",
    body: "Choose the currency symbol the whole app uses, instead of a fixed default.",
    isPreference: true,
    action: { label: "Change currency", to: "/settings" },
    issue: 14,
  },

  {
    id: "1.1.0-update-prompt",
    version: "1.1.0",
    date: "2025-12-26",
    type: "new",
    title: "The app tells you when an update is ready",
    body: "A small banner appears when a newer version is available, and the app keeps working offline once it is saved to your device.",
    issue: 12,
  },

  {
    id: "1.1.0-long-descriptions",
    version: "1.1.0",
    date: "2025-12-26",
    type: "fixed",
    title: "Long descriptions no longer spill out of their card",
    body: "Expense cards now wrap long text instead of overflowing.",
    issue: 10,
  },

  {
    id: "1.0.3-clearer-messages",
    version: "1.0.3",
    date: "2025-12-23",
    type: "improved",
    title: "Clearer confirmations when you save or delete",
    body: "Save, edit and delete now confirm what happened in plain language.",
    issue: 8,
  },

  {
    id: "1.0.2-duplicate-save",
    version: "1.0.2",
    date: "2025-12-20",
    type: "fixed",
    title: "The same expense can't be saved twice",
    body: "Fixed a double-tap on save creating two identical transactions, and tidied up the expense form fields.",
  },

  {
    id: "1.0.1-ios-home-screen",
    version: "1.0.1",
    date: "2025-12-19",
    type: "fixed",
    title: "Adding the app to an iPhone home screen works",
    body: "Fixed the app not installing properly as a home-screen app on iOS.",
  },

  {
    id: "1.0.0-launch",
    version: "1.0.0",
    date: "2025-12-19",
    type: "new",
    title: "The first version of Expense Tracker",
    body: "Track expenses entirely on your own device — no account, no server. Install it to your home screen and it works offline.",
    issue: 5,
  },
];
