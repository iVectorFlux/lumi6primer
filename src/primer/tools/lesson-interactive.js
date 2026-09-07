"use strict";

const fs = require("fs");
const path = require("path");
const { ITEMS, matchInteractive } = require("../interactives/catalog.js");

const FILE_DIR = path.join(__dirname, "../../../content/interactives");

let cache = null;
let cacheAt = 0;
const CACHE_MS = 60 * 1000;

function readHtmlFile(slug) {
  const file = path.join(FILE_DIR, `${slug}.html`);
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function fromFiles() {
  return ITEMS.map((item) => {
    const html = readHtmlFile(item.slug);
    if (!html) return null;
    return { ...item, html, enabled: true, id: item.slug };
  }).filter(Boolean);
}

async function loadAll(store) {
  if (cache && Date.now() - cacheAt < CACHE_MS) return cache;
  let rows = [];
  if (store && store.remoteEnabled && typeof store.listInteractives === "function") {
    try {
      rows = await store.listInteractives();
    } catch (err) {
      console.warn("[PRIMER] interactive catalog from DB failed:", err.message);
    }
  }
  if (!Array.isArray(rows) || !rows.length) {
    rows = fromFiles();
  }
  cache = rows.filter((row) => row && row.enabled !== false && row.html && row.slug);
  cacheAt = Date.now();
  return cache;
}

function clearCache() {
  cache = null;
  cacheAt = 0;
}

async function match(options = {}) {
  const items = await loadAll(options.store);
  return matchInteractive(options.query || options.concept, {
    ...options,
    items
  });
}

async function getBySlug(slug, store) {
  const key = String(slug || "").trim();
  if (!key) return null;
  const items = await loadAll(store);
  return items.find((item) => item.slug === key) || null;
}

function commandFor(item) {
  if (!item?.slug) return null;
  return {
    tool: "lesson_interactive",
    id: item.id || item.slug,
    slug: item.slug,
    title: item.title || item.slug,
    href: `/api/primer/interactive/${encodeURIComponent(item.slug)}?embed=1`
  };
}

const EMBED_CSS = `
html,body{height:100%;margin:0;overflow:hidden}
body{display:flex;flex-direction:column}
.wrap,.app,.playground{flex:1;display:flex;flex-direction:column;max-width:none!important;width:100%!important;margin:0!important;padding:8px 10px!important;min-height:0!important;height:100%!important;box-shadow:none!important;border-radius:0!important}
h1{font-size:17px!important;margin:0 0 2px!important;letter-spacing:0!important}
.sub,.subtitle,.intro,header p,.hero p{display:none!important}
header{padding:4px 0 6px!important;border:0!important;background:transparent!important}
main{flex:1;display:flex;flex-direction:column;min-height:0;padding:0!important;gap:8px!important}
canvas{width:100%!important;height:100%!important;min-height:160px!important;max-height:none!important}
.stage{flex:1 1 auto;height:auto!important;min-height:160px!important;max-height:none!important}
@media(max-width:700px){
  h1{font-size:15px!important}
  .controls,.try,.question,.readout,.read{padding:6px 8px!important;font-size:12px!important}
  .control{min-width:0!important;flex-basis:100%!important}
  .readout{min-width:0!important;max-width:calc(100% - 16px)!important;left:8px!important;right:8px!important}
}
.controls,.try,.question,.readout,.read{flex:0 0 auto;margin-top:6px!important;padding:8px 10px!important;font-size:13px!important}
.try span,.hint,.question span:not(.feedback){display:none!important}
.tabs{margin-bottom:8px!important}
`;

function embedHtml(html) {
  const source = String(html || "");
  if (!source) return source;
  const tag = `<style id="lumi-embed">${EMBED_CSS}</style>`;
  if (/<\/head>/i.test(source)) return source.replace(/<\/head>/i, `${tag}</head>`);
  return `${tag}${source}`;
}

module.exports = {
  loadAll,
  match,
  getBySlug,
  commandFor,
  embedHtml,
  clearCache,
  fromFiles,
  FILE_DIR
};
