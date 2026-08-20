"use strict";

/**
 * Simulations appear only when a process must be seen over time.
 * This is a gate, not a toy drawer in the UI.
 */
class SimulationTool {
  needed(understanding) {
    const t = String(understanding?.raw || "").toLowerCase();
    return /\b(simulate|what happens if we (run|repeat)|over time|each step of the cycle)\b/.test(t);
  }
}

module.exports = SimulationTool;
