"use strict";

class SessionManager {
  constructor(store) {
    this.store = store;
  }

  async startSession(childId, extras = {}) {
    const open = await this.store.getOpenSession(childId);
    if (open) return open;
    return this.store.insertSession({
      child_id: childId,
      experience_pattern: extras.experience_pattern || "exploration",
      cognitive_goals: extras.cognitive_goals || []
    });
  }

  async getSession(sessionId) {
    return this.store.getSession(sessionId);
  }

  async getOrStart(childId, sessionId) {
    if (sessionId) {
      const existing = await this.store.getSession(sessionId);
      if (existing && !existing.ended_at) return { session: existing, created: false };
    }
    const open = await this.store.getOpenSession(childId);
    if (open) return { session: open, created: false };
    const session = await this.startSession(childId);
    return { session, created: true };
  }

  async addTurn(sessionId, turn) {
    const count = await this.store.countTurns(sessionId);
    return this.store.insertTurn({
      session_id: sessionId,
      child_id: turn.child_id,
      turn_number: turn.turn_number || count + 1,
      role: turn.role,
      spoken_text: turn.spoken_text || "",
      canvas_action: turn.canvas_action || null,
      board_image_url: turn.board_image_url || null,
      ai_reasoning: turn.ai_reasoning || null
    });
  }

  async getRecentTurns(sessionId, limit = 15) {
    return this.store.getTurns(sessionId, limit);
  }

  async endSession(sessionId, summary = "") {
    const session = await this.store.getSession(sessionId);
    if (!session) return null;
    const started = session.started_at ? new Date(session.started_at).getTime() : Date.now();
    const duration = Math.max(1, Math.round((Date.now() - started) / 60000));
    return this.store.updateSession(sessionId, {
      ended_at: new Date().toISOString(),
      duration_minutes: duration,
      summary: summary || session.summary || ""
    });
  }
}

module.exports = SessionManager;
