# 🔄 Google Drive Backup & Enhanced Export System

**Status:** Spec Confirmed — Ready for Implementation  
**Version:** 0.2.0  
**Date:** 2026-03-02  
**Target Release:** Feature Set 3  
**Active Phases:** Phase 1 (Backup Reminders) + Phase 2 (Simplified Export)

---

## 📋 Overview

Enhance the existing export/import system with:

1. **Smart backup reminders** based on configurable schedule
2. **Google Drive integration** for cloud backups (optional, no backend)
3. **Simplified export flow** with platform-aware defaults
4. **Secure OAuth** with proper token management and account unlinking

---

## 🎯 Goals

- ✅ Encourage regular backups without being intrusive
- ✅ Provide optional cloud backup for users who want it
- ✅ Maintain privacy-first, no-backend architecture
- ✅ Keep export/import flows simple and intuitive
- ✅ Ensure secure OAuth token handling
- ✅ Give users full control over Google account linking

---

## 📊 High-Level Changes Summary

### **1. Export Flow Changes**

**Current State:**

- Export dialog with date range filters
- CSV and JSON formats
- Only downloads to device

**New State:**

- Platform-aware defaults:
  - **Mobile/Default:** Download to device
  - **Optional:** Export to Google Drive
- Format logic:
  - **Device export:** JSON (default) or CSV
  - **Drive export:** JSON only (since only JSON can be imported)

### **2. Import Flow Changes**

**Current State:**

- Import JSON files from device
- Override existing data

**New State:**

- Import JSON from device (unchanged)
- Future: Import from Google Drive (auto-detect latest backup)
- Maintain override options

### **3. New: Backup Reminder System**

- Track last backup timestamp in IndexedDB
- User-configurable reminder schedule:
  - **Never** (opt-out)
  - **Daily** — banner on first app open each day
  - **Weekly** — banner on first app open on a chosen day of the week (e.g. every Sunday)
  - **Monthly** — banner on first app open on a chosen day of the month (e.g. 1st of every month)
- Show non-intrusive banner only once per qualifying day (not on every open)
- Quick action: "Backup Now" button launches export dialog
- Can dismiss (snooze to next scheduled day) or change schedule
- Track "banner last shown date" separately from "last backup date"

### **4. New: Google Drive Integration**

- OAuth 2.0 authentication (pure client-side, no backend)
- User selects their own Drive folder for backups (full visibility and control)
- Folder selection remembered, can be changed anytime
- Upload always as JSON (`extrack-backup-YYYY-MM-DD.json`)
- Store OAuth tokens in IndexedDB
- Token auto-refresh handling (access token: ~1hr, refresh token: long-lived)
- Account management: View status, change folder, unlink account
- Graceful fallback to device export if Drive or auth fails

**🔒 Future Scope: Client-Side Encryption**

- Encrypt backup JSON locally using Web Crypto API before upload (Explore other AES etc ways.)
- Zero knowledge
- Only the user can decrypt (key derived from a user-defined passphrase or device key)
- Even if Google Drive is compromised/leaked, data is unreadable
- Decrypt locally on import (no server involved)
- Requires user-selected folder (not `appDataFolder`) so user can manage encrypted files
- Incremental: encryption layer added on top of existing Drive upload

---

## 🔐 Security Requirements

### **OAuth Token Management**

1. **Storage:**
   - Store access token + refresh token in IndexedDB (or localStorage)
   - Plaintext storage for now (IndexedDB is sandboxed per-origin, HTTPS-only)
   - Never log tokens or expose to any server
   - Future: Encrypt tokens with Web Crypto API if threat model warrants it

2. **Token Lifecycle:**
   - **Access token:** Valid for **~1 hour** (3600 seconds)
   - **Refresh token:** **Long-lived** — no expiry unless user revokes app access or Google revokes it
   - Before every Drive API call, check if access token is expired
   - If expired: silently fetch new access token using refresh token (no popup)
   - If refresh token invalid/revoked: prompt user to re-authenticate
   - Clear all tokens on unlink

3. **Minimal Exposure:**
   - Tokens only used for Drive API calls
   - HTTPS-only (PWA requirement enforces this)
   - Direct `fetch()` calls to Google APIs, no third-party library with token access
   - Use `Authorization: Bearer {accessToken}` header only
   - Tokens never sent anywhere except `googleapis.com`

4. **User Control:**
   - Clear "Unlink Google Account" button in More > Settings
   - Show connected account info: email, selected folder, last backup date
   - On unlink: revoke token via Google's revocation endpoint, then clear from IndexedDB
   - Unlinking does NOT delete existing backups from Drive (user owns those files)
   - Prompt for re-authentication if refresh token is invalid

