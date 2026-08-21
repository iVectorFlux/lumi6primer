"use strict";

/**
 * Ask each provider which models the configured keys can actually use.
 *
 * Providers retire model ids without warning, and a retired id costs every
 * lesson a failed round trip plus a slow fallback. Run this whenever replies
 * or pictures get slow:  node scripts/check-models.js
 *
 * Prints model names only. Never prints keys.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

function loadEnvConfig() {
  const stateDir = process.env.LUMI6_STATE_DIR
    ? path.resolve(process.env.LUMI6_STATE_DIR)
    : path.join(os.homedir(), ".lumi6");
  const candidates = [
    path.join(stateDir, "config.env"),
    path.join(ROOT, ".env"),
    path.join(ROOT, "config.env")
  ];
  for (const configPath of candidates) {
    try {
      if (!fs.existsSync(configPath)) continue;
      for (const line of fs.readFileSync(configPath, "utf8").split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const idx = trimmed.indexOf("=");
        if (idx <= 0) continue;
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key] && val) process.env[key] = val;
      }
    } catch {}
  }
}

async function listModels(label, url, headers, configured) {
  console.log(`\n${label}`);
  console.log(configured ? `  configured: ${configured}` : "  configured: (none)");
  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      console.log(`  unavailable: HTTP ${response.status}`);
      return;
    }
    const raw = await response.json();
    const ids = (Array.isArray(raw?.data) ? raw.data : [])
      .map((entry) => String(entry?.id || entry?.name || "").replace(/^models\//, "").trim())
      .filter(Boolean)
      .sort();
    if (!ids.length) {
      console.log("  no models returned");
      return;
    }
    for (const id of ids) {
      const mark = configured && id === configured ? " <- configured, alive" : "";
      console.log(`  ${id}${mark}`);
    }
    if (configured && !ids.includes(configured)) {
      console.log(`  WARNING: configured model "${configured}" is not in this list`);
    }
  } catch (err) {
    console.log(`  failed: ${String(err?.message || err).slice(0, 120)}`);
  }
}

async function main() {
  loadEnvConfig();
  const groqKey = String(process.env.GROQ_API_KEY || "").trim();
  const openaiKey = String(process.env.OPENAI_API_KEY || process.env.AI_API_KEY || "").trim();
  const geminiKey = String(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "").trim();

  if (groqKey) {
    await listModels(
      "GROQ (tutor talk)",
      "https://api.groq.com/openai/v1/models",
      { Authorization: `Bearer ${groqKey}` },
      String(process.env.GROQ_MODEL || "").trim()
    );
  }
  if (openaiKey) {
    await listModels(
      "OPENAI (fallback talk + pictures)",
      "https://api.openai.com/v1/models",
      { Authorization: `Bearer ${openaiKey}` },
      String(process.env.AI_API_MODEL || process.env.OPENAI_MODEL || "").trim()
    );
  }
  if (geminiKey) {
    await listModels(
      "GEMINI (pictures)",
      "https://generativelanguage.googleapis.com/v1beta/models",
      { "x-goog-api-key": geminiKey },
      String(process.env.GEMINI_IMAGE_MODEL || "").trim()
    );
  }
  console.log("");
}

main().catch((err) => {
  console.error(String(err?.message || err));
  process.exit(1);
});
