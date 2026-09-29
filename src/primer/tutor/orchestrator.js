"use strict";

const ChildPolicy = require("../safety/child-policy.js");
const ConversationGuard = require("../safety/conversation-guard.js");
const Escalation = require("../safety/escalation.js");
const openaiTalk = require("../tools/openai-talk.js");
const lessonInteractive = require("../tools/lesson-interactive.js");
const { parseProposal, modelText } = require("./proposal.js");
const { speechOnly } = require("./spoken-parts.js");
const { synthesizeCartesiaSpeech, audioToPayload } = require("../tools/tts.js");

function buildSystemPrompt(child = {}) {
  const gradeNum = Number(String(child?.grade || "").replace(/[^\d]/g, "")) || (child?.age_years ? Number(child.age_years) - 5 : 4);
  const childName = child?.name ? `, talking with ${child.name}` : "";
  const likes = Array.isArray(child?.interests) && child.interests.length ? child.interests.slice(0, 4).join(", ") : "";

  return `You are Lumi — a warm, brilliant, empathetic mentor and learning companion for curious young minds (Class ${gradeNum} student, age ~${gradeNum + 5}${childName}). You talk like a real, supportive, inspiring human sitting side-by-side with the student.

CORE CONVERSATIONAL PRINCIPLES:
1. ACTIVE LISTENING & HUMAN EMOTIONAL INTELLIGENCE:
   - Never sound like a pre-programmed textbook or Wikipedia recitation ("This is called X... This is called Y...").
   - If the student shares an opinion or reaction ("cool!", "I love rain", "that makes sense", "clouds are neat"): Do NOT lecture or re-explain the whole concept! Respond with warmth and a vivid fun fact or perspective in 2-3 sentences.
   - If the student clarifies, doubts, or corrects ("No, I meant...", "Wait, why?", "Is watercolor less..."): Immediately validate their thought ("Ah, great question!", "Oh, I see what you mean!") and address their exact doubt directly.
   - If the student asks a direct question: Answer it directly with intuition and a vivid physical analogy first (${likes ? `you can draw relatable connections to ${likes} when natural` : "like puddles, spinning wheels, shadows, or ice cubes"}).

2. ANTI-REPETITION & PROGRESSION:
   - NEVER repeat an explanation or definition you already gave in previous turns. If water cycle stages were already explained, never list them again. Zoom in, build forward, or explore the specific detail the child mentioned.
   - Do NOT ask the same formulaic question over and over (never repeat "What part of X do you find most interesting?").

3. NATURAL PACING (NO FORCED QUIZZES):
   - Only ask a question if it naturally sparks wonder or invites imagination (e.g. "Have you ever wondered where a single raindrop might have traveled from before it hit your window?").
   - If the child is asking questions or having a natural discussion, just answer! You do NOT need to ask a question on every single turn. Return "" for question if none is needed.
   - Keep answers readable: 1-2 friendly, vivid paragraphs for explanations; 2-3 sentences for casual remarks.
   - Never use emoji spam or unnatural text decorations.

Return JSON only:
{
  "spoken": "Your warm, natural, conversational response...",
  "question": "Optional curious wonder question (or empty string if not needed)...",
  "concept": "Specific topic name (e.g. 'Water Cycle' or 'Rain & Clouds')"
}`;
}

/**
 * Modern, Lightweight Learning Orchestrator for Primer Chat/Talk Mode.
 * Driven by genuine multi-turn context, first-principles pedagogy, and interactive simulation embeds.
 */
class LearningOrchestrator {
  constructor(options = {}) {
    this.childModel = options.childModel;
    this.sessions = options.sessions;
    this.aiProvider = options.aiProvider;

    this.childPolicy = new ChildPolicy();
    this.guard = new ConversationGuard(this.childPolicy);
    this.escalation = new Escalation();
    this._states = new Map();
  }

