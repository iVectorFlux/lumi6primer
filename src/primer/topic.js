"use strict";

const STOP = new Set([
  "a", "an", "the", "and", "or", "of", "to", "for", "with", "on", "in", "at", "by",
  "is", "are", "was", "were", "be", "being", "been", "do", "does", "did", "can",
  "could", "would", "should", "will", "please", "you", "me", "my", "i", "we",
  "teach", "explain", "learn", "tell", "show", "help", "understand", "want",
  "about", "what", "whats", "what's", "how", "why", "who", "when", "where",
  "simply", "maybe", "something", "whiteboard", "drawing", "picture", "diagram",
  "theory", "question", "answer", "just", "like", "also", "well", "this", "that",
  "your", "their", "them", "from", "into", "over", "under", "draw", "sketch",
  "illustrate", "sorry", "hell", "talking", "mean", "really", "thing", "stuff",
  "even", "still", "very", "dont", "don't", "didn't", "cannot", "gonna", "wanna",
  "work", "works", "working", "sale", "teri", "mere", "ko", "nahi", "nahin",
  "awaaz", "awaz", "hai", "rahi", "raha", "clue", "shit", "talking", "okay", "ok",
  "yeah", "yes", "no", "huh", "wait", "please", "difference", "between",
  "hi", "hii", "hiii", "hey", "hello", "hlo", "namaste", "yo", "greetings",
  "thanks", "thank", "lumi6", "lumi", "primer", "today", "now",
  "not", "isnt", "isn't", "arent", "aren't", "doesnt", "doesn't", "wasnt",
  "are", "am", "doing", "done", "saying", "said", "asking", "asked", "ask",
  "actually", "supposed", "again", "anything", "everything", "nothing", "damn",
  "instead", "rather", "prefer", "start", "starting", "begin",
  "only", "get", "way", "don", "man", "tired", "complicated", "ready",
  "lets", "let's", "gonna", "wanna", "able", "trying", "become", "better",
  "pretty", "difficult", "hard", "easy", "simple", "seat", "know", "sure", "true",
  "false", "tap", "pipe", "travel", "bag", "circle", "flowing", "flow", "open", "closed",
  "think", "thought", "guess", "say", "saying", "said", "look", "looking", "see",
  "studying", "study", "grade", "class", "simplified", "simplify", "so", "if",
  "different", "another", "other", "something", "else", "topic", "subject",
  "continue", "continued", "continuing", "keep", "going", "resume", "resuming", "proceed", "next", "more"
]);

const WEAK = /^(this|that|it|idea|sorry|hell|talking|mean|teach me|can you teach me|what do you mean|pretty difficult|so if|difficult|hard|easy|simple|different|another|other|else|continue|please continue|keep going|go on|resume|next)$/i;

// Requests about HOW to teach are not subjects. Treating "first principles" or
// "step by step" as the topic makes the tutor abandon the real lesson.
const META_REQUEST = /^(from )?(first principles?|deep basics?|step by step|simple(r)? words?|easy words?|kid words?|basics?|more detail|detail|examples?|example|slowly|slower|faster|short(er)?|again|in hindi|in english|hindi|english|4th grade|grade 4|grade \d+|\d+th grade)$/i;

// Words from our own prompt scaffolding. A model that echoes one of these has
// not found a topic, it has read our instructions back to us.
const SCAFFOLD = /^(evidence|curiosity|question|attempt|misconception|insight|persistence|self[_ ]correction|revision|phase|role|action|spoken|picture|interpretation|reference notes?|memory|board|canvas|tutor|learner|lesson|topic|concept|reflection)$/i;

/**
 * Pull the subject of a child's question. Not a syllabus.
 * "teach me about ocean currents" → "ocean currents"
 * "what is magnetism" → "magnetism"
 * "sorry I don't understand" → "" (keep the previous topic)
 */
