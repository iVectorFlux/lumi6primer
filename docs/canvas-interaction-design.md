# Canvas Interaction Architecture & UX Redesign

> **Context**: Comprehensive review of Primer's canvas interaction model, addressing toolbar clutter, terminology ambiguity (`Send Back`, `Typeset`, `Plot`), the disconnected AI Orb, the "Hint vs. Answer" pedagogical conflict, seamless stroke selection, and text box usability.

---

## 1. What the Current Canvas Actually Does (The Reality in Code)

To fix the ambiguity, we first need to see what each button is actually programmed to do today in `src/server/main.js`, `src/client/app/core-plugins.js`, and `src/client/app/ui-bootstrap.js`:

### The Bottom AI Orb Actions:
| Action | What the Code Does | Why It Confuses Kids & Teachers |
| :--- | :--- | :--- |
| **`Answer`** | Prompts AI: `"directly answer the newest question or spatial request"`. Directly writes out the final result on canvas. | If kids can get the answer with one tap, they bypass thinking entirely. Defeats the platform's Socratic learning goal. |
| **`Hint`** | Prompts AI: `"for an actual problem offer a clue; for conversation respond naturally"`. | Sits right next to "Answer". As the user noted: *if "Answer" is right there, nobody will ever pick "Hint"*. |
| **`Explain`** | Prompts AI: `"explain the newest content or the content referenced by a box and arrow"`. | **The most natural and valuable action!** When a student writes Pythagoras theorem or draws a diagram, they want conceptual understanding. |
| **`Continue`** | Prompts AI: `"continue the newest user content"`. Autocompletes number sequences, sentences, or patterns. | Developer-style autocomplete. Kids don't think in terms of "autocomplete token stream" — they don't know what it will do. |
| **`Plot`** | Prompts AI: `"produce at least one renderable visual command; use plot_function for y=f(x), otherwise draw for a diagram"`. | Highly technical CAD/math term. A 7-year-old or 10-year-old has no idea what "Plot" means. They think of a story plot, not Cartesian function plotting. |

---

### The Selection Bar Actions (When Lassoing):
| Action | What the Code Does | Why It Confuses Kids & Teachers |
| :--- | :--- | :--- |
| **`Send Back`** | Executes `commitSelection({ sendBackwards: true })`. Pushes the selected ink strokes down the z-index layer stack behind older strokes. | **Total jargon from Adobe Illustrator.** Kids think "Send Back" means "Submit homework back to teacher" or "Undo". Z-ordering has almost no place in a kid's math/scribble board! |
| **`Typeset`** | Prompts AI: `action: "normalize"`. Transcribes messy handwriting into digital text/math fonts using KaTeX. | Gutenberg-era typography jargon. Kids know "Clean up", "Make neat", or "Magic text", not "Typeset". |
| **`Visualize`** | Calls visual generation/diagram engine. | Redundant with `Plot` and `Explain`. Why is visual generation split across two different toolbars? |
| **`Delete`** | Erases selected strokes. | Useful, but should be a clear trash icon, not a heavy text button. |
| **`Cancel`** | Deselects the lasso without erasing strokes. | Clutter. Tapping anywhere outside the selection naturally dismisses it in standard mobile/web UX. |

---

## 2. The Core Problems: Why the Canvas Feels Clunky

### Problem A: The "Dual Interface" Disconnect
- **Island 1 (The Strokes)**: The kid draws a triangle at the top-left of the canvas.
- **Island 2 (The Selection Bar)**: Appears above the triangle with 5 developer buttons (`Typeset`, `Visualize`, `Send Back`, `Delete`, `Cancel`).
- **Island 3 (The AI Orb)**: Floats way down at the bottom-center of the screen with 5 completely different radial buttons (`Answer`, `Hint`, `Continue`, `Explain`, `Plot`).

> **The Result**: The user doesn't know where to look. Do I click `Typeset` on the selection bar? Or do I travel down to the bottom Orb to click `Explain`? Why are the AI's capabilities split across two opposite sides of the screen?

