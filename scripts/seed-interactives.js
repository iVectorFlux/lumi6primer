"use strict";

const fs = require("fs");
const path = require("path");

function loadEnv() {
  try {
    const text = fs.readFileSync(path.join(__dirname, "../.env"), "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (key && process.env[key] == null) process.env[key] = value;
    }
  } catch {}
}

loadEnv();

const PrimerStore = require("../src/primer/store.js");
const { ITEMS } = require("../src/primer/interactives/catalog.js");

async function main() {
  const store = new PrimerStore();
  if (!store.remoteEnabled) {
    console.error("Supabase is not configured. Set SUPABASE_URL and a service key.");
    process.exit(1);
  }
  const dir = path.join(__dirname, "../content/interactives");
  const rows = ITEMS.map((item) => {
    const html = fs.readFileSync(path.join(dir, `${item.slug}.html`), "utf8");
    return {
      slug: item.slug,
      title: item.title,
      summary: item.summary,
      topics: item.topics,
      grade_min: item.grade_min,
      grade_max: item.grade_max,
      html,
      enabled: true,
      updated_at: new Date().toISOString()
    };
  });
  const saved = await store.upsertInteractives(rows);
  console.log(`Upserted ${saved.length || rows.length} lesson interactives.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
