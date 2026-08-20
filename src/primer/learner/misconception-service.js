"use strict";

class MisconceptionService {
  detect(understanding, text) {
    const raw = String(text || understanding?.raw || "");
    const found = [];
    if (understanding?.intent === "misconception") {
      found.push({
        topic: understanding.concept || "unknown",
        note: raw.slice(0, 180)
      });
    }
    return found;
  }

  merge(existing, additions, removals = []) {
    const list = Array.isArray(existing) ? [...existing] : [];
    for (const item of additions || []) {
      const topic = String(item.topic || item).toLowerCase();
      if (!list.some((row) => String(row.topic || row).toLowerCase() === topic)) {
        list.push({ topic: item.topic || item, note: item.note || "", last_seen: new Date().toISOString() });
      }
    }
    const remove = new Set((removals || []).map((item) => String(item.topic || item).toLowerCase()));
    return list.filter((row) => !remove.has(String(row.topic || row).toLowerCase())).slice(-12);
  }

  resolved(understanding, evidence) {
    if (evidence?.kind === "self_correction" || evidence?.kind === "insight") {
      return understanding?.concept ? [{ topic: understanding.concept }] : [];
    }
    return [];
  }
}

module.exports = MisconceptionService;
