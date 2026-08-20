"use strict";

class MasteryService {
  constructor(learnerModel) {
    this.learnerModel = learnerModel;
  }

  topicLevel(child, concept) {
    const topics = child?.knowledge_map?.topics || {};
    const leaf = topics[concept];
    return Number(leaf?.level || 0.2);
  }

  readyFor(child, concept, prerequisiteLevels = []) {
    if (!prerequisiteLevels.length) return true;
    return prerequisiteLevels.every((level) => level >= 0.35);
  }

  growing(child) {
    const model = this.learnerModel.normalize(child);
    const becoming = model.knowledge_map.becoming || {};
    const thinking = model.knowledge_map.thinking || {};
    const avg = (group) => {
      const values = Object.values(group).map((leaf) => Number(leaf.level || 0));
      return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    };
    return {
      capable: avg(thinking),
      becoming: avg(becoming),
      independent: Number(model.knowledge_map.learning?.independent_learning?.level || 0.2)
    };
  }
}

module.exports = MasteryService;
