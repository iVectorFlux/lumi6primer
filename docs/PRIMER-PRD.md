# The Primer — Product Requirements Document & System Architecture

> Implementation of the pedagogical orchestrator, learner model, and Story → Think → Learn → Think Again → Become state machine lives in [`PRIMER-ORCHESTRATION.md`](./PRIMER-ORCHESTRATION.md) and `src/primer/`.

## 1. Vision

A persistent AI companion responsible for helping a child (ages 8-14) progressively understand the world, themselves, and how to think — growing with them over years.

The product is NOT a tutoring chatbot. It is NOT a curriculum delivery system. It is an intelligent companion that creates learning experiences tailored to one specific child's mind.

### 1.1 Where this product fits (Diamond Age / consumer-tutor call)

The market call has two layers. They are not the same product.

| Layer | What they want | Who buys it |
|-------|----------------|-------------|
| **Wedge (now)** | A devoted private tutor for reading, writing, and arithmetic — adaptive, patient, consumer-scale | A parent, as a supplement to school |
| **Moonshot (later)** | The Illustrated Primer: a years-long companion that learns the child's mind and teaches thinking, reasoning, ethics, character | The same child, growing up with it |

**What we have today:** Lumi6 — voice + handwriting + canvas. That is the Primer's *paper*, not the Primer. ATLAS is a stateless Q&A tutor. It does not remember the child, does not teach 3Rs to mastery, and does not create stories that grow with them.

**What we uniquely own:** Almost every AI tutor is chat. Reading, writing, and arithmetic *require* a page. A child must form letters, show work, sketch a number line, mark a sentence. Lumi6 is the only surface we have that can become that page. That is our fit — not "another AI that explains photosynthesis."

**The strategic tension:** This PRD originally jumped to the moonshot (8–14, experiences, critical thinking) and treated basics as not-the-product. The market call says the opposite for V1: start as the parent-bought 3Rs tutor. The Primer is the company you become if the wedge works.

**Correct positioning:**

```
Parent buys a tutor for reading / writing / arithmetic
        ↓
Child works on paper (Lumi6) + voice, every day
        ↓
System learns THIS child's mind (errors, confidence, interests)
        ↓
Same companion later teaches thinking, reasoning, character
        ↓
The Primer
```

V1 must be excellent at the wedge. The architecture (child model, persistence, collaborative canvas) is what makes the moonshot possible later — but the first product a parent can love is: *my child is actually learning to read, write, and do math with someone who knows them.*

---

## 2. North-Star Question

> Given everything I know about this child and who they are becoming, what experience should I create right now that will help them become more knowledgeable, capable, curious, independent, thoughtful, and wise?

---

## 3. Core Capabilities

### 3.1 Know the Child Deeply

