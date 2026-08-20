"use strict";

/**
 * AtlasMermaidTemplates
 *
 * Trusted, deterministic Mermaid source templates for educational science process diagrams.
 *
 * Rules:
 * - ALL source is hardcoded application data — never LLM-generated.
 * - No network calls. No eval. No dynamic code generation.
 * - The `source` field must be valid Mermaid flowchart syntax.
 * - The `title` field is the widget title shown to the student.
 * - All templates use `flowchart TD` (top-down) for vertical readability.
 * - Node labels use plain English — no HTML, no CSS injection.
 *
 * Adding a new template:
 *   1. Add an entry to TEMPLATES with a snake_case concept key.
 *   2. Add unit tests in test/atlas/mermaid-templates.test.js.
 *   3. Add the concept to CONCEPT_RENDERER_MAP in visual-router.js (already done for mermaid concepts).
 */

const TEMPLATES = {
  // ── Water / Hydrologic Cycle ────────────────────────────────────────────────
  water_cycle: {
    title: "The Water Cycle",
    sourceFormat: "mermaid",
    source: `graph TD
  A["💧 Collection\\n(Oceans, Lakes, Rivers)"]
  B["☀️ Evaporation\\n(Sun heats surface water → water vapour)"]
  C["☁️ Condensation\\n(Water vapour cools → forms clouds)"]
  D["🌧️ Precipitation\\n(Rain, Snow, Sleet, Hail)"]
  E["🏔️ Surface Runoff & Infiltration\\n(Flows back to rivers and groundwater)"]

  A --> B --> C --> D --> E --> A`
  },

  // ── Photosynthesis ───────────────────────────────────────────────────────────
  photosynthesis: {
    title: "Photosynthesis",
    sourceFormat: "mermaid",
    source: `graph TD
  A["🌞 Light Energy\\n(Sunlight absorbed by chlorophyll)"]
  B["💧 Water (H₂O)\\n(Absorbed from soil via roots)"]
  C["💨 Carbon Dioxide (CO₂)\\n(Absorbed from air through stomata)"]
  D["🍃 Light-Dependent Reactions\\n(In thylakoids — produce ATP & NADPH)"]
  E["🔄 Calvin Cycle\\n(In stroma — uses ATP & NADPH)"]
  F["🍬 Glucose (C₆H₁₂O₆)\\n(Sugar — energy for the plant)"]
  G["💨 Oxygen (O₂)\\n(Released as a by-product)"]

  A --> D
  B --> D
  C --> E
  D --> E
  E --> F
  D --> G`
  },

  // ── Carbon Cycle ────────────────────────────────────────────────────────────
  carbon_cycle: {
    title: "The Carbon Cycle",
    sourceFormat: "mermaid",
    source: `graph TD
  A["🌿 Plants & Algae\\n(Photosynthesis absorbs CO₂)"]
  B["🌍 Atmosphere\\n(CO₂ pool)"]
  C["🐾 Animals & Humans\\n(Respiration releases CO₂)"]
  D["💀 Decomposers\\n(Break down dead matter → CO₂)"]
  E["🔥 Fossil Fuels\\n(Coal, Oil, Gas — ancient carbon)"]
  F["🏭 Combustion\\n(Burning releases stored carbon)"]
  G["🌊 Oceans\\n(Absorb and release CO₂)"]

  B --> A
  A --> C
  C --> D
  D --> B
  C --> B
  E --> F --> B
  G --> B
  B --> G`
  },

  // ── Nitrogen Cycle ──────────────────────────────────────────────────────────
  nitrogen_cycle: {
    title: "The Nitrogen Cycle",
    sourceFormat: "mermaid",
    source: `graph TD
  A["💨 Atmospheric Nitrogen (N₂)\\n(78% of air — unusable by most organisms)"]
  B["🦠 Nitrogen Fixation\\n(Bacteria convert N₂ → Ammonium NH₄⁺)"]
  C["🌱 Nitrification\\n(NH₄⁺ → Nitrites NO₂⁻ → Nitrates NO₃⁻)"]
  D["🌿 Plant Uptake\\n(Roots absorb nitrates — used for proteins)"]
  E["🐾 Animals\\n(Eat plants — nitrogen in proteins)"]
  F["💀 Decomposition\\n(Dead matter → Ammonium NH₄⁺)"]
  G["🔄 Denitrification\\n(Bacteria convert NO₃⁻ → N₂ back to air)"]

  A --> B --> C --> D --> E --> F --> C
  F --> B
  C --> G --> A`
  },

  // ── Rock Cycle ──────────────────────────────────────────────────────────────
  rock_cycle: {
    title: "The Rock Cycle",
    sourceFormat: "mermaid",
    source: `graph TD
  A["🌋 Magma / Lava\\n(Molten rock beneath Earth's surface)"]
  B["🪨 Igneous Rock\\n(Forms when magma cools and solidifies)"]
  C["⚙️ Weathering & Erosion\\n(Wind, water, ice break rocks down)"]
  D["🏖️ Sediments\\n(Fragments transported and deposited)"]
  E["🗿 Sedimentary Rock\\n(Layers compacted and cemented)"]
  F["🔥 Heat & Pressure\\n(Deep burial or tectonic forces)"]
  G["💎 Metamorphic Rock\\n(Rock changed by heat and pressure)"]

  A --> B --> C --> D --> E --> F --> G
  G --> F --> A
  E --> F --> A
  B --> F --> G`
  },

  // ── Food Chain ───────────────────────────────────────────────────────────────
  food_chain: {
    title: "A Food Chain",
    sourceFormat: "mermaid",
    source: `graph TD
  A["☀️ Sun\\n(Primary energy source)"]
  B["🌿 Producers\\n(Plants, Algae — make food via photosynthesis)"]
  C["🐛 Primary Consumers\\n(Herbivores — eat producers)"]
  D["🐸 Secondary Consumers\\n(Carnivores — eat herbivores)"]
  E["🦅 Tertiary Consumers\\n(Top predators — eat secondary consumers)"]
  F["🦠 Decomposers\\n(Fungi, Bacteria — break down dead matter)"]
  G["🌱 Nutrients returned to soil"]

  A --> B --> C --> D --> E
  E --> F --> G --> B
  D --> F
  C --> F`
  },

  // ── Food Web ─────────────────────────────────────────────────────────────────
  food_web: {
    title: "A Food Web",
    sourceFormat: "mermaid",
    source: `graph TD
  A["🌿 Grass / Plants"]
  B["🌾 Shrubs / Seeds"]
  C["🐛 Caterpillar"]
  D["🐇 Rabbit"]
  E["🐭 Mouse"]
  F["🐸 Frog"]
  G["🐍 Snake"]
  H["🦅 Hawk / Eagle"]
  I["🦠 Decomposers"]

  A --> C --> F --> G --> H
  A --> D --> H
  B --> E --> G
  B --> D
  C --> H
  G --> I
  H --> I
  E --> I`
  },

  // ── States of Matter ─────────────────────────────────────────────────────────
  states_of_matter: {
    title: "States of Matter & Phase Changes",
    sourceFormat: "mermaid",
    source: `graph TD
  A["🧊 Solid\\n(Fixed shape & volume)"]
  B["💧 Liquid\\n(Fixed volume, takes shape of container)"]
  C["💨 Gas\\n(No fixed shape or volume)"]
  D["⚡ Plasma\\n(Ionized gas at extreme temperature)"]

  A -- "Melting (heat added)" --> B
  B -- "Freezing (heat removed)" --> A
  B -- "Vaporization / Boiling" --> C
  C -- "Condensation" --> B
  A -- "Sublimation" --> C
  C -- "Deposition" --> A
  C -- "Ionization" --> D`
  },

  // ── Volcanic Eruption ───────────────────────────────────────────────────────
  volcanic_eruption: {
    title: "Volcanic Eruption Process",
    sourceFormat: "mermaid",
    source: `graph TD
  A["🔥 Magma Chamber\\n(Molten rock beneath Earth's crust)"]
  B["⬆️ Magma Rise\\n(Buoyant magma rises through main vent)"]
  C["💥 Pressure Accumulation\\n(Dissolved gases expand near surface)"]
  D["🌋 Eruption Column\\n(Ash, steam, & pyroclastic material launched)"]
  E["🌊 Lava Flow & Ash Fall\\n(Lava flows down slopes, ash settles)"]

  A --> B --> C --> D --> E`
  },

  // ── Layers of Earth ─────────────────────────────────────────────────────────
  layers_of_earth: {
    title: "Layers of the Earth",
    sourceFormat: "mermaid",
    source: `graph TD
  A["🌍 Atmosphere\\n(Air envelope around Earth)"]
  B["🪨 Crust\\n(Solid outer layer: 5–70 km thick)"]
  C["🌊 Mantle\\n(Semi-fluid silicate rock: ~2,900 km thick)"]
  D["🔥 Outer Core\\n(Liquid iron & nickel: ~2,200 km thick)"]
  E["💎 Inner Core\\n(Solid iron & nickel sphere: ~1,220 km radius)"]

  A --> B --> C --> D --> E`
  },
};

/**
 * Retrieve a trusted Mermaid template by concept key.
 *
 * @param {string} concept - Snake_case concept key (e.g. "water_cycle").
 * @returns {{ title: string, sourceFormat: string, source: string } | null}
 */
function getTemplate(concept) {
  if (!concept || typeof concept !== "string") return null;
  const key = concept.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return TEMPLATES[key] || null;
}

/**
 * Check whether a trusted template exists for a concept.
 *
 * @param {string} concept
 * @returns {boolean}
 */
function hasTemplate(concept) {
  return getTemplate(concept) !== null;
}

/**
 * List all concept keys with available templates.
 *
 * @returns {string[]}
 */
function availableConcepts() {
  return Object.keys(TEMPLATES);
}

module.exports = { getTemplate, hasTemplate, availableConcepts, TEMPLATES };
