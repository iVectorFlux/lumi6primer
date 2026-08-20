"use strict";

const FONT = "Arial, Helvetica, sans-serif";
const W = 900;
const H = 620;

function xml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function num(value, fallback, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function color(value, fallback) {
  const raw = String(value || "").trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw)) return raw;
  return fallback;
}

function labelBox(x, y, w, h, fill, stroke, text, textFill = "#0f172a") {
  const t = String(text || "").slice(0, 42);
  if (!t) return "";
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${fill}" stroke="${stroke}" stroke-width="3"/>
    <text x="${x + w / 2}" y="${y + h / 2 + 6}" text-anchor="middle" font-family="${FONT}" font-size="16" font-weight="800" fill="${textFill}">${xml(t)}</text>`;
}

function renderPart(part) {
  const type = String(part?.type || part?.t || "box").toLowerCase();
  const fill = color(part.fill, "#93c5fd");
  const stroke = color(part.stroke, "#1d4ed8");
  const text = String(part.text || part.label || "").slice(0, 48);
  const x = num(part.x, 80, 8, W - 8);
  const y = num(part.y, 120, 8, H - 8);

  if (type === "text" || type === "label") {
    return `<text x="${x}" y="${y}" text-anchor="middle" font-family="${FONT}" font-size="${num(part.size, 20, 12, 40)}" font-weight="800" fill="${color(part.fill, "#0f172a")}">${xml(text)}</text>`;
  }
  if (type === "circle" || type === "dot") {
    const r = num(part.r, type === "dot" ? 10 : 48, 6, 160);
    const label = text ? `<text x="${x}" y="${y + r + 22}" text-anchor="middle" font-family="${FONT}" font-size="16" font-weight="800" fill="#0f172a">${xml(text)}</text>` : "";
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="4"/>${label}`;
  }
  if (type === "ellipse") {
    const rx = num(part.w || part.rx, 70, 10, 300);
    const ry = num(part.h || part.ry, 36, 10, 200);
    const label = text ? `<text x="${x}" y="${y + ry + 22}" text-anchor="middle" font-family="${FONT}" font-size="16" font-weight="800" fill="#0f172a">${xml(text)}</text>` : "";
    return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="4"/>${label}`;
  }
  if (type === "arrow" || type === "line" || type === "beam") {
    const x2 = num(part.x2, x + 120, 8, W - 8);
    const y2 = num(part.y2, y, 8, H - 8);
    const width = type === "beam" ? 10 : 6;
    const head = type === "line" ? "" : `<polygon points="${x2},${y2} ${x2 - 18},${y2 - 10} ${x2 - 18},${y2 + 10}" fill="${fill}"/>`;
    const label = text ? `<text x="${(x + x2) / 2}" y="${(y + y2) / 2 - 12}" text-anchor="middle" font-family="${FONT}" font-size="16" font-weight="800" fill="${stroke}">${xml(text)}</text>` : "";
    return `<line x1="${x}" y1="${y}" x2="${x2}" y2="${y2}" stroke="${fill}" stroke-width="${width}" stroke-linecap="round"/>${head}${label}`;
  }
  if (type === "person") {
    return `<circle cx="${x}" cy="${y}" r="16" fill="#fcd34d" stroke="#d97706" stroke-width="3"/>
      <rect x="${x - 12}" y="${y + 16}" width="24" height="28" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="3"/>
      ${text ? `<text x="${x}" y="${y + 62}" text-anchor="middle" font-family="${FONT}" font-size="15" font-weight="800" fill="#0f172a">${xml(text)}</text>` : ""}`;
  }
  const w = num(part.w, 180, 40, 420);
  const h = num(part.h, 70, 28, 220);
  return labelBox(x, y, w, h, fill, stroke, text || " ");
}

function wrapSvg(inner, bg, title) {
  const heading = String(title || "").slice(0, 52);
  const titleEl = heading
    ? `<text x="450" y="48" text-anchor="middle" font-family="${FONT}" font-size="30" font-weight="800" fill="#0f172a">${xml(heading)}</text>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="${color(bg, "#eef2ff")}"/>
    ${titleEl}
    ${inner}
  </svg>`;
}

function sanitizeSvg(raw) {
  let svg = String(raw || "").trim();
  if (!svg.includes("<svg")) return "";
  svg = svg.replace(/<script[\s\S]*?<\/script>/gi, "");
  svg = svg.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*')/gi, "");
  svg = svg.replace(/javascript:/gi, "");
  svg = svg.replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "");
  if (!/xmlns=/.test(svg)) svg = svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  if (svg.length > 24000) return "";
  return svg;
}

function fromParts(picture = {}) {
  const parts = Array.isArray(picture.parts) ? picture.parts : (Array.isArray(picture.items) ? picture.items : []);
  if (!parts.length) return "";
  const drawn = parts.slice(0, 18).map(renderPart).join("\n");
  return wrapSvg(drawn, picture.bg || picture.background, picture.title);
}

function fromSpoken() {
  return "";
}

function isSpeechPoster(picture, spoken) {
  const parts = Array.isArray(picture?.parts) ? picture.parts : (Array.isArray(picture?.items) ? picture.items : []);
  if (!parts.length) return true;
  const texts = parts.map((p) => String(p.text || p.label || "")).join(" ").toLowerCase();
  if (/"spoken"|\{"spoken"|here'?s a situation|what do you notice|ready to think|draw pythagoras/.test(texts)) return true;
  const spokenBit = String(spoken || "").toLowerCase().slice(0, 80);
  if (spokenBit && !spokenBit.startsWith("{") && texts.includes(spokenBit.slice(0, 24))) return true;
  const types = parts.map((p) => String(p.type || p.t || "box").toLowerCase());
  const onlyBoxes = types.every((t) => t === "box" || t === "label" || t === "text");
  return onlyBoxes && parts.length <= 3;
}

function fallbackSketch() {
  return "";
}

function compilePicture(input = {}) {
  const svg = sanitizeSvg(input.svg);
  if (svg && !/"spoken"/.test(svg)) {
    return {
      tool: "svg_picture",
      title: String(input.title || "Picture").slice(0, 48),
      svg,
      x: 7600,
      y: 8350,
      w: 4800,
      h: 3300
    };
  }
  let built = "";
  if (!isSpeechPoster(input.picture, input.spoken)) {
    built = fromParts(input.picture || {});
  }
  if (!built && (input.wantsDraw || input.forceSketch)) {
    built = fallbackSketch(input.title);
  }
  if (!built) return null;
  return {
    tool: "svg_picture",
    title: String(input.title || input.picture?.title || "Picture").slice(0, 48),
    svg: built,
    x: 7600,
    y: 8350,
    w: 4800,
    h: 3300
  };
}

module.exports = { compilePicture, sanitizeSvg, fromParts };
