"use strict";

const HAS_EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

const RULES = [
  [/\belectromagnets?\b/gi, "🧲"],
  [/\bmagnets?\b/gi, "🧲"],
  [/\belectricity\b/gi, "⚡"],
  [/\bcurrents?\b/gi, "⚡"],
  [/\bwires?\b/gi, "🔌"],
  [/\bcoils?\b/gi, "🔁"],
  [/\bmarbles?\b/gi, "🔵"],
  [/\bbulbs?\b/gi, "💡"],
  [/\bbatter(?:y|ies)\b/gi, "🔋"],
  [/\bswitches?\b/gi, "🔘"],
  [/\bcircuits?\b/gi, "🔌"],
  [/\bmoons?\b/gi, "🌙"],
  [/\bsun\b/gi, "☀️"],
  [/\bearth\b/gi, "🌍"],
  [/\bplanets?\b/gi, "🪐"],
  [/\bstars?\b/gi, "⭐"],
  [/\bhearts?\b/gi, "❤️"],
  [/\blungs?\b/gi, "🫁"],
  [/\bbones?\b/gi, "🦴"],
  [/\bbrains?\b/gi, "🧠"],
  [/\bplants?\b/gi, "🌱"],
  [/\bleaves\b/gi, "🍃"],
  [/\bwater\b/gi, "💧"],
  [/\brain\b/gi, "🌧️"],
  [/\bclouds?\b/gi, "☁️"],
  [/\bheat\b/gi, "🔥"],
  [/\bice\b/gi, "🧊"],
  [/\bforces?\b/gi, "➡️"],
  [/\bgravity\b/gi, "⬇️"],
  [/\benergy\b/gi, "⚡"]
];

function enrichWithEmojis(text) {
  const source = String(text || "");
  if (!source.trim() || HAS_EMOJI.test(source)) return source;
  let used = 0;
  let out = source;
  for (const [pattern, emoji] of RULES) {
    if (used >= 6) break;
    const re = new RegExp(pattern.source, pattern.flags);
    out = out.replace(re, (match) => {
      if (used >= 6) return match;
      used += 1;
      return `${match} ${emoji}`;
    });
  }
  return out;
}

function stripEmojis(text) {
  return String(text || "")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

module.exports = { enrichWithEmojis, stripEmojis };
