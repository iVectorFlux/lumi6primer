"use strict";

const { topicGraphic } = require("./kid-graphics.js");

/**
 * WhiteboardController
 *
 * Converts a visual plan into Lumi6 drawing commands.
 * Always prefers native write_text so Lumi6 can place text boxes on the board.
 * Optional svg_picture is added only when a new diagram helps.
 */
class WhiteboardController {
  constructor(options = {}) {
    this.lumi6Client = options.lumi6Client || this._defaultLumi6Client();
  }

  translatePlanToCommands(visualPlan) {
    if (!visualPlan || !visualPlan.shouldDraw) return [];

    const commands = [];
    const writeText = Array.isArray(visualPlan.writeTextCommands)
      ? visualPlan.writeTextCommands.filter((c) => {
          if (!c || c.tool !== "write_text" || typeof c.text !== "string") return false;
          const text = c.text.trim();
          if (!text || text.startsWith("{") || /"spoken"\s*:/.test(text)) return false;
          return true;
        })
      : [];
    commands.push(...writeText);

    const wantPicture = visualPlan.drawPicture !== false && !visualPlan.annotateOnly;
    if (wantPicture) {
      const title = visualPlan.boardTitle || visualPlan.description || "Let's explore";
      const panels = visualPlan.panels || [];
      const graphic = topicGraphic(title, panels.length ? panels : undefined);
      if (graphic) commands.push(graphic);
    }

    return commands;
  }

  async drawOnWhiteboard(visualPlan) {
    if (!visualPlan) {
      return { success: true, commands: [], skipped: true };
    }

    try {
      let commands = [];
      if (visualPlan.shouldDraw) {
        commands = this.translatePlanToCommands(visualPlan);
      }

      if (!commands.length) {
        return { success: true, commands: [], skipped: true };
      }

      console.log("[ATLAS] Drawing commands:", commands.length, commands.map((c) => c.tool));
      const result = await this.lumi6Client.executeCommands(commands);
      if (result && result.success === false) {
        return { success: false, error: result.error || "Drawing failed." };
      }

      return { success: true, commands, drawnCount: result?.drawnCount || commands.length };
    } catch (error) {
      return { success: false, error: error.message || "Failed to draw." };
    }
  }

  _defaultLumi6Client() {
    return {
      async executeCommands(commands) {
        return { success: true, drawnCount: commands.length };
      }
    };
  }
}

module.exports = WhiteboardController;
