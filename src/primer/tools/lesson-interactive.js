"use strict";

const fs = require("fs");
const path = require("path");
const { ITEMS, matchInteractive, keywordsFromTitle } = require("../interactives/catalog.js");

const FILE_DIR = path.join(__dirname, "../../../content/interactives");

let cache = null;
let cacheAt = 0;
const CACHE_MS = 60 * 1000;
const HTML_CACHE_MAX = 24;
const htmlCache = new Map();

/** Grade aliases live in the class column, so they are useless as search topics. */
const GRADE_TAG = /^(class|grade)[-\s]?\d+$/;
const ORDINAL_GRADE_TAG = /^(\d+(st|nd|rd|th)|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth)[-\s]grade$/;

function topicsFromRow(row) {
  const tags = Array.isArray(row?.tags) ? row.tags : [];
  const seen = new Set();
  const topics = [];
  for (const tag of tags) {
    const text = String(tag || "").trim().toLowerCase();
    if (!text || GRADE_TAG.test(text) || ORDINAL_GRADE_TAG.test(text)) continue;
    if (seen.has(text)) continue;
    seen.add(text);
    topics.push(text);
  }
  return topics;
}

function pillFromConfig(row) {
  const pill = row?.config?.pill;
  if (!pill || typeof pill !== "object") return null;
  const title = String(pill.title || row.title || "").trim();
  const subtitle = String(pill.subtitle || row.concept || "").trim();
  if (!title) return null;
  return { title, subtitle };
}

function fromRow(row) {
  const slug = String(row?.id || "").trim();
  if (!slug || !row?.title) return null;
  const klass = Number(row.class);
  const grade = Number.isFinite(klass) && klass > 0 ? klass : null;
  const pill = pillFromConfig(row);
  const configDesc = String(row?.config?.description || "").trim();
  const topics = topicsFromRow(row);
  // Title words help queries like "pythagorean theorem" hit "pythagoras-v2".
  for (const word of keywordsFromTitle(row.title)) {
    const alias = word.replace(/\s+/g, "-");
    if (!topics.includes(alias)) topics.push(alias);
  }
  return {
    id: slug,
    slug,
    title: String(row.title),
    summary: String(configDesc || row.concept || ""),
    subject: String(row.subject || ""),
    klass: grade,
    idea: String(row.interactive_idea || ""),
    concept: String(row.concept || ""),
    pill,
    scenario: Boolean(pill),
    topics,
    keywords: keywordsFromTitle(row.title),
    grade_min: grade || 1,
    grade_max: grade || 12,
    enabled: true,
    source: "db"
  };
}

function rememberHtml(slug, html) {
  htmlCache.set(slug, html);
  if (htmlCache.size > HTML_CACHE_MAX) {
    const oldest = htmlCache.keys().next().value;
    htmlCache.delete(oldest);
  }
}

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
    return { ...item, keywords: keywordsFromTitle(item.title), html, enabled: true, id: item.slug };
  }).filter(Boolean);
}

async function loadAll(store) {
  if (cache && Date.now() - cacheAt < CACHE_MS) return cache;
  let rows = [];
  if (store && store.remoteEnabled && typeof store.listInteractives === "function") {
    try {
      rows = (await store.listInteractives()).map(fromRow).filter(Boolean);
    } catch (err) {
      console.warn("[PRIMER] interactive catalog from DB failed:", err.message);
    }
  }
  if (!rows.length) {
    rows = fromFiles();
  }
  cache = rows.filter((row) => row && row.enabled !== false && row.slug);
  cacheAt = Date.now();
  return cache;
}

