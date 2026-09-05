"use strict";

const { topicFromText, isWeakTopic } = require("../topic.js");

/**
 * AUTOPILOT ("Teach me") vs MANUAL ("Ask anything").
 * Autopilot still uses the same conversation. It chooses the next experience.
 */
class Autopilot {
  detectMode(text, requestedMode, previousMode) {
    const t = String(text || "").toLowerCase();
    if (requestedMode === "autopilot" || requestedMode === "manual") return requestedMode;
    const named = topicFromText(text);
    if (/\b(what should i learn)\b/.test(t) && isWeakTopic(named)) return "autopilot";
    if (/\b(teach me|let's learn|start (a )?lesson)\b/.test(t) && isWeakTopic(named)) return "autopilot";
    if (/\b(ask anything|i have a question|just wondering|can i ask)\b/.test(t)) return "manual";
    return previousMode || "manual";
  }

  plan(child, state, understanding) {
    const named = String(understanding?.concept || "").trim();
    const weakName = /^(better|again|more|it better)$/i.test(named);
    const childNamedATopic = !weakName && named.length >= 3
      && (understanding?.wantsExplain || ["explain", "question", "fact", "dont_understand", "homework"].includes(understanding?.intent));

    if (childNamedATopic) {
      return {
        mode: state.mode,
        goal: `Follow their question about ${named}.`,
        concept: named,
        reason: "named-topic"
      };
    }

    if (state.currentConcept) {
      return {
        mode: state.mode,
        goal: `Stay with ${state.currentConcept}.`,
        concept: state.currentConcept,
        reason: "hold-topic"
      };
    }

    return {
      mode: state.mode === "autopilot" ? "autopilot" : "manual",
      goal: "Follow the child's question.",
      concept: understanding?.concept || state.currentConcept,
      reason: "follow"
    };
  }
}

module.exports = Autopilot;
