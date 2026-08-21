"use strict";

const { ROLES, ACTIONS } = require("../constants.js");
const { isNewAsk } = require("./kid-intent.js");

const QUIZ_ACTIONS = new Set(["quiz", "exercise", "drill", "reward", "test"]);

/**
 * Pedagogical Policy validates LLM proposals.
 * The LLM does not decide everything.
 *
 * LLM proposes interpretation/actions
 *   → Pedagogical Policy validates
 *   → Orchestrator executes
 */
class PedagogicalPolicy {
  constructor(options = {}) {
    this.roleSelector = options.roleSelector;
    this.stateMachine = options.stateMachine;
  }

  validate(proposal, state, understanding) {
    const proposed = this._normalizeProposal(proposal);
    const reasons = [];

    const phase = this._lockPhase(proposed.phase, state, understanding, reasons);
    const need = this.roleSelector
      ? this.roleSelector.needFrom({ ...state, learningPhase: phase }, understanding)
      : "knowledge";
    let role = this._lockRole(proposed.role, { ...state, learningPhase: phase }, understanding, need, reasons);
    let action = this._lockAction(proposed.action, role, phase, understanding, state, reasons);
    const tools = this._lockTools(proposed.tools, action, phase, understanding, state, reasons);
    const spokenHints = this._spokenConstraints(phase, role, action, understanding, state);

    if (this._isQuizLoop(state, action)) {
      if (understanding?.intent === "dont_understand") {
        action = "reinterpret";
        role = "tutor";
      } else {
        action = phase === "become" ? "reflect" : (phase === "story" ? "situate" : "ask_back");
        role = phase === "story" ? "advisor" : "thinking_partner";
      }
      reasons.push("blocked quiz-exercise loop");
    }

    if (
      Number(state?.conversationState?.consecutiveExplanations || 0) >= 3
      && action === "explain"
      && !understanding?.wantsExplain
      && !understanding?.wantsReason
      && !understanding?.pushback
    ) {
      action = "ask_back";
      role = "thinking_partner";
      reasons.push("too many explanations; child must think");
    }

    return {
      ok: true,
      phase,
      role,
      action,
      need,
      tools,
      spokenHints,
      interpretation: proposed.interpretation || understanding || {},
      evidence: proposed.evidence || null,
      reasons,
      proposedSpoken: proposed.spoken || ""
    };
  }

  _normalizeProposal(proposal) {
    const p = proposal && typeof proposal === "object" ? proposal : {};
    const tools = Array.isArray(p.tools)
      ? p.tools
      : [p.useCanvas && "canvas", p.useVision && "vision", p.useRetrieval && "retrieval"].filter(Boolean);
    return {
      spoken: String(p.spoken || p.spokenResponse || ""),
      phase: p.phase || p.learningPhase,
      role: p.role || p.tutorRole,
      action: p.action,
      tools,
      interpretation: p.interpretation || {},
      evidence: p.evidence || null
    };
  }

  _lockPhase(proposed, state, understanding, reasons) {
    const determined = this.stateMachine
      ? this.stateMachine.determinePhase(state, understanding)
      : (state?.learningPhase || "think");
    const intent = understanding?.intent;
    if (understanding?.wantsDraw) return "learn";
    if (understanding?.voiceIssue && (state?.currentConcept || understanding?.concept)) {
      const prev = state?.learningPhase || determined;
      return prev === "story" ? "learn" : prev;
    }
    if (understanding?.wantsExplain || understanding?.pushback || intent === "explain" || intent === "dont_understand") {
      return "learn";
    }
    if (understanding?.wantsReason || intent === "question") return "learn";
    if (intent === "insight" && !understanding?.wantsExplain) return "become";
    if (proposed === determined) return determined;
    if (proposed && proposed !== determined) {
      reasons.push(`llm phase ${proposed} overridden by ${determined}`);
    }
    return determined;
  }

  _lockRole(proposed, state, understanding, need, reasons) {
    const selected = this.roleSelector
      ? this.roleSelector.select(state, understanding, need)
      : "tutor";
    const phase = state?.learningPhase;
    if (ROLES.includes(proposed)) {
      if (understanding?.intent === "dont_understand" && proposed !== "tutor") {
        reasons.push("I don't understand requires tutor, new explanation");
        return "tutor";
      }
      if (understanding?.intent === "homework" && proposed === "tutor" && !understanding?.askedToLook) {
        reasons.push("homework starts as editor, not a lecture");
        return "editor";
      }
      if (understanding?.wantsDraw || understanding?.wantsExplain || understanding?.pushback || understanding?.wantsReason) {
        return "tutor";
      }
      if (understanding?.intent === "meta") return "advisor";
      if ((understanding?.intent === "insight" || phase === "become") && !understanding?.wantsExplain) {
        return "thinking_partner";
      }
      if (understanding?.intent === "attempt" && proposed === "tutor") {
        return "editor";
      }
      if (understanding?.intent === "fact" && proposed === "tutor") {
        return "librarian";
      }
      return proposed;
    }
    return selected;
  }

