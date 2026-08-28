/**
 * ATLAS Voice Teaching Interface Component
 * 
 * Phase 2: Voice-first interface integrated with Lumi6.
 * Features:
 * - Speech Recognition (STT) for voice input
 * - Text-To-Speech (TTS) for spoken explanations
 * - Instant Interruption handling
 * - Live Whiteboard Drawing synchronization
 * - Minimal accessibility transcript overlay
 * - Hands-Free Continuous Conversation Mode
 */
(function () {
  "use strict";

  const ATLAS_API_BASE = window.ATLAS_API_BASE || "/api/atlas";
  const PRIMER_API_BASE = window.PRIMER_API_BASE || "/api/primer";

  function readPrimerIds() {
    try {
      return {
        childId: localStorage.getItem("primerChildId") || null,
        sessionId: sessionStorage.getItem("primerSessionId") || localStorage.getItem("primerSessionId") || null,
        mode: localStorage.getItem("primerMode") || null
      };
    } catch {
      return { childId: null, sessionId: null, mode: null };
    }
  }

  function savePrimerIds(state) {
    if (!state) return;
    try {
      if (state.childId) localStorage.setItem("primerChildId", state.childId);
      if (state.sessionId) {
        sessionStorage.setItem("primerSessionId", state.sessionId);
        localStorage.setItem("primerSessionId", state.sessionId);
      }
      if (state.childName) localStorage.setItem("primerChildName", String(state.childName));
      if (state.mode === "autopilot" || state.mode === "manual") {
        localStorage.setItem("primerMode", state.mode);
      }
    } catch {}
  }

  function isUnrelatedNewTopic(text) {
    const raw = String(text || "");
    const t = raw.toLowerCase().trim();
    if (!t) return false;
    if (/\b(this|that|here|board|whiteboard|what i (wrote|drew)|look at|check my|solve|homework|is this right|how much|what('s| is) the answer)\b/.test(t)) return false;
    if (/[+\u00d7\u00f7=]/.test(raw) || /\d\s*[x*]\s*\d/i.test(raw) || /\d[x*]\d/i.test(raw)) return false;
    if (/\b(plus|minus|times|multiply|multiplied|divided by|subtract|addition|multiplication|division|equation|sum|equals|math|number)\b/i.test(t)) return false;
    return /\b(teach me about|tell me about|i want to learn about)\b/.test(t)
      || (/\b(teach me|i want to learn)\b/.test(t) && t.length > 16);
  }

  function asksToLookAtBoard(text) {
    return /\b(look at|whiteboard|the board|this whiteboard|the diagram|this diagram|whole diagram|this drawing|what i (have )?(written|drew|drawn)|i have written|written here|everything (here|i wrote|i have written)|whatever i (have )?(written|drew)|check (this|my))\b/i.test(String(text || ""));
  }

  async function captureBoardIfNeeded(text) {
    if (isUnrelatedNewTopic(text)) return null;
    const adapter = window.LUMI6_CANVAS_ADAPTER;
    if (!adapter) return null;
    if (asksToLookAtBoard(text) && typeof adapter.captureLessonBoardPng === "function") {
      try {
        const full = await adapter.captureLessonBoardPng();
        if (full && full.length > 200) return full;
      } catch (err) {
        console.warn("[Lumi6] full board capture failed:", err);
      }
    }
    if (typeof adapter.captureBoardImage === "function") return adapter.captureBoardImage();
    return null;
  }

  async function postTeach(payload) {
    const primerBody = {
      spokenText: payload.message,
      message: payload.message,
      requestId: payload.requestId,
      boardImage: payload.boardImage || undefined,
      ...readPrimerIds()
    };
    let response = await fetch(`${PRIMER_API_BASE}/turn`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(typeof window.Lumi6Profile?.authHeaders === "function" ? await window.Lumi6Profile.authHeaders() : {})
      },
      body: JSON.stringify({
        ...primerBody,
        child: typeof window.Lumi6Profile?.childPayload === "function" ? window.Lumi6Profile.childPayload() : {}
      })
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}: Failed to query Primer.`);
    const data = await response.json();
    savePrimerIds(data.sessionState);
    return data;
  }

  const END_OF_SPEECH_MS = 1400;

  /**
   * Modular Speech Recognition Wrapper (STT)
   * Waits END_OF_SPEECH_MS of silence after the last heard words so kids can pause mid-sentence.
   */
  class SpeechRecognizer {
    constructor(options = {}) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.isSupported = Boolean(SpeechRecognition);
      this.recognition = this.isSupported ? new SpeechRecognition() : null;
      this.isListening = false;

      this.onResult = options.onResult || null;
      this.onError = options.onError || null;
      this.onEnd = options.onEnd || null;
      this.onTurnComplete = options.onTurnComplete || null;
      this.lastTranscript = "";
      this._finalParts = [];
      this._interim = "";
      this._silenceTimer = null;
      this._committing = false;
      this.endOfSpeechMs = END_OF_SPEECH_MS;

      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      this.isMobile = isMobile;

      if (this.isSupported) {
        this.recognition.continuous = !isMobile;
        this.recognition.interimResults = true;
        this.recognition.lang = options.lang || "en-US";

        this.recognition.onresult = (e) => {
          let interim = "";
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const piece = String(e.results[i][0].transcript || "").trim();
            if (!piece) continue;
            if (e.results[i].isFinal) this._finalParts.push(piece);
            else interim += (interim ? " " : "") + piece;
          }
          this._interim = interim;
          this.lastTranscript = this._fullText();
          if (this.onResult) this.onResult(this.lastTranscript, false);
          this._bumpSilence();
        };

        this.recognition.onerror = (e) => {
          if (e.error === "no-speech") return;
          console.warn("[ATLAS STT] Recognition error:", e.error);
          if (this.onError) this.onError(e.error);
        };

        this.recognition.onend = () => {
          this.isListening = false;
          if (this.onEnd) this.onEnd(this.lastTranscript || "");
        };
      }
    }

    _fullText() {
      return `${this._finalParts.join(" ")} ${this._interim}`.replace(/\s+/g, " ").trim();
    }

    _bumpSilence() {
      if (this._silenceTimer) clearTimeout(this._silenceTimer);
      this._silenceTimer = setTimeout(() => this._commitTurn(), this.endOfSpeechMs);
    }

    _commitTurn() {
      this._silenceTimer = null;
      const text = this._fullText();
      if (!text) return;
      this._committing = true;
      if (this.onTurnComplete) this.onTurnComplete(text);
      this.stop();
      this._finalParts = [];
      this._interim = "";
      this.lastTranscript = "";
      this._committing = false;
    }

    get hasPendingSilence() {
      return Boolean(this._silenceTimer);
    }

    start({ keepBuffer = false } = {}) {
      if (!this.isSupported) return false;
      if (!keepBuffer) {
        this._finalParts = [];
        this._interim = "";
        this.lastTranscript = "";
        if (this._silenceTimer) {
          clearTimeout(this._silenceTimer);
          this._silenceTimer = null;
        }
      }
      try {
        this.recognition.start();
        this.isListening = true;
        return true;
      } catch (err) {
        return false;
      }
    }

    stop() {
      if (this._silenceTimer && !this._committing) {
        clearTimeout(this._silenceTimer);
        this._silenceTimer = null;
      }
      this._finalParts = [];
      this._interim = "";
      this.lastTranscript = "";
      if (this.isSupported && this.isListening) {
        try {
          this.recognition.stop();
        } catch (e) {}
        this.isListening = false;
      }
    }
  }

  /**
   * Modular Speech Synthesizer Wrapper (TTS)
   */
  class SpeechSynthesizer {
    constructor() {
      this.isSupported = "speechSynthesis" in window || Boolean(window.Audio);
      this.voice = null;
      this.player = null;
      this.objectUrl = null;
      this.generation = 0;
      this.unlocked = false;
      this.audioCtx = null;
      this._sourceNode = null;
      this._openerBlob = null;
      this._openerWaiters = [];
      if ("speechSynthesis" in window) {
        this.pickVoice();
        window.speechSynthesis.addEventListener("voiceschanged", () => this.pickVoice());
      }
    }

    pickVoice() {
      const voices = window.speechSynthesis.getVoices() || [];
      if (!voices.length) return;
      const rank = (voice) => {
        const name = `${voice.name} ${voice.lang}`.toLowerCase();
        let score = 0;
        if (/en[-_](us|gb|au|ie|in)/i.test(voice.lang) || /\ben\b/.test(name)) score += 20;
        if (voice.localService) score += 4;
        if (/samantha|karen|moira|serena|fiona|tessa|victoria|allison|ava|zoe|nicky|samantha \(enhanced\)/.test(name)) score += 50;
        if (/google uk english female|google us english|microsoft (aria|jenny|sonia|guy)/.test(name)) score += 40;
        if (/enhanced|premium|neural|natural/.test(name)) score += 25;
        if (/female|woman/.test(name)) score += 8;
        if (/compact|novelty|whisper|zarvox|trinoids|boing|bad news|good news|bells|cellos|pipe organ|albert|fred|junior/.test(name)) score -= 80;
        return score;
      };
      this.voice = voices.slice().sort((a, b) => rank(b) - rank(a))[0] || null;
    }

    unlockPlayback() {
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (Ctx) {
          this.audioCtx = this.audioCtx || new Ctx();
          if (this.audioCtx.state === "suspended") this.audioCtx.resume();
          const ctx = this.audioCtx;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          gain.gain.value = 0;
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.01);
          this.unlocked = true;
          console.log("[ATLAS Voice] AudioContext unlocked, state:", ctx.state);
        }
      } catch (e) { console.warn("[ATLAS Voice] unlock error:", e.message); }
      try {
        const p = this.ensurePlayer();
        p.load();
      } catch (e) {}
      if ("speechSynthesis" in window) {
        try {
          const u = new SpeechSynthesisUtterance("");
          u.volume = 0.01;
          window.speechSynthesis.speak(u);
        } catch (e) {}
      }
    }

    ensurePlayer() {
      if (this.player) return this.player;
      this.player = new Audio();
      this.player.playsInline = true;
      this.player.preload = "auto";
      return this.player;
    }

    speak(text, onStart, onEnd, embeddedAudio = null) {
      if (!text && !embeddedAudio) {
        if (onEnd) onEnd();
        return;
      }
      this.cancel();
      const generation = ++this.generation;
      this._openerBlob = null;
      this._openerWaiters = [];
      let finished = false;
      const startOnce = () => {
        if (generation !== this.generation) return;
        if (onStart) onStart();
      };
      const endOnce = () => {
        if (finished || generation !== this.generation) return;
        finished = true;
        if (onEnd) onEnd();
      };
      const watchdog = setTimeout(() => {
        if (generation !== this.generation) return;
        console.warn("[Lumi6 Voice] TTS watchdog — releasing mic");
        endOnce();
      }, 45000);
      const wrapEnd = () => {
        clearTimeout(watchdog);
        endOnce();
      };
      if (embeddedAudio && embeddedAudio.base64) {
        this.playBytes(embeddedAudio.base64, embeddedAudio.contentType, generation, text, startOnce, wrapEnd);
        return;
      }
      this.speakNeural(text, generation, startOnce, wrapEnd).catch((err) => {
        console.warn("[Lumi6 Voice] Neural TTS failed, falling back to browser speech:", err.message);
        if (generation === this.generation) {
          this.speakBrowser(text, startOnce, wrapEnd);
        } else {
          wrapEnd();
        }
      });
    }

    playBytes(base64, contentType, generation, text, onStart, onEnd) {
      try {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: contentType || "audio/mpeg" });
        this.playBlob(blob, generation, text, onStart, onEnd);
      } catch (err) {
        console.warn("[Lumi6 Voice] Audio bytes failed:", err.message);
        if (generation !== this.generation) return;
        if (onEnd) onEnd();
      }
    }

    playBlob(blob, generation, text, onStart, onEnd) {
      if (generation !== this.generation) {
        if (onEnd) onEnd();
        return;
      }
      if (!blob || blob.size < 32) {
        if (onEnd) onEnd();
        return;
      }

      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) {
        this.audioCtx = this.audioCtx || new Ctx();
        if (this.audioCtx.state === "suspended") this.audioCtx.resume();
        const ctx = this.audioCtx;
        blob.arrayBuffer().then((buf) => {
          if (generation !== this.generation) {
            if (onEnd) onEnd();
            return null;
          }
          return ctx.decodeAudioData(buf);
        }).then((decoded) => {
          if (decoded === null) return;
          if (!decoded) {
            this._playBlobFallback(blob, generation, text, onStart, onEnd);
            return;
          }
          if (generation !== this.generation) {
            if (onEnd) onEnd();
            return;
          }
          if (this._sourceNode) { try { this._sourceNode.stop(); } catch(e){} }
          const source = ctx.createBufferSource();
          source.buffer = decoded;
          source.connect(ctx.destination);
          this._sourceNode = source;
          source.onended = () => {
            if (generation !== this.generation) return;
            if (onEnd) onEnd();
          };
          if (onStart) onStart();
          source.start(0);
        }).catch((err) => {
          console.warn("[Lumi6 Voice] AudioContext decode failed:", err && err.message);
          if (generation !== this.generation) {
            if (onEnd) onEnd();
            return;
          }
          this._playBlobFallback(blob, generation, text, onStart, onEnd);
        });
        return;
      }
      this._playBlobFallback(blob, generation, text, onStart, onEnd);
    }

    _playBlobFallback(blob, generation, text, onStart, onEnd) {
      const player = this.ensurePlayer();
      if (this.objectUrl) { URL.revokeObjectURL(this.objectUrl); this.objectUrl = null; }
      this.objectUrl = URL.createObjectURL(blob);
      player.onplay = () => { if (generation === this.generation && onStart) onStart(); };
      player.onended = () => { if (generation !== this.generation) return; if (onEnd) onEnd(); };
      player.onerror = () => {
        if (generation !== this.generation) return;
        console.warn("[Lumi6 Voice] Audio element error");
        if (onEnd) onEnd();
      };
      player.src = this.objectUrl;
      const play = player.play();
      if (play && typeof play.catch === "function") {
        play.catch((err) => {
          console.warn("[Lumi6 Voice] Audio play blocked:", err && err.message);
          if (generation !== this.generation) return;
          if (onEnd) onEnd();
        });
      }
    }

    ttsChunks(text) {
      const chunks = String(text || "").match(/[^.!?]+[.!?]+(?:["”'])?|[^.!?]+$/g) || [text];
      const parts = [];
      for (const chunk of chunks) {
        const part = String(chunk || "").replace(/\s+/g, " ").trim();
        if (!part) continue;
        if (!parts.length) {
          parts.push(part);
        } else if (parts[parts.length - 1].length + part.length < 120 || parts[parts.length - 1].length < 35) {
          parts[parts.length - 1] = `${parts[parts.length - 1]} ${part}`;
        } else {
          parts.push(part);
        }
      }
      if (parts.length > 1 && parts[0].length < 35) {
        parts[0] = `${parts[0]} ${parts[1]}`;
        parts.splice(1, 1);
      }
      return parts.length ? parts : [String(text || "").trim()].filter(Boolean);
    }

    blobFromBase64(base64, contentType) {
      try {
        const binary = atob(String(base64 || ""));
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const blob = new Blob([bytes], { type: contentType || "audio/mpeg" });
        return blob.size >= 32 ? blob : null;
      } catch {
        return null;
      }
    }

    acceptOpenerAudio(msg) {
      if (!msg || !msg.audioBase64) return;
      const blob = this.blobFromBase64(msg.audioBase64, msg.audioContentType);
      if (!blob) return;
      this._openerBlob = blob;
      const waiters = this._openerWaiters.splice(0);
      for (const wait of waiters) wait(blob);
    }

    waitOpenerAudio(timeoutMs = 5000) {
      if (this._openerBlob) return Promise.resolve(this._openerBlob);
      return new Promise((resolve) => {
        let done = false;
        const finish = (blob) => {
          if (done) return;
          done = true;
          clearTimeout(timer);
          this._openerWaiters = this._openerWaiters.filter((w) => w !== notify);
          resolve(blob || null);
        };
        const notify = (blob) => finish(blob);
        const timer = setTimeout(() => finish(this._openerBlob), timeoutMs);
        this._openerWaiters.push(notify);
      });
    }

    async firstAudioBlob(text) {
      const fetchPromise = this.fetchTtsBlob(text, 12000).catch((err) => {
        console.warn("[Lumi6 Voice] opener fetch failed:", err.message);
        return null;
      });
      const openerPromise = this.waitOpenerAudio(6000);
      const raced = await Promise.race([openerPromise, fetchPromise]);
      if (raced && raced.size >= 32) return raced;
      const [opener, fetched] = await Promise.all([openerPromise, fetchPromise]);
      const blob = opener || fetched;
      if (blob && blob.size >= 32) return blob;
      throw new Error("No opener TTS audio");
    }

    splitTeachAndAsk(text) {
      const raw = String(text || "").replace(/\s+/g, " ").trim();
      const idx = raw.lastIndexOf("?");
      if (idx < 24) return { teach: raw, ask: "" };
      const before = raw.slice(0, idx + 1);
      const breakAt = Math.max(before.lastIndexOf(". "), before.lastIndexOf("! "));
      if (breakAt < 18) return { teach: raw, ask: "" };
      const teach = before.slice(0, breakAt + 1).trim();
      const ask = `${before.slice(breakAt + 1).trim()} ${raw.slice(idx + 1).trim()}`.trim();
      if (teach.length < 24 || ask.length < 8) return { teach: raw, ask: "" };
      return { teach, ask };
    }

    pause(ms, generation) {
      return new Promise((resolve) => {
        const start = Date.now();
        const tick = () => {
          if (generation !== this.generation || Date.now() - start >= ms) {
            resolve();
            return;
          }
          setTimeout(tick, 80);
        };
        setTimeout(tick, Math.min(80, ms));
      });
    }

    async fetchTtsBlob(text, timeoutMs = 12000) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(`${PRIMER_API_BASE}/tts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
          signal: controller.signal
        });
        if (!response.ok) throw new Error(`TTS HTTP ${response.status}`);
        const blob = await response.blob();
        if (!blob || blob.size < 32) throw new Error("Empty TTS audio");
        return blob;
      } finally {
        clearTimeout(timer);
      }
    }

    playBlobAsync(blob, generation, onStart) {
      return new Promise((resolve) => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          resolve();
        };
        if (generation !== this.generation || !blob) {
          finish();
          return;
        }
        const timer = setTimeout(finish, 20000);
        try {
          this.playBlob(blob, generation, "", onStart, () => {
            clearTimeout(timer);
            finish();
          });
        } catch (err) {
          clearTimeout(timer);
          finish();
        }
      });
    }

    async speakNeural(text, generation, onStart, onEnd) {
      const { teach, ask } = this.splitTeachAndAsk(text);
      const parts = this.ttsChunks(teach).concat(ask ? [ask] : []);
      const askIndex = ask ? parts.length - 1 : -1;
      if (!parts.length) {
        if (onEnd) onEnd();
        return;
      }
      let started = false;
      let pending = this.firstAudioBlob(parts[0]);
      const firstBlob = await pending.catch(() => null);
      if (!firstBlob) {
        console.warn("[Lumi6 Voice] First audio chunk unavailable, falling back to browser speech");
        if (generation === this.generation) {
          this.speakBrowser(text, onStart, onEnd);
        }
        return;
      }
      for (let i = 0; i < parts.length; i++) {
        if (generation !== this.generation) return;
        if (i === askIndex && i > 0) await this.pause(350, generation);
        if (generation !== this.generation) return;
        const blob = i === 0 ? firstBlob : await pending.catch(() => null);
        if (!blob) {
          if (generation === this.generation) {
            this.speakBrowser(parts.slice(i).join(" "), onStart, onEnd);
          }
          return;
        }
        if (i + 1 < parts.length) pending = this.fetchTtsBlob(parts[i + 1], 12000).catch(() => null);
        await this.playBlobAsync(blob, generation, () => {
          if (started || generation !== this.generation) return;
          started = true;
          if (onStart) onStart();
        });
      }
      if (generation === this.generation && onEnd) onEnd();
    }

    async speakCartesia(text, generation, onStart, onEnd) {
      return this.speakNeural(text, generation, onStart, onEnd);
    }

    speakBrowser(text, onStart, onEnd) {
      if (!("speechSynthesis" in window) || !text) {
        if (onEnd) onEnd();
        return;
      }
      try {
        window.speechSynthesis.cancel();
        window.speechSynthesis.resume();
      } catch {}
      if (!this.voice) this.pickVoice();
      const generation = this.generation;
      const chunks = String(text).match(/[^.!?]+[.!?]+(?:["”'])?|[^.!?]+$/g) || [text];
      const parts = chunks.map((part) => part.replace(/\s+/g, " ").trim()).filter(Boolean);
      if (!parts.length) {
        if (onEnd) onEnd();
        return;
      }
      let index = 0;
      let started = false;
      const speakNext = () => {
        if (generation !== this.generation) return;
        if (index >= parts.length) {
          if (onEnd) onEnd();
          return;
        }
        try {
          window.speechSynthesis.resume();
        } catch {}
        const utterance = new SpeechSynthesisUtterance(parts[index]);
        if (this.voice) utterance.voice = this.voice;
        utterance.lang = this.voice?.lang || "en-US";
        utterance.rate = 1.0;
        utterance.pitch = 1.05;
        utterance.volume = 1;
        utterance.onstart = () => {
          if (generation !== this.generation || started) return;
          started = true;
          if (onStart) onStart();
        };
        utterance.onend = () => {
          if (generation !== this.generation) return;
          index += 1;
          speakNext();
        };
        utterance.onerror = (e) => {
          console.warn("[Lumi6 Voice] speech utterance error:", e);
          if (generation !== this.generation) return;
          index += 1;
          if (index >= parts.length && onEnd) onEnd();
          else speakNext();
        };
        try {
          window.speechSynthesis.speak(utterance);
        } catch (err) {
          if (onEnd) onEnd();
        }
      };
      setTimeout(speakNext, 10);
    }

    releaseAudio() {
      if (this.player) {
        try {
          this.player.pause();
          this.player.removeAttribute("src");
          this.player.load();
        } catch (e) {}
      }
      if (this.objectUrl) {
        URL.revokeObjectURL(this.objectUrl);
        this.objectUrl = null;
      }
    }

    cancel() {
      this.generation += 1;
      this._openerBlob = null;
      const waiters = (this._openerWaiters || []).splice(0);
      for (const wait of waiters) wait(null);
      if (this._sourceNode) { try { this._sourceNode.stop(); } catch (e) {} this._sourceNode = null; }
      if (this.player) { try { this.player.pause(); } catch (e) {} }
      if (this.objectUrl) { URL.revokeObjectURL(this.objectUrl); this.objectUrl = null; }
      if ("speechSynthesis" in window) { window.speechSynthesis.cancel(); }
    }
  }

  /**
   * Modular Whiteboard Drawing Synchronizer
   */
  class WhiteboardSyncer {
    async executeVisualPlan(visualPlan, drawingResult, canvasActions) {
      const commands = (visualPlan && Array.isArray(visualPlan.commands) && visualPlan.commands.length > 0)
        ? visualPlan.commands
        : (drawingResult && Array.isArray(drawingResult.commands) && drawingResult.commands.length > 0)
        ? drawingResult.commands
        : (Array.isArray(canvasActions) ? canvasActions : []);

      if (commands.length === 0) return;

      if (window.Lumi6CanvasAdapter && typeof window.Lumi6CanvasAdapter.renderAtlasCommands === "function") {
        try {
          await window.Lumi6CanvasAdapter.renderAtlasCommands(commands);
        } catch (err) {
          console.warn("ATLAS Whiteboard Syncer render error:", err);
        }
      }
    }
  }

  /**
   * Main Voice Controller with Continuous Conversation State Machine
   */
  class AtlasVoiceController {
    constructor() {
      this.stt = new SpeechRecognizer({
        onResult: (text) => this.handleSttResult(text),
        onError: (err) => this.handleSttError(err),
        onEnd: () => this.handleSttEnd(),
        onTurnComplete: (text) => this.commitHeardTurn(text)
      });
      this.tts = new SpeechSynthesizer();
      this.syncer = new WhiteboardSyncer();

      this.isActive = false;
      this.state = "IDLE";
      this.overlayTimeout = null;
      this.restartTimer = null;
      this.hasMicPermission = false;
      this.lastSpoken = "";
      this.pendingHeard = "";
      this._holdListen = false;
      this._awaitingListen = false;
      this._didWelcome = false;
      try { this._didWelcome = sessionStorage.getItem("lumi6-voice-welcomed") === "1"; } catch {}
      this._lastOpening = "";
      this._openingListen = false;
      this._welcomeWatch = null;
      this.outputMuted = false;
      this.paused = false;

      this.initUI();
    }

    get isProcessing() {
      return this.state === "PROCESSING";
    }

    get isSpeaking() {
      return this.state === "SPEAKING";
    }

    initUI() {
      let toggleBtn = document.getElementById("atlasVoiceToggle");
      let overlay = document.getElementById("atlasVoiceOverlay");

      if (!toggleBtn) {
        toggleBtn = document.createElement("button");
        toggleBtn.id = "atlasVoiceToggle";
        toggleBtn.type = "button";
        toggleBtn.title = "Lumi6 voice";
        toggleBtn.setAttribute("aria-label", "Toggle Lumi6 voice");
        toggleBtn.innerHTML = `
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="22"/>
          </svg>
          <span id="atlasVoiceLabel">Lumi6</span>
        `;
        document.body.appendChild(toggleBtn);
      }

      if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "atlasVoiceOverlay";
        overlay.setAttribute("aria-live", "polite");
        overlay.innerHTML = `
          <span class="atlas-kid-sparkle" aria-hidden="true"></span>
          <span class="atlas-kid-orb" aria-hidden="true"></span>
          <div class="atlas-kid-copy">
            <span id="atlasOverlayBadge" class="atlas-badge listening">Listening</span>
            <span id="atlasOverlayText" class="atlas-overlay-text">Tap the mic and ask me anything.</span>
          </div>
          <div class="atlas-kid-actions">
            <button id="atlasVoiceStop" class="atlas-overlay-stop" type="button" aria-label="Stop conversation">Stop</button>
          </div>
        `;
        document.body.appendChild(overlay);
      }

      this.elements = {
        toggleBtn,
        label: toggleBtn.querySelector("#atlasVoiceLabel") || toggleBtn,
        overlay,
        badge: overlay.querySelector("#atlasOverlayBadge"),
        text: overlay.querySelector("#atlasOverlayText"),
        stopBtn: overlay.querySelector("#atlasVoiceStop")
      };

      toggleBtn.onclick = () => this.handleMicButtonClick();
      if (this.elements.stopBtn) {
        this.elements.stopBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.turnOff();
        };
      }
    }

    _syncVoiceButtonUI(stateName) {
      const btns = [this.elements?.toggleBtn, document.getElementById("talkModeMicBtn")].filter(Boolean);
      btns.forEach((btn) => {
        btn.classList.remove("atlas-listening", "atlas-speaking", "atlas-processing");
        if (stateName) btn.classList.add(`atlas-${stateName}`);
      });
      if (this.elements?.label) {
        this.elements.label.textContent = stateName === "speaking" ? "Speaking..." : stateName === "listening" ? "Listening..." : stateName === "processing" ? "Thinking..." : "Lumi6";
      }
    }

    handleMicButtonClick() {
      if (this.paused) {
        this.resumeConversation();
      } else if (this.isActive) {
        this.pauseConversation();
      } else {
        this.turnOn();
      }
    }

    friendlyName(raw) {
      const name = String(raw || "").trim();
      if (!name || /^learner$/i.test(name) || /^there$/i.test(name)) return "";
      return name.split(/\s+/)[0];
    }

    async resolveChildName() {
      try {
        const stored = this.friendlyName(localStorage.getItem("primerChildName"));
        if (stored) return stored;
      } catch {}
      try {
        const id = localStorage.getItem("primerChildId");
        if (!id) return "";
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 900);
        const response = await fetch(`${PRIMER_API_BASE}/child/${encodeURIComponent(id)}`, { signal: controller.signal });
        clearTimeout(timer);
        if (!response.ok) return "";
        const data = await response.json();
        const name = this.friendlyName(data?.child?.name);
        if (name) {
          try { localStorage.setItem("primerChildName", name); } catch {}
          return name;
        }
      } catch {}
      return "";
    }

    pickOpening(kind, name) {
      const first = [
        (n) => n ? `Hello ${n}. I'm Lumi6. How can I help you today?` : "Hello. I'm Lumi6. How can I help you today?",
        (n) => n ? `Hey ${n}. I'm Lumi6, your learning buddy. What would you like to figure out?` : "Hey. I'm Lumi6, your learning buddy. What would you like to figure out?",
        (n) => n ? `Hi ${n}. I'm Lumi6. Ask me anything and we'll take it one step at a time.` : "Hi. I'm Lumi6. Ask me anything and we'll take it one step at a time."
      ];
      const again = [
        (n) => n ? `Hey ${n}. What's going on?` : "Hey. What's going on?",
        (n) => n ? `${n}, what do you want to learn?` : "What do you want to learn?",
        () => "I'm here. Stuck on something, or starting something new?",
        () => "Welcome back. Want to pick up where we left off?",
        (n) => n ? `Hi again, ${n}. What's on your mind?` : "Hi again. What's on your mind?",
        () => "Ready when you are. What are we figuring out?",
        () => "I've got you. What should we look at?",
        () => "How are you feeling about this — keep going, or try something new?"
      ];
      const resume = [
        () => "Still here. Want to continue?",
        () => "I'm listening. Go ahead.",
        () => "What's next?",
        () => "Want to keep going, or switch to something else?",
        (n) => n ? `I'm with you, ${n}. What now?` : "I'm with you. What now?"
      ];
      const pool = kind === "first" ? first : kind === "resume" ? resume : again;
      const lines = pool.map((fn) => fn(name)).filter((line) => line && line !== this._lastOpening);
      const options = lines.length ? lines : pool.map((fn) => fn(name)).filter(Boolean);
      const chosen = options[Math.floor(Math.random() * options.length)] || "";
      this._lastOpening = chosen;
      return chosen;
    }

    speakThenListen(line) {
      if (!this.isActive || !line) return;
      this.lastSpoken = line;
      this.showOverlay("teacher", line);
      this.state = "SPEAKING";
      this._syncVoiceButtonUI("speaking");
      if (this._welcomeWatch) {
        clearTimeout(this._welcomeWatch);
        this._welcomeWatch = null;
      }
      this._welcomeWatch = setTimeout(() => {
        if (this.isActive && this.state === "SPEAKING") this.listenAfterSpeech();
      }, 12000);
      this.tts.speak(
        line,
        () => this.stt.stop(),
        () => this.listenAfterSpeech()
      );
    }

    turnOn() {
      this.paused = false;
      this.isActive = true;
      window.__atlasTeachingLock = true;
      this.pendingHeard = "";
      if (this.stt) {
        this.stt._finalParts = [];
        this.stt._interim = "";
        this.stt.lastTranscript = "";
      }
      this.tts.unlockPlayback();
      const hasActiveConversation = Boolean(
        this.lastSpoken ||
        sessionStorage.getItem("primerSessionId") ||
        (Array.isArray(window.Lumi6Lesson?.turns?.()) && window.Lumi6Lesson.turns().length > 0)
      );
      if (hasActiveConversation) {
        this.showOverlay("listening", "Listening... ask anything!");
        this.state = "IDLE";
        this.startListening();
      } else {
        this.greetThenListen();
      }
    }

    primeMic() {}

    listenAfterSpeech() {
      if (this._openingListen) return;
      this._openingListen = true;
      if (this._welcomeWatch) {
        clearTimeout(this._welcomeWatch);
        this._welcomeWatch = null;
      }
      this._syncVoiceButtonUI(null);
      this.state = "IDLE";
      setTimeout(() => {
        this._openingListen = false;
        if (this.paused) {
          this.showPausedOverlay();
          return;
        }
        if (this.isActive) this.startListening();
      }, 180);
    }

    async greetThenListen() {
      const name = this.friendlyName(await this.resolveChildName());
      if (!this.isActive) return;
      const first = !this._didWelcome;
      this._didWelcome = true;
      try { sessionStorage.setItem("lumi6-voice-welcomed", "1"); } catch {}
      this.speakThenListen(this.pickOpening(first ? "first" : "again", name));
    }

    showPausedOverlay() {
      const kept = String(this.lastSpoken || this.elements?.text?.textContent || "").trim();
      this.showOverlay("teacher", kept || "Paused. Tap the mic to talk.");
      this.elements.badge.textContent = "Paused";
    }

    pauseConversation() {
      this.paused = true;
      this.isActive = false;
      window.__atlasTeachingLock = false;
      this.state = "IDLE";
      this.pendingHeard = "";
      if (this.stt) {
        this.stt.stop();
        this.stt._finalParts = [];
        this.stt._interim = "";
        this.stt.lastTranscript = "";
      }
      if (this.restartTimer) {
        clearTimeout(this.restartTimer);
        this.restartTimer = null;
      }
      if (this._welcomeWatch) {
        clearTimeout(this._welcomeWatch);
        this._welcomeWatch = null;
      }
      this._openingListen = false;
      this.tts.cancel();
      this._syncVoiceButtonUI(null);
      this.showPausedOverlay();
    }

    resumeConversation() {
      this.paused = false;
      this.isActive = true;
      this.state = "IDLE";
      window.__atlasTeachingLock = true;
      this.pendingHeard = "";
      if (this.stt) {
        this.stt._finalParts = [];
        this.stt._interim = "";
        this.stt.lastTranscript = "";
      }
      if (this.overlayTimeout) {
        clearTimeout(this.overlayTimeout);
        this.overlayTimeout = null;
      }
      this.tts.unlockPlayback();
      this.startListening();
    }

    resetSession() {
      this.turnOff();
      this.lastSpoken = "";
      this.pendingHeard = "";
      this._lastOpening = "";
      this._didWelcome = false;
      if (this.stt) {
        this.stt.stop();
        this.stt._finalParts = [];
        this.stt._interim = "";
        this.stt.lastTranscript = "";
      }
      try {
        sessionStorage.removeItem("primerSessionId");
        localStorage.removeItem("primerSessionId");
        sessionStorage.removeItem("primerRecentTurns");
        localStorage.removeItem("primerRecentTurns");
        sessionStorage.removeItem("lumi6_lesson_turns");
        localStorage.removeItem("lumi6_lesson_turns");
        sessionStorage.removeItem("lumi6-voice-welcomed");
      } catch {}
      this.hideOverlay();
    }

    turnOff() {
      this.paused = false;
      this.isActive = false;
      window.__atlasTeachingLock = false;
      this.state = "IDLE";
      this.pendingHeard = "";
      if (this.stt) {
        this.stt.stop();
        this.stt._finalParts = [];
        this.stt._interim = "";
        this.stt.lastTranscript = "";
      }
      if (this.restartTimer) {
        clearTimeout(this.restartTimer);
        this.restartTimer = null;
      }
      if (this._welcomeWatch) {
        clearTimeout(this._welcomeWatch);
        this._welcomeWatch = null;
      }
      this._openingListen = false;
      this.tts.cancel();
      this._syncVoiceButtonUI(null);
      this.elements.overlay.classList.remove("atlas-live");
      this.autoHideOverlay(0);
    }

    async startListening() {
      if (!this.isActive || this.paused) return;
      if (this.state === "SPEAKING" || this.state === "PROCESSING") return;

      if (this.restartTimer) {
        clearTimeout(this.restartTimer);
        this.restartTimer = null;
      }

      if (!this.stt.isSupported) {
        this.showOverlay("error", "Web Speech Recognition is not supported in this browser.");
        this.turnOff();
        return;
      }

      // Safeguard: Ensure TTS is stopped before listening to prevent self-talk feedback
      this.tts.cancel();

      const keepBuffer = Boolean(this.pendingHeard) || this.stt.hasPendingSilence;
      this.state = "LISTENING";
      if (!keepBuffer) {
        this.pendingHeard = "";
        if (this.stt) this.stt.lastTranscript = "";
      }
      const started = this.stt.start({ keepBuffer });
      if (started) {
        this._syncVoiceButtonUI("listening");
        if (keepBuffer && this.pendingHeard) {
          this.showOverlay("student", this.pendingHeard);
        } else {
          this.showOverlay("listening", "I'm listening... take your time.");
        }
      } else {
        this.scheduleAutoRestart(400);
      }
    }

    stopListening() {
      this.stt.stop();
      this._syncVoiceButtonUI(null);
    }

    interrupt() {
      if (this.state === "SPEAKING") {
        this.tts.cancel();
      }
      if (this.restartTimer) {
        clearTimeout(this.restartTimer);
        this.restartTimer = null;
      }
    }

    scheduleAutoRestart(delayMs = 300) {
      if (this.restartTimer) {
        clearTimeout(this.restartTimer);
      }
      this.restartTimer = setTimeout(() => {
        this.restartTimer = null;
        if (this.isActive && !this.paused && (this.state === "IDLE" || this.state === "LISTENING")) {
          this.startListening();
        }
      }, delayMs);
    }

    isHeardEcho(queryText) {
      const heard = String(queryText || "").toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
      const spoken = String(this.lastSpoken || "").toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
      if (!heard) return true;
      if (spoken && heard.length >= 8 && (spoken.includes(heard) || heard.includes(spoken.slice(0, 48)))) return true;
      if (!spoken || heard.length < 16) return false;
      const heardWords = new Set(heard.split(" ").filter((w) => w.length > 3));
      const spokenWords = spoken.split(" ").filter((w) => w.length > 3);
      if (!spokenWords.length) return false;
      const overlap = spokenWords.filter((w) => heardWords.has(w)).length;
      return overlap / spokenWords.length >= 0.55;
    }

    handleSpeechEnd() {}

    handleSttResult(text) {
      if (!this.isActive || this.paused) return;
      if (this.state === "PROCESSING" || this.state === "SPEAKING") return;
      const queryText = (text || "").trim();
      if (queryText) {
        this.pendingHeard = queryText;
        this.showOverlay("student", queryText);
      }
    }

    commitHeardTurn(queryText) {
      if (!this.isActive || this.paused) return;
      if (this.state === "PROCESSING" || this.state === "SPEAKING") return;
      const heard = String(queryText || this.pendingHeard || "").trim();
      if (!heard || heard.length < 2) {
        console.log("[ATLAS Voice] Ignored empty or noisy speech transcript.");
        if (this.isActive) {
          this.state = "LISTENING";
          this.scheduleAutoRestart(300);
        }
        return;
      }

      this.state = "PROCESSING";
      this.pendingHeard = "";
      this._syncVoiceButtonUI("processing");
      this.showOverlay("processing", "Got it — thinking...");

      if (/want me to explain|what are you curious|listening to your|listening for your next|click the ai orb|you('re| are) getting it|what should we explore|which part should we|or a new topic|what else are you wondering|should we zoom|say heart, lungs/i.test(heard) || this.isHeardEcho(heard)) {
        console.log("[ATLAS Voice] Ignored echo of teacher prompt:", heard);
        this.state = "LISTENING";
        this.scheduleAutoRestart(400);
        return;
      }

      this.processVoiceQuery(heard);
    }

    handleSttError(error) {
      if (error === "no-speech") {
        // Silent turn: auto-restart recognition if continuous mode is active
        if (this.isActive && this.state === "LISTENING") {
          this.scheduleAutoRestart(300);
        }
      } else if (error === "not-allowed" || error === "service-not-allowed") {
        this.showOverlay("error", "Microphone blocked. Click the lock/tune icon in your address bar -> set Microphone to Allow.");
        this.turnOff();
      } else if (error !== "aborted") {
        console.warn("[ATLAS Voice] Speech recognition error:", error);
        if (this.isActive && this.state === "LISTENING") {
          this.scheduleAutoRestart(1000);
        }
      }
    }

    handleSttEnd() {
      this._syncVoiceButtonUI(null);
      if (!this.isActive || this.paused) return;
      if (this.state === "PROCESSING" || this.state === "SPEAKING") return;
      if (this.stt._committing) return;
      if (this.state === "LISTENING" && (this.stt.hasPendingSilence || this.pendingHeard)) {
        this.scheduleAutoRestart(280);
        return;
      }
      if (this.state === "LISTENING") {
        this.scheduleAutoRestart(300);
      }
    }

    /**
     * Send student transcribed query to backend API.
     */
    async processVoiceQuery(queryText) {
      if (this.queryInFlight) return;
      this.queryInFlight = true;

      const requestId = `req_voice_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const boardImage = await captureBoardIfNeeded(queryText);
      const requestPayload = { message: queryText, requestId };
      if (boardImage) requestPayload.boardImage = boardImage;

      this.showOverlay("processing", "Got it — thinking...");

      try {
        const turn = typeof window.primerTurn === "function"
          ? window.primerTurn
          : async (payload) => {
              const response = await fetch(`${PRIMER_API_BASE}/turn`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  ...(typeof window.Lumi6Profile?.authHeaders === "function" ? await window.Lumi6Profile.authHeaders() : {})
                },
                body: JSON.stringify({
                  ...payload,
                  child: typeof window.Lumi6Profile?.childPayload === "function" ? window.Lumi6Profile.childPayload() : {}
                })
              });
              if (!response.ok) throw new Error(`HTTP ${response.status}: Failed to query Primer.`);
              return response.json();
            };
        let spoke = false;
        let graphicApplied = false;
        this._holdListen = true;
        const data = await turn(requestPayload, {
          onSpoken: (msg) => {
            if (!this.isActive || spoke) return;
            spoke = true;
            this.speakAndDraw(msg, queryText, { draw: false });
          },
          onGraphicLoading: (msg) => {
            if (typeof window.showAtlasGraphicLoader === "function") {
              window.showAtlasGraphicLoader(msg?.title, msg);
            }
          },
          onGraphic: (msg) => {
            if (typeof window.applyPrimerGraphic === "function") {
              graphicApplied = window.applyPrimerGraphic(msg) || graphicApplied;
            }
            const imageUrl = msg?.url || msg?.href || (Array.isArray(msg?.canvasActions) && msg.canvasActions[0]?.href) || (Array.isArray(msg?.visualPlan?.commands) && msg.visualPlan.commands[0]?.href) || "";
            if (imageUrl && window.Lumi6Lesson && typeof window.Lumi6Lesson.attachImage === "function") {
              window.Lumi6Lesson.attachImage(imageUrl);
            }
            if (typeof window.syncTalkModeFeed === "function") window.syncTalkModeFeed();
          },
          onAudio: (msg) => {
            if (msg && this.tts && typeof this.tts.acceptOpenerAudio === "function") {
              this.tts.acceptOpenerAudio(msg);
            }
          }
        });

        if (!this.isActive) {
          return;
        }

        if (!spoke && (data.teacherResponse || data.spokenResponse || data.spoken)) {
          this._holdListen = false;
          this.speakAndDraw(data, queryText, { draw: true });
        } else {
          this.syncer.executeVisualPlan(data.visualPlan, data.drawingResult, data.canvasActions)
            .catch((err) => console.error("[ATLAS Voice] Board draw failed:", err));
          if (typeof window.hideAtlasGraphicLoader === "function") window.hideAtlasGraphicLoader();
          this._holdListen = false;
          // If we did NOT speak, return to listening. If we ARE speaking (spoke === true),
          // speakAndDraw's finishTurn callback will handle transitioning to listening when playback completes.
          if (!spoke) {
            if (this._awaitingListen && this.isActive) {
              this._awaitingListen = false;
              this.state = "IDLE";
              this.scheduleAutoRestart(400);
            } else {
              this.state = "IDLE";
              this.scheduleAutoRestart(300);
            }
          }
        }
      } catch (err) {
        if (this.isActive) {
          this.showOverlay("error", err.message || "Failed to reach Lumi6.");
          this.state = "LISTENING";
          this.scheduleAutoRestart(2500);
        }
      } finally {
        if (typeof window.hideAtlasGraphicLoader === "function") window.hideAtlasGraphicLoader();
        this.queryInFlight = false;
      }
    }

    /**
     * Clean text for Text-to-Speech synthesis (strips LaTeX markup, backslashes, markdown symbols).
     */
    cleanTextForSpeech(rawText) {
      if (!rawText) return "";
      let text = rawText;

      // Remove visual annotations and note banners
      text = text.replace(/\[Visual Drawn on Whiteboard: "[^"]*"\]/g, "");
      text = text.replace(/\(Note: I attempted to generate a visual.*?\)/g, "");

      // Convert common LaTeX math constructs into spoken words
      text = text.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "$1 over $2");
      text = text.replace(/\\sqrt\{([^}]+)\}/g, "square root of $1");
      text = text.replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, "$1th root of $2");
      text = text.replace(/\\times|\\cdot/g, " times ");
      text = text.replace(/\\div/g, " divided by ");
      text = text.replace(/\\pm/g, " plus or minus ");
      text = text.replace(/\\leq/g, " is less than or equal to ");
      text = text.replace(/\\geq/g, " is greater than or equal to ");
      text = text.replace(/\\neq/g, " is not equal to ");
      text = text.replace(/\\approx/g, " is approximately ");
      text = text.replace(/\\infty/g, " infinity ");
      text = text.replace(/\\pi/g, " pi ");
      text = text.replace(/\\theta/g, " theta ");
      text = text.replace(/\\alpha/g, " alpha ");
      text = text.replace(/\\beta/g, " beta ");
      text = text.replace(/\\text\{([^}]+)\}/g, "$1");
      text = text.replace(/\\left|\\right/g, "");

      // Strip math delimiters $...$, $$...$$, \[...\], \(...\)
      text = text.replace(/\$\$([\s\S]*?)\$\$/g, "$1");
      text = text.replace(/\$([^$]+)\$/g, "$1");
      text = text.replace(/\\\[([\s\S]*?)\\\]/g, "$1");
      text = text.replace(/\\\(([\s\S]*?)\\\)/g, "$1");

      // Remove any leftover backslashes and LaTeX words so TTS NEVER says "backslash"!
      text = text.replace(/\\[a-zA-Z]+/g, " ");
      text = text.replace(/\\/g, "");

      // Strip markdown bold, italics, headers, code, bullet points
      text = text.replace(/\*\*(.*?)\*\*/g, "$1");
      text = text.replace(/\*(.*?)\*/g, "$1");
      text = text.replace(/#{1,6}\s+/g, "");
      text = text.replace(/`([^`]+)`/g, "$1");
      text = text.replace(/^\s*[-*+]\s+/gm, "");

      // Collapse multiple whitespace
      text = text.replace(/\s+/g, " ").trim();
      return text;
    }

    /**
     * Speak teacher response and synchronously execute whiteboard drawing plan.
     */
    speakAndDraw(data, studentText = "", { draw = true } = {}) {
      const shouldDraw = draw && (
        (data.visualPlan && Array.isArray(data.visualPlan.commands) && data.visualPlan.commands.length > 0) ||
        (data.drawingResult && Array.isArray(data.drawingResult.commands) && data.drawingResult.commands.length > 0) ||
        (Array.isArray(data.canvasActions) && data.canvasActions.length > 0)
      );

      this.state = "SPEAKING";
      const teacherText = data.spokenResponse || data.teacherResponse || data.spoken;

      const speechText = this.cleanTextForSpeech(teacherText);
      this.lastSpoken = speechText || teacherText || "";

      if (window.atlasChat && typeof window.atlasChat.ingestTurn === "function") {
        window.atlasChat.ingestTurn(studentText, teacherText);
      } else if (window.Lumi6Lesson && typeof window.Lumi6Lesson.record === "function") {
        if (studentText) window.Lumi6Lesson.record("student", studentText);
        if (teacherText) window.Lumi6Lesson.record("teacher", teacherText);
      }

      this.stt.stop();
      this._syncVoiceButtonUI("speaking");

      const drawPromise = shouldDraw
        ? this.syncer.executeVisualPlan(data.visualPlan, data.drawingResult, data.canvasActions)
          .catch((err) => console.error("[ATLAS Voice] Board draw failed:", err))
        : Promise.resolve();

      const finishTurn = () => {
        this._syncVoiceButtonUI(null);
        if (this.paused) {
          this.state = "IDLE";
          this.showPausedOverlay();
          return;
        }
        if (this._holdListen) {
          this._awaitingListen = true;
          this.state = "IDLE";
          return;
        }
        if (this.isActive) {
          this.state = "IDLE";
          this.scheduleAutoRestart(500);
        } else {
          this.state = "IDLE";
          this.autoHideOverlay(3000);
        }
      };

      this.tts.speak(
        speechText,
        () => {
          this.stt.stop();
        },
        () => {
          drawPromise.finally(finishTurn);
        },
        data.audioBase64 ? { base64: data.audioBase64, contentType: data.audioContentType } : null
      );
    }

    /**
     * Update minimal accessibility transcript overlay.
     */
    showOverlay(role, text) {
      if (!this.elements || !this.elements.overlay) this.initUI();
      if (this.overlayTimeout) clearTimeout(this.overlayTimeout);

      if (this.elements.badge) {
        this.elements.badge.className = `atlas-badge ${role}`;
        this.elements.badge.textContent = role === "student" ? "You" : role === "teacher" ? "Lumi6" : role === "listening" ? "Listening" : role === "processing" ? "Thinking" : role;
      }
      if (this.elements.text) {
        this.elements.text.textContent = text;
      }
      if (this.elements.overlay) {
        this.elements.overlay.dataset.mood = role;
        this.elements.overlay.classList.add("atlas-visible");
        this.elements.overlay.classList.toggle("atlas-live", this.isActive || this.paused);
        this.elements.overlay.classList.toggle("is-muted", this.micMuted);
      }
    }

    autoHideOverlay(delayMs = 8000) {
      if (this.overlayTimeout) clearTimeout(this.overlayTimeout);
      if (delayMs === 0) {
        this.elements.overlay.classList.remove("atlas-visible");
        return;
      }
      this.overlayTimeout = setTimeout(() => {
        this.elements.overlay.classList.remove("atlas-visible");
      }, delayMs);
    }
  }

  // Initialize on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      window.atlasVoice = new AtlasVoiceController();
    });
  } else {
    window.atlasVoice = new AtlasVoiceController();
  }
})();