function topicFromText(text) {
  const raw = String(text || "").trim();
  if (!raw) return "";

  // Strip conversational prefixes like "no i asked", "but i asked", "i want to know", "hey can you tell me"
  let clean = raw
    .replace(/^(no,? |nope,? |nah,? |but |actually,? |wait,? |hey,? |look,? )+/gi, "")
    .replace(/^i (just |already |never |did not |didn't )?(asked|said|want to know|mean)\s*(about|that|how|what|why)?\s*/gi, "")
    .replace(/^(can you |could you |please |tell me )+/gi, "")
    .trim();

  // 1. Explicit request / question patterns: "teach me about X", "what is X", "how does X work", "how does electron move inside atom"
  const explicitMatch = clean.match(/\b(?:teach(?:\s+me)?(?:\s+about)?|explain(?:\s+me)?|learn(?:\s+about)?|tell\s+me\s+about|what\s+(?:is|are|about)|how\s+(?:does|do|can|is)|why\s+(?:does|do|is|are)|who\s+(?:is|was)|where\s+(?:is|do))\s+([a-zA-Z0-9\s\-]+)/i);
  if (explicitMatch && explicitMatch[1]) {
    const candidate = explicitMatch[1].replace(/[?!.,;:()'"]/g, " ").replace(/\s+/g, " ").trim();
    const candidateWords = candidate
      .split(" ")
      .map((w) => w.toLowerCase())
      .filter((w) => w.length > 1 && !STOP.has(w) && !WEAK.test(w));
    if (candidateWords.length > 0) {
      const phrase = candidateWords.slice(0, 4).join(" ").trim();
      if (!isWeakTopic(phrase)) return phrase.slice(0, 64);
    }
  }

  // 2. Short queries (<= 6 total words, e.g. "electrons in atom", "photosynthesis", "black holes")
  const totalWords = clean.split(/\s+/).filter(Boolean);
  if (totalWords.length <= 6) {
    const candidateWords = totalWords
      .map((w) => w.toLowerCase().replace(/[^a-z0-9\-]/g, ""))
      .filter((w) => w.length > 1 && !STOP.has(w) && !WEAK.test(w));
    if (candidateWords.length > 0) {
      const phrase = candidateWords.slice(0, 4).join(" ").trim();
      if (!isWeakTopic(phrase)) return phrase.slice(0, 64);
    }
  }

  return "";
}

function spokenCoversTopic(spoken, topic) {
  const hay = String(spoken || "").toLowerCase();
  const words = String(topic || "")
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP.has(w));
  if (!words.length) return true;
  return words.some((w) => hay.includes(w));
}

/**
 * True when the reply mentions the topic only to push it away, as in
 * "This is the water cycle, not relativity". A mention like that passes
 * spokenCoversTopic while the lesson is about something nobody asked for.
 */
function deniesTopic(spoken, topic) {
  const hay = String(spoken || "").toLowerCase();
  const words = String(topic || "")
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP.has(w));
  if (!words.length || !hay) return false;
  return words.some((w) => {
    const safe = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\bnot\\s+(?:the\\s+|a\\s+|about\\s+)?${safe}\\b`).test(hay)
      || new RegExp(`\\b${safe}\\b[^.?!]{0,24}\\bis not what\\b`).test(hay);
  });
}

function isWeakTopic(topic) {
  const t = String(topic || "").trim().toLowerCase();
  if (!t) return true;
  if (t.length < 2) return true;
  if (WEAK.test(t)) return true;
  if (META_REQUEST.test(t)) return true;
  if (SCAFFOLD.test(t)) return true;
  if (/\b(sorry|hell|wtf|talking about|what do you mean|can you teach me)\b/i.test(t)) return true;
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length > 6) return true;
  if (words.every((w) => STOP.has(w))) return true;
  if (/^(only|get|way|don|ask)\b/.test(t)) return true;
  return false;
}

function topicsRelated(a, b) {
  const words = (text) => new Set(
    String(text || "")
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOP.has(w))
  );
  const left = words(a);
  if (!left.size) return false;
  for (const word of words(b)) if (left.has(word)) return true;
  return false;
}

function searchQueriesForTopic(topic) {
  const phrase = String(topic || "").trim();
  if (!phrase) return [];
  const words = phrase.split(/\s+/).filter(Boolean);
  const queries = [phrase];
  if (words.length > 2) queries.push(words.slice(-2).join(" "));
  if (words.length > 1) queries.push(words[words.length - 1]);
  return [...new Set(queries)];
}

module.exports = { topicFromText, searchQueriesForTopic, isWeakTopic, spokenCoversTopic, deniesTopic, topicsRelated, STOP };