### Problem B: The "Hint vs. Answer" Pedagogical Paradox
- If you present a child with both **"Hint"** and **"Answer"**, 95% of children will click **"Answer"**.
- This directly violates Primer's mission: *"building creativity, curiosity, understanding concepts from first principles, and independent thinking"*.
- Handing out instant answers turns the AI into a homework-cheating machine instead of a Socratic tutor.

### Problem C: High Friction to Target Handwriting
- Right now, if a student writes two different things on the canvas (e.g. `1 + 1 = ?` on the left and `2 + 3 = ?` on the right):
  1. If they click the Orb, the AI guesses or gets confused by multiple items.
  2. To target just one problem, the student must:
     - Stop drawing with pen.
     - Move to toolbar, click the Lasso tool.
     - Carefully draw a closed loop around `1 + 1`.
     - Move hand to selection toolbar or bottom orb.
     - Click an action.
- That is **5 clicks and tool switches** just to ask a question about what they wrote!

### Problem D: Rigid, Unfriendly Text Boxes
- Default size is huge: `320px × 96px` with massive `32px` font.
- Dragging handles mixes font scaling and box resizing in unintuitive ways (dragging height changes font size; dragging width changes auto-wrap).
- Doesn't feel like a modern interactive whiteboard (Miro, FigJam, Excalidraw, Freeform).

### Problem E: Wall-of-Text AI Responses vs. Structured KaTeX Step Cards
- **Observed in Testing**: When a student writes a formula like $F = ma$, the model outputs a lengthy, unstructured flat paragraph:
  > *"Newton's second law force equals mass acceleration, F net force Newton N, m mass kilograms kg, a acceleration m/s^2, thus a larger force causes..."*
- **Key Flaws**:
  1. **Zero KaTeX/Math Formatting**: Mathematical formulas lack structured typesetting (e.g. $F = m \cdot a$, $m/\text{s}^2$) and get dumped as raw text with confusing line-breaks.
  2. **Wall of Text**: Kids cannot digest a single unformatted block of technical prose.
  3. **No Step-by-Step Scaffolding**: It should be structured into progressive step cards:
     - **Card 1: The Law & Principle** ($F = ma$ explained simply).
     - **Card 2: The Variables & Units** ($F$ in Newtons, $m$ in kg, $a$ in $\text{m/s}^2$).
     - **Card 3: Intuitive Physical Meaning** (*"A heavier cart takes more push to speed up"*).
  4. **Dead-End Interaction**: What if the student has questions? The canvas explanation is currently static without follow-up inquiry chips (*"Why does mass resist acceleration?", "What happens in zero gravity?"*).

### Problem F: The Voice Orb Redirection Trap
- **The Issue**: Clicking the bottom 3D Voice Orb while on the Whiteboard previously invoked `setAppViewMode("talk")`, abruptly pulling the student off the canvas into the Chat page.
- **The Fix**: Clicking the Voice Orb on the Whiteboard must **stay on the whiteboard** and ask Lumi to explain what is drawn or currently selected (`invokeAIAction("explain")`), never ejecting the student from their active canvas.

---

## 3. The Unified Solution: "Contextual Micro-Pills" (Zero-Click Targeting)

Instead of forcing kids to switch to a lasso tool and circle things manually, we introduce **Natural Gesture & Smart Proximity Targeting**:

```
+-----------------------------------------------------------+
|  Canvas Surface                                           |
|                                                           |
|       3 + 5 = ?                                           |
|      +---------+                                          |
|      | [✨ Ask Lumi] [💡 Hint] [🗑️]                      |
|      +---------+  <--- Floating context pill appears      |
|                        right below newest strokes          |
|                                                           |
|                                                           |
|       a² + b² = c²                                        |
|      (Older problem - dormant until tapped)               |
|                                                           |
+-----------------------------------------------------------+
```

### How It Works:
1. **Auto-Clustering (Pause Detection)**:
   - When the student writes `3 + 5 = ?` and pauses for 1.2 seconds, the engine detects the bounding box of the recent stroke cluster.
   - A subtle, friendly floating chip appears right next to what they just wrote:
     **`[ ✨ Ask Lumi ]`**
