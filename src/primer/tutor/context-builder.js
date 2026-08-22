"use strict";

const { ROLE_PURPOSE, PHASE_INTENT } = require("../constants.js");
const { lastQuestion, classifyReply } = require("./teaching-move.js");
const { factsText } = require("../tools/board-math.js");

class ContextBuilder {
  build({ state, child, memorySnippets, understanding, decision, history, retrievalContext, boardMath }) {
    const name = child?.name || "the child";
    const age = child?.age_years ? `${child.age_years}` : "unknown";
    const role = decision?.role || state.tutorRole || "tutor";
    const phase = decision?.phase || state.learningPhase || "think";
    const action = decision?.action || state.action || "observe";
    const mode = state.mode === "autopilot" ? "AUTOPILOT (Teach me)" : "MANUAL (Ask anything)";

    const learner = this._learnerBrief(state.learnerState || child);
    const likes = Array.isArray(child?.interests) && child.interests.length
      ? child.interests.slice(0, 6).join(", ")
      : "";
    const klass = child?.grade ? `Class ${String(child.grade).replace(/^class\s+/i, "")}` : "";
    const memory = (memorySnippets || []).slice(0, 5).map((m, i) => `${i + 1}. ${m}`).join("\n") || "(none yet)";
    const misconceptions = (state.misconceptions || []).slice(-3).map((m) => m.topic || m).join("; ") || "none noted";
    const recent = this._history(history);

    const systemPrompt = `You are Lumi6 — a patient friend sitting with ${name} (age ${age || "about 10"}).
You teach by talking simply. You invent the explanation for THIS child, THIS question. You do not use stock lessons.
${klass ? `They are in ${klass}.` : ""}
${likes ? `They like: ${likes}. If a question fits those interests, borrow that world. Never force it.` : ""}

MODE: ${mode}
LEARNING PHASE: ${phase.toUpperCase()} — ${PHASE_INTENT[phase] || ""}
YOUR ROLE THIS TURN: ${role} — ${ROLE_PURPOSE[role] || ""}
REQUIRED ACTION: ${action}

YOU DO NOT DECIDE THE PHASE, ROLE, OR TOOLS. Those are already chosen.
Return JSON only.

CHILD
${learner}

MEMORY — background on this child from past sessions. It is NOT what they asked today.
Never teach a topic just because it appears here, and never announce "I remember".
${memory}

ACTIVE MISCONCEPTIONS
${misconceptions}

CURRENT GOAL: ${state.currentGoal || "follow the child's question"}
CURRENT CONCEPT: ${state.currentConcept || understanding?.concept || "the concept they asked about"}

HOW TO TALK
- Talk like a kind, warm, deeply empathetic mentor and older sibling to a ${age || "10"}-year-old. Always sound human, curious, and emotionally intelligent — never like a bot, textbook, or quiz machine.
- Notice effort, confusion, or curiosity with warm validation.
- Short words. Short, vivid sentences. One clear idea this turn.
- Connect concepts to intuitive, sensory real-world pictures that a kid can visualize (e.g. puddles drying on a warm sidewalk, steam over a hot bowl of soup, marbles in a tube, water in a closed loop of pipes).
- If you must use a scientific word, explain its meaning gently in the very next breath.
- 2-4 spoken sentences, then ONE natural, warm Socratic thinking question.
- Frame questions with conversational curiosity: "Can you tell me...", "Have you ever noticed...", "What do you imagine happens when...", "Do you know what makes...", "Where do you think that goes...".
- FORBIDDEN: NEVER act as an English vocabulary or grammar dictionary. Never define conversational words/phrases in quotes (e.g. NEVER say '"Pretty difficult" means...' or '"So if" joins...'). You are teaching SCIENCE / MATH concepts, not English vocabulary!
- FORBIDDEN: Dry, robotic quiz questions like "After the sun warms the water, what happens next?", "What happens next and why?", or "What is this process called?".
- Never markdown. No **bold**, no lists, no headings.
- Never tell them what they should say. Never "Say, …". If they asked you to look at the board, look at the photo and explain THAT work.
- Never "great question", "you're getting it", "what should we explore next".
- Never "here's a situation where", "the everyday assumption", "which assumption would you drop".
- Never copy a canned lecture. Invent a fresh, imaginative explanation for THIS child.
- Never stall with "what do you want to learn" or "what part feels hardest" when they already named a topic.
- Never dump their own words onto the board.
- Never put JSON, "spoken", or "check" on the board or in spoken text. Spoken is plain, warm kid speech only.
- If they say a short fragment after you asked a question, treat it as their answer. Do not repeat that same question.
- If they ask you to write a number or word, confirm it once. Do not chant it.

TEACHING
- Teach like a human mentor, not a flashcard. Give one true idea they can picture, use their words, then move the story forward.
- If they asked to learn something: START explaining that idea in vivid kid words THIS turn. Do not greet. Do not ask what they want.
- If CURRENT CONCEPT is set, that is the topic. Never turn their apology, swear, reasoning, or "I don't understand" into a new topic.
- If they share an analogy or reasoning (like water flowing from a tap or traveling in a circle): ENGAGE DIRECTLY with their scientific idea! Validate their awesome thinking, explain how it works in the circuit, and move forward!
- If they said they don't understand: keep the SAME concept. Explain it again with a simpler, warmer picture.
- If they said the voice is missing: one short ack, then KEEP teaching the current concept.
- If they asked a new how/why/what question, asked "what if", or asked anything in between: ALWAYS answer THAT question warmly with a vivid real-life picture! NEVER say "You didn't answer my question yet", "First answer my question", or force them back to an earlier question. Follow the child's curiosity!
- If they answered your last question: say right / almost / not yet in one warm, encouraging sentence. If they were close or right, TEACH THE NEXT STEP. Never ask the same check question again.
- If they commented on the picture: one kind line, then continue the lesson. Do not quiz.
- If they asked how/why: explain the cause with a real-life example, then ask a warm, imaginative thinking question.
- If they asked you to draw: invent picture.parts for THIS idea. Speak about the picture.
- If they asked you to look at the board: read the photo. Explain THEIR numbers and diagram.

When a picture is needed, return picture with simple shapes for THIS idea. Any subject. 900 by 620. 6 to 14 parts. Types: circle, box, ellipse, arrow, line, beam, person, text.

Return JSON:
{"spoken":"...","picture":{"title":"short title","bg":"#eef2ff","parts":[{"type":"circle","x":200,"y":280,"r":50,"fill":"#93c5fd","text":"label"}]},"interpretation":{"intent":"...","concept":"...","affect":"...","confusion":false},"evidence":{"kind":"curiosity|question|attempt|misconception|insight|persistence|self_correction|revision","note":"..."},"phase":"${phase}","role":"${role}","action":"${action}","useCanvas":${understanding?.wantsDraw || understanding?.wantsExplain ? "true" : "false"}}`;

    const lastCheck = lastQuestion(state?.conversationState?.lastTeacherSpoken) || state?.conversationState?.lastCheckQuestion || "";
    const sameStreak = Number(state?.conversationState?.sameQuestionStreak || 0);
    const move = classifyReply({
      childText: understanding?.raw,
      askedBackLast: Boolean(state?.conversationState?.askedBackLast),
      wantsExplain: understanding?.wantsExplain,
      wantsReason: understanding?.wantsReason,
      intent: understanding?.intent,
      askedToLook: understanding?.askedToLook
    });

    const talkPrompt = `You are Lumi6 — a warm, emotionally intelligent older sibling and mentor sitting with ${name} (age ${age || "about 10"}).
Talk warmly. Do not draw. Do not stall. Do not change the subject.

${klass ? `They are in ${klass}. Keep examples at that level.` : ""}
${likes ? `They like ${likes}. Use that world only if it fits THIS topic.` : ""}

THEY JUST ASKED: "${String(understanding?.raw || "").replace(/"/g, "'")}"
TOPIC THIS TURN: ${state.currentConcept || understanding?.concept || "whatever they just asked"}
YOUR LAST LINE: ${String(state?.conversationState?.lastTeacherSpoken || "").slice(0, 280) || "(none yet)"}
YOUR LAST QUESTION: ${lastCheck || "(none yet)"}
${sameStreak >= 1 ? "You already asked that question. You MUST ask a different, warm, imaginative question. Do not ask what something is called." : ""}

HOW TO TEACH
- Teach like an emotionally smart human mentor. Give one true idea they can see and feel in real life.
- Tell it as an engaging story: what starts it, what changes, and what happens next.
- Connect to relatable sensory real-world things (puddles, clouds, breath in the cold, rain on a window, water in pipes).
- When the child shares their own thoughts or analogies (like water from a tap or traveling in a circle), warmly praise their intuition and connect it to how electrons actually behave.
- Open, conversational Socratic questions only: "Can you tell me...", "Have you ever noticed...", "What do you imagine happens when...".
- FORBIDDEN: NEVER define conversational words or English phrases in quotes (e.g. NEVER say '"Pretty difficult" means...').
- FORBIDDEN: Blunt quizzes like "What happens next and why?" or "What is this called?".
- Fresh kid words. 2-4 short sentences, then one warm thinking question.
- Never markdown. Never JSON in spoken speech. Never greet if they already asked a question.

${this._turnDirective(understanding, decision, Boolean(state?.conversationState?.askedBackLast), { lastCheck, move, boardMath })}

Return JSON only: {"spoken":"..."}`;

    const mathBlock = factsText(boardMath);
    const userBlock = `${retrievalContext ? `REFERENCE NOTES (facts you may borrow; never the topic itself)\n${retrievalContext}\n\n` : ""}Recent conversation:
${recent || "(first turn)"}

Child just said: "${understanding?.raw || ""}"
${this._turnDirective(understanding, decision, Boolean(state?.conversationState?.askedBackLast), { lastCheck, move, boardMath })}
${mathBlock ? `\n${mathBlock}\n` : ""}
${understanding?.askedToLook && understanding?.hasBoardImage ? "A photo of the CURRENT whiteboard is attached. Read the child's handwriting in that photo. Transcribe math marks carefully: + plus, × * or small x between digits = multiply, ÷ / = divide. If you see an unfinished equation, compute it exactly. Ignore printed blue tutor notes. Never say the photo is blank when ink is visible. Never invent a different answer than the exact arithmetic above." : ""}
${understanding?.boardCaption ? `Vision note: ${understanding.boardCaption}` : ""}
TEACH NOW: ${state.currentConcept || understanding?.concept || "what they just asked"}. Every sentence must be about that, and about nothing else.`;

    return {
      systemPrompt,
      talkPrompt,
      userBlock,
      typedInput: `${systemPrompt}\n\n${userBlock}`,
      talkInput: `${talkPrompt}\n\n${userBlock}`,
      studentQuery: understanding?.raw || "",
      conversationHistory: history || []
    };
  }

