"use strict";

/**
 * AtlasBiologyTemplates
 *
 * Trusted, clean SVG anatomical diagram templates for educational biology.
 *
 * Rules:
 * - Pure, standalone HTML documents containing embedded inline SVG graphics.
 * - No dynamic code generation or external network calls.
 * - Safe for injection into Lumi6 iframe widgets.
 */

const TEMPLATES = {
  // ── Human Heart ────────────────────────────────────────────────────────────
  human_heart: {
    title: "Human Heart Diagram",
    sourceFormat: "biology-svg",
    html: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <style>
    html, body { margin:0; padding:0; width:100%; height:100%; overflow:hidden; background:transparent; font-family:Inter, sans-serif; }
    .container { display:flex; flex-direction:column; align-items:center; justify-content:center; width:100%; height:100%; padding:10px; box-sizing:border-box; }
    svg { width:100%; height:100%; max-width:100%; max-height:100%; }
    text { font-family:Inter, sans-serif; font-size:13px; font-weight:600; fill:#1e293b; }
    .title { font-size:18px; font-weight:700; fill:#0f172a; text-anchor:middle; }
    .label-box { fill:#ffffff; stroke:#cbd5e1; stroke-width:1.5px; rx:4; }
  </style>
</head>
<body>
  <div class="container">
    <svg viewBox="0 0 600 450">
      <!-- Title -->
      <text x="300" y="30" class="title">Human Heart Anatomy</text>

      <!-- Superior & Inferior Vena Cava -->
      <path d="M 190,70 L 190,160 M 190,260 L 190,360" stroke="#2563eb" stroke-width="28" stroke-linecap="round" fill="none"/>
      
      <!-- Aorta & Pulmonary Artery Arches -->
      <path d="M 270,140 Q 300,50 360,110 Q 380,140 370,220" stroke="#dc2626" stroke-width="26" stroke-linecap="round" fill="none"/>
      <path d="M 330,150 Q 280,120 220,130" stroke="#0284c7" stroke-width="22" stroke-linecap="round" fill="none"/>

      <!-- Heart Outer Muscle Wall (Myocardium) -->
      <path d="M 220,130 C 120,160 140,320 300,410 C 460,320 480,160 380,130 Q 300,100 220,130 Z" fill="#ef4444" stroke="#b91c1c" stroke-width="4" opacity="0.9"/>
      
      <!-- Inner Chambers Outline -->
      <!-- Right Atrium -->
      <path d="M 170,160 Q 240,150 250,220 Q 180,240 170,160 Z" fill="#93c5fd" stroke="#1d4ed8" stroke-width="2"/>
      <!-- Right Ventricle -->
      <path d="M 180,245 Q 260,230 280,350 Q 210,330 180,245 Z" fill="#60a5fa" stroke="#1d4ed8" stroke-width="2"/>
      <!-- Left Atrium -->
      <path d="M 350,160 Q 420,160 420,220 Q 350,230 350,160 Z" fill="#fca5a5" stroke="#b91c1c" stroke-width="2"/>
      <!-- Left Ventricle -->
      <path d="M 345,240 Q 410,240 315,370 Q 295,350 345,240 Z" fill="#f87171" stroke="#b91c1c" stroke-width="2"/>
      
      <!-- Septum Divider -->
      <path d="M 290,210 L 295,385" stroke="#991b1b" stroke-width="8" stroke-linecap="round"/>

      <!-- Pointers and Labels -->
      <!-- Superior Vena Cava -->
      <line x1="70" y1="80" x2="185" y2="90" stroke="#475569" stroke-width="1.5" stroke-dasharray="3,3"/>
      <rect x="10" y="65" width="130" height="26" class="label-box"/>
      <text x="75" y="82" text-anchor="middle">Superior Vena Cava</text>

      <!-- Aorta -->
      <line x1="520" y1="70" x2="330" y2="70" stroke="#475569" stroke-width="1.5" stroke-dasharray="3,3"/>
      <rect x="470" y="55" width="90" height="26" class="label-box"/>
      <text x="515" y="72" text-anchor="middle">Aorta</text>

      <!-- Right Atrium Label -->
      <line x1="60" y1="180" x2="200" y2="190" stroke="#475569" stroke-width="1.5" stroke-dasharray="3,3"/>
      <rect x="15" y="165" width="105" height="26" class="label-box"/>
      <text x="67" y="182" text-anchor="middle">Right Atrium</text>

      <!-- Left Atrium Label -->
      <line x1="530" y1="180" x2="380" y2="190" stroke="#475569" stroke-width="1.5" stroke-dasharray="3,3"/>
      <rect x="475" y="165" width="95" height="26" class="label-box"/>
      <text x="522" y="182" text-anchor="middle">Left Atrium</text>

      <!-- Right Ventricle Label -->
      <line x1="60" y1="280" x2="220" y2="280" stroke="#475569" stroke-width="1.5" stroke-dasharray="3,3"/>
      <rect x="10" y="265" width="115" height="26" class="label-box"/>
      <text x="67" y="282" text-anchor="middle">Right Ventricle</text>

      <!-- Left Ventricle Label -->
      <line x1="530" y1="280" x2="360" y2="280" stroke="#475569" stroke-width="1.5" stroke-dasharray="3,3"/>
      <rect x="470" y="265" width="105" height="26" class="label-box"/>
      <text x="522" y="282" text-anchor="middle">Left Ventricle</text>

      <!-- Septum Label -->
      <line x1="500" y1="360" x2="295" y2="340" stroke="#475569" stroke-width="1.5" stroke-dasharray="3,3"/>
      <rect x="455" y="345" width="80" height="26" class="label-box"/>
      <text x="495" y="362" text-anchor="middle">Septum</text>
    </svg>
  </div>
</body>
</html>`
  },

  // ── Human Respiratory System ───────────────────────────────────────────────
  respiratory_system: {
    title: "Human Respiratory System",
    sourceFormat: "biology-svg",
    html: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <style>
    html, body { margin:0; padding:0; width:100%; height:100%; overflow:hidden; background:transparent; font-family:Inter, sans-serif; }
    .container { display:flex; flex-direction:column; align-items:center; justify-content:center; width:100%; height:100%; padding:10px; box-sizing:border-box; }
    svg { width:100%; height:100%; max-width:100%; max-height:100%; }
    text { font-family:Inter, sans-serif; font-size:13px; font-weight:600; fill:#1e293b; }
    .title { font-size:18px; font-weight:700; fill:#0f172a; text-anchor:middle; }
    .label-box { fill:#ffffff; stroke:#cbd5e1; stroke-width:1.5px; rx:4; }
  </style>
</head>
<body>
  <div class="container">
    <svg viewBox="0 0 600 450">
      <!-- Title -->
      <text x="300" y="30" class="title">Human Respiratory System Anatomy</text>

      <!-- Head / Nasal & Oral Cavity Outline -->
      <path d="M 260,50 Q 320,50 310,110 Q 280,120 280,140" fill="none" stroke="#94a3b8" stroke-width="3"/>
      
      <!-- Nasal & Oral Cavity -->
      <path d="M 280,65 L 295,85 L 280,105 L 280,135" fill="none" stroke="#38bdf8" stroke-width="6" stroke-linecap="round"/>

      <!-- Trachea (Windpipe) with Cartilage Rings -->
      <path d="M 280,135 L 280,230" stroke="#0284c7" stroke-width="18" stroke-linecap="round" fill="none"/>
      <line x1="272" y1="150" x2="288" y2="150" stroke="#ffffff" stroke-width="2"/>
      <line x1="272" y1="170" x2="288" y2="170" stroke="#ffffff" stroke-width="2"/>
      <line x1="272" y1="190" x2="288" y2="190" stroke="#ffffff" stroke-width="2"/>
      <line x1="272" y1="210" x2="288" y2="210" stroke="#ffffff" stroke-width="2"/>

      <!-- Bronchi Bifurcation -->
      <path d="M 280,230 Q 240,250 210,280 M 280,230 Q 320,250 350,280" stroke="#0284c7" stroke-width="10" stroke-linecap="round" fill="none"/>

      <!-- Right & Left Lungs -->
      <!-- Right Lung (3 lobes) -->
      <path d="M 210,240 C 130,250 120,380 220,390 C 260,390 260,300 210,240 Z" fill="#fca5a5" stroke="#e11d48" stroke-width="3" opacity="0.85"/>
      <!-- Left Lung (2 lobes, cardiac notch) -->
      <path d="M 350,240 C 430,250 440,380 340,390 C 300,390 310,310 350,240 Z" fill="#fca5a5" stroke="#e11d48" stroke-width="3" opacity="0.85"/>

      <!-- Diaphragm Muscle -->
      <path d="M 120,410 Q 280,350 440,410" fill="none" stroke="#b91c1c" stroke-width="8" stroke-linecap="round"/>

      <!-- Labels & Pointer Lines -->
      <!-- Nasal Cavity -->
      <line x1="100" y1="70" x2="285" y2="70" stroke="#475569" stroke-width="1.5" stroke-dasharray="3,3"/>
      <rect x="35" y="55" width="110" height="26" class="label-box"/>
      <text x="90" y="72" text-anchor="middle">Nasal Cavity</text>

      <!-- Pharynx / Larynx -->
      <line x1="100" y1="120" x2="280" y2="120" stroke="#475569" stroke-width="1.5" stroke-dasharray="3,3"/>
      <rect x="30" y="105" width="120" height="26" class="label-box"/>
      <text x="90" y="122" text-anchor="middle">Pharynx & Larynx</text>

      <!-- Trachea -->
      <line x1="100" y1="180" x2="272" y2="180" stroke="#475569" stroke-width="1.5" stroke-dasharray="3,3"/>
      <rect x="45" y="165" width="90" height="26" class="label-box"/>
      <text x="90" y="182" text-anchor="middle">Trachea</text>

      <!-- Bronchi -->
      <line x1="500" y1="240" x2="310" y2="255" stroke="#475569" stroke-width="1.5" stroke-dasharray="3,3"/>
      <rect x="460" y="225" width="80" height="26" class="label-box"/>
      <text x="500" y="242" text-anchor="middle">Bronchi</text>

      <!-- Lungs -->
      <line x1="500" y1="310" x2="380" y2="310" stroke="#475569" stroke-width="1.5" stroke-dasharray="3,3"/>
      <rect x="465" y="295" width="70" height="26" class="label-box"/>
      <text x="500" y="312" text-anchor="middle">Lungs</text>

      <!-- Diaphragm -->
      <line x1="500" y1="390" x2="370" y2="395" stroke="#475569" stroke-width="1.5" stroke-dasharray="3,3"/>
      <rect x="455" y="375" width="90" height="26" class="label-box"/>
      <text x="500" y="392" text-anchor="middle">Diaphragm</text>
    </svg>
  </div>
</body>
</html>`
  },

  // ── Human Anatomy (kid-friendly body overview) ────────────────────────────
  human_anatomy: {
    title: "Human Anatomy",
    sourceFormat: "biology-svg",
    html: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <style>
    html, body { margin:0; padding:0; width:100%; height:100%; overflow:hidden; background:transparent; font-family:Inter, sans-serif; }
    .container { display:flex; align-items:center; justify-content:center; width:100%; height:100%; padding:8px; box-sizing:border-box; }
    svg { width:100%; height:100%; max-width:100%; max-height:100%; }
    text { font-family:Inter, sans-serif; font-size:14px; font-weight:700; fill:#0f172a; }
    .title { font-size:22px; font-weight:800; fill:#0f172a; text-anchor:middle; }
    .hint { font-size:12px; font-weight:600; fill:#475569; text-anchor:middle; }
  </style>
</head>
<body>
  <div class="container">
    <svg viewBox="0 0 640 520">
      <text x="320" y="32" class="title">Human Anatomy</text>
      <text x="320" y="52" class="hint">The main organs that keep you alive</text>

      <!-- Head -->
      <circle cx="320" cy="100" r="42" fill="#fcd34d" stroke="#d97706" stroke-width="3"/>
      <circle cx="306" cy="94" r="5" fill="#1e293b"/>
      <circle cx="334" cy="94" r="5" fill="#1e293b"/>
      <path d="M 308,112 Q 320,122 332,112" fill="none" stroke="#b45309" stroke-width="3" stroke-linecap="round"/>

      <!-- Neck -->
      <rect x="308" y="140" width="24" height="22" rx="6" fill="#fbbf24"/>

      <!-- Torso -->
      <path d="M 250,160 Q 250,155 270,155 L 370,155 Q 390,155 390,160 L 400,330 Q 400,355 320,360 Q 240,355 240,330 Z" fill="#93c5fd" stroke="#1d4ed8" stroke-width="4"/>

      <!-- Arms -->
      <path d="M 250,175 Q 180,210 150,290" fill="none" stroke="#fbbf24" stroke-width="22" stroke-linecap="round"/>
      <path d="M 390,175 Q 460,210 490,290" fill="none" stroke="#fbbf24" stroke-width="22" stroke-linecap="round"/>
      <circle cx="150" cy="300" r="16" fill="#fcd34d"/>
      <circle cx="490" cy="300" r="16" fill="#fcd34d"/>

      <!-- Legs -->
      <path d="M 280,350 L 260,470" fill="none" stroke="#60a5fa" stroke-width="26" stroke-linecap="round"/>
      <path d="M 360,350 L 380,470" fill="none" stroke="#60a5fa" stroke-width="26" stroke-linecap="round"/>
      <ellipse cx="255" cy="488" rx="28" ry="12" fill="#1e293b"/>
      <ellipse cx="385" cy="488" rx="28" ry="12" fill="#1e293b"/>

      <!-- Lungs -->
      <ellipse cx="292" cy="220" rx="28" ry="38" fill="#fb7185" stroke="#be123c" stroke-width="2" opacity="0.95"/>
      <ellipse cx="348" cy="220" rx="28" ry="38" fill="#fb7185" stroke="#be123c" stroke-width="2" opacity="0.95"/>

      <!-- Heart -->
      <path d="M 320,228 C 304,212 286,224 292,244 C 298,260 320,272 320,272 C 320,272 342,260 348,244 C 354,224 336,212 320,228 Z" fill="#ef4444" stroke="#991b1b" stroke-width="2"/>

      <!-- Stomach -->
      <ellipse cx="320" cy="300" rx="34" ry="24" fill="#fb923c" stroke="#c2410c" stroke-width="2"/>

      <!-- Brain label -->
      <line x1="180" y1="78" x2="286" y2="90" stroke="#334155" stroke-width="2"/>
      <rect x="70" y="60" width="110" height="28" rx="8" fill="#fef08a" stroke="#ca8a04" stroke-width="2"/>
      <text x="125" y="80" text-anchor="middle">Brain</text>

      <!-- Lungs label -->
      <line x1="460" y1="200" x2="376" y2="214" stroke="#334155" stroke-width="2"/>
      <rect x="460" y="184" width="110" height="28" rx="8" fill="#fecdd3" stroke="#e11d48" stroke-width="2"/>
      <text x="515" y="204" text-anchor="middle">Lungs</text>

      <!-- Heart label -->
      <line x1="180" y1="250" x2="300" y2="248" stroke="#334155" stroke-width="2"/>
      <rect x="70" y="234" width="110" height="28" rx="8" fill="#fecaca" stroke="#dc2626" stroke-width="2"/>
      <text x="125" y="254" text-anchor="middle">Heart</text>

      <!-- Stomach label -->
      <line x1="460" y1="300" x2="354" y2="300" stroke="#334155" stroke-width="2"/>
      <rect x="460" y="284" width="120" height="28" rx="8" fill="#fed7aa" stroke="#ea580c" stroke-width="2"/>
      <text x="520" y="304" text-anchor="middle">Stomach</text>
    </svg>
  </div>
</body>
</html>`
  }
};

function getTemplate(concept) {
  if (!concept || typeof concept !== "string") return null;
  const key = concept.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const aliases = { anatomy: "human_anatomy", human_body: "human_anatomy", heart: "human_heart" };
  return TEMPLATES[key] || TEMPLATES[aliases[key]] || null;
}

function hasTemplate(concept) {
  return getTemplate(concept) !== null;
}

module.exports = { getTemplate, hasTemplate, TEMPLATES };