2. **Instant Tap (No Lasso Tool Needed)**:
   - If they wrote multiple things on the board earlier, they don't need a lasso tool.
   - **Just tap any writing**: Tapping on or near any cluster of handwriting instantly highlights it and pops up the context pill!
3. **Optional Precision Lasso**:
   - If they have messy, overlapping drawings and *want* to draw a custom loop, the lasso tool still exists in the bottom tray. But 90% of interactions never require selecting the lasso tool.

---

## 4. Re-imagining the AI Tutor Actions: "The Socratic Ladder"

Kill the developer terms: `Plot`, `Continue`, `Normalize`, `Send Back`.
Replace them with a pedagogical **Progressive Ladder**:

```
                       [ 💡 Help Me Think ]  (Default / Friendly)
                                |
             +------------------+------------------+
             |                                     |
    "Am I on the right track?"            "Explain this to me"
    (Checks work without spoiling)        (First principles breakdown)
             |
    "Give me a clue" (Hint)
             |
    "Show full solution" (Protected / Requires 1 confirmation)
```

### The New Action Set:
1. **`💡 Help Me Think` (or `Explain`)**:
   - **For a math problem**: Checks the student's work and asks a Socratic question: *"You've got the hypotenuse right! What do we do with 2² and 3² next?"*
   - **For a concept (Pythagoras, Water Cycle, Gravity)**: Explains the concept visually with step-by-step illustrations.
2. **`✨ Make Neat` (replaces `Typeset`)**:
   - Cleans up handwriting into crisp typography and beautiful mathematical notation.
   - Friendly magic wand icon: instantly turns scribbles into readable notes.
3. **`📊 Show Visual / Graph` (replaces `Plot`)**:
   - Only appears when relevant (e.g. if an equation $y = 2x + 1$ or a geometric shape is detected).
   - Draws a coordinate plot or interactive geometric figure.
4. **`🗑️ Erase` (replaces `Delete`)**:
   - Clean, unmistakable trash icon.

### What Happens to `Answer`?
- **Do not make "Answer" the primary button.**
- When a student asks for help, Lumi acts as a tutor first:
  1. Feedback: *"Great attempt! Look closely at the plus sign..."*
  2. Clue: *"What is 2 squared?"*
  3. Option at the bottom of the dialogue: *"Still stuck? Show complete steps."*
- This preserves the joy of figuring things out while never leaving a child hopelessly blocked.

---

## 5. Cleaning Up the Toolbars

### What to Cut vs. What to Keep:

| Current Button | Recommendation | New Replacement / Action |
| :--- | :--- | :--- |
| `Send Back` | **DELETE** | Removed entirely. Kids do not need z-index layer management on an educational sketchpad. |
| `Cancel` | **DELETE** | Removed. Clicking anywhere outside the selection clears it naturally. |
| `Typeset` | **RENAME & KEEP** | Renamed to **`✨ Make Neat`**. |
| `Visualize` | **MERGE** | Merged into `Explain` / `Draw Visual`. |
| `Continue` | **DELETE FROM ORB** | Handled naturally by voice or conversational prompt ("What comes next?"). |
| `Plot` | **RENAME & CONTEXTUALIZE** | Renamed to **`📊 Graph`**, only visible when equations are selected. |
| `Hint` & `Answer` | **UNIFY** | Replaced by **`💡 Help Me / Guide`** with progressive Socratic hints. |

---

## 6. Text Box Experience Overhaul

### The Issues Today:
- Default box is too large (320×96) with huge 32px font.
- 8 resize handles clutter the box.
- Dragging bottom handle accidentally inflates font to 120px instead of making more writing room.

### Modern Whiteboard Text Standard:
1. **Click-to-Type with Auto-Fit**:
   - Clicking Text tool creates a compact, clean cursor with a subtle border.
   - Box width expands naturally as you type a sentence, wrapping at a sensible default width (~260px).
2. **Simplified Handles (4 instead of 8)**:
   - **Side handles (Left / Right)**: Adjust text wrap width (more columns or fewer columns).
   - **Corner handles**: Scale font size proportionally.
