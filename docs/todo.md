# Todo

Working list. Newest thinking at the top. Status: `[ ]` open, `[~]` in progress, `[x]` done, `[-]` dropped.

---

## 1. Thinking Mode (inquiry tutor)

The goal is a tutor that builds the child's thinking, not one that delivers answers. Design notes
from the Sep 13 session. Nothing here is implemented yet.

### Why this is a new mode, not an edit

Today's Talk Mode is deliberately **explain-first**, and the prompts enforce it:

- `src/primer/tutor/context-builder.js` — `ANSWER FIRST: If they asked a question, teach it immediately.`
- Same file — `NEVER ask ... "What is your hypothesis..."` and `NEVER ask vague/lazy questions ("What do you think?")`

Those bans are scar tissue from the tutor previously feeling like an interrogation. So inquiry ships as a
**third mode** beside `manual` / `autopilot` (`MODES` in `src/primer/constants.js`), opt-in, leaving
today's behaviour untouched.

### Phase machine — advances on evidence, never on turn count

| Phase | Tutor's job | Advances when | Stores |
| --- | --- | --- | --- |
| `mystery` | Turn their question into a shared observation; split observation from explanation | Child agrees what we're explaining | `concept`, `observation` |
| `hypotheses` | Elicit 1–3 candidate explanations in *their* words | ≥1 hypothesis captured | `hypotheses[]` verbatim |
| `prediction` | "If that were true, what should we see?" | Child states a consequence | `prediction` |
| `evidence` | Compare prediction against an interactive or a fact they already hold | Child notices match/mismatch | `evidenceSeen`, hypothesis → `supported`/`refuted` |
| `model` | Now teach the mechanism fully. Vocabulary **last** | Child can restate it | `modelTaught` |
| `transfer` | Same model, new situation (sunset, space, Mars) | Child applies it, or fails usefully | dimension evidence |

Reflection is a session-end move, not a phase. Asking a 9-year-old "how did your thinking change?"
mid-flow just stalls the conversation.

- [ ] Store the child's hypotheses **verbatim** so turn 6 can say "earlier you thought the ocean reflects up — what about over a desert?". This is most of the perceived intelligence and it is cheap.
- [ ] Add `inquiryState` to `TutorState.snapshot()` (`src/primer/tutor/tutor-state.js`). It is currently set in `orchestrator._finish` and then **dropped**, so no arc can survive a turn.
- [ ] Extend `PedagogicalPolicy._lockInquiryPhase` (`pedagogical-policy.js`) from today's `hook`/`mechanism` stub into the real machine above.

### Anti-interrogation governor — build this first

The failure mode is a tutor that will not stop asking questions. Enforce structurally, before the prompt
is built, not by hoping the model behaves:

- [ ] "Just tell me" always wins → jump to `model`, teach fully. Non-negotiable; this is the trust contract.
- [ ] Two failed elicitations in a phase → teach that piece, resume one phase later. Track as `teachDebt`.
- [ ] `intent === "dont_understand"` → exit inquiry, repair the missing prerequisite.
- [ ] Boredom signals (shortening answers, topic hops) → teach and move on.

### Prompts

- [ ] Add a separate `inquiryPrompt` branch in `ContextBuilder.build` rather than editing `talkPrompt`. Small per-phase prompts (~12 lines), not one mega-prompt — the current 40-line prompt is part of why behaviour is muddy and slow.
- [ ] Per-phase length budget: `mystery` / `hypotheses` 2–3 sentences, `model` 6–8. The variation is the tell that the tutor is doing something other than lecturing.
- [ ] Vocabulary is a gate, not an opening: "Rayleigh scattering" may only appear in `model`.
- [ ] The tutor may never say "that's wrong" — only ask what the idea predicts. That is what teaches falsification instead of compliance.

### Blockers outside the prompt

- [ ] `ResponsePolicy` (`response-policy.js`) **injects a question** when the model didn't ask one, and floors replies at ~6 sentences. Both must be disabled in this mode or scaffolding can never fade and every turn sounds identical.
- [ ] `reasoning_profile` / `knowledge_map` are **write-only** today: evidence goes in, nothing reads it back to change how the tutor talks. Feed `independence_level` into prompt construction.
- [ ] Flip interactives to evidence-first. `graphic-scene.js` currently fires alongside the explanation; in `evidence` phase the interactive should arrive *before* the mechanism ("you predicted X — change the particle size and watch").

### Grade calibration

One loop, three knobs — not twelve pedagogies. What changes by age is the rung on the explanation
ladder, which thinking moves the child can perform, and how much the tutor says per turn.

| | Class 1–2 | Class 3–5 | Class 6–8 | Class 9–12 |
| --- | --- | --- | --- | --- |
| Hypotheses at once | 1 | 1–2 | 2–3 | 3+, compared |
| Falsification | not yet | "what would we see?" | "what would that mean?" | "what would disprove me?" |
| Abstraction | touchable things | concrete cause → effect | mechanism, variables | formal, quantitative |
| Answer format | yes/no, point | 2–3 choices | choices or open | open, no choices |
| Turn length | 1–2 sentences | 3–5 | 5–7 | 6–10 |
| Ethics | fair / not fair | who gets hurt | competing interests | responsibility, tradeoffs |

