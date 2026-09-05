"use strict";

// Groq retires model ids without notice. When the configured id is gone we ask
// Groq what this key can actually use, so a dead name never costs every turn a
// failed round trip plus a slow fallback provider.
// Ordered by how well each one holds the lesson topic, measured with
// The gpt-oss models drift badly.
const PREFERRED_MODELS = [
  "groq/compound",
  "llama-3.3-70b-versatile",
  "groq/compound-mini",
  "llama-3.1-8b-instant",
  "moonshotai/kimi-k2-instruct",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b"
];
const NON_CHAT = /whisper|tts|guard|embed|vision|allam|distil|playai|prompt-?guard/i;
const MODEL_GONE = /model_not_found|does not exist|not found|decommissioned|deprecated/i;

const deadModels = new Set();
let resolvedModel = null;

function groqKey() {
  return String(process.env.GROQ_API_KEY || "").trim();
}

function configuredModel() {
  return String(process.env.GROQ_MODEL || "").trim();
}

function groqModel() {
  return resolvedModel || configuredModel() || PREFERRED_MODELS[0];
}

function isConfigured() {
  return groqKey().startsWith("gsk_");
}

function effortFor(model) {
  const id = String(model || "").toLowerCase();
  if (id.includes("qwen")) return "none";
  if (id.includes("gpt-oss")) return "low";
  return undefined;
}

async function availableModels(timeoutMs = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch("https://api.groq.com/openai/v1/models", {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${groqKey()}` }
    });
    if (!response.ok) return [];
    const raw = await response.json();
    return (Array.isArray(raw?.data) ? raw.data : [])
      .map((entry) => String(entry?.id || "").trim())
      .filter((id) => id && !NON_CHAT.test(id));
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function pickLiveModel() {
  const ids = await availableModels();
  if (!ids.length) return null;
  const usable = ids.filter((id) => !deadModels.has(id));
  const preferred = PREFERRED_MODELS.find((name) => usable.includes(name));
  const chosen = preferred || usable.find((id) => /llama|gpt-oss|kimi|qwen/i.test(id)) || usable[0] || null;
  if (chosen) console.log(`[PRIMER] Groq talk model resolved to ${chosen}`);
  return chosen;
}

async function callGroq(model, systemPrompt, userText, temperature, signal) {
  const body = {
    model,
    temperature: typeof temperature === "number" ? temperature : 0.45,
    max_tokens: 480,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: String(systemPrompt || "") },
      { role: "user", content: String(userText || "") }
    ]
  };
  const effort = effortFor(model);
  if (effort) body.reasoning_effort = effort;
  const send = () => fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    signal,
    headers: {
      Authorization: `Bearer ${groqKey()}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  let response = await send();
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    if (/response_format|json_object|reasoning_effort/i.test(detail)) {
      delete body.response_format;
      delete body.reasoning_effort;
      response = await send();
    } else {
      const error = new Error(`Groq ${response.status}: ${String(detail).slice(0, 180)}`);
      error.modelGone = response.status === 404 || MODEL_GONE.test(detail);
      throw error;
    }
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    const error = new Error(`Groq ${response.status}: ${String(detail).slice(0, 180)}`);
    error.modelGone = response.status === 404 || MODEL_GONE.test(detail);
    throw error;
  }
  const raw = await response.json();
  const message = raw?.choices?.[0]?.message || {};
  const content = String(message.content || message.reasoning || "").trim();
  if (!content) throw new Error("Groq returned empty content.");
  return { content, provider: "groq", model };
}

async function complete({ systemPrompt, userText, timeoutMs = 8000, temperature = 0.45 } = {}) {
  if (!isConfigured()) throw new Error("Groq is not configured.");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const first = groqModel();
    if (!deadModels.has(first)) {
      try {
        return await callGroq(first, systemPrompt, userText, temperature, controller.signal);
      } catch (err) {
        if (!err?.modelGone) throw err;
        deadModels.add(first);
        if (resolvedModel === first) resolvedModel = null;
        console.warn(`[PRIMER] Groq model ${first} is gone; asking Groq for a live model`);
      }
    }
    const replacement = await pickLiveModel();
    if (!replacement) throw new Error("Groq has no usable chat model for this key.");
    resolvedModel = replacement;
    return await callGroq(replacement, systemPrompt, userText, temperature, controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { isConfigured, complete, groqModel };
