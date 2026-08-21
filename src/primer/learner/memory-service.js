"use strict";

class MemoryService {
  constructor(options = {}) {
    this.childModel = options.childModel;
    this.maxSnippets = options.maxSnippets || 6;
  }

  async retrieve(childId, { concept, intent } = {}) {
    if (!this.childModel || !childId) return [];
    const events = await this.childModel.getRecentEvents(childId, 12);
    const current = String(concept || "").trim().toLowerCase();
    const scored = events.map((event) => {
      const topic = String(event.topic || "").trim().toLowerCase();
      let score = 1;
      if (current && topic === current) score += 3;
      if (intent && event.event_type === intent) score += 1;
      if (event.significance === "high") score += 2;
      // An unrelated old topic in the prompt reads as a suggestion, and the model
      // has taught that old topic instead of the one the child just asked for.
      const unrelated = Boolean(current) && Boolean(topic) && topic !== current && !this._related(topic, current);
      return { score, unrelated, text: this._format(event) };
    });
    const pool = scored.filter((item) => !item.unrelated);
    pool.sort((a, b) => b.score - a.score);
    return pool.slice(0, this.maxSnippets).map((item) => item.text);
  }

  _related(topicA, topicB) {
    const words = (text) => new Set(String(text).split(/\s+/).filter((w) => w.length > 3));
    const a = words(topicA);
    for (const word of words(topicB)) if (a.has(word)) return true;
    return false;
  }

  async remember(childId, sessionId, evidence, { concept, phase, role } = {}) {
    if (!this.childModel || !childId || !evidence) return null;
    const kind = evidence.kind || "note";
    const significance = ["insight", "self_correction", "misconception"].includes(kind) ? "high" : "normal";
    return this.childModel.recordEvent(childId, sessionId, {
      event_type: kind,
      topic: concept || null,
      description: evidence.note || `${phase || ""}:${role || ""}`.trim(),
      significance
    });
  }

  _format(event) {
    const when = event.created_at ? String(event.created_at).slice(0, 10) : "earlier";
    const topic = event.topic ? ` about ${event.topic}` : "";
    const desc = event.description ? `: ${event.description}` : "";
    return `${when} — ${event.event_type}${topic}${desc}`.slice(0, 220);
  }
}

module.exports = MemoryService;
