"use strict";

const FONT = "Arial, Helvetica, sans-serif";

function withXmlns(svg) {
  const raw = String(svg || "").trim();
  if (!raw.includes("<svg")) return "";
  let out = raw;
  if (!/xmlns=/.test(out)) out = out.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  if (!/\swidth=/.test(out)) out = out.replace("<svg", '<svg width="900" height="620"');
  return out;
}

function escapeXml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function label(x, y, w, h, fill, stroke, text, textFill = "#0f172a") {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${fill}" stroke="${stroke}" stroke-width="3"/>
    <text x="${x + w / 2}" y="${y + h / 2 + 7}" text-anchor="middle" font-family="${FONT}" font-size="20" font-weight="800" fill="${textFill}">${escapeXml(text)}</text>`;
}

const CLOUDS = withXmlns(`<svg viewBox="0 0 900 620" width="900" height="620">
  <rect width="900" height="620" fill="#e0f2fe"/>
  <text x="450" y="48" text-anchor="middle" font-family="${FONT}" font-size="34" font-weight="800" fill="#0f172a">How Clouds Form</text>
  <circle cx="760" cy="118" r="54" fill="#facc15" stroke="#d97706" stroke-width="4"/>
  <g stroke="#f59e0b" stroke-width="6" stroke-linecap="round">
    <line x1="760" y1="48" x2="760" y2="28"/>
    <line x1="760" y1="188" x2="760" y2="208"/>
    <line x1="688" y1="118" x2="668" y2="118"/>
    <line x1="832" y1="118" x2="852" y2="118"/>
    <line x1="708" y1="66" x2="694" y2="52"/>
    <line x1="812" y1="170" x2="826" y2="184"/>
    <line x1="812" y1="66" x2="826" y2="52"/>
    <line x1="708" y1="170" x2="694" y2="184"/>
  </g>
  ${label(655, 226, 210, 40, "#fef08a", "#ca8a04", "1. Sun warms water")}
  <ellipse cx="450" cy="548" rx="290" ry="46" fill="#38bdf8" stroke="#0284c7" stroke-width="4"/>
  <ellipse cx="380" cy="534" rx="80" ry="18" fill="#7dd3fc"/>
  <text x="450" y="608" text-anchor="middle" font-family="${FONT}" font-size="20" font-weight="800" fill="#075985">Ocean / lake</text>
  <g fill="none" stroke="#7dd3fc" stroke-width="5" stroke-linecap="round">
    <path d="M 360,500 C 350,430 330,380 340,320"/>
    <path d="M 430,500 C 430,420 410,360 400,300"/>
    <path d="M 500,500 C 520,430 530,370 520,310"/>
  </g>
  ${label(40, 372, 250, 40, "#e0f2fe", "#0284c7", "2. Water rises as vapor")}
  <ellipse cx="430" cy="210" rx="110" ry="48" fill="#f8fafc" stroke="#64748b" stroke-width="3"/>
  <ellipse cx="360" cy="230" rx="70" ry="38" fill="#ffffff" stroke="#94a3b8" stroke-width="3"/>
  <ellipse cx="500" cy="228" rx="74" ry="40" fill="#ffffff" stroke="#94a3b8" stroke-width="3"/>
  <ellipse cx="430" cy="248" rx="90" ry="36" fill="#e2e8f0" stroke="#94a3b8" stroke-width="3"/>
  ${label(305, 138, 250, 40, "#f1f5f9", "#64748b", "3. Tiny drops make a cloud")}
  <g stroke="#2563eb" stroke-width="6" stroke-linecap="round">
    <line x1="390" y1="280" x2="375" y2="360"/>
    <line x1="430" y1="286" x2="430" y2="380"/>
    <line x1="470" y1="280" x2="488" y2="365"/>
    <line x1="350" y1="270" x2="330" y2="350"/>
    <line x1="510" y1="272" x2="530" y2="348"/>
  </g>
  ${label(620, 318, 230, 40, "#dbeafe", "#2563eb", "4. Drops fall as rain")}
</svg>`);

const WATER_CYCLE = withXmlns(`<svg viewBox="0 0 900 620" width="900" height="620">
  <rect width="900" height="620" fill="#ecfeff"/>
  <text x="450" y="46" text-anchor="middle" font-family="${FONT}" font-size="34" font-weight="800" fill="#0f172a">The Water Cycle</text>
  <circle cx="140" cy="120" r="48" fill="#facc15" stroke="#d97706" stroke-width="4"/>
  <ellipse cx="450" cy="540" rx="300" ry="48" fill="#38bdf8" stroke="#0284c7" stroke-width="4"/>
  <path d="M 120,430 L 280,430 L 250,540 L 90,540 Z" fill="#86efac" stroke="#16a34a" stroke-width="3"/>
  <ellipse cx="430" cy="200" rx="120" ry="50" fill="#f8fafc" stroke="#64748b" stroke-width="3"/>
  <ellipse cx="360" cy="220" rx="70" ry="38" fill="#fff" stroke="#64748b" stroke-width="3"/>
  <ellipse cx="500" cy="222" rx="72" ry="40" fill="#fff" stroke="#64748b" stroke-width="3"/>
  <path d="M 220,150 C 300,70 520,70 640,160" fill="none" stroke="#f59e0b" stroke-width="8" stroke-linecap="round"/>
  <polygon points="640,160 610,140 618,172" fill="#f59e0b"/>
  <path d="M 560,250 C 680,320 680,430 560,510" fill="none" stroke="#2563eb" stroke-width="8" stroke-linecap="round"/>
  <polygon points="560,510 548,478 582,488" fill="#2563eb"/>
  <path d="M 340,500 C 240,410 230,280 330,230" fill="none" stroke="#0ea5e9" stroke-width="8" stroke-linecap="round"/>
  <polygon points="330,230 348,258 312,252" fill="#0ea5e9"/>
  <g stroke="#2563eb" stroke-width="6" stroke-linecap="round">
    <line x1="400" y1="260" x2="390" y2="360"/>
    <line x1="450" y1="268" x2="450" y2="380"/>
    <line x1="500" y1="260" x2="512" y2="355"/>
  </g>
  ${label(40, 280, 200, 48, "#fef08a", "#ca8a04", "1. Evaporation")}
  ${label(640, 110, 220, 48, "#e2e8f0", "#64748b", "2. Condensation")}
  ${label(640, 360, 200, 48, "#bfdbfe", "#2563eb", "3. Rain")}
  ${label(40, 500, 200, 48, "#7dd3fc", "#0284c7", "4. Collection")}
</svg>`);

const ANATOMY = withXmlns(`<svg viewBox="0 0 900 620" width="900" height="620">
  <rect width="900" height="620" fill="#fff7ed"/>
  <text x="450" y="42" text-anchor="middle" font-family="${FONT}" font-size="34" font-weight="800" fill="#0f172a">Your Body</text>
  <text x="450" y="72" text-anchor="middle" font-family="${FONT}" font-size="18" font-weight="700" fill="#57534e">The team that keeps you alive</text>
  <circle cx="450" cy="130" r="48" fill="#fcd34d" stroke="#d97706" stroke-width="4"/>
  <circle cx="434" cy="122" r="6" fill="#1e293b"/>
  <circle cx="466" cy="122" r="6" fill="#1e293b"/>
  <path d="M 434,144 Q 450,156 466,144" fill="none" stroke="#b45309" stroke-width="4" stroke-linecap="round"/>
  <rect x="436" y="176" width="28" height="26" rx="8" fill="#fbbf24"/>
  <path d="M 360,200 Q 360,194 384,194 L 516,194 Q 540,194 540,200 L 552,390 Q 552,418 450,426 Q 348,418 348,390 Z" fill="#93c5fd" stroke="#1d4ed8" stroke-width="5"/>
  <path d="M 360,220 Q 270,250 230,340" fill="none" stroke="#fbbf24" stroke-width="26" stroke-linecap="round"/>
  <path d="M 540,220 Q 630,250 670,340" fill="none" stroke="#fbbf24" stroke-width="26" stroke-linecap="round"/>
  <circle cx="230" cy="352" r="18" fill="#fcd34d" stroke="#d97706" stroke-width="3"/>
  <circle cx="670" cy="352" r="18" fill="#fcd34d" stroke="#d97706" stroke-width="3"/>
  <path d="M 404,418 L 380,560" fill="none" stroke="#60a5fa" stroke-width="30" stroke-linecap="round"/>
  <path d="M 496,418 L 520,560" fill="none" stroke="#60a5fa" stroke-width="30" stroke-linecap="round"/>
  <ellipse cx="372" cy="578" rx="32" ry="14" fill="#1e293b"/>
  <ellipse cx="528" cy="578" rx="32" ry="14" fill="#1e293b"/>
  <ellipse cx="418" cy="268" rx="32" ry="44" fill="#fb7185" stroke="#be123c" stroke-width="3"/>
  <ellipse cx="482" cy="268" rx="32" ry="44" fill="#fb7185" stroke="#be123c" stroke-width="3"/>
  <path d="M 450,276 C 430,256 408,270 416,294 C 424,314 450,328 450,328 C 450,328 476,314 484,294 C 492,270 470,256 450,276 Z" fill="#ef4444" stroke="#991b1b" stroke-width="3"/>
  <ellipse cx="450" cy="352" rx="40" ry="28" fill="#fb923c" stroke="#c2410c" stroke-width="3"/>
  <line x1="210" y1="108" x2="410" y2="118" stroke="#334155" stroke-width="3"/>
  ${label(70, 86, 140, 40, "#fef08a", "#ca8a04", "Brain thinks")}
  <line x1="690" y1="250" x2="514" y2="262" stroke="#334155" stroke-width="3"/>
  ${label(690, 228, 160, 40, "#fecdd3", "#e11d48", "Lungs breathe")}
  <line x1="210" y1="300" x2="420" y2="292" stroke="#334155" stroke-width="3"/>
  ${label(70, 278, 140, 40, "#fecaca", "#dc2626", "Heart pumps")}
  <line x1="690" y1="352" x2="490" y2="352" stroke="#334155" stroke-width="3"/>
  ${label(690, 330, 180, 40, "#fed7aa", "#ea580c", "Stomach helps eat")}
</svg>`);

const HEART = withXmlns(`<svg viewBox="0 0 900 620" width="900" height="620">
  <rect width="900" height="620" fill="#fff1f2"/>
  <text x="450" y="44" text-anchor="middle" font-family="${FONT}" font-size="34" font-weight="800" fill="#0f172a">Your Heart</text>
  <text x="450" y="74" text-anchor="middle" font-family="${FONT}" font-size="18" font-weight="700" fill="#9f1239">A strong pump with two jobs</text>
  <path d="M 300,90 L 300,180" stroke="#2563eb" stroke-width="28" stroke-linecap="round"/>
  <path d="M 300,300 L 300,400" stroke="#2563eb" stroke-width="28" stroke-linecap="round"/>
  <path d="M 390,170 Q 430,70 510,130 Q 540,170 528,270" fill="none" stroke="#dc2626" stroke-width="26" stroke-linecap="round"/>
  <path d="M 470,180 Q 400,140 320,150" fill="none" stroke="#0284c7" stroke-width="22" stroke-linecap="round"/>
  <path d="M 320,150 C 180,190 210,390 450,500 C 690,390 720,190 580,150 Q 450,110 320,150 Z" fill="#ef4444" stroke="#b91c1c" stroke-width="5"/>
  <path d="M 250,200 Q 350,186 360,270 Q 260,296 250,200 Z" fill="#93c5fd" stroke="#1d4ed8" stroke-width="3"/>
  <path d="M 262,300 Q 370,280 400,430 Q 290,410 262,300 Z" fill="#60a5fa" stroke="#1d4ed8" stroke-width="3"/>
  <path d="M 500,200 Q 610,200 610,270 Q 500,286 500,200 Z" fill="#fca5a5" stroke="#b91c1c" stroke-width="3"/>
  <path d="M 492,300 Q 600,300 460,450 Q 430,420 492,300 Z" fill="#f87171" stroke="#b91c1c" stroke-width="3"/>
  <path d="M 430,260 L 438,470" stroke="#991b1b" stroke-width="10" stroke-linecap="round"/>
  ${label(40, 70, 200, 40, "#dbeafe", "#2563eb", "From the body")}
  ${label(660, 70, 200, 40, "#fecaca", "#dc2626", "To the body")}
  ${label(40, 210, 170, 40, "#bfdbfe", "#1d4ed8", "Right atrium")}
  ${label(690, 210, 160, 40, "#fecaca", "#b91c1c", "Left atrium")}
  ${label(40, 330, 190, 40, "#93c5fd", "#1d4ed8", "Right ventricle")}
  ${label(690, 330, 180, 40, "#fca5a5", "#b91c1c", "Left ventricle")}
  ${label(250, 560, 400, 40, "#ffe4e6", "#9f1239", "Left = body   Right = lungs")}
</svg>`);

const RESPIRATORY = withXmlns(`<svg viewBox="0 0 900 620" width="900" height="620">
  <rect width="900" height="620" fill="#f0f9ff"/>
  <text x="450" y="44" text-anchor="middle" font-family="${FONT}" font-size="34" font-weight="800" fill="#0f172a">How You Breathe</text>
  <circle cx="450" cy="110" r="46" fill="#fcd34d" stroke="#d97706" stroke-width="4"/>
  <circle cx="434" cy="102" r="6" fill="#1e293b"/>
  <circle cx="466" cy="102" r="6" fill="#1e293b"/>
  <path d="M 450,92 L 450,128" stroke="#38bdf8" stroke-width="8" stroke-linecap="round"/>
  <path d="M 450,150 L 450,250" stroke="#0284c7" stroke-width="20" stroke-linecap="round"/>
  <g stroke="#fff" stroke-width="3">
    <line x1="440" y1="170" x2="460" y2="170"/>
    <line x1="440" y1="195" x2="460" y2="195"/>
    <line x1="440" y1="220" x2="460" y2="220"/>
  </g>
  <path d="M 450,250 Q 390,280 340,330" fill="none" stroke="#0284c7" stroke-width="12" stroke-linecap="round"/>
  <path d="M 450,250 Q 510,280 560,330" fill="none" stroke="#0284c7" stroke-width="12" stroke-linecap="round"/>
  <path d="M 340,280 C 230,300 220,470 360,490 C 410,490 410,360 340,280 Z" fill="#fb7185" stroke="#e11d48" stroke-width="4"/>
  <path d="M 560,280 C 670,300 680,470 540,490 C 490,490 490,360 560,280 Z" fill="#fb7185" stroke="#e11d48" stroke-width="4"/>
  <path d="M 220,520 Q 450,450 680,520" fill="none" stroke="#b91c1c" stroke-width="10" stroke-linecap="round"/>
  ${label(40, 80, 160, 40, "#e0f2fe", "#0284c7", "Nose / mouth")}
  ${label(40, 180, 140, 40, "#bae6fd", "#0369a1", "Windpipe")}
  ${label(700, 300, 140, 40, "#fecdd3", "#e11d48", "Lungs")}
  ${label(700, 490, 150, 40, "#fecaca", "#b91c1c", "Diaphragm")}
  ${label(250, 560, 400, 40, "#dbeafe", "#1d4ed8", "Oxygen goes into your blood")}
</svg>`);

const PHOTOSYNTHESIS = withXmlns(`<svg viewBox="0 0 900 620" width="900" height="620">
  <rect width="900" height="620" fill="#ecfccb"/>
  <text x="450" y="44" text-anchor="middle" font-family="${FONT}" font-size="34" font-weight="800" fill="#14532d">Photosynthesis</text>
  <circle cx="140" cy="120" r="52" fill="#facc15" stroke="#d97706" stroke-width="4"/>
  <g stroke="#f59e0b" stroke-width="6" stroke-linecap="round">
    <line x1="140" y1="48" x2="140" y2="28"/>
    <line x1="140" y1="192" x2="140" y2="212"/>
    <line x1="68" y1="120" x2="48" y2="120"/>
    <line x1="212" y1="120" x2="232" y2="120"/>
  </g>
  ${label(40, 230, 200, 40, "#fef08a", "#ca8a04", "1. Sunlight")}
  <rect x="410" y="220" width="28" height="220" rx="10" fill="#16a34a"/>
  <ellipse cx="360" cy="280" rx="70" ry="36" fill="#4ade80" stroke="#15803d" stroke-width="3"/>
  <ellipse cx="490" cy="250" rx="78" ry="38" fill="#22c55e" stroke="#15803d" stroke-width="3"/>
  <ellipse cx="500" cy="320" rx="64" ry="32" fill="#86efac" stroke="#15803d" stroke-width="3"/>
  <path d="M 390,440 Q 424,500 390,560" fill="none" stroke="#854d0e" stroke-width="8"/>
  <path d="M 458,440 Q 424,500 470,560" fill="none" stroke="#854d0e" stroke-width="8"/>
  <ellipse cx="450" cy="590" rx="180" ry="22" fill="#a3e635"/>
  ${label(40, 470, 220, 40, "#dbeafe", "#2563eb", "2. Water and air")}
  ${label(640, 250, 220, 40, "#fde68a", "#d97706", "3. Plant makes food")}
  ${label(640, 430, 220, 40, "#bbf7d0", "#16a34a", "4. Oxygen for us")}
  <path d="M 220,120 L 330,250" fill="none" stroke="#f59e0b" stroke-width="6"/>
  <polygon points="330,250 300,230 318,268" fill="#f59e0b"/>
  <path d="M 540,270 L 640,270" fill="none" stroke="#16a34a" stroke-width="6"/>
  <polygon points="640,270 612,256 612,284" fill="#16a34a"/>
</svg>`);

const SUN = withXmlns(`<svg viewBox="0 0 900 620" width="900" height="620">
  <rect width="900" height="620" fill="#fff7ed"/>
  <text x="450" y="46" text-anchor="middle" font-family="${FONT}" font-size="34" font-weight="800" fill="#9a3412">The Sun</text>
  <circle cx="450" cy="250" r="120" fill="#facc15" stroke="#d97706" stroke-width="6"/>
  <g stroke="#f59e0b" stroke-width="10" stroke-linecap="round">
    <line x1="450" y1="70" x2="450" y2="40"/>
    <line x1="450" y1="430" x2="450" y2="460"/>
    <line x1="270" y1="250" x2="240" y2="250"/>
    <line x1="630" y1="250" x2="660" y2="250"/>
    <line x1="322" y1="122" x2="300" y2="100"/>
    <line x1="578" y1="378" x2="600" y2="400"/>
    <line x1="578" y1="122" x2="600" y2="100"/>
    <line x1="322" y1="378" x2="300" y2="400"/>
  </g>
  <circle cx="720" cy="470" r="46" fill="#38bdf8" stroke="#0369a1" stroke-width="4"/>
  <path d="M 690,470 Q 720,448 750,470 Q 720,492 690,470" fill="#22c55e"/>
  ${label(40, 500, 220, 48, "#fef08a", "#ca8a04", "Giant ball of hot gas")}
  ${label(300, 500, 180, 48, "#ffedd5", "#c2410c", "Gives us light")}
  ${label(520, 540, 220, 48, "#dbeafe", "#0369a1", "Warms the Earth")}
</svg>`);

const GRAVITY = withXmlns(`<svg viewBox="0 0 900 620" width="900" height="620">
  <rect width="900" height="620" fill="#eef2ff"/>
  <text x="450" y="46" text-anchor="middle" font-family="${FONT}" font-size="34" font-weight="800" fill="#312e81">Gravity</text>
  <ellipse cx="450" cy="430" rx="220" ry="90" fill="#4ade80" stroke="#16a34a" stroke-width="5"/>
  <ellipse cx="450" cy="410" rx="220" ry="40" fill="#86efac"/>
  <circle cx="450" cy="430" r="70" fill="#38bdf8" stroke="#0369a1" stroke-width="4"/>
  <path d="M 400,420 Q 450,400 500,420 Q 450,450 400,420" fill="#22c55e"/>
  <circle cx="300" cy="140" r="28" fill="#ef4444" stroke="#991b1b" stroke-width="3"/>
  <path d="M 318,122 Q 336,108 330,128" fill="#16a34a"/>
  <path d="M 300,180 L 300,300" fill="none" stroke="#4338ca" stroke-width="8" stroke-linecap="round"/>
  <polygon points="300,320 284,288 316,288" fill="#4338ca"/>
  ${label(40, 120, 200, 44, "#e0e7ff", "#4338ca", "Earth pulls down")}
  ${label(360, 540, 180, 44, "#dcfce7", "#16a34a", "You stay here")}
  ${label(620, 120, 230, 44, "#fee2e2", "#dc2626", "Apple falls to Earth")}
</svg>`);

const RAINBOW = withXmlns(`<svg viewBox="0 0 900 620" width="900" height="620">
  <rect width="900" height="620" fill="#e0f2fe"/>
  <text x="450" y="46" text-anchor="middle" font-family="${FONT}" font-size="34" font-weight="800" fill="#0f172a">A Rainbow</text>
  <circle cx="120" cy="120" r="48" fill="#facc15" stroke="#d97706" stroke-width="4"/>
  <path d="M 120,430 C 220,120 680,120 780,430" fill="none" stroke="#ef4444" stroke-width="18"/>
  <path d="M 140,430 C 240,150 660,150 760,430" fill="none" stroke="#f97316" stroke-width="18"/>
  <path d="M 160,430 C 260,180 640,180 740,430" fill="none" stroke="#eab308" stroke-width="18"/>
  <path d="M 180,430 C 280,210 620,210 720,430" fill="none" stroke="#22c55e" stroke-width="18"/>
  <path d="M 200,430 C 300,240 600,240 700,430" fill="none" stroke="#3b82f6" stroke-width="18"/>
  <path d="M 220,430 C 320,270 580,270 680,430" fill="none" stroke="#8b5cf6" stroke-width="18"/>
  <g stroke="#2563eb" stroke-width="5" stroke-linecap="round">
    <line x1="500" y1="80" x2="520" y2="150"/>
    <line x1="560" y1="70" x2="580" y2="140"/>
    <line x1="620" y1="90" x2="640" y2="160"/>
  </g>
  <ellipse cx="450" cy="500" rx="280" ry="36" fill="#38bdf8"/>
  ${label(40, 540, 200, 44, "#fef08a", "#ca8a04", "1. Sunlight")}
  ${label(270, 540, 200, 44, "#dbeafe", "#2563eb", "2. Raindrops")}
  ${label(500, 540, 200, 44, "#dcfce7", "#16a34a", "3. Colors split")}
  ${label(730, 540, 140, 44, "#ede9fe", "#7c3aed", "4. The bow")}
</svg>`);

const MOON = withXmlns(`<svg viewBox="0 0 900 620" width="900" height="620">
  <rect width="900" height="620" fill="#0f172a"/>
  <text x="450" y="46" text-anchor="middle" font-family="${FONT}" font-size="34" font-weight="800" fill="#f8fafc">The Moon</text>
  <circle cx="140" cy="140" r="40" fill="#facc15"/>
  <circle cx="450" cy="280" r="70" fill="#38bdf8"/>
  <path d="M 410,270 Q 450,250 490,270 Q 450,300 410,270" fill="#22c55e"/>
  <circle cx="720" cy="160" r="64" fill="#e2e8f0" stroke="#94a3b8" stroke-width="3"/>
  <circle cx="700" cy="140" r="10" fill="#94a3b8"/>
  <circle cx="740" cy="170" r="16" fill="#cbd5e1"/>
  <circle cx="710" cy="190" r="8" fill="#94a3b8"/>
  <path d="M 210,160 C 320,80 620,80 680,140" fill="none" stroke="#fde68a" stroke-width="4"/>
  ${label(40, 500, 240, 44, "#1e293b", "#94a3b8", "Rocky ball around Earth", "#f8fafc")}
  ${label(330, 500, 240, 44, "#1e293b", "#facc15", "Shines with sunlight", "#fde68a")}
  ${label(620, 500, 240, 44, "#1e293b", "#38bdf8", "No air to breathe", "#bae6fd")}
</svg>`);

const STATES = withXmlns(`<svg viewBox="0 0 900 620" width="900" height="620">
  <rect width="900" height="620" fill="#f8fafc"/>
  <text x="450" y="46" text-anchor="middle" font-family="${FONT}" font-size="34" font-weight="800" fill="#0f172a">States of Matter</text>
  <rect x="70" y="140" width="220" height="280" rx="24" fill="#dbeafe" stroke="#2563eb" stroke-width="4"/>
  <rect x="120" y="210" width="120" height="120" rx="8" fill="#93c5fd" stroke="#1d4ed8" stroke-width="3"/>
  <text x="180" y="180" text-anchor="middle" font-family="${FONT}" font-size="24" font-weight="800" fill="#1e3a8a">Solid</text>
  <text x="180" y="380" text-anchor="middle" font-family="${FONT}" font-size="18" font-weight="700" fill="#1e40af">Ice keeps shape</text>
  <rect x="340" y="140" width="220" height="280" rx="24" fill="#e0f2fe" stroke="#0284c7" stroke-width="4"/>
  <path d="M 380,250 L 380,360 L 520,360 L 500,250 Z" fill="#38bdf8" stroke="#0369a1" stroke-width="3"/>
  <ellipse cx="450" cy="250" rx="70" ry="16" fill="#7dd3fc"/>
  <text x="450" y="180" text-anchor="middle" font-family="${FONT}" font-size="24" font-weight="800" fill="#075985">Liquid</text>
  <text x="450" y="380" text-anchor="middle" font-family="${FONT}" font-size="18" font-weight="700" fill="#0369a1">Water can pour</text>
  <rect x="610" y="140" width="220" height="280" rx="24" fill="#f1f5f9" stroke="#64748b" stroke-width="4"/>
  <ellipse cx="680" cy="250" rx="18" ry="28" fill="#cbd5e1"/>
  <ellipse cx="720" cy="220" rx="22" ry="34" fill="#94a3b8"/>
  <ellipse cx="760" cy="270" rx="16" ry="24" fill="#e2e8f0"/>
  <text x="720" y="180" text-anchor="middle" font-family="${FONT}" font-size="24" font-weight="800" fill="#334155">Gas</text>
  <text x="720" y="380" text-anchor="middle" font-family="${FONT}" font-size="18" font-weight="700" fill="#475569">Steam spreads</text>
  ${label(250, 500, 400, 48, "#fef08a", "#ca8a04", "Heat makes them change")}
</svg>`);

const VOLCANO = withXmlns(`<svg viewBox="0 0 900 620" width="900" height="620">
  <rect width="900" height="620" fill="#fff7ed"/>
  <text x="450" y="44" text-anchor="middle" font-family="${FONT}" font-size="34" font-weight="800" fill="#7c2d12">A Volcano</text>
  <path d="M 180,500 L 360,180 L 420,180 L 540,500 Z" fill="#78716c" stroke="#44403c" stroke-width="4"/>
  <path d="M 360,180 L 390,120 L 420,180 Z" fill="#1e293b"/>
  <path d="M 370,160 C 300,80 420,40 430,140" fill="#ef4444" stroke="#b91c1c" stroke-width="4"/>
  <path d="M 400,150 C 480,70 560,90 470,170" fill="#f97316" stroke="#c2410c" stroke-width="3"/>
  <ellipse cx="390" cy="170" rx="18" ry="10" fill="#facc15"/>
  <path d="M 390,180 L 390,430" fill="none" stroke="#ef4444" stroke-width="18"/>
  <ellipse cx="390" cy="470" rx="70" ry="28" fill="#dc2626"/>
  <ellipse cx="450" cy="540" rx="320" ry="40" fill="#a8a29e"/>
  ${label(40, 220, 160, 40, "#fee2e2", "#dc2626", "1. Magma")}
  ${label(40, 300, 170, 40, "#ffedd5", "#c2410c", "2. Pressure")}
  ${label(620, 80, 200, 40, "#fecaca", "#b91c1c", "3. Eruption")}
  ${label(620, 300, 200, 40, "#e7e5e4", "#57534e", "4. Ash and rock")}
</svg>`);

function fourBoxSvg(title, panels) {
  const colors = ["#fef3c7", "#dbeafe", "#dcfce7", "#fce7f3"];
  const strokes = ["#d97706", "#2563eb", "#16a34a", "#db2777"];
  const cards = (panels || []).slice(0, 4).map((text, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 40 + col * 420;
    const y = 90 + row * 250;
    const lines = String(text).split("\n");
    const t1 = lines[0] || "";
    const t2 = lines.slice(1).join(" ");
    return `<rect x="${x}" y="${y}" width="400" height="220" rx="24" fill="${colors[i]}" stroke="${strokes[i]}" stroke-width="4"/>
      <text x="${x + 200}" y="${y + 90}" text-anchor="middle" font-family="${FONT}" font-size="26" font-weight="800" fill="#0f172a">${escapeXml(t1)}</text>
      <text x="${x + 200}" y="${y + 140}" text-anchor="middle" font-family="${FONT}" font-size="20" font-weight="600" fill="#334155">${escapeXml(t2)}</text>`;
  }).join("");
  return withXmlns(`<svg viewBox="0 0 900 620" width="900" height="620">
    <rect width="900" height="620" fill="#f8fafc"/>
    <text x="450" y="50" text-anchor="middle" font-family="${FONT}" font-size="32" font-weight="800" fill="#0f172a">${escapeXml(title)}</text>
    ${cards}
  </svg>`);
}

function flowSvg(title, steps) {
  const items = (steps || []).slice(0, 4).map((text, i) => {
    const lines = String(text).split("\n");
    const t1 = lines[0] || `Step ${i + 1}`;
    const t2 = lines.slice(1).join(" ");
    const x = 40 + i * 215;
    const colors = ["#fef3c7", "#dbeafe", "#dcfce7", "#fce7f3"];
    const strokes = ["#d97706", "#2563eb", "#16a34a", "#db2777"];
    const arrow = i < 3
      ? `<path d="M ${x + 190},310 L ${x + 215},310" stroke="#0f172a" stroke-width="8" fill="none"/>
         <polygon points="${x + 228},310 ${x + 208},298 ${x + 208},322" fill="#0f172a"/>`
      : "";
    return `<rect x="${x}" y="160" width="180" height="300" rx="28" fill="${colors[i]}" stroke="${strokes[i]}" stroke-width="5"/>
      <circle cx="${x + 90}" cy="210" r="28" fill="${strokes[i]}"/>
      <text x="${x + 90}" y="218" text-anchor="middle" font-family="${FONT}" font-size="28" font-weight="800" fill="#fff">${i + 1}</text>
      <text x="${x + 90}" y="280" text-anchor="middle" font-family="${FONT}" font-size="18" font-weight="800" fill="#0f172a">${escapeXml(t1.slice(0, 18))}</text>
      <text x="${x + 90}" y="340" text-anchor="middle" font-family="${FONT}" font-size="15" font-weight="600" fill="#334155">${escapeXml(t2.slice(0, 22))}</text>
      ${arrow}`;
  }).join("");
  return withXmlns(`<svg viewBox="0 0 900 620" width="900" height="620">
    <rect width="900" height="620" fill="#f8fafc"/>
    <text x="450" y="70" text-anchor="middle" font-family="${FONT}" font-size="32" font-weight="800" fill="#0f172a">${escapeXml(title)}</text>
    ${items}
  </svg>`);
}

function multiplicationSvg() {
  const dots = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      const x = 270 + col * 100;
      const y = 190 + row * 95;
      dots.push(`<circle cx="${x}" cy="${y}" r="24" fill="#2563eb" stroke="#1e3a8a" stroke-width="4"/>`);
    }
  }
  return withXmlns(`<svg viewBox="0 0 900 620" width="900" height="620">
    <rect width="900" height="620" fill="#eff6ff"/>
    <text x="450" y="64" text-anchor="middle" font-family="${FONT}" font-size="36" font-weight="800" fill="#0f172a">3 × 4 = 12</text>
    <text x="450" y="112" text-anchor="middle" font-family="${FONT}" font-size="22" font-weight="700" fill="#1d4ed8">3 groups of 4</text>
    ${dots.join("")}
    <text x="70" y="285" font-family="${FONT}" font-size="22" font-weight="800" fill="#1e3a8a">3 rows</text>
    <text x="450" y="520" text-anchor="middle" font-family="${FONT}" font-size="22" font-weight="800" fill="#1e3a8a">4 dots in each row</text>
    <text x="450" y="575" text-anchor="middle" font-family="${FONT}" font-size="26" font-weight="800" fill="#0f172a">4 + 4 + 4 = 12</text>
  </svg>`);
}

function binomialSvg() {
  const rows = [[1], [1, 1], [1, 2, 1], [1, 3, 3, 1], [1, 4, 6, 4, 1]];
  const cells = [];
  rows.forEach((row, r) => {
    const startX = 450 - ((row.length - 1) * 42);
    row.forEach((n, i) => {
      const x = startX + i * 84;
      const y = 118 + r * 68;
      const highlight = r === 3 ? "#fde68a" : "#dbeafe";
      const stroke = r === 3 ? "#d97706" : "#1d4ed8";
      cells.push(`<circle cx="${x}" cy="${y}" r="26" fill="${highlight}" stroke="${stroke}" stroke-width="3"/>
        <text x="${x}" y="${y + 8}" text-anchor="middle" font-family="${FONT}" font-size="22" font-weight="800" fill="#1e3a8a">${n}</text>`);
    });
  });
  return withXmlns(`<svg viewBox="0 0 900 620" width="900" height="620">
    <rect width="900" height="620" fill="#eff6ff"/>
    <text x="450" y="42" text-anchor="middle" font-family="${FONT}" font-size="30" font-weight="800" fill="#0f172a">Pascal's Triangle</text>
    ${cells.join("")}
    <text x="450" y="500" text-anchor="middle" font-family="${FONT}" font-size="26" font-weight="800" fill="#0f172a">(a+b)³ = a³ + 3a²b + 3ab² + b³</text>
    <text x="450" y="545" text-anchor="middle" font-family="${FONT}" font-size="18" font-weight="700" fill="#1d4ed8">The gold row 1, 3, 3, 1 is the coefficients</text>
    <text x="450" y="580" text-anchor="middle" font-family="${FONT}" font-size="18" font-weight="700" fill="#334155">a shrinks, b grows, powers always add to n</text>
  </svg>`);
}

function topicGraphic() {
  // No stock topic pictures. Primer invents a diagram for this child, this question.
  return null;
}

function graphicFromTopic() {
  return null;
}

function panelsForTopic() {
  return [];
}

function pictureCommand(svg, title) {
  if (!svg) return null;
  return {
    tool: "svg_picture",
    title: title || "Lesson picture",
    svg,
    x: 7600,
    y: 8350,
    w: 4800,
    h: 3300
  };
}

function getKidGraphic() {
  return null;
}

module.exports = {
  getKidGraphic,
  fourBoxSvg,
  pictureCommand,
  topicGraphic,
  panelsForTopic,
  flowSvg
};
