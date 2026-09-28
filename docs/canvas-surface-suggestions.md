# Canvas Surface Architecture — Brainstorming & Suggestions

> This document explores the canvas design problem in depth: infinite vs. fixed, pages vs. scroll, zoom limits, multi-device behavior, PDF export, and AI latency. No implementation — just thinking through the options honestly.

---

## 1. What We Have Today (The Starting Point)

The current canvas is a **20,000 × 20,000 unit infinite whiteboard** with:

| Property | Current Value | Where |
|----------|---------------|-------|
| Logical size | `SIZE = 20000` (20K × 20K units) | `core.js:3` |
| Tile size | `TILE = 512` px | `core.js:4` |
| Zoom range | `0.35× – 2.5×` | `canvas-text-editors.js:674,696` |
| Initial zoom | `INITIAL_VIEW_ZOOM = 1.5` → computes to `~0.06–0.3×` depending on screen | `core.js:5` |
| Pan | Free pan with touch, mouse, middle-click | `ui-bootstrap.js` |
| Board capture for AI | Crops visible ink bounds, scales to 960–1600px, exports as PNG | `ui-bootstrap.js:1762-1796` |
| Persistence | IndexedDB snapshots (tiles + state) | `persistence.js` |
| PDF export | Lesson PDF from Talk mode conversation, not from canvas content | `lesson-pdf.js` |

### Why This Design Exists

The original Lumi6 was an **adult power tool** — a professional whiteboard for thinking, research, and AI interaction. The 20K × 20K infinite canvas makes sense for that use case: spread ideas out, zoom in to detail, zoom out to survey. Adult users navigate infinite canvases intuitively (Miro, FigJam, Excalidraw all work this way).

### Why It Breaks for Kids

Kids (age 8–14) are NOT professional whiteboard users. The problems you've identified are real:

1. **No sense of "a page"** — Kids think in pages. Paper, notebooks, exercise books — everything in their world has pages. An infinite canvas with no boundaries is disorienting.

2. **Zoom inconsistency** — A kid writes "2+3=5" at zoom 1.5× on a phone. Then they zoom out and write the next problem at 0.5×. The first text is now tiny, the second is huge. There's no normalizing force.

3. **Space management** — A kid draws at the top, runs out of room, can't figure out how to navigate to empty space. Or they zoom way out and write in the corner, leaving a massive empty gap.

4. **AI board capture** — `captureBoardImage()` captures the **visible ink bounds** within the **current viewport**. If the kid has zoomed to 0.35× and written everywhere, the capture is a dense, hard-to-read mess. If they've zoomed to 2.5× and written one word, the capture misses everything else.

5. **PDF/export** — No natural page boundaries means no clean page-break points. Everything is one continuous blob.

6. **Mobile** — On a 390px-wide phone, the usable drawing area is tiny. The kid instinctively zooms in to write, but then can't see what they wrote earlier without zooming back out.

---

## 2. The Five Design Options (With Honest Tradeoffs)

### Option A: Fixed Single Page (No Zoom, No Pan)

**The idea:** Lock the canvas to exactly one screen-sized page. No zoom, no pan. What you see is what you get. Like a sheet of paper placed on the desk.

```
┌────────────────────────┐
│                        │
│   Fixed page           │
│   (screen-sized)       │
│                        │
│   No zoom, no pan      │
│                        │
│   What you see =       │
│   what you get         │
│                        │
└────────────────────────┘
```

**What changes by device:**
- **Laptop (1440×900):** Page is ~1440 × 900 logical units. Plenty of room.
- **Tablet (1024×768):** Page is ~1024 × 768. Still good.
- **Mobile (390×844):** Page is ~390 × 844. Very narrow. Writing is cramped.

**Pros:**
- Simplest mental model. Kids understand it immediately.
- AI board capture is trivial — the whole page IS the image.
- PDF export is trivial — each page maps to one printed page.
- No zoom inconsistency possible.

**Cons:**
- **Extremely limiting.** Can't fit much on one screen, especially on mobile.
- **No "add more space"** without the page system (see Option B).
- **Kills the existing canvas engine.** You'd gut the tile-based rendering, the pan/zoom system, everything. Massive rewrite.
- **Feels primitive.** Kids today use iPads and already understand pinch-to-zoom. No zoom at all feels like going backward.

**Verdict:** Too extreme. Throws away the canvas engine's strengths. But the *instinct* — give kids a bounded, predictable surface — is right.

---

### Option B: Notebook Model (Fixed Pages + Add Page)

**The idea:** Each "canvas" is a notebook. Each page has a fixed logical size (same on all devices). The kid writes on one page. When it's full, they tap "Add Page" or swipe to a new blank page. Pages are numbered and navigable.

