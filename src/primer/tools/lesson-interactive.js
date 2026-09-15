"use strict";

const fs = require("fs");
const path = require("path");
const { ITEMS, matchInteractive, keywordsFromTitle, stemPhrase } = require("../interactives/catalog.js");

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
    searchText: stemPhrase([row.title, row.concept, row.interactive_idea, topics.join(" ")].join(" ")),
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
    return { ...item, keywords: keywordsFromTitle(item.title), searchText: stemPhrase([item.title, ...(item.topics || [])].join(" ")), html, enabled: true, id: item.slug };
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
  const base = `/api/primer/interactive/${encodeURIComponent(itemSlug(slug))}?embed=1&v=20260952`;
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
    href: interactiveHref(slug, "pill"),
    hrefPill: interactiveHref(slug, "pill"),
    hrefMobile: interactiveHref(slug, "mobile"),
    hrefDesktop: interactiveHref(slug, "desktop")
  };
}

async function listCatalog(store) {
  const items = await loadAll(store);
  return items.map(commandFor).filter(Boolean);
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

/** CSS for v2 scenario pages embedded in the playground or chat pill. */
const SCENARIO_CHROME_CSS = `
.view-switcher,.specs-bar,.section-title,.top-header,.section-badge{display:none!important}
.showcase-container,.showcase-grid-top{width:100%!important;max-width:none!important;margin:0!important;padding:0!important;gap:0!important;display:flex!important;flex-direction:column!important;align-items:stretch!important;height:100%!important;min-height:0!important}
.view-section{width:100%!important;max-width:none!important;margin:0!important;padding:0!important;gap:0!important}
`;

const PILL_SEL = "#sectionPill,.pill-section";
const MOBILE_SEL = "#sectionMobile,.mobile-section";
const DESKTOP_SEL = "#sectionDesktop,.desktop-section";
const HIDDEN_OVERLAY = ".drawer-overlay,.drawer-overlay.active,.drawer-overlay.open,#drawerOverlay";

const SCENARIO_PILL_CSS = `
html,body{width:100%!important;height:auto!important;min-height:0!important;margin:0!important;padding:0!important;overflow:hidden!important;background:transparent!important}
body{display:block!important;align-items:stretch!important}
${PILL_SEL}{display:flex!important;width:100%!important}
${MOBILE_SEL},${DESKTOP_SEL},${HIDDEN_OVERLAY},.mobile-phone-frame,.desktop-card{display:none!important}
.chat-pill-card,#chatPillCard{width:100%!important;max-width:100%!important;margin:0!important;cursor:pointer}
`;

const SCENARIO_MOBILE_CSS = `
html,body{width:100%!important;height:100%!important;margin:0!important;padding:0!important;overflow:hidden!important;background:#e2e8f0!important}
body{display:flex!important;align-items:center!important;justify-content:center!important}
${PILL_SEL},${DESKTOP_SEL},${HIDDEN_OVERLAY},.chat-pill-card,#chatPillCard,.desktop-card{display:none!important}
${MOBILE_SEL}{display:flex!important;flex:none!important;width:auto!important;max-width:100%!important;height:auto!important;min-height:0!important;align-items:center!important;justify-content:center!important}
.mobile-phone-frame{display:flex!important;flex-direction:column!important;width:375px!important;max-width:100%!important;height:540px!important;max-height:100%!important;margin:0 auto!important;border:1px solid #e2e8f0!important;border-radius:26px!important;box-shadow:0 12px 36px -6px rgba(0,0,0,.09)!important;overflow:hidden!important;background:#fff!important}
.mobile-phone-frame .phone-stage{flex:none!important;height:285px!important;min-height:285px!important;max-height:285px!important}
.mobile-phone-frame .phone-controls{flex:1 1 auto!important;height:auto!important;min-height:0!important;max-height:none!important;overflow:auto!important;padding:12px 16px 16px!important}
.range-slider,input[type=range]{touch-action:manipulation;min-height:28px}
html.lumi-full body{align-items:stretch!important;justify-content:stretch!important;background:#fff!important}
html.lumi-full ${MOBILE_SEL},html.lumi-full .mobile-phone-frame{width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;border:0!important;border-radius:0!important;box-shadow:none!important}
html.lumi-full .mobile-phone-frame .phone-stage{flex:1 1 auto!important;height:auto!important;min-height:0!important;max-height:none!important}
html.lumi-full .mobile-phone-frame .phone-controls{flex:0 0 auto!important;max-height:42%!important;padding:10px 14px calc(12px + env(safe-area-inset-bottom, 0px))!important}
`;

const SCENARIO_DESKTOP_CSS = `
html,body{width:100%!important;height:100%!important;margin:0!important;padding:0!important;overflow:hidden!important;background:#e2e8f0!important}
body{display:flex!important;align-items:center!important;justify-content:center!important}
${PILL_SEL},${MOBILE_SEL},${HIDDEN_OVERLAY},.chat-pill-card,.mobile-phone-frame{display:none!important}
${DESKTOP_SEL}{display:flex!important;flex:none!important;width:880px!important;max-width:100%!important;height:490px!important;max-height:100%!important;align-items:stretch!important;justify-content:center!important}
.desktop-card{width:880px!important;max-width:100%!important;height:490px!important;max-height:100%!important;flex:none!important;margin:0!important;transform-origin:center center}
`;

function scenarioEmbedCss(mode) {
  const chrome = SCENARIO_CHROME_CSS;
  if (mode === "pill") return chrome + SCENARIO_PILL_CSS;
  if (mode === "mobile") return chrome + SCENARIO_MOBILE_CSS;
  return chrome + SCENARIO_DESKTOP_CSS;
}

function scenarioBootScript(mode) {
  const view = String(mode || "desktop").replace(/[^a-z]/gi, "") || "desktop";
  return `<script id="lumi-scenario-boot">
(function(){
  var mode = ${JSON.stringify(view)};
  var tries = 0;
  function applyModeClass(){
    var body = document.body;
    if (!body) return;
    body.classList.remove("mode-pill", "mode-mobile", "mode-desktop");
    body.classList.add(mode === "pill" ? "mode-pill" : mode === "mobile" ? "mode-mobile" : "mode-desktop");
  }
  function hide(sel){
    document.querySelectorAll(sel).forEach(function(n){
      n.style.setProperty("display", "none", "important");
      n.classList.remove("open", "active");
    });
  }
  function show(sel){
    document.querySelectorAll(sel).forEach(function(n){ n.style.setProperty("display", "flex", "important"); });
  }
  function showSections(){
    applyModeClass();
    hide(".drawer-overlay, #drawerOverlay, .top-header, .view-switcher, .specs-bar, .section-title");
    if (mode === "pill") {
      hide(".mobile-section, #sectionMobile, .desktop-section, #sectionDesktop, .mobile-phone-frame, .desktop-card");
      show(".pill-section, #sectionPill, .chat-pill-card, #chatPillCard");
    } else if (mode === "mobile") {
      hide(".pill-section, #sectionPill, .desktop-section, #sectionDesktop, .chat-pill-card, #chatPillCard, .desktop-card");
      show(".mobile-section, #sectionMobile, .mobile-phone-frame");
    } else {
      hide(".pill-section, #sectionPill, .mobile-section, #sectionMobile, .chat-pill-card, .mobile-phone-frame");
      show(".desktop-section, #sectionDesktop, .desktop-card");
    }
  }
  function askParentExpand(){
    var slug = decodeURIComponent((location.pathname.split("/").pop() || "").split("?")[0]);
    try { window.parent.postMessage({ type: "lumi6:expand-interactive", slug: slug }, "*"); } catch (e) {}
  }
  function fitDesktopCard(){
    var card = document.querySelector(".desktop-card");
    if (!card || mode !== "desktop") return;
    var scale = Math.min(1, window.innerWidth / 880, window.innerHeight / 490);
    card.style.transformOrigin = "center center";
    card.style.transform = scale < 0.99 ? ("scale(" + scale + ")") : "none";
  }
  function boot(){
    applyModeClass();
    if (typeof setMode === "function") {
      try { setMode(mode === "pill" ? "pill" : mode); } catch (e) {}
    }
    showSections();
    fitDesktopCard();
    if (mode === "pill" && !window.__lumiExpandBound) {
      window.__lumiExpandBound = true;
      window.openDrawer = askParentExpand;
      document.querySelectorAll("#chatPillTrigger, #chatPillCard, .chat-pill-card, .pill-expand-btn").forEach(function(pill){
        pill.addEventListener("click", function(ev){
          ev.preventDefault();
          ev.stopPropagation();
          askParentExpand();
        }, true);
      });
    }
    if (tries++ < 4) setTimeout(function(){ showSections(); fitDesktopCard(); }, 80);
  }
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", boot);
  else boot();
  addEventListener("load", function(){ showSections(); fitDesktopCard(); });
  addEventListener("resize", fitDesktopCard);
})();
</script>`;
}

const LUMI_PERF_SCRIPT = `<script id="lumi-embed-perf">
(function(){
  var raf = window.requestAnimationFrame.bind(window);
  var paused = false;
  var hold = null;
  window.requestAnimationFrame = function(cb){
    if (paused) { hold = cb; return 0; }
    return raf(function(t){
      if (paused) { hold = cb; return; }
      cb(t);
    });
  };
  function setPaused(next){
    if (next === paused) return;
    paused = next;
    if (!paused && hold) {
      var cb = hold;
      hold = null;
      raf(cb);
    }
  }
  function iframeOffscreen(){
    try {
      var frame = window.frameElement;
      if (!frame) return false;
      var rect = frame.getBoundingClientRect();
      var view = frame.ownerDocument.defaultView;
      var vh = view ? view.innerHeight : 0;
      var vw = view ? view.innerWidth : 0;
      return rect.bottom < 0 || rect.right < 0 || rect.top > vh || rect.left > vw || rect.width < 2 || rect.height < 2;
    } catch (e) {
      return false;
    }
  }
  function syncPause(){
    setPaused(document.hidden || iframeOffscreen());
  }
  document.addEventListener("visibilitychange", syncPause);
  addEventListener("load", syncPause);
  setInterval(syncPause, 800);
})();
</script>`;

const EMBED_FIT_SCRIPT = `<script id="lumi-embed-fit">
(function(){
  var timer;
  var sent = 0;
  var mode = "";
  try { mode = new URLSearchParams(location.search).get("mode") || ""; } catch (e) {}
  function report(){
    if (mode === "mobile" || mode === "desktop") return;
    if (!window.parent || window.parent === window) return;
    var node = mode === "pill"
      ? (document.querySelector(".chat-pill-card, #chatPillCard") || document.body)
      : document.body;
    if (!node) return;
    var height = Math.ceil(node.getBoundingClientRect().height) || node.scrollHeight;
    if (mode === "pill") height = Math.min(Math.max(height + 4, 72), 120);
    if (!height || Math.abs(height - sent) < 2) return;
    sent = height;
    try {
      window.parent.postMessage({ type: "lumi6:interactive-height", height: height }, "*");
    } catch (e) {}
  }
  function ping(){
    clearTimeout(timer);
    timer = setTimeout(report, 160);
  }
  addEventListener("load", ping);
  if (mode !== "mobile" && mode !== "desktop" && window.ResizeObserver) {
    try {
      var observer = new ResizeObserver(ping);
      observer.observe(document.documentElement);
      if (document.body) observer.observe(document.body);
    } catch (e) {}
  }
})();
</script>`;

function patchHiddenCanvasWork(html) {
  return String(html || "").replace(
    /const w = rect\.width \|\| canvas\.width;\s*const h = rect\.height \|\| canvas\.height;\s*if \(w <= 0 \|\| h <= 0\) return;/g,
    "if (rect.width < 4 || rect.height < 4) return;\n      const w = rect.width;\n      const h = rect.height;"
  );
}

function embedHtml(html, options = {}) {
  const source = patchHiddenCanvasWork(String(html || ""));
  if (!source) return source;
  const scenario = isScenarioHtml(source);
  const css = scenario ? scenarioEmbedCss(options.mode) : EMBED_CSS;
  const tag = `<style id="lumi-embed">${css}</style>`;
  const boot = scenario
    ? `${LUMI_PERF_SCRIPT}${scenarioBootScript(options.mode)}${EMBED_FIT_SCRIPT}`
    : `${LUMI_PERF_SCRIPT}${EMBED_FIT_SCRIPT}`;
  let out = source;
  if (/<\/head>/i.test(out)) out = out.replace(/<\/head>/i, `${tag}</head>`);
  else out = `${tag}${out}`;
  if (/<\/body>/i.test(out)) out = out.replace(/<\/body>/i, `${boot}</body>`);
  else out = `${out}${boot}`;
  return out;
}

module.exports = {
  loadAll,
  listCatalog,
  match,
  getBySlug,
  commandFor,
  embedHtml,
  clearCache,
  fromFiles,
  FILE_DIR
};
