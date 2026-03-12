# Plan: E2EE Backup Encryption

## Decisions Made

- Passphrase stored in idb-keyval (same "expense-tracker-drive" store, key: "encryption-passphrase")
- Backup = ALWAYS encrypted (no toggle). Block if no passphrase setup.
- Export = optional checkbox, DEFAULT UNCHECKED. Both JSON and CSV can be encrypted.
- Encrypted file extension: `.extrack`
- Wrong passphrase = clear user-friendly error (AES-GCM auth tag detection)
- Passphrase change: heavy friction dialog + warning that old files WON'T be re-encrypted
- Algorithm: AES-GCM 256 + PBKDF2-SHA256 (600,000 iterations) — pure Web Crypto API, zero new packages

## Encrypted File Format (.extrack)

```json
{
  "format": "extrack-encrypted-backup",
  "version": "1",
  "algorithm": "AES-GCM",
  "kdf": "PBKDF2-SHA256",
  "iterations": 600000,
  "salt": "<base64url-16bytes>",
  "iv": "<base64url-12bytes>",
  "ciphertext": "<base64url>"
}
```

The stored JSON is self-describing and forward-compatible (iterations are stored per-file).

## Components & Files

### Phase 1 — Encryption engine in backup.ts

Add to src/lib/backup.ts:

- `getStoredPassphrase(): Promise<string | null>` — reads from idb-keyval
- `storePassphrase(passphrase: string): Promise<void>` — saves to idb-keyval
- `clearPassphrase(): Promise<void>` — for factory reset
- `encryptData(plaintext: string): Promise<string>` — derives key from stored passphrase, encrypts, returns .extrack JSON string
- `decryptData(encryptedJson: string, passphrase?: string): Promise<string>` — uses stored passphrase or provided one, throws on wrong key
- `isEncryptedFile(content: string): boolean` — checks `format` field

### Phase 2 — EncryptionSettings component (new file)

src/components/more/EncryptionSettings.tsx:

- No passphrase state: setup form (passphrase + confirm)
- Active state: masked display (●●●●●●) + eye toggle + "Change Passphrase" button
- Change flow: friction dialog → current passphrase verify → new passphrase + confirm → warning about old files

### Phase 3 — BackupData.tsx

- Before backup: check `getStoredPassphrase()` → if null, open passphrase setup dialog
- After JSON assembly: call `encryptData(json)` → save as filename.extrack
- Remove any plaintext pathway

### Phase 4 — ExportData.tsx

- Add "Encrypt this export" checkbox (default unchecked)
- When checked: call `encryptData(content)` regardless of format (JSON or CSV), save as .extrack
- When unchecked: existing behaviour unchanged
- When encrypt is checked and no passphrase set: prompt setup inline

### Phase 5 — ImportData.tsx

- Accept `.extrack` files ONLY (remove `.json` — all importable backups are now encrypted)
- After file read: try `getStoredPassphrase()` → auto-decrypt silently; if null, show manual passphrase input field
- After successful decryption: detect if content is JSON or CSV
  - If CSV (doesn't start with `{`): show "This file is an encrypted export, not a restorable backup" error and clear selection
  - If JSON: pass to existing JSON parse + preview flow
- Map AES-GCM decryption failure → "Wrong passphrase — try again" toast; keep file loaded so user can retry without re-selecting

### Phase 6 — DataManagementPage.tsx

- Add `<EncryptionSettings />` card above the Backup card

## Relevant Files

- src/lib/backup.ts — encryption engine goes here
- src/components/more/BackupData.tsx — always-encrypt pathway
- src/components/more/ExportData.tsx — optional encrypt checkbox
- src/components/more/ImportData.tsx — encrypted file detection + passphrase prompt
- src/components/more/EncryptionSettings.tsx — NEW: passphrase setup/view/change UI
- src/pages/DataManagementPage.tsx — add EncryptionSettings card
- src/db/driveCredentials.ts — reuse store, do NOT modify file (just import createStore)

## Factory Reset

- FactoryReset.tsx should call clearPassphrase() during full wipe

## Verification

1. Encrypt a backup, open the .extrack file — confirm it's unreadable JSON
2. Import the .extrack — should auto-decrypt and show preview
3. Import with wrong passphrase — should show "Wrong passphrase" error
4. Import on "new device" (clear passphrase from IndexedDB) — should show manual passphrase input
5. Export CSV with encrypt checked — confirm .extrack file, decrypt to get CSV bytes
6. Export CSV with encrypt unchecked — plain .csv as always
7. Change passphrase — try importing an old backup with new passphrase: should fail correctly
8. Backup without passphrase set — should block and open setup flow
