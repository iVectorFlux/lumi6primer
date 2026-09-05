# Public assets map (K12 Lumi6)

The browser loads **one HTML shell** (`index.html`) plus scripts in a fixed order. Nothing is bundled with Webpack.

## Pages

| File | Route | Purpose |
|------|-------|---------|
| `login.html` | `/`, `/login` | Sign-in (no guest mode) |
| `index.html` | `/dashboard` | Whiteboard + Talk Mode |

`/landing.html` redirects to `/login`.

Icons used by the browser live here too: `favicon.ico`, `lumi6-mark.png`.

## CSS — `public/css/`

| File | Used by |
|------|---------|
| `style.css` | Whiteboard shell + Talk Mode cards |
| `primer-voice.css` | Hold-to-talk overlay in Talk Mode |
| `supabase-auth.css` | Auth modal / sidebar profile |
| `lumi6-onboard.css` | Name / class / interests onboarding |
| `mobile.css` | Small screens |
| `login.css` | Login page only |

## JavaScript — `public/js/`

### Canvas — `public/js/canvas/`

Loaded **before** the tutor. `app.js` is built from `src/client/app/*` via `npm run build:client`.

| File | Purpose |
|------|---------|
| `draw.js` | Pen / ink |
| `selection.js` | Lasso and move |
| `mixed-text.js` | Board text + `$…$` math |
| `animation.js` | Canvas animation scenes |
| `summon.js` | Thinking shimmer for Draw Mode AI |
| `app.js` | Full whiteboard (generated) |

### Tutor — `public/js/tutor/`

| File | Purpose |
|------|---------|
| `primer-turn.js` | Talk Mode send + `/api/primer/turn` stream |
| `primer-voice.js` | Hold-to-talk mic, TTS, lesson pictures |
| `lumi6-canvas-adapter.js` | Puts tutor pictures on the board |
| `lesson-pdf.js` | Download lesson PDF |
| `lumi6-onboard.js` | Kid profile |

### Auth — `public/js/auth/`

| File | Purpose |
|------|---------|
| `supabase-auth.js` | Session + sidebar profile |

### Lib — `public/js/lib/`

| File | Purpose |
|------|---------|
| `mathjax-config.js` | MathJax for board formulas |

## Server source (not in `public/`)

| Path | Purpose |
|------|---------|
| `src/server/` | `npm start` — HTTP, routes, Draw Mode AI |
| `src/primer/` | Talk Mode tutor (orchestrator, tools, safety) |
| `src/client/app/` | Whiteboard source → `public/js/canvas/app.js` |
| `src/providers/` | Optional Draw Mode backends (API / Kimi / Codex / Claude) |
| `scripts/build-client.js` | Rebuilds the whiteboard bundle |

## Editing the whiteboard

- **Live file:** `public/js/canvas/app.js`
- **Source modules:** `src/client/app/*.js` → run `npm run build:client`

## Removed (do not look for these)

- Atlas chat sidebar (`atlas-chat.css` / `atlas-chat.js`)
- Guest mode on login
- `landing.html` / `landing.css`
- Gemini image module (`gemini-graphic.js` → `lesson-graphic.js`)
- `public/vendor/` (unused widget renderer)
- `src/cli/` and `cli.js` (old `lumi6 configure` terminal)
- `build/icons/` (desktop app icons; browser uses `public/favicon.ico`)
- `scratch/` (local Edge profile + one-off orchestrator tests)
- `scripts/check-models.js`, `scripts/compare-talk-models.js`
