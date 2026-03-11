# Plan: Separate Backup from Export

## TL;DR

Split the current monolithic `ExportData` component into two distinct features:

- **Backup** — JSON-only, device or Drive, tracked with date + mode in reminder system
- **Export** — CSV or JSON, device-only, simple data dump, not reminder-tracked

## Decisions

- Mode display: "Last backed up: 3 days ago · Device" (or "· Google Drive")
- Backup Now button: navigate to /settings/data with `{ openBackup: true }`
- DataManagementPage: two separate card sections "Backup" and "Export Data"
- Export filename: `extrack-export-YYYY-MM-DD.{json,csv}` (vs backup: `extrack-backup-YYYY-MM-DD.json`)

---

## Phase 1: Data model — track backup mode

**Files:** `src/db/userPreferences.ts`, `src/lib/backupReminder.ts`

1. Add `lastBackupMode: "device" | "drive" | null` to `BackupReminderPreferences` interface
2. Update `DEFAULT_BACKUP_REMINDER_PREFERENCES` with `lastBackupMode: null`
3. Update `getBackupReminderPreferences()` parsing to deserialize `lastBackupMode`
4. Update `markBackupCompleted(mode: "device" | "drive", now?: Date)` to persist mode alongside date

## Phase 2: New BackupData component

**Files:** `src/components/more/BackupData.tsx` (new)

- Props: `openOnMount?: boolean`, `onSuccess?: () => void`
- JSON-only (no format picker)
- Destination: Device or Google Drive
  - Drive connected: Drive button selectable normally
  - Drive NOT connected: Drive button shows "Connect Drive" → triggers `initiateGoogleAuth()` (same flow as `GoogleDriveSettings`), no disabled state
- Reuse same Drive upload logic currently in ExportData (getValidAccessToken, findOrCreateBackupFolder, uploadFileToDrive)
- On success: calls `markBackupCompleted(mode)`, then `onSuccess?.()`
- Toast: "Backup saved to device" or "Backup saved to Google Drive" (with View in Drive action)
- Button: "Create Backup", dialog title: "Backup"
- Filename: `extrack-backup-YYYY-MM-DD.json`

## Phase 3: Simplify ExportData

**Files:** `src/components/more/ExportData.tsx`

- Remove: `saveTo` state, Drive UI, Drive imports (getValidAccessToken, DriveSessionExpiredError, uploadFileToDrive, findOrCreateBackupFolder, isDriveConnected, getDriveCredentials, saveDriveCredentials)
- Remove: `markBackupCompleted()` call
- Device only — CSV or JSON
- Filename: `extrack-export-YYYY-MM-DD.{json,csv}`
- Button label: "Export Data", dialog title: "Export Data"
- Remove `openOnMount` prop (no longer needed for backup flow)

## Phase 4: Update DataManagementPage

**Files:** `src/pages/DataManagementPage.tsx`

- State key: `openBackup` (was `openExport`)
- Add `BackupData` with `openOnMount={autoOpenBackup}` and `onSuccess={handleBackupSuccess}`
- `handleBackupSuccess` increments a `backupRefreshKey` counter
- Pass `key={backupRefreshKey}` to `BackupReminderSettings` to force remount and re-read prefs
- Layout order:
  1. Backup Reminders (BackupReminderSettings)
  2. Google Drive (GoogleDriveSettings)
  3. **Backup** card → BackupData
  4. **Export Data** card → ExportData
  5. Import card
  6. Danger Zone

## Phase 5: Update BackupReminderPrompt

**Files:** `src/components/BackupReminderPrompt.tsx`

- Change navigate state: `{ openBackup: true }` (was `{ openExport: true }`)

## Phase 6: Update BackupReminderSettings — show mode

**Files:** `src/components/more/BackupReminderSettings.tsx`

- Read `lastBackupMode` from preferences (alongside `lastBackupDate`)
- Update `lastBackupText` useMemo: append " · Device" or " · Google Drive" when mode is known
  - e.g. "Last backed up: 3 days ago · Device"
  - e.g. "Last backed up: today · Google Drive"
  - e.g. "Last backed up: never" (no mode suffix when null)

---

## Relevant Files

- `src/db/userPreferences.ts` — add `lastBackupMode` field + parsing
- `src/lib/backupReminder.ts` — update `markBackupCompleted(mode)`
- `src/components/more/ExportData.tsx` — strip to device-only data dump
- `src/components/more/BackupData.tsx` — NEW: backup dialog with device+Drive
- `src/components/more/BackupReminderSettings.tsx` — show mode in last-backup text
- `src/pages/DataManagementPage.tsx` — layout + openBackup state + refresh key
- `src/components/BackupReminderPrompt.tsx` — state key rename

## Verification

1. Create backup → device: `extrack-backup-YYYY-MM-DD.json` downloads, BackupReminderSettings shows "· Device"
2. Create backup → Drive: file appears in ExTrack Backups folder, BackupReminderSettings shows "· Google Drive"
3. Export → JSON: `extrack-export-YYYY-MM-DD.json` downloads, BackupReminderSettings last-backup date unchanged
4. Export → CSV: `extrack-export-YYYY-MM-DD.csv` downloads, BackupReminderSettings unchanged
5. Backup reminder prompt "Backup Now" → navigates to /settings/data, Backup dialog opens
6. Drive not connected: BackupData shows "Connect Drive" button that starts auth flow; ExportData has no Drive option at all
7. BackupReminderSettings refreshes (remounts) after backup completes without page reload

## Dead Code Removal

- Delete `src/components/more/BackupReminderBanner.tsx` — confirmed unused (replaced by `BackupReminderPrompt`)