function clearCache() {
  cache = null;
  cacheAt = 0;
  htmlCache.clear();
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
  const item = items.find((entry) => entry.slug === key);
  if (!item) {
    // Lessons saved before the catalog moved to public.interactives still link old slugs.
    const legacy = readHtmlFile(key);
    return legacy ? { id: key, slug: key, title: key, topics: [], enabled: true, source: "file", html: legacy } : null;
  }
  if (item.html) return item;
  const cached = htmlCache.get(key);
  if (cached) return { ...item, html: cached };
  let html = "";
  if (item.source === "db" && store && typeof store.getInteractiveHtml === "function") {
    try {
      html = await store.getInteractiveHtml(key);
    } catch (err) {
      console.warn("[PRIMER] interactive html fetch failed:", err.message);
    }
  }
  if (!html) html = readHtmlFile(key);
  if (!html) return null;
  rememberHtml(key, html);
  return { ...item, html };
}

function interactiveHref(slug, mode) {
  const base = `/api/primer/interactive/${encodeURIComponent(itemSlug(slug))}?embed=1`;
  return mode ? `${base}&mode=${encodeURIComponent(mode)}` : base;
}

function itemSlug(slug) {
  return String(slug || "").trim();
}

function commandFor(item) {
  if (!item?.slug) return null;
  const slug = itemSlug(item.slug);
  return {
    tool: "lesson_interactive",
    id: item.id || slug,
    slug,
    title: item.title || slug,
    subject: item.subject || "",
    klass: item.klass || null,
    idea: item.idea || "",
    concept: item.concept || "",
    summary: item.summary || "",
    pill: item.pill || null,
    scenario: Boolean(item.scenario || item.pill),
    href: interactiveHref(slug),
    hrefMobile: interactiveHref(slug, "mobile"),
    hrefDesktop: interactiveHref(slug, "desktop")
  };
}

/**
 * The board sizes the iframe to this document's natural height, so nothing here
 * may stretch to fill the viewport. The canvas keeps a fixed aspect ratio and the
 * controls keep their natural height; the scene then looks the same on a phone as
 * it does on a laptop, only smaller.
 */
const EMBED_CSS = `
html,body{width:100%!important;height:auto!important;min-height:0!important;max-height:none!important;margin:0;overflow-x:hidden!important;overflow-y:visible!important}
body{display:block!important}

/* Generated interactives (public.interactives): an absolutely positioned canvas
   fills .artifact-viewport, which normally flexes to the window height. Lock the
   viewport to the scene's aspect ratio instead and let the page end after the
   controls, so the canvas keeps its shape and the board can measure the height. */
.artifact-container{display:block!important;width:100%!important;max-width:none!important;height:auto!important;min-height:0!important;max-height:none!important;margin:0!important}
.artifact-viewport{position:relative!important;display:block!important;width:100%!important;flex:none!important;height:auto!important;min-height:0!important;max-height:none!important;aspect-ratio:var(--lumi6-aspect,16/9)!important}
.artifact-viewport>canvas,canvas#mainCanvas{position:absolute!important;top:0!important;left:0!important;width:100%!important;height:100%!important;aspect-ratio:auto!important;flex:none!important;min-height:0!important;max-height:none!important}
.artifact-controls{max-height:none!important;overflow:visible!important}

/* Hand-written fallbacks in content/interactives/ use these class names. */
.wrap,.app,.playground{display:block!important;max-width:none!important;width:100%!important;margin:0!important;padding:8px 10px!important;height:auto!important;min-height:0!important;max-height:none!important;overflow:visible!important;box-shadow:none!important;border-radius:0!important}
h1{font-size:17px!important;margin:0 0 2px!important;letter-spacing:0!important}
.sub,.subtitle,.intro,header p,.hero p{display:none!important}
header{padding:4px 0 6px!important;border:0!important;background:transparent!important}
main{display:block!important;height:auto!important;min-height:0!important;max-height:none!important;padding:0!important;overflow:visible!important}
.stage{display:block!important;height:auto!important;min-height:0!important;max-height:none!important;overflow:visible!important}
.stage>canvas,main>canvas,.wrap>canvas{display:block!important;width:100%!important;height:auto!important;aspect-ratio:var(--lumi6-aspect,16/9)!important;flex:none!important;min-height:0!important;max-height:none!important}
@media(max-width:700px){
  h1{font-size:14px!important;display:none!important}
  .controls,.try,.question,.readout,.read{padding:6px 8px!important;font-size:12px!important}
  .control{min-width:0!important;flex-basis:100%!important}
  .readout{min-width:0!important;max-width:calc(100% - 16px)!important;left:8px!important;right:8px!important}
  button{padding:6px 9px!important;font-size:12px!important}
}
.controls,.try,.question,.readout,.read{margin-top:6px!important;padding:8px 10px!important;font-size:13px!important;overflow:visible!important;max-height:none!important}
.try span,.hint,.question span:not(.feedback){display:none!important}
.tabs{margin-bottom:8px!important}
`;

