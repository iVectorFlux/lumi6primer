"use strict";

/**
 * Intent Classifier — Simple and fast.
 * Only distinguishes: greeting, casual, command, or teaching (everything else).
 * The AI tutor handles all nuance of follow-ups vs new topics.
 */
class IntentClassifier {
  constructor(options = {}) {
    this.aiProvider = options.aiProvider || null;
  }

  async classifyIntent(input) {
    const text = String(input || "").trim();
    const lower = text.toLowerCase();

    if (!lower) {
      return { intent: "casual_conversation", confidence: 1.0, text: "", source: "rule" };
    }

    // System commands
    const strictCommands = ["reset", "clear", "stop", "reset session", "clear whiteboard", "clear canvas"];
    if (strictCommands.some((cmd) => lower === cmd || lower === `${cmd}.`)) {
      return { intent: "command", confidence: 0.98, text, source: "rule" };
    }
    if (/\b(remove|erase|delete|clear)\b/.test(lower) && /\b(draw|drawn|drawing|board|canvas|everything)\b/.test(lower)) {
      return { intent: "command", confidence: 0.97, text, source: "rule" };
    }

    // Pure greetings (no question content)
    const greetings = ["hello", "hi", "hey", "greetings", "good morning", "good afternoon", "good evening",
      "hey atlas", "hi atlas", "hello atlas", "theek hai", "theek", "okay", "ok", "alright"];
    if (greetings.some((g) => lower === g || lower === `${g}!` || lower === `${g}.`)) {
      return { intent: "greeting", confidence: 0.95, text, source: "rule" };
    }
    if (/^(hey[, ]+)?(are you there|you there|still there|you listening)[.!?]*$/i.test(lower)) {
      return { intent: "greeting", confidence: 0.94, text, source: "rule" };
    }

    // Casual small talk / language preference — never dump these on the board
    if (/^(thank you|thanks|bye|goodbye|who are you|what is your name|how are you)[.!?]*$/.test(lower)) {
      return { intent: "casual_conversation", confidence: 0.92, text, source: "rule" };
    }
    if (/\b(speak|talk|reply|answer)\b.+\b(english|hindi)\b/.test(lower) || /\b(not in hindi|don't speak hindi|only english)\b/.test(lower)) {
      return { intent: "casual_conversation", confidence: 0.93, text, source: "rule" };
    }

    // Everything else is teaching — let the AI handle it
    return { intent: "teaching_request", confidence: 0.90, text, source: "rule" };
  }

  getConversationalResponse(intent, text) {
    const lower = text.toLowerCase();

    if (intent === "greeting") {
      if (/there|listening/.test(lower)) return "Yes, I'm here. What should we work on?";
      return "Hey. What are you working on?";
    }

    if (intent === "casual_conversation") {
      if (/\b(english|hindi)\b/.test(lower)) {
        return "Got it — I'll speak only in English. What do you want to work on?";
      }
      if (lower.includes("thank")) {
        return "You're welcome! Come back anytime you want to figure something out together.";
      }
      if (lower.includes("how are you")) {
        return "I'm good! More importantly — what are you thinking about today? Got a question, a problem, anything at all?";
      }
      if (lower.includes("who are you") || lower.includes("your name")) {
        return "I'm Lumi6 — think of me as a tutor who sits next to you and helps you think through things. What are you working on?";
      }
      return "I'm here whenever you want to think through something together. What's on your mind?";
    }

    if (intent === "command") {
      return "Done. What shall we work on next?";
    }

    return "What would you like to explore?";
  }
}

module.exports = IntentClassifier;
