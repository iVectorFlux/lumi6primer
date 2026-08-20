"use strict";

/**
 * VisualRouter — V1A
 *
 * Responsibilities:
 * - Accept an AtlasVisualSpec (the enriched output of VisualPlanner).
 * - Determine the PREFERRED future renderer for the concept.
 * - Return the ACTIVE renderer for the current phase (always "lumi6" in V1A).
 * - Never render anything.
 * - Never generate HTML or JavaScript.
 * - Never make network calls.
 * - Always fall back safely on any malformed input.
 *
 * preferredRenderer: what SHOULD render this concept in a future phase.
 * activeRenderer:    what ACTUALLY renders it right now (lumi6 for all in V1A).
 *
 * When a later phase activates a specialized renderer, only the activeRenderer
 * entry changes — VisualPlanner and VisualRouter do not need to be redesigned.
 */

// ---------------------------------------------------------------------------
// Recognized renderer identifiers
// ---------------------------------------------------------------------------
const KNOWN_RENDERERS = new Set([
  "lumi6",
  "mermaid",
  "jsxgraph",
  "smiles",
  "cytoscape",
  "vega-lite",
  "dot",
  "biology-svg",
  "science-svg",
  "physics-svg",
]);

// ---------------------------------------------------------------------------
// Concept → preferred renderer map.
// Keys are the normalized concept strings produced by VisualPlanner.
// Values are the renderer that SHOULD handle this concept when activated.
// ---------------------------------------------------------------------------
const CONCEPT_RENDERER_MAP = {
  // ── Biology ───────────────────────────────────────────────────────────────
  human_anatomy: "biology-svg",
  anatomy: "biology-svg",
  human_body: "biology-svg",
  human_heart: "biology-svg",
  heart: "biology-svg",
  circulatory_system: "biology-svg",
  brain: "biology-svg",
  eye: "biology-svg",
  neuron: "biology-svg",
  cell: "biology-svg",
  cell_structure: "biology-svg",
  digestive_system: "biology-svg",
  respiratory_system: "biology-svg",
  kidney: "biology-svg",
  nephron: "biology-svg",

  // ── Science process diagrams ──────────────────────────────────────────────
  water_cycle: "mermaid",
  hydrologic_cycle: "mermaid",
  carbon_cycle: "mermaid",
  photosynthesis: "mermaid",
  rock_cycle: "mermaid",
  food_chain: "mermaid",
  food_web: "mermaid",
  nitrogen_cycle: "mermaid",
  states_of_matter: "mermaid",
  volcanic_eruption: "mermaid",
  layers_of_earth: "mermaid",

  // ── Biological pathways ───────────────────────────────────────────────────
  cell_division: "cytoscape",
  mitosis: "cytoscape",
  meiosis: "cytoscape",
  dna_replication: "cytoscape",
  protein_synthesis: "cytoscape",

  // ── Chemistry ─────────────────────────────────────────────────────────────
  molecule: "smiles",
  molecular_structure: "smiles",
  atom: "smiles",
  lewis_structure: "smiles",
  structural_formula: "smiles",
  chemical_bond: "smiles",

  // ── Math — function/geometry plots ────────────────────────────────────────
  function_plot: "jsxgraph",
  quadratic_function: "jsxgraph",
  linear_function: "jsxgraph",
  trigonometric_function: "jsxgraph",
  coordinate_geometry: "jsxgraph",
  unit_circle: "jsxgraph",
  derivative: "jsxgraph",
  integral: "jsxgraph",
  conic_section: "jsxgraph",
  vector_diagram: "jsxgraph",

  // ── Physics diagrams ──────────────────────────────────────────────────────
  refraction: "physics-svg",
  reflection: "physics-svg",
  lens_diagram: "physics-svg",
  mirror_diagram: "physics-svg",
  ray_diagram: "physics-svg",
  free_body_diagram: "physics-svg",
  projectile_motion: "physics-svg",
  electric_circuit: "physics-svg",
  wave: "physics-svg",
  pendulum: "physics-svg",

  // ── CS / Algorithms — these stay on lumi6 (already work well) ───────────
  binary_search: "lumi6",
  bubble_sort: "lumi6",
  merge_sort: "lumi6",
  quick_sort: "lumi6",
  linked_list: "lumi6",
  stack: "lumi6",
  queue: "lumi6",
  binary_tree: "lumi6",
  graph_traversal: "lumi6",

  // ── Math — formula solving (already works well on lumi6) ────────────────
  equation: "lumi6",
  formula: "lumi6",
};

