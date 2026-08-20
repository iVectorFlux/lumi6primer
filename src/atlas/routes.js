"use strict";

const TeachingLoop = require("./teaching-loop.js");
const ConversationManager = require("./conversation-manager.js");
const WhiteboardController = require("./whiteboard-controller.js");
const { RealLumi6AiProvider, LiveLumi6WhiteboardClient } = require("./lumi6-bridge.js");
const { synthesizeCartesiaSpeech } = require("./cartesia-tts.js");

const liveAiProvider = new RealLumi6AiProvider();
const liveWhiteboardClient = new LiveLumi6WhiteboardClient();

const defaultTeachingLoop = new TeachingLoop({
  conversationManager: new ConversationManager({ aiProvider: liveAiProvider }),
  whiteboardController: new WhiteboardController({ lumi6Client: liveWhiteboardClient })
});

/**
 * Helper to read JSON request body.
 * @param {import('http').IncomingMessage} req 
 * @returns {Promise<Object>}
 */
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 6 * 1048576) {
        req.destroy();
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

/**
 * Helper to send JSON HTTP response.
 * @param {import('http').ServerResponse} res 
 * @param {number} statusCode 
 * @param {Object} payload 
 */
function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8"
  });
  res.end(JSON.stringify(payload));
}

/**
 * Express / HTTP router for ATLAS endpoints under /api/atlas
 * 
 * @param {import('http').IncomingMessage} req 
 * @param {import('http').ServerResponse} res 
 * @param {URL} url 
 * @param {Object} [options]
 * @param {TeachingLoop} [options.teachingLoop] - Optional custom TeachingLoop instance
 * @returns {Promise<boolean>} True if route was handled
 */
async function atlasRoutes(req, res, url, options = {}) {
  const loop = options.teachingLoop || defaultTeachingLoop;
  const pathname = url.pathname;

  if (!pathname.startsWith("/api/atlas")) {
    return false;
  }

  // POST /api/atlas/teach
  if (req.method === "POST" && (pathname === "/api/atlas/teach" || pathname === "/api/atlas/chat")) {
    try {
      const body = await readJsonBody(req);
      const studentMessage = String(body.message || body.input || "").trim();
      const boardImage = typeof body.boardImage === "string" && /^data:image\/(png|jpe?g|webp);base64,/i.test(body.boardImage)
        ? body.boardImage
        : null;
      console.log("[ATLAS Flow 3] Request body received by backend /api/atlas/teach:", {
        message: studentMessage,
        requestId: body.requestId || null,
        hasBoardImage: Boolean(boardImage)
      });

      if (!studentMessage) {
        sendJson(res, 400, { error: "Field 'message' is required and must be a non-empty string." });
        return true;
      }

      if (body.resetSession) {
        loop.resetSession();
      }

      const clientRequestId = body.requestId ? String(body.requestId) : null;
      const turnResult = await loop.handleStudentTurn(studentMessage, clientRequestId, { boardImage });
      console.log("[ATLAS Stage 3] /api/atlas/teach payload sent to client:", {
        requestId: turnResult.requestId,
        intent: turnResult.intent,
        shouldDraw: turnResult.visualPlan?.shouldDraw,
        commandsCount: (turnResult.drawingResult?.commands || []).length,
        tts: turnResult.audioBase64 ? "cartesia" : "none"
      });
      sendJson(res, 200, turnResult);
      return true;
    } catch (err) {
      sendJson(res, 500, { error: err.message || "Failed to process teaching request." });
      return true;
    }
  }

  // POST /api/atlas/tts — Cartesia neural speech, key stays on the server
  if (req.method === "POST" && pathname === "/api/atlas/tts") {
    try {
      const body = await readJsonBody(req);
      const transcript = String(body.text || body.transcript || "").replace(/\s+/g, " ").trim().slice(0, 4000);
      if (!transcript) {
        sendJson(res, 400, { error: "Field 'text' is required." });
        return true;
      }
      const apiKey = String(process.env.CARTESIA_API_KEY || "").trim();
      const deepgramKey = String(process.env.DEEPGRAM_API_KEY || "").trim();
      const openaiKey = String(process.env.OPENAI_API_KEY || "").trim();
      if (!apiKey && !deepgramKey && !openaiKey) {
        sendJson(res, 503, { error: "Speech is not configured." });
        return true;
      }
      const audio = await synthesizeCartesiaSpeech(transcript);
      if (!audio) {
        sendJson(res, 502, { error: "Cartesia TTS failed." });
        return true;
      }
      res.writeHead(200, {
        "Content-Type": audio.contentType,
        "Cache-Control": "no-store",
        "Content-Length": audio.buffer.length
      });
      res.end(audio.buffer);
      return true;
    } catch (err) {
      sendJson(res, 500, { error: err.message || "Failed to synthesize speech." });
      return true;
    }
  }
  if (req.method === "POST" && pathname === "/api/atlas/reset") {
    loop.resetSession();
    sendJson(res, 200, { success: true, message: "ATLAS session reset." });
    return true;
  }

  // GET /api/atlas/status or GET /api/atlas/history
  if (req.method === "GET" && (pathname === "/api/atlas/status" || pathname === "/api/atlas/history")) {
    sendJson(res, 200, {
      status: "online",
      module: "ATLAS Phase 1 Core Interactive Teaching Loop",
      provider: liveAiProvider.providerName,
      tts: String(process.env.CARTESIA_API_KEY || "").trim() ? "cartesia" : "browser",
      history: loop.getHistory()
    });
    return true;
  }

  sendJson(res, 404, { error: "ATLAS endpoint not found." });
  return true;
}

module.exports = atlasRoutes;
