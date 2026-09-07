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
html,body{height:100%!important;width:100%!important;max-height:100%!important;margin:0;overflow:hidden!important}
body{display:flex;flex-direction:column}
.wrap,.app,.playground{flex:1;display:flex;flex-direction:column;max-width:none!important;width:100%!important;margin:0!important;padding:8px 10px!important;min-height:0!important;height:100%!important;max-height:100%!important;overflow:hidden!important;box-shadow:none!important;border-radius:0!important}
h1{font-size:17px!important;margin:0 0 2px!important;letter-spacing:0!important;flex:0 0 auto}
.sub,.subtitle,.intro,header p,.hero p{display:none!important}
header{padding:4px 0 6px!important;border:0!important;background:transparent!important;flex:0 0 auto}
main{flex:1;display:flex;flex-direction:column;min-height:0;padding:0!important;gap:8px!important;overflow:hidden!important}
canvas{width:100%!important;flex:1 1 auto!important;height:auto!important;min-height:0!important;max-height:none!important}
.stage{flex:1 1 auto;display:flex!important;flex-direction:column!important;height:auto!important;min-height:0!important;max-height:none!important;overflow:hidden!important}
@media(max-width:700px){
  h1{font-size:14px!important;display:none!important}
  .controls,.try,.question,.readout,.read{padding:6px 8px!important;font-size:12px!important}
  .control{min-width:0!important;flex-basis:100%!important}
  .readout{min-width:0!important;max-width:calc(100% - 16px)!important;left:8px!important;right:8px!important}
  button{padding:6px 9px!important;font-size:12px!important}
  .read{max-height:4.2em;overflow:auto!important}
}
.controls,.try,.question,.readout,.read{flex:0 0 auto;margin-top:6px!important;padding:8px 10px!important;font-size:13px!important;overflow:auto}
.try span,.hint,.question span:not(.feedback){display:none!important}
.tabs{margin-bottom:8px!important}
`;

const EMBED_FIT_SCRIPT = `<script id="lumi-embed-fit">
(function(){
  var timer;
  function ping(){
    clearTimeout(timer);
    timer = setTimeout(function(){
      try { window.dispatchEvent(new Event("resize")); } catch (e) {}
    }, 40);
  }
  addEventListener("load", ping);
  if (window.ResizeObserver) {
    try { new ResizeObserver(ping).observe(document.documentElement); } catch (e) {}
  }
})();
</script>`;

function embedHtml(html) {
  const source = String(html || "");
  if (!source) return source;
  const tag = `<style id="lumi-embed">${EMBED_CSS}</style>`;
  let out = source;
  if (/<\/head>/i.test(out)) out = out.replace(/<\/head>/i, `${tag}</head>`);
  else out = `${tag}${out}`;
  if (/<\/body>/i.test(out)) out = out.replace(/<\/body>/i, `${EMBED_FIT_SCRIPT}</body>`);
  else out = `${out}${EMBED_FIT_SCRIPT}`;
  return out;
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
