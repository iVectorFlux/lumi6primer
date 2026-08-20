"use strict";

const { LEARNER_DIMENSIONS } = require("../constants.js");

function emptyLeaf() {
  return { level: 0.2, evidence_count: 0, last_seen: null };
}

function emptyGroup(keys) {
  const out = {};
  for (const key of keys) out[key] = emptyLeaf();
  return out;
}

function emptyDimensions() {
  return {
    knowledge: emptyGroup(LEARNER_DIMENSIONS.knowledge),
    thinking: emptyGroup(LEARNER_DIMENSIONS.thinking),
    learning: emptyGroup(LEARNER_DIMENSIONS.learning),
    becoming: emptyGroup(LEARNER_DIMENSIONS.becoming)
  };
}

function clamp(n) {
  return Math.max(0, Math.min(1, Number(n) || 0));
}

/**
 * Longitudinal learner model.
 * Tracks capability, not lesson completion.
 *
 * Question: is this child becoming more capable?
 * Not: did this child complete today's lesson?
 */
class LearnerModel {
  normalize(child = {}) {
    const map = child.knowledge_map && typeof child.knowledge_map === "object" ? child.knowledge_map : {};
    const dims = emptyDimensions();
    for (const group of Object.keys(dims)) {
      const src = map[group] && typeof map[group] === "object" ? map[group] : {};
      for (const key of Object.keys(dims[group])) {
        const leaf = src[key] && typeof src[key] === "object" ? src[key] : {};
        dims[group][key] = {
          level: clamp(leaf.level ?? 0.2),
          evidence_count: Number(leaf.evidence_count || 0),
          last_seen: leaf.last_seen || null
        };
      }
    }
    return {
      ...child,
      knowledge_map: {
        ...map,
        ...dims,
        topics: map.topics && typeof map.topics === "object" ? map.topics : {}
      }
    };
  }

  applyEvidence(child, evidence, concept) {
    const next = this.normalize(child);
    const now = new Date().toISOString();
    const kind = evidence?.kind;
    const bumps = this._bumpsFor(kind, evidence);
    for (const { group, key, delta } of bumps) {
      const leaf = next.knowledge_map[group][key];
      leaf.level = clamp(leaf.level + delta);
      leaf.evidence_count += 1;
      leaf.last_seen = now;
    }
    if (concept) {
      const topics = next.knowledge_map.topics;
      const prev = topics[concept] && typeof topics[concept] === "object" ? topics[concept] : { level: 0.2, evidence_count: 0 };
      topics[concept] = {
        level: clamp((prev.level || 0.2) + (kind === "misconception" ? -0.05 : 0.04)),
        evidence_count: Number(prev.evidence_count || 0) + 1,
        last_seen: now
      };
    }
    return {
      knowledge_map: next.knowledge_map,
      reasoning_profile: {
        ...(child.reasoning_profile || {}),
        last_kind: kind || null,
        last_concept: concept || null
      }
    };
  }

  gap(child, group, key) {
    const dims = this.normalize(child).knowledge_map;
    const leaf = dims?.[group]?.[key];
    return 1 - clamp(leaf?.level);
  }

  weakest(child, group) {
    const dims = this.normalize(child).knowledge_map[group] || {};
    let worst = null;
    for (const [key, leaf] of Object.entries(dims)) {
      if (!worst || (leaf.level || 0) < worst.level) worst = { key, level: leaf.level || 0 };
    }
    return worst;
  }

  _bumpsFor(kind, evidence) {
    const domain = evidence?.domain;
    const knowledgeKey = LEARNER_DIMENSIONS.knowledge.includes(domain) ? domain : "world";
    switch (kind) {
      case "question":
        return [
          { group: "learning", key: "question_formation", delta: 0.04 },
          { group: "becoming", key: "curiosity", delta: 0.03 }
        ];
      case "attempt":
        return [
          { group: "thinking", key: "problem_solving", delta: 0.04 },
          { group: "learning", key: "persistence", delta: 0.03 }
        ];
      case "misconception":
        return [
          { group: "knowledge", key: knowledgeKey, delta: -0.02 },
          { group: "learning", key: "self_correction", delta: 0.01 }
        ];
      case "insight":
        return [
          { group: "thinking", key: "reasoning", delta: 0.06 },
          { group: "knowledge", key: knowledgeKey, delta: 0.05 },
          { group: "becoming", key: "intellectual_humility", delta: 0.03 }
        ];
      case "self_correction":
        return [
          { group: "learning", key: "self_correction", delta: 0.07 },
          { group: "learning", key: "metacognition", delta: 0.05 }
        ];
      case "revision":
        return [
          { group: "learning", key: "self_correction", delta: 0.04 },
          { group: "thinking", key: "evidence", delta: 0.03 }
        ];
      case "confusion":
        return [
          { group: "learning", key: "metacognition", delta: 0.02 },
          { group: "learning", key: "persistence", delta: 0.02 }
        ];
      case "persistence":
        return [{ group: "learning", key: "persistence", delta: 0.05 }];
      case "curiosity":
        return [{ group: "becoming", key: "curiosity", delta: 0.05 }];
      case "perspective":
        return [
          { group: "thinking", key: "perspective_taking", delta: 0.05 },
          { group: "becoming", key: "empathy", delta: 0.03 }
        ];
      default:
        return [{ group: "becoming", key: "curiosity", delta: 0.01 }];
    }
  }
}

module.exports = { LearnerModel, emptyDimensions };