  async handleTurn(input = {}) {
    const spokenText = String(input.spokenText || input.message || "").trim();
    if (!spokenText) throw new Error("spokenText is required.");
    const requestId = input.requestId || `primer_${Date.now()}`;

    // 1. Resolve Child & Session
    const child = await this.childModel.getOrCreate(input.childId, input.child || {});
    const { session, created } = await this.sessions.getOrStart(child.id, input.sessionId);
    if (created) await this.childModel.incrementSessionCount(child.id);
    const recentTurns = await this.sessions.getRecentTurns(session.id, 12);

    // 2. Safety Inspection
    const safetyIn = this.guard.inspectInput(spokenText, child);
    if (safetyIn.block) {
      const spoken = this.escalation.message(safetyIn.flags);
      return this._finishSimple({
        child,
        session,
        spokenText,
        spoken,
        requestId,
        commands: [],
        safety: { ok: false, flags: safetyIn.flags, escalation: "halt" }
      });
    }

    // 3. Build Multi-Turn Conversation History for the LLM
    const systemPrompt = buildSystemPrompt(child);
    const messages = [{ role: "system", content: systemPrompt }];

    for (const turn of recentTurns.slice(-10)) {
      const role = (turn.role === "child" || turn.role === "student" || turn.role === "user") ? "user" : "assistant";
      const content = String(turn.spoken_text || turn.text || "").trim();
      if (content) {
        messages.push({ role, content });
      }
    }

    const boardImage = input.boardImage || null;
    if (boardImage && typeof boardImage === "string" && (boardImage.startsWith("data:image/") || boardImage.startsWith("http"))) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: spokenText || "I drew this on the scratchpad for you to check. What do you think?" },
          { type: "image_url", image_url: { url: boardImage, detail: "low" } }
        ]
      });
    } else {
      messages.push({ role: "user", content: spokenText });
    }

    // 4. Call Model (OpenAI first, fallback to configured aiProvider)
    let proposal = null;
    if (openaiTalk.isConfigured()) {
      try {
        const res = await openaiTalk.complete({ messages, timeoutMs: 16000 });
        proposal = parseProposal(res.content);
      } catch (err) {
        console.warn("[PRIMER] OpenAI talk failed:", err.message);
      }
    }

    if (!proposal && this.aiProvider && typeof this.aiProvider.callModelFn === "function") {
      try {
        const response = await this.aiProvider.callModelFn({
          persona: "teacher",
          userAction: "explain",
          fastTalk: true,
          systemPrompt,
          studentQuery: spokenText,
          typedInput: `${systemPrompt}\n\nStudent: "${spokenText}"`,
          conversationHistory: recentTurns.slice(-6),
          boardImage: input.boardImage || null
        });
        proposal = parseProposal(modelText(response));
      } catch (err) {
        console.warn("[PRIMER] aiProvider talk fallback failed:", err.message);
      }
    }

    // 5. Extract Spoken Text & Question
    let spoken = "";
    let question = "";
    let concept = "";

    if (proposal) {
      spoken = String(proposal.spoken || "").trim();
      question = String(proposal.question || "").trim();
      concept = String(proposal.concept || "").trim();
      if (question && !spoken.toLowerCase().includes(question.toLowerCase()) && !/what part of .* do you find most interesting/i.test(question)) {
        spoken = `${spoken}\n\n${question}`.trim();
      }
    }

    if (!spoken) {
      spoken = "I'm right here with you! Could you tell me a little more about what you'd like to explore?";
    }

    // Clean any stray markdown code-fences
    spoken = spoken
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    // 6. Stream Spoken Text & Audio TTS
    const openerTts = this._emitSpoken(input, spoken);

    // 7. Match Interactive STEM Simulations
    let commands = [];
    const interactiveHit = await lessonInteractive.match({
      store: this.childModel.store,
      query: spokenText,
      concept: concept || spokenText,
      childText: spokenText,
      grade: child?.grade
    }).catch(() => null);

    if (interactiveHit?.slug && (interactiveHit.score == null || interactiveHit.score >= 20)) {
      const widget = lessonInteractive.commandFor(interactiveHit);
      widget.keepOthers = true;
      widget.archivePrevious = true;
      widget.openInPlayground = true;
      commands.push(widget);
      this._emitStream(input, {
        event: "graphic",
        canvasActions: [widget],
        visualPlan: { shouldDraw: true, commands: [widget] }
      });
      console.log(`[PRIMER] Attached interactive: ${interactiveHit.slug} (score: ${interactiveHit.score})`);
    }

    // 8. Persist Turns in Session History
    await this.sessions.addTurn(session.id, {
      child_id: child.id,
      role: "child",
      spoken_text: spokenText
    }).catch((err) => console.warn("[PRIMER] persist child turn failed:", err.message));

    await this.sessions.addTurn(session.id, {
      child_id: child.id,
      role: "primer",
      spoken_text: spoken,
      canvas_action: commands.length ? commands : null
    }).catch((err) => console.warn("[PRIMER] persist primer turn failed:", err.message));

    await Promise.race([
      openerTts || Promise.resolve(null),
      new Promise((resolve) => setTimeout(resolve, 3000))
    ]);

    return {
      requestId,
      intent: "chat",
      concept: concept || null,
      teacherResponse: spoken,
      spokenResponse: spoken,
      spokenText: spoken,
      spoken,
      visualPlan: { shouldDraw: commands.length > 0, commands },
      canvasActions: commands,
      drawingResult: { success: true, commands },
      sessionState: {
        childId: child.id,
        sessionId: session.id,
        childName: child.name || null,
        turnNumber: Math.ceil((Number(recentTurns?.length || 0) + 2) / 2),
        persistence: this.childModel.store?.remoteEnabled ? "supabase" : "memory",
        mode: "talk"
      },
      safety: { ok: true },
      metadata: { timestamp: new Date().toISOString() }
    };
  }

  _finishSimple({ child, session, spokenText, spoken, requestId, commands = [], safety = { ok: true } }) {
    return {
      requestId,
      intent: "safety",
      teacherResponse: spoken,
      spokenResponse: spoken,
      spokenText: spoken,
      spoken,
      visualPlan: { shouldDraw: false, commands: [] },
      canvasActions: [],
      drawingResult: { success: true, commands: [] },
      sessionState: {
        childId: child?.id,
        sessionId: session?.id,
        childName: child?.name || null,
        mode: "talk"
      },
      safety,
      metadata: { timestamp: new Date().toISOString() }
    };
  }

  _emitStream(input, payload) {
    if (typeof input.onStream !== "function" || !payload) return;
    try { input.onStream(payload); } catch {}
  }

  _emitSpoken(input, spoken) {
    const text = String(spoken || "").trim();
    if (!text) return Promise.resolve(null);
    if (typeof input.onSpoken === "function") {
      try { input.onSpoken(text); } catch {}
    }
    this._emitStream(input, {
      event: "spoken",
      spoken: text,
      spokenResponse: text,
      teacherResponse: text
    });
    return this._kickOpenerTts(input, speechOnly(text));
  }

  _kickOpenerTts(input, spoken) {
    const sentences = String(spoken || "").replace(/\s+/g, " ").trim()
      .match(/[^.!?]+[.!?]+(?:["”'])?|[^.!?]+$/g) || [];
    const chunks = sentences.map((s) => s.trim()).filter((s) => s.length > 3).slice(0, 3);
    if (!chunks.length) return Promise.resolve(null);
    const promises = chunks.map((text, i) =>
      synthesizeCartesiaSpeech(text.slice(0, 280))
        .then((audio) => {
          const payload = audioToPayload(audio);
          if (!payload.audioBase64) return null;
          this._emitStream(input, {
            event: "audio",
            opener: i === 0,
            chunkIndex: i,
            text: text.slice(0, 280),
            ...payload
          });
          return payload;
        })
        .catch((err) => {
          console.warn(`[PRIMER] opener TTS chunk ${i} failed:`, err.message);
          return null;
        })
    );
    return Promise.all(promises).then((results) => results[0]);
  }
}

module.exports = LearningOrchestrator;