3. **Typography Presets**:
   - Small (`16px`), Medium (`24px`), Large (`36px`), Title (`48px`).
   - Clean floating bubble above active text box: `[ S | M | L | Title ]` + `[ 🎨 Color ]` + `[ 🗑️ ]`.

---

## 7. Comparison: Before vs. After Workflow

### Scenario: Kid writes Pythagoras Theorem (`a=2, b=3, c=?`)

| Step | Current (Confusing) Experience | Proposed (Seamless) Experience |
| :--- | :--- | :--- |
| **1. Write** | Writes $2^2 + 3^2 = c^2$ with pencil. | Writes $2^2 + 3^2 = c^2$ with pencil. |
| **2. Target** | Must click Lasso tool in bottom bar, draw a loop around the math. | **Automatic**: A subtle `[ ✨ Ask Lumi ]` pill floats right under the math. (Or kid simply taps the math). |
| **3. Action** | Selection bar pops up (`Typeset`, `Visualize`, `Send Back`, `Delete`, `Cancel`). Bottom Orb pops up (`Answer`, `Hint`, `Continue`, `Explain`, `Plot`). **10 confusing choices!** | **3 simple choices attached to the math**: `[ 💡 Explain ]` `[ ✨ Make Neat ]` `[ 🗑️ Erase ]`. |
| **4. AI Response** | If they click `Answer`, it just writes $c = \sqrt{13} \approx 3.6$ without explaining anything. | Clicking `💡 Explain` draws a right-angled triangle, shows square tiles on the sides, and guides them step by step. |

---

## 8. Implementation Pathway

1. **Phase 1: Kill the Jargon (Immediate Win)**
   - Remove `Send Back` and `Cancel` buttons from selection toolbar in `index.html` and `ui-bootstrap.js`.
   - Rename `Typeset` to `Make Neat`.
   - Hide `Plot` from the radial menu unless a mathematical formula is active.
2. **Phase 2: Contextual Selection Popover**
   - Anchor the AI actions directly to the selection bounding box rather than forcing the kid to travel down to the bottom Orb.
   - Tap-to-select stroke cluster (hit-testing ink strokes).
3. **Phase 3: Socratic Progressive Disclosure**
   - Update server prompt in `src/server/main.js` so that default requests offer guidance, questions, and visual explanation first, reserving raw answers for explicit confirmations.
4. **Phase 4: Fluid Text Box**
   - Streamline `canvas-text-editors.js` with auto-expanding width, clean corner scaling, and standard size presets.

---

## 9. The "Plot" Pathology: Why $F = G \frac{m_1 m_2}{r^2}$ Broke

### What Happened When You Tested It:
You wrote Newton's Law of Universal Gravitation:
$$F = G \frac{m_1 m_2}{r^2}$$
You clicked **`Plot`**. 
Instead of explaining gravitational attraction between two masses, the AI converted it into:
$$y = \frac{1}{x^2}$$
and drew an abstract mathematical line graph with an X-axis and Y-axis from $-1$ to $10$. 

### Why the System Did This (The Code Cause):
In `src/server/main.js` (line 333), the system prompt forces the AI into a rigid algebraic box:
```
For userAction plot, always return at least one visual command. If the handwriting contains y=f(x), f(x)=..., or a recognizable single-variable function, use plot_function rather than only draw_formula or write_text. plot_function.expression must be a browser-evaluable ASCII expression using x...
```
Because the LLM sees $r^2$ in the denominator, it mechanically translates the physical law into a single-variable calculus function $y = 1/x^2$. 

### Why This Fails for Kids:
* **Physics is not just Cartesian curves**: Gravitation is about two planets pulling on each other in space!
* **No labels, units, or context**: A kid seeing a line shooting up towards 10 learns nothing about why the Moon orbits Earth.
* **The distinction**:
  * **Function Plotting** ($y = \sin(x)$ or $y = 2x + 1$): Great for high-school algebra.
  * **Conceptual Scientific Modeling** (Gravity, Relativity, Photosynthesis, Circuits): Needs an **interactive or annotated physical diagram**, NOT an unlabelled $x/y$ line graph.