- [ ] Today grade does exactly two things: pick between three hardcoded prompt paragraphs (`gradeNum <= 5`, `<= 8`, else) and filter interactives by class. Replace with the band table above.
- [ ] Grade must be a **prior, not a cage**. It sets the starting estimate per thinking dimension; evidence moves it. A Class 4 child producing falsifiable predictions should climb while keeping Class 4 vocabulary.
- [ ] Concept ladders are the real content work: per concept, the observation, a true one-sentence mechanism at ~4 levels, vocabulary unlock points, and known misconceptions with their killer question. ~15 lines each. Author the ~40 concepts kids actually ask about; generate the long tail under band constraints.
- [ ] Hard constraint (`simplify the model, not the truth`): every rung must be true, just coarser. "The air absorbs the other colours" is easier and wrong, and creates a misconception to unlearn later. Human review on the core set — this is exactly where an LLM invents the plausible-but-false simplification.
- [ ] Class 1–2 is unsupported today: onboarding is `CLASSES = ["3" ... "12"]` in `public/js/tutor/lumi6-onboard.js`. The DB has class 1–2 interactives. Product decision needed.

### Measurement

- [ ] Don't build the 13-dimension table yet; inferred from kid speech over voice it is mostly noise. Start with the three evidence kinds the pipeline already extracts honestly: `self_correction`, `revision`, `insight`. A child who visibly changes their mind is the whole thesis.

### Sequencing

- [ ] One concept, one grade band, text + board **before** voice. Inquiry over speech-to-text is much harder — the prompt already fights mishearings like `'Tarzan' for 'Darwin'`, and a wrong hypothesis restated wrongly compounds.

---

## 2. Interactives — migrated to `public.interactives`

- [x] Point the catalog at `public.interactives` instead of `lesson_interactives` (`store.listInteractives`).
- [x] Fetch `html_content` per interactive on demand (`store.getInteractiveHtml`) instead of pulling every row's HTML. 114 × ~20 KB was too heavy for one cached read.
- [x] Map rows to the matcher's shape in `tools/lesson-interactive.js`: `id` → slug, `tags` → search topics, `class` → `grade_min`/`grade_max`, `config->>description` → summary.
- [x] Strip `class-3` / `grade-3` / `third-grade` tags from search topics — the `class` column already handles grade filtering.
- [x] Ignore `iframe_code`. It points at the generator's `http://localhost:3000/preview/<id>`; we serve the stored HTML through `/api/primer/interactive/:slug?embed=1` and wrap it with our own embed CSS.
- [x] Smoke check: `node scripts/check-interactives.js`.

### Coverage as of migration

1200 catalog rows, but only **114 have `html_content`** (`is_available = true`). The rest are planned
topics. Availability is lumpy — good for class 1–6, thin above:

| Subject | Classes 1–6 | Classes 7–12 |
| --- | --- | --- |
| math | 44 | 10 |
| science | 45 | 15 |

- [ ] Generate HTML for the high classes; class 9 science and class 10 math currently have zero.
- [x] Matcher fixes in `catalog.js` (`node scripts/check-interactives.js` now self-matches 91/114, up from the handful that worked):
  - Apostrophes were split into separate words, so `kepler's laws` became `kepler s laws` and never matched the tag `kepler-laws`.
  - No plural handling, so `kepler's law` missed `kepler-laws`. Words are now stemmed on both sides.
  - Grade was a hard filter at class ±1, so a class-5 profile could never see the class-11 Kepler or thermodynamics widgets. Grade is now a ranking penalty; off-level content needs a distinctive, explicitly named match (`FAR_GRADE_MIN_SCORE`).
  - Whole-query-is-the-topic rule for one-word searches (`fractions`, `kepler`), plus title-derived `keywords` as weak aliases for items whose tags are all compound phrases.
  - Short generic words no longer earn the concept bonus — that made `newton's third law` match a class-2 fractions widget tagged `thirds`. Off-topic guard cases are in the smoke check.
- [ ] Content gaps the matcher can't fix: no magnetism interactive for classes 3–6; `magnets` still misses.
- [x] Pair each interactive with a free Wikimedia image, side by side. `orchestrator.js` used to pick one or the other; the interactive branch now also asks `lessonGraphic.generate({ freeOnly: true })`, which stops after the Wikipedia/Commons lookup and never reaches the paid OpenAI fallback. When no free image exists the interactive shows alone. Rendering is `.talk-visual-pair` in `ui-talk-mode.js`: two columns on laptop and tablet, stacked under 640px. "Open playground" already existed per interactive.
- [ ] `store.upsertInteractives` and `scripts/seed-interactives.js` still write to the retired `lesson_interactives` table. Delete or retarget.
- [ ] The 19 files in `content/interactives/` are now only an offline fallback. Decide whether to keep them.

---

## 3. Dropped

- [-] **Live ink snap** (Sep 13). Geometry snap for lines/circles/boxes plus a `$P` stroke matcher for letters, all in-browser and free. Removed: a `P` was read as `1` plus a tiny `7`, strokes got cut mid-letter, and `K A M` came back as nothing. Free on-device recognition is not good enough for kid handwriting without a real handwriting engine (ML Kit Digital Ink or MyScript, neither of which runs in a web page for free). Shape snapping alone remains viable if revisited — it was the reliable half.
