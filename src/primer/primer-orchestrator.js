"use strict";

const BoardSummaryGenerator = require("../atlas/board-summary-generator.js");
const WhiteboardController = require("../atlas/whiteboard-controller.js");
const { synthesizeCartesiaSpeech, audioToPayload } = require("../atlas/cartesia-tts.js");
const LearningOrchestrator = require("./tutor/orchestrator.js");

function childProfileNote(child) {
  if (!child) return "";
  return [
    child.name ? `Name: ${child.name}` : "",
    child.age_years ? `Age: ${child.age_years}` : "",
    child.grade ? `Class: ${child.grade}` : "",
    Array.isArray(child.interests) && child.interests.length ? `Likes: ${child.interests.slice(0, 6).join(", ")}` : ""
  ].filter(Boolean).join(". ");
}

/**
 * PrimerOrchestrator — persistent companion.
 * Manual ("Ask anything") and Autopilot ("Teach me") share one conversation.
 * The learning orchestrator owns phase, role, tools, evidence, and memory.
 */
class PrimerOrchestrator {
  constructor(options = {}) {
    this.childModel = options.childModel;
    this.sessions = options.sessions;
    this.whiteboardController = options.whiteboardController || new WhiteboardController(options);
    this.aiProvider = options.aiProvider;
    this.boardSummary = options.boardSummary || new BoardSummaryGenerator();
    this.learning = options.learningOrchestrator || new LearningOrchestrator({
      childModel: this.childModel,
      sessions: this.sessions,
      aiProvider: this.aiProvider,
      whiteboardController: this.whiteboardController,
      boardSummary: this.boardSummary
    });
  }

  async startSession(childId, extras = {}) {
    const child = await this.childModel.getOrCreate(childId, extras);
    const open = await this.sessions.store.getOpenSession(child.id);
    const session = open || await this.sessions.startSession(child.id, {
      experience_pattern: extras.mode === "autopilot" ? "autopilot" : "manual",
      cognitive_goals: extras.cognitive_goals || []
    });
    if (!open) await this.childModel.incrementSessionCount(child.id);
    const recentEvents = await this.childModel.getRecentEvents(child.id, 5);
    const name = child.name || "there";
    const greeting = recentEvents.length
      ? `Hey ${name}. Last time you were in the middle of ${recentEvents[0].topic || "an idea"}. Want to pick that thread up, or is something else on your mind?`
      : `Hey ${name}. What's on your mind? Ask me anything — or say "teach me" and I'll take the next step with you.`;
    return { child, session, greeting, profile: childProfileNote(child) };
  }

  async handleTurn(input = {}) {
    const streaming = typeof input.onStream === "function";
    const wantAudio = !streaming && Boolean(
      input.wantAudio
      || String(input.requestId || "").includes("voice")
    );
    let ttsPromise = Promise.resolve(null);
    const result = await this.learning.handleTurn({
      ...input,
      onSpoken: wantAudio
        ? (spoken) => {
            const text = String(spoken || "").trim();
            ttsPromise = text
              ? synthesizeCartesiaSpeech(text).catch((err) => {
                console.warn("[PRIMER TTS] synth failed:", err.message);
                return null;
              })
              : Promise.resolve(null);
          }
        : input.onSpoken
    });
    const audio = wantAudio ? await ttsPromise : null;
    return {
      ...result,
      ...audioToPayload(audio)
    };
  }

  async endSession(sessionId, summary = "") {
    return this.sessions.endSession(sessionId, summary);
  }
}

module.exports = PrimerOrchestrator;