### The Fix: Smart Intent Routing
When a student asks to visualize or explain:
1. If it's a **pure function** ($y = x^2 - 4$): Render an interactive labeled graph with identifiable axes, roots, and vertex.
2. If it's a **physical law or concept** ($F = G \frac{m_1 m_2}{r^2}$): Render two celestial bodies with attraction force vectors $\vec{F}$, plus an intuitive slider/annotation showing:
   *"If you double the distance ($2\times$), the gravitational pull drops to $\frac{1}{4}$th!"*

---

## 10. First-Principles Visual Explanations: The Theory of Relativity Example

You raised a profound question:
> *"If we write something like 'What is theory of relativity?', and click on Explain, it should also be able to give me a diagram with explanation, step-by-step, all of it! The idea is they should be able to learn with first principles... the canvas should be able to provide the text in a very good format, in a meaningful format that kids can learn easily, which it is not able to do as of now."*

### Why the Current Canvas Fails at This Today:
In `src/server/main.js` (line 323), `explain` is instructed:
```
Use write_text for ordinary knowledge and conversation... Keep each write_text response at no more than about 200 tokens and 800 characters.
```
This causes the AI to spit out a **single wall of unformatted text** (up to 800 characters) dumped directly onto the ink canvas. 
* There are no diagrams.
* There are no bite-sized cards.
* There is no visual hierarchy (no headers, callouts, or bullet points).
* For a 10-year-old trying to understand Relativity, a giant gray text block is overwhelming and boring.

### The Solution: "Step-by-Step Concept Storyboards"
Instead of a wall of text, `Explain` on a major concept must generate a **3-Step Visual Storyboard**:

```
+---------------------------------------------------------------------------------+
|  EINSTEIN'S THEORY OF SPECIAL RELATIVITY (First Principles)                     |
|                                                                                 |
|  [ Step 1: The Puzzle ]     [ Step 2: The Core Rule ]     [ Step 3: The Magic ] |
|  +---------------------+    +---------------------+       +-------------------+ |
|  |   🚂 ---->          |    |      💡 ===>        |       |   ⏰ (Slows Down) | |
|  | Imagine you're on a |    | Light moves at the  |       | If light speed is | |
|  | train going 100mph  |    | same speed (c) for  |       | constant, TIME    | |
|  | and throw a ball at |    | EVERYONE, no matter |       | must stretch and  | |
|  | 20mph. To someone   |    | how fast they are   |       | bend to make the  | |
|  | outside, ball moves |    | moving!             |       | math work!        | |
|  | at 120mph!          |    |                     |       |                   | |
|  +---------------------+    +---------------------+       +-------------------+ |
+---------------------------------------------------------------------------------+
```

### Key Elements of the New Format:
1. **Bite-Sized Cards**: Never more than 2–3 sentences per card.
2. **Integrated Sketch/Diagram**: Each step has a simple, colorful visual (train, flashlight beam, bent clock).
3. **First-Principles Progression**:
   * *Step 1: Common Sense* (What we already know from daily life).
   * *Step 2: The Fundamental Postulate* (The one weird truth of nature).
   * *Step 3: The Consequence* (Why time dilation / length contraction happens).
4. **Interactive "Tell Me More" Handle**: Each card has a small `[ 🔍 Dive Deeper ]` button if the kid wants to explore further.

---

## 11. Selection & The 35% Zoom Trap

### The 35% Zoom Trap (Identified in Code):
In `src/client/app/canvas-text-editors.js` (lines 674 and 696):
```javascript
next = Math.max(0.35, Math.min(2.5, state.scale * factor));
```
The zoom is hard-clamped between **`0.35x` (35%)** and **`2.5x` (250%)**.

* **Why this breaks user experience**:
  * On a laptop screen (~1280px wide), zooming out to 35% lets you see only ~3,600 logical pixels wide.
  * But the canvas is **20,000 × 20,000** pixels!
  * If the AI generates a plot or diagram at coordinates that sit slightly further out, or if the student has multiple exercises across the page, **the student cannot zoom out far enough to see their entire work**. They hit a solid brick wall at 35%.

