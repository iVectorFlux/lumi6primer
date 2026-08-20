"use strict";

/**
 * VisualPlanner
 *
 * Responsibilities:
 * - Determine whether a visual explanation is genuinely needed.
 * - Return a structured plan (AtlasVisualSpec).
 *
 * Legacy fields (always present, unchanged):
 *   { shouldDraw, type, description }
 *
 * Semantic fields added in V1A (additional, never replace legacy fields):
 *   { subject, concept, visualType, preferredRenderer }
 *
 * Rules:
 * - ONLY draw when the topic is inherently visual (data structures, algorithms,
 *   scientific processes, mathematical diagrams, geometry, charts).
 * - NEVER draw for simple factual Q&A (capitals, dates, definitions, conversions).
 * - The bar for drawing is HIGH — text-only topics must not trigger drawing.
 */
class VisualPlanner {
  constructor(options = {}) {
    this.aiProvider = options.aiProvider || null;
  }

  async planVisual(teacherResponse, studentInput = "") {
    const textToAnalyze = `${studentInput} ${teacherResponse}`.toLowerCase();
    return this._analyzeHeuristics(teacherResponse, studentInput, textToAnalyze);
  }

  /**
   * Instant picture plan from the student's words. No model call.
   * Teaching always draws so kids see something immediately.
   */
  planVisualInstant(studentInput = "") {
    const input = String(studentInput || "").trim();
    const lower = input.toLowerCase()
      .replace(/\bhuman autonomy\b/g, "human anatomy")
      .replace(/\bautonomy\b/g, "anatomy");
    const description = lower
      .replace(/^(ok|okay|please|hey|hi|hello)[,.\s]*/i, "")
      .replace(/^(can you|could you|would you)\s+/i, "")
      .replace(/^(draw|show( me)?|explain|teach( me)?( about)?|illustrate)\s+(a|an|the)?\s*/i, "")
      .replace(/\?+$/, "")
      .trim() || "this idea";

    const enriched = this._enrichWithSemantics({ shouldDraw: true, type: "diagram", description }, lower, input);
    if (enriched.concept && enriched.concept !== "general_diagram" && enriched.concept !== "none") {
      return enriched;
    }

    return {
      shouldDraw: false,
      type: "none",
      description: "",
      subject: "none",
      concept: "none",
      visualType: "none",
      preferredRenderer: "lumi6"
    };
  }

  _analyzeHeuristics(teacherResponse, studentInput, textToAnalyze) {
    const input = String(studentInput || "").toLowerCase();

    // ── Hard BLOCK list ─────────────────────────────────────────────────────
    // Questions that are purely factual — NEVER draw these.
    const noDrawPatterns = [
      /what is the capital/,
      /capital of/,
      /who is/,
      /who was/,
      /when (was|did|is)/,
      /where is/,
      /how many/,
      /what year/,
      /how old/,
      /what language/,
      /who (invented|discovered|founded)/,
      /what does .+ mean/,
      /definition of/,
      /meaning of/,
      /translate/,
      /convert \d/,
      /\d+ (km|miles|kg|pounds|dollars|euros)/,
      /which is the (highest|longest|largest|smallest|biggest|deepest|fastest|slowest)/,
      /which (is|was|are|were)/,
      /highest mountain/,
      /longest river/,
      /largest ocean/,
    ];

    if (noDrawPatterns.some((p) => p.test(input))) {
      return { shouldDraw: false, type: "none", description: "" };
    }

    // ── Explicit draw-request keywords IN STUDENT INPUT ONLY ────────────────
    const visualCue = ["draw", "sketch", "show me", "show", "diagram", "illustrate", "visualize",
      "whiteboard", "plot", "chart", "flowchart", "put", "anatomy", "body"];
    const hasExplicitRequest = visualCue.some((k) => input.includes(k));

    if (!hasExplicitRequest) {
      return { shouldDraw: false, type: "none", description: "" };
    }

    // ── Determine type ──────────────────────────────────────────────────────
    let type = "diagram";
    if (textToAnalyze.includes("formula") || textToAnalyze.includes("equation") || textToAnalyze.includes("latex")) {
      type = "formula";
    } else if (textToAnalyze.includes("plot") || textToAnalyze.includes("curve") || textToAnalyze.includes("graph")) {
      type = "chart";
    }

    let description = input
      .replace(/^.*?\b(draw|sketch|diagram|visualize|illustrate|chart|flowchart|show me|put a diagram of)\b\s*(a|an|the)?\s*/i, "")
      .replace(/on (the )?canvas.*$/i, "")
      .trim() || "diagram";

    // Do not rewrite the child's words into a stock topic template.

    const base = { shouldDraw: true, type, description };
    return this._enrichWithSemantics(base, textToAnalyze, studentInput);
  }

