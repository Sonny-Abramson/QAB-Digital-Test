# QAB Digital Test

Offline, local-only administration and scoring of the **Quick Aphasia Battery** (standard Forms 1-3).
No server, no accounts, no network calls. Sessions are stored in the browser's IndexedDB on the device.

## Use it

**Desktop:** open `dist/qab.html` (a single self-contained file) in Chrome, Safari, Edge or Firefox.

**iPad (offline install):** turn on GitHub Pages for this repo (Settings → Pages → Deploy from branch → `main`, folder `/docs`).
Open the Pages URL in Safari once, then Share → **Add to Home Screen**. After that it runs offline from the home-screen icon.
The host only serves the app code; patient data never leaves the device.

**There is no sync.** Use *Export backup (JSON)* on the home screen regularly, and *Import backup* to move data between devices.
Browsers can clear site storage, so treat exports as the real record.

## Develop

```bash
npm install
npm test        # scoring engine vs. the published 168-row dataset
npm run build   # writes dist/qab.html and docs/
```

- `src/scoring.js`: pure scoring engine (formulas verified against the dataset, see `notes/REQUIREMENTS.md` §4)
- `src/items.js`: item bank transcribed from the published score-sheets
- `src/app.js`, `src/db.js`: UI and storage

## Not yet built
Extended forms (1A-3A: writing, written word comprehension, naming cues), audio recording, passcode/encryption, and
second-screen participant display. See `notes/REQUIREMENTS.md`.

## Attribution
QAB: Wilson SM, Eriksson DK, Schneck SM, Lucanie JM (2018). *A quick aphasia battery for efficient, reliable, and multidimensional
assessment of language function.* PLOS ONE 13(2):e0192773 (CC BY). Clinical-research tool; scores are not a diagnosis.
