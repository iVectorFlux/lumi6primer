"use strict";

const HAS_EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

/**
 * Maximum distinct emojis allowed in a single AI response turn.
 * Keeps explanations clean, readable, and prevents emoji flooding.
 */
const MAX_EMOJIS_PER_TURN = 3;

/**
 * Rules for enriching educational explanations with visual emojis.
 * - One emoji per object word, first hit only.
 * - Maximum 3 distinct emojis per response turn.
 * - Never repeats the same emoji multiple times in a single turn.
 */
const RULES = [
  // -------------------------------------------------------------------------
  // BIOLOGY & HUMAN BODY
  // -------------------------------------------------------------------------
  [/\bhearts?\b/i, "🫀"],
  [/\blungs?\b/i, "🫁"],
  [/\bbrains?\b/i, "🧠"],
  [/\bbones?\b/i, "🦴"],
  [/\bneurons?\b/i, "🧠"],
  [/\bdna\b|\bgenes?\b/i, "🧬"],
  [/\bcells?\b/i, "🔬"],
  [/\bmuscles?\b/i, "💪"],
  [/\bplants?\b|\bphotosynthesis\b/i, "🌱"],
  [/\bleaf\b|\bleaves\b/i, "🍃"],
  [/\btrees?\b/i, "🌳"],
  [/\bseeds?\b/i, "🌱"],
  [/\banimals?\b/i, "🐾"],
  [/\bdinosaurs?\b|\bfossils?\b/i, "🦕"],

  // -------------------------------------------------------------------------
  // PHYSICS, ELECTRICITY & MAGNETISM
  // -------------------------------------------------------------------------
  [/\belectromagnets?\b/i, "🧲"],
  [/\bmagnets?\b/i, "🧲"],
  [/\belectricity\b|\belectric\b/i, "⚡"],
  [/\bwires?\b/i, "🔌"],
  [/\bcircuits?\b/i, "🔌"],
  [/\bbatter(?:y|ies)\b/i, "🔋"],
  [/\blight ?bulbs?\b/i, "💡"],
  [/\bcoils?\b/i, "🔁"],
  [/\bmarbles?\b/i, "🔵"],
  [/\bgravity\b/i, "⬇️"],
  [/\batoms?\b|\bmolecules?\b/i, "⚛️"],
  [/\bphotons?\b|\blight rays?\b/i, "✨"],
  [/\btemperatures?\b|\bheat\b/i, "🌡️"],
  [/\bvelocit(?:y|ies)\b|\bspeed\b/i, "🏎️"],
  [/\bvibrations?\b|\bsound waves?\b/i, "🔊"],

  // -------------------------------------------------------------------------
  // ASTRONOMY & EARTH SCIENCE
  // -------------------------------------------------------------------------
  [/\bplanets?\b/i, "🪐"],
  [/\bmoons?\b/i, "🌙"],
  [/\bsun(?:light)?\b/i, "☀️"],
  [/\bstars?\b/i, "⭐"],
  [/\bearth\b|\bglobe\b/i, "🌍"],
  [/\bclouds?\b/i, "☁️"],
  [/\brain\b|\bprecipitation\b/i, "🌧️"],
  [/\boceans?\b|\bwater\b/i, "💧"],
  [/\bvolcano(?:es)?\b/i, "🌋"],
  [/\brocks?\b|\bminerals?\b/i, "🪨"],
  [/\bseasons?\b/i, "🍂"],
  [/\btelescopes?\b/i, "🔭"],

  // -------------------------------------------------------------------------
  // MATHEMATICS & LOGIC
  // -------------------------------------------------------------------------
  [/\bcombinations?\b/i, "🧩"],
  [/\bpuzzles?\b/i, "🧩"],
  [/\bproofs?\b/i, "✅"],
  [/\btheorems?\b/i, "📜"],
  [/\bpatterns?\b/i, "🔁"],
  [/\bgeometric\b|\bshapes?\b/i, "📐"],
  [/\btriangles?\b/i, "🔺"],
  [/\bscales?\b|\bbalanc(?:e|ing)\b/i, "⚖️"],
  [/\bcharts?\b|\bgraphs?\b/i, "📊"],

  // -------------------------------------------------------------------------
  // SCIENTIFIC THINKING & DISCOVERY
  // -------------------------------------------------------------------------
  [/\bhypothes(?:is|es)\b/i, "🔎"],
  [/\bevidences?\b/i, "🔍"],
  [/\bobservations?\b/i, "👀"],
  [/\bexperiments?\b/i, "🧪"],
  [/\bresearch\b/i, "🔬"],
  [/\bdiscover(?:y|ies)\b/i, "🧭"],
  [/\binvestigations?\b/i, "🔍"],
  [/\bquestions?\b/i, "❓"],
  [/\banswers?\b/i, "💡"],
  [/\bideas?\b/i, "💡"],
  [/\btheor(?:y|ies)\b/i, "🧠"],
  [/\bfacts?\b/i, "✅"],
  [/\bclaims?\b|\barguments?\b/i, "💬"],
  [/\breason(?:ing)?\b/i, "🧠"],

  // -------------------------------------------------------------------------
  // MAPS & GEOGRAPHY
  // -------------------------------------------------------------------------
  [/\bmaps?\b/i, "🗺️"],
  [/\bcompass(?:es)?\b|\bdirections?\b/i, "🧭"],
  [/\bcountries?\b|\bcontinents?\b/i, "🌍"],
  [/\bclocks?\b|\btimers?\b/i, "⏱️"],
  [/\bcalendars?\b/i, "📅"]
];

/**
 * Enriches educational text with relevant emojis.
 * Strict rules applied:
 * 1. If text already contains emojis, no additional emojis are added.
 * 2. Maximum of MAX_EMOJIS_PER_TURN (3) emojis per response.
 * 3. Each emoji is added at most ONCE per response (no duplicate emojis).
 * 4. First occurrence only for any matched word (e.g. 'heart' 3 times -> 'heart 🫀' once).
 */
function enrichWithEmojis(text) {
  let out = String(text || "");
  if (!out.trim()) return out;

  out = stripMisplacedMagnets(out);

  // If text already has emojis (e.g. from template or model), do not add more
  if (HAS_EMOJI.test(out)) return out;

  let used = 0;
  const seenEmojis = new Set();

  for (const [pattern, emoji] of RULES) {
    if (used >= MAX_EMOJIS_PER_TURN) break;

    // Never add the same emoji twice in one response
    if (seenEmojis.has(emoji)) continue;

    const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
    let replaced = false;

    out = out.replace(re, (match) => {
      // Only replace the FIRST hit in the entire response
      if (replaced || used >= MAX_EMOJIS_PER_TURN || seenEmojis.has(emoji)) {
        return match;
      }
      replaced = true;
      used += 1;
      seenEmojis.add(emoji);
      return `${match} ${emoji}`;
    });
  }

  return cleanPunctuationAndSpacing(stripMisplacedMagnets(out));
}

function cleanPunctuationAndSpacing(text) {
  return String(text || "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([,.!?:;])/g, "$1")
    .trim();
}

function stripMisplacedMagnets(text) {
  return String(text || "")
    .replace(/🧲/g, (emoji, offset, full) => {
      const nearby = full.slice(Math.max(0, offset - 40), offset + 12);
      return /magnet/i.test(nearby) ? emoji : "";
    })
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([,.!?])/g, "$1");
}

function stripEmojis(text) {
  return String(text || "")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

module.exports = {
  enrichWithEmojis,
  stripEmojis,
  stripMisplacedMagnets,
  RULES,
  MAX_EMOJIS_PER_TURN
};