Maintain a longitudinal model of:
- Knowledge state (what they know, don't know, partially understand)
- Active misconceptions
- Interests and fascinations
- Reasoning patterns (do they jump to conclusions? are they methodical?)
- Confidence and independence level
- Learning history (past sessions, breakthroughs, struggles)

### 3.2 Understand the Child's World

- Age, grade, language proficiency
- Current interests and questions
- Family-provided context and boundaries
- Recent learning events
- Time of day, session duration, energy level

### 3.3 Create Experiences, Not Lessons

The Primer does NOT lecture. It creates situations:
- A character in a story needs help solving a problem
- A mystery requires investigation and evidence
- A construction challenge demands creative thinking
- A debate forces perspective-taking
- An experiment reveals a surprising truth

Math, science, language, ethics — these appear because the child NEEDS them to progress through the experience.

### 3.4 Teach Through Interaction

Voice + Lumi6 canvas enables:
- Child speaks, draws, writes, calculates, sketches
- AI speaks back, draws beside them, extends their thinking
- Canvas accumulates evidence of thinking, not just answers
- The AI can reference something drawn 10 minutes ago or 3 months ago

### 3.5 Develop the Mind

Four learning layers (the child never sees these labels):

| Layer | What Develops |
|-------|---------------|
| **Know** | Math, science, language, history, general knowledge |
| **Think** | Critical thinking, logic, causal reasoning, creativity |
| **Learn** | How to ask questions, research, experiment, reflect, recognize confusion |
| **Become** | Curiosity, persistence, courage, empathy, intellectual humility, independence |

### 3.6 Continuously Evolve

- What fascinates an 8-year-old shouldn't resemble what challenges them at 12
- Vocabulary, intellectual demands, autonomy, and relationship style mature with the child
- The ultimate success: the child no longer needs the Primer

---

## 4. Interaction Design

### 4.1 Primary Interaction Loop

```
Child speaks or draws
    ↓
Primer observes (what they said, drew, their reasoning process)
    ↓
Primer decides (what cognitive move serves this child right now)
    ↓
Primer acts (speaks, draws collaboratively, poses a challenge, tells a story fragment)
    ↓
Child responds (new input, refined thinking, changed hypothesis)
    ↓
Primer observes...
```

### 4.2 Canvas as Thinking Surface

The canvas is NOT a whiteboard for the AI to display diagrams. It is:

- A space where the child externalizes their thinking
- A collaborative surface where AI and child build understanding together
- A persistent record of how thinking evolved
- A reference library the AI can point back to ("remember when you drew this?")

Canvas interactions:
- **Child draws hypothesis** → AI questions it, asks for prediction
- **AI draws scaffolding** → Incremental, synchronized with speech, not all-at-once
- **Child marks/circles something** → AI zooms into that specific element
- **AI references past drawing** → "Three sessions ago you thought X. Has that changed?"

### 4.3 Voice as Natural Dialogue

Not a lecture. Not Q&A. Natural conversation:
- Thinking pauses: "Hmm... interesting. So here's the thing..."
- Genuine curiosity: "Wait, why do you think that?"
- Building tension: "Okay, but what happens if we change THIS?"
- Metacognition prompts: "You were sure 2 minutes ago. What changed your mind?"

### 4.4 Experience Patterns (Not Lessons)

| Pattern | How It Works | What It Develops |
|---------|-------------|------------------|
| **Investigation** | Something surprising is observed. Child must figure out why. | Scientific thinking, evidence evaluation |
| **Mystery** | Conflicting accounts/evidence. Child must determine truth. | Critical thinking, bias detection |
| **Construction** | Child must build/design something that works. | Engineering thinking, iteration |
| **Debate** | Two valid perspectives. Child must argue both sides. | Perspective-taking, argumentation |
| **Story** | A character faces a dilemma. Child advises them. | Ethics, empathy, consequential thinking |
| **Exploration** | Child's spontaneous question becomes a deep rabbit hole. | Curiosity, research skills |
| **Challenge** | Progressively harder problems with minimal scaffolding. | Persistence, independence |

---

## 5. System Architecture

### 5.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                               │
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────────┐  │
│  │ Voice Engine │  │ Canvas Engine │  │  Primer UI                │  │
│  │ (STT + TTS)  │  │ (Lumi6 Canvas) │  │  (overlay, captions)    │  │
│  └──────┬───────┘  └──────┬───────┘  └───────────────────────────┘  │
│         │                  │                                          │
│         └──────┬───────────┘                                          │
│                ▼                                                       │
│  ┌─────────────────────────────────┐                                  │
│  │    Interaction Controller        │                                  │
│  │  (captures input + board state)  │                                  │
│  └──────────────┬──────────────────┘                                  │
└─────────────────┼────────────────────────────────────────────────────┘
                  │ POST /api/primer/turn
                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        SERVER (Node.js)                               │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                    PRIMER ORCHESTRATOR                            │ │
│  │                                                                   │ │
│  │  1. Load Child Context (from Supabase)                           │ │
│  │  2. Assemble Dynamic Prompt (child model + goals + history)      │ │
│  │  3. Call LLM (with structured output schema)                     │ │
│  │  4. Parse Response (speech + canvas actions + model updates)     │ │
│  │  5. Synthesize TTS                                               │ │
│  │  6. Persist Updates (to Supabase)                                │ │
│  │  7. Return Response                                              │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌────────────┐  ┌────────────┐  ┌──────────┐  ┌────────────────┐  │
│  │ Child Model│  │ Prompt     │  │ Canvas   │  │ TTS Provider   │  │
│  │ Service    │  │ Assembler  │  │ Composer │  │ (Deepgram etc) │  │
│  └─────┬──────┘  └────────────┘  └──────────┘  └────────────────┘  │
└────────┼─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     SUPABASE (Persistence)                            │
│                                                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │ children    │  │ sessions    │  │ learning_    │  │ canvas_  │  │
│  │             │  │             │  │ events       │  │ snapshots│  │
│  └─────────────┘  └─────────────┘  └──────────────┘  └──────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 Infrastructure to Keep (from current Lumi6 canvas)

| Component | File(s) | Why Keep |
|-----------|---------|----------|
| Canvas engine | `public/app.js` | 11K+ lines, handles strokes, images, viewport, rendering |
| Voice STT/TTS | `public/atlas-voice.js` | Web Speech API + audio playback pipeline |
| Canvas adapter | `public/lumi6-canvas-adapter.js` | Bridge between ATLAS commands and canvas |
| Board capture | `captureBoardImage()` in app.js | Captures canvas as JPEG for AI vision |
| TTS multi-provider | `src/atlas/cartesia-tts.js` | Deepgram/Cartesia/OpenAI with fallback |
| Server core | `src/server/main.js` | HTTP server, model dispatch, image handling |
| Draw normalization | `public/draw.js` | Stroke normalization for canvas primitives |

### 5.3 What Gets Rebuilt (the "ATLAS" layer becomes "Primer Core")

| Old Component | New Component | What Changes |
|--------------|---------------|-------------|
| `teaching-loop.js` | `primer-orchestrator.js` | From Q&A loop to experience orchestrator |
| `lumi6-bridge.js` | `prompt-assembler.js` + `llm-client.js` | Dynamic prompts from child model, structured output |
| `conversation-manager.js` | `session-manager.js` | Persistent sessions in Supabase, not in-memory |
| `intent-classifier.js` | Removed | LLM handles all intent naturally |
| `whiteboard-controller.js` | `canvas-composer.js` | Incremental, collaborative drawing |
| `kid-graphics.js` | `visual-generator.js` | AI-generated visuals, not templates |
| `kid-lessons.js` | Removed | No hardcoded lessons |
| `visual-planner.js` | Removed | AI decides visuals as part of response |
| `visual-router.js` | Removed | Single rendering path |
| `biology-templates.js` | Removed | AI generates all visuals |
| `mermaid-templates.js` | Removed | AI generates all visuals |

---

## 6. Data Model (Supabase)

### 6.1 `children` — The Persistent Child Model

```sql
create table children (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  name text not null,
  age_years integer,
  grade text,
  
  -- Knowledge & cognitive state (JSON, updated by AI after each session)
  knowledge_map jsonb default '{}',
  -- e.g. {"fractions": {"level": "partial", "misconceptions": ["treats numerator and denominator independently"]}}
  
  active_misconceptions jsonb default '[]',
  -- e.g. [{"topic": "gravity", "belief": "heavier objects fall faster", "since": "2026-06-15"}]
  
  interests jsonb default '[]',
  -- e.g. [{"topic": "space", "intensity": "high", "since": "2026-07-01"}, {"topic": "dinosaurs", "intensity": "fading"}]
  
  reasoning_profile jsonb default '{}',
  -- e.g. {"pattern": "jumps_to_conclusions", "evidence_sensitivity": "low", "creativity": "high"}
  
  metacognition_level text default 'emerging',
  -- "unaware" | "emerging" | "developing" | "proficient"
  
  independence_level text default 'guided',
  -- "dependent" | "guided" | "semi-independent" | "independent"
  
  personality_notes text,
  -- Free-form AI observations: "Gets frustrated when wrong. Loves analogies. Responds well to humor."
  
  total_sessions integer default 0,
  total_minutes integer default 0,
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### 6.2 `sessions` — Each Learning Session

```sql
create table sessions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid references children(id),
  
  started_at timestamptz default now(),
  ended_at timestamptz,
  duration_minutes integer,
  
  -- What happened this session (summary for long-term reference)
  summary text,
  -- e.g. "Explored why the Moon appears to follow the car. Discovered parallax through drawing experiment."
  
  topics_touched jsonb default '[]',
  -- e.g. ["parallax", "observation_vs_assumption", "hypothesis_testing"]
  
  cognitive_goals jsonb default '[]',
  -- What the Primer was trying to develop: ["evidence_evaluation", "hypothesis_revision"]
  
  breakthroughs jsonb default '[]',
  -- Key moments: [{"moment": "realized heavier doesn't mean faster", "type": "misconception_corrected"}]
  
  experience_pattern text,
  -- "investigation" | "mystery" | "construction" | "debate" | "story" | "exploration" | "challenge"
  
  child_model_delta jsonb default '{}',
  -- What changed in the child model as a result of this session
  
  created_at timestamptz default now()
);
```

### 6.3 `turns` — Individual Interactions Within a Session

```sql
create table turns (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id),
  child_id uuid references children(id),
  
  turn_number integer,
  role text not null, -- 'child' | 'primer'
  
  -- What was said/done
  spoken_text text,
  canvas_action jsonb, -- What was drawn (commands or description)
  board_image_url text, -- Stored snapshot if relevant
  
  -- AI reasoning (for debugging and improvement)
  ai_reasoning jsonb,
  -- e.g. {"goal": "test if they can identify the flaw", "strategy": "socratic_question", "child_state": "confident_but_wrong"}
  
  created_at timestamptz default now()
);
```

### 6.4 `learning_events` — Significant Moments (Cross-Session)

```sql
create table learning_events (
  id uuid primary key default gen_random_uuid(),
  child_id uuid references children(id),
  session_id uuid references sessions(id),
  
  event_type text not null,
  -- "misconception_formed" | "misconception_corrected" | "breakthrough" | "new_interest" 
  -- | "independence_shown" | "metacognition_moment" | "persistence" | "gave_up"
  
  topic text,
  description text,
  -- e.g. "Child spontaneously questioned their own assumption about plant growth without prompting"
  
  significance text default 'normal',
  -- "minor" | "normal" | "major" | "milestone"
  
  created_at timestamptz default now()
);
```

### 6.5 `canvas_snapshots` — Thinking Evidence Over Time

```sql
create table canvas_snapshots (
  id uuid primary key default gen_random_uuid(),
  child_id uuid references children(id),
  session_id uuid references sessions(id),
  
  image_url text, -- Stored in Supabase Storage
  description text, -- AI-generated description of what's on the canvas
  context text, -- What was being discussed when this was captured
  
  created_at timestamptz default now()
);
```

---

## 7. Server Components (New)

### 7.1 `primer-orchestrator.js` — The Brain

The orchestrator handles every turn:

```
Input: { childId, spokenText, boardImage, sessionId }

