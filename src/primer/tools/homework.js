"use strict";

class HomeworkTool {
  needed(understanding) {
    return understanding?.intent === "homework";
  }

  guidance() {
    return "Read the work. Compute the exact arithmetic. Then teach the steps in kid words. Do not guess. Do not change their numbers.";
  }
}

module.exports = HomeworkTool;
