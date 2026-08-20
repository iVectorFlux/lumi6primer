"use strict";

const ConversationManager = require("./conversation-manager.js");
const WhiteboardController = require("./whiteboard-controller.js");
const IntentClassifier = require("./intent-classifier.js");
const BoardSummaryGenerator = require("./board-summary-generator.js");
const { synthesizeCartesiaSpeech, audioToPayload } = require("./cartesia-tts.js");

function cleanSpoken(text) {
  let out = String(text || "").replace(/\s+/g, " ").trim();
  if (!out) return "";
  const junk = /whiteboard (is blank|shows|says|has)|the board (shows|says|has)|no new sketch|no handwriting visible|photo of the whiteboard|i('m| am) pointing to|sketch is blank|board is empty|board par|halki grid/i;
  out = out
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.trim() && !junk.test(s))
    .join(" ")
    .trim();
  out = out.replace(/^sorry[,.]?\s*/i, "").trim();
  out = out.replace(/^(the whiteboard shows[^.]*\.\s*)+/i, "").trim();
  return out;
}

function referringToBoard(studentInput) {
  const t = String(studentInput || "").toLowerCase();
  return /\b(look at (this|that|it|the board|the whiteboard)|what('s| is) (this|that)|i (just )?(wrote|drew|marked|circled)|solve this|this (problem|equation|sum|drawing)|on the board|what's written|what did i (write|draw))\b/i.test(t);
}

function isTeacherEcho(text) {
  const t = String(text || "").toLowerCase();
  return /you('re| are) getting it|what should we explore|which part should we|or a new topic|want me to explain|what are you curious|listening for your next|what else are you wondering|should we zoom/.test(t);
}

/**
 * TeachingLoop — Fully AI-driven, no hardcoded lessons.
 *
 * Every turn:
 * 1. Classify intent (greeting/command vs teaching)
 * 2. Call AI tutor with full conversation context + board image
 * 3. AI decides the spoken response AND what to draw
 * 4. Synthesize speech via Cartesia
 * 5. Render visuals on the whiteboard
 */
class TeachingLoop {
  constructor(options = {}) {
    this.conversationManager = options.conversationManager || new ConversationManager(options);
    this.whiteboardController = options.whiteboardController || new WhiteboardController({
      ...options,
      aiProvider: options.aiProvider || this.conversationManager.aiProvider
    });
    this.intentClassifier = options.intentClassifier || new IntentClassifier({
      aiProvider: this.conversationManager.aiProvider
    });
    this.boardSummary = options.boardSummary || new BoardSummaryGenerator();
    this.turnCount = 0;
  }

  async handleStudentTurn(studentInput, requestId = null, extras = {}) {
    if (typeof studentInput !== "string" || !studentInput.trim()) {
      throw new Error("Student input must be a non-empty string.");
    }

    studentInput = studentInput.trim();
    const boardImage = typeof extras.boardImage === "string" && extras.boardImage.startsWith("data:image/")
      ? extras.boardImage : null;
    const activeRequestId = requestId || `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    if (isTeacherEcho(studentInput)) {
      return this._emptyResponse(activeRequestId);
    }

    const classification = await this.intentClassifier.classifyIntent(studentInput);
    const intent = classification.intent;
    console.log("[ATLAS] Intent:", intent, "Input:", studentInput.slice(0, 80));

    if (["greeting", "casual_conversation", "command"].includes(intent)) {
      const teacherResponse = this.intentClassifier.getConversationalResponse(intent, studentInput);
      const audio = await synthesizeCartesiaSpeech(teacherResponse).catch(() => null);
      this.conversationManager.addStudentMessage(studentInput);
      this.conversationManager.addTeacherMessage(teacherResponse);
      return {
        requestId: activeRequestId,
        intent,
        teacherResponse,
        spokenResponse: teacherResponse,
        visualPlan: { shouldDraw: false, commands: [] },
        ...audioToPayload(audio),
        metadata: { timestamp: new Date().toISOString() },
        history: this.conversationManager.getHistory()
      };
    }

    // Teaching turn — always write on the board. New diagrams only when not annotating the child's marks.
    this.turnCount += 1;
    const wantsBoardLook = referringToBoard(studentInput);
    const visionImage = wantsBoardLook ? boardImage : null;
    const shouldDrawPicture = !wantsBoardLook && this._shouldDrawVisual(studentInput);

    const spokenResponse = cleanSpoken(await this._askTutor(studentInput, visionImage, shouldDrawPicture));

    const ttsPromise = synthesizeCartesiaSpeech(spokenResponse).catch((err) => {
      console.warn("[ATLAS TTS] synth failed:", err.message);
      return null;
    });

    const drawPromise = this._generateVisual(studentInput, spokenResponse, {
      annotateOnly: !shouldDrawPicture
    });

    const [drawingResult, audio] = await Promise.all([drawPromise, ttsPromise]);

    this.conversationManager.addStudentMessage(studentInput);
    if (spokenResponse) this.conversationManager.addTeacherMessage(spokenResponse);

    return {
      requestId: activeRequestId,
      intent,
      teacherResponse: spokenResponse,
      spokenResponse,
      visualPlan: {
        shouldDraw: (drawingResult.commands || []).length > 0,
        commands: drawingResult.commands || []
      },
      drawingResult,
      ...audioToPayload(audio),
      metadata: { timestamp: new Date().toISOString() },
      history: this.conversationManager.getHistory()
    };
  }

  _shouldDrawVisual(studentInput) {
    const t = studentInput.toLowerCase();
    if (/\b(draw|show me|picture|visual|illustrate|graph|chart|diagram)\b/.test(t)) return true;
    if (/\b(teach me|how does|how do|what is|explain|why does|why do)\b/.test(t)) return true;
    if (this.turnCount === 1) return true;
    if (this.turnCount % 3 === 0) return true;
    return false;
  }

  async _askTutor(studentInput, boardImage, hasPicture) {
    const provider = this.conversationManager?.aiProvider;
    if (!provider || typeof provider.generateTutorTurn !== "function") {
      return "What would you like to explore? Ask me anything.";
    }
    try {
      const result = await Promise.race([
        provider.generateTutorTurn({
          studentInput,
          history: this.conversationManager.getHistory(),
          boardImage,
          hasPicture,
          topicTitle: ""
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), boardImage ? 20000 : 16000))
      ]);
      const { extractSpoken } = require("../primer/tutor/proposal.js");
      const spoken = cleanSpoken(extractSpoken(result) || String(result || ""));
      if (spoken && spoken.length > 10 && !/"spoken"\s*:/.test(spoken) && !spoken.startsWith("{")) return spoken;
    } catch (err) {
      console.warn("[ATLAS] AI tutor error:", err.message);
    }
    const topic = String(studentInput || "").replace(/^(please |can you |could you )?(teach me |teach |explain |what is |how's |how does )/i, "").trim() || "this";
    return `Yes. Let's learn ${topic}. I will say it in kid words with one real-life example. What have you already heard about it?`;
  }

  async _generateVisual(studentInput, spokenResponse, options = {}) {
    const annotateOnly = options.annotateOnly === true;
    const visualTitle = this._extractTitle(studentInput);
    const visualSteps = annotateOnly ? [] : this._extractSteps(spokenResponse);
    const boardSummary = this.boardSummary.summarizeForBoard(spokenResponse, studentInput);
    const writeTextCommands = [];
    const drawPicture = !annotateOnly;

    const visualPlan = {
      shouldDraw: writeTextCommands.length > 0 || drawPicture,
      type: "diagram",
      description: visualTitle,
      boardTitle: visualTitle,
      concept: "dynamic",
      panels: visualSteps,
      skipSpokenNotes: true,
      annotateOnly: !drawPicture,
      drawPicture,
      writeTextCommands
    };

    try {
      const result = await this.whiteboardController.drawOnWhiteboard(visualPlan);
      return result;
    } catch (err) {
      console.warn("[ATLAS] Draw failed:", err.message);
      return { success: false, commands: writeTextCommands };
    }
  }

  _extractTitle(studentInput) {
    return this.boardSummary.conceptTitle(studentInput) || "Idea";
  }

  _extractSteps(spoken) {
    const raw = String(spoken || "");
    const clauses = raw
      .split(/[.!;:]/)
      .map((s) => s.replace(/[,\-–—]+$/, "").trim())
      .filter((s) => s.length > 5 && s.length < 120 && !/\?$/.test(s));
    if (clauses.length >= 2) {
      return clauses.slice(0, 4).map((s, i) => `${i + 1}.\n${s.slice(0, 50)}`);
    }
    const words = raw.split(/\s+/).filter(Boolean);
    if (words.length >= 8) {
      const chunkSize = Math.ceil(words.length / 4);
      return Array.from({ length: 4 }, (_, i) => {
        const chunk = words.slice(i * chunkSize, (i + 1) * chunkSize).join(" ");
        return `${i + 1}.\n${chunk.slice(0, 50)}`;
      });
    }
    return [];
  }

  resetSession() {
    this.conversationManager.clearHistory();
    this.turnCount = 0;
  }

  getHistory() {
    return this.conversationManager.getHistory();
  }

  _emptyResponse(requestId) {
    return {
      requestId,
      intent: "followup_question",
      teacherResponse: "",
      spokenResponse: "",
      visualPlan: { shouldDraw: false, commands: [] },
      drawingResult: { success: true, commands: [] },
      metadata: { timestamp: new Date().toISOString() },
      history: this.conversationManager.getHistory()
    };
  }
}

module.exports = TeachingLoop;
