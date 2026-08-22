"use strict";

/**
 * Kid-safety intent. Regex will be wrong sometimes; these helpers exist so a
 * new question, a board, or a sum is never treated as a failed quiz answer.
 */

const NEW_ASK = /^(can you |could you |please )?(how|why|what|who|when|where)\b/i;
const EXPLICIT_SWITCH = /\b(now teach|teach me|i want to learn|explain|instead|what about|look at)\b/i;

function isNewAsk(text, understanding = {}) {
  const raw = String(text || understanding.raw || "").trim();
  if (!raw) return false;
  if (understanding.justAnswer) return true;
  const intent = understanding.intent;
  if (["explain", "question", "homework", "fact", "goal"].includes(intent)) return true;
  if (NEW_ASK.test(raw)) return true;
  if (/\?/.test(raw) && raw.length > 6) return true;
  if (/\b(teach me|i want to learn|look at (the |this )?(board|whiteboard)|is it correct|what('?s| is) the answer)\b/i.test(raw)) {
    return true;
  }
  return false;
}

function looksLikeQuizAnswer(text) {
  const raw = String(text || "").trim();
  if (!raw || raw.length > 80) return false;
  if (NEW_ASK.test(raw) || /\?/.test(raw)) return false;
  if (/\b(teach me|explain|look at|whiteboard)\b/i.test(raw)) return false;
  return true;
}

function shouldGrade({ text, askedBackLast, understanding } = {}) {
  if (!askedBackLast) return false;
  if (isNewAsk(text, understanding)) return false;
  const intent = understanding?.intent;
  if (["question", "explain", "homework", "fact", "goal", "meta", "voice", "drawing"].includes(intent)) {
    return false;
  }
  if (understanding?.pictureComment || understanding?.wantsDraw) return false;
  if (intent === "attempt" || intent === "revision") return true;
  return looksLikeQuizAnswer(text);
}

function explicitTopicSwitch(text) {
  return EXPLICIT_SWITCH.test(String(text || ""));
}

module.exports = {
  isNewAsk,
  looksLikeQuizAnswer,
  shouldGrade,
  explicitTopicSwitch
};
