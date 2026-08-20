"use strict";

const { PHASES, ROLES, MODES, ACTIONS } = require("../constants.js");

function emptyEvidence() {
  return {
    lastKind: null,
    lastNote: "",
    recent: []
  };
}

function emptySafety() {
  return {
    ok: true,
    flags: [],
    escalation: null,
    dependencyRisk: "low"
  };
}

function emptyConversation() {
  return {
    lastChildIntent: "chat",
    lastAction: null,
    lastRole: null,
    consecutiveQuizzes: 0,
    consecutiveExplanations: 0,
    turnsInPhase: 0,
    askedBackLast: false,
    lastTeacherSpoken: "",
    lastCheckQuestion: "",
    sameQuestionStreak: 0,
    lastGraphicScene: "",
    lastGraphicKind: ""
  };
}

/**
 * TutorState — the object every turn is decided from.
 * The LLM does not own this. The orchestrator does.
 */
class TutorState {
  constructor(input = {}) {
    this.mode = MODES.includes(input.mode) ? input.mode : "manual";
    this.learnerState = input.learnerState || null;
    this.currentGoal = input.currentGoal || null;
    this.currentConcept = input.currentConcept || null;
    this.learningPhase = PHASES.includes(input.learningPhase) ? input.learningPhase : "story";
    this.conversationState = { ...emptyConversation(), ...(input.conversationState || {}) };
    this.evidence = { ...emptyEvidence(), ...(input.evidence || {}) };
    this.misconceptions = Array.isArray(input.misconceptions) ? input.misconceptions : [];
    this.availableTools = Array.isArray(input.availableTools)
      ? input.availableTools
      : ["canvas", "vision", "homework", "retrieval"];
    this.safetyState = { ...emptySafety(), ...(input.safetyState || {}) };
    this.tutorRole = ROLES.includes(input.tutorRole) ? input.tutorRole : "tutor";
    this.action = ACTIONS.includes(input.action) ? input.action : "observe";
    this.selectedTools = Array.isArray(input.selectedTools) ? input.selectedTools : [];
    this.memorySnippets = Array.isArray(input.memorySnippets) ? input.memorySnippets : [];
  }

  snapshot() {
    return {
      mode: this.mode,
      currentGoal: this.currentGoal,
      currentConcept: this.currentConcept,
      learningPhase: this.learningPhase,
      conversationState: { ...this.conversationState },
      evidence: {
        lastKind: this.evidence.lastKind,
        lastNote: this.evidence.lastNote,
        recent: (this.evidence.recent || []).slice(-8)
      },
      misconceptions: this.misconceptions.slice(-8),
      availableTools: [...this.availableTools],
      safetyState: { ...this.safetyState },
      tutorRole: this.tutorRole,
      action: this.action,
      selectedTools: [...this.selectedTools]
    };
  }

  static fromSnapshot(snapshot, learnerState = null) {
    return new TutorState({ ...(snapshot || {}), learnerState });
  }
}

module.exports = { TutorState, emptyConversation, emptyEvidence, emptySafety };
