"use strict";

const { isWeakTopic } = require("../topic.js");
const { extractSpoken, looksLikeJsonBlob } = require("./proposal.js");
const { isNewAsk } = require("./kid-intent.js");

const DEPENDENCY = /you (need|depend on) me|only i can (help|teach)|don't think (without|on your own)|i'll always be here to think for you/i;
const BOARD_NARRATION = /whiteboard (is blank|shows|says|has)|the board (shows|says|has)|photo of the whiteboard|no handwriting visible|board par|halki grid/i;
const CHEESE = /^(great question|you're getting it|what should we explore next)/i;
const CANNED = /here'?s a situation where|the everyday assumption|a relationship, not a fact|which assumption|usual picture is missing a relationship|strange part stops being magic|here'?s the heart of/i;
const STALL = /let's take .+ slowly|what part feels hardest|i'm here\. what do you want to figure out|hey\. what do you want to learn\?|let's look at .+ with a simple example|hmm,? let me think about that differently|tell me more about what you're trying to understand|we were talking about/i;
const PHRASE_COACH = /^(say[,:]?\s*["“]|try saying|you can also say|a better way to (ask|say)|you could say|for example,? say)/i;

// Apologising for a mix-up and then teaching the mixed-up topic anyway is a
// failed turn, not a recovery. Regenerate instead of speaking it.
const WRONG_TOPIC_APOLOGY = /\bi (?:messed up|mixed (?:it|them|that) up|got (?:it|them|that) mixed up|talked about the wrong|answered the wrong|explained the wrong|said the wrong)\b|\byou did not ask about\b|\bthat was the wrong (?:topic|thing|answer)\b/i;

function isCannedSpeech(text) {
  const t = String(text || "");
  return CANNED.test(t) || STALL.test(t) || WRONG_TOPIC_APOLOGY.test(t);
}

class ResponsePolicy {
  apply(spoken, decision, understanding) {
    let text = String(spoken || "").replace(/\s+/g, " ").trim();
    if (!text || looksLikeJsonBlob(text)) {
      text = extractSpoken(text) || this._fallback(decision, understanding);
    }
    if (!text || isCannedSpeech(text)) text = this._fallback(decision, understanding);

    text = this._stripMarkdown(text);
    text = this._stripBoardNarration(text);
    text = this._stripPhraseCoaching(text);
    if (!text) text = this._fallback(decision, understanding);
    text = text.replace(/^sorry[,.]?\s*/i, "").trim();
    text = text.replace(CHEESE, "").trim();
    if (isCannedSpeech(text)) {
      text = this._fallback(decision, understanding);
    }

    if (DEPENDENCY.test(text)) {
      text = this._stripDependency(text);
    }

    const hints = decision?.spokenHints || {};
    text = this._limitSentences(text, hints.maxSentences || 5);

    if (hints.mustAskQuestion && !/\?/.test(text)) {
      text = `${text} ${this._questionFor(decision, understanding)}`.trim();
    }

    if (hints.mustReinterpret && understanding?.intent === "dont_understand") {
      text = this._ensureReinterpretation(text, understanding);
    }

    if (hints.becomeIsNotMoral) {
      text = this._stripMoralLecture(text);
    }

    if (hints.englishUnlessAsked && this._looksLikeUnsolicitedHindi(text, understanding)) {
      text = this._fallback(decision, understanding);
    }

    if (this._isPhaseSlogan(text) && (understanding?.intent !== "insight" || decision?.action !== "reflect")) {
      text = this._fallback(decision, understanding);
    }

    if (this._shouldNotGrade(understanding) && /^(not yet|right|almost)[,.]?\s+/i.test(text)) {
      text = text.replace(/^(not yet|right|almost)[,.]?\s+/i, "").replace(/^but\s+/i, "").trim();
    }

    return text.replace(/\s+/g, " ").replace(/\s+\./g, ".").trim();
  }

  _shouldNotGrade(understanding) {
    return isNewAsk(understanding?.raw, understanding || {});
  }

  _stripMarkdown(text) {
    return String(text || "")
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```$/i, "")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1")
      .replace(/(^|[^\w])\*([^*\n]+)\*/g, "$1$2")
      .replace(/(^|[^\w])_([^_\n]+)_/g, "$1$2")
      .replace(/~~([^~]+)~~/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/`+/g, "")
      .replace(/\*/g, "")
      .trim();
  }

  _isPhaseSlogan(text) {
    return /something in your thinking just shifted|try it again, but change one assumption|what do you believe now that you didn't|here'?s a situation where|here'?s the heart of/i.test(text);
  }

  _topic(understanding) {
    const topic = String(understanding?.concept || "").trim();
    if (!topic || isWeakTopic(topic)) return "";
    return topic;
  }

  _questionFor(decision, understanding) {
    const topic = this._topic(understanding);
    if (understanding?.voiceIssue) return topic ? `Want me to keep going with ${topic}?` : "What do you want to learn?";
    if (decision?.action === "diagnose") return "What do you think happens next, and why?";
    if (understanding?.refersToBoard) return "What happens if we change one of YOUR numbers?";
    if (decision?.role === "editor") return "What were you trying to do?";
    if (decision?.role === "advisor" && !topic) return "What do you want to learn?";
    if (understanding?.intent === "drawing") return "What did you want this drawing to show?";
    return "What do you think happens next?";
  }

  _ensureReinterpretation(text, understanding) {
    const topic = this._topic(understanding) || "this";
    const rest = String(text || "").replace(/^[.\s]+/, "").trim();
    if (/another way|different way|try this|picture it like|imagine|kid words|simple/i.test(rest)) return rest;
    return rest
      ? `Let me try a simpler way. ${rest}`
      : `No worries. Let me say ${topic} in simpler kid words. Which word felt weird?`;
  }

  _stripPhraseCoaching(text) {
    return String(text || "")
      .split(/(?<=[.!?])\s+/)
      .filter((s) => {
        const t = s.trim();
        return t && !PHRASE_COACH.test(t) && !/\byou can also say\b/i.test(t) && !/\btry saying\b/i.test(t);
      })
      .join(" ")
      .trim();
  }

  _fallback(decision, understanding) {
    const topic = this._topic(understanding);
    if (understanding?.voiceIssue) {
      return topic
        ? `Got it — if the voice is missing, read this. Let's keep going with ${topic} in simple words.`
        : "If you cannot hear the voice, read the chat. What do you want to learn?";
    }
    if (understanding?.askedToLook) {
      return "I'm looking at what you wrote. Let's go through your marks, using your numbers. What should we start with?";
    }
    if (understanding?.intent === "meta") {
      return "I can help you learn something, check a problem, or look at what you drew. What do you want to try?";
    }
    if (understanding?.intent === "dont_understand" || understanding?.confusion) {
      return topic
        ? `No worries. Forget the fancy words. ${topic} in kid words is just a way to talk about something you already see in real life. Want one tiny example?`
        : "No worries. Say the thing you wanted to learn, in your own words.";
    }
    if (understanding?.justAnswer) {
      const aboutWater = /water|evapor|vapor|cloud|rain|puddle/i.test(`${topic} ${understanding.raw || ""}`);
      if (aboutWater) {
        return "Water can turn into invisible air when the Sun warms it, because water bits are loose enough to fly up. Your body and a plant hold most of their water inside, so you do not vanish into the sky. A little water leaves you when you sweat, but you stay you.";
      }
      return topic
        ? `Here is the simple reason for ${topic}, in kid words, not as a quiz.`
        : "Okay. I will answer in short kid words, not with another question.";
    }
    if (understanding?.pushback || understanding?.wantsReason || understanding?.wantsExplain || decision?.action === "explain") {
      return topic
        ? `Yes — ${topic}. Kid version first: I will say what it is in one sentence, then a real-life example that belongs to ${topic}. What is the first thing you already know about it?`
        : "Yes. Tell me the topic in a few words and I will explain it simply.";
    }
    const phase = decision?.phase || "think";
    if (phase === "story") {
      return topic
        ? `Okay — ${topic}. I will explain it in short kid sentences. Ready for the first idea?`
        : "Hey. What do you want to learn?";
    }
    if (phase === "learn") {
      return topic
        ? `Let's look at ${topic}. I will use one everyday example, then a tiny check question. Ready?`
        : "What do you want to learn? Say it in a few words.";
    }
    if (phase === "think_again") return "Want to try that again with a slightly different example?";
    if (phase === "become") return "You just saw that a new way. What changed in your head?";
    return topic
      ? `Let's keep going with ${topic}. What part should I say more slowly?`
      : "I'm here. What do you want to figure out?";
  }

  _stripBoardNarration(text) {
    return text
      .split(/(?<=[.!?])\s+/)
      .filter((s) => s.trim() && !BOARD_NARRATION.test(s))
      .join(" ")
      .trim();
  }

  _stripDependency(text) {
    return text
      .split(/(?<=[.!?])\s+/)
      .filter((s) => !DEPENDENCY.test(s))
      .join(" ")
      .trim();
  }

  _stripMoralLecture(text) {
    return text
      .split(/(?<=[.!?])\s+/)
      .filter((s) => !/be a good|always be kind|the moral is|you should always/i.test(s))
      .join(" ")
      .trim();
  }

  _limitSentences(text, max) {
    const parts = text.split(/(?<=[.!?])\s+/).filter(Boolean);
    if (parts.length <= max) return text;
    return parts.slice(0, max).join(" ").trim();
  }

  _looksLikeUnsolicitedHindi(text, understanding) {
    const asked = /hindi|हिंदी|hinglish/i.test(String(understanding?.raw || ""));
    if (asked) return false;
    const devanagari = /[\u0900-\u097F]/.test(text);
    const hinglish = /\b(theek|acha|accha|hai na|kya|samajh|batao)\b/i.test(text);
    return devanagari || hinglish;
  }
}

module.exports = ResponsePolicy;
module.exports.isCannedSpeech = isCannedSpeech;
