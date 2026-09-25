#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

let Database;
try {
  Database = require("better-sqlite3");
} catch {
  try {
    Database = require("/Users/product/books data/node_modules/better-sqlite3");
  } catch (err) {
    console.error("Could not load better-sqlite3:", err.message);
    process.exit(1);
  }
}

const ROOT = path.resolve(__dirname, "..");
const DB_PATH = path.join(ROOT, "data", "curriculum.db");
const OUT_PATH = path.join(ROOT, "public", "curriculum", "curriculum-data-bundle.json");

if (!fs.existsSync(DB_PATH)) {
  console.error("Missing database at", DB_PATH);
  process.exit(1);
}

const db = new Database(DB_PATH, { readonly: true });

console.log("Compiling complete Curriculum Data Bundle from SQLite...");

const books = db.prepare("SELECT * FROM curriculum_books").all();
const units = db.prepare("SELECT * FROM curriculum_units ORDER BY unit_number").all();
const chapters = db.prepare("SELECT * FROM curriculum_chapters ORDER BY chapter_number").all();
const badges = db.prepare("SELECT * FROM curriculum_badges").all();
const glossary = db.prepare("SELECT * FROM curriculum_glossary").all();
const sections = db.prepare("SELECT * FROM curriculum_sections ORDER BY lesson_number").all();
const blocks = db.prepare("SELECT * FROM curriculum_blocks ORDER BY order_index").all();
const questions = db.prepare("SELECT * FROM curriculum_questions").all();
const interactives = db.prepare("SELECT * FROM curriculum_interactives ORDER BY chapter_number, lesson_number").all();

const badgeByChapter = {};
for (const b of badges) {
  badgeByChapter[b.chapter_id] = b;
}

const glossaryByChapter = {};
for (const g of glossary) {
  if (!glossaryByChapter[g.chapter_id]) glossaryByChapter[g.chapter_id] = [];
  glossaryByChapter[g.chapter_id].push(g);
}

const questionsBySection = {};
for (const q of questions) {
  if (!questionsBySection[q.section_id]) questionsBySection[q.section_id] = [];
  questionsBySection[q.section_id].push({
    ...q,
    options: JSON.parse(q.options || "[]"),
    correct_answer: JSON.parse(q.correct_answer || '""'),
    misconceptions: JSON.parse(q.misconceptions || "{}"),
    hint_ladder: JSON.parse(q.hint_ladder || "[]")
  });
}

const blocksBySection = {};
for (const b of blocks) {
  if (!blocksBySection[b.section_id]) blocksBySection[b.section_id] = [];
  blocksBySection[b.section_id].push({
    ...b,
    content: JSON.parse(b.content || "{}")
  });
}

const sectionsByChapter = {};
for (const s of sections) {
  if (!sectionsByChapter[s.chapter_id]) sectionsByChapter[s.chapter_id] = [];
  sectionsByChapter[s.chapter_id].push({
    ...s,
    blocks: blocksBySection[s.id] || [],
    questions: questionsBySection[s.id] || []
  });
}

const chaptersByBook = {};
for (const ch of chapters) {
  if (!chaptersByBook[ch.book_id]) chaptersByBook[ch.book_id] = [];
  chaptersByBook[ch.book_id].push({
    ...ch,
    characters: JSON.parse(ch.characters || "[]"),
    badge: badgeByChapter[ch.id] || null,
    glossary: glossaryByChapter[ch.id] || [],
    sections: sectionsByChapter[ch.id] || []
  });
}

// Build clean subjects catalog
const catalog = books.map((book) => {
  const bookUnits = units
    .filter((u) => u.book_id === book.id)
    .map((u) => ({
      ...u,
      facilitation_guide: JSON.parse(u.facilitation_guide || "[]")
    }));

  const allBookChapters = chaptersByBook[book.id] || [];
  const uniqueChapters = [];
  const seenNumbers = new Set();

  // Prefer ch-math-5-01 / ch-sci-5-01 over slug variants
  for (const ch of allBookChapters) {
    if (!seenNumbers.has(ch.chapter_number)) {
      const variants = allBookChapters.filter(c => c.chapter_number === ch.chapter_number);
      let best = variants.find(v => v.id.startsWith("ch-")) || variants[0];
      
      // Ensure badge is attached
      const chapterBadge = badgeByChapter[best.id] || variants.map(v => badgeByChapter[v.id]).find(Boolean) || null;
      // Ensure glossary is attached
      const chapterGlossary = best.glossary.length ? best.glossary : (variants.find(v => v.glossary.length)?.glossary || []);

      seenNumbers.add(ch.chapter_number);
      uniqueChapters.push({
        ...best,
        badge: chapterBadge,
        glossary: chapterGlossary,
        unlocked: best.chapter_number === 1
      });
    }
  }

  uniqueChapters.sort((a, b) => a.chapter_number - b.chapter_number);

  return {
    ...book,
    units: bookUnits,
    chapters: uniqueChapters
  };
});

const bundle = {
  version: "1.0.0",
  generatedAt: new Date().toISOString(),
  books: catalog,
  interactives: interactives.map(i => ({
    ...i,
    lego_blocks: JSON.parse(i.lego_blocks || "[]"),
    config: JSON.parse(i.config || "{}")
  }))
};

fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
fs.writeFileSync(OUT_PATH, JSON.stringify(bundle, null, 2), "utf8");
console.log(`Bundle generated successfully at ${OUT_PATH} (${(fs.statSync(OUT_PATH).size / 1024).toFixed(1)} kB)`);
