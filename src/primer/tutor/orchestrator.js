"use strict";

const { TutorState } = require("./tutor-state.js");
const LearningStateMachine = require("./state-machine.js");
const PedagogicalPolicy = require("./pedagogical-policy.js");
const RoleSelector = require("./role-selector.js");
const ContextBuilder = require("./context-builder.js");
const ResponsePolicy = require("./response-policy.js");
const { understandLearner, historyFromTurns } = require("./understand.js");
const { isWeakTopic, spokenCoversTopic, deniesTopic } = require("../topic.js");
const { shouldGrade, isNewAsk, explicitTopicSwitch } = require("./kid-intent.js");
const { parseProposal, modelText, looksLikeJsonBlob } = require("./proposal.js");
const { lastQuestion, questionsMatch, preventRepeatQuestion } = require("./teaching-move.js");
const { LearnerModel } = require("../learner/learner-model.js");
const MemoryService = require("../learner/memory-service.js");
const EvidenceExtractor = require("../learner/evidence-extractor.js");
const MasteryService = require("../learner/mastery-service.js");
const MisconceptionService = require("../learner/misconception-service.js");
const Autopilot = require("../planner/autopilot.js");
const NextBestExperience = require("../planner/next-best-experience.js");
const CurriculumGraph = require("../curriculum/graph.js");
const ChildPolicy = require("../safety/child-policy.js");
const ConversationGuard = require("../safety/conversation-guard.js");
const Escalation = require("../safety/escalation.js");
const Lumi6CanvasTool = require("../tools/lumi6-canvas.js");
const VisionTool = require("../tools/vision.js");
const HomeworkTool = require("../tools/homework.js");
const RetrievalTool = require("../tools/retrieval.js");
const SimulationTool = require("../tools/simulation.js");
const openaiTalk = require("../tools/openai-talk.js");
const geminiGraphic = require("../tools/gemini-graphic.js");
const topicIcon = require("../tools/topic-icon.js");
const graphicScene = require("../tools/graphic-scene.js");
const boardMath = require("../tools/board-math.js");
const { synthesizeCartesiaSpeech, audioToPayload } = require("../tools/tts.js");

