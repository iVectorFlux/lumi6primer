"use strict";

const crypto = require("crypto");

const graphics = new Map();
let geminiSkipUntil = 0;

// A model that answers "does not exist" will never start existing mid-process,
// so retrying it just adds its whole timeout to every picture the child waits for.
const retiredModels = new Set();
let lastGoodLabel = "";

function isRetiredError(err) {
  return /\b404\b|does not exist|is not found|not supported for predict|invalid_val/i.test(String(err?.message || ""));
}

function geminiKey() {
  return String(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "").trim();
}

function openaiKey() {
  return String(process.env.OPENAI_API_KEY || process.env.AI_API_KEY || "").trim();
}

function isConfigured() {
  return geminiKey().length > 20 || openaiKey().startsWith("sk-");
}

function geminiFlashAllowed() {
  return geminiKey().length > 20 && Date.now() >= geminiSkipUntil;
}

function noteGeminiFailure(err) {
  const msg = String(err?.message || "");
  if (/\b429\b|quota|RESOURCE_EXHAUSTED/i.test(msg)) {
    geminiSkipUntil = Date.now() + 60 * 60 * 1000;
    console.warn("[PRIMER] Gemini Flash Image quota hit; skipping it for 1 hour");
  }
}

function get(id) {
  return graphics.get(String(id || ""));
}

function remember(mime, b64) {
  const id = crypto.randomBytes(8).toString("hex");
  graphics.set(id, {
    mime: mime || "image/png",
    buffer: Buffer.from(b64, "base64"),
    at: Date.now()
  });
  if (graphics.size > 40) {
    const oldest = [...graphics.entries()].sort((a, b) => a[1].at - b[1].at)[0];
    if (oldest) graphics.delete(oldest[0]);
  }
  return `/api/primer/graphic/${id}`;
}

function gradeNumber(grade, age) {
  const n = Number(String(grade || "").replace(/^[^\d]*/, "").replace(/[^\d].*$/, ""));
  if (n >= 3 && n <= 12) return n;
  const years = Number(age);
  if (years >= 16) return 11;
  if (years >= 12) return 8;
  return 5;
}

function styleGuide({ grade, age } = {}) {
  const g = gradeNumber(grade, age);
  if (g <= 5) {
    return {
      band: "cartoon",
      look: `Bright cartoon picture-book art for a class ${g} child (about ${g + 5} years old).
Soft candy colors, thick round outlines, simple cute shapes, playful and friendly.
No photoreal people, no scary faces, no gore.`
    };
  }
  if (g <= 10) {
    return {
      band: "bookish",
      look: `Clear educational textbook illustration for a class ${g} student.
Colored-pencil / encyclopedia style: tidy, a bit more detail than a cartoon, still drawn.
Not a photograph, not a meme, not a corporate stock image.`
    };
  }
  return {
    band: "academic",
    look: `Clean high-school educational graphic for class ${g}.
Precise, calm, informative — like a well-designed textbook figure or museum panel.
Illustrated, not a photo. No photoreal humans, no fashion/stock-model faces.`
  };
}

function kidPrompt({ topic, spoken, question, age, grade, scene, previousScene, kind } = {}) {
  const asked = String(question || "").replace(/\s+/g, " ").trim().slice(0, 220);
  const focus = String(scene || topic || asked || spoken || "this idea").replace(/\s+/g, " ").trim().slice(0, 160);
  const prior = String(previousScene || "").replace(/\s+/g, " ").trim().slice(0, 160);
  const style = styleGuide({ grade, age });
  const overview = kind !== "detail";
  const sceneLine = overview
    ? `Draw ONE complete landscape that tells the whole story of "${topic || focus}" at a glance.
A child should understand the idea from the picture itself.
If it is a cycle, show the full loop in one scene: start, middle, and return.
Do not zoom into one tiny step.`
    : prior
      ? `The board already shows "${prior}". Draw a NEW close-up of this next moment only: "${focus}". Same world, closer in.`
      : `Draw a close-up of this one moment: "${focus}".`;
  return `${style.look}

The student asked: "${asked || focus}"

${sceneLine}
Keep it easy to understand at a glance.
No written words, no labels, no arrows, no flowcharts, no infographic text.
The picture must be complete and fill the whole frame.`;
}

function photoCommand(input, image, model) {
  return {
    tool: "place_photo",
    title: String(input.scene || input.topic || "Picture").slice(0, 48),
    href: remember(image.mime, image.b64),
    model,
    keepOthers: true,
    archivePrevious: true
  };
}

function extractInlineImage(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return null;
  for (const part of parts) {
    const data = part?.inlineData || part?.inline_data;
    const mime = String(data?.mimeType || data?.mime_type || "image/png").trim() || "image/png";
    const b64 = String(data?.data || "").trim();
    if (b64.length > 80) return { mime, b64 };
  }
  return null;
}

function extractImagen(payload) {
  const preds = payload?.predictions;
  if (!Array.isArray(preds)) return null;
  for (const pred of preds) {
    const b64 = String(pred?.bytesBase64Encoded || pred?.image?.bytesBase64Encoded || "").trim();
    if (b64.length > 80) {
      return {
        mime: String(pred?.mimeType || "image/png"),
        b64
      };
    }
  }
  return null;
}

