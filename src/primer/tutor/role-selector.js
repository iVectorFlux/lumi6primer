"use strict";

const { ROLES, ROLE_PURPOSE } = require("../constants.js");

/**
 * Five locked roles. Thinking Partner replaces "Roommate" in the child-facing architecture.
 */
class RoleSelector {
  purpose(role) {
    return ROLE_PURPOSE[role] || ROLE_PURPOSE.tutor;
  }

  select(state, understanding, pedagogicalNeed) {
    const need = pedagogicalNeed || this.needFrom(state, understanding);
    const intent = understanding?.intent || "chat";
    const phase = state?.learningPhase || "think";

    if (intent === "meta") return "advisor";
    if (intent === "voice") return understanding?.concept ? "tutor" : "advisor";
    if (understanding?.wantsDraw || understanding?.pushback || understanding?.wantsExplain || intent === "explain" || understanding?.wantsReason) {
      return "tutor";
    }
    if (need === "direction" || intent === "goal") return "advisor";
    if (need === "evidence" || intent === "fact") return "librarian";
    if (understanding?.askedToLook && !understanding?.wantsDraw) return "tutor";
    if (need === "diagnosis" || intent === "homework" || intent === "misconception") return "editor";
    if (intent === "dont_understand") return "tutor";
    if (intent === "what_if" || intent === "insight" || phase === "become") return "thinking_partner";
    if (intent === "attempt" || intent === "revision" || intent === "drawing") return "editor";
    if (phase === "story") return "advisor";
    if (phase === "learn") return "tutor";
    if (phase === "think_again") return "thinking_partner";
    if (phase === "think") return "thinking_partner";
    return "tutor";
  }

  needFrom(state, understanding) {
    const intent = understanding?.intent || "chat";
    if (intent === "meta" || intent === "goal") return "direction";
    if (understanding?.pushback || understanding?.wantsExplain || intent === "explain" || understanding?.wantsReason) {
      return "knowledge";
    }
    if (intent === "fact") return "evidence";
    if (intent === "homework" || intent === "misconception" || intent === "attempt") return "diagnosis";
    if (intent === "dont_understand") return "knowledge";
    if (intent === "what_if" || intent === "insight") return "challenge";
    if (state?.learningPhase === "learn") return "knowledge";
    if (state?.learningPhase === "story") return "direction";
    return "knowledge";
  }

  selectAction(role, phase, understanding, conversationState) {
    const intent = understanding?.intent || "chat";
    const askedBackLast = Boolean(conversationState?.askedBackLast);

    if (understanding?.wantsDraw) return "explain";
    if (understanding?.pushback) return "explain";
    if (understanding?.voiceIssue && understanding?.concept) return "explain";
    if (understanding?.wantsExplain || intent === "explain") return "explain";
    const newAsk = Boolean(
      understanding?.wantsExplain
      || understanding?.wantsReason
      || intent === "explain"
      || intent === "question"
      || intent === "fact"
    );
    if (understanding?.askedToLook && !understanding?.wantsDraw) return "explain";
    if (askedBackLast && !understanding?.pushback && !newAsk && intent !== "meta" && intent !== "goal" && intent !== "dont_understand" && intent !== "voice") {
      return "diagnose";
    }
    if (intent === "dont_understand") return "reinterpret";
    if (intent === "homework") return "explain";
    if (intent === "drawing" && understanding?.refersToBoard) return "explain";
    if (intent === "drawing") return "observe";
    if (intent === "meta" || intent === "goal") return phase === "story" ? "situate" : "plan";
    if (intent === "revision") return "invite_revision";
    if (intent === "insight") return "reflect";
    if (intent === "question" || intent === "fact") return "explain";

    if (role === "advisor") return phase === "story" ? "situate" : "plan";
    if (role === "librarian") return "retrieve";
    if (role === "editor") return "diagnose";
    if (role === "thinking_partner") {
      if (phase === "become") return "reflect";
      return "challenge";
    }
    if (role === "tutor") return "explain";
    return "observe";
  }

  valid(role) {
    return ROLES.includes(role);
  }
}

module.exports = RoleSelector;