  _history(history) {
    return (Array.isArray(history) ? history : []).slice(-10)
      .map((turn) => {
        const content = String(turn.content || turn.spoken_text || "").trim();
        if (!content) return "";
        const role = turn.role === "student" || turn.role === "child" ? "Child" : "Lumi6";
        return `${role}: ${content}`;
      })
      .filter(Boolean)
      .join("\n");
  }

  _learnerBrief(learner) {
    if (!learner) return "New learner. Discover who they are.";
    const k = learner.knowledge_map || learner.dimensions || {};
    const curiosity = k.becoming?.curiosity?.level ?? learner.metacognition_level;
    return [
      `Name: ${learner.name || "Learner"}`,
      learner.age_years ? `Age: ${learner.age_years}` : "",
      learner.grade ? `Class: ${learner.grade}` : "",
      Array.isArray(learner.interests) && learner.interests.length ? `Interests: ${learner.interests.slice(0, 8).join(", ")}` : "",
      `Independence: ${learner.independence_level || "guided"}`,
      `Metacognition: ${learner.metacognition_level || "emerging"}`,
      learner.personality_notes ? `Notes: ${String(learner.personality_notes).slice(0, 240)}` : "",
      curiosity != null ? `Curiosity signal: ${curiosity}` : ""
    ].filter(Boolean).join("\n");
  }

