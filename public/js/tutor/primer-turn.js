/**
 * Primer turn client for Talk Mode.
 * Streams /api/primer/turn and records lesson text + pictures.
 */
(function () {
  "use strict";

  const PRIMER_API_BASE = window.PRIMER_API_BASE || "/api/primer";

  function readPrimerIds() {
    try {
      return {
        childId: localStorage.getItem("primerChildId") || null,
        sessionId: sessionStorage.getItem("primerSessionId") || null,
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

  window.resetPrimerSession = function () {
    try {
      sessionStorage.removeItem("primerSessionId");
      localStorage.removeItem("primerSessionId");
      sessionStorage.removeItem("primerRecentTurns");
      localStorage.removeItem("primerRecentTurns");
      const msgs = document.querySelector("#primerMessages");
      if (msgs) msgs.replaceChildren();
      if (window.primerChat && Array.isArray(window.primerChat.messages)) {
        window.primerChat.messages = [];
      }
      if (window.Lumi6Lesson && typeof window.Lumi6Lesson.clear === "function") {
        window.Lumi6Lesson.clear();
      }
      if (window.primerVoice && typeof window.primerVoice.resetSession === "function") {
        window.primerVoice.resetSession();
      }
      const feed = document.getElementById("talkFeed");
      if (feed) feed.replaceChildren();
    } catch {}
  };

  async function primerTurn(body, handlers = {}) {
    const authHeaders = typeof window.Lumi6Profile?.authHeaders === "function"
      ? await window.Lumi6Profile.authHeaders()
      : {};
    const profile = typeof window.Lumi6Profile?.childPayload === "function"
      ? window.Lumi6Profile.childPayload()
      : {};
    const response = await fetch(`${PRIMER_API_BASE}/turn`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/x-ndjson",
        ...authHeaders
      },
      body: JSON.stringify({
        ...body,
        child: { ...(body.child || {}), ...profile }
      })
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${response.status}: Failed to query Primer.`);
    }
    const ctype = String(response.headers.get("content-type") || "");
    if (!/ndjson/i.test(ctype) || !response.body) {
      const data = await response.json();
      savePrimerIds(data.sessionState);
      const spoken = data.spokenResponse || data.teacherResponse || data.spoken;
      if (spoken && handlers.onSpoken) handlers.onSpoken(data);
      return data;
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let data = {};
    const takeLine = (line) => {
      if (!line) return;
      let msg;
      try { msg = JSON.parse(line); } catch { return; }
      if (msg.event === "spoken") {
        data = { ...data, ...msg };
        if (handlers.onSpoken) handlers.onSpoken(msg);
      } else if (msg.event === "graphic_loading") {
        if (handlers.onGraphicLoading) handlers.onGraphicLoading(msg);
      } else if (msg.event === "graphic") {
        data = { ...data, ...msg };
        if (handlers.onGraphic) handlers.onGraphic(msg);
      } else if (msg.event === "audio") {
        data = { ...data, ...msg };
        if (handlers.onAudio) handlers.onAudio(msg);
      } else if (msg.event === "done") {
        const { event, ...rest } = msg;
        data = { ...data, ...rest };
      } else {
        data = { ...data, ...msg };
      }
    };
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let nl;
      while ((nl = buf.indexOf("\n")) >= 0) {
        takeLine(buf.slice(0, nl).trim());
        buf = buf.slice(nl + 1);
      }
    }
    if (buf.trim()) takeLine(buf.trim());
    savePrimerIds(data.sessionState);
    return data;
  }

  window.primerTurn = primerTurn;

  function showPrimerGraphicLoader() {
    window.__primerGraphicLoading = true;
    if (typeof window.syncTalkModeFeed === "function") window.syncTalkModeFeed();
    const el = document.getElementById("primerGraphicLoader");
    if (el) {
      el.hidden = false;
      if (!el.querySelector(".lumi-wait") && typeof window.lumiWaitHtml === "function") {
        el.innerHTML = window.lumiWaitHtml("visual");
      }
      if (typeof window.mountLumiWaiters === "function") window.mountLumiWaiters(el);
    }
  }

  function hidePrimerGraphicLoader() {
    window.__primerGraphicLoading = false;
    if (typeof window.syncTalkModeFeed === "function") window.syncTalkModeFeed();
    const el = document.getElementById("primerGraphicLoader");
    if (el) el.hidden = true;
  }

  function applyPrimerGraphic(msg) {
    const commands = (msg?.visualPlan && Array.isArray(msg.visualPlan.commands) && msg.visualPlan.commands.length)
      ? msg.visualPlan.commands
      : (Array.isArray(msg?.canvasActions) ? msg.canvasActions : (msg?.tool ? [msg] : []));
    if (!commands.length) return false;
    const interactive = commands.find((cmd) => cmd && cmd.tool === "lesson_interactive" && cmd.slug);
    if (interactive) {
      if (typeof window.Lumi6Lesson?.attachInteractive === "function") {
        window.Lumi6Lesson.attachInteractive(interactive.slug, interactive.title, interactive.href, {
          subject: interactive.subject,
          klass: interactive.klass,
          idea: interactive.idea,
          concept: interactive.concept,
          summary: interactive.summary,
          pill: interactive.pill,
          scenario: interactive.scenario,
          hrefPill: interactive.hrefPill,
          hrefMobile: interactive.hrefMobile,
          hrefDesktop: interactive.hrefDesktop
        });
      }
      const lastTeacher = document.querySelector("#primerMessages .primer-msg.teacher:last-of-type");
      if (lastTeacher) {
        lastTeacher.dataset.interactive = interactive.slug;
        lastTeacher.dataset.interactiveTitle = interactive.title || "";
      }
    }
    const photo = commands.find((cmd) => cmd && (cmd.tool === "place_photo" || cmd.tool === "svg_picture") && (cmd.href || cmd.svg));
    const imgSrc = photo?.href || (photo?.svg ? `data:image/svg+xml;utf8,${encodeURIComponent(photo.svg)}` : "");
    if (imgSrc) {
      if (typeof window.Lumi6Lesson?.attachImage === "function") {
        window.Lumi6Lesson.attachImage(imgSrc);
      }
      const lastTeacher = document.querySelector("#primerMessages .primer-msg.teacher:last-of-type");
      if (lastTeacher) lastTeacher.dataset.image = imgSrc;
    }
    if (typeof window.syncTalkModeFeed === "function") {
      window.syncTalkModeFeed();
    }
    const hasVisual = Boolean(photo || interactive);
    if (window.Lumi6CanvasAdapter) {
      window.Lumi6CanvasAdapter.renderCommands(commands).then(() => {
        if (hasVisual) hidePrimerGraphicLoader();
      }).catch((err) => {
        console.warn("[PRIMER] canvas render failed:", err);
        if (hasVisual) hidePrimerGraphicLoader();
      });
    } else if (hasVisual) {
      hidePrimerGraphicLoader();
    }
    return true;
  }

  window.showPrimerGraphicLoader = showPrimerGraphicLoader;
  window.hidePrimerGraphicLoader = hidePrimerGraphicLoader;
  window.applyPrimerGraphic = applyPrimerGraphic;

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

  function unwrapSpoken(raw) {
    const text = String(raw || "").trim();
    if (!text) return "";
    if (text.startsWith("{") && /"(spoken|spokenResponse|check)"/.test(text)) {
      try {
        const parsed = JSON.parse(text);
        const spoken = String(parsed.spoken || parsed.spokenResponse || "").trim();
        const check = String(parsed.check || parsed.checkQuestion || "").trim();
        if (spoken && check && !/\?/.test(spoken)) return `${spoken} ${check}`;
        if (spoken) return spoken;
      } catch {}
      const quoted = text.match(/"(?:spoken|spokenResponse)"\s*:\s*"((?:\\.|[^"\\])*)"/);
      if (quoted) return quoted[1].replace(/\\n/g, " ").replace(/\\"/g, '"');
    }
    return text;
  }

  class PrimerTurnController {
    constructor() {
      this.isOpen = false;
      this.isSending = false;
      this.onTeacherResponseListeners = [];

      this.elements = {};
      this.initUI();
    }

    /**
     * Programmatically create and mount Chat UI DOM elements.
     */
    initUI() {
      document.getElementById("primerChatToggle")?.remove();
      document.getElementById("primerChatSidebar")?.remove();
      document.body.classList.remove("primer-chat-open");
      this.elements = {
        toggleBtn: null,
        sidebar: null,
        closeBtn: null,
        resetBtn: null,
        messagesList: null,
        inputField: document.getElementById("talkModeTextInput"),
        sendBtn: document.getElementById("talkModeSendBtn")
      };
    }

    /**
     * Drop the canned greeting once a real lesson starts.
     */
    removeWelcomeIfNeeded() {
      const list = this.elements.messagesList;
      if (!list) return;
      const first = list.querySelector(".primer-msg.teacher");
      if (!first || list.querySelectorAll(".primer-msg").length > 1) return;
      const bubble = first.querySelector(".primer-msg-bubble");
      if (bubble && /what concept would you like to explore|ask me something you want to understand/i.test(bubble.textContent || "")) {
        first.remove();
      }
    }

    /**
     * Record a voice (or other) Q&A in the chat panel.
     */
    ingestTurn(studentText, teacherText) {
      if (studentText) this.appendMessage("student", studentText);
      if (teacherText) this.appendMessage("teacher", teacherText);
    }

    formatTime(date) {
      return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    /**
     * Append a message bubble to the chat log.
     */
    appendMessage(role, text) {
      this.removeWelcomeIfNeeded();
      if (this.elements.messagesList) {
        const msgDiv = document.createElement("div");
        msgDiv.className = `primer-msg ${role}`;

        const author = document.createElement("div");
        author.className = "primer-msg-author";
        author.textContent = role === "teacher" ? "Lumi6" : "You";

        const bubble = document.createElement("div");
        bubble.className = "primer-msg-bubble";
        bubble.textContent = text;

        const timeSpan = document.createElement("div");
        timeSpan.className = "primer-msg-time";
        timeSpan.textContent = this.formatTime(new Date());

        msgDiv.appendChild(author);
        msgDiv.appendChild(bubble);
        msgDiv.appendChild(timeSpan);

        this.elements.messagesList.appendChild(msgDiv);
        this.scrollToBottom();
      }
      if (typeof window.Lumi6Lesson?.record === "function") window.Lumi6Lesson.record(role, text);
      if (typeof window.syncTalkModeFeed === "function") window.syncTalkModeFeed();
    }

    /**
     * Show animated loading indicator.
     */
    showLoading() {
      window.__primerWaiting = true;
      if (window.primerVoice && typeof window.primerVoice._syncVoiceButtonUI === "function") {
        window.primerVoice._syncVoiceButtonUI("processing");
      }
      const list = this.elements.messagesList;
      if (!list) return;
      const loadingDiv = document.createElement("div");
      loadingDiv.id = "atlasLoadingIndicator";
      loadingDiv.className = "primer-loading";
      loadingDiv.hidden = true;
      list.appendChild(loadingDiv);
    }

    /**
     * Remove loading indicator.
     */
    hideLoading() {
      window.__primerWaiting = false;
      if (typeof window.hideTalkWait === "function") window.hideTalkWait();
      const loadingDiv = document.getElementById("atlasLoadingIndicator");
      if (loadingDiv) loadingDiv.remove();
    }

    /**
     * Show inline error message banner.
     */
    showError(errorText) {
      const list = this.elements.messagesList;
      if (list) {
        const errorDiv = document.createElement("div");
        errorDiv.className = "primer-error-notice";
        errorDiv.textContent = `Error: ${errorText}`;
        list.appendChild(errorDiv);
        this.scrollToBottom();
      }
      if (typeof window.Lumi6Lesson?.record === "function") {
        window.Lumi6Lesson.record("teacher", errorText || "Unable to reach Lumi6.");
      }
      if (typeof window.syncTalkModeFeed === "function") window.syncTalkModeFeed();
    }

    scrollToBottom() {
      if (typeof window.scrollTalkToLatest === "function") {
        window.scrollTalkToLatest();
        return;
      }
      const list = this.elements.messagesList;
      if (!list) return;
      list.scrollTop = list.scrollHeight;
    }

    /**
     * Programmatic message sending for Talk Mode.
     */
    async sendMessage(explicitText) {
      return this.handleSendMessage(explicitText);
    }

    /**
     * Handle user sending a prompt.
     */
    async handleSendMessage(explicitText) {
      const text = (explicitText || this.elements.inputField?.value || "").trim();
      if (!text || this.isSending) {
        return;
      }

      // Generate client-side requestId for tracking & future streaming
      const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      // Append student message to UI DOM
      this.appendMessage("student", text);

      // Clear input field
      if (this.elements.inputField) {
        this.elements.inputField.value = "";
        this.elements.inputField.style.height = "auto";
        if (typeof window.growTalkComposer === "function") window.growTalkComposer();
      }

      // Set loading state
      this.isSending = true;
      window.__primerWaiting = true;
      if (this.elements.sendBtn) this.elements.sendBtn.disabled = true;
      this.showLoading();
      if (typeof window.syncTalkModeFeed === "function") window.syncTalkModeFeed();

      try {
        const primerBody = {
          spokenText: text,
          message: text,
          requestId,
          ...readPrimerIds()
        };
        const boardImage = await captureBoardIfNeeded(text);
        if (boardImage) primerBody.boardImage = boardImage;
        const voice = window.primerVoice;
        if (voice && voice.tts && typeof voice.tts.unlockPlayback === "function") {
          voice.tts.unlockPlayback();
        }
        let spokenShown = false;
        let graphicApplied = false;
        let spokenAloud = false;
        const speakTalk = (msg) => {
          if (spokenAloud || !msg) return;
          if (!voice || typeof voice.speakLesson !== "function") return;
          if (voice.state === "SPEAKING") return;
          if (typeof voice.shouldAutoSpeak === "function" && !voice.shouldAutoSpeak({ fromVoice: false })) return;
          spokenAloud = true;
          voice.speakLesson(msg);
        };
        const data = await primerTurn(primerBody, {
          onSpoken: (msg) => {
            if (spokenShown) return;
            spokenShown = true;
            this.hideLoading();
            this.appendMessage("teacher", unwrapSpoken(msg.teacherResponse || msg.spokenResponse || msg.spoken));
            speakTalk(msg);
          },
          onGraphicLoading: (msg) => {
            if (window.primerVoice && typeof window.primerVoice._syncVoiceButtonUI === "function") {
              window.primerVoice._syncVoiceButtonUI("processing");
            }
            showPrimerGraphicLoader(msg?.title, msg);
          },
          onGraphic: (msg) => {
            graphicApplied = applyPrimerGraphic(msg) || graphicApplied;
          },
          onAudio: (msg) => {
            if (voice && voice.tts && typeof voice.tts.acceptOpenerAudio === "function") {
              voice.tts.acceptOpenerAudio(msg);
            }
          }
        });

        if (!spokenShown) {
          this.hideLoading();
          if (data.teacherResponse || data.spokenResponse || data.spoken) {
            this.appendMessage("teacher", unwrapSpoken(data.teacherResponse || data.spokenResponse || data.spoken));
          }
        }
        speakTalk(data);

        applyPrimerGraphic(data);
        hidePrimerGraphicLoader();

        // Notify registered response listeners
        this.notifyTeacherResponse(data);
      } catch (err) {
        this.hideLoading();
        this.showError(err.message || "Unable to reach Lumi6.");
      } finally {
        hidePrimerGraphicLoader();
        this.isSending = false;
        if (this.elements.sendBtn) this.elements.sendBtn.disabled = false;
        this.elements.inputField?.focus();
      }
    }

    /**
     * Reset session on backend & UI.
     */
    async resetSession() {
      if (!confirm("Reset current teaching session history?")) {
        return;
      }

      try {
        const ids = readPrimerIds();
        if (ids.sessionId) {
          await fetch(`${PRIMER_API_BASE}/session/end`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId: ids.sessionId })
          });
        }
        try { localStorage.removeItem("primerSessionId"); } catch {}
        if (this.elements.messagesList) {
          this.elements.messagesList.innerHTML = `
          <div class="primer-msg teacher">
            <div class="primer-msg-author">Lumi6</div>
            <div class="primer-msg-bubble">Session reset. What new topic would you like to discuss?</div>
            <div class="primer-msg-time">${this.formatTime(new Date())}</div>
          </div>
        `;
        }
      } catch (err) {
        this.showError("Failed to reset session.");
      }
    }

    /**
     * Register a listener for Primer teacher responses.
     */
    onTeacherResponse(callback) {
      if (typeof callback === "function") {
        this.onTeacherResponseListeners.push(callback);
      }
    }

    notifyTeacherResponse(data) {
      for (const listener of this.onTeacherResponseListeners) {
        try {
          listener(data);
        } catch (e) {
          console.error("Error in Primer response listener:", e);
        }
      }
    }
  }

  // Initialize on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      window.primerChat = new PrimerTurnController();
    });
  } else {
    window.primerChat = new PrimerTurnController();
  }
})();
