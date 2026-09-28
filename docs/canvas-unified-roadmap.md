# Master Canvas Revamp: Unified Architecture & Implementation Roadmap

> **Purpose**: This document reconciles and unifies [`canvas-surface-suggestions.md`](./canvas-surface-suggestions.md) (Surface Architecture & Notebook Model) and [`canvas-interaction-design.md`](./canvas-interaction-design.md) (Interaction Model, UX & Socratic AI). It resolves all contradictions, defines the unified technical specifications, and outlines the phased implementation plan.

---

## 1. Executive Synthesis: How the Two Documents Fit Together

The two previous documents solve two halves of the same problem:
* **[`canvas-surface-suggestions.md`](./canvas-surface-suggestions.md)** defines the **PHYSICAL CONTAINER**: Moving from a bewildering 20K×20K infinite void to a structured **Notebook with Pages**, bounded zoom, mobile-friendly vertical layout, and an inline **Light Scratchpad**.
* **[`canvas-interaction-design.md`](./canvas-interaction-design.md)** defines the **COGNITIVE INTERFACE**: Replacing disconnected toolbars, Adobe/CAD jargon (`Send Back`, `Typeset`, `Plot`), and raw LLM coordinate guessing with **Zero-Click Contextual Pills**, **Parametric Geometry**, and **Socratic Step-by-Step Storyboards**.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                PRIMER CANVAS ECOSYSTEM                                 │
├────────────────────────────────────────────────────────┬───────────────────────────────┤
│                LIGHT SCRATCHPAD                        │     FULL NOTEBOOK CANVAS      │
│  (Embedded inline in Talk, Books, Challenges)          │    (Standalone "Board" Mode)  │
├────────────────────────────────────────────────────────┼───────────────────────────────┤
│ • Zero zoom, zero pan, fixed ratio container           │ • Notebook Page Model (1200×1600 units)       │
│ • Minimalist: Pen, Eraser, Clear All, [Submit]         │ • Page-Fit Relative Zoom (0.85× to 2.0× fit)  │
│ • No toolbars, no lasso, no text boxes, no plugins     │ • Multi-page navigation (swipe / [+][<][>])   │
│ • Submits single clean PNG directly into chat turn     │ • Streamlined Top Toolbar (8 friendly tools)  │
│ • AI analyzes with targeted, fast vision               │ • Zero-Click Contextual Micro-Pill on strokes │
│ • Ultra-low latency, zero cognitive load               │ • Parametric Diagrams & Socratic Storyboards  │
└────────────────────────────────────────────────────────┴───────────────────────────────┘
```

---

## 2. Resolving Contradictions & Reconciling the Architecture

### Reconciling Point 1: The "Zoom Limit" Dilemma (35% Trap vs 0.8× Suggestion)
* **The Conflict**:
  * The current code clamps zoom between `0.35×` and `2.5×` in `canvas-text-editors.js`. The user hit the `0.35` (35%) brick wall when large diagrams loaded and couldn't zoom out.
  * In `canvas-surface-suggestions.md`, a static limit of `0.8× – 1.8×` was suggested.
  * **The Problem**: A static `0.8×` minimum breaks on mobile devices! On a 390px iPhone, fitting a 1200-wide page requires a scale of $\approx 0.32\times$. If zoom is clamped to $0.8\times$, the page overflows horizontally and forces frustrating side-scrolling.
* **The Unified Resolution**:
  **Zoom must be dynamic and relative to the Page-Fit Scale ($S_{\text{fit}}$)**:
  $$S_{\text{fit}} = \min\left(\frac{\text{Viewport Width}}{\text{Page Width (1200)}}, \frac{\text{Viewport Height}}{\text{Page Height (1600)}}\right)$$
  * **Default state**: Page auto-fits screen at $1.0 \times S_{\text{fit}}$. (On laptop $\approx 0.85\times$, on tablet $\approx 0.65\times$, on phone $\approx 0.32\times$).
  * **Pinch-to-zoom range**: Constrained strictly to **$[0.85 \times S_{\text{fit}}, 2.0 \times S_{\text{fit}}]$**.
  * **Content framing**: A new **`[ 🔍 Focus / Frame ]`** micro-action smoothly zooms and centers any selected drawing or diagram to fit comfortably within the viewport margins.

---

### Reconciling Point 2: The Coordinate Space (20,000×20,000 vs Page Boundaries)
* **The Conflict**:
  Currently, `SIZE = 20000`. The AI generates elements with arbitrary global coordinates (e.g. $x=8500, y=12000$). When a diagram is generated, it often ends up halfway off-screen or far away from where the child drew.
* **The Unified Resolution**:
  * **Page-Local Logical Coordinate Space**: Every Notebook page has its own bounded coordinate box:
    $$\text{Width} = 1200, \quad \text{Height} = 1600 \quad (\text{Portrait 3:4 ratio})$$
  * **Bounded AI Commands**: AI drawing, text, and diagram commands are strictly constrained:
    $$0 \le x \le 1200, \quad 0 \le y \le 1600$$
  * AI layout algorithms only place content in verified empty white space on the *current active page*, completely eliminating off-screen lost content.

---

### Reconciling Point 3: The Bottom Voice Orb vs. Contextual Selection Pills
* **The Conflict**:
  * Having AI action buttons (`Answer`, `Hint`, `Explain`, `Plot`) on the floating bottom Orb creates a frustrating "Dual Interface" disconnect. The child writes at the top-left, but has to look down at the bottom-center to interact.
  * But the 3D Voice Orb is a beloved, living character avatar (Lumi).
* **The Unified Resolution: Separation of Character vs. Tooling**:
  1. **The Voice Orb = Companion Avatar**:
     * Floats gently at the bottom-center or top corner.
     * Expresses emotional state (listening, speaking, thinking).
     * Handles **voice conversation** and **global page prompts** (*"Lumi, what should I do next on this page?"*).
     * Radial menu with `Answer`, `Hint`, `Plot` is **REMOVED**.
  2. **The Contextual Micro-Pill = Direct Manipulation Tool**:
     * Floats **right next to the ink strokes** or selection.
     * Contains only 3 essential actions: **`[ 💡 Explain / Guide ]`**, **`[ ✨ Make Neat ]`**, **`[ 🗑️ Erase ]`**.
     * Zero eye travel. Total cognitive alignment.

---

### Reconciling Point 4: Diagram Craft (Raw Pixel Guessing vs. Parametric Templates)
* **The Conflict**:
  As seen in the perimeter rectangle test ($P = 2(l+w)$), the LLM hallucinated colliding arrow lines, giant mismatched fonts ($w$ as tall as the box), and redundant KaTeX text because it guessed raw coordinates. Meanwhile, the algebraic grapher (`plot_function` in `ai-drafts.js`) was gorgeous because it was mathematically programmed.
* **The Unified Resolution**:
  * Deprecate unstructured raw coordinate guessing for standard educational diagrams.
  * Introduce **Parametric Educational Geometry Components**:
    * `geometry_rectangle`: Clean 24px-offset dimension lines, balanced typography, soft pastel perimeter highlight.
    * `geometry_triangle`: Labeled sides ($a, b, c$), right-angle square symbol, hypotenuse callout.
    * `science_gravitation`: Two celestial bodies with vector force arrows $\vec{F}$ and an inverse-square distance callout ($F \propto 1/r^2$).
    * `algebra_graph`: The existing elegant vector function plotter with proper labels.

---

## 3. The Unified UI & Interaction Specification

### 3.1 The Streamlined Top Toolbar
Currently, 11 cluttered icons sit at the top. We streamline them into 8 essential tools:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  [< Back]   [✏️ Pen] [🎨 Color] [🧹 Eraser] [🔤 Text] [📐 Shapes] [↩️ Undo] [↪️ Redo]     │
│             ─────────                                                                  │
│             (Active)                                  [Page < 1 / 3 >]  [+]  [Share]   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```
* **Removed**: Confusing standalone `Lasso` tool (replaced by direct tap-to-select), z-order buttons (`Send Back`), redundant `Cancel` buttons.
* **Added**: Integrated Page Navigator (`Page < 1 / 3 > [+]`).

