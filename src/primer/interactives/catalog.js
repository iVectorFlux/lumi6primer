"use strict";

/**
 * Offline fallback catalog. The live catalog is public.interactives;
 * HTML for these fallbacks lives in content/interactives/.
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
    // Drop apostrophes rather than splitting on them, so "kepler's" stays one word.
    .replace(/['’`\u02bc]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Crude singular form so "kepler's laws" matches the tag "kepler-laws". */
function stemWord(word) {
  if (word.length <= 3) return word;
  if (word.endsWith("ss") || word.endsWith("us") || word.endsWith("is")) return word;
  return word.endsWith("s") ? word.slice(0, -1) : word;
}

function stemPhrase(text) {
  return normalize(text).split(" ").filter(Boolean).map(stemWord).join(" ");
}

/** Title words that say nothing about the topic. */
const TITLE_STOPWORDS = new Set([
  "intro", "introduction", "basic", "simple", "complete", "guide", "lesson", "class",
  "grade", "math", "maths", "science", "using", "with", "from", "their", "what", "why",
  "how", "and", "the", "for", "part", "visual", "interactive", "explorer", "explore",
  "builder", "lab", "demo", "activity", "practice", "understanding", "definition"
]);

/** Distinct words from a title, usable as weak search aliases. */
function keywordsFromTitle(title) {
  const seen = new Set();
  for (const word of stemPhrase(title).split(" ")) {
    if (word.length < 5 || TITLE_STOPWORDS.has(word) || /^\d+$/.test(word)) continue;
    seen.add(word);
  }
  return [...seen];
}

/** Everyday questions never use the catalog's scientific tags. Expand them first. */
const PHENOMENA = [
  { re: /\bsky\b.*\bblue\b|\bblue\b.*\bsky\b|\bsunset\b.*\b(red|orange)\b|\bred\b.*\bsunset\b|\brayleigh\b/, extra: "rayleigh scattering wavelength optics waves" },
  { re: /\brainbow\b|\bprism\b|\bdispers\w*\b|\bsplit\b.*\blight\b/, extra: "prism dispersion refraction rainbow" },
  { re: /\belectromagnet\w*\b|\bfaraday\b|\binduction\b|\bgalvanometer\b|\b(magnet|coil)\b.*\b(electric|current|electricity)\b|\b(electric|current|electricity)\b.*\b(magnet|coil)\b/, extra: "electromagnetism faraday induction magnetic flux" },
  { re: /\brelativ\w*\b|\beinstein\b|\btime dilate\w*\b|\blorentz\b|\bspeed of light\b|\b(time|clock)\b.*\b(slow|faster|dilate)\b/, extra: "relativity time dilation einstein lorentz" },
  { re: /\bfree fall\b|\b(why|how).{0,24}\b(fall|falling)\b|\bfeather\b.*\b(ball|hammer)\b|\bgalileo\b/, extra: "gravity free fall acceleration" },
  { re: /\bphotosynthe\w*\b|\b(why|how).{0,24}\bplant\w*\b.*\b(food|grow|green|oxygen)\b|\bplant\w*\b.*\bsunlight\b/, extra: "photosynthesis chlorophyll plants biomass" },
  { re: /\bwater cycle\b|\b(why|how).{0,20}\brain\b|\bevaporat\w*\b|\bcondens\w*\b|\bcloud\w*\b.*\brain\b/, extra: "water cycle evaporation precipitation" },
  { re: /\bheat\b.*\b(metal|copper|conduct)\b|\bconduct\w*\b.*\bheat\b|\bwhy.{0,16}\bmetal.{0,16}\b(hot|cold)\b/, extra: "heat transfer conduction thermal" },
  { re: /\b(solid|liquid|gas|steam|melt|boil|freeze|ice)\b.*\b(heat|cold|hot|warm|temperature)\b|\bstates of matter\b|\bphase change\b/, extra: "states of matter kinetic temperature" },
  { re: /\bkepler\b|\b(why|how).{0,20}\bplanet\w*\b.*\b(orbit|year|sun)\b|\bsolar system\b/, extra: "kepler planetary orbits solar system" },
  { re: /\bpythag/i, extra: "pythagoras theorem pythagorean" }
];

function expandPhenomena(hay) {
  const text = ` ${hay} `;
  const extra = [];
  for (const hint of PHENOMENA) {
    if (hint.re.test(text)) extra.push(hint.extra);
  }
  if (!extra.length) return hay;
  return stemPhrase(`${hay} ${extra.join(" ")}`);
}