  /**
   * Add semantic V1A fields to a base visual plan.
   * Never removes or overwrites existing fields.
   * @param {Object} base - Existing { shouldDraw, type, description }
   * @param {string} textToAnalyze - Lowercased combined input + response
   * @param {string} studentInput - Original user input
   * @returns {Object} Enriched AtlasVisualSpec
   */
  _enrichWithSemantics(base, textToAnalyze, studentInput = "") {
    if (!base.shouldDraw) {
      return {
        ...base,
        subject: "none",
        concept: "none",
        visualType: "none",
        preferredRenderer: "lumi6",
      };
    }

    const t = String(studentInput || textToAnalyze || "").toLowerCase()
      .replace(/\bhuman autonomy\b/g, "human anatomy")
      .replace(/\bautonomy\b/g, "anatomy");

    // ── Subject classification ───────────────────────────────────────────────
    let subject = "general";
    let concept = "general_diagram";
    let visualType = "diagram";
    let preferredRenderer = "lumi6";

    // Biology — match the student's request, not teacher metaphors.
    if (/human anatom|\banatomy\b|human body|body parts|organs of the body/i.test(t)) {
      subject = "biology"; concept = "human_anatomy"; visualType = "anatomical_diagram"; preferredRenderer = "biology-svg";
    } else if (/human heart|heart anatom|circulatory|\bheart\b|draw (a |the )?heart\b|show (me )?(a |the )?heart\b/i.test(t)) {
      subject = "biology"; concept = "human_heart"; visualType = "anatomical_diagram"; preferredRenderer = "biology-svg";
    } else if (/brain anatom|\bbrain\b/i.test(t)) {
      subject = "biology"; concept = "brain"; visualType = "anatomical_diagram"; preferredRenderer = "biology-svg";
    } else if (/\beye\b/i.test(t)) {
      subject = "biology"; concept = "eye"; visualType = "anatomical_diagram"; preferredRenderer = "biology-svg";
    } else if (/\bneuron\b/i.test(t)) {
      subject = "biology"; concept = "neuron"; visualType = "anatomical_diagram"; preferredRenderer = "biology-svg";
    } else if (/cell structure/i.test(t)) {
      subject = "biology"; concept = "cell_structure"; visualType = "anatomical_diagram"; preferredRenderer = "biology-svg";
    } else if (/kidney|nephron/i.test(t)) {
      subject = "biology"; concept = "nephron"; visualType = "anatomical_diagram"; preferredRenderer = "biology-svg";
    } else if (/digestive system/i.test(t)) {
      subject = "biology"; concept = "digestive_system"; visualType = "anatomical_diagram"; preferredRenderer = "biology-svg";
    } else if (/respiratory system|respiratory/i.test(t)) {
      subject = "biology"; concept = "respiratory_system"; visualType = "anatomical_diagram"; preferredRenderer = "biology-svg";
    } else if (/mitosis/i.test(t)) {
      subject = "biology"; concept = "mitosis"; visualType = "process_diagram"; preferredRenderer = "cytoscape";
    } else if (/meiosis/i.test(t)) {
      subject = "biology"; concept = "meiosis"; visualType = "process_diagram"; preferredRenderer = "cytoscape";
    } else if (/dna replication/i.test(t)) {
      subject = "biology"; concept = "dna_replication"; visualType = "process_diagram"; preferredRenderer = "cytoscape";
    } else if (/protein synthesis/i.test(t)) {
      subject = "biology"; concept = "protein_synthesis"; visualType = "process_diagram"; preferredRenderer = "cytoscape";
    } else if (/photosynthesis/i.test(t)) {
      subject = "biology"; concept = "photosynthesis"; visualType = "process_diagram"; preferredRenderer = "mermaid";
    } else if (/cell division/i.test(t)) {
      subject = "biology"; concept = "cell_division"; visualType = "process_diagram"; preferredRenderer = "cytoscape";
    }

    // Science processes
    else if (/water cycle|hydrologic|water form|water on (the )?earth|how (does|is) water|evaporation|rain cycle/i.test(t)) {
      subject = "science"; concept = "water_cycle"; visualType = "process_diagram"; preferredRenderer = "lumi6";
    } else if (/carbon cycle/i.test(t)) {
      subject = "science"; concept = "carbon_cycle"; visualType = "process_diagram"; preferredRenderer = "mermaid";
    } else if (/rock cycle/i.test(t)) {
      subject = "science"; concept = "rock_cycle"; visualType = "process_diagram"; preferredRenderer = "mermaid";
    } else if (/food chain/i.test(t)) {
      subject = "science"; concept = "food_chain"; visualType = "process_diagram"; preferredRenderer = "mermaid";
    } else if (/food web/i.test(t)) {
      subject = "science"; concept = "food_web"; visualType = "process_diagram"; preferredRenderer = "mermaid";
    } else if (/nitrogen cycle/i.test(t)) {
      subject = "science"; concept = "nitrogen_cycle"; visualType = "process_diagram"; preferredRenderer = "mermaid";
    } else if (/states of matter|phase change/i.test(t)) {
      subject = "science"; concept = "states_of_matter"; visualType = "process_diagram"; preferredRenderer = "mermaid";
    } else if (/volcano|volcanic eruption|volcanic/i.test(t)) {
      subject = "science"; concept = "volcanic_eruption"; visualType = "process_diagram"; preferredRenderer = "mermaid";
    } else if (/layers of earth|earth layers|earth structure/i.test(t)) {
      subject = "science"; concept = "layers_of_earth"; visualType = "process_diagram"; preferredRenderer = "mermaid";
    }

    // Chemistry
    else if (/molecule|molecular structure|chemical bond|structural formula|lewis structure/i.test(t)) {
      subject = "chemistry"; concept = "molecule"; visualType = "molecular_diagram"; preferredRenderer = "smiles";
    } else if (/\batom\b/i.test(t)) {
      subject = "chemistry"; concept = "atom"; visualType = "atomic_diagram"; preferredRenderer = "smiles";
    }

    // Physics
    else if (/refraction/i.test(t)) {
      subject = "physics"; concept = "refraction"; visualType = "ray_diagram"; preferredRenderer = "physics-svg";
    } else if (/reflection/i.test(t)) {
      subject = "physics"; concept = "reflection"; visualType = "ray_diagram"; preferredRenderer = "physics-svg";
    } else if (/lens diagram|ray diagram/i.test(t)) {
      subject = "physics"; concept = "lens_diagram"; visualType = "ray_diagram"; preferredRenderer = "physics-svg";
    } else if (/free body diagram/i.test(t)) {
      subject = "physics"; concept = "free_body_diagram"; visualType = "force_diagram"; preferredRenderer = "physics-svg";
    } else if (/projectile motion/i.test(t)) {
      subject = "physics"; concept = "projectile_motion"; visualType = "trajectory_diagram"; preferredRenderer = "physics-svg";
    } else if (/electric circuit/i.test(t)) {
      subject = "physics"; concept = "electric_circuit"; visualType = "circuit_diagram"; preferredRenderer = "physics-svg";
    } else if (/\bwave\b/i.test(t)) {
      subject = "physics"; concept = "wave"; visualType = "wave_diagram"; preferredRenderer = "physics-svg";
    } else if (/pendulum/i.test(t)) {
      subject = "physics"; concept = "pendulum"; visualType = "physics_diagram"; preferredRenderer = "physics-svg";
    }

    // Math — function plots
    else if (/quadratic/i.test(t) && !/formula/i.test(t)) {
      subject = "math"; concept = "quadratic_function"; visualType = "function_plot"; preferredRenderer = "jsxgraph";
    } else if (/\bplot\b|function plot|\bsinusoidal\b|\bcos(ine)?\b|\btan(gent)?\b/i.test(t)) {
      subject = "math"; concept = "function_plot"; visualType = "function_plot"; preferredRenderer = "jsxgraph";
    } else if (/unit circle/i.test(t)) {
      subject = "math"; concept = "unit_circle"; visualType = "function_plot"; preferredRenderer = "jsxgraph";
    } else if (/coordinate geometry/i.test(t)) {
      subject = "math"; concept = "coordinate_geometry"; visualType = "geometry_diagram"; preferredRenderer = "jsxgraph";
    } else if (/vector/i.test(t) && /math|physic/i.test(t)) {
      subject = "math"; concept = "vector_diagram"; visualType = "geometry_diagram"; preferredRenderer = "jsxgraph";
    }

    // Math — formulas/equations (stay on lumi6)
    else if (base.type === "formula") {
      subject = "math"; concept = "equation"; visualType = "formula"; preferredRenderer = "lumi6";
    }

    // CS / Algorithms (stay on lumi6)
    else if (/binary search/i.test(t)) {
      subject = "cs"; concept = "binary_search"; visualType = "algorithm_diagram"; preferredRenderer = "lumi6";
    } else if (/bubble sort/i.test(t)) {
      subject = "cs"; concept = "bubble_sort"; visualType = "algorithm_diagram"; preferredRenderer = "lumi6";
    } else if (/merge sort/i.test(t)) {
      subject = "cs"; concept = "merge_sort"; visualType = "algorithm_diagram"; preferredRenderer = "lumi6";
    } else if (/quick sort/i.test(t)) {
      subject = "cs"; concept = "quick_sort"; visualType = "algorithm_diagram"; preferredRenderer = "lumi6";
    } else if (/linked list/i.test(t)) {
      subject = "cs"; concept = "linked_list"; visualType = "data_structure_diagram"; preferredRenderer = "lumi6";
    } else if (/\bstack\b/i.test(t) && !/stack overflow/i.test(t)) {
      subject = "cs"; concept = "stack"; visualType = "data_structure_diagram"; preferredRenderer = "lumi6";
    } else if (/\bqueue\b/i.test(t)) {
      subject = "cs"; concept = "queue"; visualType = "data_structure_diagram"; preferredRenderer = "lumi6";
    } else if (/binary tree|\bbst\b|search tree/i.test(t)) {
      subject = "cs"; concept = "binary_tree"; visualType = "tree_diagram"; preferredRenderer = "lumi6";
    } else if (/graph traversal|\bbfs\b|\bdfs\b/i.test(t)) {
      subject = "cs"; concept = "graph_traversal"; visualType = "graph_diagram"; preferredRenderer = "lumi6";
    }

    return {
      ...base,
      subject,
      concept,
      visualType,
      preferredRenderer,
    };
  }
}

module.exports = VisualPlanner;
