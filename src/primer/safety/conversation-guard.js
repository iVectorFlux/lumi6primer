"use strict";

class ConversationGuard {
  constructor(childPolicy) {
    this.childPolicy = childPolicy;
  }

  inspectInput(text, child) {
    const verdict = this.childPolicy.evaluate(text, child);
    return {
      allow: verdict.ok || !verdict.flags.some((f) => ["self_harm", "abuse", "adult_content", "illegal"].includes(f)),
      block: verdict.flags.some((f) => ["self_harm", "abuse", "adult_content", "illegal"].includes(f)),
      flags: verdict.flags,
      verdict
    };
  }

  sanitizePrivacy(text) {
    return String(text || "")
      .replace(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, "[phone]")
      .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email]");
  }
}

module.exports = ConversationGuard;
