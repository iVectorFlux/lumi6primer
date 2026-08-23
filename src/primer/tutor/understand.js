"use strict";

const { topicFromText, isWeakTopic, topicsRelated } = require("../topic.js");
const { isPictureComment } = require("./teaching-move.js");
const boardMath = require("../tools/board-math.js");
const { explicitTopicSwitch } = require("./kid-intent.js");

const FACT = /^(what is|what's|who (is|was|invented)|when (was|did)|where is|how (tall|old|high|long|many)|capital of)\b/i;

function refersToBoard(text) {
  return /\b(look at|whiteboard|the board|this whiteboard|the diagram|this diagram|whole diagram|this drawing|what i (have )?(written|drew|drawn)|i have written|written here|everything (here|i wrote|i have written)|whatever i (have )?(written|drew)|on this whiteboard|check (this|my))\b/i.test(String(text || ""));
}

function isVoiceIssue(text) {
  const t = String(text || "").toLowerCase();
  return /\b(awaaz|awaz|voice|audio|sound)\b/.test(t)
    && /\b(nahi|nahin|nahin|not|can't|cannot|no|sunai|aa rahi|aa raha|hear|coming)\b/.test(t)
    || /\b(can't hear|cannot hear|no voice|voice is(n't| not) coming|teri awaaz)\b/i.test(t);
}

/**
 * Heuristic understanding of the child's turn.
 * The LLM may refine this; policy still owns the decision.
 */
function understandLearner(raw, extras = {}) {
  const text = String(raw || "").trim();
  const t = text.toLowerCase();
  const boardImage = extras.boardImage || null;
  const spokenFacts = boardMath.extractFacts(text);
  const mathTopic = spokenFacts[0]
    ? `${spokenFacts[0].a} ${spokenFacts[0].op === "*" ? "×" : spokenFacts[0].op === "/" ? "÷" : spokenFacts[0].op === "-" ? "−" : spokenFacts[0].op} ${spokenFacts[0].b}`.trim()
    : "";
  const askedToLookDirect = refersToBoard(text);
  const voiceIssue = isVoiceIssue(text);

  const drawAsk = /\b((can you |could you |please )?(draw|sketch|illustrate)\b|\b(make|show) (me )?(a )?(diagram|picture)|\bdiagram of\b|\bpicture of\b)/.test(t);
  const drawFollowThrough = /\b(i thought you were drawing|you (said|promised) (you('d| would) )?draw|still no diagram|draw (it|that|something|a ))\b/.test(t);
  const wantsDraw = (drawAsk || drawFollowThrough) && !/\blook at\b/.test(t);
  const boardFollowUp = /^(can you |could you |please )?(tell me|say it|what is it|what('?s| is) the answer|is (that|it|this) (right|correct)|is it correct)[\s.!?]*$/i.test(text)
    || /\b(is (that|it|this) (right|correct)|is it correct|what('?s| is) the answer)\b/i.test(t);
  const askedToLook = askedToLookDirect || (Boolean(extras.lastAskedToLook) && boardFollowUp && !wantsDraw);
  const wantsWrite = /\b((can you |could you |please )?(write|put|fill in)\b|\bwrite (the )?(answer|number|it|seven|\d+)\b)/.test(t);
  const justAnswer = /\b(you tell me|just (answer|tell|explain)|tell me the answer|i don'?t know|can you just answer|don'?t make it complicated|not complicated|answer it|answer me|keep it simple)\b/i.test(t);
  const rejecting = /\b(no no|i don'?t want (about )?this|not (this|that|what i want)|wrong thing)\b/i.test(t);
  const wantsExplain = justAnswer || /\b(explain|teach me about|teach me|tell me about|i want to learn|help me understand|break it down|how can i learn|learn about|curious about|difference between)\b/.test(t)
    || /\b(can you |could you |please )?(teach|explain)\b/.test(t);
  const wantsReason = /\b(how is that possible|how is that|how does that|why is that|why does that|how can that|how does|understand how|why only|why not)\b/.test(t)
    || /^(how|why)\b/.test(t);
  const pushback = /\b(come on|i asked you|just explain|answer me|what are you asking|you're not answering|stop asking|i want you to explain|not what real teaching|just writing|only text|the hell|what the hell|wtf|are you talking about|who asked|i did not ask|i didn't ask|i never asked|you are not able|not able to understand)\b/i.test(t);
  const meta = !voiceIssue && /\b(what can you help|what do you do|who are you|how does this work|what are you for)\b/.test(t);
  const confused = /\b(i don't understand|i do not understand|don't understand|dont understand|huh\??$|i'm confused|i am confused|that doesn't make sense|what do you mean)\b/i.test(t);

  const GREETING = /^(hi|hello|hey|how are you|how do you do|what'?s up|good (morning|afternoon|evening)|how('?s| is) it going|are you there)\b/i;
  const isGreeting = GREETING.test(t) && text.length < 50 && !wantsExplain;

  let intent = "chat";
  if (voiceIssue) {
    intent = "voice";
  } else if (pushback) {
    intent = "pushback";
  } else if (meta) {
    intent = "meta";
  } else if (isGreeting) {
    intent = "greeting";
  } else if (confused) {
    intent = "dont_understand";
  } else if (wantsExplain || /\b(let's learn|what should i learn|start (a )?lesson)\b/.test(t)) {
    intent = wantsExplain ? "explain" : "goal";
  } else if (/\b(homework|this problem|check my work|i got stuck on)\b/.test(t) || (askedToLook && /\b(solve|equals|=|correct|right)\b/.test(t)) || spokenFacts.length > 0) {
    intent = "homework";
  } else if (askedToLook || /\b(i drew|look at my drawing|what did i draw)\b/.test(t)) {
    intent = "drawing";
  } else if (wantsWrite) {
    intent = "attempt";
  } else if (isPictureComment(text)) {
    intent = "chat";
  } else if (extras.askedBackLast && !wantsExplain && !askedToLook && !wantsReason && !/^(teach|what is|how does|who is|where is)\b/i.test(t)) {
    intent = "attempt";
  } else if (/\b(let me try|i think (it'?s|the answer)|maybe it'?s|maybe it is|try again)\b/.test(t) && !wantsExplain) {
    intent = /\btry again|instead\b/.test(t) ? "revision" : "attempt";
  } else if (/\bwhat if\b/.test(t)) {
    intent = "what_if";
  } else if (FACT.test(t) && text.length < 90) {
    intent = "fact";
  } else if (wantsReason || /\?/.test(text) || /^(what|why|how|who|when|where)\b/i.test(t)) {
    intent = "question";
  }

  const confusion = intent === "dont_understand" || /\b(confused|stuck|lost)\b/.test(t);
  const guessed = guessConcept(text);
  const prior = String(extras.concept || "").trim();
  const bareTeach = /^(can you |could you |please )?(teach|explain)( me)?[\s.!?]*$/i.test(t);
  const wrongTopic = /\b(different question|different topic|not what i asked|i asked something else|wrong (topic|question|thing|subject)|i didn't ask that|i did not ask that)\b/i.test(t);
  const isQuestionAsk = wantsExplain || wantsReason || intent === "question" || intent === "explain" || /^(how|why|what|who|when|where|tell me)\b/i.test(t);
  const explicitSwitch = explicitTopicSwitch(text) || wrongTopic || (Boolean(guessed) && isQuestionAsk && !topicsRelated(prior, guessed));

  const namedTopic = Boolean(guessed) && !isWeakTopic(guessed) && (
    !prior
    || Boolean(mathTopic)
    || explicitSwitch
    || isQuestionAsk
    || !topicsRelated(prior, guessed)
  );

  const keepPrior = Boolean(prior) && !isGreeting && !wrongTopic && !explicitSwitch && !namedTopic && (
    intent === "attempt"
    || intent === "revision"
    || (wantsDraw && !wantsExplain)
    || wantsWrite
    || justAnswer
    || voiceIssue
    || confusion
    || intent === "dont_understand"
    || bareTeach
  );

  const concept = mathTopic
    ? mathTopic
    : (namedTopic ? guessed : (wrongTopic && !guessed ? "" : (keepPrior ? prior : (isGreeting ? "" : (guessed || prior || "emerging")))));

  return {
    raw: text,
    intent,
    concept,
    affect: confusion ? "confused" : /\b(wow|cool|wait)\b/.test(t) ? "curious" : "neutral",
    confusion,
    refersToBoard: askedToLook,
    askedToLook,
    wantsDraw,
    wantsWrite,
    wantsExplain: wantsExplain || bareTeach,
    justAnswer,
    wantsReason,
    pushback,
    pictureComment: isPictureComment(text),
    voiceIssue,
    wantsSimulation: /\bsimulate\b/.test(t),
    hasBoardImage: Boolean(boardImage)
  };
}

function guessConcept(text) {
  return topicFromText(text);
}

function historyFromTurns(turns) {
  return (Array.isArray(turns) ? turns : [])
    .filter((turn) => turn && turn.spoken_text)
    .map((turn) => ({
      role: turn.role === "child" ? "student" : "teacher",
      content: String(turn.spoken_text)
    }));
}

module.exports = { understandLearner, refersToBoard, historyFromTurns, guessConcept, isVoiceIssue };
