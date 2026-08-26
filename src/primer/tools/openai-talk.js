"use strict";

const DEFAULT_MODEL = "gpt-5.6-luna";

function openaiKey() {
  return String(process.env.OPENAI_API_KEY || process.env.AI_API_KEY || "").trim();
}

function talkModel() {
  return String(process.env.PRIMER_TALK_MODEL || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
}

function isConfigured() {
  return openaiKey().startsWith("sk-");
}

async function fetchChat(model, systemPrompt, userText, timeoutMs, temperature) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const body = {
    model,
    temperature,
    max_completion_tokens: 500,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: String(systemPrompt || "") },
      { role: "user", content: String(userText || "") }
    ]
  };
  try {
    let response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${openaiKey()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      if (/response_format|max_completion_tokens|max_tokens|temperature/i.test(detail)) {
        if (/max_completion_tokens/i.test(detail)) {
          body.max_tokens = body.max_completion_tokens || 500;
          delete body.max_completion_tokens;
        } else if (/max_tokens/i.test(detail)) {
          body.max_completion_tokens = body.max_tokens || 500;
          delete body.max_tokens;
        }
        if (/response_format/i.test(detail)) delete body.response_format;
        if (/temperature/i.test(detail)) delete body.temperature;
        response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${openaiKey()}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body)
        });
      } else {
        throw new Error(`OpenAI talk ${response.status}: ${String(detail).slice(0, 180)}`);
      }
    }
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`OpenAI talk ${response.status}: ${String(detail).slice(0, 180)}`);
    }
    const raw = await response.json();
    const message = raw?.choices?.[0]?.message || {};
    const content = String(message.content || "").trim();
    if (!content) throw new Error("OpenAI talk returned empty content.");
    console.log(`[PRIMER] talk via ${model}`);
    return { content, provider: "openai", model };
  } finally {
    clearTimeout(timer);
  }
}

async function complete({ systemPrompt, userText, timeoutMs = 18000, temperature = 0.4 } = {}) {
  if (!isConfigured()) throw new Error("OpenAI talk is not configured.");
  const primary = talkModel();
  const models = [primary, "gpt-4o-mini", "gpt-4o", "gpt-3.5-turbo"];
  const uniqueModels = [...new Set(models.filter(Boolean))];

  let lastError = null;
  for (const model of uniqueModels) {
    try {
      return await fetchChat(model, systemPrompt, userText, timeoutMs, temperature);
    } catch (err) {
      lastError = err;
      console.warn(`[PRIMER] talk attempt with ${model} failed:`, err.message);
    }
  }
  throw lastError || new Error("All OpenAI chat models failed.");
}

module.exports = { isConfigured, complete, talkModel };
