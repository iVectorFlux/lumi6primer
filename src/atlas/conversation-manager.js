"use strict";

/**
 * ConversationManager
 * 
 * Responsibilities:
 * - Receive student input.
 * - Send input with conversation context to the AI model.
 * - Return teacher's initial response.
 * - Maintain the current conversation context only (in-memory session history).
 * 
 * Constraints:
 * - Must NOT contain drawing logic.
 */
class ConversationManager {
  /**
   * @param {Object} [options]
   * @param {Object} [options.aiProvider] - Optional custom AI provider with generateTeacherResponse(history) method.
   * @param {Array} [options.initialHistory] - Initial conversation history.
   */
  constructor(options = {}) {
    this.aiProvider = options.aiProvider || this._defaultAiProvider();
    this.history = Array.isArray(options.initialHistory) ? [...options.initialHistory] : [];
  }

  /**
   * Return current conversation history.
   * @returns {Array<{role: string, content: string}>}
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * Clear current conversation history.
   */
  clearHistory() {
    this.history = [];
  }

  /**
   * Append a student message to history.
   * @param {string} content 
   */
  addStudentMessage(content) {
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("Student message must be a non-empty string.");
    }
    this.history.push({ role: "student", content: content.trim() });
  }

  /**
   * Append a teacher message to history.
   * @param {string} content 
   */
  addTeacherMessage(content) {
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("Teacher message must be a non-empty string.");
    }
    this.history.push({ role: "teacher", content: content.trim() });
  }

  /**
   * Receive student input, query AI provider, update history, and return initial teacher response.
   * @param {string} studentInput 
   * @returns {Promise<string>} Teacher response text
   */
  async processStudentInput(studentInput) {
    this.addStudentMessage(studentInput);

    try {
      const response = await this.aiProvider.generateTeacherResponse(this.getHistory());
      const teacherText = typeof response === "string" ? response : (response?.text || String(response));
      return teacherText;
    } catch (error) {
      const fallbackResponse = "I'm having trouble connecting right now. Could you please repeat your question?";
      return fallbackResponse;
    }
  }

  /**
   * Default fallback AI provider if none injected.
   * @private
   */
  _defaultAiProvider() {
    return {
      async generateTeacherResponse(history) {
        const lastMsg = history[history.length - 1]?.content || "";
        return `Hello! Let's explore "${lastMsg}".`;
      }
    };
  }
}

module.exports = ConversationManager;
