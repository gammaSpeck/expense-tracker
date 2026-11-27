<div align="center">

# 💸 ExTrack

### Your money. Your device. Your rules.

**The privacy-first expense tracker that lives entirely in your browser : no accounts, no subscriptions, no surveillance.**

[![Live Demo](https://img.shields.io/badge/🌐%20Live%20Demo-extrack.madhukm.com-25D7AD?style=for-the-badge)](https://extrack.madhukm.com)
[![GitHub Stars](https://img.shields.io/github/stars/gammaSpeck/expense-tracker?style=for-the-badge&logo=github&color=yellow)](https://github.com/gammaSpeck/expense-tracker)

---

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](../../LICENSE)
[![Vite](https://img.shields.io/badge/Built%20With-Vite-646cff)](https://vitejs.dev/)
[![React 18](https://img.shields.io/badge/React-18.3.1-61dafb)](https://react.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/TailwindCSS-v4-38bdf8)](https://tailwindcss.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-ff9800)](https://web.dev/progressive-web-apps/)
[![Open Source](https://img.shields.io/badge/Open%20Source-❤️-red)](https://github.com/gammaSpeck/expense-tracker)

</div>

<!-- 🎥 GIF: Hero overview : 15–20 second tour of the app: home page with expense list, tapping Add, filling the form, seeing the dashboard update, then swiping to the Analysis page showing charts -->

---

## 😤 The Problem With Every Other Expense App

You open the App Store. You find a nice expense tracker. You tap install.

Then it asks you to **create an account**. Fine. Then it wants access to your contacts "to help you split bills." Sure. Then there are ads between every swipe. Oh, and the premium tier is $8/month to unlock CSV export. And six months later you find out they sold your spending patterns to a data broker.

**Sound familiar?**

> Most expense apps treat _you_ as the product. Your spending habits are valuable data, and they know it.

ExTrack does exactly none of that.

- ❌ No account required : not even an email address
- ❌ No server : there is no backend. Literally.
- ❌ No ads, no trackers, no telemetry whatsoever
- ❌ No App Store or Play Store needed
- ✅ All your data lives in **your** browser, on **your** device, under **your** control

---

## 🚀 What is ExTrack?

> **ExTrack** is a privacy-first, fully offline, installable PWA (Progressive Web App) for tracking and analysing your personal expenses. It captures where your money goes, shows you rich visual insights, and backs up your data with military-grade encryption : all without ever sending a single byte to any server.

- **⚡ Capture fast** : Smart suggestions, tags, categories, and receipt photos make logging take seconds
- **📊 See the story** : Beautiful charts, monthly summaries, and trend lines reveal your spending patterns at a glance
- **🔒 Truly private** : 100% offline-first; all data in your browser's IndexedDB, never transmitted anywhere
- **🌍 Run anywhere** : iOS, Android, Windows, macOS, Linux : if it has a modern browser, ExTrack runs on it
- **🛡️ Backup safely** : End-to-end encrypted backups to your device or Google Drive; even Google can't read them
- **🆓 Forever free & open source** : MIT licensed, no paywalls, no premium tier, no gotchas

---

## 🎬 Key Experiences

### 1 : ⚡ Logging Expenses & Organising With Categories + Tags

<!-- 🎥 Video: Logging flow (exp1.mp4) -->
<div style="max-width:400px;margin:12px auto;">
  <video controls muted loop style="width:100%;height:auto;border-radius:8px;box-shadow:0 6px 18px rgba(4,7,12,0.15);">
    <source src="./assets/exp1.mp4" type="video/mp4">
    Your browser does not support the video tag. Download the video: <a href="./assets/exp1.mp4">exp1.mp4</a>
  </video>
</div>

Logging an expense takes **under 10 seconds** : and ExTrack actively helps you do it faster every time.

| Feature                      | What it does                                                                     |
| ---------------------------- | -------------------------------------------------------------------------------- |
| **Description autocomplete** | Suggests past expense descriptions as you type (fuzzy matching, top 10 results)  |
| **Tag suggestions**          | Frequency-ranked suggestions filtered to what you haven't added yet              |
| **Category quick-create**    | Create a new category without leaving the expense form                           |
| **Smart defaults**           | Pre-fills current date & time; remembers your most-used categories               |
| **Receipt photos**           | Attach a photo directly from your camera or gallery (compressed, stored locally) |

**Categories** are fully yours : pick from 100+ Lucide icons, choose any of 36 hand-picked colours, and name them whatever makes sense to you. **Tags** come with their own stats: how many expenses use each tag, when it was last used, and bulk rename/delete across all expenses.

Up to **4 tags per expense** keeps things organised without turning into chaos.

---

### 2 : 📊 Analysis, Charts & Spending Trends

<!-- 🎥 GIF: Analysis flow : Navigate to the Analysis tab. Show the period selector (Week → Month → Year). Navigate forward/backward with the arrows while watching the pie chart update live. Tap a pie segment to highlight it in the legend. Switch to Bar chart view. Scroll down to the Spending Trend section : show the line chart animating. Toggle the "Exclude ad-hoc expenses" switch and watch the totals update. Tap the Export button and show the CSV/JSON options. -->

<div style="max-width:400px;margin:12px auto;">
  <video controls muted loop style="width:100%;height:auto;border-radius:8px;box-shadow:0 6px 18px rgba(4,7,12,0.15);">
    <source src="./assets/exp2.mp4" type="video/mp4">
    Your browser does not support the video tag. Download the video: <a href="./assets/exp2.mp4">exp2.mp4</a>
  </video>
</div>

The Analysis page turns your raw spending data into a **story you can actually understand**.

#### Period Selection & Navigation

Choose **Week**, **Month**, **Year**, or a **Custom date range**. Use the ← → arrows to navigate through time : watch your charts update live as you move between periods.

#### Category Breakdown

- 🥧 **Pie chart** : instant visual split of where money went
- 📊 **Bar chart** : compare categories side by side
- Percentage distribution, total amount, and transaction count per category
- Click any segment to highlight it

#### Spending Trend

- 📈 **Line chart** with smart granularity : shows daily data for a week, weekly for a month, monthly for a year
- See exactly when in the month you tend to overspend

#### Summary Metrics

**Total spend · Transaction count · Average expense · Top category** : all at a glance, updating with your period selection.

#### Ad-hoc Expense Toggle

Mark one-off purchases (gifts, medical emergencies, flights) as **ad-hoc** at logging time. Toggle them out of the analysis view to see your _regular_ spending baseline : not a distorted snapshot from that trip to the dentist.

#### Export Directly From Analysis

Hit **Export** right from the analysis view : get a CSV or JSON of the filtered data you're looking at.

---

### 3 : 🔐 E2EE Backup via Google Drive & Restore on Any Device

<div style="max-width:400px;margin:12px auto;">
  <video controls muted loop style="width:100%;height:auto;border-radius:8px;box-shadow:0 6px 18px rgba(4,7,12,0.15);">
    <source src="./assets/exp3.mp4" type="video/mp4">
    Your browser does not support the video tag. Download the video: <a href="./assets/exp3.mp4">exp3.mp4</a>
  </video>
</div>

This is the feature that makes ExTrack genuinely special.

**Your backups are encrypted before they ever leave your device.** Not "encrypted in transit." Not "encrypted at rest on our servers." Encrypted _in your browser_, using your passphrase, before the file is written anywhere. Not even a Google employee, or us can read it.

#### The Encryption Stack

| Component              | Detail                                                                                                                                   |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Cipher**             | AES-GCM 256-bit (authenticated encryption : tampering is detected)                                                                       |
| **Key derivation**     | PBKDF2-SHA256 with **600,000 iterations** (brute-force infeasible)                                                                       |
| **Implementation**     | Pure browser-native [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) : zero third-party crypto packages |
| **Passphrase storage** | Stored only in _your_ IndexedDB; never transmitted, logged, or accessible to anyone else                                                 |

#### The `.extrack` File Format

Every backup is saved as a `.extrack` file, a self-describing JSON envelope:

```json
{
  "format": "extrack-encrypted-backup",
  "version": "2",
  "algorithm": "AES-GCM",
  "kdf": "PBKDF2-SHA256",
  "iterations": 600000,
  "salt": "<base64url : 16 bytes>",
  "iv": "<base64url : 12 bytes>",
  "ciphertext": "<base64url>",
  "check": "<base64url>"
}
```

Algorithm parameters are stored _per file_ so future upgrades never break your old backups.

#### Google Drive Integration (No Backend Required)

- **PKCE OAuth 2.0** : the login is between you and Google. ExTrack never sees your Google credentials.
- Scope: **`drive.file` only** : the app can only access files it created, nothing else in your Drive
- Auto-creates an `ExTrack Backups` folder on first use
- Same-day backups replace the previous file (no duplicates building up)
- **Access tokens auto-refresh silently** : no repeated login prompts
- Unlink at any time; your Drive files are not deleted

#### Restore on Any Device

Move to a new phone? Reinstall the app? Just:

1. Import your `.extrack` file
2. Enter your passphrase (auto-filled if stored on this device)
3. Preview: _"312 expenses, 8 categories, Jan 2025 → Mar 2026"_
4. Choose **Override** (replace everything) or **Merge** (add to existing data, skip duplicates)
5. Done. Your data is back.

---

### 4 : 📱 Install as a PWA : No App Store. No Play Store. Just a Browser.

<!-- 🎥 GIF: PWA install flow : On mobile Chrome (Android): open https://extrack.madhukm.com, show the "Add to Home Screen" / install banner appearing. Tap Install. Watch the app icon appear on the home screen. Launch it from the home screen : show it opens in standalone mode (no browser chrome). Go offline (enable airplane mode), refresh : app still works perfectly. On desktop Chrome: show the install icon in the address bar, click it, the app opens as a standalone window. -->

<div style="max-width:400px;margin:12px auto;">
  <video controls muted loop style="width:100%;height:auto;border-radius:8px;box-shadow:0 6px 18px rgba(4,7,12,0.15);">
    <source src="./assets/exp4.mp4" type="video/mp4">
    Your browser does not support the video tag. Download the video: <a href="./assets/exp4.mp4">exp4.mp4</a>
  </video>
</div>

ExTrack is a **Progressive Web App** : which means it installs and runs like a native app without going anywhere near an app store.

| Platform                     | How to install                                                              |
| ---------------------------- | --------------------------------------------------------------------------- |
| **Android (Chrome)**         | Tap the "Add to Home Screen" banner or the install icon in the browser menu |
| **iOS (Safari)**             | Tap Share → "Add to Home Screen"                                            |
| **Desktop (Chrome / Edge)**  | Click the install icon in the address bar                                   |
| **Any other modern browser** | Works perfectly as a browser tab : install is optional                      |

**Why this is a big deal:**

- 🚫 No App Store review process : updates ship the moment they're deployed
- 🚫 No Play Store : no region restrictions, no approval delays
- ✅ Works offline immediately after first load (Service Worker + Workbox caches everything)
- ✅ Launches in standalone mode : looks and feels like a native app
- ✅ When a new version ships, a non-intrusive "Update available" banner appears : tap to reload

> **"If it has a modern browser, it runs ExTrack."**
> Chrome, Firefox, Safari, Edge : on iOS, Android, Windows, macOS, Linux. All of them.

---

## 🔒 Privacy & Security: The Full Picture

ExTrack was designed from the ground up around one principle: **your financial data is yours alone**.

### Zero-Knowledge Architecture

| Claim             | Reality                                                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| No backend server | The app is pure static HTML/JS/CSS. There is no API, no database, no server to hack.                                                       |
| No accounts       | You never create a username or password with us. There's nothing to breach.                                                                |
| No telemetry      | Zero analytics, zero crash reporting, zero "anonymous usage data." Nothing is sent anywhere.                                               |
| No ads            | The app is open source and MIT licensed. There is no business model that monetises you.                                                    |
| IndexedDB storage | All expenses, categories, tags, and settings live in your browser's local IndexedDB. Clearing site data wipes it; you are in full control. |

### Backup Security In Depth

- **Backups are always encrypted** — the `.extrack` backup pathway has no plaintext option. Every backup file is encrypted in your browser before it is saved anywhere.
- **Exports are plaintext by choice** — the separate Export feature (CSV / JSON) gives you your raw data with no strings attached. It's your data, and you can take it wherever you want. Encryption is available as an opt-in for exports, but never forced.
- **AES-GCM is authenticated** : if anyone tampers with the file, decryption fails. You'll know.
- **600,000 PBKDF2 iterations** : at modern GPU speeds, brute-forcing a strong passphrase would take thousands of years.
- **The Web Crypto API is browser-native** : no third-party library means no supply-chain risk. The same crypto engine that banks use.
- **Google Drive scope is `drive.file`** : the app can only see files it created. It cannot browse or read any other file in your Drive.
- **OAuth tokens never leave your device** : stored in IndexedDB, only used for authenticated Drive API calls over HTTPS to `googleapis.com`.

### Data Lifecycle

- **Factory Reset** : one button wipes expenses, categories, tags, settings, passphrase, and OAuth tokens. IndexedDB is cleared completely. Default categories are re-seeded. A fresh start.

---

## 🌍 True Cross-Platform Freedom

Most apps are prisoners of their platform. iOS apps need App Store approval. Android apps need Play Store review. Desktop apps need installers and admin rights.

**ExTrack has none of those constraints.**

```
iOS Safari  ✅     Android Chrome ✅     Desktop Chrome ✅
Firefox     ✅     Safari macOS   ✅     Edge           ✅
```

Any device. Any OS. Any browser. Open `https://extrack.madhukm.com` and you're running the full app : no download, no install, no permission prompt from an app store gatekeeper.

Install it as a PWA in 10 seconds for the native-app experience. Or keep it as a browser tab. Either way, **all features work**, **offline works**, and your data never leaves the device.

When we ship an update, it goes live immediately : no waiting for App Store review, no forcing users to update, no version fragmentation. Everyone gets the latest version automatically.

---

## 🧰 Tech Stack

ExTrack is built on a modern, lean, open-source stack with deliberate choices at every layer.

| Layer               | Technology                                                                                                   | Why                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| **Build tool**      | [Vite](https://vitejs.dev/)                                                                                  | Sub-second HMR, optimised production bundles          |
| **UI framework**    | [React 18](https://react.dev/) (TypeScript)                                                                  | Concurrent features, strict type safety               |
| **Styling**         | [Tailwind CSS v4](https://tailwindcss.com/)                                                                  | CSS-first config, zero runtime                        |
| **UI components**   | [shadcn/ui](https://ui.shadcn.com/) + [Radix UI](https://www.radix-ui.com/)                                  | Accessible, unstyled primitives you own               |
| **Local database**  | [Dexie.js](https://dexie.org/)                                                                               | Elegant IndexedDB wrapper with reactive queries       |
| **Charts**          | [Recharts](https://recharts.org/)                                                                            | Composable, responsive SVG charts                     |
| **Animations**      | [Framer Motion](https://www.framer.com/motion/)                                                              | Smooth page transitions and microinteractions         |
| **Cryptography**    | Browser [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)                    | Native AES-GCM 256 : zero third-party crypto packages |
| **PWA**             | [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) + [Workbox](https://developer.chrome.com/docs/workbox/) | Service worker, offline caching, install prompt       |
| **Forms**           | [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)                                    | Performant forms with runtime validation              |
| **Icons**           | [Lucide React](https://lucide.dev/)                                                                          | 100+ consistent, accessible icons                     |
| **Date utils**      | [date-fns](https://date-fns.org/)                                                                            | Tree-shakeable, immutable date manipulation           |
| **Package manager** | [Bun](https://bun.sh/)                                                                                       | Blazing fast installs and scripts                     |

No backend. No database server. No cloud service. Statically deployable on any CDN.

---

## 🤝 Open Source & Contributing

ExTrack is **MIT licensed** : free to use, fork, modify, and distribute for any purpose.

[![GitHub](https://img.shields.io/badge/GitHub-gammaSpeck%2Fexpense--tracker-181717?logo=github)](https://github.com/gammaSpeck/expense-tracker)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](../../LICENSE)

Found a bug? Have a feature idea? Want to contribute?

→ **[Open an issue](https://github.com/gammaSpeck/expense-tracker/issues)**
→ **[Start a discussion](https://github.com/gammaSpeck/expense-tracker/discussions)**
→ **[Read the changelog](../../CHANGELOG.md)**

Pull requests are very welcome. If you believe privacy-first tools should be the norm, not the exception, so do we. ⭐ Star the repo if ExTrack earns it.

---

<div align="center">

**Built with 💚 for privacy, clarity, and financial freedom.**

[extrack.madhukm.com](https://extrack.madhukm.com) · [GitHub](https://github.com/gammaSpeck/expense-tracker) · [MIT License](../../LICENSE)

</div>
