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
  return true;
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

async function downloadImageAsBase64(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Lumi6EducationalTutor/1.0 (https://lumi6.com)" }
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length || buf.length < 500) return null;
    return { mime: contentType.split(";")[0].trim(), b64: buf.toString("base64") };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function searchEducationalGraphic(topic, spoken) {
  const query = String(topic || spoken || "")
    .replace(/^(teach me about|teach me|tell me about|what is|what's|whats|how does|how do|how to|can you teach me|explain|i want to learn about)\s+/i, "")
    .replace(/[?.!]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!query || query.length < 2) return null;

  // 1. Wikipedia Page Thumbnail / Original (high quality 1024px raster)
  const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=5&prop=pageimages|extracts&exintro=1&explaintext=1&piprop=thumbnail|original&pithumbsize=1024&format=json&origin=*`;
  try {
    const res = await fetch(wikiUrl, {
      headers: { "User-Agent": "Lumi6EducationalTutor/1.0 (https://lumi6.com)" }
    });
    if (res.ok) {
      const data = await res.json();
      const pages = Object.values(data?.query?.pages || {}).sort((a, b) => (a.index || 0) - (b.index || 0));
      for (const page of pages) {
        const imgUrl = page.thumbnail?.source || page.original?.source;
        if (imgUrl && !/\.(webm|ogv|mp4|avi|mov)$/i.test(imgUrl) && !/icon|logo|flag|disambig|symbol/i.test(imgUrl)) {
          const fetched = await downloadImageAsBase64(imgUrl);
          if (fetched) {
            console.log(`[PRIMER] Educational graphic found via Wikipedia for "${query}": ${page.title}`);
            return { mime: fetched.mime, b64: fetched.b64, model: "wikimedia:wikipedia" };
          }
        }
      }
    }
  } catch (err) {
    console.warn("[PRIMER] Wikipedia image search failed:", err.message);
  }

  // 2. Wikimedia Commons scientific diagram & illustration search
  const commonsUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(query + " diagram illustration science")}&gsrlimit=5&prop=imageinfo&iiprop=url|mime|size&iiurlwidth=1024&format=json&origin=*`;
  try {
    const res = await fetch(commonsUrl, {
      headers: { "User-Agent": "Lumi6EducationalTutor/1.0 (https://lumi6.com)" }
    });
    if (res.ok) {
      const data = await res.json();
      const pages = Object.values(data?.query?.pages || {});
      for (const page of pages) {
        const info = page.imageinfo?.[0];
        const imgUrl = info?.thumburl || info?.url;
        if (imgUrl && !/\.(webm|ogv|mp4|avi|mov)$/i.test(imgUrl) && !/icon|logo|flag|symbol/i.test(imgUrl)) {
          const fetched = await downloadImageAsBase64(imgUrl);
          if (fetched) {
            console.log(`[PRIMER] Educational graphic found via Commons for "${query}": ${page.title}`);
            return { mime: fetched.mime, b64: fetched.b64, model: "wikimedia:commons" };
          }
        }
      }
    }
  } catch (err) {
    console.warn("[PRIMER] Commons image search failed:", err.message);
  }

  return null;
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
  const cleanTopic = String(topic || scene || "").replace(/\s+/g, " ").trim().slice(0, 120);
  const cleanScene = String(scene || topic || spoken || "the core physical concept").replace(/\s+/g, " ").trim().slice(0, 160);
  const prior = String(previousScene || "").replace(/\s+/g, " ").trim().slice(0, 160);
  const style = styleGuide({ grade, age });
  const overview = kind !== "detail";
  const sceneLine = overview
    ? `Create a clear, highly relatable, and educational illustration showing "${cleanTopic || cleanScene}".
A student should clearly understand the physical concept from the visual itself.
Make it visually stunning, vibrant, accurate to science, and relatable to a student's intuition.`
    : prior
      ? `The previous visual showed "${prior}". Create a NEW detailed illustration focusing on "${cleanScene}".`
      : `Create a detailed educational illustration focusing on "${cleanScene}".`;
  return `${style.look}

Concept: "${cleanTopic || cleanScene}"

${sceneLine}
Keep the composition clean, balanced, and easy to understand at a glance.
No written words, no labels, no arrows, no watermarks, no distorted symbols.
The illustration must be complete and fill the entire frame.`;
}

function photoCommand(input, image, model) {
  return {
    tool: "place_photo",
    title: String(input.scene || input.topic || "Picture").slice(0, 48),
    href: remember(image.mime, image.b64),
    model: model || "educational_image",
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
  const topic = input.topic || input.scene || input.spoken || "";

  // 1. Try instant educational image search first (Wikimedia / Wikipedia scientific diagrams)
  try {
    const eduImage = await searchEducationalGraphic(topic, input.spoken);
    if (eduImage?.b64) {
      return photoCommand(input, eduImage, eduImage.model);
    }
  } catch (err) {
    console.warn("[PRIMER] Educational image search error:", err.message);
  }

  // 2. Try OpenAI image generation if key is configured
  if (openaiKey().startsWith("sk-")) {
    const prompt = kidPrompt(input);
    const attempts = [];
    const preferred = String(process.env.OPENAI_IMAGE_MODEL || "").trim();
    const models = [
      preferred,
      "dall-e-3",
      "dall-e-2"
    ].filter(Boolean);

    for (const model of [...new Set(models)]) {
      attempts.push([`openai:${model}`, () => requestOpenAIModel(model, prompt, 28000)]);
    }

    const live = attempts.filter(([label]) => !retiredModels.has(label));
    live.sort((a, b) => (b[0] === lastGoodLabel ? 1 : 0) - (a[0] === lastGoodLabel ? 1 : 0));

    for (const [label, fn] of live) {
      const image = await tryOne(label, fn);
      if (image?.b64) return photoCommand(input, image, image.model || label);
    }
  }

  return null;
}

module.exports = { isConfigured, generate, get };