1. LOAD CONTEXT
   - Fetch child model from Supabase
   - Fetch current session history (last N turns)
   - Fetch relevant learning events (recent breakthroughs, active misconceptions)
   - Fetch relevant canvas snapshots (if child references something)

2. ASSEMBLE PROMPT
   - System prompt: pedagogical rules + child profile + current goals
   - Recent history: last 10-15 turns
   - Board image: if present, with strong instructions to read it
   - Meta-instructions: what cognitive move to make based on child state

3. CALL LLM (structured output)
   - Response schema forces the AI to output:
     {
       "spoken": "...",           // What to say (2-4 sentences)
       "canvas_actions": [...],   // What to draw (incremental steps)
       "internal_reasoning": "...", // Why this response (for logging)
       "child_observations": {...}, // What the AI noticed about the child
       "model_updates": {...}     // Suggested updates to child model
     }

4. PROCESS RESPONSE
   - Validate canvas actions
   - Synthesize TTS from spoken text
   - Apply model updates to Supabase
   - Log turn to database

5. RETURN
   - { spoken, audioBase64, canvasActions, sessionState }
```

### 7.2 `prompt-assembler.js` — Dynamic Prompt Construction

The system prompt is NEVER static. It's assembled from:

```javascript
function assembleSystemPrompt(child, session, recentEvents) {
  return `
You are this child's Primer — their intellectual companion.

CHILD PROFILE:
- Name: ${child.name}, Age: ${child.age_years}
- Reasoning style: ${child.reasoning_profile.pattern}
- Metacognition: ${child.metacognition_level}
- Independence: ${child.independence_level}
- Current interests: ${child.interests.map(i => i.topic).join(', ')}
- Active misconceptions: ${formatMisconceptions(child.active_misconceptions)}
- Personality: ${child.personality_notes}

SESSION CONTEXT:
- This is session #${child.total_sessions + 1}
- Experience pattern: ${session.experience_pattern || 'responsive'}
- Current cognitive goal: ${session.cognitive_goals.join(', ') || 'follow the child'}

RECENT SIGNIFICANT EVENTS:
${recentEvents.map(e => `- ${e.description} (${e.created_at})`).join('\n')}

PEDAGOGICAL RULES:
1. Never lecture. Create situations that require thinking.
2. When the child is wrong, don't correct — ask a question that reveals the gap.
3. When the child is right, don't just praise — take them deeper.
4. Match vocabulary and complexity to THIS child's level.
5. Reference past experiences when relevant ("remember when...").
6. Every 3-4 turns, create a metacognitive moment ("what changed your mind?").
7. If the child is stuck, offer ONE hint, not the answer.
8. If the child is disengaged, pivot to their interests.
9. Canvas actions should BUILD incrementally — never dump a complete diagram.
10. The goal is not to transmit knowledge. The goal is to develop their capacity to think.

RESPOND IN THIS JSON FORMAT:
{
  "spoken": "Your spoken response (2-4 natural sentences)",
  "canvas_actions": [
    {"type": "draw_step", "description": "...", "commands": [...]}
  ],
  "internal_reasoning": "Why you chose this response",
  "child_observations": {
    "engagement": "high|medium|low",
    "understanding": "correct|partial|confused|wrong",
    "reasoning_quality": "note about their thinking process"
  },
  "model_updates": {
    "knowledge_map": {},
    "misconceptions_add": [],
    "misconceptions_remove": [],
    "interests_update": [],
    "notes": ""
  }
}
`;
}
```

### 7.3 `canvas-composer.js` — Collaborative Drawing

Replaces the static `topicGraphic` approach. Canvas actions are:

| Action Type | Description |
|-------------|-------------|
| `draw_step` | Draw one element, synchronized with a specific sentence of speech |
| `highlight` | Circle or point to something the child drew |
| `extend` | Add to an existing drawing (e.g., add a label, connect two things) |
| `scaffold` | Draw a partial framework the child will complete |
| `reference` | Pan to and highlight a previous drawing/snapshot |
| `clear_area` | Clear a section to make space for new thinking |

Each action includes timing information so the client can synchronize with TTS:

```javascript
{
  "type": "draw_step",
  "after_sentence": 1,  // Draw this after the 1st spoken sentence
  "commands": [
    { "tool": "draw", "origin": [5000, 5000], ... },
    { "tool": "write_text", "text": "Hypothesis", ... }
  ]
}
```

### 7.4 `child-model-service.js` — Persistence Layer

```javascript
class ChildModelService {
  constructor(supabase) { this.db = supabase; }
  
