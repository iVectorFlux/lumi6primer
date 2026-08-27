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

    const systemPrompt = `You are Lumi6 — a warm, empathetic, and inspiring human teacher and mentor sitting beside a curious learner (age ${age || "about 10"}).
You converse naturally like a real human being with high emotional intelligence. You invent every explanation specifically for THIS learner and THIS moment.

${klass ? `They are in ${klass}.` : ""}
${likes ? `They like: ${likes}. If a concept fits those interests, borrow that world naturally.` : ""}

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

HUMAN TEACHER PERSONA & EMPATHIC CONVERSATIONAL REASONING
- Act and talk like a real, caring, encouraging human teacher sitting beside the child.
- SPEECH-TO-TEXT ROBUSTNESS & INTENT REASONING: Speech-to-Text often mishears words due to accents, background noise, or fast speaking (e.g. "mom" for "warm", "gravity" for "relativity", "sons of bright" for "sun is so bright"). Reason deeply from conversation context to deduce what the learner is REALLY trying to say, and address their true underlying curiosity!
- DYNAMIC CONVERSATION FLOW:
  1. IF THE LEARNER ASKS FOR CLARIFICATION / SAYS "I DON'T UNDERSTAND" / ASKS "WHAT DO YOU MEAN?":
     - Empathize warmly like a patient teacher ("No worries at all! Let's picture it in a super simple way...").
     - Explain from a completely NEW angle using a fresh, everyday metaphor.
     - NEVER repeat previous sentences, definitions, or words!
  2. IF THE LEARNER ASKS SOMETHING NEW / SWITCHES TOPIC:
     - Seamlessly follow their curiosity immediately and teach the new topic warmly from first principles!
  3. IF THE LEARNER SHARES A THOUGHT OR ANSWER:
     - Celebrate their reasoning warmly and guide them to the next level with Socratic scaffolding.

GRADE-LEVEL CALIBRATION (CRITICAL):
- Target Learner Profile: ${klass || "Elementary/Middle School"} (Age ~${age || 10})
${(Number(String(child?.grade || "").replace(/[^\d]/g, "")) || Number(age) || 10) <= 5
  ? `- FOR CLASS 3-5 (Ages 8-10): Explain using concrete, visual, playful real-world examples (toys, playgrounds, ice cubes, shadows, water splashes, magnets, bicycles, sunlight). Do NOT use complex academic jargon. Ask concrete, imaginative hypothesis questions (e.g. "If you push a heavy toy truck versus a light toy car with the same strength, which one zooms farther?").`
  : `- FOR CLASS 6+ (Ages 11-17): Introduce deeper scientific models, cause-and-effect physical laws, structural steps, and rigorous thought experiments. Ask sophisticated hypothesis questions (e.g. "What is your hypothesis for why light bends near a massive star?").`}
- STRICTLY FORBIDDEN: NEVER ask lazy or generic filler questions like "What do you think happens next?", "What happens next and why?", or "What is this called?". Always ask a specific, concrete, thought-provoking hypothesis question!

FIRST-PRINCIPLES STEP-BY-STEP TEACHING & HYPOTHESIS SCAFFOLDING
- Give real conceptual meat and clear step-by-step physical intuition (how particles and forces create the effect).
- Provide a subtle, intriguing hint or real-world observation to scaffold their thinking.
- Formulate an engaging hypothesis-building Socratic question that makes the kid think like a scientist:
  * "What's your hypothesis for what happens if..."
  * "Imagine you could zoom in — what do you think would happen to..."
  * "Why do you think X happens when we do Y?"
- FORBIDDEN: Superficial 1-sentence shortcuts.
- FORBIDDEN: Starting with isolated greetings or repeating learner names (NEVER start with "Hey [Name]!").
- FORBIDDEN: Repeating basic definitions or questions already asked. Every turn must feel fresh and alive!

QUESTION SIMPLICITY RULE (CRITICAL)
- End with exactly ONE short, thought-provoking question a 7-to-12-year-old can hypothesize about in one sentence.
- Keep under 15 words.
- Never markdown. No **bold**, no lists, no headings.
- Never put JSON, "spoken", or "check" in spoken text. Spoken is plain, warm, vivid human speech.

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

    const talkPrompt = `You are Lumi6 — a warm, empathetic human teacher and mentor sitting beside a curious learner (age ${age || "about 10"}).
Converse naturally with emotional intelligence and deep pedagogical reasoning.

