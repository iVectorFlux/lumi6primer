# Public assets map (K12 Lumi6)

The browser loads **one HTML shell** (`index.html`) plus scripts in a fixed order. Nothing is bundled with Webpack — each file has one job.

## Pages (root)

| File | Route | Purpose |
|------|-------|---------|
| `login.html` | `/`, `/login` | Sign-in + guest mode |
| `index.html` | `/dashboard` | Whiteboard + voice tutor |

`landing.html` was removed; `/landing.html` redirects to `/login`.

## CSS — `public/css/`

| File | Used by |
|------|---------|
| `style.css` | Main whiteboard shell |
| `atlas-chat.css` | Chat sidebar |
| `atlas-voice.css` | Voice overlay + lesson caption/strip |
| `supabase-auth.css` | Auth modal (if shown) |
| `lumi6-onboard.css` | Kid profile onboarding |
| `mobile.css` | Small screens |
| `login.css` | Login page only |

## Canvas engine — `public/js/canvas/`

Loaded **before** the tutor UI. `app.js` is the big whiteboard (built from `src/client/app/*` via `npm run build:client`).

| File | Exposes | Needed? |
|------|---------|---------|
| `draw.js` | `LUMI6_DRAW` | Yes — pen/ink strokes |
| `selection.js` | `LUMI6_SELECTION` | Yes — lasso, move |
| `mixed-text.js` | `LUMI6_MIXED_TEXT` | Yes — text + `$…$` math on board |
| `animation.js` | `LUMI6_ANIMATION` | Yes — AI animation scenes on canvas |
| `summon.js` | `LUMI6_SUMMON` | Yes — “thinking” shimmer while manual AI runs |
| `app.js` | (main IIFE) | Yes — full whiteboard |

**MathJax** (CDN + `js/lib/mathjax-config.js`) is only for rendering formulas the kid or AI writes on the board.

## Kid tutor — `public/js/tutor/`

| File | Purpose |
|------|---------|
| `atlas-chat.js` | Chat panel + `primerTurn()` streaming |
| `atlas-voice.js` | Mic, TTS, filler audio, captions |
| `lumi6-canvas-adapter.js` | Puts tutor graphics on the whiteboard |
| `lesson-pdf.js` | Export lesson PDF (uses html2pdf CDN) |
| `lumi6-onboard.js` | Grade/name profile |

## Auth — `public/js/auth/`

| File | Purpose |
|------|---------|
| `supabase-auth.js` | Login session + sidebar profile card |

## What we removed or stopped auto-loading

- Duplicate script tags (chat/voice were loaded twice)
- `landing.html` / `landing.css` (duplicate of login)
- Auto “What’s new 0.8.0” changelog on startup (engineering product copy, not K12)
- Auto feature tour on startup

## Editing the whiteboard

- **Live file:** `public/js/canvas/app.js`
- **Source modules:** `src/client/app/*.js` → run `npm run build:client` after editing those

## Not in this repo anymore

Plugin manager UI, widget-host, and professional-diagrams tour were stripped from the K12 shell. Legacy code paths in `app.js` still exist but are hidden/disabled.
