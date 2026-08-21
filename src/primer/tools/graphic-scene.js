"use strict";

const {
  normalize,
  isPictureComment,
  isAck,
  isDetailAsk
} = require("../tutor/teaching-move.js");

const STOP = new Set("the a an of to in on and or for is it how does what why me about please can you teach explain tell this that with from into".split(" "));

function tokens(text) {
  return normalize(text).split(" ").filter((word) => word.length > 2 && !STOP.has(word));
}

function scenesMatch(a, b) {
  const left = normalize(a);
  const right = normalize(b);
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.includes(right) || right.includes(left)) {
    const ratio = Math.min(left.length, right.length) / Math.max(left.length, right.length);
    if (ratio > 0.72) return true;
  }
  const setA = new Set(tokens(left));
  const setB = new Set(tokens(right));
  if (!setA.size || !setB.size) return false;
  let overlap = 0;
  for (const word of setA) {
    if (setB.has(word)) overlap += 1;
  }
  return overlap / new Set([...setA, ...setB]).size >= 0.72;
}

function sceneForTurn({ concept, childText }) {
  const text = String(childText || "").replace(/\s+/g, " ").trim();
  if (isDetailAsk(text)) return normalize(text).slice(0, 96);
  return normalize(concept || text).slice(0, 72);
}

const { isNewAsk } = require("../tutor/kid-intent.js");

function shouldGenerateGraphic(input = {}) {
  const childText = String(input.childText || "");
  const lastScene = String(input.lastScene || "");
  const scene = sceneForTurn({
    concept: input.concept,
    childText
  });

  if ((input.lookingAtBoard || input.junkSpeech || input.wantsWrite || input.intent === "homework") && !input.wantsDraw) {
    return { generate: false, scene: lastScene || scene, kind: "none", reason: input.lookingAtBoard ? "looking-at-board" : (input.intent === "homework" ? "homework" : (input.wantsWrite ? "write" : "junk")) };
  }
  if (isPictureComment(childText) || isAck(childText)) {
    return { generate: false, scene: lastScene || scene, kind: "none", reason: "ack" };
  }

  if (input.wantsDraw) {
    return { generate: true, scene: scene || lastScene || "picture", kind: lastScene ? "detail" : "overview" };
  }

  const answering = Boolean(input.askedBackLast)
    && !isNewAsk(childText, input)
    && !input.wantsDraw
    && !isDetailAsk(childText);
  if (answering) {
    return { generate: false, scene: lastScene || scene, kind: "none", reason: "answer" };
  }

  const teachNow = Boolean(
    input.wantsExplain
    || input.wantsReason
    || input.intent === "explain"
    || input.intent === "question"
  );
  const topicChanged = Boolean(scene && lastScene && !scenesMatch(scene, lastScene));
  if (teachNow && (!lastScene || topicChanged)) {
    return {
      generate: true,
      scene: normalize(input.concept || scene || "picture").slice(0, 72),
      kind: "overview"
    };
  }

  const deeper = isDetailAsk(childText);
  if (deeper && topicChanged) {
    return { generate: true, scene, kind: "detail" };
  }
  return { generate: false, scene: lastScene || scene, kind: "none", reason: "same-scene" };
}

module.exports = {
  shouldGenerateGraphic,
  sceneForTurn,
  scenesMatch,
  isDetailAsk
};