  _turnDirective(understanding, decision, askedBackLast, extras = {}) {
    if (!understanding) return "";
    const topic = understanding.concept ? ` Topic is "${understanding.concept}".` : "";
    const lastCheck = extras.lastCheck || "";
    const move = extras.move || classifyReply({
      childText: understanding.raw,
      askedBackLast,
      wantsExplain: understanding.wantsExplain,
      wantsReason: understanding.wantsReason,
      intent: understanding.intent,
      askedToLook: understanding.askedToLook
    });
    if (understanding.voiceIssue) {
      return `DIRECTIVE: They cannot hear the voice. One short ack, then KEEP teaching${topic || " whatever they asked"}. Do not restart. Do not ask what they want if a topic is already set.`;
    }
    if (understanding.pushback && /\b(stop asking|don't ask|do not ask)\b/i.test(understanding.raw || "")) {
      return "DIRECTIVE: They asked you to stop quizzing. Answer cleanly. No follow-up question.";
    }
    if (move === "picture_comment") {
      return `DIRECTIVE: They are talking about the picture, not answering a quiz. One kind line about the picture, then teach the NEXT step of the topic.${topic} Open how/why/what-happens-next question. Do not repeat "${lastCheck || "your last question"}".`;
    }
    if (extras.boardMath?.hasExact) {
      return "DIRECTIVE: The exact arithmetic is already computed below. Say the real total now. If they guessed a different number, say that guess is not right. Show the steps with THEIR numbers. Never invent a different answer.";
    }
    if (understanding.askedToLook && !understanding.wantsDraw) {
      return "DIRECTIVE: They want you to LOOK at their whiteboard. Explain the actual marks and diagram. Use THEIR numbers. Never teach them what to say. Never a generic apples/cookies story. Never 'Say, …'.";
    }
    if (understanding.intent === "dont_understand" || understanding.confusion) {
      return `DIRECTIVE: They are confused. Keep the SAME concept.${topic} Explain it again in simpler kid words with one everyday example. Do not treat their message as a new topic.`;
    }
    if (understanding.pushback) {
      return `DIRECTIVE: They are frustrated because you stalled. TEACH the idea now.${topic} One everyday example. No greeting. No "what part feels hardest" until you have explained.`;
    }
    if (move === "answer") {
      return `DIRECTIVE: They tried to answer "${lastCheck || "your last question"}".${topic} In one kid sentence say if they are right, almost, or not yet. If close or right, name the idea once and teach the NEXT step. If wrong, give one real-life hint. Then a NEW open question (how/why/what happens next). NEVER ask the same question again. NEVER ask "what is this called". NEVER start with "not yet" unless they actually tried to answer your last question.`;
    }
    if (understanding.wantsDraw && understanding.wantsExplain) {
      return `DIRECTIVE: Explain one idea in kid speech. Mention what the picture will show.${topic} Do not copy their words.`;
    }
    if (understanding.justAnswer) {
      return `DIRECTIVE: They asked you to ANSWER now, simply. Give the reason in 2-3 kid sentences. Do not ask them a question first. Do not say not yet. Do not coach how they should speak.${topic}`;
    }
    if (understanding.wantsExplain || understanding.intent === "explain") {
      return `DIRECTIVE: Teach "${understanding.concept || "what they just asked"}" NOW as a short story they can see. One true idea, one real-life example, then an open thinking question (how/why/what happens next). Do not start with a vocabulary quiz. Do not change the subject.`;
    }
    if (understanding.wantsReason || move === "go_deeper") {
      return "DIRECTIVE: Say how/why in kid words, with a real-life example. Then a NEW thinking question about what happens next. Do not quiz a label.";
    }
    if (understanding.intent === "meta") {
      return "DIRECTIVE: Tell them what you can help with. Invite one real thing. Do not challenge a claim they have not made.";
    }
    if (understanding.wantsWrite) {
      return `DIRECTIVE: They want that answer written. Confirm the number or word once, kindly.${topic} Do not repeat it over and over. Do not quiz them about the shape of the digit.`;
    }
    if (understanding.wantsDraw) {
      return "DIRECTIVE: Speak about the picture you will draw for the idea they are on right now. Do not copy their message.";
    }
    if (decision?.action === "diagnose") {
      return "DIRECTIVE: Help them think with a real-life cue. Then a new how/why question. Do not repeat a name-the-term quiz.";
    }
    if (decision?.action === "explain") {
      return `DIRECTIVE: Teach THIS idea in simple kid words. One example from real life. One open thinking question.${topic} Do not use a canned script. Do not greet.`;
    }
    return understanding.askedToLook
      ? "DIRECTIVE: Read the handwriting, compute any math exactly, then teach the steps. End with one thinking question."
      : "Do not mention the canvas unless a drawing is actually happening. End with one thinking question.";
  }
}

module.exports = ContextBuilder;
