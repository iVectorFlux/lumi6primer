"use strict";

class MemoryService {
  constructor(options = {}) {
    this.childModel = options.childModel;
    this.maxSnippets = options.maxSnippets || 6;
  }

  async retrieve(childId, { concept, intent } = {}) {
    if (!this.childModel || !childId) return [];
    const events = await this.childModel.getRecentEvents(childId, 12);
    const scored = events.map((event) => {
      let score = 1;
      if (concept && String(event.topic || "").toLowerCase() === String(concept).toLowerCase()) score += 3;
      if (intent && event.event_type === intent) score += 1;
      if (event.significance === "high") score += 2;
      return { score, text: this._format(event), event };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, this.maxSnippets).map((item) => item.text);
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