function sanitizeErr(err) {
  return String(err?.message || err || "error")
    .replace(/key[^\s"]*/gi, "")
    .replace(/sk-[a-zA-Z0-9_-]+/g, "[redacted]")
    .slice(0, 180);
}

async function fetchJson(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text().catch(() => "");
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch {}
    return { ok: response.ok, status: response.status, json, text };
  } finally {
    clearTimeout(timer);
  }
}

async function requestGeminiFlash(model, prompt, timeoutMs) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const result = await fetchJson(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": geminiKey()
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: { aspectRatio: "16:9" }
      }
    })
  }, timeoutMs);
  if (!result.ok) {
    throw new Error(`Gemini ${result.status}: ${String(result.text || "").replace(/key[^\s"]*/gi, "").slice(0, 160)}`);
  }
  const image = extractInlineImage(result.json);
  if (!image) throw new Error("Gemini returned no image.");
  return image;
}

async function requestImagenFast(prompt, timeoutMs) {
  const model = "imagen-4.0-fast-generate-001";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:predict`;
  const result = await fetchJson(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": geminiKey()
    },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: {
        sampleCount: 1,
        aspectRatio: "16:9"
      }
    })
  }, timeoutMs);
  if (!result.ok) {
    throw new Error(`Imagen ${result.status}: ${String(result.text || "").replace(/key[^\s"]*/gi, "").slice(0, 160)}`);
  }
  const image = extractImagen(result.json);
  if (!image) throw new Error("Imagen returned no image.");
  return { ...image, model };
}

async function requestOpenAIModel(model, prompt, timeoutMs) {
  const key = openaiKey();
  if (!key.startsWith("sk-")) throw new Error("OpenAI image is not configured.");
  const gpt = /gpt-image/i.test(model);
  const body = {
    model,
    prompt,
    n: 1,
    size: gpt ? "1536x1024" : "1792x1024"
  };
  if (gpt) body.quality = "low";
  const result = await fetchJson("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  }, timeoutMs);
  if (!result.ok) {
    throw new Error(`OpenAI ${model} ${result.status}: ${String(result.text || "").slice(0, 160)}`);
  }
  const item = result.json?.data?.[0] || result.json?.output?.[0] || {};
  const inline = item.b64_json || item.image_base64 || item.b64 || result.json?.b64_json || "";
  if (inline) return { mime: "image/png", b64: inline, model };
  if (item.url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const bin = await fetch(item.url, { signal: controller.signal });
      if (!bin.ok) throw new Error(`OpenAI image download ${bin.status}`);
      const buf = Buffer.from(await bin.arrayBuffer());
      return { mime: "image/png", b64: buf.toString("base64"), model };
    } finally {
      clearTimeout(timer);
    }
  }
  const shape = Object.keys(item).join(",") || Object.keys(result.json || {}).join(",") || "empty";
  throw new Error(`OpenAI ${model} returned no image payload (fields: ${shape})`);
}

async function tryOne(label, fn) {
  const started = Date.now();
  try {
    const image = await fn();
    console.log(`[PRIMER] graphic ok via ${image.model || label} in ${Date.now() - started}ms`);
    lastGoodLabel = label;
    return image;
  } catch (err) {
    console.warn(`[PRIMER] graphic failed (${label}):`, sanitizeErr(err));
    if (label.startsWith("gemini")) noteGeminiFailure(err);
    if (isRetiredError(err)) {
      retiredModels.add(label);
      console.warn(`[PRIMER] dropping ${label} for this process — the API says it does not exist`);
    }
    if (lastGoodLabel === label) lastGoodLabel = "";
    return null;
  }
}

async function generate(input = {}) {
  if (!isConfigured()) return null;
  const prompt = kidPrompt(input);

  const attempts = [];
  // If OpenAI is available, include working OpenAI image models
  if (openaiKey().startsWith("sk-")) {
    const preferred = String(process.env.OPENAI_IMAGE_MODEL || "gpt-image-2").trim();
    for (const model of [...new Set([preferred, "gpt-image-1.5", "gpt-image-1", "gpt-image-1-mini"])]) {
      attempts.push([`openai:${model}`, () => requestOpenAIModel(model, prompt, 26000)]);
    }
  }
  if (geminiKey().length > 20 && geminiFlashAllowed()) {
    const flash = String(process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image").trim();
    attempts.push([`gemini:${flash}`, () => requestGeminiFlash(flash, prompt, 8000)]);
  }
  if (geminiKey().length > 20 && geminiFlashAllowed()) {
    attempts.push(["imagen-fast", () => requestImagenFast(prompt, 10000)]);
  }

  const live = attempts.filter(([label]) => !retiredModels.has(label));
  // The model that worked last time goes first, so a good run stays a one-call run.
  live.sort((a, b) => (b[0] === lastGoodLabel ? 1 : 0) - (a[0] === lastGoodLabel ? 1 : 0));

  for (const [label, fn] of live) {
    const image = await tryOne(label, fn);
    if (image?.b64) return photoCommand(input, image, image.model || label);
  }
  return null;
}

module.exports = { isConfigured, generate, get };
