"use strict";

const { PHASES } = require("../constants.js");

/**
 * Story → Think → Learn → Think Again → Become
 *
 * Transitions follow the child's reaction, not a playlist and not the LLM's
 * self-report of "insight". Asking to learn something is LEARN, not BECOME.
 */
class LearningStateMachine {
  current(state) {
    return PHASES.includes(state?.learningPhase) ? state.learningPhase : "story";
  }

  determinePhase(state, understanding) {
    const previous = this.current(state);
    const intent = understanding?.intent || "chat";

    if (intent === "meta") return "story";
    if (intent === "voice") return previous === "story" ? "story" : (previous || "learn");
    if (understanding?.wantsDraw) return "learn";
    if (understanding?.pushback || understanding?.wantsExplain || intent === "explain" || intent === "dont_understand") {
      return "learn";
    }
    if (intent === "goal") return previous === "learn" ? "learn" : "story";
    if (intent === "homework" || intent === "drawing") return "think";
    if (intent === "insight") return "become";
    if (intent === "attempt" || intent === "revision") return "think_again";
    if (intent === "what_if") return previous === "learn" || previous === "think_again" ? "think_again" : "think";

    if (intent === "question" || intent === "fact" || understanding?.wantsReason) {
      return "learn";
    }

    if (previous === "become" && intent === "chat") return "think";
    return previous;
  }

  nextAfterTurn(state, understanding) {
    const phase = this.current(state);
    const intent = understanding?.intent;

    if (intent === "insight") return "become";
    if (intent === "attempt" || intent === "revision") return "think_again";
    if (understanding?.wantsExplain || intent === "explain" || intent === "pushback" || understanding?.wantsReason) {
      return "learn";
    }
    if (intent === "question" || intent === "fact" || intent === "dont_understand") return "learn";
    if (intent === "voice") return phase === "story" ? "story" : phase;
    if (intent === "meta") return "story";
    if (phase === "story") return "think";
    if (phase === "become") return "think";
    return phase;
  }

  advanceTurns(state, nextPhase) {
    const prev = this.current(state);
    const conversation = state.conversationState || {};
    if (nextPhase === prev) {
      conversation.turnsInPhase = Number(conversation.turnsInPhase || 0) + 1;
    } else {
      conversation.turnsInPhase = 1;
    }
    state.learningPhase = nextPhase;
    state.conversationState = conversation;
    return state;
  }
}

module.exports = LearningStateMachine;