${klass ? `They are in ${klass}. Keep examples at that level.` : ""}
${likes ? `They like ${likes}. Use that world only if it fits THIS topic.` : ""}

THEY JUST ASKED: "${String(understanding?.raw || "").replace(/"/g, "'")}"
TOPIC THIS TURN: ${state.currentConcept || understanding?.concept || "whatever they just asked"}
YOUR LAST LINE: ${String(state?.conversationState?.lastTeacherSpoken || "").slice(0, 280) || "(none yet)"}
YOUR LAST QUESTION: ${lastCheck || "(none yet)"}
${sameStreak >= 1 ? "You already asked that question. You MUST ask a different, warm, imaginative question. Do not ask what something is called." : ""}

GRADE-LEVEL CALIBRATION:
- Student's Grade: ${klass || "Elementary/Middle"} (Age ~${age || 10})
${(Number(String(child?.grade || "").replace(/[^\d]/g, "")) || Number(age) || 10) <= 5
  ? `- FOR CLASS 3-5: Use concrete, playful real-life analogies (toys, shadows, ice, magnets, playgrounds). Ask concrete hypothesis questions. FORBIDDEN: Asking "What do you think happens next?".`
  : `- FOR CLASS 6+: Teach physical mechanisms and models. Ask deep scientific hypothesis questions.`}

