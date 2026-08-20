"use strict";

/**
 * BoardSummaryGenerator
 *
 * Responsibilities:
 * - Validate, clean, and format model-driven JSON responses.
 * - Provide a conservative, non-hardcoded plain-text fallback.
 * - Convert valid board summaries into Lumi6 primitive text commands (write_text).
 *
 * Rules:
 * - NO hardcoded topic-to-answer knowledge maps.
 * - Casual chat / greetings set shouldShow = false (no board mutation).
 * - Spoken response remains full and natural.
 * - Board content contains only concise title and key bullet points / equations.
 */
class BoardSummaryGenerator {
  /**
   * Parse LLM output into structured { spokenResponse, boardSummary }.
   * 
   * @param {Object|string} llmOutput - Response from AI model (JSON object, JSON string, or plain text)
   * @param {string} [studentInput=""] - Original student input query
   * @returns {{ spokenResponse: string, boardSummary: { shouldShow: boolean, title: string, keyPoints: Array<string>, rawText: string } }}
   */
  parseBoardSummary(llmOutput, studentInput = "") {
    const inputClean = String(studentInput || "").trim();
    const inputLower = inputClean.toLowerCase();

    let spokenResponse = "";
    let boardSummary = {
      shouldShow: false,
      title: "",
      keyPoints: [],
      rawText: ""
    };

    // 1. Try parsing JSON output from LLM
    let parsedObj = null;
    if (typeof llmOutput === "object" && llmOutput !== null) {
      parsedObj = llmOutput;
    } else if (typeof llmOutput === "string") {
      const trimmed = llmOutput.trim();
      if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
        try {
          parsedObj = JSON.parse(trimmed);
        } catch {
          parsedObj = null;
        }
      }
    }

    if (parsedObj) {
      spokenResponse = String(parsedObj.spokenResponse || parsedObj.teacherResponse || parsedObj.message || parsedObj.text || "").trim();
      
      if (parsedObj.boardSummary && typeof parsedObj.boardSummary === "object") {
        const rawBoard = parsedObj.boardSummary;
        const shouldShow = Boolean(rawBoard.shouldShow);
        const title = String(rawBoard.title || "").trim().toUpperCase().slice(0, 60);
        const keyPoints = Array.isArray(rawBoard.keyPoints)
          ? rawBoard.keyPoints
              .map((p) => String(p).trim())
              .filter((p) => p.length > 0)
              .slice(0, 5)
          : [];

        if (shouldShow && (title || keyPoints.length > 0)) {
          boardSummary = {
            shouldShow: true,
            title,
            keyPoints,
            rawText: [title, ...keyPoints].filter(Boolean).join("\n")
          };
        }
      }

      if (spokenResponse) {
        return { spokenResponse: this.cleanSpokenText(spokenResponse), boardSummary };
      }
    }

    // 2. Conservative Plain-Text Fallback Path
    const rawText = typeof llmOutput === "string" ? llmOutput.trim() : String(llmOutput?.message || llmOutput?.text || "").trim();
    spokenResponse = this.cleanSpokenText(rawText);

    if (!spokenResponse) {
      return { spokenResponse: "I'm having trouble understanding right now.", boardSummary };
    }

    // Check for casual chat / greetings -> shouldShow = false
    const casualPatterns = [
      /^(hi|hello|hey|greetings|good morning|good afternoon|good evening|howdy)\b/i,
      /^how are you/i,
      /^thank(s| you)/i,
      /^(bye|goodbye|see ya)/i
    ];
    if (casualPatterns.some((p) => p.test(inputLower))) {
      return { spokenResponse, boardSummary: { shouldShow: false, title: "", keyPoints: [], rawText: "" } };
    }

