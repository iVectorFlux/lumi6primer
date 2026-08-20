"use strict";

/**
 * Escalation is not tutoring. Redirect to a trusted adult. No methods, no details.
 */
class Escalation {
  message(flags = []) {
    if (flags.includes("self_harm")) {
      return "I'm glad you told me. I'm not the right help for this. Please talk to a parent, teacher, or another adult you trust right now. If you are in the US, you can also call or text 988.";
    }
    if (flags.includes("abuse")) {
      return "That sounds important and you deserve to be safe. Please tell a trusted adult — a parent, teacher, or counselor — so they can help.";
    }
    if (flags.includes("adult_content")) {
      return "That's not something I can talk about. Want to pick up the idea you were actually working on?";
    }
    if (flags.includes("illegal")) {
      return "I can't help with that. Let's go back to something you're actually trying to understand.";
    }
    return "Let's pause this and pick something safer to think about.";
  }

  shouldHalt(flags = []) {
    return flags.some((f) => ["self_harm", "abuse", "adult_content", "illegal"].includes(f));
  }
}

module.exports = Escalation;