/** Multi-view scenario HTML (InteractEd v2) with pill / mobile / desktop modes. */
function isScenarioHtml(html) {
  return /function\s+setMode\s*\(|id="sectionPill"|class="chat-pill-card"/.test(String(html || ""));
}

/** CSS for v2 scenario pages embedded in the playground or drawer. */
const SCENARIO_EMBED_CSS = `
html,body{width:100%!important;height:100%!important;margin:0!important;padding:0!important;overflow:hidden!important}
body{display:flex!important;flex-direction:column!important;align-items:stretch!important;padding:0!important}
.view-switcher,.specs-bar,.section-title{display:none!important}
.showcase-container,.top-header{width:100%!important;max-width:none!important;margin:0!important;padding:0!important;gap:0!important}
.showcase-grid-top{width:100%!important;margin:0!important;padding:0!important;gap:0!important}
.view-section{width:100%!important;max-width:none!important;margin:0!important;padding:0!important}
#sectionPill{display:none!important}
.drawer-overlay.open{display:none!important}
`;

function scenarioBootScript(mode) {
  const view = String(mode || "desktop").replace(/[^a-z]/gi, "") || "desktop";
  return `<script id="lumi-scenario-boot">
(function(){
  var mode = ${JSON.stringify(view)};
  function boot(){
    if (typeof setMode === "function") {
      setMode(mode);
      try { window.dispatchEvent(new Event("resize")); } catch (e) {}
      return;
    }
    setTimeout(boot, 40);
  }
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", boot);
  else boot();
})();
</script>`;
}

const EMBED_FIT_SCRIPT = `<script id="lumi-embed-fit">
(function(){
  var timer;
  var sent = 0;
  function report(){
    if (!window.parent || window.parent === window) return;
    var body = document.body;
    if (!body) return;
    var height = Math.ceil(body.getBoundingClientRect().height) || body.scrollHeight;
    if (!height || Math.abs(height - sent) < 2) return;
    sent = height;
    try {
      window.parent.postMessage({ type: "lumi6:interactive-height", height: height }, "*");
    } catch (e) {}
  }
  function ping(){
    clearTimeout(timer);
    timer = setTimeout(function(){
      try { window.dispatchEvent(new Event("resize")); } catch (e) {}
      report();
    }, 40);
  }
  addEventListener("load", ping);
  if (window.ResizeObserver) {
    try {
      var observer = new ResizeObserver(ping);
      observer.observe(document.documentElement);
      if (document.body) observer.observe(document.body);
    } catch (e) {}
  }
})();
</script>`;

function embedHtml(html, options = {}) {
  const source = String(html || "");
  if (!source) return source;
  const scenario = isScenarioHtml(source);
  const css = scenario ? SCENARIO_EMBED_CSS : EMBED_CSS;
  const tag = `<style id="lumi-embed">${css}</style>`;
  const boot = scenario ? scenarioBootScript(options.mode) : EMBED_FIT_SCRIPT;
  let out = source;
  if (/<\/head>/i.test(out)) out = out.replace(/<\/head>/i, `${tag}</head>`);
  else out = `${tag}${out}`;
  if (/<\/body>/i.test(out)) out = out.replace(/<\/body>/i, `${boot}</body>`);
  else out = `${out}${boot}`;
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
