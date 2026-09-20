import fs from "node:fs/promises";

const VERSION = "18.0.0";

const SOURCES = {
  emoji:
    `https://www.unicode.org/Public/${VERSION}/emoji/emoji-test.txt`,

  unicodeData:
    `https://www.unicode.org/Public/${VERSION}/ucd/UnicodeData.txt`,

  blocks:
    `https://www.unicode.org/Public/${VERSION}/ucd/Blocks.txt`,
};

const OUTPUT = "./lumi6-unicode-vocabulary.js";

/*
 * These are Unicode blocks that are especially useful for Lumi6:
 * mathematical notation, arrows, symbols, shapes, diagrams, and UI-like
 * visual vocabulary.
 *
 * This is deliberately separate from emoji because Unicode symbols are much
 * broader than emoji.
 */
const SYMBOL_BLOCKS = [
  "Arrows",
  "Supplemental Arrows-A",
  "Supplemental Arrows-B",
  "Supplemental Arrows-C",
  "Additional Arrows",
  "Miscellaneous Symbols and Arrows",
  "Miscellaneous Symbols and Arrows Extended",

  "Mathematical Operators",
  "Supplemental Mathematical Operators",
  "Miscellaneous Mathematical Symbols-A",
  "Miscellaneous Mathematical Symbols-B",
  "Letterlike Symbols",
  "Number Forms",

  "Geometric Shapes",
  "Geometric Shapes Extended",
  "Miscellaneous Technical",

  "Box Drawing",
  "Block Elements",

  "Dingbats",
  "Ornamental Dingbats",

  "Miscellaneous Symbols",
  "Enclosed Alphanumerics",
  "Enclosed Alphanumeric Supplement",

  "Technical Symbols",
];

/*
 * Shapes that are especially useful when rendering educational explanations.
 */
const SHAPES = [
  "●", "○",
  "■", "□",
  "◆", "◇",
  "▲", "△",
  "▼", "▽",
  "◀", "◁",
  "▶", "▷",
  "★", "☆",
  "✦", "✧",
  "✚", "✖",
  "✦", "✧",
  "⬤", "◯",
  "⬛", "⬜",
  "🔴", "🟠", "🟡", "🟢", "🔵", "🟣", "🟤",
  "🔺", "🔻",
];

/*
 * Common mathematical / logical symbols.
 *
 * These are kept explicitly named because they are useful even if a
 * particular font or Unicode block is not classified exactly as expected.
 */
const MATH_SYMBOLS = [
  "+",
  "−",
  "×",
  "÷",
  "=",
  "≠",
  "≈",
  "≃",
  "≅",
  "<",
  ">",
  "≤",
  "≥",
  "±",
  "∓",
  "∞",
  "∑",
  "∏",
  "∫",
  "∮",
  "∂",
  "∇",
  "√",
  "∛",
  "∜",
  "∝",
  "∴",
  "∵",
  "∈",
  "∉",
  "⊂",
  "⊃",
  "⊆",
  "⊇",
  "∪",
  "∩",
  "∅",
  "∀",
  "∃",
  "¬",
  "∧",
  "∨",
  "→",
  "←",
  "↔",
  "⇒",
  "⇐",
  "⇔",
  "↑",
  "↓",
  "↗",
  "↘",
  "↙",
  "↖",
  "π",
  "θ",
  "λ",
  "μ",
  "σ",
  "Δ",
  "Ω",
  "α",
  "β",
  "γ",
  "δ",
];

/* -------------------------------------------------------------------------- */
/* DOWNLOAD                                                                    */
/* -------------------------------------------------------------------------- */

