# FITE — Personal Offline Fitness & Life PWA

FITE is a fully offline-capable Progressive Web App built around a personal
16:8 fasting / gym / flexibility / food plan. It's a set of independent
mini-apps — Sports, Foods, Gallery, Checklist, Notes, Money Tracker, and
Settings — sharing one Samsung One UI–inspired design system, with every bit
of data stored locally on your device (IndexedDB). No backend, no account,
no tracking.

**🔗 Live app:** `https://mathionx.github.io/FITE/`
*(replace with your actual GitHub Pages URL — see "Deploying" below if you haven't turned Pages on yet)*

---

## What it does

- **Sports** — weekly gym plan, nightly flexibility routine, posture drills, a workout tracker with rep counters and a rest timer, and session history. Add your own YouTube links per exercise.
- **Foods** — your weekly meal plan with editable macros, a daily meal log, and a live 16:8 fasting countdown.
- **Gallery** — progress photos/videos grouped by day, with notes, a trash/restore flow, and a side-by-side compare view.
- **Checklist** — your daily schedule as a checklist, with a progress ring and full history.
- **Notes** — a simple daily journal.
- **Money Tracker** — income/expense entries with a category breakdown chart.
- **Settings** — 14 colour themes, 6 fonts, an editable/draggable bottom dock, a configurable top bar, PIN/fingerprint app lock, reminders, and JSON export/import of all your data.

Everything works fully offline once you've loaded it a first time — **except**
YouTube video embeds (need a connection, by design) and the daily
motivation-quote card on Home, which only needs a connection once a day to
refresh itself and is cached the rest of the time.

---

## Installing it as an app

Open the live link above on your phone or computer, then:

- **Android (Chrome):** menu (⋮) → **Add to Home screen** / **Install app**
- **iPhone/iPad (Safari):** Share icon → **Add to Home Screen**
- **Desktop (Chrome/Edge):** install icon (⊕) in the address bar

Once installed it opens full-screen with no browser UI and keeps working
offline (aside from the two exceptions above). Nothing to sign in to —
just open it.

---

## Your data

Everything you enter is stored in **IndexedDB**, locally, in the browser/app
instance you're using — nothing is sent anywhere. That also means:

- Data doesn't automatically sync between devices or browsers.
- Clearing your browser's site data (or uninstalling the installed app) wipes it.
- Use **Settings → Data → Export all data** regularly to download a JSON
  backup, and **Import data** to restore it on another device or after a reset.

---

## Deploying / running this repo yourself

This is a static site — plain HTML/CSS/JS, no build step, no dependencies to install.

**Turn on GitHub Pages** (if not already on):
1. Repo → **Settings** → **Pages**
2. Source: **Deploy from a branch** → pick `main` (or whichever branch has the code) → folder `/ (root)`
3. Save, then wait a minute or two — your URL will appear at the top of that page.

**Run it locally instead**, if you ever have a computer handy (Service
Workers need `http://`, not `file://`):
```bash
git clone https://github.com/mathionx/FITE.git
cd FITE
python3 -m http.server 8080
# then open http://localhost:8080
```
Any static host works the same way — Netlify, Vercel, Cloudflare Pages, etc. — just point it at the repo root.

---

## Project structure

```
├── index.html / sports.html / gallery.html / foods.html /
│   checklist.html / notes.html / moneytracker.html / settings.html
├── offline.html            Shown if an uncached page is opened offline
├── manifest.json            PWA manifest
├── service-worker.js         Offline caching (excludes YouTube + the quote APIs)
├── css/                        Design system + per-page styles
├── js/
│   ├── db.js                    Tiny IndexedDB wrapper
│   ├── app-shared.js             Settings, theming, dock, top bar, lock screen
│   ├── plan-data.js               Your fitness plan content (seed data, editable after)
│   └── <page>.js                    Per-page logic
└── assets/                          Generated icons + wallpapers
```

## Browser support

Built against modern Chromium browsers (Chrome/Edge/Samsung Internet) and
Safari. Core functionality (IndexedDB, Service Worker, install prompt) is
broadly supported; WebAuthn fingerprint unlock varies by device and falls
back to a PIN automatically where it isn't available.

---
