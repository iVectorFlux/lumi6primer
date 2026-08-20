"use strict";

const ICONS = {
  heart: `<path fill="#fb7185" d="M64 108C28 82 18 58 32 40c10-12 24-10 32 2 8-12 22-14 32-2 14 18 4 42-32 68Z"/><circle cx="48" cy="46" r="7" fill="#fecdd3"/>`,
  lungs: `<ellipse cx="42" cy="64" rx="22" ry="34" fill="#7dd3fc"/><ellipse cx="86" cy="64" rx="22" ry="34" fill="#7dd3fc"/><rect x="60" y="28" width="8" height="52" rx="4" fill="#38bdf8"/><circle cx="64" cy="24" r="8" fill="#0ea5e9"/>`,
  brain: `<ellipse cx="64" cy="66" rx="40" ry="34" fill="#c4b5fd"/><path fill="none" stroke="#7c3aed" stroke-width="4" d="M36 66c8-18 20-10 28 0 8-16 22-12 28 2"/><circle cx="50" cy="54" r="6" fill="#ede9fe"/>`,
  water: `<path fill="#38bdf8" d="M64 20c0 0 32 42 32 64a32 32 0 1 1-64 0C32 62 64 20 64 20Z"/><path fill="#e0f2fe" d="M54 78c4 10 16 12 22 4-8 2-16-2-22-4Z"/>`,
  plant: `<path fill="none" stroke="#16a34a" stroke-width="8" stroke-linecap="round" d="M64 112V52"/><path fill="#86efac" d="M64 70c-28-18-28-40-8-48 2 18 8 32 8 48Z"/><path fill="#22c55e" d="M64 78c28-16 28-38 8-48-2 18-8 32-8 48Z"/><rect x="56" y="100" width="16" height="16" rx="4" fill="#15803d"/>`,
  sun: `<circle cx="64" cy="64" r="22" fill="#facc15"/><g stroke="#f59e0b" stroke-width="6" stroke-linecap="round"><path d="M64 18v12M64 98v12M18 64h12M98 64h12M30 30l8 8M90 90l8 8M90 30l-8 8M38 90l-8 8"/></g>`,
  earth: `<circle cx="64" cy="64" r="40" fill="#60a5fa"/><path fill="#4ade80" d="M40 48c12-10 28-6 34 6-8 8-22 10-34 4Z"/><path fill="#22c55e" d="M70 70c14 2 22 14 10 24-16 2-28-8-24-18Z"/>`,
  star: `<path fill="#fbbf24" d="M64 18 74 50h34L82 70l12 34-30-20-30 20 12-34L30 50h34Z"/>`,
  lightning: `<path fill="#facc15" d="M72 16 40 70h22L52 112l40-62H70Z"/>`,
  book: `<path fill="#93c5fd" d="M24 28h36v76H32a8 8 0 0 1-8-8V28Z"/><path fill="#60a5fa" d="M68 28h36v68a8 8 0 0 1-8 8H68V28Z"/><path fill="#1d4ed8" d="M60 28h8v76h-8z"/>`,
  clock: `<circle cx="64" cy="64" r="38" fill="#fde68a" stroke="#d97706" stroke-width="6"/><path stroke="#92400e" stroke-width="5" stroke-linecap="round" d="M64 64V38M64 64l18 12"/>`,
  atom: `<circle cx="64" cy="64" r="10" fill="#818cf8"/><ellipse cx="64" cy="64" rx="44" ry="18" fill="none" stroke="#6366f1" stroke-width="4"/><ellipse cx="64" cy="64" rx="44" ry="18" fill="none" stroke="#8b5cf6" stroke-width="4" transform="rotate(60 64 64)"/><ellipse cx="64" cy="64" rx="44" ry="18" fill="none" stroke="#22d3ee" stroke-width="4" transform="rotate(-60 64 64)"/>`,
  rocket: `<path fill="#fb7185" d="M64 16c18 22 20 52 12 74H52C44 68 46 38 64 16Z"/><circle cx="64" cy="52" r="8" fill="#e0f2fe"/><path fill="#fb923c" d="M52 90l-10 18 22-8 22 8-10-18Z"/>`,
  food: `<circle cx="64" cy="64" r="36" fill="#fdba74"/><path fill="#fb923c" d="M40 56c8 4 16-6 24 0 8 6 16-2 24 2 0 22-16 36-48 28 0-10 0-20 0-30Z"/>`,
  ball: `<circle cx="64" cy="64" r="38" fill="#fb7185"/><path fill="none" stroke="#fff" stroke-width="4" d="M28 64h72M64 28c12 12 12 48 0 72M64 28c-12 12-12 48 0 72"/>`,
  idea: `<path fill="#fde68a" d="M64 18a32 32 0 0 1 18 58c-4 4-6 8-6 14H52c0-6-2-10-6-14A32 32 0 0 1 64 18Z"/><rect x="52" y="94" width="24" height="8" rx="3" fill="#f59e0b"/><rect x="56" y="104" width="16" height="8" rx="3" fill="#d97706"/>`
};

const RULES = [
  [/heart|blood|pump|cardio|vein|artery/i, "heart"],
  [/lung|oxygen|breath|air|respir/i, "lungs"],
  [/brain|think|neuron|mind/i, "brain"],
  [/water|rain|ocean|river|lake|ice/i, "water"],
  [/plant|tree|leaf|flower|seed|grow/i, "plant"],
  [/sun|light|hot|star heat|solar/i, "sun"],
  [/earth|planet|world|map|geo/i, "earth"],
  [/star|space|sky|galaxy/i, "star"],
  [/electric|lightning|energy|spark/i, "lightning"],
  [/book|read|story|word|letter/i, "book"],
  [/time|clock|hour|minute/i, "clock"],
  [/atom|molecule|chem|particle/i, "atom"],
  [/rocket|space|nasa|moon/i, "rocket"],
  [/food|cookie|eat|fruit|cake/i, "food"],
  [/ball|sport|kick|throw/i, "ball"]
];

function pickIcon(topic, spoken) {
  const hay = `${topic || ""} ${spoken || ""}`;
  for (const [re, id] of RULES) {
    if (re.test(hay)) return id;
  }
  return "idea";
}

function iconMarkup(topic, spoken) {
  const id = pickIcon(topic, spoken);
  return `<svg viewBox="0 0 128 128" aria-hidden="true">${ICONS[id] || ICONS.idea}</svg>`;
}

module.exports = { pickIcon, iconMarkup, ICONS };
