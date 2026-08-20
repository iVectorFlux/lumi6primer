"use strict";

class VisionTool {
  needed(understanding, decision) {
    return Boolean(understanding?.refersToBoard || (decision?.tools || []).includes("vision"));
  }

  caption(understanding) {
    if (!understanding?.refersToBoard) return "";
    return "Child is asking about their own marks. Transcribe handwritten math carefully: + is plus; × * or a small x between digits is multiply; ÷ / is divide. Compute the exact answer before you speak. Ignore printed tutor notes.";
  }
}

module.exports = VisionTool;