### **Public Client & `client_secret` Tradeoff**

> **Why is `client_secret` in the frontend bundle — and is that okay?**

This app has no backend. All code is deployed to Netlify and runs in the browser. `VITE_*` variables are baked into the JS bundle at build time, meaning `client_secret` is effectively public to anyone who inspects the bundle.

**Google's OAuth client types and what they actually mean:**

| Client Type     | Secret confidentiality                 | Allowed redirect URIs          |
| --------------- | -------------------------------------- | ------------------------------ |
| Desktop App     | Non-secret (Google says so explicitly) | `localhost` / `127.0.0.1` only |
| Web Application | Intended for server-side               | Any HTTPS URI you register     |

Both types require `client_secret` to be sent in token exchange requests. Neither type provides actual secret confidentiality in a purely client-side app — the Desktop type just makes it official that the secret isn't secret. **PKCE is the actual security mechanism**, not the secret.

**What can an attacker do with the exposed `client_secret`?**

- Token exchange requires a valid `code` — only issued to registered redirect URIs. An attacker cannot generate one.
- Even with an intercepted `code` (e.g., via network attack), they also need the `code_verifier` stored in `sessionStorage`, which requires XSS or physical device access.
- With XSS access, they already have the issued tokens from IndexedDB — the `client_secret` is irrelevant at that point.