function firstSpokenSentence(text) {
  const raw = String(text || "").replace(/\s+/g, " ").trim();
  if (!raw) return "";
  const parts = raw.match(/[^.!?]+[.!?]+(?:["”'])?|[^.!?]+$/g) || [raw];
  return String(parts[0] || raw).trim().slice(0, 220);
}

function formatEducationalTitle(rawConcept, spoken, childText) {
  let text = String(rawConcept || "").trim();
  
  // If concept is conversational child speech, greeting, or learner name, discard it
  const isChildFragment = /^(it |they |as i |when |if |because |i think |maybe |what |how |why |almost |yes |okay |so |and |eyes |will |can |turn |slow )\b/i.test(text)
    || text.length > 35
    || /\b(evaporate|freeze|melt|warm|cold|slow down|turn into|become|floor|puppy)\b/i.test(text)
    || /^(kamal|alex|student|learner|buddy|kid|friend|hello|hey|hi|welcome|none|null|undefined)$/i.test(text);

  if (isChildFragment) {
    text = "";
  }

  // Clean STT artifacts and phonetic typos
  text = text
    .replace(/^(can you|could you|please|i want to|i am in \d+(?:th|st|nd|rd)? grade|teach me about|teach me|tell me about|tell me|explain to me|explain|learn about|what is|what are|how does|how do|why is|why does|like what exactly|what exactly)\s+/gi, "")
    .replace(/\b(suns of|sons of|is why|why is|how does|state matter)\b/gi, "States of Matter")
    .replace(/\bmom\b/gi, "warm")
    .replace(/\bsuns\b/gi, "sun")
    .replace(/\b(tit|plz|pls|wanna|gonna|like|exactly|know|show)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  // Deduplicate repeated words
  const words = text.split(/\s+/).filter(Boolean);
  const seen = new Set();
  const deduped = [];
  for (const w of words) {
    const lower = w.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      deduped.push(w);
    }
  }
  text = deduped.join(" ");

  // If text is empty or too generic, deduce real science title from the teacher's explanation
  if (!text || text.length < 3 || /^(turn|slow|science discovery|lesson)$/i.test(text)) {
    const spokenLower = String(spoken || "").toLowerCase();
    if (/solid|liquid|gas|plasma|ice|steam|vapor/i.test(spokenLower)) text = "States of Matter";
    else if (/electron|atom|proton|nucleus|orbit/i.test(spokenLower)) text = "Electrons & Atoms";
    else if (/sun|solar|fusion|star|hydrogen/i.test(spokenLower)) text = "The Sun & Solar Energy";
    else if (/gravity|planet|orbit|space/i.test(spokenLower)) text = "Gravity & Space";
    else if (/energy|heat|kinetic|temperature|absolute zero/i.test(spokenLower)) text = "Heat & Particle Energy";
    else {
      const m = String(spoken || "").split(/[.!?]/)[0].match(/\b(?:is|are|called|named|about|on)\s+([A-Za-z0-9\s\-]{3,24})\b/i);
      if (m && m[1]) text = m[1].trim();
    }
  }

  if (!text || text.length < 3) text = "Science Discovery";
  
  return text.split(/\s+/).map(w => {
    if (/^(and|of|the|in|on|at|to|for|with)$/i.test(w)) return w.toLowerCase();
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).join(" ");
}

function extractHandwrittenNotes({ concept, spoken, childText, chapterIndex = 0 } = {}) {
  const cleanTitle = formatEducationalTitle(concept, spoken, childText);

  const rawSentences = String(spoken || "")
    .replace(/^([Hh]ey|[Hh]ello|[Hh]i|[Gg]reat question|[Aa]lright|[Ss]ure|You'?re (?:almost |exactly )?right),?[^.!?]*[.!?]\s*/g, "")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12);

  // Separate the thinking question from key explanation facts
  const questionSentence = rawSentences.find((s) => s.endsWith("?") || /^(what|how|why|can you|where|do you think|have you ever)\b/i.test(s)) || "";
  const keyPoints = rawSentences
    .filter((s) => s !== questionSentence && !/^(try|now you|what do you think|can you|let'?s|how does that sound|ready|tell me|ask me|want to|shall we)\b/i.test(s))
    .slice(0, 2);

  if (!cleanTitle && !keyPoints.length && !questionSentence) return null;

  const lines = [];
  if (cleanTitle) lines.push(cleanTitle);
  for (const pt of keyPoints) {
    lines.push(`• ${pt}`);
  }
  if (questionSentence) {
    lines.push(`? ${questionSentence}`);
  }

  return {
    id: `note-${Date.now()}`,
    tool: "write_text",
    title: cleanTitle,
    text: lines.join("\n"),
    fontSize: 130,
    color: "#4c1d95", // Velvet purple
    maxWidth: 2200,
    lineHeight: 1.38,
    isLessonNote: true
  };
}

/**
 * Learning Orchestrator
 *
 * INPUT → understand learner → temp state → memory → phase → pedagogical need
 * → role → action → tool? → generate → observe → evidence → memory
 * → learner model → next state
 *
 * LLM proposes. Pedagogical Policy validates. Orchestrator executes.
 */
class LearningOrchestrator {
  constructor(options = {}) {
    this.childModel = options.childModel;
    this.sessions = options.sessions;
    this.aiProvider = options.aiProvider;
    this.whiteboardController = options.whiteboardController;
    this.boardSummary = options.boardSummary;

    this.stateMachine = options.stateMachine || new LearningStateMachine();
    this.roleSelector = options.roleSelector || new RoleSelector();
    this.policy = options.policy || new PedagogicalPolicy({
      roleSelector: this.roleSelector,
      stateMachine: this.stateMachine
    });
    this.contextBuilder = options.contextBuilder || new ContextBuilder();
    this.responsePolicy = options.responsePolicy || new ResponsePolicy();
    this.learnerModel = options.learnerModel || new LearnerModel();
    this.memory = options.memory || new MemoryService({ childModel: this.childModel });
    this.evidenceExtractor = options.evidenceExtractor || new EvidenceExtractor();
    this.mastery = options.mastery || new MasteryService(this.learnerModel);
    this.misconceptions = options.misconceptions || new MisconceptionService();
    this.graph = options.graph || new CurriculumGraph();
    this.nextBest = options.nextBest || new NextBestExperience({
      graph: this.graph,
      mastery: this.mastery,
      learnerModel: this.learnerModel
    });
    this.autopilot = options.autopilot || new Autopilot({ nextBest: this.nextBest });
    this.childPolicy = options.childPolicy || new ChildPolicy();
    this.guard = options.guard || new ConversationGuard(this.childPolicy);
    this.escalation = options.escalation || new Escalation();
    this.canvas = options.canvas || new Lumi6CanvasTool({
      whiteboardController: this.whiteboardController,
      boardSummary: this.boardSummary
    });
    this.vision = options.vision || new VisionTool();
    this.homework = options.homework || new HomeworkTool();
    this.retrieval = options.retrieval || new RetrievalTool();
    this.simulation = options.simulation || new SimulationTool();
    this._states = new Map();
  }

  async handleTurn(input = {}) {
    const spokenText = String(input.spokenText || input.message || "").trim();
    if (!spokenText) throw new Error("spokenText is required.");
    const requestId = input.requestId || `primer_${Date.now()}`;

    const child = this.learnerModel.normalize(
      await this.childModel.getOrCreate(input.childId, input.child || {})
    );
    const { session, created } = await this.sessions.getOrStart(child.id, input.sessionId);
    if (created) await this.childModel.incrementSessionCount(child.id);
    const recentTurns = await this.sessions.getRecentTurns(session.id, 16);
    const history = historyFromTurns(recentTurns);

    const safetyIn = this.guard.inspectInput(spokenText, child);
    if (safetyIn.block) {
      const spoken = this.escalation.message(safetyIn.flags);
      return this._finish({
        child,
        session,
        spokenText,
        spoken,
        requestId,
        commands: [],
        state: this._loadState(session, child),
        decision: { phase: "think", role: "advisor", action: "observe", tools: [], reasons: ["safety halt"] },
        understanding: { raw: spokenText, intent: "safety" },
        evidence: { kind: "note", note: "escalation" },
        safety: { ok: false, flags: safetyIn.flags, escalation: "halt" }
      });
    }

    const state = this._loadState(session, child);
    state.mode = this.autopilot.detectMode(spokenText, input.mode, state.mode);
    state.safetyState = {
      ok: true,
      flags: safetyIn.flags,
      escalation: null,
      dependencyRisk: this.childPolicy.dependencyRisk(history)
    };

    const understanding = understandLearner(spokenText, {
      boardImage: input.boardImage,
      concept: state.currentConcept,
      askedBackLast: Boolean(state.conversationState?.askedBackLast),
      lastAskedToLook: Boolean(state.conversationState?.lastAskedToLook)
    });
    const plan = this.autopilot.plan(child, state, understanding);
    state.currentGoal = plan.goal;
    if (understanding.concept && !isWeakTopic(understanding.concept)) {
      state.currentConcept = understanding.concept;
    } else if (understanding.intent === "greeting" || understanding.concept === "") {
      state.currentConcept = "";
    } else if (!state.currentConcept && plan.concept) {
      state.currentConcept = plan.concept;
    }

    const memorySnippets = await Promise.race([
      this.memory.retrieve(child.id, {
        concept: state.currentConcept,
        intent: understanding.intent
      }).catch(() => []),
      new Promise((resolve) => setTimeout(() => resolve([]), 220))
    ]);
    state.memorySnippets = memorySnippets;
    state.misconceptions = child.active_misconceptions || [];
    state.learnerState = child;

    const phase = this.stateMachine.determinePhase(state, understanding);
    this.stateMachine.advanceTurns(state, phase);
    const need = this.roleSelector.needFrom(state, understanding);
    const role = this.roleSelector.select(state, understanding, need);
    const action = this.roleSelector.selectAction(role, phase, understanding, state.conversationState);
    state.tutorRole = role;
    state.action = action;

    if (this.simulation.needed(understanding)) {
      understanding.wantsSimulation = true;
    }

    let retrievalContext = "";
    const preDecision = { phase, role, action, tools: [] };
    if (this.retrieval.needed(preDecision, understanding) && understanding.intent === "fact") {
      retrievalContext = await this.retrieval.retrieve(spokenText);
    }
    if (this.vision.needed(understanding, preDecision)) {
      understanding.boardCaption = this.vision.caption(understanding);
    }

    const heuristicDecision = this.policy.validate({
      phase,
      role,
      action,
      tools: [
        (understanding.wantsDraw || understanding.wantsExplain) && "canvas",
        understanding.refersToBoard && "vision",
        understanding.intent === "homework" && "homework",
        (understanding.intent === "fact" || Boolean(retrievalContext)) && "retrieval"
      ].filter(Boolean)
    }, state, understanding);

    const askedToLook = Boolean(understanding.askedToLook) && !understanding.wantsDraw;
    const speechMath = boardMath.extractFacts(spokenText);
    const shouldReadBoard = Boolean(input.boardImage) && (
      askedToLook || speechMath.length > 0 || understanding.intent === "homework"
    );
    const mathFromTurn = await this._readBoardMath(spokenText, shouldReadBoard ? input.boardImage : null);
    const grade = shouldGrade({
      text: spokenText,
      askedBackLast: Boolean(state.conversationState?.askedBackLast),
      understanding
    });
    console.log("[PRIMER] kid-intent", {
      said: String(spokenText || "").slice(0, 100),
      intent: understanding.intent,
      concept: understanding.concept,
      held: state.currentConcept,
      look: Boolean(understanding.askedToLook),
      grade,
      math: (mathFromTurn.facts || []).map((fact) => fact.text)
    });

    const prompt = this.contextBuilder.build({
      state,
      child,
      memorySnippets,
      understanding,
      decision: heuristicDecision,
      history,
      retrievalContext,
      boardMath: mathFromTurn
    });

    const useVision = Boolean(askedToLook && input.boardImage && !mathFromTurn.hasExact);
    const proposal = await this._proposeTalk(prompt, useVision, input.boardImage, {
      mathMode: mathFromTurn.hasExact
    });
    const decision = this.policy.validate(proposal, state, understanding);
    state.tutorRole = decision.role;
    state.action = decision.action;
    state.learningPhase = decision.phase;
    state.selectedTools = decision.tools;
    const named = String(proposal?.interpretation?.concept || "").trim();
    const wrongTopic = /\b(different question|different topic|not what i asked|i asked something else|wrong (topic|question|thing|subject)|i didn't ask that|i did not ask that)\b/i.test(spokenText);
    const hasNewAsk = isNewAsk(spokenText, understanding);
    const topicLocked = Boolean(state.currentConcept)
      && (understanding.confusion || understanding.voiceIssue)
      && !understanding.wantsExplain
      && !hasNewAsk
      && !wrongTopic;

    if (wrongTopic && !understanding.concept) {
      state.currentConcept = "";
      understanding.concept = "";
    } else if (understanding.concept && understanding.concept !== state.currentConcept) {
      state.currentConcept = understanding.concept;
    } else if (
      named
      && !topicLocked
      && fromChild
      && named.length >= 3
      && named.length <= 48
      && !isWeakTopic(named)
      && !/^(this|that|it|idea)$/i.test(named)
    ) {
      understanding.concept = named;
      state.currentConcept = named;
    } else if (understanding.concept) {
      state.currentConcept = understanding.concept;
    }

    const proposalSpoken = String(decision.proposedSpoken || proposal.spoken || "").trim();
    const topicNow = understanding.concept || state.currentConcept;
    const topicUsable = Boolean(topicNow) && !isWeakTopic(topicNow);
    const offTopic = !askedToLook && topicUsable
      && (!spokenCoversTopic(proposalSpoken, topicNow) || deniesTopic(proposalSpoken, topicNow));
    // A good lesson does not have to repeat the topic word, so never naming it
    // only earns a second attempt. Disowning the topic makes the answer unusable.
    const unusable = (text) => !text || looksLikeJsonBlob(text) || ResponsePolicy.isCannedSpeech(text)
      || (topicUsable && deniesTopic(text, topicNow));
    const skipsTopic = (text) => topicUsable && !spokenCoversTopic(text, topicNow);
    if (!askedToLook && (unusable(proposalSpoken) || skipsTopic(proposalSpoken))) {
      const retry = await this._proposeSimple(understanding, null);
      const retrySpoken = String(retry?.spoken || "").trim();
      let chosen = "";
      if (!unusable(retrySpoken) && !skipsTopic(retrySpoken)) chosen = retrySpoken;
      else if (!unusable(proposalSpoken)) chosen = proposalSpoken;
      else if (!unusable(retrySpoken)) chosen = retrySpoken;
      proposal.spoken = chosen;
      decision.proposedSpoken = chosen;
    }

    let spoken = this.responsePolicy.apply(
      decision.proposedSpoken || proposal.spoken || "",
      decision,
      understanding
    );
    spoken = boardMath.ensureResult(spoken, mathFromTurn);
    spoken = preventRepeatQuestion(
      spoken,
      state.conversationState?.lastCheckQuestion,
      Number(state.conversationState?.sameQuestionStreak || 0)
    );
    if (state.safetyState.dependencyRisk === "high") {
      spoken = `${spoken} Try the next bit without me first — then tell me what you did.`.replace(/\s+/g, " ");
    }
    const openerTts = this._emitSpoken(input, spoken);

    const junkBoardSpeech = /can'?t see|cannot see|appears blank|resend a clear photo|no handwritten|photo of the whiteboard/i.test(spoken);
    const lastScene = String(state.conversationState?.lastGraphicScene || "");
    const graphicPlan = graphicScene.shouldGenerateGraphic({
      lookingAtBoard: askedToLook,
      junkSpeech: junkBoardSpeech,
      wantsWrite: understanding.wantsWrite,
      wantsDraw: understanding.wantsDraw,
      wantsExplain: understanding.wantsExplain,
      wantsReason: understanding.wantsReason,
      intent: understanding.intent,
      askedBackLast: Boolean(state.conversationState?.askedBackLast),
      lastTeacherSpoken: state.conversationState?.lastTeacherSpoken,
      childText: spokenText,
      concept: state.currentConcept || understanding.concept,
      lastScene,
      decisionAction: decision.action
    });
    const graphicTitle = graphicPlan.title || state.currentConcept || understanding.concept || spokenText.slice(0, 40);
    const chapterIndex = Math.max(0, Math.ceil((Number(recentTurns?.length || 0)) / 2));
    const noteCmd = extractHandwrittenNotes({ concept: graphicTitle, spoken, childText: spokenText, chapterIndex });

    let commands = [];
    // Emit handwritten concept note to the whiteboard immediately (0 ms latency)
    if (noteCmd) {
      commands.push(noteCmd);
      this._emitStream(input, {
        event: "graphic",
        canvasActions: [noteCmd],
        visualPlan: { shouldDraw: true, commands: [noteCmd] }
      });
    }

    if (graphicPlan.generate) {
      if (!geminiGraphic.isConfigured()) {
        console.warn("[PRIMER] Graphic skipped: no Gemini/OpenAI image key");
      } else {
        const iconSource = `${spokenText} ${graphicTitle}`;
        this._emitStream(input, {
          event: "graphic_loading",
          title: "",
          icon: topicIcon.pickIcon(iconSource, spoken),
          iconMarkup: topicIcon.iconMarkup(iconSource, spoken)
        });
        const photo = await geminiGraphic.generate({
          topic: graphicTitle,
          scene: graphicPlan.scene,
          previousScene: lastScene,
          spoken,
          question: spokenText,
          age: child?.age_years,
          grade: child?.grade,
          kind: graphicPlan.kind,
          timeoutMs: 28000
        }).catch((err) => {
          console.warn("[PRIMER] Graphic generate failed:", err.message);
          return null;
        });
        if (photo?.href) {
          photo.keepOthers = true;
          photo.archivePrevious = false;
          commands.push(photo);
          state.conversationState = state.conversationState || {};
          state.conversationState.lastGraphicScene = graphicPlan.scene;
          state.conversationState.lastGraphicKind = graphicPlan.kind;
          this._emitStream(input, {
            event: "graphic",
            canvasActions: [photo],
            visualPlan: { shouldDraw: true, commands: [photo] }
          });
        } else {
          console.warn("[PRIMER] Graphic produced no image for", graphicTitle, "— trying sketch fallback");
          const sketch = await this._proposePicture(understanding, state);
          const sketchCommands = this.canvas.buildCommands({
            picture: sketch?.picture,
            spoken,
            wantsDraw: true,
            force: true,
            concept: graphicTitle,
            studentInput: spokenText
          });
          if (sketchCommands.length) {
            commands.push(...sketchCommands);
            this._emitStream(input, {
              event: "graphic",
              canvasActions: sketchCommands,
              visualPlan: { shouldDraw: true, commands: sketchCommands }
            });
          }
        }
      }
    } else {
      console.log("[PRIMER] Graphic not requested:", graphicPlan.reason || graphicPlan.kind);
    }

    const writeCmd = this.canvas.buildWriteCommand(spokenText, state.conversationState?.lastTeacherSpoken);
    if (writeCmd) {
      commands = [...commands, writeCmd];
      this._emitStream(input, {
        event: "graphic",
        canvasActions: [writeCmd],
        visualPlan: { shouldDraw: true, commands: [writeCmd] }
      });
    }

    const evidence = this.evidenceExtractor.extract({
      childText: spokenText,
      understanding,
      proposal,
      decision
    });
    const addedMis = this.misconceptions.detect(understanding, spokenText);
    const removedMis = this.misconceptions.resolved(understanding, evidence);
    state.misconceptions = this.misconceptions.merge(state.misconceptions, addedMis, removedMis);
    state.evidence = {
      lastKind: evidence.kind,
      lastNote: evidence.note,
      recent: [...(state.evidence.recent || []), evidence].slice(-8)
    };

    const nextPhase = this.stateMachine.nextAfterTurn(state, understanding);
    this._updateConversationCounters(state, decision, understanding, spoken);
    state.learningPhase = nextPhase;

    const modelUpdates = this.learnerModel.applyEvidence(child, evidence, state.currentConcept);
    modelUpdates.misconceptions_add = addedMis;
    modelUpdates.misconceptions_remove = removedMis;
    const persist = Promise.all([
      this.memory.remember(child.id, session.id, evidence, {
        concept: state.currentConcept,
        phase: decision.phase,
        role: decision.role
      }).catch((err) => console.warn("[PRIMER] memory.remember failed:", err.message)),
      this.childModel.updateAfterTurn(child.id, modelUpdates)
        .catch((err) => console.warn("[PRIMER] updateAfterTurn failed:", err.message))
    ]);

    const finished = await this._finish({
      child,
      session,
      spokenText,
      spoken,
      requestId,
      commands,
      state,
      decision,
      understanding,
      evidence,
      safety: state.safetyState,
      created,
      priorTurnCount: recentTurns.length
    });
    persist.catch(() => {});
    await Promise.race([
      openerTts || Promise.resolve(null),
      new Promise((resolve) => setTimeout(resolve, 4000))
    ]);
    return finished;
  }

  _loadState(session, child) {
    const cached = this._states.get(session.id);
    if (cached) {
      cached.learnerState = child;
      return cached;
    }
    const snapshot = session.child_model_delta?.tutorState || {};
    const state = TutorState.fromSnapshot({
      mode: snapshot.mode || (session.experience_pattern === "autopilot" ? "autopilot" : "manual"),
      currentGoal: snapshot.currentGoal || null,
      currentConcept: snapshot.currentConcept || null,
      learningPhase: snapshot.learningPhase || "story",
      conversationState: snapshot.conversationState,
      evidence: snapshot.evidence,
      misconceptions: child.active_misconceptions || snapshot.misconceptions,
      tutorRole: snapshot.tutorRole,
      action: snapshot.action
    }, child);
    this._states.set(session.id, state);
    return state;
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
    return this._kickOpenerTts(input, text);
  }

  _kickOpenerTts(input, spoken) {
    const first = firstSpokenSentence(spoken);
    if (!first) return Promise.resolve(null);
    return synthesizeCartesiaSpeech(first)
      .then((audio) => {
        const payload = audioToPayload(audio);
        if (!payload.audioBase64) return null;
        this._emitStream(input, {
          event: "audio",
          opener: true,
          text: first,
          ...payload
        });
        return payload;
      })
      .catch((err) => {
        console.warn("[PRIMER] opener TTS failed:", err.message);
        return null;
      });
  }

  async _readBoardMath(spokenText, boardImage) {
    const fromSpeech = { transcription: "", facts: boardMath.extractFacts(spokenText) };
    if (!boardImage) return boardMath.mergeFacts(fromSpeech);
    const provider = this.aiProvider;
    if (!provider || typeof provider.callModelFn !== "function") {
      return boardMath.mergeFacts(fromSpeech);
    }
    try {
      const call = provider.callModelFn({
        persona: "teacher",
        userAction: "explain",
        fastTalk: true,
        boardRead: true,
        systemPrompt: "Transcribe the child's whiteboard math. Return JSON only.",
        studentQuery: String(spokenText || ""),
        typedInput: "Transcribe the attached whiteboard.",
        conversationHistory: [],
        boardImage
      });
      const response = await Promise.race([
        call,
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 10000))
      ]);
      const parsed = parseProposal(modelText(response)) || {};
      return boardMath.collectFromTurn(spokenText, parsed);
    } catch (err) {
      console.warn("[PRIMER] board math read failed:", err.message);
      return boardMath.mergeFacts(fromSpeech);
    }
  }

  async _proposeTalk(prompt, useVision, boardImage, options = {}) {
    const timeoutMs = useVision ? 22000 : 18000;
    const userText = prompt.talkInput || prompt.userBlock || prompt.studentQuery || "";
    if (process.env.LUMI6_DEBUG_PROMPT === "1") {
      console.log("[PRIMER] --- talk prompt ---\n", prompt.talkPrompt || prompt.systemPrompt);
      console.log("[PRIMER] --- user block ---\n", userText);
    }
    if (!useVision && openaiTalk.isConfigured()) {
      try {
        const openai = await openaiTalk.complete({
          systemPrompt: prompt.talkPrompt || prompt.systemPrompt,
          userText,
          timeoutMs,
          temperature: options.mathMode ? 0.1 : 0.4
        });
        return parseProposal(openai.content) || { spoken: "" };
      } catch (err) {
        console.warn("[PRIMER] OpenAI talk failed, falling back:", err.message);
      }
    }
    const provider = this.aiProvider;
    if (!provider || typeof provider.callModelFn !== "function") {
      return { spoken: "" };
    }
    try {
      const call = provider.callModelFn({
        persona: "teacher",
        userAction: "explain",
        fastTalk: true,
        systemPrompt: prompt.talkPrompt || prompt.systemPrompt,
        studentQuery: prompt.studentQuery,
        typedInput: userText,
        conversationHistory: (prompt.conversationHistory || []).slice(-6),
        boardImage: useVision ? boardImage : null
      });
      const response = await Promise.race([
        call,
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), timeoutMs))
      ]);
      return parseProposal(modelText(response)) || { spoken: "" };
    } catch (err) {
      console.warn("[PRIMER] talk propose failed:", err.message);
      return { spoken: "" };
    }
  }

  async _proposePicture(understanding, state) {
    const provider = this.aiProvider;
    if (!provider || typeof provider.callModelFn !== "function") return null;
    const topic = String(state?.currentConcept || understanding?.concept || "the idea").replace(/"/g, "").slice(0, 40);
    const systemPrompt = `Invent a simple kid diagram for "${topic}".
Return JSON only. No spoken text.
{"picture":{"title":"${topic}","bg":"#eef2ff","parts":[{"type":"circle","x":200,"y":280,"r":50,"fill":"#93c5fd","text":"label"}]}}
Use 6 to 10 parts. Types: circle, box, ellipse, arrow, line, beam, person, text. 900 by 620.`;
    try {
      const response = await Promise.race([
        provider.callModelFn({
          persona: "teacher",
          userAction: "explain",
          pictureOnly: true,
          fastTalk: true,
          systemPrompt,
          studentQuery: String(understanding?.raw || topic),
          typedInput: `${systemPrompt}\n\nDraw: ${topic}`,
          conversationHistory: [],
          boardImage: null
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 7000))
      ]);
      return parseProposal(modelText(response));
    } catch (err) {
      console.warn("[PRIMER] picture propose failed:", err.message);
      return null;
    }
  }

  async _proposeSimple(understanding, boardImage, options = {}) {
    const topic = String(understanding?.concept || "").trim() || "what they just asked";
    const raw = String(understanding?.raw || "").trim();
    const systemPrompt = `You are a patient older sibling teaching a 10-year-old.
Teach "${topic}" right now. The child said: "${raw}".
Every sentence must be about "${topic}". Never name or teach a different subject, even to apologise for one.
Do not say you messed up, mixed things up, or talked about the wrong thing. Just teach "${topic}".
Do not switch to a random object, gadget, toast, or hearing test.
3 short spoken sentences plus one open thinking question (how/why/what happens next) about THIS topic, in the SAME spoken text.
Use an everyday example that belongs to the topic. Short words. No markdown. No stock lecture.
Never ask "what is this called" or "what is the name of this process".
Never return JSON keys inside spoken.
Return JSON only: {"spoken":"kid sentences here including the check question?"}`;
    const userText = `${systemPrompt}\n\nChild said: "${raw}"\nTeach: ${topic}`;
    if (openaiTalk.isConfigured()) {
      try {
        const openai = await openaiTalk.complete({ systemPrompt, userText, timeoutMs: 16000 });
        const parsed = parseProposal(openai.content);
        const spoken = String(parsed?.spoken || "").trim();
        if (spoken && !ResponsePolicy.isCannedSpeech(spoken)) return parsed;
      } catch (err) {
        console.warn("[PRIMER] OpenAI simple talk failed:", err.message);
      }
    }
    const provider = this.aiProvider;
    if (!provider || typeof provider.callModelFn !== "function") return null;
    try {
      const response = await Promise.race([
        provider.callModelFn({
          persona: "teacher",
          userAction: "explain",
          fastTalk: true,
          systemPrompt,
          studentQuery: raw,
          typedInput: `${systemPrompt}\n\nChild said: "${raw}"\nTeach: ${topic}`,
          conversationHistory: [],
          boardImage: null
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 7000))
      ]);
      const parsed = parseProposal(modelText(response));
      const spoken = String(parsed?.spoken || "").trim();
      if (!spoken || ResponsePolicy.isCannedSpeech(spoken)) return null;
      return parsed;
    } catch (err) {
      console.warn("[PRIMER] simple propose failed:", err.message);
      return null;
    }
  }

  _updateConversationCounters(state, decision, understanding, spoken = "") {
    const conv = state.conversationState || {};
    conv.lastChildIntent = understanding.intent;
    conv.lastAction = decision.action;
    conv.lastRole = decision.role;
    conv.askedBackLast = /\?/.test(String(spoken || ""))
      || ["ask_back", "challenge", "diagnose"].includes(decision.action);
    conv.lastTeacherSpoken = String(spoken || "").trim();
    const asked = lastQuestion(spoken);
    if (asked && questionsMatch(asked, conv.lastCheckQuestion)) {
      conv.sameQuestionStreak = Number(conv.sameQuestionStreak || 0) + 1;
    } else {
      conv.sameQuestionStreak = asked ? 1 : 0;
    }
    if (asked) conv.lastCheckQuestion = asked;
    const quizLike = ["quiz", "exercise"].includes(decision.action);
    conv.consecutiveQuizzes = quizLike ? Number(conv.consecutiveQuizzes || 0) + 1 : 0;
    conv.consecutiveExplanations = decision.action === "explain"
      ? Number(conv.consecutiveExplanations || 0) + 1
      : 0;
    conv.lastAskedToLook = Boolean(understanding.askedToLook) && !understanding.wantsDraw;
    state.conversationState = conv;
  }

  async _finish({ child, session, spokenText, spoken, requestId, commands, state, decision, understanding, evidence, safety, created, priorTurnCount }) {
    this._states.set(session.id, state);
    const persistTurns = (async () => {
      await this.sessions.addTurn(session.id, {
        child_id: child.id,
        role: "child",
        spoken_text: spokenText
      });
      await this.sessions.addTurn(session.id, {
        child_id: child.id,
        role: "primer",
        spoken_text: spoken,
        canvas_action: commands.length ? commands.map((cmd) => (
          cmd?.tool === "place_photo" ? { tool: cmd.tool, title: cmd.title, href: "[inline-image]" } : cmd
        )) : null,
        ai_reasoning: {
          mode: state.mode,
          phase: decision.phase,
          nextPhase: state.learningPhase,
          role: decision.role,
          action: decision.action,
          need: decision.need,
          tools: decision.tools,
          reasons: decision.reasons,
          intent: understanding.intent,
          evidence: evidence.kind,
          policyValidated: true
        }
      });
      state.inquiryState = {
        phase: decision.inquiryPhase || "hook",
        targetSkill: decision.targetSkill || "hypothesis_generation",
        turnCount: ((state.inquiryState?.turnCount || 0) + 1)
      };
      const topics = Array.isArray(session.topics_touched) ? session.topics_touched : [];
      if (state.currentConcept && !topics.includes(state.currentConcept)) topics.push(state.currentConcept);
      await this.sessions.store.updateSession(session.id, {
        experience_pattern: state.mode,
        topics_touched: topics.slice(-12),
        child_model_delta: { tutorState: state.snapshot() }
      });
    })().catch((err) => console.warn("[PRIMER] persist turn failed:", err.message));

    return {
      requestId,
      intent: understanding.intent,
      teacherResponse: spoken,
      spokenResponse: spoken,
      spoken,
      visualPlan: { shouldDraw: commands.length > 0, commands },
      canvasActions: commands,
      drawingResult: { success: true, commands },
      tutorState: state.snapshot(),
      sessionState: {
        childId: child.id,
        sessionId: session.id,
        childName: child.name || null,
        turnNumber: Math.ceil((Number(priorTurnCount || 0) + 2) / 2),
        persistence: this.childModel.store.remoteEnabled ? "supabase" : "memory",
        mode: state.mode,
        learningPhase: state.learningPhase,
        phaseThisTurn: decision.phase,
        tutorRole: state.tutorRole,
        created: Boolean(created)
      },
      safety,
      metadata: { timestamp: new Date().toISOString() }
    };
  }
}

module.exports = LearningOrchestrator;