// In V1A, every renderer that is NOT lumi6 is not yet activated.
// These are the renderers that have been activated for use.
const ACTIVATED_RENDERERS = new Set(["lumi6", "mermaid", "biology-svg"]);

// 0
// ---------------------------------------------------------------------------
// VisualRouter class
// ---------------------------------------------------------------------------
class VisualRouter {
  /**
   * Route an AtlasVisualSpec to the appropriate renderer.
   *
   * @param {Object} spec - AtlasVisualSpec from VisualPlanner.
   * @param {boolean} [spec.shouldDraw] - Whether drawing is needed.
   * @param {string}  [spec.concept]   - Normalized concept identifier.
   * @param {string}  [spec.renderer]  - Renderer hint from VisualPlanner.
   * @returns {{
   *   preferredRenderer: string,
   *   activeRenderer: string,
   *   reason: string,
   *   activated: boolean
   * }}
   */
  route(spec) {
    // ── Guard: malformed or missing spec ────────────────────────────────────
    if (!spec || typeof spec !== "object") {
      return this._fallback("Malformed or missing visual spec");
    }

    // ── Guard: no drawing needed ─────────────────────────────────────────────
    if (!spec.shouldDraw) {
      return {
        preferredRenderer: "lumi6",
        activeRenderer: "lumi6",
        reason: "No visual required",
        activated: true,
      };
    }

    // ── Determine preferred renderer ─────────────────────────────────────────
    const concept = this._normalizeConcept(spec.concept);
    // const hintRenderer = this._normalizeRenderer(spec.renderer);
    const hintRenderer = this._normalizeRenderer(spec.preferredRenderer || spec.renderer);

    let preferredRenderer = "lumi6";

    // 1. Exact concept map lookup
    if (concept && CONCEPT_RENDERER_MAP[concept]) {
      preferredRenderer = CONCEPT_RENDERER_MAP[concept];
    }
    // 2. Renderer hint from VisualPlanner (validated)
    else if (hintRenderer && KNOWN_RENDERERS.has(hintRenderer)) {
      preferredRenderer = hintRenderer;
    }
    // 3. Default
    else {
      preferredRenderer = "lumi6";
    }

    // ── Determine active renderer ────────────────────────────────────────────
    const activated = ACTIVATED_RENDERERS.has(preferredRenderer);
    const activeRenderer = activated ? preferredRenderer : "lumi6";

    const reason = activated
      ? `Renderer '${preferredRenderer}' is active`
      : `Renderer '${preferredRenderer}' not yet activated — using lumi6 fallback (V1A)`;

    return { preferredRenderer, activeRenderer, reason, activated };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Normalize a concept string to a safe underscore_case key.
   * Returns empty string if the input is not a usable string.
   * @param {*} concept
   * @returns {string}
   */
  _normalizeConcept(concept) {
    if (!concept || typeof concept !== "string") return "";
    return concept
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 80);
  }

  /**
   * Normalize a renderer string to lowercase.
   * @param {*} renderer
   * @returns {string}
   */
  _normalizeRenderer(renderer) {
    if (!renderer || typeof renderer !== "string") return "";
    return renderer.toLowerCase().trim();
  }

  /**
   * Safe fallback routing decision.
   * @param {string} reason
   * @returns {Object}
   */
  _fallback(reason) {
    return {
      preferredRenderer: "lumi6",
      activeRenderer: "lumi6",
      reason,
      activated: true,
    };
  }
}

module.exports = VisualRouter;
