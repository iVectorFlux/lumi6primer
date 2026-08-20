"use strict";

const crypto = require("crypto");
const { AsyncLocalStorage } = require("node:async_hooks");

const authContext = new AsyncLocalStorage();

function runWithAccessToken(token, fn) {
  return authContext.run({ accessToken: String(token || "") }, fn);
}

function jwtSub(token) {
  try {
    const part = String(token || "").split(".")[1];
    if (!part) return null;
    const padded = part.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((part.length + 3) % 4);
    const payload = JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
    return payload.sub || null;
  } catch {
    return null;
  }
}

function newId() {
  return crypto.randomUUID();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

/**
 * Persistence for Primer child/session/turn data.
 * Uses Supabase REST when SUPABASE_URL + key are set; otherwise in-memory.
 */
class PrimerStore {
  constructor(options = {}) {
    this.url = String(
      options.url
      || process.env.SUPABASE_URL
      || process.env.NEXT_PUBLIC_SUPABASE_URL
      || ""
    ).replace(/\/$/, "");
    this.key = String(
      options.key
      || process.env.SUPABASE_SERVICE_ROLE_KEY
      || process.env.SUPABASE_SERVICE_KEY
      || process.env.SUPABASE_ANON_KEY
      || process.env.SUPABASE_KEY
      || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      || ""
    ).trim();
    this._remoteFailed = false;
    this.memory = {
      children: new Map(),
      sessions: new Map(),
      turns: [],
      events: []
    };
  }

  get remoteEnabled() {
    return Boolean(this.url && this.key && !this._remoteFailed);
  }

  async request(method, table, { query = "", body, prefer } = {}) {
    if (!this.remoteEnabled) return { ok: false, offline: true, data: null };
    const accessToken = authContext.getStore()?.accessToken || "";
    const res = await fetch(`${this.url}/rest/v1/${table}${query}`, {
      method,
      headers: {
        apikey: this.key,
        Authorization: `Bearer ${accessToken || this.key}`,
        "Content-Type": "application/json",
        Prefer: prefer || "return=representation"
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const text = await res.text();
    let data = null;
    if (text) {
      try { data = JSON.parse(text); } catch { data = text; }
    }
    if (!res.ok) {
      const message = typeof data === "object" && data?.message ? data.message : text.slice(0, 240);
      const error = new Error(`Supabase ${table} ${method} failed (${res.status}): ${message}`);
      error.status = res.status;
      throw error;
    }
    return { ok: true, data };
  }

  async remoteOrMemory(remoteFn, memoryFn) {
    if (!this.remoteEnabled) return memoryFn();
    try {
      return await remoteFn();
    } catch (err) {
      console.warn("[PRIMER] Supabase fallback to memory:", err.message);
      this._remoteFailed = true;
      return memoryFn();
    }
  }

  defaultChild(overrides = {}) {
    const now = new Date().toISOString();
    return {
      id: newId(),
      user_id: null,
      name: "Learner",
      age_years: null,
      grade: null,
      knowledge_map: {
        knowledge: {},
        thinking: {},
        learning: {},
        becoming: {},
        topics: {}
      },
      active_misconceptions: [],
      interests: [],
      reasoning_profile: {},
      metacognition_level: "emerging",
      independence_level: "guided",
      personality_notes: "",
      total_sessions: 0,
      total_minutes: 0,
      onboarded_at: null,
      created_at: now,
      updated_at: now,
      ...overrides
    };
  }

  async insertChild(fields = {}) {
    const row = this.defaultChild(fields);
    return this.remoteOrMemory(
      async () => {
        const { data } = await this.request("POST", "users", { body: row });
        return Array.isArray(data) ? data[0] : data;
      },
      () => {
        this.memory.children.set(row.id, clone(row));
        return clone(row);
      }
    );
  }

  async getChild(id) {
    if (!id) return null;
    return this.remoteOrMemory(
      async () => {
        const { data } = await this.request("GET", "users", { query: `?id=eq.${encodeURIComponent(id)}&select=*` });
        return Array.isArray(data) && data[0] ? data[0] : null;
      },
      () => {
        const row = this.memory.children.get(id);
        return row ? clone(row) : null;
      }
    );
  }

  async getChildByUserId(userId) {
    if (!userId) return null;
    return this.remoteOrMemory(
      async () => {
        const { data } = await this.request("GET", "users", {
          query: `?user_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`
        });
        return Array.isArray(data) && data[0] ? data[0] : null;
      },
      () => {
        const row = [...this.memory.children.values()].find((child) => child.user_id === userId);
        return row ? clone(row) : null;
      }
    );
  }

  async listChildren() {
    return this.remoteOrMemory(
      async () => {
        const { data } = await this.request("GET", "users", { query: "?select=*&order=updated_at.desc" });
        return Array.isArray(data) ? data : [];
      },
      () => [...this.memory.children.values()].map(clone)
    );
  }

  async updateChild(id, patch) {
    const next = { ...patch, updated_at: new Date().toISOString() };
    return this.remoteOrMemory(
      async () => {
        const { data } = await this.request("PATCH", "users", {
          query: `?id=eq.${encodeURIComponent(id)}`,
          body: next
        });
        return Array.isArray(data) ? data[0] : data;
      },
      () => {
        const current = this.memory.children.get(id);
        if (!current) return null;
        const merged = { ...current, ...next };
        this.memory.children.set(id, merged);
        return clone(merged);
      }
    );
  }

  async insertSession(fields) {
    const now = new Date().toISOString();
    const row = {
      id: newId(),
      started_at: now,
      ended_at: null,
      duration_minutes: null,
      summary: null,
      topics_touched: [],
      cognitive_goals: [],
      breakthroughs: [],
      experience_pattern: "exploration",
      child_model_delta: {},
      created_at: now,
      ...fields
    };
    return this.remoteOrMemory(
      async () => {
        const { data } = await this.request("POST", "sessions", { body: row });
        return Array.isArray(data) ? data[0] : data;
      },
      () => {
        this.memory.sessions.set(row.id, clone(row));
        return clone(row);
      }
    );
  }

  async getSession(id) {
    if (!id) return null;
    return this.remoteOrMemory(
      async () => {
        const { data } = await this.request("GET", "sessions", { query: `?id=eq.${encodeURIComponent(id)}&select=*` });
        return Array.isArray(data) && data[0] ? data[0] : null;
      },
      () => {
        const row = this.memory.sessions.get(id);
        return row ? clone(row) : null;
      }
    );
  }

  async getOpenSession(childId) {
    return this.remoteOrMemory(
      async () => {
        const { data } = await this.request("GET", "sessions", {
          query: `?child_id=eq.${encodeURIComponent(childId)}&ended_at=is.null&select=*&order=started_at.desc&limit=1`
        });
        return Array.isArray(data) && data[0] ? data[0] : null;
      },
      () => {
        const open = [...this.memory.sessions.values()]
          .filter((s) => s.child_id === childId && !s.ended_at)
          .sort((a, b) => String(b.started_at).localeCompare(String(a.started_at)));
        return open[0] ? clone(open[0]) : null;
      }
    );
  }

  async updateSession(id, patch) {
    return this.remoteOrMemory(
      async () => {
        const { data } = await this.request("PATCH", "sessions", {
          query: `?id=eq.${encodeURIComponent(id)}`,
          body: patch
        });
        return Array.isArray(data) ? data[0] : data;
      },
      () => {
        const current = this.memory.sessions.get(id);
        if (!current) return null;
        const merged = { ...current, ...patch };
        this.memory.sessions.set(id, merged);
        return clone(merged);
      }
    );
  }

  async insertTurn(fields) {
    const row = {
      id: newId(),
      canvas_action: null,
      board_image_url: null,
      ai_reasoning: null,
      created_at: new Date().toISOString(),
      ...fields
    };
    return this.remoteOrMemory(
      async () => {
        const { data } = await this.request("POST", "turns", { body: row });
        return Array.isArray(data) ? data[0] : data;
      },
      () => {
        this.memory.turns.push(clone(row));
        return clone(row);
      }
    );
  }

  async getTurns(sessionId, limit = 30) {
    return this.remoteOrMemory(
      async () => {
        const { data } = await this.request("GET", "turns", {
          query: `?session_id=eq.${encodeURIComponent(sessionId)}&select=*&order=turn_number.asc&limit=${Number(limit) || 30}`
        });
        return Array.isArray(data) ? data : [];
      },
      () => this.memory.turns
        .filter((t) => t.session_id === sessionId)
        .sort((a, b) => (a.turn_number || 0) - (b.turn_number || 0))
        .slice(-limit)
        .map(clone)
    );
  }

  async countTurns(sessionId) {
    const turns = await this.getTurns(sessionId, 500);
    return turns.length;
  }

  async insertEvent(fields) {
    const row = {
      id: newId(),
      significance: "normal",
      created_at: new Date().toISOString(),
      ...fields
    };
    return this.remoteOrMemory(
      async () => {
        const { data } = await this.request("POST", "learning_events", { body: row });
        return Array.isArray(data) ? data[0] : data;
      },
      () => {
        this.memory.events.push(clone(row));
        return clone(row);
      }
    );
  }

  async getRecentEvents(childId, limit = 10) {
    return this.remoteOrMemory(
      async () => {
        const { data } = await this.request("GET", "learning_events", {
          query: `?child_id=eq.${encodeURIComponent(childId)}&select=*&order=created_at.desc&limit=${Number(limit) || 10}`
        });
        return Array.isArray(data) ? data : [];
      },
      () => this.memory.events
        .filter((e) => e.child_id === childId)
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
        .slice(0, limit)
        .map(clone)
    );
  }
}

module.exports = PrimerStore;
module.exports.runWithAccessToken = runWithAccessToken;
module.exports.jwtSub = jwtSub;
