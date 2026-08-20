"use strict";

const { compilePicture } = require("./picture-compiler.js");
const { topicFromText } = require("../topic.js");

/**
 * Turn a model picture spec into a board command.
 * Any topic. No catalog of stock diagrams.
 */
class Lumi6CanvasTool {
  constructor(options = {}) {
    this.whiteboardController = options.whiteboardController;
    this.boardSummary = options.boardSummary;
  }

  shouldUse(decision, understanding) {
    return Boolean(understanding?.wantsDraw || understanding?.wantsExplain || decision?.action === "explain");
  }

  buildCommands(input = {}) {
    if (input.annotateOnly) return [];
    if (/can'?t see|cannot see|appears blank|resend a clear photo|no handwritten|photo of the whiteboard/i.test(input.spoken)) {
      return [];
    }
    const wantsPicture = Boolean(input.wantsDraw || input.wantsExplain || input.force);
    if (!wantsPicture && !input.picture && !input.svg) return [];
    const title = this._title(input);
    const graphic = compilePicture({
      picture: input.picture,
      svg: input.svg,
      title,
      spoken: input.spoken,
      wantsDraw: Boolean(input.wantsDraw),
      forceSketch: false
    });
    return graphic ? [graphic] : [];
  }

  buildWriteCommand(childText, lastSpoken) {
    const raw = String(childText || "").trim();
    if (!/\b(write|put|fill)\b/i.test(raw)) return null;
    let bit = raw
      .replace(/^(please |can you |could you |hey )?/i, "")
      .replace(/^(write|put|fill in)\s+(the )?(number |digit |answer |result )?/i, "")
      .replace(/[.!?]+$/g, "")
      .trim();
    const words = {
      zero: "0", one: "1", two: "2", three: "3", four: "4",
      five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10"
    };
    const key = bit.toLowerCase();
    if (words[key]) bit = words[key];
    if (/^(it|that|the answer|the result)$/i.test(bit)) {
      const hit = String(lastSpoken || "").match(/\b(?:is|equals?|result is)\s+(\d+)\b/i);
      bit = hit ? hit[1] : bit;
    }
    if (!bit || bit.length > 32) return null;
    return {
      tool: "write_text",
      text: bit,
      x: 8200,
      y: 9000,
      fontSize: 180,
      color: "#1d4ed8",
      maxWidth: 2400,
      lineHeight: 1.2
    };
  }

  async execute(input = {}) {
    const commands = this.buildCommands(input);
    return { commands, success: commands.length > 0 };
  }

  _isFollowUp(text) {
    const t = String(text || "").toLowerCase().trim();
    if (t.length > 90) return true;
    return /^(please )?(can you )?(explain|tell me|say|draw|sketch) (it|this|that|something)/i.test(t)
      || /^(i don't know|wait|but |and then)/i.test(t)
      || /\b(draw|diagram|picture|sketch)\b/.test(t);
  }

  _title(input) {
    const fromPicture = String(input.picture?.title || "").trim();
    if (fromPicture && fromPicture.split(/\s+/).length <= 8) return fromPicture.slice(0, 48);
    const concept = String(input.concept || "").trim();
    if (concept && !this._isFollowUp(concept) && concept.split(/\s+/).length <= 6) {
      return concept.replace(/\b\w/g, (ch) => ch.toUpperCase()).slice(0, 48);
    }
    const student = String(input.studentInput || "");
    if (!this._isFollowUp(student)) {
      const topic = topicFromText(student);
      if (topic && topic.split(/\s+/).length <= 5) {
        return topic.replace(/\b\w/g, (ch) => ch.toUpperCase()).slice(0, 48);
      }
    }
    return concept ? concept.replace(/\b\w/g, (ch) => ch.toUpperCase()).slice(0, 48) : "The idea";
  }
}

module.exports = Lumi6CanvasTool;
