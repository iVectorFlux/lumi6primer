/**
 * ATLAS AI Teacher Chat Interface Component
 * 
 * Phase 2A: Browser-based chat panel integrated into Lumi6.
 * Stateless regarding conversation logic (Backend ConversationManager is source of truth).
 */
(function () {
  "use strict";

  // Configurable API base endpoint constant
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

  window.resetPrimerSession = function () {
    try {
      sessionStorage.removeItem("primerSessionId");
      localStorage.removeItem("primerSessionId");
      sessionStorage.removeItem("primerRecentTurns");
      localStorage.removeItem("primerRecentTurns");
      const msgs = document.querySelector("#atlasMessages");
      if (msgs) msgs.replaceChildren();
      if (window.atlasChat && Array.isArray(window.atlasChat.messages)) {
        window.atlasChat.messages = [];
      }
      if (window.Lumi6Lesson && typeof window.Lumi6Lesson.clear === "function") {
        window.Lumi6Lesson.clear();
      }
      if (window.atlasVoice && typeof window.atlasVoice.resetSession === "function") {
        window.atlasVoice.resetSession();
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

  const DEFAULT_TOPIC_ICON = '<svg viewBox="0 0 128 128" aria-hidden="true"><path fill="#fde68a" d="M64 18a32 32 0 0 1 18 58c-4 4-6 8-6 14H52c0-6-2-10-6-14A32 32 0 0 1 64 18Z"/><rect x="52" y="94" width="24" height="8" rx="3" fill="#f59e0b"/><rect x="56" y="104" width="16" height="8" rx="3" fill="#d97706"/></svg>';

  function showAtlasGraphicLoader(title, extras = {}) {
    window.__atlasGraphicLoading = true;
    if (typeof window.syncTalkModeFeed === "function") window.syncTalkModeFeed();
    const el = document.getElementById("atlasGraphicLoader");
    const text = document.getElementById("atlasGraphicLoaderText");
    const icon = document.getElementById("atlasGraphicLoaderIcon");
    if (text) text.textContent = "Drawing a picture";
    if (icon) icon.innerHTML = extras.iconMarkup || extras.iconSvg || DEFAULT_TOPIC_ICON;
    if (el) el.hidden = false;
  }

  function hideAtlasGraphicLoader() {
    window.__atlasGraphicLoading = false;
    if (typeof window.syncTalkModeFeed === "function") window.syncTalkModeFeed();
    const el = document.getElementById("atlasGraphicLoader");
    if (el) el.hidden = true;
  }

  function applyPrimerGraphic(msg) {
    const commands = (msg?.visualPlan && Array.isArray(msg.visualPlan.commands) && msg.visualPlan.commands.length)
      ? msg.visualPlan.commands
      : (Array.isArray(msg?.canvasActions) ? msg.canvasActions : (msg?.tool ? [msg] : []));
    if (!commands.length) return false;
    const photo = commands.find((cmd) => cmd && (cmd.tool === "place_photo" || cmd.tool === "svg_picture") && (cmd.href || cmd.svg));
    const imgSrc = photo?.href || (photo?.svg ? `data:image/svg+xml;utf8,${encodeURIComponent(photo.svg)}` : "");
    if (imgSrc) {
      if (typeof window.Lumi6Lesson?.attachImage === "function") {
        window.Lumi6Lesson.attachImage(imgSrc);
      }
      const lastTeacher = document.querySelector("#atlasMessages .atlas-msg.teacher:last-of-type");
      if (lastTeacher) lastTeacher.dataset.image = imgSrc;
    }
    if (typeof window.syncTalkModeFeed === "function") {
      window.syncTalkModeFeed();
    }
    const hasImage = Boolean(photo);
    if (window.Lumi6CanvasAdapter) {
      window.Lumi6CanvasAdapter.renderAtlasCommands(commands).then(() => {
        if (hasImage) hideAtlasGraphicLoader();
      }).catch((err) => {
        console.warn("[PRIMER] canvas render failed:", err);
        if (hasImage) hideAtlasGraphicLoader();
      });
    } else if (hasImage) {
      hideAtlasGraphicLoader();
    }
    return true;
  }

  window.showAtlasGraphicLoader = showAtlasGraphicLoader;
  window.hideAtlasGraphicLoader = hideAtlasGraphicLoader;
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

  class AtlasChatController {
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
      let sidebar = document.getElementById("atlasChatSidebar");
      let toggleBtn = document.getElementById("atlasChatToggle");

      if (!sidebar) {
        sidebar = document.createElement("aside");
        sidebar.id = "atlasChatSidebar";
        sidebar.setAttribute("aria-label", "Lumi6 Teacher Chat");
        sidebar.innerHTML = `
          <header class="atlas-chat-header">
            <div class="atlas-chat-header-title">
              <div class="atlas-header-text">
                <p class="atlas-kicker">Chat</p>
                <h3>Lumi6</h3>
              </div>
            </div>
            <div class="atlas-header-actions">
              <button id="atlasResetBtn" class="atlas-icon-btn" type="button" title="Reset Session" aria-label="Reset Session">
                <svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              </button>
              <button id="atlasCloseBtn" class="atlas-icon-btn" type="button" title="Close Chat" aria-label="Close Chat">
                <svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
          </header>

          <div id="atlasMessages" class="atlas-chat-messages" role="log" aria-live="polite">
            <div class="atlas-msg teacher">
              <div class="atlas-msg-author">Lumi6</div>
              <div class="atlas-msg-bubble">Hey! Ask me something you want to understand. I will explain it and draw it on the board.</div>
              <div class="atlas-msg-time">${this.formatTime(new Date())}</div>
            </div>
          </div>

          <footer class="atlas-chat-footer">
            <textarea id="atlasInput" class="atlas-chat-input" rows="1" placeholder="Ask Lumi6…" aria-label="Ask Lumi6 a question"></textarea>
            <button id="atlasSendBtn" class="atlas-send-btn" type="button" aria-label="Send Message">
              <svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </footer>
        `;

        const rightMount = document.getElementById('atlasChatSidebarMount');
        if (rightMount) {
          rightMount.appendChild(sidebar);
        } else {
          document.body.appendChild(sidebar);
        }
      }

      if (!toggleBtn) {
        toggleBtn = document.createElement("button");
        toggleBtn.id = "atlasChatToggle";
        toggleBtn.type = "button";
        toggleBtn.setAttribute("aria-label", "Toggle Lumi6 chat");
        toggleBtn.innerHTML = `
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
          </svg>
          <span>Lumi6 Chat</span>
        `;
        document.body.appendChild(toggleBtn);
      }

      // Always cache DOM references
      this.elements = {
        toggleBtn,
        sidebar,
        closeBtn: sidebar.querySelector("#atlasCloseBtn"),
        resetBtn: sidebar.querySelector("#atlasResetBtn"),
        messagesList: sidebar.querySelector("#atlasMessages"),
        inputField: sidebar.querySelector("#atlasInput, #atlasChatInput, textarea"),
        sendBtn: sidebar.querySelector("#atlasSendBtn, #atlasChatSendBtn, button[type='submit']")
      };

      this.bindEvents();
    }

    /**
     * Bind DOM event listeners.
     */
    bindEvents() {
      const { toggleBtn, closeBtn, resetBtn, inputField, sendBtn } = this.elements;

      toggleBtn.addEventListener("click", () => this.toggleChat());
      const navChat = document.getElementById("navAtlasChat");
      if (navChat) navChat.addEventListener("click", () => this.toggleChat());
      closeBtn.addEventListener("click", () => this.closeChat());
      resetBtn.addEventListener("click", () => this.resetSession());

      sendBtn.addEventListener("click", () => this.handleSendMessage());

      inputField.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          this.handleSendMessage();
        }
      });

      // Auto-expand textarea
      inputField.addEventListener("input", () => {
        inputField.style.height = "auto";
        inputField.style.height = Math.min(inputField.scrollHeight, 100) + "px";
      });
    }

    toggleChat() {
      this.isOpen ? this.closeChat() : this.openChat();
    }

    openChat() {
      this.isOpen = true;
      this.elements.sidebar.classList.add("atlas-open");
      document.body.classList.add("atlas-chat-open");
      const navChat = document.getElementById("navAtlasChat");
      if (navChat) {
        navChat.classList.add("active");
        navChat.setAttribute("aria-pressed", "true");
      }
      window.dispatchEvent(new Event("resize"));
      document.body.classList.remove("mobile-nav-open");
      const menuBtn = document.getElementById("mobileMenuBtn");
      if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
      const backdrop = document.getElementById("sidebarBackdrop");
      if (backdrop) backdrop.hidden = true;
      if (!window.matchMedia("(max-width: 900px)").matches) {
        this.elements.inputField.focus();
      }
    }

    closeChat() {
      this.isOpen = false;
      this.elements.sidebar.classList.remove("atlas-open");
      document.body.classList.remove("atlas-chat-open");
      const navChat = document.getElementById("navAtlasChat");
      if (navChat) {
        navChat.classList.remove("active");
        navChat.setAttribute("aria-pressed", "false");
      }
      window.dispatchEvent(new Event("resize"));
    }

    /**
     * Drop the canned greeting once a real lesson starts.
     */
    removeWelcomeIfNeeded() {
      const list = this.elements.messagesList;
      if (!list) return;
      const first = list.querySelector(".atlas-msg.teacher");
      if (!first || list.querySelectorAll(".atlas-msg").length > 1) return;
      const bubble = first.querySelector(".atlas-msg-bubble");
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
      const msgDiv = document.createElement("div");
      msgDiv.className = `atlas-msg ${role}`;

      const author = document.createElement("div");
      author.className = "atlas-msg-author";
      author.textContent = role === "teacher" ? "Lumi6" : "You";

      const bubble = document.createElement("div");
      bubble.className = "atlas-msg-bubble";
      bubble.textContent = text;

      const timeSpan = document.createElement("div");
      timeSpan.className = "atlas-msg-time";
      timeSpan.textContent = this.formatTime(new Date());

      msgDiv.appendChild(author);
      msgDiv.appendChild(bubble);
      msgDiv.appendChild(timeSpan);

      this.elements.messagesList.appendChild(msgDiv);
      this.scrollToBottom();
      if (typeof window.Lumi6Lesson?.record === "function") window.Lumi6Lesson.record(role, text);
      if (typeof window.syncTalkModeFeed === "function") window.syncTalkModeFeed();
      return msgDiv;
    }

    /**
     * Show animated loading indicator.
     */
    showLoading() {
      const loadingDiv = document.createElement("div");
      loadingDiv.id = "atlasLoadingIndicator";
      loadingDiv.className = "atlas-loading";
      loadingDiv.innerHTML = `
        <span class="atlas-dot"></span>
        <span class="atlas-dot"></span>
        <span class="atlas-dot"></span>
      `;
      this.elements.messagesList.appendChild(loadingDiv);
      this.scrollToBottom();
    }

    /**
     * Remove loading indicator.
     */
    hideLoading() {
      const loadingDiv = document.getElementById("atlasLoadingIndicator");
      if (loadingDiv) {
        loadingDiv.remove();
      }
    }

    /**
     * Show inline error message banner.
     */
    showError(errorText) {
      const errorDiv = document.createElement("div");
      errorDiv.className = "atlas-error-notice";
      errorDiv.textContent = `Error: ${errorText}`;
      this.elements.messagesList.appendChild(errorDiv);
      this.scrollToBottom();
    }

    scrollToBottom() {
      this.elements.messagesList.scrollTop = this.elements.messagesList.scrollHeight;
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
      }

      // Set loading state
      this.isSending = true;
      if (this.elements.sendBtn) this.elements.sendBtn.disabled = true;
      this.showLoading();

      try {
        const primerBody = {
          spokenText: text,
          message: text,
          requestId,
          ...readPrimerIds()
        };
        const boardImage = await captureBoardIfNeeded(text);
        if (boardImage) primerBody.boardImage = boardImage;
        let spokenShown = false;
        let graphicApplied = false;
        const data = await primerTurn(primerBody, {
          onSpoken: (msg) => {
            if (spokenShown) return;
            spokenShown = true;
            this.hideLoading();
            this.appendMessage("teacher", unwrapSpoken(msg.teacherResponse || msg.spokenResponse || msg.spoken));
          },
          onGraphicLoading: (msg) => showAtlasGraphicLoader(msg?.title, msg),
          onGraphic: (msg) => {
            graphicApplied = applyPrimerGraphic(msg) || graphicApplied;
          }
        });

        if (!spokenShown) {
          this.hideLoading();
          if (data.teacherResponse || data.spokenResponse || data.spoken) {
            this.appendMessage("teacher", unwrapSpoken(data.teacherResponse || data.spokenResponse || data.spoken));
          }
        }

        applyPrimerGraphic(data);
        hideAtlasGraphicLoader();

        // Notify registered response listeners
        this.notifyTeacherResponse(data);
      } catch (err) {
        this.hideLoading();
        this.showError(err.message || "Unable to reach Lumi6.");
      } finally {
        hideAtlasGraphicLoader();
        this.isSending = false;
        this.elements.sendBtn.disabled = false;
        this.elements.inputField.focus();
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
        await fetch(`${ATLAS_API_BASE}/reset`, { method: "POST" });
        this.elements.messagesList.innerHTML = `
          <div class="atlas-msg teacher">
            <div class="atlas-msg-author">Lumi6</div>
            <div class="atlas-msg-bubble">Session reset. What new topic would you like to discuss?</div>
            <div class="atlas-msg-time">${this.formatTime(new Date())}</div>
          </div>
        `;
      } catch (err) {
        this.showError("Failed to reset session.");
      }
    }

    /**
     * Register a listener callback for ATLAS teacher responses (modular hook for Phase 2B).
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
          console.error("Error in ATLAS response listener:", e);
        }
      }
    }
  }

  // Initialize on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      window.atlasChat = new AtlasChatController();
    });
  } else {
    window.atlasChat = new AtlasChatController();
  }
})();
