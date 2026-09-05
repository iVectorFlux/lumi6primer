"use strict";

const { runWithAccessToken, jwtSub } = require("./store.js");

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
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function wantsNdjson(req, body) {
  const accept = String(req.headers.accept || "");
  return body?.stream === true || /ndjson|stream/i.test(accept);
}

function writeNdjson(res, obj) {
  res.write(`${JSON.stringify(obj)}\n`);
}

function bearerToken(req) {
  const raw = String(req.headers.authorization || req.headers.Authorization || "");
  const match = raw.match(/^Bearer\s+(\S+)/i);
  return match ? match[1] : "";
}

function profileFromBody(body, userId) {
  const child = body?.child && typeof body.child === "object" ? body.child : {};
  const interests = Array.isArray(child.interests)
    ? child.interests.map((item) => String(item).slice(0, 32)).filter(Boolean).slice(0, 12)
    : [];
  return {
    name: String(child.name || "").trim().slice(0, 40) || undefined,
    grade: String(child.grade || "").trim().slice(0, 24) || undefined,
    age_years: Number.isFinite(Number(child.age_years)) ? Number(child.age_years) : undefined,
    interests: interests.length ? interests : undefined,
    user_id: userId || undefined,
    onboarded_at: child.onboarded_at || undefined
  };
}