  _lockAction(proposed, role, phase, understanding, state, reasons) {
    const selected = this.roleSelector
      ? this.roleSelector.selectAction(role, phase, understanding, state?.conversationState)
      : "observe";
    if (QUIZ_ACTIONS.has(String(proposed || "").toLowerCase())) {
      reasons.push("quiz/exercise/reward is not a legal action");
      return selected;
    }
    if (understanding?.wantsDraw) {
      reasons.push("they asked for a drawing");
      return "explain";
    }
    if (understanding?.askedToLook && !understanding?.wantsDraw) {
      reasons.push("board work should be read and taught with exact arithmetic");
      return "explain";
    }
    if (understanding?.intent === "homework" || isNewAsk(understanding?.raw, understanding)) {
      reasons.push("a new ask or a sum is taught, not graded");
      return "explain";
    }
    const askedBackLast = Boolean(state?.conversationState?.askedBackLast);
    if (
      askedBackLast
      && !understanding?.pushback
      && understanding?.intent !== "meta"
      && understanding?.intent !== "goal"
      && understanding?.intent !== "voice"
    ) {
      if (understanding?.intent === "dont_understand") return "reinterpret";
      reasons.push("assess their answer before teaching more");
      return "diagnose";
    }
    if (ACTIONS.includes(proposed)) {
      if (proposed === "reinterpret" && understanding?.intent !== "dont_understand") {
        reasons.push("reinterpret only when they don't understand");
        return selected;
      }
      if (understanding?.intent === "homework") {
        reasons.push("homework is taught with the exact answer, then the steps");
        return "explain";
      }
      if (understanding?.intent === "meta") return "situate";
      if (understanding?.wantsExplain || understanding?.pushback || understanding?.wantsReason) {
        return "explain";
      }
      if (proposed === "reflect" && understanding?.intent !== "insight") {
        reasons.push("reflect only after a real shift in the child's thinking");
        return selected;
      }
      if (understanding?.refersToBoard && proposed === "explain") {
        return "explain";
      }
      if (phase === "think" && proposed === "explain" && !understanding?.wantsDraw && !understanding?.wantsExplain && understanding?.intent !== "homework" && understanding?.intent !== "question") {
        reasons.push("think phase cannot dump knowledge");
        return "observe";
      }
      return proposed;
    }
    return selected;
  }

  _lockTools(proposedTools, action, phase, understanding, state, reasons) {
    const requested = new Set((proposedTools || []).map(String));
    const allowed = [];
    const wantsBoard = understanding?.refersToBoard || understanding?.intent === "drawing";
    const wantsHomework = understanding?.intent === "homework";
    const wantsDraw = understanding?.wantsDraw;
    const fact = understanding?.intent === "fact";

    if (wantsBoard || wantsHomework) allowed.push("vision");
    if (wantsHomework) allowed.push("homework");
    if (wantsDraw || understanding?.wantsExplain || (phase === "learn" && action === "explain" && !fact && !wantsBoard)) {
      allowed.push("canvas");
    }
    if (action === "retrieve" || understanding?.intent === "fact") allowed.push("retrieval");
    if (understanding?.wantsSimulation) allowed.push("simulation");

    const next = [];
    for (const tool of requested) {
      if (allowed.includes(tool)) next.push(tool);
      else reasons.push(`tool ${tool} not justified this turn`);
    }
    for (const tool of allowed) {
      if (!next.includes(tool) && (tool === "vision" || tool === "homework" || tool === "canvas")) {
        if (tool === "canvas" && !(wantsDraw || understanding?.wantsExplain || action === "explain")) continue;
        next.push(tool);
      }
    }
    if ((wantsDraw || understanding?.wantsExplain) && !next.includes("canvas")) next.push("canvas");
    if ((phase === "become" || phase === "think") && !wantsDraw && !understanding?.wantsExplain) {
      return next.filter((t) => t === "vision" || t === "homework");
    }
    return next;
  }

  _spokenConstraints(phase, role, action, understanding, state) {
    const answering = Boolean(
      understanding?.wantsExplain
      || understanding?.wantsReason
      || understanding?.pushback
      || ["explain", "answer", "situate", "plan"].includes(action)
    );
    const skipQuestion = Boolean(
      understanding?.intent === "meta"
      || understanding?.pictureComment
      || (understanding?.pushback && /\b(stop asking|don't ask|do not ask)\b/i.test(String(understanding?.raw || "")))
    );
    const maxSentences = answering || phase === "learn" || action === "diagnose" ? 5 : 3;
    const mustAskQuestion = !skipQuestion && action !== "answer";
    return {
      maxSentences,
      mustAskQuestion,
      mustNotLecture: phase !== "learn" && !answering,
      mustReinterpret: action === "reinterpret" && understanding?.intent === "dont_understand",
      englishUnlessAsked: true,
      neverNarrateBoard: true,
      neverDependency: true,
      becomeIsNotMoral: phase === "become"
    };
  }

  _isQuizLoop(state, action) {
    return QUIZ_ACTIONS.has(String(action || "").toLowerCase());
  }
}

module.exports = PedagogicalPolicy;