async function getText(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to download ${url}: ${response.status} ${response.statusText}`
    );
  }

  return response.text();
}

/* -------------------------------------------------------------------------- */
/* EMOJI PARSING                                                               */
/* -------------------------------------------------------------------------- */

function parseEmojiTest(text) {
  const emojis = [];
  const seen = new Set();

  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) {
      continue;
    }

    const parts = line.split("#");

    if (parts.length < 2) {
      continue;
    }

    const left = parts[0].trim();
    const right = parts[1].trim();

    const [codePoints, status] =
      left.split(";").map((x) => x.trim());

    if (!codePoints || !status) {
      continue;
    }

    /*
     * We want the actual usable emoji set rather than the minimally- or
     * unqualified duplicates.
     */
    if (
      status !== "fully-qualified" &&
      status !== "component"
    ) {
      continue;
    }

    const emoji = codePoints
      .split(/\s+/)
      .map((hex) =>
        String.fromCodePoint(parseInt(hex, 16))
      )
      .join("");

    if (!emoji || seen.has(emoji)) {
      continue;
    }

    /*
     * Extract the human-readable name after the version marker.
     */
    const nameMatch =
      right.match(
        /^(\S+)\s+(.+)$/
      );

    const name =
      nameMatch?.[2] || right;

    emojis.push({
      emoji,
      name,
      codePoints,
      status,
    });

    seen.add(emoji);
  }

  return emojis;
}

/* -------------------------------------------------------------------------- */
/* UNICODE BLOCK PARSING                                                       */
/* -------------------------------------------------------------------------- */

function parseBlocks(text) {
  const blocks = [];

  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) {
      continue;
    }

    const match = line.match(
      /^([0-9A-F]+)\.\.([0-9A-F]+);\s*(.+)$/
    );

    if (!match) {
      continue;
    }

    blocks.push({
      start: parseInt(match[1], 16),
      end: parseInt(match[2], 16),
      name: match[3].trim(),
    });
  }

  return blocks;
}

/*
 * UnicodeData.txt uses semicolon-delimited records.
 *
 * We build a set of assigned code points and their official names.
 */
function parseUnicodeData(text) {
  const characters = new Map();

  for (const line of text.split(/\r?\n/)) {
    if (!line) {
      continue;
    }

    const fields = line.split(";");

    if (fields.length < 2) {
      continue;
    }

    const codePoint = parseInt(fields[0], 16);
    const name = fields[1];

    if (
      Number.isNaN(codePoint) ||
      !name ||
      name.startsWith("<")
    ) {
      continue;
    }

    characters.set(codePoint, name);
  }

  return characters;
}

/* -------------------------------------------------------------------------- */
/* SYMBOL EXTRACTION                                                           */
/* -------------------------------------------------------------------------- */

function buildSymbols(blocks, unicodeData) {
  const output = [];
  const seen = new Set();

  for (const blockName of SYMBOL_BLOCKS) {
    const block = blocks.find(
      (item) =>
        item.name === blockName
    );

    if (!block) {
      continue;
    }

    for (
      let codePoint = block.start;
      codePoint <= block.end;
      codePoint += 1
    ) {
      const name =
        unicodeData.get(codePoint);

      if (!name) {
        continue;
      }

      const char =
        String.fromCodePoint(codePoint);

      if (seen.has(char)) {
        continue;
      }

      output.push({
        char,
        codePoint:
          `U+${codePoint
            .toString(16)
            .toUpperCase()
            .padStart(4, "0")}`,
        name,
        block: block.name,
      });

      seen.add(char);
    }
  }

  return output;
}

/* -------------------------------------------------------------------------- */
/* OUTPUT HELPERS                                                              */
/* -------------------------------------------------------------------------- */

function js(value) {
  return JSON.stringify(
    value,
    null,
    2
  );
}

/* -------------------------------------------------------------------------- */
/* MAIN                                                                        */
/* -------------------------------------------------------------------------- */

async function main() {
  console.log(
    `Downloading Unicode ${VERSION} data...`
  );

  const [
    emojiText,
    unicodeDataText,
    blocksText,
  ] = await Promise.all([
    getText(SOURCES.emoji),
    getText(SOURCES.unicodeData),
    getText(SOURCES.blocks),
  ]);

  console.log("Parsing emoji data...");

  const emojis =
    parseEmojiTest(emojiText);

  console.log(
    `Emoji entries: ${emojis.length}`
  );

  console.log("Parsing Unicode blocks...");

  const blocks =
    parseBlocks(blocksText);

  console.log("Parsing Unicode characters...");

  const unicodeData =
    parseUnicodeData(
      unicodeDataText
    );

  console.log(
    `Assigned Unicode characters indexed: ${unicodeData.size}`
  );

  const symbols =
    buildSymbols(
      blocks,
      unicodeData
    );

  console.log(
    `Symbol entries: ${symbols.length}`
  );

  const vocabulary = {
    unicodeVersion: VERSION,

    emojis,

    emojiCharacters:
      emojis.map(
        (item) => item.emoji
      ),

    symbols,

    symbolCharacters:
      symbols.map(
        (item) => item.char
      ),

    shapes: [
      ...new Set(SHAPES),
    ],

    mathematics: [
      ...new Set(MATH_SYMBOLS),
    ],
  };

  const output = `/**
 * GENERATED FILE — DO NOT EDIT MANUALLY
 *
 * Unicode version: ${VERSION}
 *
 * Generated from official Unicode emoji and character data.
 */

"use strict";

const LUMI6_UNICODE_VOCABULARY = ${js(
    vocabulary
  )};

module.exports =
  LUMI6_UNICODE_VOCABULARY;
`;

  await fs.writeFile(
    OUTPUT,
    output,
    "utf8"
  );

  console.log(
    `\nCreated ${OUTPUT}`
  );
}

main().catch((error) => {
  console.error(
    "\nBuild failed:",
    error
  );

  process.exit(1);
});