```
┌─────────┐  ┌─────────┐  ┌─────────┐
│ Page 1  │  │ Page 2  │  │ Page 3  │
│         │  │         │  │         │
│ Gravity │  │ More on │  │ (blank) │
│ notes   │  │ orbits  │  │         │
│         │  │         │  │         │
│ [1/3] ──┼→ │ [2/3] ──┼→ │ [3/3]   │
└─────────┘  └─────────┘  └─────────┘
        ← swipe / tap arrows →
```

**Page dimensions (logical, same on every device):**
- A fixed logical size — e.g., **1200 × 1600 units** (portrait, 3:4 ratio like A4 paper).
- On a laptop, the canvas scales to fit the viewport. On mobile, same logical size scales to fit the screen width.
- Very limited zoom: maybe `0.8× – 1.5×` range only — just enough to read small writing or fit the page on screen.

**Zoom behavior:**
- **Default:** The page fits the viewport width. On laptop, the full page is visible. On mobile, the page fits the width and you scroll vertically (like reading a doc).
- **Zoom in:** Up to 1.5× — useful for detailed drawing or small handwriting.
- **Zoom out:** Down to 0.8× — useful to see the whole page at once on mobile.
- **No free pan** (or constrained pan that can't go past page edges). The page is always anchored.

**Multi-device:**
- The same logical page looks the same everywhere. On a phone, the writing is smaller but proportional.
- When the child zooms in on mobile, they see the same content just bigger — their strokes are at the same logical size.

**PDF export:**
- Each page maps to one PDF page. Clean, predictable. Text size is consistent across pages because the logical size is fixed.

**AI board capture:**
- Capture the current page at a fixed resolution. No zoom-dependent mess. Always consistent.

**Persistence:**
- Save pages as an ordered list. Each page has its own tile data. Session-aware: "Page 1 was about gravity, Page 2 was about orbits."

**The "zoom inconsistency" problem:**
- Because the logical page size is fixed, zoom only affects the *viewport* — how much of the page you see at once. The actual content size is always the same. A kid who writes at 1.5× zoom and then at 1.0× zoom will have the same-sized text, because the brush width is in logical units, not screen pixels.
- Wait — **this is already how it works.** Strokes are drawn in logical coordinates, not screen coordinates. The function `logicalWidth(cssWidth)` converts screen-pixel brush size to logical units. So if you zoom in and draw, the stroke is thinner in logical space. If you zoom out and draw, the stroke is thicker.
- **The real fix:** Lock the brush's logical width. Don't let it change with zoom. When a kid draws, the stroke should always be the same logical thickness regardless of zoom. This way, zoom is only for viewing, not for changing the size of what they create.

**Pros:**
- Kids understand notebooks. The mental model is clear.
- Solves the "where do I write next?" problem — add a new page.
- PDF export is clean and consistent.
- AI capture is consistent per page.
- Zoom is gentle and constrained.
- Pages can be associated with concepts/topics for the learner model.

**Cons:**
- You have to build the page system. The current engine is one continuous canvas.
- Swipe navigation between pages needs to feel smooth, not clunky.
- The existing 20K × 20K canvas engine needs to be wrapped/constrained, not rewritten.
- A child might want to see two pages at once (compare notes). Need to decide if that's a feature or not.

**Verdict:** This is probably the right answer. Read on for details below.

---

### Option C: Guided Infinite Canvas (Soft Boundaries)

**The idea:** Keep the infinite canvas, but add visual "lanes" or "zones" that guide the kid to use space predictably. Like lined paper — you can write outside the lines, but the lines guide you.

```
┌──────────────────────────────────────────┐
│  ┌────────────────────────┐              │
│  │  Zone 1: Gravity       │              │
│  │  (guided area)         │              │
│  └────────────────────────┘              │
│                                           │
│  ┌────────────────────────┐              │
│  │  Zone 2: Orbits        │              │
│  │  (guided area)         │              │
│  └────────────────────────┘              │
│                                           │
│  [+ Add new zone]                         │
│                                           │
│  (rest of infinite canvas is faded/dimmed)│
└──────────────────────────────────────────┘
```

**How it works:**
- The canvas is still infinite, but the UI creates rectangular "zones" that act like pages.
- When the kid taps "Add zone" or starts a new topic, a new zone is created below the previous one.
- Zones have a fixed width (like a page) and grow vertically as the kid writes.
- The area outside zones is dimmed or hidden.
- The AI captures one zone at a time.

**Pros:**
- Doesn't require rewriting the canvas engine.
- Preserves the power of the infinite canvas for power users / future features.
- Zones can grow vertically, so the kid never runs out of space within a zone.

**Cons:**
- More complex than pages. The concept of "zones" is less intuitive than "pages."
- Vertical growth means unbounded zone height — same problem as infinite scroll.
- The kid can still zoom out and see a weird overview of all zones.
- PDF export requires cutting zones into page-sized chunks.
- The "dimmed outside area" is a UX hack that adds complexity.

**Verdict:** Clever but overengineered. The notebook model is simpler and kids understand it better.

---

### Option D: Hybrid Card Canvas

**The idea:** Instead of a canvas you draw on, each "thought" is a card. The kid writes/draws inside a card, and cards are arranged in a flow. Like sticky notes on a board, but each sticky note is a mini-canvas.

```
┌──────────┐ ┌──────────┐ ┌──────────┐
│ Card 1   │ │ Card 2   │ │ Card 3   │
│          │ │          │ │          │
│ (drawing │ │ (typed   │ │ (diagram │
│  area)   │ │  text)   │ │  area)   │
│          │ │          │ │          │
└──────────┘ └──────────┘ └──────────┘
```

**Pros:**
- Each card is a fixed, bounded drawing surface. No zoom issues.
- Cards can contain different content types (handwriting, text, diagrams, interactives).
- Easy to export — each card is one image.
- Very mobile-friendly — one card fills the screen.

**Cons:**
- Kills free-form drawing. Can't draw a big diagram that spans the whole page.
- The canvas engine is wasted — you'd be building a card-based UI instead.
- Kids want to write freely, not in boxes.
- Feels more like a note-taking app than a "thinking surface."

**Verdict:** Wrong metaphor. The canvas should feel like paper, not like Trello.

---

### Option E: Keep Current Canvas, Add Constraints

**The idea:** Don't change the canvas model. Just add guardrails:
- Tighten zoom range (e.g., 0.7× – 1.5× instead of 0.35× – 2.5×).
- Lock brush logical width so zoom doesn't affect writing size.
- Add a "fit to content" button that auto-frames all ink.
- Improve `captureBoardImage()` to always capture all ink at a consistent scale.

**Pros:**
- Minimal code changes. Low risk.
- Preserves everything that works.

**Cons:**
- Doesn't solve the fundamental "where's my page?" problem.
- Doesn't solve the "ran out of space" problem.
- Doesn't solve PDF export.
- Kids still get lost in the infinite canvas.

**Verdict:** Not enough. This is a band-aid, not a solution.

---

## 3. Recommendation: Option B — The Notebook Model

After thinking through all five options, the Notebook Model is the right answer for kids. Here's the detailed design:

### 3.1 Page Dimensions

| Property | Value | Rationale |
|----------|-------|-----------|
| Logical width | **1200 units** | Fits an A4-ish ratio. Enough room for diagrams and equations. |
| Logical height | **1600 units** | 3:4 portrait ratio. Maps cleanly to A4/Letter PDF pages. |
| DPI for export | **2× rendering** | Each page exports as a 2400×3200 PNG — clear and sharp for PDF. |

These dimensions are **device-independent.** The same page looks the same on laptop, tablet, and phone. What changes is how much of the page fits on screen at once without scrolling.

### 3.2 Zoom Behavior

| Device | Default view | Zoom range | Pan behavior |
|--------|-------------|------------|-------------|
| **Laptop** (1440×900) | Page fits entirely in viewport, slight horizontal margins | 0.8× – 1.8× | Free pan but constrained to page bounds. Can't pan beyond page edges. |
| **Tablet** (1024×768) | Page fits width, slight vertical overflow | 0.8× – 1.8× | Same as laptop |
| **Mobile** (390×844) | Page fits width, must scroll vertically to see bottom | 0.8× – 2.0× | Vertical scroll within page. Horizontal pan locked. |

**Critical constraint:** The zoom affects only the **viewport** — how much of the page you see. It does NOT affect the logical size of what you draw. A stroke made at 2× zoom and a stroke made at 1× zoom should be the same logical width. This means the `logicalWidth()` function must return a constant value regardless of zoom, or at least be clamped to a narrow range.

### 3.3 Brush Width Normalization

Currently, `pressureWidth(e)` returns a CSS-pixel size, and `logicalWidth(cssSize)` divides by `state.scale` to get logical units. This means:

- At zoom 2.0×: logical width = cssSize / 2.0 → thin strokes
- At zoom 0.5×: logical width = cssSize / 0.5 → thick strokes

**Fix:** In the Notebook Model, normalize the brush to a **target logical width** regardless of zoom. The kid's pen should always produce consistent strokes. The conversion should be:

```
logicalWidth = TARGET_LOGICAL_PEN_SIZE; // e.g., 4 logical units
// Instead of: logicalWidth = cssSize / state.scale;
```

Or, less extreme: clamp the zoom's effect on stroke width to a small range, so strokes at any zoom are recognizably the same thickness.

### 3.4 Page Navigation

```
┌─────────────────────────────────────────┐
│                                         │
│           [ Page content ]              │
│                                         │
│                                         │
├─────────────────────────────────────────┤
│  ← Prev    Page 2 of 5    Next →  [+]  │
└─────────────────────────────────────────┘
```

- **Swipe left/right** to change pages (on touch devices).
- **Arrow buttons** on the edges of the canvas area.
- **"+" button** to add a new blank page after the current one.
- **Page indicator** showing current position.
- **Transition animation:** Slide left/right, like a real notebook.

### 3.5 AI Board Capture (Per Page)

Today's `captureBoardImage()` tries to be clever about cropping visible ink. In the Notebook Model, it's much simpler:

```javascript
captureCurrentPage() {
  // Always capture the full page at a consistent resolution
  const out = document.createElement("canvas");
  out.width = PAGE_WIDTH * CAPTURE_SCALE;  // e.g., 1200 * 1.5 = 1800px
  out.height = PAGE_HEIGHT * CAPTURE_SCALE; // e.g., 1600 * 1.5 = 2400px
  // ... render the current page's tiles to `out` ...
  return out.toDataURL("image/jpeg", 0.85);
}
```

No guessing about ink bounds. No zoom-dependent cropping. Every capture is the same dimensions. The AI always sees a clean, consistent page.

### 3.6 PDF Export

Each page becomes one PDF page. The logical dimensions map to A4 or Letter size. Text and strokes are at consistent sizes across all pages because the logical space is fixed.

```
Page 1 (1200×1600 logical) → A4 page at 150 DPI
Page 2 (1200×1600 logical) → A4 page at 150 DPI
Page 3 (1200×1600 logical) → A4 page at 150 DPI
```

No zoom-dependent scaling issues. No "page 1 is big, page 2 is small" problem.

### 3.7 Persistence & Session Awareness

Each page is saved as a separate entity:

```javascript
{
  notebookId: "session-abc-gravity",
  pages: [
    {
      pageNumber: 1,
      concept: "gravity",
      tiles: [...],      // tile data
      textBoxes: [...],  // text items
      images: [...],     // placed images
      createdAt: "...",
      ink_bounds: { x, y, w, h }
    },
    {
      pageNumber: 2,
      concept: "gravity — orbital mechanics",
      tiles: [...],
      textBoxes: [...],
      images: [...],
      createdAt: "..."
    }
  ]
}
```

Pages can be tagged with the concept the child was learning. The Primer can reference: "On page 1 you drew the ball falling down. Now on page 2, let's think about what happens if you throw the ball sideways."

### 3.8 How to Build It Without Rewriting the Canvas Engine

This is the critical practical question. The canvas engine (`core.js`, `canvas-rendering.js`, `canvas-tiles.js`, `persistence.js`) is 150K+ lines of battle-tested code. We don't want to rewrite it.

**The approach: Constrain, don't rebuild.**

1. **Reduce `SIZE`** from `20000` to `1200` (width) × `1600` (height) — or use a rectangular logical space instead of the current square. This is the page.

2. **But wait** — the engine assumes a square canvas (`SIZE × SIZE`). Changing this is risky. **Alternative:** Keep `SIZE = 20000` but define a **"active page region"** within it. E.g., the active page is `{x: 0, y: 0, w: 1200, h: 1600}`. Strokes outside this region are rejected. The viewport auto-centers on this region.

3. **Better alternative:** Keep `SIZE = 20000`. Use `SIZE` as the "page container." For page N, the active region is `{x: 0, y: N * 1800, w: 1200, h: 1600}` (with 200-unit gaps between pages). "Add page" allocates the next slot. "Navigate to page" pans the viewport to that page's region. The kid sees one page at a time; the underlying canvas stores all pages vertically.

4. **Simplest approach (recommended):** Treat each "page" as a **separate canvas snapshot.** When the kid switches pages, save the current tiles to IndexedDB, clear the canvas, and load the next page's tiles. This is exactly what the existing snapshot system already does — just automated and user-invisible.

**Recommended implementation path:**

```
Step 1: Constrain zoom to 0.8× – 1.8×
Step 2: Constrain pan to page bounds
Step 3: Normalize brush width (remove zoom dependency)
Step 4: Add page navigation UI (prev/next/add)
Step 5: Use snapshot system to persist each page
Step 6: Update captureBoardImage() to always capture at fixed resolution
Step 7: Add PDF export that iterates through page snapshots
```

Each step is independent. You can ship step 1–3 without any page system at all, and it already solves the zoom inconsistency problem.

---

## 4. What About AI Latency?

Your concern about AI latency is valid but it's **separate from the canvas architecture decision.** Here's why, and what to do about it:

### Why Canvas Architecture Doesn't Drive Latency

The AI pipeline today is:
```
Child finishes → captureBoardImage() [~200ms] → POST to server [~100ms] → 
LLM call [1500–2000ms] → TTS synthesis [~500ms] → Response back [~100ms]
```

The bottleneck is the LLM call (1.5–2s), not the board capture. Whether the canvas is pages or infinite doesn't change this.

### What DOES Reduce Latency

| Strategy | Impact | Effort |
|----------|--------|--------|
| **Don't read the board every turn.** Only capture the board when the child asks about it ("check my work", "look at this"). Currently `captureBoardImage()` fires on many turns even when the child is just talking. | Large — eliminates the vision call on most turns | Low — gate on `understanding.askedToLook` |
| **Pre-cache the board image.** Capture and compress the board continuously in the background (debounced), so when a turn happens, the image is ready. No 200ms capture delay. | Medium | Medium |
| **Stream the response.** Start TTS on the first sentence while waiting for the rest. The code already does this (`_kickOpenerTts`). | Already done | Done |
| **Use Groq for non-vision turns.** Groq is ~500ms. Only use vision-capable models when the board actually needs reading. | Large — already implemented in the fallback chain | Already done |
| **Reduce prompt size.** The current context-builder produces 3000–4000 tokens of system prompt. Every token added increases latency. | Medium | Ongoing |
| **Board summary caching.** When the board changes, generate a text summary asynchronously. On the next turn, send the text summary (cheap) instead of the image (expensive). | Large — eliminates vision API for most board-aware turns | Medium |

### The "AI Drawing on Canvas" Question

You mentioned "the AI is not ready to do heavy lifting on canvas." This is true for **complex diagramming** (the AI drawing detailed figures). But the Primer doesn't need to draw complex figures to be valuable. The current system already does:

- **Handwritten lesson notes** (text boxes placed on canvas) — working
- **Interactive widgets** (HTML interactives in iframes) — working
- **Wikipedia images** (placed as canvas images) — working

The 100× experience doesn't require the AI to *draw diagrams*. It requires the AI to **see what the kid drew** and **respond intelligently.** That's vision, not drawing. And vision works with the page-based board capture.

---

## 5. Mobile-Specific Strategy

Mobile is the hardest surface. Here are specific suggestions:

### For the Notebook Model on Mobile:

| Problem | Solution |
|---------|----------|
| Page is taller than screen | Allow vertical scroll within a page (like a PDF viewer). The kid draws on the visible portion. Scrolling down reveals more page. |
| Writing is cramped on 390px width | The page's logical width (1200 units) maps to the 390px screen width. At default zoom, the kid writes at approximately "exercise book" scale. They can zoom to 1.5× for larger writing (seeing ~2/3 of the page width). |
| Finger drawing is imprecise | This is a fundamental mobile problem, not a canvas architecture problem. Solutions: thicker default pen, palm rejection, or "finger draws = navigate, stylus draws = ink" (like iPad). |
| Page navigation on mobile | Horizontal swipe between pages. Page indicator at the bottom. "+" floating button in the corner. |

### Could mobile use a different canvas model?

You asked whether laptop/tablet/mobile should have different canvas behaviors. **The logical page should be identical.** What changes is:

| Aspect | Laptop | Tablet | Mobile |
|--------|--------|--------|--------|
| Page dimensions (logical) | 1200 × 1600 | 1200 × 1600 | 1200 × 1600 |
| Default view | Whole page visible | Whole page visible | Page width fits, scroll vertically |
| Zoom range | 0.8× – 1.8× | 0.8× – 1.8× | 0.8× – 2.0× (slightly more zoom for readability) |
| Drawing input | Mouse or stylus | Stylus or finger | Finger (or stylus if available) |
| Page navigation | Arrow buttons + keyboard | Swipe + arrows | Swipe |
| AI interaction | Voice + typing | Voice + typing | Voice primarily |

The key insight: **the content is the same, the viewport adapts.** If a child draws on their tablet and then opens the same notebook on their phone, they see the exact same page — just showing less of it at default zoom.

---

## 6. Open Questions for You to Think About

These are genuine design decisions I can't make for you — they depend on your product vision:

### Q1: Should the AI draw on the canvas, or should the canvas be the child's space?

The PRD says "collaborative surface where AI and child build understanding together." But you're saying the AI drawing on canvas has latency and quality issues. There's a middle ground:

- **Option A:** AI puts text notes and images on the canvas (current behavior). Kid draws. They share the page.
- **Option B:** Canvas is the kid's space only. AI content appears in the Talk mode sidebar or as overlays. The canvas is purely for the child's thinking.
- **Option C:** AI can place a "scaffold" on a page (e.g., a labeled diagram outline) and the child fills in the blanks. But the AI never draws free-form.

### Q2: Should pages be tied to topics, or free-form?

- **Option A:** Each page is tagged with a concept (from the learner model). "Gravity — Page 1", "Gravity — Page 2". When the kid switches topics, a new page is auto-created.
- **Option B:** Pages are free-form, like a blank notebook. The kid uses them however they want.
- **Option C:** Hybrid — the Primer suggests "Want to start a new page for this?" when the topic changes, but doesn't force it.

### Q3: When should the AI read the board?

- **On every turn** (current behavior for some paths — high latency, often unnecessary)
- **Only when the kid asks** ("look at this", "check my work", "what did I write?")
- **Automatically when ink changes** (debounced — capture in background, have the summary ready)
- **At page transitions** (when the kid moves to a new page, the AI processes the previous page)

### Q4: Should the canvas exist in Books mode?

- **Option A:** Books mode has its own drawing surface (a simplified canvas inside each lesson's "Apply" beat).
- **Option B:** Books mode opens the full canvas when drawing is needed, with the lesson context loaded.
- **Option C:** Books mode stays as-is (no drawing), and drawing only happens in Draw mode.

### Q5: What's the minimum that makes the canvas useful for kids TODAY?

If you had to ship something in one week, what's the smallest change?

My suggestion: **Just constrain the zoom range (0.8× – 1.5×) and normalize brush width.** That alone eliminates the "page 1 is big, page 2 is small" problem without any page system. Then build pages in the next sprint.

---

## 7. Summary of Recommendations

| Decision | Recommendation | Confidence |
|----------|---------------|------------|
| Canvas model | **Notebook with pages** (Option B) | High |
| Page dimensions | **1200 × 1600 logical units** (3:4 portrait) | Medium — needs testing |
| Zoom range | **0.8× – 1.8×** (constrained from current 0.35× – 2.5×) | High |
| Brush width | **Normalize to fixed logical width** regardless of zoom | High |
| Page navigation | **Swipe + arrows + "+" button** | High |
| Implementation approach | **Constrain existing engine + snapshot-based pages** (don't rewrite) | High |
| AI board capture | **Per-page, fixed resolution, not zoom-dependent** | High |
| PDF export | **One page = one PDF page** | High |
| Mobile strategy | **Same logical page, width-fit viewport, vertical scroll** | High |
| AI latency | **Separate problem — don't capture board every turn** | High |
| Build order | **Step 1-3 (zoom constraints) first, Step 4+ (pages) second** | High |

---

## 8. Two Canvases: Full Notebook vs. Light Scratchpad

> Added after further brainstorming. The insight: not every drawing surface needs every feature. Sometimes the kid just needs to scribble "A, B, C" or write "24 × 3 = 72". Other times they need the full power.

### 8.1 The Two-Tier Concept

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│   FULL CANVAS ("Notebook")                                       │
│   ─────────────────────────                                      │
│   Standalone mode. All tools.                                    │
│   The kid opens it intentionally to work.                        │
│                                                                  │
│   Tools: Pen, Eraser, Color picker, Shapes, Text box,           │
│          Lasso select, Hand/pan, Undo/Redo, Image insert,       │
│          Widgets, Plugins, AI interaction                        │
│                                                                  │
│   Page system: Notebook model (Section 3 above)                  │
│   Zoom: 0.8× – 1.8×                                             │
│   Persistence: Full snapshot to IndexedDB / Supabase             │
│   AI: Board capture, vision analysis, teaching on canvas         │
│                                                                  │
│   Size: ~584KB JS / 13,000 lines                                 │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   LIGHT CANVAS ("Scratchpad")                                    │
│   ────────────────────────────                                   │
│   Embedded inline within Talk mode, Books mode,                  │
│   curriculum activities, interactive challenges.                 │
│   The kid uses it to RESPOND, not to explore.                    │
│                                                                  │
│   Tools: Pen (one color), Eraser, Clear, Done                    │
│   NO: shapes, text boxes, selection, plugins, widgets,           │
│       hand tool, color picker, image insert, zoom, pan           │
│                                                                  │
│   Fixed viewport: Single fixed-size surface, no zoom, no pan     │
│   Persistence: Captured as PNG when "Done" is tapped             │
│   AI: Image sent to Primer for analysis                          │
│                                                                  │
│   Size: ~15-20KB JS (NEW, standalone, no canvas engine deps)     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 When Each Canvas Is Used

| Scenario | Which Canvas | Why |
|----------|-------------|-----|
| Kid taps "Board" mode in the top nav | **Full** | They're choosing to work on the canvas intentionally |
| Kid wants to solve a math problem with AI tutoring | **Full** | Needs space, multiple steps, AI reads the board |
| Books mode "Apply" beat — "Draw what you think happens" | **Scratchpad** | Quick response, not a work session |
| Talk mode — "Can you write the answer?" | **Scratchpad** | Inline response within the conversation |
| Books mode "Challenge" beat — "Solve this: 3/4 + 1/2" | **Scratchpad** | Quick math work, gets captured and sent to AI |
| Curriculum quiz — "Which one? Write A, B, C, or D" | **Scratchpad** | Just a letter. No tools needed. |
| Kid says "Let me draw it" during a Talk conversation | **Scratchpad** (inline) or **Full** (if complex) | The Primer can decide based on the complexity |
| Free exploration / "I want to draw something" | **Full** | Unstructured creative time |

### 8.3 The Light Scratchpad — Detailed Design

The key insight: **the Scratchpad does NOT reuse the Full Canvas engine.** The full engine is 584KB of code handling tiles, infinite canvas, zoom, pan, selection, widgets, plugins, AI drafts, animations, text editors, image manipulation — none of which the Scratchpad needs.

Instead, the Scratchpad is a **new, tiny, self-contained component** — a single `<canvas>` element with just enough JS to:

1. Draw strokes (pointer events → canvas 2d context)
2. Erase strokes (toggle eraser mode)
3. Clear the canvas
4. Export to PNG (for AI to read)

```
Scratchpad Architecture:

┌────────────────────────────────────┐
│  ┌──────────────────────────────┐  │
│  │                              │  │
│  │       <canvas>               │  │
│  │       (fixed size)           │  │
│  │                              │  │
│  │       No zoom. No pan.       │  │
│  │       Just draw.             │  │
│  │                              │  │
│  └──────────────────────────────┘  │
│                                    │
│  [ ✏️ Pen ]  [ Eraser ]  [ Clear ] │
│                                    │
│          [ ✓ Done ]                │
│                                    │
└────────────────────────────────────┘
```

**Dimensions:**
- **Logical size:** Fixed. Same on every device. E.g., **800 × 500** logical units (landscape, wider than tall — good for math and short answers).
- **Viewport:** The `<canvas>` element stretches to fill the available width (e.g., the chat bubble width in Talk mode, or the lesson content area in Books mode). Height scales proportionally.
- **No zoom, no pan.** The surface is what it is. If the kid needs more space, they use the Full Canvas.
- **Alternatively for math:** A portrait-oriented **600 × 800** scratchpad (taller than wide) for step-by-step calculation work.

The Scratchpad could even offer two shape presets:
- **Wide** (800×500): For diagrams, labeling, short answers — "Draw what you think the water cycle looks like"
- **Tall** (600×800): For math work, step-by-step — "Show your work: 24 × 37"

**Drawing:**
- Single pen color (the current theme color, e.g., dark blue `#1d4ed8`).
- Fixed stroke width (no pressure sensitivity — keep it simple).
- Simple eraser (stroke-level erase, not pixel erase — tap a stroke to remove it, or use a wide eraser).
- No undo/redo (or just one level of undo — "oops" button).

**The "Done" button:**
- When the kid taps "Done," the Scratchpad:
  1. Captures the canvas as a PNG (`toDataURL("image/png")`).
  2. Renders a static image preview in-line (the canvas element is replaced by the captured image).
  3. Sends the image to the Primer for analysis (vision API).
  4. The Primer responds based on what it sees.
- The kid can tap the preview to re-open the Scratchpad and edit.

**Where it appears:**
- **In Talk mode:** As a chat bubble. The Primer says "Can you draw that for me?" and a Scratchpad bubble appears below. The kid draws, taps Done, and their drawing appears as a chat message.
- **In Books mode:** Inside the lesson view. The "Apply" beat shows the instruction and a Scratchpad below it. The kid draws, taps Done, and the lesson advances.
- **As a Primer prompt:** The orchestrator can trigger a Scratchpad when it wants the kid to demonstrate understanding.

### 8.4 Should the Scratchpad Reuse Canvas Engine Code?

This is the practical engineering question. There are two paths:

**Path A: Build from Scratch (~1-2 days)**

Write a new `scratchpad.js` that is completely standalone:
- A `<canvas>` element
- `pointerdown/move/up` event handlers
- A simple stroke buffer (array of points)
- `ctx.beginPath(); ctx.moveTo(); ctx.lineTo(); ctx.stroke();`
- Eraser toggles `globalCompositeOperation = "destination-out"`
- `canvas.toDataURL()` for export

This is ~200-300 lines of JS. No dependencies on the existing canvas engine. Dead simple. Easy to embed anywhere.

**Pros:** Tiny, fast to load, zero risk of breaking the Full Canvas, can be dropped into any HTML context.
**Cons:** Doesn't benefit from the Full Canvas's sophisticated stroke rendering (pressure, smoothing, retina handling).

**Path B: Extract a subset from the Full Canvas Engine**

Pull out `canvas-tiles.js` and `canvas-rendering.js` and wrap them in a constrained container. Disable zoom, pan, selection, widgets, plugins, AI drafts, etc.

**Pros:** Same rendering quality as the Full Canvas. Strokes look identical.
**Cons:** Hard to isolate. The engine files are deeply interdependent (they share the `state` object, reference `SIZE`, use the tile system). Extracting a clean subset without pulling in half the engine is a significant refactoring effort. Risk of introducing bugs in the Full Canvas.

**Recommendation: Path A (build from scratch).**

A 200-line scratchpad with simple `ctx.lineTo()` strokes is perfectly fine for "write A, B, C" or "show 24 × 3 = 72." The kid doesn't need pressure-sensitive, retina-optimized, tile-based rendering for a quick scribble. The Full Canvas exists for when they DO need that. Keep the two completely separate.

### 8.5 How the Primer Decides Which Canvas to Use

The orchestrator already classifies intent in `kid-intent.js`. The decision can be:

```
"I want to draw" / "Let me use the board"  →  Full Canvas
"Write your answer"                         →  Scratchpad (inline)
"Draw what you think happens"               →  Scratchpad (inline)
"Show your work"                            →  Scratchpad (inline, tall variant)
"Solve this problem step by step"           →  Full Canvas (needs space + AI feedback)
"Quick: what's 7 × 8?"                      →  Scratchpad (or even just voice/text)
Books mode "Apply" beat                     →  Scratchpad (embedded in lesson)
Books mode "Challenge" beat with math       →  Scratchpad (embedded, tall)
```

The general rule: **Scratchpad is for responses. Full Canvas is for sessions.**

If the kid is "answering a question" → Scratchpad.
If the kid is "working on a problem" → Full Canvas.

### 8.6 What This Means for the Notebook Model

The Notebook Model (Section 3) applies ONLY to the Full Canvas. The Scratchpad doesn't need pages, doesn't need persistence beyond the captured PNG, doesn't need zoom constraints — it's already fixed.

So the build plan becomes:

```
Phase 1 (quick win):
  - Build the Scratchpad component (~200 lines, standalone)
  - Embed it in Talk mode and Books mode
  - Wire "Done" → capturePNG → send to Primer

Phase 2 (canvas constraints):
  - Constrain Full Canvas zoom to 0.8× – 1.8×
  - Normalize brush width
  - Constrain pan to content bounds

Phase 3 (notebook):
  - Add page system to Full Canvas
  - Per-page AI capture
  - PDF export
```

This way, the kid gets an inline drawing surface almost immediately (Phase 1), while the Full Canvas improvements roll out over time.

### 8.7 The Scratchpad Solves the "AI Latency on Canvas" Problem Too

You mentioned the AI isn't ready to do heavy lifting on canvas — latency, complexity, etc. The Scratchpad sidesteps this entirely:

- The Scratchpad image is **small** (800×500 or 600×800 pixels). Vision API processes it fast.
- The content is **simple** (a letter, a number, a basic diagram). No need for complex OCR or scene understanding.
- The Scratchpad is used for **quick responses**, so the kid expects a short wait. Not like the Full Canvas where they've been drawing for 5 minutes and expect the AI to understand everything.
- The Primer already knows **what the kid was asked** (it asked the question!), so the vision call is guided: "I asked them to write A, B, C, or D. They drew [image]. What did they write?" — much easier than open-ended "What's on this canvas?"

### 8.8 Open Questions on the Two-Canvas Design

**Q6: Should the Scratchpad support multiple colors?**

One color keeps it dead simple. But a kid explaining a diagram might want "red for heat, blue for cold." Maybe: **one pen color by default, but a simple 4-color palette (black, red, blue, green) accessible via a tiny toggle.** Not the Full Canvas's 13-color orbital picker.

**Q7: Should Scratchpad strokes be erasable individually, or pixel-wipe?**

- **Individual stroke erase** (tap a stroke to remove it): Cleaner, but requires tracking strokes as objects (slightly more complex).
- **Pixel wipe** (eraser paints with background color): Simpler code, but messier results.
- **"Clear all" only**: Simplest possible. Just clear the whole thing and redraw. For a quick scribble, this might be enough.

Recommendation: Start with **"Clear all" only**. Add individual stroke erase later if kids need it.

**Q8: Should the Scratchpad result be editable after "Done"?**

- **Option A:** After "Done," the drawing is locked. The kid can only clear and start over.
- **Option B:** After "Done," the kid can tap the image to re-open the Scratchpad and keep editing.
- **Option C:** After "Done," the drawing becomes a static image in the chat/lesson. A new Scratchpad instance can be opened for the next response.

Recommendation: **Option C** — it behaves like sending a message. You wrote it, it's there, you can write another one. Keeps the flow moving forward.

**Q9: Should the Full Canvas be embeddable too?**

In the future, could the orchestrator decide "this kid needs the Full Canvas for this problem" and open it inline? Or should the Full Canvas always be a separate mode?

Recommendation: **Keep the Full Canvas as a separate mode for now.** Embedding the 584KB engine inline is complex and performance-heavy. The mode switch (tap "Board" in the top nav) already works. The Primer can say "This is a big problem — let's go to the Board" and the kid taps over.

---

> **TIP:** The fastest path to "100× better canvas for kids" is not the page system — it's **zoom constraints + brush normalization.** That's a few-line change in `canvas-text-editors.js` and `core.js`. But if you want the quickest WIN for the unified experience, build the **Scratchpad first** (~1-2 days) and embed it in Talk and Books mode. That gives kids an inline drawing surface without touching the Full Canvas at all.
