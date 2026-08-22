"use strict";

const STOP = new Set("the a an of to in on and or for is it how does what why me about please can you teach explain tell this that with from into called name process".split(" "));
const ACK = /^(ok|okay|yes|yeah|yep|yup|sure|hmm|mhm|uh huh|right|got it|cool|nice|great|thanks|thank you|i see)\.?$/i;
const PICTURE_COMMENT = /\b((this|that|it) (one )?(looks|looking) good|looks good|looking good|nice (one|picture|drawing|image)|cool (picture|drawing|image)|i like (this|the|that) (one|picture|drawing|image)|great (picture|drawing|image|one)|this one looks)\b/i;
const CLOSED_QUIZ = /\b(what is (the )?(name of )?(this |that |the )?(process|step)?|what (is|do we call) (this|that|it) called|what is this (process |step )?called|what do we call (this|that|it))\b/i;
const DETAIL_ASK = /\b(how|why|what happens|turn into|turns into|become|inside|next|then|after that|evaporat|conden|precipit|rain|cloud|vapor|steam|melt|freeze|pump|oxygen|photosynth|root|leaf|cell|close[- ]up|zoom in)\b/i;

function normalize(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function tokens(text) {
  return normalize(text).split(" ").filter((word) => word.length > 2 && !STOP.has(word));
}

function lastQuestion(text) {
  const raw = String(text || "").replace(/\s+/g, " ").trim();
  if (!raw) return "";
  const bits = raw.match(/[^.!?]*\?/g) || [];
  if (!bits.length) return "";
  return bits[bits.length - 1].trim();
}

function questionsMatch(a, b) {
  const left = normalize(a).replace(/\?$/g, "");
  const right = normalize(b).replace(/\?$/g, "");
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.includes(right) || right.includes(left)) {
    const ratio = Math.min(left.length, right.length) / Math.max(left.length, right.length);
    if (ratio > 0.62) return true;
  }
  const setA = new Set(tokens(left));
  const setB = new Set(tokens(right));
  if (!setA.size || !setB.size) return false;
  let overlap = 0;
  for (const word of setA) {
    if (setB.has(word)) overlap += 1;
  }
  return overlap / new Set([...setA, ...setB]).size >= 0.55;
}

function isPictureComment(text) {
  return PICTURE_COMMENT.test(String(text || "").trim());
}

function isAck(text) {
  return ACK.test(String(text || "").trim());
}

function isClosedQuiz(text) {
  return CLOSED_QUIZ.test(String(text || ""));
}

function isDetailAsk(text) {
  const raw = String(text || "").replace(/\s+/g, " ").trim();
  if (raw.length < 12) return false;
  return DETAIL_ASK.test(raw);
}

function replaceLastQuestion(spoken, nextQuestion) {
  const current = lastQuestion(spoken);
  if (!current) return `${String(spoken || "").replace(/\s+/g, " ").trim()} ${nextQuestion}`.trim();
  return String(spoken || "").replace(current, nextQuestion).replace(/\s+/g, " ").trim();
}

function advanceQuestion() {
  const options = [
    "Can you picture what happens next when that occurs?",
    "Have you ever noticed something like this around you?",
    "What do you imagine happens next in this story?",
    "Can you guess where that leads next?"
  ];
  return options[Math.floor(Math.random() * options.length)];
}

const { isNewAsk, shouldGrade } = require("./kid-intent.js");

function classifyReply({ childText, askedBackLast, wantsExplain, wantsReason, intent, askedToLook } = {}) {
  const text = String(childText || "").trim();
  if (isPictureComment(text)) return "picture_comment";
  const understanding = { raw: text, wantsExplain, wantsReason, intent, askedToLook };
  if (isNewAsk(text, understanding) || wantsExplain || intent === "explain") return "new_lesson";
  if (wantsReason || intent === "question" || (isDetailAsk(text) && text.length >= 18)) return "go_deeper";
  if (shouldGrade({ text, askedBackLast, understanding })) return "answer";
  return "continue";
}

function preventRepeatQuestion(spoken, lastCheckQuestion, sameQuestionStreak = 0) {
  let text = String(spoken || "").replace(/\s+/g, " ").trim();
  const asked = lastQuestion(text);
  const repeat = Boolean(asked && lastCheckQuestion && questionsMatch(asked, lastCheckQuestion));
  const closed = isClosedQuiz(text);
  if ((repeat || (closed && sameQuestionStreak >= 1)) && asked) {
    text = replaceLastQuestion(text, advanceQuestion());
  } else if (closed && !lastCheckQuestion) {
    text = replaceLastQuestion(text, "Have you ever seen something like this happen around you?");
  }
  return text;
}

module.exports = {
  normalize,
  lastQuestion,
  questionsMatch,
  isPictureComment,
  isAck,
  isClosedQuiz,
  isDetailAsk,
  classifyReply,
  preventRepeatQuestion,
  advanceQuestion
};
