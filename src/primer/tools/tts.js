"use strict";

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ─── OpenAI TTS ────────────────────────────────────────────────────────────────

async function openaiTts(text, apiKey) {
  const voice = String(process.env.OPENAI_TTS_VOICE || "nova").trim();
  const model = String(process.env.OPENAI_TTS_MODEL || "tts-1").trim();
  const response = await fetchWithTimeout("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: text,
      voice,
      response_format: "mp3"
    })
  }, 15000);
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`OpenAI TTS ${response.status}: ${String(detail).slice(0, 200)}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length) throw new Error("OpenAI TTS returned empty audio");
  return { buffer, contentType: "audio/mpeg" };
}

async function deepgramTts(text, apiKey) {
  const model = String(process.env.DEEPGRAM_TTS_MODEL || "aura-2-thalia-en").trim();
  const speed = String(process.env.DEEPGRAM_TTS_SPEED || "1").trim();
  const spoken = String(text || "").replace(/\s+/g, " ").trim();
  const response = await fetchWithTimeout(
    `https://api.deepgram.com/v1/speak?model=${encodeURIComponent(model)}&encoding=mp3&speed=${encodeURIComponent(speed)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text: spoken })
    },
    15000
  );
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Deepgram TTS ${response.status}: ${String(detail).slice(0, 200)}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length) throw new Error("Deepgram TTS returned empty audio");
  return { buffer, contentType: "audio/mpeg" };
}

// ─── Cartesia TTS ──────────────────────────────────────────────────────────────

async function cartesiaTts(text, apiKey) {
  const modelId = String(process.env.CARTESIA_MODEL || "sonic-3.5").trim();
  const voiceId = String(process.env.CARTESIA_VOICE_ID || "db6b0ed5-d5d3-463d-ae85-518a07d3c2b4").trim();
  const response = await fetchWithTimeout("https://api.cartesia.ai/tts/bytes", {
    method: "POST",
    headers: {
      "Cartesia-Version": "2026-03-01",
      Authorization: `Bearer ${apiKey}`,
      "X-API-Key": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model_id: modelId,
      transcript: text,
      language: "en",
      voice: { mode: "id", id: voiceId },
      output_format: { container: "mp3", sample_rate: 44100, bit_rate: 128000 }
    })
  }, 15000);
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Cartesia ${response.status}: ${String(detail).slice(0, 200)}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length) throw new Error("Cartesia returned empty audio");
  return { buffer, contentType: "audio/mpeg" };
}

// ─── Main synthesize function with automatic fallback ──────────────────────────

async function synthesizeCartesiaSpeech(transcript) {
  const text = String(transcript || "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 4000);
  if (!text) return null;

  const ttsProvider = String(process.env.TTS_PROVIDER || "").trim().toLowerCase();
  const cartesiaKey = String(process.env.CARTESIA_API_KEY || "").trim();
  const openaiKey = String(process.env.OPENAI_API_KEY || "").trim();
  const deepgramKey = String(process.env.DEEPGRAM_API_KEY || "").trim();

  const providers = [];

  if (ttsProvider === "deepgram" && deepgramKey) {
    providers.push({ name: "deepgram", fn: () => deepgramTts(text, deepgramKey) });
  } else if (ttsProvider === "openai" && openaiKey) {
    providers.push({ name: "openai", fn: () => openaiTts(text, openaiKey) });
  } else if (ttsProvider === "cartesia" && cartesiaKey) {
    providers.push({ name: "cartesia", fn: () => cartesiaTts(text, cartesiaKey) });
  }

  if (deepgramKey && !providers.some((p) => p.name === "deepgram")) {
    providers.push({ name: "deepgram", fn: () => deepgramTts(text, deepgramKey) });
  }
  if (cartesiaKey && !providers.some((p) => p.name === "cartesia")) {
    providers.push({ name: "cartesia", fn: () => cartesiaTts(text, cartesiaKey) });
  }
  if (openaiKey && !providers.some((p) => p.name === "openai")) {
    providers.push({ name: "openai", fn: () => openaiTts(text, openaiKey) });
  }

  if (!providers.length) return null;

  for (const provider of providers) {
    try {
      return await provider.fn();
    } catch (err) {
      console.warn(`[TTS] ${provider.name} failed:`, err.message);
    }
  }
  return null;
}

function audioToPayload(audio) {
  if (!audio?.buffer?.length) return { audioBase64: null, audioContentType: null };
  return {
    audioBase64: audio.buffer.toString("base64"),
    audioContentType: audio.contentType || "audio/mpeg"
  };
}

module.exports = {
  synthesizeCartesiaSpeech,
  audioToPayload
};