async function primerRoutes(req, res, url, options = {}) {
  const orchestrator = options.orchestrator;
  const pathname = url.pathname;
  if (!pathname.startsWith("/api/primer")) return false;
  if (!orchestrator) {
    sendJson(res, 503, { error: "Primer is not configured." });
    return true;
  }

  try {
    if (req.method === "POST" && (pathname === "/api/primer/turn" || pathname === "/api/primer/teach")) {
      const body = await readJsonBody(req);
      const spokenText = String(body.spokenText || body.message || body.input || "").trim();
      const boardImage = typeof body.boardImage === "string" && /^data:image\/(png|jpe?g|webp);base64,/i.test(body.boardImage)
        ? body.boardImage
        : null;
      if (!spokenText) {
        sendJson(res, 400, { error: "Field 'spokenText' or 'message' is required." });
        return true;
      }
      const mode = body.mode === "autopilot" || body.mode === "manual" ? body.mode : null;
      const stream = wantsNdjson(req, body);
      if (stream) {
        res.writeHead(200, {
          "Content-Type": "application/x-ndjson; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          "X-Accel-Buffering": "no"
        });
        if (typeof res.flushHeaders === "function") res.flushHeaders();
      }
      const accessToken = bearerToken(req);
      const userId = jwtSub(accessToken);
      const result = await runWithAccessToken(accessToken, () => orchestrator.handleTurn({
        childId: body.childId || null,
        sessionId: body.sessionId || null,
        spokenText,
        boardImage,
        requestId: body.requestId || null,
        wantAudio: !stream && (Boolean(body.wantAudio) || String(body.requestId || "").includes("voice")),
        child: profileFromBody(body, userId),
        mode,
        onStream: stream ? (obj) => writeNdjson(res, obj) : undefined
      }));
      console.log("[PRIMER] turn", {
        childId: result.sessionState?.childId,
        sessionId: result.sessionState?.sessionId,
        mode: result.sessionState?.mode,
        phase: result.sessionState?.phaseThisTurn,
        nextPhase: result.sessionState?.learningPhase,
        role: result.sessionState?.tutorRole,
        commands: (result.canvasActions || []).length,
        commandTools: (result.canvasActions || []).map((c) => c.tool),
        persistence: result.sessionState?.persistence,
        stream
      });
      if (stream) {
        writeNdjson(res, { event: "done", ...result });
        res.end();
      } else {
        sendJson(res, 200, result);
      }
      return true;
    }

    if (req.method === "POST" && pathname === "/api/primer/tts") {
      const body = await readJsonBody(req);
      const text = String(body.text || body.transcript || body.message || "").trim();
      if (!text) {
        sendJson(res, 400, { error: "Field 'text' is required." });
        return true;
      }
      const { synthesizeCartesiaSpeech } = require("./tools/tts.js");
      try {
        const audio = await synthesizeCartesiaSpeech(text);
        if (!audio || !audio.buffer) {
          sendJson(res, 204, {});
          return true;
        }
        res.writeHead(200, {
          "Content-Type": audio.contentType || "audio/mpeg",
          "Content-Length": audio.buffer.length,
          "Cache-Control": "public, max-age=3600"
        });
        res.end(audio.buffer);
      } catch (err) {
        console.warn("[PRIMER TTS] synthesis error:", err.message);
        sendJson(res, 500, { error: "TTS failed" });
      }
      return true;
    }

    if (req.method === "POST" && pathname === "/api/primer/session/start") {
      const body = await readJsonBody(req);
      const accessToken = bearerToken(req);
      const userId = jwtSub(accessToken);
      const started = await runWithAccessToken(accessToken, () => orchestrator.startSession(body.childId || null, {
        ...body,
        ...profileFromBody(body, userId)
      }));
      sendJson(res, 200, {
        childId: started.child.id,
        sessionId: started.session.id,
        greeting: started.greeting,
        child: started.child
      });
      return true;
    }

    if (req.method === "POST" && pathname === "/api/primer/session/end") {
      const body = await readJsonBody(req);
      if (!body.sessionId) {
        sendJson(res, 400, { error: "Field 'sessionId' is required." });
        return true;
      }
      const session = await orchestrator.endSession(body.sessionId, body.summary || "");
      sendJson(res, 200, { session });
      return true;
    }

    if (req.method === "GET" && pathname.startsWith("/api/primer/child/")) {
      const childId = pathname.slice("/api/primer/child/".length).split("/")[0];
      const child = await orchestrator.childModel.getChild(childId);
      if (!child) {
        sendJson(res, 404, { error: "Child not found." });
        return true;
      }
      sendJson(res, 200, { child });
      return true;
    }

    if (req.method === "POST" && pathname === "/api/primer/child") {
      const body = await readJsonBody(req);
      const accessToken = bearerToken(req);
      const userId = jwtSub(accessToken);
      const child = await runWithAccessToken(accessToken, () => orchestrator.childModel.getOrCreate(body.childId || null, profileFromBody(body, userId)));
      sendJson(res, 200, { child });
      return true;
    }

    if (req.method === "GET" && pathname === "/api/primer/status") {
      sendJson(res, 200, {
        status: "online",
        module: "Primer Orchestration",
        persistence: orchestrator.childModel.store.remoteEnabled ? "supabase" : "memory",
        architecture: {
          modes: ["manual", "autopilot"],
          phases: ["story", "think", "learn", "think_again", "become"],
          roles: ["advisor", "librarian", "tutor", "editor", "thinking_partner"],
          rule: "LLM proposes → pedagogical policy validates → orchestrator executes"
        }
      });
      return true;
    }

    if (req.method === "GET" && pathname.startsWith("/api/primer/graphic/")) {
      const id = pathname.slice("/api/primer/graphic/".length).split("/")[0];
      const lessonGraphic = require("./tools/lesson-graphic.js");
      const hit = lessonGraphic.get(id);
      if (!hit) {
        sendJson(res, 404, { error: "Graphic not found." });
        return true;
      }
      res.writeHead(200, {
        "Content-Type": hit.mime || "image/png",
        "Cache-Control": "no-store",
        "Content-Length": hit.buffer.length
      });
      res.end(hit.buffer);
      return true;
    }

    sendJson(res, 404, { error: "Primer endpoint not found." });
    return true;
  } catch (err) {
    console.warn("[PRIMER] turn failed:", err.message);
    if (err.stack) console.warn(err.stack.split("\n").slice(0, 8).join("\n"));
    if (res.headersSent) {
      try { res.end(); } catch {}
      return true;
    }
    sendJson(res, 500, { error: err.message || "Primer request failed." });
    return true;
  }
}

module.exports = primerRoutes;
