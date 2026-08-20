"use strict";

const { CONCEPTS, getConcept, ageAppropriate } = require("./concepts.js");
const { prerequisitesOf, unlocks } = require("./prerequisites.js");

class CurriculumGraph {
  constructor() {
    this.concepts = CONCEPTS;
  }

  get(id) {
    return getConcept(id);
  }

  readyConcepts(child, masteryService) {
    const age = child?.age_years;
    const pool = ageAppropriate(age);
    return pool.filter((concept) => {
      const prereqs = prerequisitesOf(concept.id);
      if (!prereqs.length) return true;
      if (!masteryService) return true;
      const levels = prereqs.map((id) => masteryService.topicLevel(child, this.get(id)?.name || id));
      return masteryService.readyFor(child, concept.id, levels);
    });
  }

  nextAfter(conceptId) {
    return unlocks(conceptId).map((id) => getConcept(id)).filter(Boolean);
  }

  matchText(text) {
    const blob = String(text || "").toLowerCase();
    return CONCEPTS.find((c) => blob.includes(c.name) || blob.includes(c.id.replace(/_/g, " "))) || null;
  }
}

module.exports = CurriculumGraph;
