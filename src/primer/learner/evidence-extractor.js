"use strict";

class EvidenceExtractor {
  extract({ childText, understanding, proposal, decision }) {
    const text = String(childText || understanding?.raw || "").trim();
    const observed = this._kindFrom(understanding, text);
    const fromModel = proposal?.evidence && typeof proposal.evidence === "object" ? proposal.evidence : {};
    const childOwns = ["insight", "revision", "attempt", "question", "self_correction"].includes(observed);
    let kind = childOwns ? observed : (fromModel.kind || observed);
    if (understanding?.wantsExplain || understanding?.wantsReason || understanding?.pushback || understanding?.intent === "meta") {
      if (kind === "insight" || kind === "self_correction") kind = "question";
    }
    const note = String(fromModel.note || this._note(kind, text, understanding)).slice(0, 280);
    return {
      kind,
      note,
      domain: fromModel.domain || this._domain(understanding?.concept, text),
      concept: understanding?.concept || fromModel.concept || null,
      phase: decision?.phase || null,
      role: decision?.role || null
    };
  }

  _kindFrom(understanding, text) {
    const intent = understanding?.intent;
    if (intent === "dont_understand") return "confusion";
    if (intent === "insight") return "insight";
    if (intent === "revision") return "revision";
    if (intent === "attempt") return "attempt";
    if (intent === "misconception") return "misconception";
    if (intent === "question" || intent === "what_if") return "question";
    if (intent === "goal") return "curiosity";
    if (/\b(oh|wait|so then|that means|i changed)\b/i.test(text)) return "insight";
    if (/\b(try again|instead|i meant)\b/i.test(text)) return "revision";
    if (/\?/.test(text)) return "question";
    return "curiosity";
  }

  _note(kind, text, understanding) {
    const concept = understanding?.concept;
    if (concept) return `${kind} on ${concept}: ${text.slice(0, 160)}`;
    return text.slice(0, 180);
  }

  _domain(concept, text) {
    const blob = `${concept || ""} ${text}`.toLowerCase();
    if (/math|number|fraction|equation|add|multiply|geometry|percent/.test(blob)) return "mathematics";
    if (/relativity|spacetime|gravity|force|energy|cell|planet|chemical|animal|plant/.test(blob)) return "science";
    if (/word|sentence|story|poem|grammar|read|write|spell/.test(blob)) return "language";
    return "world";
  }
}

module.exports = EvidenceExtractor;