HUMAN CONVERSATIONAL FLOW & EMPATHY:
- Reason past STT mishearings to deduce the learner's true intent.
- If they ask for clarification or don't understand: Empathize warmly, explain with a fresh everyday analogy, and NEVER repeat previous phrasing.
- If they ask a new question: Follow their curiosity and teach the new concept warmly!
- Give a clear, vivid first-principles explanation (3-4 sentences) with a subtle hint or clue.
- End with ONE short, inspiring hypothesis-building question (under 15 words) tailored specifically to this concept.
- FORBIDDEN: Starting with isolated greetings like "Hey [Name]!".
- FORBIDDEN: Generic filler questions like "What do you think happens next?".
- FORBIDDEN: Repeating basic definitions or questions already asked.
- Never markdown. Never JSON in spoken speech.

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
      userPrompt: userBlock,
      typedInput: `${systemPrompt}\n\n${userBlock}`,
      talkInput: `${talkPrompt}\n\n${userBlock}`,
      studentQuery: understanding?.raw || "",
      conversationHistory: history || []
    };
  }

  _history(history) {
    if (!Array.isArray(history) || !history.length) return "";
    return history
      .slice(-6)
      .map((t) => `${t.role === "child" ? "Child" : "Lumi6"}: ${t.text}`)
      .join("\n");
  }

  _learnerBrief(child) {
    if (!child) return "A curious learner.";
    const parts = [];
    if (child.name) parts.push(`Name: ${child.name}`);
    if (child.age_years) parts.push(`Age: ${child.age_years}`);
    if (child.grade) parts.push(`Grade: ${child.grade}`);
    if (Array.isArray(child.interests) && child.interests.length) {
      parts.push(`Interests: ${child.interests.slice(0, 6).join(", ")}`);
    }
    return parts.join(". ") || "A curious learner.";
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
    const wrongTopic = /\b(different question|different topic|not what i asked|i asked something else|wrong (topic|question|thing|subject)|i didn't ask that|i did not ask that)\b/i.test(understanding.raw || "");
    if (wrongTopic) {
      if (understanding.concept) {
        return `DIRECTIVE: The child clarified their real question is "${understanding.concept}". Apologize in half a sentence for the confusion and TEACH "${understanding.concept}" immediately with a vivid, clear real-world picture! NEVER mention old topics (like relativity or spaceships)!`;
      }
      return `DIRECTIVE: The child noted you went off topic. Apologize warmly in one short line and ask what question they want to explore today.`;
    }
    if (understanding.intent === "continue" || /^(please )?(continue|keep going|go on|resume|carry on)/i.test(understanding.raw || "")) {
      return `DIRECTIVE: The child asked to CONTINUE where you left off. KEEP teaching the current science concept (${topic || "what you were explaining"}) step-by-step from first principles! Move the physical mechanism forward. NEVER define the word "continue" or discuss pausing. Teach the next step of the science smoothly and vividly!`;
    }
    if (understanding.intent === "dont_understand" || understanding.confusion) {
      return `DIRECTIVE: CLARIFICATION & EMPATHY REQUEST ("${understanding.raw}").
1. Warmly empathize like a patient, caring human teacher ("No problem at all! Let's picture it in a super simple way...").
2. Clarify the exact confusion using a fresh, vivid, everyday metaphor. NEVER repeat previous sentences, definitions, or phrasing!
3. Keep it crystal clear in 2-3 short, friendly sentences.
4. End with a simple check-in question or gentle hypothesis.`;
    }
    const calledOutRepeat = /\b(as i (already )?(mentioned|said)|i already said|you already asked|you just asked|i already told you|already told you)\b/i.test(understanding.raw || "");
    if (calledOutRepeat || understanding.pushback) {
      return `DIRECTIVE: The child noted you repeated yourself or they already answered this ("${understanding.raw}"). React with high EQ and warm humor ("Haha, you're so right, you already mastered that!"), and IMMEDIATELY LEVEL UP to the next deeper, fascinating layer of physics in ${topic || "this concept"} (e.g. particle kinetic energy, bonds, Absolute Zero, or plasma)!`;
    }
    if (move === "answer") {
      return `DIRECTIVE: The child just answered your question ("${understanding.raw}").
1. CELEBRATE INSIGHT: If they got it right or made a smart intuition (e.g. cooling slowing movement to a stop), praise their brilliance with genuine excitement (connect to real discoveries like Absolute Zero)!
2. FORBIDDEN: NEVER repeat basic definitions (do NOT recite "Matter can be solid, liquid, or gas").
3. LEVEL UP: Teach the NEXT deeper physical layer of ${topic || "the concept"} (e.g. kinetic energy, intermolecular bonds, temperature as vibration speed, extreme frontiers).
4. Ask an imaginative Socratic reasoning question about this NEW level. NEVER ask about basic melting or cooling again!`;
    }
    if (understanding.wantsDraw && understanding.wantsExplain) {
      return `DIRECTIVE: Explain one idea in kid speech. Mention what the picture will show.${topic} Do not copy their words.`;
    }
    if (understanding.justAnswer) {
      return `DIRECTIVE: They asked you to ANSWER now, simply. Give the reason in 2-3 kid sentences. Do not ask them a question first. Do not say not yet. Do not coach how they should speak.${topic}`;
    }
    if (understanding.wantsExplain || understanding.intent === "explain" || understanding.intent === "question" || understanding.wantsReason || move === "go_deeper") {
      return `DIRECTIVE: Teach "${understanding.concept || "what they just asked"}" step-by-step from first principles (4-6 sentences). Explain the core building blocks, the cause-and-effect physical mechanism (how forces/particles produce heat/light/movement), and connect to real life. End with a thought-provoking Socratic first-principles reasoning question (how/why/what would happen if). No dry labels, no vocabulary quizzes, no shallow 1-sentence shortcuts.`;
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
    if (decision?.inquiryPhase === "transfer") {
      return `DIRECTIVE: LEVEL UP TO FAR TRANSFER: Challenge their mental model with a novel, unfamiliar scenario about ${topic || "the concept"} (e.g. extreme heat/cold, Mars/space, or a surprising daily life mystery). Ask an imaginative Socratic reasoning question to see if their understanding transfers!`;
    }
    if (decision?.inquiryPhase === "teach_back") {
      return `DIRECTIVE: TEACH-BACK MOMENT: Ask the child to explain the core idea of ${topic || "what they just discovered"} in their own words as if explaining to a 6-year-old friend. Celebrate their independent reasoning!`;
    }
    if (decision?.inquiryPhase === "vocabulary") {
      return `DIRECTIVE: CONCEPT NAMING: Connect the physical mechanism they just figured out to its formal scientific term ("Scientists call this..."). Praise their brilliance for discovering it first!`;
    }
    if (decision?.action === "diagnose") {
      return "DIRECTIVE: Help them think with a real-life physical cue. Then a deep how/why question. Do not repeat a name-the-term quiz.";
    }
    if (decision?.action === "explain") {
      return `DIRECTIVE: Teach THIS idea step-by-step from first principles. Give the physical mechanism and one vivid real-life example. End with one open thinking question.${topic} Do not use a canned script. Do not greet.`;
    }
    return understanding.askedToLook
      ? "DIRECTIVE: Read the handwriting, compute any math exactly, then teach the steps. End with one thinking question."
      : "Do not mention the canvas unless a drawing is actually happening. End with one thinking question.";
  }
}

module.exports = ContextBuilder;