### The Fix: "Smart Frame" & Content-Aware Zoom
1. **Dynamic Min-Zoom (`fitToContent`)**:
   Instead of a hardcoded 0.35 clamp, compute min-zoom dynamically based on where strokes and objects exist. If the drawings span 6,000 pixels, allow zooming down to `0.15x` so everything fits comfortably on screen.
2. **One-Tap Object Selection**:
   In `persistence.js` (line 2001), selection currently requires manually dragging a lasso loop around an object.
   * **New Behavior**: Clicking or tapping directly on any generated diagram, plot, or text box **immediately selects the entire object**.
3. **Double-Tap / "Frame" Button**:
   When an object or drawing is selected, a small `[ 🔍 Focus ]` button appears. Clicking it smoothly pans and zooms the viewport so the selected work is perfectly centered and readable.

---

## 12. De-mystifying the AI Orb Color: Why It Keeps Changing

You noticed that the Orb color changes unexpectedly. In the code, there are **three distinct triggers** causing this:

### Trigger 1: Real-Time Shader State Changes
In `public/js/tutor/lumi6-orb.js` (lines 20–28, 353–361), the Orb is rendered via a 3D WebGL raymarching shader. When the AI changes state, it switches shader presets:
* **Idle**: Calm, slow rotation (warm peach/amber gradient).
* **Thinking**: Speed increases to $1.25\times$, turbulence to $0.95$, and cooler blues/electric purples bleed into the core.
* **Speaking**: Expands slightly and pulses with voice cadence.
* **Result**: While the user is drawing or waiting for an AI response, the Orb visually shifts colors and turbulence.

### Trigger 2: Board Theme Switching
In `src/client/app/core-plugins.js` (line 868), the canvas has 6 distinct themes:
* `studio` (Peach / Clean)
* `arcane` (Deep Violet / Mystic)
* `scifi` (Cyan / Futuristic)
* `research` (Slate / Technical)
* `indic` (Saffron / Cultural)
* `canvas-pro` (Graphite / Minimal)

When you open a previously saved canvas that was created under a different theme, [`persistence.js`](file:///Users/product/Primer/src/client/app/persistence.js#L541) automatically runs `applyTheme(item.theme)`, instantly altering the Orb's theme and backdrop!

### Trigger 3: Cross-Sync with Talk Mode (VoicePill)
In `lumi6-orb.js` (lines 59–99), the Board Orb and the Talk Mode Pill share localStorage preferences. If a user or demo changes the character palette in the Talk Mode customizer (`amber`, `violet`, `emerald`, `azure`, `coral`, `obsidian`), the Board Orb changes its palette on next refresh.

### How to Make It Predictable for Kids:
* Keep the Orb in a consistent, friendly, recognizable color (e.g. warm golden Lumi glow).
* Use subtle breathing animations for "thinking" rather than jarring color shifts that confuse children.

---

## 13. The "Kids Love It" Simplicity Manifesto

Children love tools like Apple Notes, Procreate, and Paper by 53 because **they get out of the way**. 

To make Primer's canvas something kids genuinely love, we must apply three non-negotiable rules:

### Rule 1: No CAD or Developer Vocabulary
* ❌ `Send Back` $\to$ **Gone**.
* ❌ `Typeset` $\to$ **`✨ Make Neat`**.
* ❌ `Plot` $\to$ **`📊 Graph`** (or auto-generate diagrams when relevant).
* ❌ `Cancel` $\to$ **Gone** (click outside to dismiss).

### Rule 2: Put Actions Where the Kid is Looking
* Stop making kids look down at an Orb 900 pixels away from where they just drew.
* Context actions appear **right next to the stroke**.

### Rule 3: Teach with Wonder, Not Walls of Text
* For concepts (Relativity, Photosynthesis, Gravity): **Bite-sized story cards with visual metaphors**.
* For math problems: **Gentle clues that celebrate effort, not instant spoilers**.