**Conclusion:** For a no-backend SPA, embedding `client_secret` in the bundle is an accepted and documented tradeoff (see [RFC 8252](https://www.rfc-editor.org/rfc/rfc8252), [RFC 9700](https://www.rfc-editor.org/rfc/rfc9700)). Use a **Web application client** (not Desktop) so staging/production redirect URIs can be registered. Rotate the secret via Netlify env vars if ever needed.

**Client configuration:**

| Environment   | OAuth Client                    | Registered Redirect URIs                                                                                                                            |
| ------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dev + Staging | `Extrack Dev/Staging` (Web app) | `http://localhost:3000/oauth/callback`, `http://localhost:4173/oauth/callback`, `https://staging--gamma-expense-tracker.netlify.app/oauth/callback` |
| Production    | `Extrack Production` (Web app)  | `https://extrack.madhukm.com/oauth/callback`                                                                                                        |

### **XSS Hardening via Content Security Policy**

The primary practical risk in a no-backend SPA is XSS — an injected script that reads IndexedDB tokens and exfiltrates them to an attacker's server.

**How CSP mitigates this:**

- **`connect-src`** is the critical directive. It restricts where `fetch()` / `XHR` / `WebSocket` calls can go. If an XSS payload tries to POST stolen tokens to `https://attacker.com`, the browser blocks it — the domain isn't in the allowlist.
- **`script-src 'self'`** prevents external scripts from being injected via DOM manipulation.
- **`frame-ancestors 'none'`** prevents clickjacking (embedding the app in an attacker's iframe).

CSP does **not** prevent XSS from occurring (that's React's job via proper rendering), but it severely limits what an attacker can do if it does occur. A `connect-src`-locked app means an attacker can only exfiltrate data to `googleapis.com`, which doesn't help them.

**CSP is implemented via `netlify.toml` headers** — see the `netlify.toml` in the project root.

`style-src 'unsafe-inline'` is required for Radix UI / shadcn components which inject inline styles for dynamic positioning (dialogs, tooltips, etc.). CSS injection is a much lower-severity risk than script injection and cannot directly steal tokens.

### **Mobile Browser Extension Threat Model**

**Summary: PWA standalone mode eliminates the extension attack surface.**

When users install the app to their home screen (PWA), it opens in a standalone container — not a browser tab. Extensions are a browser feature. They do not run in standalone PWA mode on any major platform:

| Platform                   | Browser extension support | Standalone PWA mode                  | Extensions in PWA? |
| -------------------------- | ------------------------- | ------------------------------------ | ------------------ |
| iOS (Safari)               | Yes (since iOS 15)        | WKWebView standalone                 | ❌ No              |
| Android (Chrome)           | No extension support      | Standalone Chrome context            | ❌ No              |
| Android (Firefox)          | Yes (full add-on support) | Firefox does not support PWA install | N/A                |
| Android (Samsung Internet) | Limited (ad blockers)     | Standalone mode                      | ❌ No              |

**Conclusion for this app's users (mobile PWA installs):** Once installed to home screen, the browser extension attack surface is fully eliminated. This is a genuine security benefit of the PWA delivery model, additional to the typical UX arguments.

**Can you actively block extensions from running on a web page?** No — there is no web standard for this. Only the OS/browser sandbox controls it. For users accessing the app via a normal browser tab, extensions can run. The mitigation is:

1. The PWA install flow (already implemented) moves users out of the browser tab context
2. CSP's `connect-src` limits exfiltration even if a malicious extension runs
3. There is no known practical attack using extensions against a CSP-locked, PKCE-protected OAuth flow for a `drive.file`-scoped app

---

## 🎨 User Flows

### **Flow 1: Backup Reminder (Scheduled Day, First App Open)**

```
User setting: Reminder = Weekly, every Sunday
    ↓
User opens app on a Sunday for the first time that day
    ↓
App checks: Is today a reminder day? → Yes (Sunday)
App checks: Has banner already shown today? → No
    ↓
Banner appears at top:
  "Your weekly backup is due. Last backup: 7 days ago."
  [Backup Now]  [Dismiss]  [Settings]
    ↓
User clicks "Backup Now"
    ↓
Export dialog opens:
  - Format: JSON ● (default)  CSV ○
  - Save to: This Device ● (default)  Google Drive ○
    ↓
User clicks "Export"
    ↓
File downloads to device
    ↓
Last backup timestamp updated in IndexedDB
Banner-shown-today flag set
Banner dismissed
```

### **Flow 1b: Reminder Already Shown Today**

```
User closes and reopens app later on same Sunday
    ↓
App checks: Has banner already shown today? → Yes
    ↓
No banner shown — single reminder per qualifying day
```

### **Flow 2: Export to Google Drive (First Time)**

```
User clicks "Export" in More section
    ↓
Export dialog opens:
  - Format: JSON ● (forced, CSV not available for Drive)
  - Save to: This Device ○  Google Drive ●
    ↓
User selects "Google Drive" → Format locks to JSON
    ↓
User clicks "Export"
    ↓
No Google account linked yet:
→ Google OAuth popup appears
→ User signs in and grants Drive permission
→ Google Picker appears — user selects or creates folder
   (e.g. "My Drive/Expense Tracker Backups/")
→ Folder ID + access token stored in IndexedDB
    ↓
File uploaded: extrack-backup-2026-03-02.json
    ↓
Success toast: "Backup saved to Google Drive ✓"
  [View in Drive ↗]
    ↓
Last backup timestamp updated
```

### **Flow 3: Export to Google Drive (Already Linked)**

```
User clicks "Export" in More section
    ↓
Export dialog opens:
  Drive option shows: "Connected as user@gmail.com"
  Folder: "My Drive / Expense Tracker Backups"
  [Change Folder]
    ↓
User selects "Google Drive", clicks "Export"
    ↓
App checks access token — expired?
  → Yes: silently refresh using refresh token (no popup)
  → No: proceed directly
    ↓
File uploads: extrack-backup-2026-03-02.json
    ↓
Success toast: "Backup saved to Google Drive ✓"
  [View in Drive ↗]
```

### **Flow 4: Unlink Google Account**

```
User navigates to More > Settings
    ↓
Sees "Google Drive: Connected as user@gmail.com"
    ↓
Clicks "Unlink Account"
    ↓
Confirmation dialog:
  "Unlinking will not delete existing backups in your Drive.
   You can reconnect anytime."
    ↓
User confirms
    ↓
Token revoked via Google API
    ↓
Tokens cleared from IndexedDB
    ↓
Success: "Account unlinked"
```

---

## 🛠️ Technical Approach

### **No Backend Required**

- All OAuth handled client-side using Google Identity Services
- Tokens stored in browser (IndexedDB)
- Direct REST API calls to Google Drive API v3
- No proxy server, no Firebase, no cloud functions

### **Google Cloud Setup (One-Time)**

1. Create project in Google Cloud Console
2. Enable [Google Drive API](https://console.cloud.google.com/marketplace/product/google/drive.googleapis.com)
3. Create OAuth 2.0 Client ID (Web application)
4. Configure authorized JavaScript origins:
   - `https://yourdomain.com`
   - `http://localhost:4173` (for dev)
5. No billing/payment required

### **Libraries Used**

```json
{
  "dependencies": {
    "gapi-script": "^1.2.0", // Google API client
    "jose": "^5.2.0" // JWT decoding (token validation)
  }
}
```

Or use Google's CDN (no npm package):

```html
<script src="https://accounts.google.com/gsi/client"></script>
<script src="https://apis.google.com/js/api.js"></script>
```

### **Drive API Permissions**

- Scope: `https://www.googleapis.com/auth/drive.file`
  - ✅ Access only to files **created by this app** — cannot read/list other Drive files
  - ✅ Allows user-selected folder (unlike `drive.appdata` which is app-only hidden folder)
  - ✅ Least-privilege scope that meets our needs
- Files created: Only accessible by this app (unless user shares them)
- No access to any pre-existing Drive files
- User sees the permission request clearly in the OAuth consent screen

> **Why not `drive.appdata`?** That scope uses a hidden folder inaccessible to the user, which conflicts with our goal of giving users full visibility and control over their backups, and blocks the future client-side encryption use case.

---

## 📦 Implementation Phases

### **Phase 1: Backup Reminder System** ⭐ (Active)

**Effort:** 2-3 hours  
**Goal:** Prompt users to back up on their preferred schedule

**Data Model:**

```typescript
interface BackupSettings {
  reminderSchedule: "never" | "daily" | "weekly" | "monthly"; // Weekly means every Monday. Monthly means the 1st of every month
  lastBackupDate: string | null; // ISO date string
  bannerLastShownDate: string | null; // ISO date string — prevents repeat same day
}
```

**Reminder Trigger Logic:**

```typescript
function shouldShowReminderBanner(settings: BackupSettings): boolean {
  if (settings.reminderSchedule === "never") return false;

  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");

  // Don't show again if already shown today
  if (settings.bannerLastShownDate === todayStr) return false;

  switch (settings.reminderSchedule) {
    case "daily":
      return true; // Always show on first open of the day
    case "weekly":
      return today.getDay() === settings.weeklyDay;
    case "monthly":
      return today.getDate() === settings.monthlyDay;
  }
}
```

**Tasks:**

- [ ] Add `BackupSettings` schema to IndexedDB (or localStorage)
- [ ] Implement `shouldShowReminderBanner()` logic
- [ ] Create `BackupReminderBanner` component (dismissible, non-blocking)
- [ ] Add "Backup Reminders" section to More > Settings:
  - Schedule selector: Never / Daily / Weekly / Monthly
  - Day-of-week picker (shown only if Weekly)
  - Day-of-month picker (shown only if Monthly)
  - "Last backed up: X days ago" info line
- [ ] Update export flow to record `lastBackupDate` after every successful export
- [ ] Update `bannerLastShownDate` whenever banner is displayed
- [ ] Test all 4 schedule modes and edge cases (e.g. monthlyDay > 28)

### **Phase 2: Simplified Export Flow** ⭐ (Active)

**Effort:** 2-3 hours  
**Goal:** Cleaner export UX with correct defaults

**New Export Dialog Spec:**

```
┌─────────────────────────────────────┐
│  Export Backup                      │
├─────────────────────────────────────┤
│  Format:                            │
│  ● JSON  (recommended, importable)  │
│  ○ CSV   (view-only, spreadsheets)  │
│           [disabled if Drive]       │
│                                     │
│  Save to:                           │
│  ● This Device                      │
│  ○ Google Drive                     │
│    (connect in Settings first)      │
│                                     │
│         [Cancel]  [Export]          │
└─────────────────────────────────────┘
```

**Filename convention:** `extrack-backup-YYYY-MM-DD.json`

**Tasks:**

- [ ] Remove date range filters from `ExportDialog` component
- [ ] Set JSON as default selected format
- [ ] Disable CSV option when Google Drive is selected
- [ ] Remove "Scope" selector (always export all data)
- [ ] Remove attachment checkbox from export (simplify)
- [ ] Update export filename to `extrack-backup-{date}.json`
- [ ] Confirm Analysis page retains its own date range filter (no change there)
- [ ] Update `ImportData` component to clarify JSON-only import

### **Phase 3: Google Drive Integration** (Next — Medium Priority)

**Effort:** 8-12 hours  
**Goal:** Optional cloud backup with user-controlled folder

**Tasks:**

- [ ] Google Cloud Console: create project, enable Drive API, set up OAuth Client ID
- [ ] Implement OAuth flow using Google Identity Services (client-side only)
- [ ] Add Google Picker API for user to select/create Drive folder
- [ ] Store `{ accessToken, refreshToken, expiresAt, folderID, accountEmail }` in IndexedDB
- [ ] Implement token expiry check + silent refresh before every upload
- [ ] Implement `uploadToDrive(blob, filename, folderID)` using Drive API v3 REST
- [ ] Add Google Drive option to simplified export dialog (Phase 2)
- [ ] Add Google Drive section to More > Settings:
  - Connection status (email, folder path)
  - "Change Folder" button (re-opens Picker)
  - "Unlink Account" button with confirmation
- [ ] Implement unlink: revoke token via Google revocation endpoint + clear IndexedDB
- [ ] Add error handling: offline, token invalid, quota exceeded, folder deleted
- [ ] Ensure Drive export also updates `lastBackupDate` (Phase 1 integration)
- [ ] Test token auto-refresh (wait ~1hr or force expiry)
- [ ] Test offline behavior (graceful failure message)

### **Phase 4: Client-Side Encryption (Future Scope)**

**Effort:** 6-8 hours  
**Goal:** Zero-knowledge backups — even Google cannot read exported files

- Encrypt JSON locally using Web Crypto API (AES-GCM) before Drive upload
- Key derived from user passphrase (PBKDF2)
- Encrypted file uploaded to user-selected Drive folder
- On import: detect encrypted file, prompt passphrase, decrypt locally
- No passphrase stored anywhere — user is responsible
- Works for device export too (optional encrypted local backup)

### **Phase 5: Import from Drive** (Future Scope)

**Effort:** 4-6 hours  
**Goal:** Convenient restore from cloud backup

- [ ] List files from user's selected Drive folder
- [ ] Show backup list with date and size
- [ ] Download and import selected backup
- [ ] Handle encrypted backups (Phase 4 integration)

### **Phase 4: Import from Drive** (Low Priority, Future)

**Effort:** 4-6 hours  
**Goal:** Convenient restore from cloud

- [ ] List backups from Drive
- [ ] Download and import selected backup
- [ ] Auto-detect latest backup
- [ ] Show backup metadata (date, size)

---

## ✅ Validation Checklist

Before implementation, confirm:

- [ ] **Export defaults correct:** Device (with CSV) vs Drive (JSON only)
- [ ] **Import remains JSON-only** from device
- [ ] **No backend infrastructure** required or added
- [ ] **OAuth flow is simple** (minimal steps, clear UI)
- [ ] **Tokens stored securely** (IndexedDB + encryption)
- [ ] **Token leak risk minimized** (no logging, HTTPS only, scoped permissions)
- [ ] **User can unlink** Google account anytime
- [ ] **Graceful degradation** if OAuth fails
- [ ] **Works offline** (except Drive upload, obviously)
- [ ] **Privacy maintained** (no tracking, scoped Drive access)

---

## ✅ Decisions Log

| #   | Question                  | Decision                                                                                                                           |
| --- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Backup filename           | `extrack-backup-YYYY-MM-DD.json`                                                                                                   |
| 2   | Reminder behavior         | Once per qualifying day (daily/weekly/monthly/never), configurable by user                                                         |
| 3   | Drive folder              | **User-selected folder** via Google Picker (not `appDataFolder`)                                                                   |
| 4   | Token storage             | IndexedDB plaintext for now                                                                                                        |
| 5   | Token lifetime            | Access token: ~1hr; Refresh token: long-lived (until revoked)                                                                      |
| 6   | File encryption           | Future scope (Phase 4) — AES-GCM via Web Crypto API, user passphrase                                                               |
| 7   | Multiple backups          | User-managed in their chosen folder; no auto-cleanup by app                                                                        |
| 8   | CSV for Drive             | Not supported — Drive is JSON only; CSV available for device export                                                                |
| 9   | Import source             | Device (JSON only), Drive import is future scope (Phase 5)                                                                         |
| 10  | Active phases             | Phase 1 (reminders) + Phase 2 (export UX) first                                                                                    |
| 11  | OAuth client type         | **Web application** client (not Desktop) — PKCE works identically; Web client allows staging/prod HTTPS redirect URIs              |
| 12  | `client_secret` in bundle | Accepted tradeoff for no-backend SPA (RFC 8252/9700). PKCE is the real security. Rotate via Netlify env vars if needed.            |
| 13  | XSS hardening             | CSP via `netlify.toml` — `connect-src` limits exfiltration; `script-src 'self'` blocks injected scripts                            |
| 14  | Mobile extensions         | PWA standalone mode eliminates extension attack surface on iOS and Android Chrome. CSP is residual defence for browser-tab access. |

---

## 🎯 Success Metrics

- Users back up data regularly (track backup frequency)
- Reduced data loss reports
- Optional Drive integration doesn't complicate basic flow
- No security incidents related to OAuth tokens
- Users feel in control of their data

---

## 📝 Next Steps

1. ✅ ~~Review plan and confirm approach~~
2. ✅ ~~Answer open questions~~
3. ✅ ~~Prioritize phases~~
4. **Implement Phase 1** — Backup reminder system + BackupSettings UI
5. **Implement Phase 2** — Simplified export dialog
6. Test Phase 1 + 2 together end-to-end
7. Plan Phase 3 (Drive integration) after Phase 1+2 are stable

---

**Spec confirmed. Ready to implement Phase 1 + Phase 2.**
