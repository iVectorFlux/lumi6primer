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
  const queries = graphicQueries(topic, spoken);
  for (const query of queries) {
    const wiki = await searchWikipediaImage(query);
    if (wiki) return wiki;
  }
  for (const query of queries) {
    const commons = await searchCommonsImage(query);
    if (commons) return commons;
  }
  return null;
}

const QUERY_STOP = new Set(["the","and","for","from","with","this","that","into","about","why","are","is","so","how","what","when","where","who","can","you","me","my","your","our","its","too","very","just","than","then","they","them","their","been","being","have","has","had","was","were","will","would","could","should","does","did","not","but","far","away"]);
const PERSON_PAGE = /\b(born \d|is an? (american|british|english|irish|australian|canadian|indian|french|german|italian|spanish)?\s*(actor|actress|singer|rapper|politician|footballer|soccer player|player|writer|author|director|comedian|musician|model))\b/i;
const PERSON_TITLE = /\b(film|album|song|novel|episode|actor|actress|politician|biography|discography)\b/i;
const BAD_IMAGE = /portrait|headshot|selfie|mugshot|autograph|signature|logo|icon|flag|disambig|symbol|coat_of_arms|wordmark|poster|cover_art|album|screenshot/i;

function stripPrompt(value) {
  return String(value || "")
    .replace(/^(can you |could you |please )?(teach me about|teach me|tell me about|explain to me|explain|what is|what's|whats|why is|why are|why do|why does|how does|how do|how to|i want to learn about)\s+/i, "")
    .replace(/[?.!]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function topicKeywords(text) {
  return String(text || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !QUERY_STOP.has(word));
}

function expandTopic(main) {
  const t = String(main || "").toLowerCase();
  if (/\bstars?\b/.test(t) && /\b(far|distance|away|distant|faraway)\b/.test(t)) {
    return ["star distance", "stellar distance astronomy", "stars night sky"];
  }
  if (/\bsky\b/.test(t) && /\bblue\b/.test(t)) return ["rayleigh scattering", "blue sky atmosphere"];
  if (/\bwater cycle\b/.test(t)) return ["water cycle diagram", "hydrologic cycle"];
  if (/\bphotosynth/.test(t)) return ["photosynthesis diagram"];
  if (/\bvolcano/.test(t)) return ["volcano diagram", "volcanic eruption"];
  if (/\bgravity\b/.test(t)) return ["gravity physics", "newton gravity"];
  return [];
}

function graphicQueries(topic, spoken) {
  const main = stripPrompt(topic);
  const spokenClean = stripPrompt(spoken);
  const words = topicKeywords(`${main} ${spokenClean}`);
  const core = words.slice(0, 5).join(" ");
  const extras = expandTopic(`${main} ${spokenClean}`);
  return [...new Set([
    core,
    extras[0],
    extras[1],
    extras[2],
    core ? `${core} science` : "",
    core ? `${core} diagram` : "",
    spokenClean,
    main
  ].filter((query) => query && query.length >= 3))].slice(0, 6);
}

function scoreEducationalPage(page, query, imgUrl) {
  const title = String(page.title || "");
  const extract = String(page.extract || "");
  const hay = `${title} ${extract} ${imgUrl || ""}`;
  if (!imgUrl || /\.(webm|ogv|mp4|avi|mov)$/i.test(imgUrl) || BAD_IMAGE.test(hay)) return -100;
  if (PERSON_PAGE.test(extract) || PERSON_TITLE.test(title)) return -90;
  const qWords = topicKeywords(query);
  let score = 0;
  const lower = hay.toLowerCase();
  for (const word of qWords) {
    if (lower.includes(word)) score += 4;
  }
  if (/\b(diagram|illustration|chart|map|telescope|galaxy|planet|astronomy|physics|chemistry|biology|science|cycle|orbit)\b/i.test(hay)) score += 8;
  if (/\.svg(\?|$)/i.test(imgUrl)) score += 4;
  if (qWords.length && score < 4) return -20;
  return score;
}

async function searchWikipediaImage(query) {
  const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=8&prop=pageimages|extracts&exintro=1&explaintext=1&piprop=thumbnail|original&pithumbsize=1280&format=json&origin=*`;
  try {
    const res = await fetch(wikiUrl, {
      headers: { "User-Agent": "Lumi6EducationalTutor/1.0 (https://lumi6.com)" }
    });
    if (!res.ok) return null;
    const data = await res.json();
    const pages = Object.values(data?.query?.pages || {})
      .map((page) => {
        const imgUrl = page.original?.source || page.thumbnail?.source || "";
        return { page, imgUrl, score: scoreEducationalPage(page, query, imgUrl) };
      })
      .filter((item) => item.score >= 4)
      .sort((a, b) => b.score - a.score || (a.page.index || 0) - (b.page.index || 0));
    for (const item of pages) {
      const fetched = await downloadImageAsBase64(item.imgUrl);
      if (fetched) {
        console.log(`[PRIMER] Educational graphic found via Wikipedia for "${query}": ${item.page.title} (${item.score})`);
        return { mime: fetched.mime, b64: fetched.b64, model: "wikimedia:wikipedia" };
      }
    }
  } catch (err) {
    console.warn("[PRIMER] Wikipedia image search failed:", err.message);
  }
  return null;
}

async function searchCommonsImage(query) {
  const commonsUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(`${query} diagram illustration science -portrait -headshot`)}&gsrlimit=8&prop=imageinfo|extracts&iiprop=url|mime|size|extmetadata&iiurlwidth=1280&format=json&origin=*`;
  try {
    const res = await fetch(commonsUrl, {
      headers: { "User-Agent": "Lumi6EducationalTutor/1.0 (https://lumi6.com)" }
    });
    if (!res.ok) return null;
    const data = await res.json();
    const pages = Object.values(data?.query?.pages || {})
      .map((page) => {
        const info = page.imageinfo?.[0];
        const imgUrl = info?.thumburl || info?.url || "";
        return { page, imgUrl, score: scoreEducationalPage(page, query, imgUrl) };
      })
      .filter((item) => item.score >= 4)
      .sort((a, b) => b.score - a.score);
    for (const item of pages) {
      const fetched = await downloadImageAsBase64(item.imgUrl);
      if (fetched) {
        console.log(`[PRIMER] Educational graphic found via Commons for "${query}": ${item.page.title} (${item.score})`);
        return { mime: fetched.mime, b64: fetched.b64, model: "wikimedia:commons" };
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

async function inferTopicFromImage(dataUrl) {
  const key = openaiKey();
  if (!key.startsWith("sk-") || typeof dataUrl !== "string" || !dataUrl.startsWith("data:image")) return "";
  const models = [...new Set([
    String(process.env.OPENAI_VISION_MODEL || "").trim(),
    "gpt-4o-mini",
    "gpt-4o"
  ].filter(Boolean))];
  for (const model of models) {
    const result = await fetchJson("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        max_tokens: 40,
        temperature: 0,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: "This is a child's handwriting or doodle. Reply with only the topic to illustrate, 1 to 6 words. No quotes. Examples: zebra, water cycle, volcano." },
            { type: "image_url", image_url: { url: dataUrl } }
          ]
        }]
      })
    }, 20000);
    const text = String(result.json?.choices?.[0]?.message?.content || "").replace(/^["'\s]+|["'\s.]+$/g, "").trim().slice(0, 80);
    if (text.length >= 2 && !/sorry|can't|cannot|unable/i.test(text)) return text;
  }
  return "";
}

async function generate(input = {}) {
  let topic = String(input.topic || input.scene || input.spoken || "").replace(/\s+/g, " ").trim();
  if (topic.length < 2 && input.image) {
    topic = await inferTopicFromImage(input.image);
  }
  if (topic.length < 2) topic = input.image ? "this child's drawing" : "";
  if (topic.length < 2) return null;
  input = { ...input, topic, spoken: input.spoken || topic, scene: input.scene || topic };
  const skipSearch = /this child's drawing|this drawing|this sketch/i.test(topic);

  if (!skipSearch) {
    try {
      const eduImage = await searchEducationalGraphic(topic, input.spoken);
      if (eduImage?.b64) {
        return photoCommand(input, eduImage, eduImage.model);
      }
    } catch (err) {
      console.warn("[PRIMER] Educational image search error:", err.message);
    }
  }

  // Pairing an image beside an interactive is only worth it when it costs nothing,
  // so callers asking for a companion image stop here.
  if (input.freeOnly) return null;

  // 2. Try OpenAI image generation if key is configured
  if (openaiKey().startsWith("sk-")) {
    const prompt = kidPrompt(input);
    const attempts = [];
    const preferred = String(process.env.OPENAI_IMAGE_MODEL || "").trim();
    const models = [
      preferred,
      "gpt-image-1",
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
