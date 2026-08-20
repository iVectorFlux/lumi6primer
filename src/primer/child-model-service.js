"use strict";

class ChildModelService {
  constructor(store) {
    this.store = store;
  }

  async getChild(childId) {
    return this.store.getChild(childId);
  }

  async getOrCreate(childId, fields = {}) {
    let existing = null;
    if (fields.user_id) existing = await this.store.getChildByUserId(fields.user_id);
    if (!existing && childId) existing = await this.store.getChild(childId);
    if (existing) {
      const patch = {};
      if (fields.name && fields.name !== existing.name) patch.name = String(fields.name).slice(0, 40);
      if (fields.grade && fields.grade !== existing.grade) patch.grade = String(fields.grade).slice(0, 24);
      if (Number.isFinite(Number(fields.age_years)) && Number(fields.age_years) !== Number(existing.age_years)) {
        patch.age_years = Number(fields.age_years);
      }
      if (Array.isArray(fields.interests) && fields.interests.length) patch.interests = fields.interests.slice(0, 12);
      if (fields.onboarded_at && !existing.onboarded_at) patch.onboarded_at = fields.onboarded_at;
      if (fields.user_id && !existing.user_id) patch.user_id = fields.user_id;
      if (Object.keys(patch).length) return this.store.updateChild(existing.id, patch);
      return existing;
    }
    if (!childId && !fields.user_id) {
      const listed = await this.store.listChildren();
      if (listed.length) return listed[0];
    }
    return this.store.insertChild({
      name: fields.name || "Learner",
      age_years: fields.age_years || null,
      grade: fields.grade || null,
      interests: Array.isArray(fields.interests) ? fields.interests : [],
      user_id: fields.user_id || null,
      onboarded_at: fields.onboarded_at || null
    });
  }

  async updateAfterTurn(childId, modelUpdates = {}) {
    if (!childId || !modelUpdates || typeof modelUpdates !== "object") return null;
    const child = await this.store.getChild(childId);
    if (!child) return null;

    const patch = {};
    if (modelUpdates.knowledge_map && typeof modelUpdates.knowledge_map === "object") {
      patch.knowledge_map = { ...(child.knowledge_map || {}), ...modelUpdates.knowledge_map };
    }
    if (modelUpdates.reasoning_profile && typeof modelUpdates.reasoning_profile === "object") {
      patch.reasoning_profile = { ...(child.reasoning_profile || {}), ...modelUpdates.reasoning_profile };
    }
    if (Array.isArray(modelUpdates.misconceptions_add) && modelUpdates.misconceptions_add.length) {
      patch.active_misconceptions = [...(child.active_misconceptions || []), ...modelUpdates.misconceptions_add];
    }
    if (Array.isArray(modelUpdates.misconceptions_remove) && modelUpdates.misconceptions_remove.length) {
      const remove = new Set(modelUpdates.misconceptions_remove.map((item) => String(item.topic || item)));
      patch.active_misconceptions = (patch.active_misconceptions || child.active_misconceptions || [])
        .filter((item) => !remove.has(String(item.topic || item)));
    }
    if (Array.isArray(modelUpdates.interests_update) && modelUpdates.interests_update.length) {
      patch.interests = modelUpdates.interests_update;
    }
    if (typeof modelUpdates.notes === "string" && modelUpdates.notes.trim()) {
      patch.personality_notes = [child.personality_notes, modelUpdates.notes.trim()].filter(Boolean).join("\n");
    }
    if (!Object.keys(patch).length) return child;
    return this.store.updateChild(childId, patch);
  }

  async recordEvent(childId, sessionId, event) {
    if (!childId || !event) return null;
    return this.store.insertEvent({
      child_id: childId,
      session_id: sessionId || null,
      event_type: event.event_type || event.type || "note",
      topic: event.topic || null,
      description: event.description || "",
      significance: event.significance || "normal"
    });
  }

  async getRecentEvents(childId, limit = 10) {
    return this.store.getRecentEvents(childId, limit);
  }

  async incrementSessionCount(childId) {
    const child = await this.store.getChild(childId);
    if (!child) return null;
    return this.store.updateChild(childId, { total_sessions: Number(child.total_sessions || 0) + 1 });
  }
}

module.exports = ChildModelService;
