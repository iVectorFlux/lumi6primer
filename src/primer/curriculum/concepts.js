"use strict";

/**
 * Seed graph used only when Autopilot must pick a next step and the child
 * has not named a topic. It is not a catalog of allowed questions.
 * The child may ask about anything; the tutor follows their words.
 */
const CONCEPTS = [
  { id: "place_value", name: "place value", domain: "mathematics", ageMin: 8 },
  { id: "fractions", name: "fractions", domain: "mathematics", ageMin: 8 },
  { id: "ratio", name: "ratio", domain: "mathematics", ageMin: 10 },
  { id: "equations", name: "unknowns in equations", domain: "mathematics", ageMin: 10 },
  { id: "measurement", name: "measurement", domain: "mathematics", ageMin: 8 },
  { id: "sentence_sense", name: "what a sentence is doing", domain: "language", ageMin: 8 },
  { id: "argument", name: "claims and reasons", domain: "language", ageMin: 10 },
  { id: "narrative_cause", name: "why events happen in a story", domain: "language", ageMin: 8 },
  { id: "evidence", name: "what counts as evidence", domain: "thinking", ageMin: 8 },
  { id: "models", name: "models vs the thing itself", domain: "science", ageMin: 9 },
  { id: "cause", name: "cause and correlation", domain: "thinking", ageMin: 10 },
  { id: "maps_scale", name: "maps and scale", domain: "world", ageMin: 8 }
];

function getConcept(id) {
  return CONCEPTS.find((c) => c.id === id || c.name === id) || null;
}

function byDomain(domain) {
  return CONCEPTS.filter((c) => c.domain === domain);
}

function ageAppropriate(ageYears) {
  const age = Number(ageYears) || 10;
  return CONCEPTS.filter((c) => age >= (c.ageMin || 8));
}

module.exports = { CONCEPTS, getConcept, byDomain, ageAppropriate };