  async getChild(childId) { ... }
  async updateAfterTurn(childId, modelUpdates) { ... }
  async getRecentEvents(childId, limit = 10) { ... }
  async recordEvent(childId, sessionId, event) { ... }
  async getRelevantSnapshots(childId, topic) { ... }
  async summarizeSession(sessionId) { ... }
}
```

### 7.5 `session-manager.js` — Session Lifecycle

```javascript
class SessionManager {
  async startSession(childId) { ... }
  async addTurn(sessionId, turn) { ... }
  async getRecentTurns(sessionId, limit = 15) { ... }
  async endSession(sessionId, summary) { ... }
}
```

---

## 8. API Design

### 8.1 `POST /api/primer/turn` — Main Interaction

Request:
```json
{
  "childId": "uuid",
  "sessionId": "uuid",
  "spokenText": "why does the ball fall down?",
  "boardImage": "data:image/jpeg;base64,...",
  "canvasState": { "hasDrawing": true }
}
```

Response:
```json
{
  "spoken": "Okay, you dropped the ball and it fell. But here's what I want you to think about — did the ball WANT to fall, or did something MAKE it fall?",
  "audioBase64": "...",
  "audioContentType": "audio/mp3",
  "canvasActions": [
    {
      "type": "draw_step",
      "afterSentence": 2,
      "commands": [
        { "tool": "draw", "origin": [5000, 5000], "types": ["circle"], "items": [[50]], "fill": "#3b82f6" },
        { "tool": "write_text", "x": 5000, "y": 5120, "text": "Ball", "fontSize": 24 },
        { "tool": "draw", "origin": [5000, 5100], "types": ["line"], "items": [[5000, 5400]], "arrows": "end" }
      ]
    }
  ],
  "sessionState": {
    "turnNumber": 3,
    "currentGoal": "testing_assumptions"
  }
}
```

### 8.2 `POST /api/primer/session/start`

```json
{ "childId": "uuid" }
→ { "sessionId": "uuid", "greeting": "Hey! Last time we were figuring out..." }
```

### 8.3 `POST /api/primer/session/end`

```json
{ "sessionId": "uuid" }
→ { "summary": "...", "duration": 12, "events": [...] }
```

### 8.4 `GET /api/primer/child/:id`

Returns full child model (for parent dashboard).

### 8.5 `POST /api/primer/child`

Creates new child profile (onboarding).

---

## 9. LLM Strategy

### 9.1 Model Selection

- **Primary**: GPT-4o or Claude Sonnet (fast, multimodal, good at structured output)
- **Fallback**: Same provider, smaller model for non-critical paths
- **Vision**: Required for board image reading (already working)

### 9.2 Structured Output

Use JSON mode / function calling to force the LLM to output the schema defined in 7.2. This prevents:
- Uncontrolled essay-length responses
- Missing canvas actions
- Forgetting to observe the child's state

### 9.3 Context Window Management

Each turn sends:
- System prompt (~800 tokens, dynamic)
- Child profile summary (~200 tokens)
- Last 10-15 turns (~2000 tokens)
- Board image (if present)
- Total: ~3000-4000 tokens input → fast response

### 9.4 Latency Budget

Target: < 3 seconds from child finishing speech to Primer starting to speak.

| Step | Budget |
|------|--------|
| Board capture + request | 200ms |
| Context assembly (DB reads) | 300ms |
| LLM call | 1500-2000ms |
| TTS synthesis | 500ms |
| Total | ~2500ms |

Optimization: Start TTS streaming as soon as `spoken` field is available (before canvas_actions parsing).

---

## 10. Client Changes

### 10.1 Interaction Controller (replaces `atlas-voice.js` internals)

The client needs to:
1. Capture speech (existing)
2. Capture board state (existing)
3. Send turn to `/api/primer/turn`
4. Play TTS audio (existing)
5. **NEW**: Execute canvas actions with timing (after sentence N)
6. **NEW**: Show captions synchronized with speech
7. **NEW**: Handle session start/end lifecycle

### 10.2 Synchronized Canvas Drawing

Instead of dumping all commands at once, the client executes canvas actions synchronized with speech:

```javascript
// Split spoken text into sentences
// As each sentence finishes playing, execute the corresponding canvas_action
for (const action of canvasActions) {
  await waitForSentence(action.afterSentence);
  await executeCanvasCommands(action.commands);
}
```

### 10.3 Session UI

- **Session start**: Brief greeting referencing last session
- **During**: Captions bar showing what AI says, "You:" showing what child said
- **Session end**: Brief summary of what was explored (optional parent notification)

---

## 11. Onboarding Flow

First session with a new child:

1. "Hi! I'm your Primer. What's your name?"
2. "How old are you?"
3. "What's something you've been curious about lately?"
4. "Let me draw something — tell me what you think this is" (tests observation)
5. "Interesting! Here's a puzzle..." (tests reasoning style)
6. After 5-10 minutes of natural interaction → initial child model populated

No forms. No grade selection. The Primer learns the child through interaction.

---

## 12. What Success Looks Like

### Short-term (1 month)
- Child can have a natural conversation with the Primer
- Primer remembers the child between sessions
- Canvas is used collaboratively (AI draws incrementally with speech)
- Response time < 3 seconds

### Medium-term (3 months)
- Child model accurately reflects the child's level
- Primer creates genuine learning experiences (not Q&A)
- Metacognition prompts appear naturally ("what changed your mind?")
- Parent can see a dashboard of their child's development

### Long-term (6+ months)
- Primer adapts its style as the child grows
- Children who use it develop measurably better critical thinking
- The relationship feels genuinely personal — the child WANTS to come back
- The Primer can reference experiences from months ago relevantly

---

## 13. Implementation Priority (Build Order)

### Phase 1: Foundation (Weeks 1-2)
1. Supabase schema (tables above)
2. `child-model-service.js` — CRUD for child profiles
3. `session-manager.js` — Session lifecycle
4. `primer-orchestrator.js` — Basic turn handling with persistence
5. `prompt-assembler.js` — Dynamic prompt from child model
6. Replace `/api/atlas/teach` with `/api/primer/turn`

### Phase 2: Intelligence (Weeks 3-4)
7. Structured LLM output (JSON schema enforcement)
8. Child model updates after each turn
9. Learning event detection and recording
10. Canvas action timing/synchronization on client
11. Session summary generation on end

### Phase 3: Experience (Weeks 5-8)
12. Experience patterns (investigation, mystery, etc.)
13. Cross-session references ("remember when...")
14. Misconception tracking and gentle correction
15. Metacognition scaffolding
16. Independence progression (less hand-holding over time)

### Phase 4: Polish (Weeks 9-12)
17. Parent dashboard
18. Onboarding flow
19. Multi-child support
20. Session scheduling/reminders
21. Analytics and improvement loop

---

## 14. What We Delete

All of these are antithetical to the Primer vision:

- `src/atlas/kid-lessons.js` — Hardcoded lessons
- `src/atlas/visual-planner.js` — Template routing
- `src/atlas/visual-router.js` — Never used
- `src/atlas/biology-templates.js` — Static diagrams
- `src/atlas/mermaid-templates.js` — Canned flowcharts
- `src/atlas/board-summary-generator.js` — Unused
- `src/atlas/intent-classifier.js` — Rule-based classification (LLM handles this)

---

## 15. Key Architectural Principles

1. **The LLM is the brain, not a tool.** Don't micro-manage it with rules. Give it context (child model) and let it decide what to do.

2. **Persistence is non-negotiable.** Every interaction must update the child model. Without memory, there is no relationship.

3. **The canvas is for thinking, not decoration.** Never draw a static "lesson diagram." Draw incrementally, collaboratively, responsively.

4. **Speed over completeness.** A fast, natural response that's 80% optimal is better than a slow, perfect one. Children lose attention.

5. **The child leads, the Primer guides.** Never hijack the conversation. Follow the child's curiosity, then subtly steer toward growth.

6. **Measure development, not content delivery.** Success is not "child learned about photosynthesis." Success is "child asked a better question than they would have 2 months ago."
