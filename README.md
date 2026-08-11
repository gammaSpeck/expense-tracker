# 🚀 ExTrack - Expense Tracker PWA

[![Live Demo](https://img.shields.io/badge/🌐%20Live%20Demo-extrack.madhukm.com-25D7AD?style=flat-square)](https://extrack.madhukm.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Vite](https://img.shields.io/badge/Built%20With-Vite-blue)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-18.3.1-61dafb)](https://react.dev/)
[![Dexie.js](https://img.shields.io/badge/IndexedDB-Dexie.js-4.2.1-10b981)](https://dexie.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-4.1.18-38bdf8)](https://tailwindcss.com/)
[![PWA](https://img.shields.io/badge/PWA-Ready-ff9800)](https://web.dev/progressive-web-apps/)

---

## 🎉 Welcome!

**ExTrack** is a privacy-first, offline-friendly, installable PWA for tracking and analyzing your personal expenses. No accounts, no backend, just pure fun and financial freedom! 🌈💸

<!-- 🎥 GIF: Hero overview : 15–20s tour: home page with expense list, tap Add, fill the form, see the dashboard update, swipe to Analysis showing pie + trend charts -->

📖 **[View Full Project Showcase](docs/gtm/project-showcase.md)**

---

## 📦 Features

- **Offline-first**: All data stored locally in your browser (IndexedDB via Dexie.js)
- **Mobile & Desktop**: Responsive, touch-friendly UI
- **PWA**: Installable on any device, works offline
- **Dark Mode**: Default, with light/system toggle
- **Expense CRUD**: Add, edit, delete, duplicate expenses
- **Categories**: Customizable, color-coded, with icons
- **Tags**: Smart suggestions, usage stats, rename/delete
- **Charts & Analysis**: Pie/bar charts, monthly summaries
- **Export/Import**: CSV/JSON export, easy restore
- **Factory Reset**: Nuke all data (if you dare!)
- **Fun UI**: Modern, animated, accessible, and energetic

📖 **[View Complete Feature Documentation](docs/features/featureset.md)**

---

## 🖼️ Screenshots

<!-- Add screenshots/gifs here! -->
<p align="center">
  <img src="docs/screenshots/dashboard.png" alt="Dashboard" width="400" />
  <img src="docs/screenshots/add-expense.png" alt="Add Expense" width="400" />
  <img src="docs/screenshots/analysis.png" alt="Analysis" width="400" />
</p>

---

## 🚀 Quick Start

```bash
# 1. Clone the repo
$ git clone https://github.com/gammaSpeck/expense-tracker.git
$ cd expense-tracker

# 2. Install dependencies
$ bun install # or npm install / pnpm install

# 3. Start the dev server
$ bun run dev # or npm run dev / pnpm dev

# 4. Open http://localhost:4173 in your browser
```

## 🧪 Testing

E2E coverage via [Playwright](https://playwright.dev/), driving the real UI against a built
preview server (local) or a live deployment (staging/production).

**One-time setup:**

```bash
bun install
bunx playwright install --with-deps chromium chrome webkit
```

Brave is a separate manual install — `brave-mobile-pwa` is skipped automatically when it's
absent (no error, no config to touch).

**Run it:**

```bash
bun run test:e2e             # full suite, local build (chromium-desktop + brave/chrome/safari installed-PWA journeys)
bun run test:e2e:staging     # @smoke subset against staging
bun run test:e2e:production  # @smoke subset against production
```

**Environment variables:**

- `E2E_ENV` — `local` (default) | `staging` | `production`. Selects the base URL and whether a
  local `vite preview` server is spun up automatically.
- `E2E_BASE_URL` — override the resolved URL (e.g. a Netlify deploy-preview link).

---

## 🛠️ Tech Stack

- **Vite** (blazing fast dev/build)
- **React** (TypeScript)
- **shadcn/ui** (Radix UI primitives)
- **Tailwind CSS v4** (CSS-first config)
- **Dexie.js** (IndexedDB wrapper)
- **Lucide React** (icons)
- **Recharts** (charts)
- **date-fns** (date utils)
- **browser-image-compression** (attachments)
- **React Hook Form + Zod** (forms/validation)

---

## ✨ Roadmap

- [x] Expense CRUD
- [x] Category CRUD
- [x] Tag management
- [x] Charts & analysis
- [x] Export/import
- [ ] PWA support
- [ ] Multi-language support
- [ ] More themes
- [ ] Community features

---

## 🧑‍💻 Credits

- [Dexie.js](https://dexie.org/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Lucide Icons](https://lucide.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Vite](https://vitejs.dev/)
- [Recharts](https://recharts.org/)
- [date-fns](https://date-fns.org/)

---

## 📄 License

MIT © [gammaSpeck](https://github.com/gammaSpeck)

---

## 🌟 Show Your Support

If you love this project, give it a ⭐️! Share your feedback, ideas, and screenshots!

---

## 🗺️ Community & Links

- [Changelog](CHANGELOG.md)
- [Issues](https://github.com/gammaSpeck/expense-tracker/issues)
- [Discussions](https://github.com/gammaSpeck/expense-tracker/discussions)
- [Releases](https://github.com/gammaSpeck/expense-tracker/releases)

---

> Built with 💚 for privacy, fun, and financial clarity!
