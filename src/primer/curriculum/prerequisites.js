"use strict";

const EDGES = [
  ["place_value", "fractions"],
  ["fractions", "ratio"],
  ["place_value", "equations"],
  ["measurement", "maps_scale"],
  ["sentence_sense", "argument"],
  ["narrative_cause", "cause"],
  ["evidence", "argument"],
  ["evidence", "models"],
  ["models", "cause"]
];

function prerequisitesOf(conceptId) {
  return EDGES.filter(([, to]) => to === conceptId).map(([from]) => from);
}

function unlocks(conceptId) {
  return EDGES.filter(([from]) => from === conceptId).map(([, to]) => to);
}

module.exports = { EDGES, prerequisitesOf, unlocks };
