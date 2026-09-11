"use strict";

const HAS_EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

// One emoji per object word, first hit only. Avoid everyday words like "current" or "energy".
const RULES = [
  [/\belectromagnets?\b/i, "🧲"],
  [/\bmagnets?\b/i, "🧲"],
  [/\belectricity\b/i, "⚡"],
  [/\bwires?\b/i, "🔌"],
  [/\bcoils?\b/i, "🔁"],
  [/\bmarbles?\b/i, "🔵"],
  [/\blight ?bulbs?\b/i, "💡"],
  [/\bbatter(?:y|ies)\b/i, "🔋"],
  [/\bcircuits?\b/i, "🔌"],
  [/\bmoons?\b/i, "🌙"],
  [/\bplanets?\b/i, "🪐"],
  [/\blungs?\b/i, "🫁"],
  [/\bbones?\b/i, "🦴"],
  [/\bbrains?\b/i, "🧠"],
  [/\bclouds?\b/i, "☁️"],
  [/\bgravity\b/i, "⬇️"]
];

function enrichWithEmojis(text) {
  let out = String(text || "");
  if (!out.trim()) return out;
  out = stripMisplacedMagnets(out);
  if (HAS_EMOJI.test(out)) return out;
  let used = 0;
  const seen = new Set();
  for (const [pattern, emoji] of RULES) {
    if (used >= 3) break;
    if (seen.has(emoji) && emoji === "🧲") continue;
    const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
    let replaced = false;
    out = out.replace(re, (match) => {
      if (replaced || used >= 3) return match;
      replaced = true;
      used += 1;
      seen.add(emoji);
      return `${match} ${emoji}`;
    });
  }
  return stripMisplacedMagnets(out);
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

module.exports = { enrichWithEmojis, stripEmojis, stripMisplacedMagnets };
