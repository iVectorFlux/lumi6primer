"use strict";

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
      const choice = String(match[2] || "").replace(/\s+/g, " ").trim().replace(/[.;]+$/, "");
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

  const speech = [...teaching, question].filter(Boolean).join(" ");
  return {
    teaching: teaching.join(" "),
    question,
    choices,
    speech
  };
}

function speechOnly(text) {
  return extractSpokenParts(text).speech || String(text || "").trim();
}

module.exports = { extractSpokenParts, speechOnly };
