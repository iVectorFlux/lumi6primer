"use strict";

function modelText(response) {
  if (!response) return "";
  if (typeof response === "string") return response;
  if (typeof response.content === "string") return response.content;
  if (typeof response.result?.message === "string") return response.result.message;
  return "";
}

function looksLikeJsonBlob(text) {
  const t = String(text || "").trim();
  return t.startsWith("{") && /"(spoken|spokenResponse|check|picture)"\s*:/.test(t);
}

function spokenFromObject(obj) {
  if (!obj || typeof obj !== "object") return "";
  let spoken = String(obj.spoken || obj.spokenResponse || obj.teacherResponse || obj.message || "").trim();
  if (looksLikeJsonBlob(spoken)) {
    try {
      spoken = spokenFromObject(JSON.parse(spoken)) || spoken;
    } catch {}
  }
  const check = String(obj.check || obj.checkQuestion || obj.question || "").trim();
  if (check && !/\?/.test(spoken)) spoken = spoken ? `${spoken} ${check}` : check;
  return spoken.replace(/\s+/g, " ").trim();
}

function extractSpoken(raw) {
  const text = String(raw || "").replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  if (!text) return "";
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object") {
      const spoken = spokenFromObject(parsed);
      if (spoken) return spoken;
    }
  } catch {}
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const spoken = spokenFromObject(JSON.parse(match[0]));
      if (spoken) return spoken;
    } catch {}
  }
  const quoted = text.match(/"(?:spoken|spokenResponse)"\s*:\s*"((?:\\.|[^"\\])*)"/);
  if (quoted) {
    return quoted[1].replace(/\\n/g, " ").replace(/\\"/g, '"').replace(/\s+/g, " ").trim();
  }
  if (looksLikeJsonBlob(text)) return "";
  return text.replace(/\s+/g, " ").trim();
}

function parseProposal(raw) {
  const text = String(raw || "").trim();
  if (!text) return null;
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === "object") {
      return { ...parsed, spoken: spokenFromObject(parsed) || extractSpoken(cleaned) };
    }
  } catch {}
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      return { ...parsed, spoken: spokenFromObject(parsed) || extractSpoken(cleaned) };
    } catch {}
  }
  const spoken = extractSpoken(cleaned);
  return spoken ? { spoken } : { spoken: "" };
}

module.exports = {
  parseProposal,
  modelText,
  extractSpoken,
  spokenFromObject,
  looksLikeJsonBlob
};
