"use strict";

function groqKey() {
  return String(process.env.GROQ_API_KEY || "").trim();
}

function groqModel() {
  return String(process.env.GROQ_MODEL || "llama-3.3-70b-versatile").trim() || "llama-3.3-70b-versatile";
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

async function complete({ systemPrompt, userText, timeoutMs = 8000, temperature = 0.45 } = {}) {
  if (!isConfigured()) throw new Error("Groq is not configured.");
  const model = groqModel();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
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
  try {
    let response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${groqKey()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      if (/response_format|json_object|reasoning_effort/i.test(detail)) {
        delete body.response_format;
        delete body.reasoning_effort;
        response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${groqKey()}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body)
        });
      } else {
        throw new Error(`Groq ${response.status}: ${String(detail).slice(0, 180)}`);
      }
    }
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Groq ${response.status}: ${String(detail).slice(0, 180)}`);
    }
    const raw = await response.json();
    const message = raw?.choices?.[0]?.message || {};
    const content = String(message.content || message.reasoning || "").trim();
    if (!content) throw new Error("Groq returned empty content.");
    return { content, provider: "groq", model };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { isConfigured, complete, groqModel };