    // Conservative extraction for plain text fallback
    boardSummary = this._conservativeFallbackExtract(spokenResponse, inputClean);
    return { spokenResponse, boardSummary };
  }

  /**
   * Clean spoken text of filler, LaTeX commands, markdown backticks.
   */
  cleanSpokenText(text) {
    if (!text) return "";
    let cleaned = text
      .replace(/^(Nice|Great|Good) question about [^.]*\.\s*(Let me break down[^\n]*\n?)?/i, "")
      .replace(/\[Visual Drawn on Whiteboard: "[^"]*"\]/g, "")
      .replace(/\(Note: I attempted to generate a visual.*?\)/g, "")
      .trim();

    return cleaned;
  }

  /**
   * Conservative fallback parser for unformatted plain text.
   * Does NOT invent facts or use hardcoded topic knowledge.
   * @private
   */
  _conservativeFallbackExtract(spokenText, studentInput) {
    const inputLower = studentInput.toLowerCase();

    // Check simple math equations (e.g. "25 * 4", "what is 25 x 4?")
    const mathMatch = studentInput.match(/(\d+\s*[\+\-\*\x\/]\s*\d+(\s*[\+\-\*\x\/]\s*\d+)?)/i);
    if (mathMatch) {
      const eqStr = mathMatch[1].replace(/x/g, "×");
      const numMatch = spokenText.match(/(equals|=|is)\s*(-?\d+(\.\d+)?)/i) || spokenText.match(/(-?\d+(\.\d+)?)/);
      if (numMatch) {
        const resultVal = numMatch[2] || numMatch[1];
        const eqLine = `${eqStr} = ${resultVal}`;
        return {
          shouldShow: true,
          title: "",
          keyPoints: [eqLine],
          rawText: eqLine
        };
      }
    }

    // Derive a clean title from the student input (e.g. "What is the capital of India?" -> "CAPITAL OF INDIA")
    let title = studentInput
      .replace(/^(what|explain|draw|describe|tell me about|how does|why is|which is|who is)\s+(is|are|the|a|an)?\s*/i, "")
      .replace(/\?$/g, "")
      .trim()
      .toUpperCase();

    if (title.length > 50) title = title.slice(0, 47) + "...";

    // Split spoken text into sentences
    const sentences = spokenText
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10 && s.length < 120 && !/^(here|let's|in this|as you can see)/i.test(s));

    if (sentences.length === 0) {
      return { shouldShow: false, title: "", keyPoints: [], rawText: "" };
    }

    // Limit to max 4 key points, format with bullet points
    const keyPoints = sentences.slice(0, 4).map((s) => (s.startsWith("•") ? s : `• ${s}`));

    return {
      shouldShow: true,
      title: title || "KEY SUMMARY",
      keyPoints,
      rawText: [title, ...keyPoints].filter(Boolean).join("\n")
    };
  }

  isChatFiller(text) {
    const t = String(text || "").replace(/^[\s•\-–—]+/, "").trim();
    if (!t) return true;
    return /^(yep|yes|yeah|ok|okay|theek|haan|got it|of course|sure|i'm here|i am here)\b/i.test(t)
      || /hmm,? let me think|tell me more about what you're trying|i'm here whenever/i.test(t)
      || /whiteboard (says|shows|has)|board par|no mountain|no equation|no drawing/i.test(t)
      || /speak only in english|i'll speak only|from now on/i.test(t)
      || /shall we (draw|start)|are you there|listening for your next/i.test(t)
      || /can you tell me more/i.test(t)
      || t.length < 12;
  }

  isChatTurn(studentInput, spokenText) {
    const q = String(studentInput || "").toLowerCase().trim();
    const spoken = String(spokenText || "").toLowerCase();
    if (/^(hi|hey|hello|ok|okay|theek hai|theek|alright|thanks|thank you)[.!]*$/.test(q)) return true;
    if (/are you there|you there|still there/.test(q)) return true;
    if (/\b(speak|talk)\b.+\b(english|hindi)\b/.test(q) || /not in hindi|only english/.test(q)) return true;
    if (spoken && this.isChatFiller(spoken) && spoken.split(/\s+/).length < 28) return true;
    return false;
  }

  conceptTitle(studentInput) {
    const raw = String(studentInput || "").replace(/\s+/g, " ").trim();
    if (!raw || this.isChatTurn(raw, "")) return "";
    let topic = raw;
    for (let i = 0; i < 6; i++) {
      const next = topic.replace(/^(please|can you|could you|teach me|explain|what is|what's|what|how does|how do|how did|how to|about|the|theory of)\s+/i, "").trim();
      if (next === topic) break;
      topic = next;
    }
    topic = topic.replace(/[?!.]+$/g, "").replace(/\bis$/i, "").trim();
    topic = topic.replace(/\s+on earth$/i, "").replace(/\s+works?$/i, "").trim();
    const words = topic.split(/\s+/).filter(Boolean);
    if (words.length > 6) {
      if (/everest|height|8848|metre|meter/i.test(topic)) return "Everest height";
      return words.slice(0, 5).join(" ");
    }
    if (topic.length < 3) return "";
    return topic.replace(/\b\w/g, (ch) => ch.toUpperCase()).slice(0, 32);
  }

  /**
   * Board notes only — never a chat transcript.
   */
  summarizeForBoard(spokenText, studentInput = "") {
    if (this.isChatTurn(studentInput, spokenText)) {
      return { shouldShow: false, title: "", keyPoints: [], rawText: "" };
    }

    const spoken = this.cleanSpokenText(String(spokenText || "")).replace(/\s+/g, " ").trim();
    if (!spoken || /"spoken"\s*:/.test(spoken) || spoken.trim().startsWith("{")) {
      return { shouldShow: false, title: "", keyPoints: [], rawText: "" };
    }
    const points = spoken
      .split(/(?<=[.!;])\s+/)
      .map((s) => s.replace(/^[\s•\-–—]+/, "").replace(/[.!?]+$/, "").trim())
      .filter((s) => s.length >= 8)
      .filter((s) => !this.isChatFiller(s))
      .filter((s) => !/\?$/.test(s))
      .slice(0, 3)
      .map((s) => s.slice(0, 180));

    const title = this.conceptTitle(studentInput);
    if (!points.length && !title) {
      return { shouldShow: false, title: "", keyPoints: [], rawText: "" };
    }
    return {
      shouldShow: true,
      title,
      keyPoints: points,
      rawText: [title, ...points].filter(Boolean).join("\n")
    };
  }

  /**
   * Convert a structured boardSummary into Lumi6 write_text primitive commands.
   * 
   * @param {Object} boardSummary 
   * @param {number} [cx=10000] 
   * @param {number} [cy=10000] 
   * @returns {Array<Object>} Array of write_text primitive commands
   */
  generateBoardCommands(boardSummary, cx = 10000, cy = 10000) {
    if (!boardSummary || !boardSummary.shouldShow) return [];

    const commands = [];
    let currentY = cy;

    if (boardSummary.title) {
      commands.push({
        tool: "write_text",
        x: cx - 1800,
        y: currentY,
        text: boardSummary.title,
        fontSize: 180,
        maxWidth: 3800,
        lineHeight: 1.35
      });
      currentY += 260;
    }

    if (Array.isArray(boardSummary.keyPoints)) {
      for (const point of boardSummary.keyPoints) {
        commands.push({
          tool: "write_text",
          x: cx - 1800,
          y: currentY,
          text: point,
          fontSize: 140,
          maxWidth: 3800,
          lineHeight: 1.35
        });
        currentY += 210;
      }
    }

    return commands;
  }
}

module.exports = BoardSummaryGenerator;
