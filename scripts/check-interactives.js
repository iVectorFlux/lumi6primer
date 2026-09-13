#!/usr/bin/env node
"use strict";

/** Smoke check: does a child question match an interactive from public.interactives? */

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const envFile = path.join(ROOT, ".env");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split("\n")) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!match) continue;
    const value = match[2].replace(/^["']|["']$/g, "");
    if (!process.env[match[1]]) process.env[match[1]] = value;
  }
}

const PrimerStore = require("../src/primer/store.js");
const lessonInteractive = require("../src/primer/tools/lesson-interactive.js");

const QUERIES = [
  { q: "water cycle", grade: 3 },
  { q: "why does it rain", grade: 3 },
  { q: "food chain", grade: 2 },
  { q: "how do shadows work", grade: 1 },
  { q: "place value", grade: 2 },
  { q: "fractions", grade: 2 },
  { q: "photosynthesis", grade: 5 },
  { q: "magnets", grade: 4 },
  // Possessives, plurals and off-grade topics the child named outright.
  { q: "kepler's law of motion", grade: 5 },
  { q: "kepler's laws", grade: 11 },
  { q: "first law of thermodynamics", grade: 5 },
  { q: "faraday's law", grade: 12 },
  { q: "pythagoras theorem", grade: 8 },
  { q: "natural selection", grade: 10 },
  // These must stay MISS: no topic named, so no widget should appear.
  { q: "why is the sky blue", grade: 3 },
  { q: "what is newton's third law", grade: 11 },
  { q: "hello", grade: 3 },
  { q: "tell me a story", grade: 3 },
  { q: "can you help me with my homework", grade: 3 }
];

async function main() {
  const store = new PrimerStore();
  if (!store.remoteEnabled) {
    console.error("Supabase not configured; falling back to local files.");
  }
  const items = await lessonInteractive.loadAll(store);
  console.log(`catalog: ${items.length} interactives (source: ${items[0]?.source || "file"})`);

  for (const { q, grade } of QUERIES) {
    const hit = await lessonInteractive.match({ store, concept: q, childText: q, grade });
    if (!hit) {
      console.log(`  MISS  class ${grade}  "${q}"`);
      continue;
    }
    console.log(`  HIT   class ${grade}  "${q}" -> ${hit.slug} (${hit.score}) ${hit.title.slice(0, 58)}`);
  }

  // Coverage: can each interactive be found by its own title at its own class?
  let found = 0;
  let confused = 0;
  const problems = [];
  for (const item of items) {
    const q = item.title.replace(/\$[^$]*\$/g, "").replace(/[():].*$/, "").trim();
    const hit = await lessonInteractive.match({ store, concept: q, childText: q, grade: item.grade_min });
    if (hit?.slug === item.slug) found += 1;
    else {
      confused += 1;
      problems.push(`  ${hit ? "WRONG" : "MISS "} ${item.slug} "${q}"${hit ? ` -> ${hit.slug}` : ""}`);
    }
  }
  console.log(`\nself-match: ${found}/${items.length} (${confused} unreachable)`);
  if (problems.length) console.log(problems.join("\n"));

  const waterCycle = await lessonInteractive.match({ store, concept: "water cycle", childText: "water cycle", grade: 3 });
  if (waterCycle?.slug) {
    const full = await lessonInteractive.getBySlug(waterCycle.slug, store);
    console.log(`\nhtml for ${waterCycle.slug}: ${full?.html ? `${full.html.length} bytes` : "MISSING"}`);
    const embed = lessonInteractive.embedHtml(full?.html || "");
    console.log(`embed wraps ok: ${embed.includes("lumi-embed")}`);
    console.log(`canvas aspect locked: ${embed.includes("lumi6-aspect")}`);
    console.log(`reports own height: ${embed.includes("lumi6:interactive-height")}`);

    // Chrome around the interactive comes from these columns.
    const cmd = lessonInteractive.commandFor(waterCycle);
    console.log(`\ncommand metadata for ${cmd.slug}:`);
    console.log(`  subject/class: ${cmd.subject || "—"} / ${cmd.klass || "—"}`);
    console.log(`  idea:    ${cmd.idea ? cmd.idea.slice(0, 90) : "(empty)"}`);
    console.log(`  concept: ${cmd.concept ? cmd.concept.slice(0, 90) : "(empty)"}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