function gradeNumber(grade) {
  const n = Number(String(grade || "").replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** A word this long, or any multi-word phrase, is specific enough to pick a topic on its own. */
const DISTINCTIVE_LEN = 10;

/**
 * Returns the match strength plus whether any hit was specific enough to trust
 * off-grade. Short generic words ("third", "line") only count when the child's
 * request is essentially just that word, otherwise "newton's third law" pulls in
 * a fractions widget tagged "thirds".
 */
function searchDocument(item) {
  return stemPhrase([
    item.title,
    item.concept,
    item.idea,
    item.summary,
    ...(item.topics || []),
    ...(item.keywords || [])
  ].join(" "));
}

function scoreItem(item, hay, concept) {
  const padded = ` ${hay} `;
  const conceptPad = ` ${stemPhrase(concept)} `;
  const hayWords = hay.split(" ").filter(Boolean);
  const terse = hayWords.length <= 3;
  const doc = ` ${item.searchText || searchDocument(item)} `;
  let score = 0;
  let distinctive = false;

  for (const alias of item.topics || []) {
    const raw = normalize(alias);
    const phrase = stemPhrase(alias);
    if (!phrase || phrase.length < 4) continue;
    const hit = phrase.includes(" ")
      ? hay.includes(phrase)
      : padded.includes(` ${phrase} `);
    if (!hit) continue;
    const words = phrase.split(" ").filter(Boolean);
    // Length is judged before stemming, so "pythagoras" stays a specific term.
    if (words.length === 1 && raw.length < DISTINCTIVE_LEN) {
      if (terse) score += 14;
      else if (hayWords.length <= 8) score += 3;
      continue;
    }
    distinctive = true;
    score += 6 + words.length * 4 + Math.min(10, raw.length / 2);
    if (conceptPad.includes(` ${phrase} `) || (concept && concept.includes(phrase))) score += 8;
  }

  // Terms we injected from "why is the sky blue" → rayleigh scattering, etc.
  for (const word of hayWords) {
    if (word.length < 7) continue;
    if (!doc.includes(` ${word} `)) continue;
    score += word.length >= 9 ? 10 : 6;
    if (word.length >= 9) distinctive = true;
  }

  if (score >= MIN_SCORE) return { score, distinctive };

  for (const word of item.keywords || []) {
    if (!padded.includes(` ${word} `)) continue;
    score += terse ? 14 : 2;
  }
  return { score, distinctive };
}

function similarStem(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length < 7 || b.length < 7) return false;
  return a.slice(0, 7) === b.slice(0, 7);
}

/** Extra weight when the child actually named this widget (Pythagoras, Kepler, …). */
function namedTopicBonus(item, hay) {
  const padded = ` ${hay} `;
  const hayWords = hay.split(" ").filter(Boolean);
  let bonus = 0;
  const names = [...(item.keywords || []), ...(item.topics || [])];
  for (const name of names) {
    const phrase = stemPhrase(name);
    if (phrase.length < 8) continue;
    if (padded.includes(` ${phrase} `)) {
      bonus += 24;
      continue;
    }
    const nameWords = phrase.split(" ").filter((word) => word.length >= 7);
    if (nameWords.some((word) => hayWords.some((part) => similarStem(word, part)))) bonus += 24;
  }
  return bonus;
}

/** Grades within this distance are treated as on-level. */
const NEAR_GRADE = 2;
/** Further than that, only an explicitly named topic wins. */
const FAR_GRADE_MIN_SCORE = 20;
const MIN_SCORE = 12;

function gradeDistance(item, grade) {
  if (grade == null) return 0;
  const min = Number(item.grade_min || 0);
  const max = Number(item.grade_max || 12);
  if (grade < min) return min - grade;
  if (grade > max) return grade - max;
  return 0;
}

function matchInteractive(query, options = {}) {
  const concept = stemPhrase(options.concept || query || "");
  const child = stemPhrase(options.childText || "");
  // Prefer the child's words. A leftover lesson title in `concept` used to beat
  // a new ask ("Pythagoras") after a previous widget (waves / Rayleigh).
  const rawHay = child || concept;
  if (!rawHay || rawHay.length < 4) return null;
  const hay = expandPhenomena(rawHay);

  const grade = gradeNumber(options.grade);
  const items = Array.isArray(options.items) && options.items.length ? options.items : ITEMS;
  let best = null;
  let bestScore = 0;
  let bestRank = 0;

  for (const item of items) {
    if (item.enabled === false) continue;
    const named = namedTopicBonus(item, hay);
    const { score, distinctive } = scoreItem(item, hay, concept);
    const total = score + named;
    if (total < MIN_SCORE) continue;
    const distance = gradeDistance(item, grade);
    const isNamed = named >= 20 || distinctive;
    if (distance > NEAR_GRADE && (!isNamed || total < FAR_GRADE_MIN_SCORE)) continue;
    const rank = total - distance * 1.5 + named;
    if (rank > bestRank) {
      bestRank = rank;
      bestScore = total;
      best = item;
    }
  }

  if (!best) return null;
  if (options.excludeSlug && best.slug === options.excludeSlug) return null;
  return { ...best, score: bestScore };
}

module.exports = { ITEMS, matchInteractive, normalize, gradeNumber, keywordsFromTitle, stemPhrase };