### 3.2 The Zero-Click Selection Experience
1. **Writing**: Kid writes $3 + 5 = ?$ with Pen.
2. **Auto-Cluster Pill**: 1.2 seconds after pen lifts, a subtle micro-pill appears right beneath the cluster:
   `[ 💡 Help Me Think ]  [ ✨ Make Neat ]  [ 🗑️ ]`
3. **Single-Tap Targeting**: If multiple equations exist on the page, tapping any stroke cluster instantly highlights its bounding box and docks the micro-pill above it.
4. **Auto-Framing**: Clicking `[ 🔍 Focus ]` on the pill smoothly centers and zooms to frame the selected work.

### 3.3 The Modern Text Box
1. **Click-to-Type**: Creates a clean, auto-expanding text box.
2. **4 Clean Handles**: Side handles for wrap width; corner handles for proportional scaling.
3. **Preset Typography**: Clean floating bubble with `[ S (16px) | M (24px) | L (36px) | Title (48px) ]` instead of chaotic pixel inflation.

---

## 4. Master 4-Phase Implementation Roadmap

To deliver this revamp safely without breaking production, the work is organized into 4 focused phases:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: JARGON PURGE & CONTEXTUAL PILLS (Immediate Win — ~2-3 Days)                   │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ • Strip `Send Back` and `Cancel` from selection toolbar in HTML and JS.                │
│ • Rename `Typeset` to `Make Neat` (with magic wand icon ✨).                           │
│ • Remove `Plot`, `Continue`, `Answer`, `Hint` radial menu from bottom Voice Orb.       │
│ • Anchor action buttons directly to the selection bounding box (Contextual Pill).      │
│ • Deliverable: Instant cleanup of cognitive clutter on existing canvas.                │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                           │
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: ZOOM NORMALIZATION, TAP-TO-SELECT & TEXT OVERHAUL (COMPLETED)                 │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ • Replaced hardcoded 0.35x clamp with smooth 0.05x–3.0x dynamic zoom range.            │
│ • Normalized brush stroke width in logical coordinates (damped power curve prevents     │
│   ink width explosion when zoomed out and hairline fading when zoomed in).             │
│ • Single-tap stroke cluster detection & targeting with balanced logical clustering.    │
│ • Added `[ Focus ]` contextual action button & `F` shortcut for smooth viewport framing.│
│ • Overhauled text boxes: auto-growth height, 6 clean handles, typography presets       │
│   (S 16px, M 24px, L 32px, XL 44px) + Done check button, no runaway 120px font blowing. │
│ • Purged all emoji icons from action buttons for clean, professional, readable UI.     │
│ • Fixed AI Voice Orb click behavior: stays on board and invokes Lumi explanation.      │
│ • Deliverable: Smooth, frustration-free navigation with zero zoom-traps.               │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                           │
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 2.5: SOCRATIC STEP CARDS & LATEX MATH ENGINE (COMPLETED)                         │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ • Created `src/server/explain-policy.js` with `EXPLAIN_SOCRATIC_POLICY`:               │
│   - Enforces 4 structured pedagogical beats (Core Principle, Formula & Variables with   │
│     LaTeX, Real-World Intuition Spark, Think Like a Scientist Curiosity Question).     │
│   - Solves the unformatted flat wall-of-text issue on Whiteboard `Explain`.            │
│ • Updated `src/server/main.js`:                                                        │
│   - Injected `EXPLAIN_SOCRATIC_POLICY` into active and Anthropic system prompts when    │
│     `userAction === "explain"`.                                                        │
│   - Enforced `$formula$` inline LaTeX delimiters across all `write_text` math.         │
│   - Increased token budget from 200 to 450 tokens (1800 characters) for step cards.    │
│ • Upgraded `src/client/app/ai-runtime.js`:                                             │
│   - Replaced raw `textImage` with `await mixedTextImage` for all `write_text` commands.│
│   - Enabled MathJax vector formula rendering inline inside whiteboards step cards.     │
│ • Expanded text length bounds in `core.js` to 3000 chars to avoid truncating cards.    │
│ • Deliverable: Crisp, beautifully formatted Socratic step cards with KaTeX/MathJax.   │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                           │
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: THE LIGHT SCRATCHPAD COMPONENT (~3-4 Days)                                    │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ • Build standalone ~250-line Scratchpad component (single fixed canvas).               │
│ • Embed inline in Talk Mode chat stream and Books Mode activity beats.                 │
│ • Wire "Done / Submit" button to capture PNG and pass to Primer vision orchestrator.   │
│ • Deliverable: Kids can scribble answers inline during tutoring without leaving chat.  │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                           │
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ PHASE 4: NOTEBOOK PAGES & PARAMETRIC DIAGRAMS (~5-7 Days)                              │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ • Implement 1200×1600 logical Page container with page list and navigation arrows.     │
│ • Add Page swipe transitions and IndexedDB multi-page persistence.                     │
│ • Upgrade server prompt with Parametric Geometry templates (clean rectangles, vectors).│
│ • Implement 3-Step Socratic Storyboard cards for science concepts (e.g. Relativity).   │
│ • One-click PDF export (1 logical page = 1 clean PDF page).                            │
│ • Deliverable: The complete, state-of-the-art educational notebook kids love!          │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Technical Migration Checklist (No Breaking Changes)

| Existing File | What Changes | Safety / Risk Mitigation |
| :--- | :--- | :--- |
| `public/index.html` | Clean up toolbar icons, remove `selectionSendBackBtn` and `selectionCancelBtn`. | Zero risk: buttons are isolated DOM nodes. |
| `src/client/app/ui-bootstrap.js` | Wire Contextual Pill events to stroke bounding box; remove radial action hooks. | Pure UI layer updates. |
| `src/client/app/canvas-text-editors.js` | Update `zoomCanvasAt` and `updateTouchGesture` to use dynamic Page-Fit scaling. Clean up text box handles. | Replaces hardcoded `0.35` with bounded formula. |
| `src/client/app/ai-drafts.js` | Add parametric geometry rendering (rectangles with offset dimension lines). | Existing `plot_function` engine remains untouched. |
| `src/server/main.js` | Update system prompt: instruct AI to emit Socratic storyboards and parametric shapes instead of raw line guessing. | Schema-compatible additions. |
| `src/client/app/scratchpad.js` | Brand-new standalone file for inline drawing in Talk/Books mode. | 100% additive, zero impact on full canvas. |
