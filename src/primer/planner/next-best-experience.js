"use strict";

class NextBestExperience {
  constructor(options = {}) {
    this.graph = options.graph;
    this.mastery = options.mastery;
    this.learnerModel = options.learnerModel;
  }

  choose(child, state, understanding) {
    const named = String(understanding?.concept || "").trim();
    if (named.length >= 3) {
      return {
        concept: named,
        conceptId: null,
        goal: `Follow their curiosity: ${named}.`,
        reason: "named-topic"
      };
    }

    const interestHit = this._interestConcept(child, understanding);
    if (interestHit) {
      return {
        concept: interestHit.name,
        conceptId: interestHit.id,
        goal: `Help them think with ${interestHit.name}, using something they already care about.`,
        reason: "interest"
      };
    }

    const matched = this.graph?.matchText(understanding?.raw || understanding?.concept);
    if (matched) {
      return {
        concept: matched.name,
        conceptId: matched.id,
        goal: `Stay with their question: ${matched.name}.`,
        reason: "question"
      };
    }

    const ready = this.graph?.readyConcepts(child, this.mastery) || [];
    const weakestThinking = this.learnerModel?.weakest(child, "thinking");
    const scored = ready.map((concept) => {
      const level = this.mastery ? this.mastery.topicLevel(child, concept.name) : 0.2;
      let score = 1 - level;
      if (weakestThinking && concept.domain === "thinking") score += 0.3;
      const recent = String(state?.currentConcept || "");
      if (recent && recent === concept.name) score -= 0.5;
      return { concept, score };
    });
    scored.sort((a, b) => b.score - a.score);
    const pick = scored[0]?.concept || ready[0];
    if (!pick) {
      return {
        concept: understanding?.concept || "their question",
        conceptId: null,
        goal: "Follow the child's curiosity.",
        reason: "open"
      };
    }
    return {
      concept: pick.name,
      conceptId: pick.id,
      goal: `Teach ${pick.name} in simple kid words with one everyday example.`,
      reason: "gap"
    };
  }

  _interestConcept(child, understanding) {
    const interests = Array.isArray(child?.interests) ? child.interests : [];
    const blob = `${understanding?.raw || ""} ${interests.join(" ")}`.toLowerCase();
    return this.graph?.matchText(blob) || null;
  }
}

module.exports = NextBestExperience;
