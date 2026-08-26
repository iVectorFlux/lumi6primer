"use strict";

const crypto = require("crypto");

const graphics = new Map();
const retiredModels = new Set();
let lastGoodLabel = "";

function isRetiredError(err) {
  return /\b404\b|does not exist|is not found|not supported for predict|invalid_val/i.test(String(err?.message || ""));
}

function openaiKey() {
  return String(process.env.OPENAI_API_KEY || process.env.AI_API_KEY || "").trim();
}

function isConfigured() {
  return openaiKey().startsWith("sk-");
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

async function requestOpenAIModel(model, prompt, timeoutMs) {
  const key = openaiKey();
  if (!key.startsWith("sk-")) throw new Error("OpenAI image is not configured.");
  const isDalle3 = /dall-e-3/i.test(model);
  const isDalle2 = /dall-e-2/i.test(model);
  const gpt = /gpt-image/i.test(model);

  const body = {
    model,
    prompt,
    n: 1,
    size: isDalle3 ? "1024x1024" : gpt ? "1536x1024" : "1024x1024"
  };
  if (isDalle3) {
    body.quality = "standard";
    body.response_format = "b64_json";
  } else if (isDalle2) {
    body.response_format = "b64_json";
  } else if (gpt) {
    body.quality = "low";
  }

  const result = await fetchJson("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  }, timeoutMs);

  if (!result.ok) {
    // If specific option failed (e.g. response_format or quality not supported on this model), retry with simple body
    if (/response_format|quality|size/i.test(result.text || "")) {
      const simpleBody = { model, prompt, n: 1 };
      const retryResult = await fetchJson("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(simpleBody)
      }, timeoutMs);
      if (retryResult.ok) {
        result.ok = true;
        result.json = retryResult.json;
        result.status = retryResult.status;
      }
    }
  }

  if (!result.ok) {
    throw new Error(`OpenAI ${model} ${result.status}: ${String(result.text || "").slice(0, 160)}`);
  }

  const item = result.json?.data?.[0] || result.json?.output?.[0] || {};
  const inline = item.b64_json || item.image_base64 || item.b64 || result.json?.b64_json || "";
  if (inline) return { mime: "image/png", b64: inline, model };
  if (item.url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
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
  const preferred = String(process.env.OPENAI_IMAGE_MODEL || "").trim();
  const models = [
    preferred,
    "dall-e-3",
    "gpt-image-2",
    "gpt-image-1.5",
    "gpt-image-1",
    "gpt-image-1-mini",
    "dall-e-2"
  ].filter(Boolean);

  for (const model of [...new Set(models)]) {
    attempts.push([`openai:${model}`, () => requestOpenAIModel(model, prompt, 28000)]);
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
