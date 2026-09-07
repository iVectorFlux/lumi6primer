"use strict";

/** Learning state machine. Become is a longitudinal outcome, not a moral lesson. */
const PHASES = Object.freeze(["story", "think", "learn", "think_again", "become"]);

const ROLES = Object.freeze(["advisor", "librarian", "tutor", "editor", "thinking_partner"]);

const MODES = Object.freeze(["manual", "autopilot"]);

const ACTIONS = Object.freeze([
  "situate",
  "observe",
  "answer",
  "ask_back",
  "explain",
  "reinterpret",
  "challenge",
  "diagnose",
  "invite_revision",
  "retrieve",
  "plan",
  "reflect"
]);

const TOOLS = Object.freeze(["canvas", "vision", "homework", "retrieval", "simulation"]);

const LEARNER_DIMENSIONS = Object.freeze({
  knowledge: ["mathematics", "science", "language", "world"],
  thinking: ["reasoning", "evidence", "causal_thinking", "problem_solving", "creativity", "perspective_taking"],
  learning: ["question_formation", "metacognition", "self_correction", "persistence", "independent_learning"],
  becoming: ["judgment", "intellectual_humility", "curiosity", "responsibility", "empathy", "independence"]
});

const ROLE_PURPOSE = Object.freeze({
  advisor: "Ask what they want to learn, in kid words.",
  librarian: "Bring one simple fact if it helps.",
  tutor: "Teach the idea clearly, step by step, with a real-life example. Then one check question.",
  editor: "Help them fix their work, kindly.",
  thinking_partner: "Ask one small thinking question after you have taught something."
});

const PHASE_INTENT = Object.freeze({
  story: "Say hello in kid words. Ask what they want to know. Do not lecture.",
  think: "If they asked to learn something, teach it. Otherwise ask one small question.",
  learn: "Teach the idea fully in simple words, with a real-life example. Then ask one thinking question.",
  think_again: "React to their answer, then teach the next layer of the SAME idea.",
  become: "Name what they just figured out, in their words. Then remember it."
});

module.exports = {
  PHASES,
  ROLES,
  MODES,
  ACTIONS,
  TOOLS,
  LEARNER_DIMENSIONS,
  ROLE_PURPOSE,
  PHASE_INTENT
};
