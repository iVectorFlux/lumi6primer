"use strict";

function cleanChoiceText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[,;:\s]+or\.?$/i, "")
    .replace(/^[.,;:\s]+/, "")
    .replace(/[.;]+$/, "")
    .trim();
}

function extractSpokenParts(text) {
  let raw = String(text || "").replace(/\s+/g, " ").trim();
  const choices = [];
  let blockStart = raw.search(/\(\s*[aA]\s*\)/);
  if (blockStart < 0) blockStart = raw.search(/(?:^|\s)[aA][).]\s+\S/);

  if (blockStart >= 0) {
    const block = raw.slice(blockStart);
    const re = /\(\s*([a-c])\s*\)\s*([^]+?)(?=\s*\(\s*[a-c]\s*\)|$)/gi;
    let match;
    while ((match = re.exec(block))) {
      const choice = cleanChoiceText(match[2]);
      if (choice) choices.push({ letter: match[1].toLowerCase(), text: choice });
    }
    if (choices.length >= 2) {
      raw = raw.slice(0, blockStart).replace(/\s+/g, " ").trim();
    } else {
      choices.length = 0;
    }
  }

  const sentences = raw.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  let question = "";
  const teaching = [];
  for (const sentence of sentences) {
    const isQuestion = sentence.endsWith("?")
      || /^(what|how|why|can you|where|do you think|imagine|can you guess)\b/i.test(sentence);
    if (isQuestion) question = sentence;
    else teaching.push(sentence);
  }

  const speech = dedupeSentences([...teaching, question].filter(Boolean).join(" "));
  return {
    teaching: teaching.join(" "),
    question,
    choices,
    speech
  };
}

function dedupeSentences(text) {
  const parts = String(text || "").replace(/\s+/g, " ").trim().split(/(?<=[.!?])\s+/).filter(Boolean);
  const out = [];
  for (const part of parts) {
    const key = part.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const prev = (out[out.length - 1] || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (!key || key === prev) continue;
    out.push(part);
  }
  return out.join(" ");
}

function speechOnly(text) {
  return extractSpokenParts(text).speech || dedupeSentences(text);
}

function dedupeSpokenKeepChoices(text) {
  const raw = String(text || "").replace(/\s+/g, " ").trim();
  const idx = raw.search(/\(\s*a\s*\)/i);
  if (idx < 0) return dedupeSentences(raw);
  return `${dedupeSentences(raw.slice(0, idx))} ${raw.slice(idx)}`.replace(/\s+/g, " ").trim();
}

module.exports = { extractSpokenParts, speechOnly, dedupeSentences, dedupeSpokenKeepChoices, cleanChoiceText };
