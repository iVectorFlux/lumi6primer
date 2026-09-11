"use strict";

/**
 * Class 5 maths/science interactives. HTML lives in content/interactives/
 * and is mirrored to public.lesson_interactives.
 */
const ITEMS = [
  {
    slug: "sun-and-shadow",
    title: "Sun & Shadow",
    summary: "Move the Sun and watch the shadow fall the opposite way.",
    grade_min: 3,
    grade_max: 6,
    topics: [
      "sun and shadow", "shadow", "shadows", "sundial",
      "sun on the left", "sun on the right", "long shadow", "short shadow"
    ]
  },
  {
    slug: "tectonic-plates",
    title: "Tectonic Plates",
    summary: "Heat in the mantle moves Earth's rigid plates.",
    grade_min: 4,
    grade_max: 8,
    topics: [
      "tectonic", "tectonic plates", "continental plates",
      "earthquake", "earthquakes", "mantle convection", "plate tectonics",
      "continental drift"
    ]
  },
  {
    slug: "food-chain",
    title: "Food Chain",
    summary: "Change grasshoppers and watch plants, frogs, and snakes react.",
    grade_min: 3,
    grade_max: 6,
    topics: [
      "food chain", "food web", "ecosystem", "grasshopper",
      "producer consumer", "predator prey"
    ]
  },
  {
    slug: "water-climate",
    title: "Water & Climate",
    summary: "Heating drives evaporation, rain, and runoff.",
    grade_min: 3,
    grade_max: 6,
    topics: [
      "water cycle", "evaporation", "water vapor", "runoff",
      "climate system", "hydrologic"
    ]
  },
  {
    slug: "plant-growth",
    title: "Plant Growth",
    summary: "Sunlight, water, and carbon dioxide limit how a plant grows.",
    grade_min: 3,
    grade_max: 6,
    topics: [
      "photosynthesis", "plant growth", "carbon dioxide",
      "plants grow", "what plants need"
    ]
  },
  {
    slug: "energy-transformations",
    title: "Energy Transformations",
    summary: "Pedaling turns chemical energy into motion, electricity, and light.",
    grade_min: 4,
    grade_max: 8,
    topics: [
      "energy transformation", "energy transformations",
      "chemical energy", "electrical energy", "generator",
      "pedal", "pedaling"
    ]
  },
  {
    slug: "forces-gravity",
    title: "Forces, Motion & Gravity",
    summary: "The same push with more gravity makes a steeper fall.",
    grade_min: 4,
    grade_max: 7,
    topics: [
      "gravity", "forces and motion", "push force",
      "projectile", "unbalanced force"
    ]
  },
  {
    slug: "matter-changes",
    title: "Matter & Its Changes",
    summary: "Temperature changes how particles move — solid, liquid, gas.",
    grade_min: 3,
    grade_max: 6,
    topics: [
      "states of matter", "solid liquid gas", "particles",
      "melting", "freezing", "boiling", "evaporate"
    ]
  },
  {
    slug: "patterns-relationships",
    title: "Patterns & Relationships",
    summary: "Change the start and the step to grow a number pattern.",
    grade_min: 3,
    grade_max: 6,
    topics: [
      "number pattern", "number patterns", "sequence",
      "what comes next", "arithmetic sequence", "find the rule"
    ]
  },
  {
    slug: "geometry",
    title: "Geometry",
    summary: "Turn and resize a shape and see what stays the same.",
    grade_min: 3,
    grade_max: 6,
    topics: [
      "geometry", "spatial", "rotate a shape", "square and triangle",
      "vertices", "corners of a shape"
    ]
  },
  {
    slug: "place-value",
    title: "Place Value",
    summary: "Each digit's value depends on its place.",
    grade_min: 3,
    grade_max: 5,
    topics: [
      "place value", "thousands", "hundreds tens ones",
      "ones tens hundreds", "digit value"
    ]
  },
  {
    slug: "multiplication-division",
    title: "Multiplication & Division",
    summary: "Equal groups show how multiply and divide are related.",
    grade_min: 3,
    grade_max: 5,
    topics: [
      "multiplication", "division", "times tables",
      "equal groups", "groups of", "how many altogether"
    ]
  },
  {
    slug: "fractions-decimals",
    title: "Fractions and Decimals",
    summary: "Equal pieces of a whole written as a fraction or a decimal.",
    grade_min: 4,
    grade_max: 6,
    topics: [
      "fraction", "fractions", "decimal", "decimals",
      "tenths", "hundredths", "numerator"
    ]
  },
  {
    slug: "human-body-systems",
    title: "Human Body Systems",
    summary: "Choose a body system and see how it works with another.",
    grade_min: 4,
    grade_max: 7,
    topics: [
      "human body", "body systems", "body system",
      "circulatory", "respiratory", "digestive",
      "nervous system", "muscular system", "skeletal",
      "organs", "heart and lungs"
    ]
  },
  {
    slug: "magnetism",
    title: "Magnetism",
    summary: "Increase magnet strength and watch iron and steel get pulled in.",
    grade_min: 3,
    grade_max: 6,
    topics: [
      "magnetism", "magnet", "magnets", "magnetic",
      "north pole", "iron filings"
    ]
  },
  {
    slug: "moon-phases",
    title: "Moon Phases",
    summary: "Move the Moon around Earth and see why it looks like it changes shape.",
    grade_min: 3,
    grade_max: 6,
    topics: [
      "moon phases", "phases of the moon", "lunar phases",
      "full moon", "new moon", "crescent", "waxing", "waning",
      "why the moon changes"
    ]
  },
  {
    slug: "solar-system",
    title: "Our Solar System",
    summary: "Watch the planets orbit the Sun and tap one to learn about it.",
    grade_min: 3,
    grade_max: 6,
    topics: [
      "solar system", "planets", "orbit the sun",
      "mercury venus", "jupiter saturn", "the planets"
    ]
  },
  {
    slug: "electricity-circuits",
    title: "Electricity & Simple Circuits",
    summary: "Close the switch and watch current complete the path to the bulb.",
    grade_min: 4,
    grade_max: 7,
    topics: [
      "electricity", "simple circuit", "simple circuits",
      "electric circuit", "close the switch", "light the bulb",
      "open circuit", "closed circuit",
      "electromagnetism", "electromagnet", "electromagnets",
      "solenoid", "coil of wire", "electric magnet"
    ]
  },
  {
    slug: "heat-temperature",
    title: "Heat & Temperature",
    summary: "Heat moves from the hotter object to the cooler one.",
    grade_min: 3,
    grade_max: 6,
    topics: [
      "heat and temperature", "heat transfer", "temperature difference",
      "hotter and cooler", "heat moves", "conduction"
    ]
  }
];

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function gradeNumber(grade) {
  const n = Number(String(grade || "").replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function scoreItem(item, hay, concept) {
  const padded = ` ${hay} `;
  const conceptPad = ` ${normalize(concept)} `;
  let score = 0;
  for (const alias of item.topics || []) {
    const phrase = normalize(alias);
    if (!phrase || phrase.length < 4) continue;
    const hit = phrase.includes(" ")
      ? hay.includes(phrase)
      : padded.includes(` ${phrase} `);
    if (!hit) continue;
    const words = phrase.split(" ").filter(Boolean);
    const inConcept = conceptPad.includes(` ${phrase} `) || (concept && concept.includes(phrase));
    if (words.length === 1 && phrase.length < 10 && !inConcept) {
      const hayWords = hay.split(" ").filter(Boolean);
      if (hayWords.length > 8) continue;
      score += 3;
      continue;
    }
    score += 6 + words.length * 4 + Math.min(10, phrase.length / 2);
    if (inConcept) score += 8;
  }
  return score;
}

function matchInteractive(query, options = {}) {
  const concept = normalize(options.concept || query || "");
  const child = normalize(options.childText || "");
  const hay = normalize([concept, child].filter(Boolean).join(" "));
  if (!hay || hay.length < 4) return null;

  const grade = gradeNumber(options.grade);
  const items = Array.isArray(options.items) && options.items.length ? options.items : ITEMS;
  let best = null;
  let bestScore = 0;

  for (const item of items) {
    if (item.enabled === false) continue;
    if (grade != null) {
      const min = Number(item.grade_min || 0);
      const max = Number(item.grade_max || 12);
      if (grade < min - 1 || grade > max + 1) continue;
    }
    const score = scoreItem(item, hay, concept);
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  if (!best || bestScore < 12) return null;
  if (options.excludeSlug && best.slug === options.excludeSlug) return null;
  return { ...best, score: bestScore };
}

module.exports = { ITEMS, matchInteractive, normalize, gradeNumber };
