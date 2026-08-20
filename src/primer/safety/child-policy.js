"use strict";

/**
 * UNICEF/UNESCO-aligned child policy:
 * safety, privacy, development, age-appropriateness, no conversational-AI dependency.
 */
class ChildPolicy {
  evaluate(text, child) {
    const raw = String(text || "");
    const flags = [];
    const age = Number(child?.age_years) || 10;

    if (this._selfHarm(raw)) flags.push("self_harm");
    if (this._abuse(raw)) flags.push("abuse");
    if (this._adultSexual(raw)) flags.push("adult_content");
    if (this._illegal(raw)) flags.push("illegal");
    if (age < 13 && this._oversharing(raw)) flags.push("privacy");

    return {
      ok: flags.length === 0,
      flags,
      ageBand: age < 11 ? "8-10" : "11-14",
      allowTools: flags.length === 0,
      notes: flags
    };
  }

  dependencyRisk(history) {
    const childTurns = (history || []).filter((t) => t.role === "child" || t.role === "student");
    const cling = childTurns.filter((t) => /tell me the answer|just give me|i can't (do|think) (this|without you)|you do it/i.test(String(t.content || t.spoken_text || ""))).length;
    if (cling >= 3) return "high";
    if (cling >= 1) return "medium";
    return "low";
  }

  _selfHarm(text) {
    return /\b(kill myself|suicide|want to die|hurt myself|cut myself)\b/i.test(text);
  }

  _abuse(text) {
    return /\b(he hits me|she hits me|they touch me|being abused|hurt me at home)\b/i.test(text);
  }

  _adultSexual(text) {
    return /\b(sex with|porn|nude photos|hook up)\b/i.test(text);
  }

  _illegal(text) {
    return /\b(how to make a bomb|steal a|hack (into|someone))\b/i.test(text);
  }

  _oversharing(text) {
    return /\b(my address is|my password is|my phone number is|school name is)\b/i.test(text);
  }
}

module.exports = ChildPolicy;
