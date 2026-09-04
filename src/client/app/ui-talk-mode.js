// ── 7. DRAW MODE & TALK MODE INTERACTIVE CONTROLLER ─────────────
  let currentAppViewMode = "draw";

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatCleanLessonTitle(raw) {
    if (!raw || raw === "Untitled") return "Science Discovery";
    return String(raw)
      .replace(/^[#\s*_-]+|[#\s*_-]+$/g, "")
      .replace(/^[Aa]n?\s+/, "")
      .trim();
  }

  const DOUBT_CHECK_RE = /everything making sense|any part you want me to explain|any doubts|anything unclear|want me to explain.+again|making sense so far/i;

  function isDoubtCheck(sentence) {
    return DOUBT_CHECK_RE.test(String(sentence || "").trim());
  }

  function isTeachingQuestion(sentence) {
    const s = String(sentence || "").trim();
    if (!s || isDoubtCheck(s)) return false;
    return s.endsWith("?") || /^(what|how|why|can you|where|do you think|imagine|can you guess)\b/i.test(s);
  }

  function splitTeacherTurn(cleanSpoken) {
    const sentences = String(cleanSpoken || "")
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((s) => !isDoubtCheck(s));

    const questions = sentences.filter(isTeachingQuestion);
    const question = questions.length
      ? (questions.find((s) => /\([a-c]\)/i.test(s)) || questions[questions.length - 1])
      : "";
    const teaching = sentences.filter((s) => s !== question);

    let keyInsight = "";
    let deeperExpl = "";
    const candidateInsight = teaching.find((s) =>
      s.length >= 32 &&
      !s.endsWith("?") &&
      !/^(hello|hey|hi|welcome|i'm|ready|sure|great|let's|glad|no problem|ok|okay)\b/i.test(s)
    );
    if (candidateInsight && teaching.length > 1) {
      keyInsight = candidateInsight;
      deeperExpl = teaching.filter((s) => s !== keyInsight).join(" ");
    } else {
      deeperExpl = teaching.join(" ");
    }

    return { keyInsight, deeperExpl, question };
  }

  function setAppViewMode(mode, updateUrl = true) {
    currentAppViewMode = mode === "talk" ? "talk" : "draw";
    const drawBtns = document.querySelectorAll("#modeDrawBtn, #topbarModeDrawBtn");
    const talkBtns = document.querySelectorAll("#modeTalkBtn, #topbarModeTalkBtn");
    const canvasWorkspace = document.querySelector(".canvas-workspace");
    const talkWorkspace = document.querySelector("#talkModeWorkspace");
    const docTitle = document.querySelector("#docTitleHeading");

    document.body.classList.toggle("mode-talk-active", currentAppViewMode === "talk");
    document.body.classList.toggle("mode-draw-active", currentAppViewMode === "draw");

    drawBtns.forEach(btn => {
      btn.classList.toggle("active", currentAppViewMode === "draw");
      btn.setAttribute("aria-pressed", String(currentAppViewMode === "draw"));
    });
    talkBtns.forEach(btn => {
      btn.classList.toggle("active", currentAppViewMode === "talk");
      btn.setAttribute("aria-pressed", String(currentAppViewMode === "talk"));
    });

    if (docTitle) {
      docTitle.textContent = currentAppViewMode === "talk" ? "Talk Mode" : "Whiteboard";
    }

    if (canvasWorkspace) {
      canvasWorkspace.hidden = currentAppViewMode === "talk";
      canvasWorkspace.style.display = currentAppViewMode === "talk" ? "none" : "";
    }
    if (talkWorkspace) {
      talkWorkspace.hidden = currentAppViewMode !== "talk";
      talkWorkspace.style.display = currentAppViewMode === "talk" ? "flex" : "none";
    }

    if (updateUrl && window.history?.replaceState) {
      try {
        const url = new URL(window.location.href);
        if (currentAppViewMode === "talk") {
          url.searchParams.set("mode", "talk");
        } else {
          url.searchParams.delete("mode");
        }
        window.history.replaceState(null, "", url.toString());
      } catch {}
    }

    if (window.innerWidth <= 900) {
      document.body.classList.remove("mobile-nav-open");
      const menuBtn = document.getElementById("mobileMenuBtn");
      if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
      const backdrop = document.querySelector("#sidebarBackdrop");
      if (backdrop) backdrop.hidden = true;
    }

    if (currentAppViewMode === "talk") {
      syncTalkModeFeed();
      const scrollArea = document.querySelector("#talkScrollArea");
      if (scrollArea) scrollArea.scrollTop = scrollArea.scrollHeight;
    } else {
      if (window.atlasVoice && typeof window.atlasVoice.turnOff === "function") {
        window.atlasVoice.turnOff();
      }
      render();
    }
  }

  function syncTalkModeFeed() {
    const feed = document.querySelector("#talkFeed");
    if (!feed) return;

    const titleText = formatCleanLessonTitle(state.lessonTitle || document.querySelector("#currentDocName")?.textContent);

    const turns = typeof window.Lumi6Lesson?.turns === "function"
      ? window.Lumi6Lesson.turns()
      : [];

    const LUMI6_AVATAR_HTML = `<div class="talk-lumi6-avatar" aria-label="Lumi6"><svg viewBox="0 0 24 24" width="22" height="22" fill="none"><circle cx="12" cy="12" r="10" fill="url(#lumiAvatarGrad)"/><path d="M12 6L13.8 10.2L18 12L13.8 13.8L12 18L10.2 13.8L6 12L10.2 10.2L12 6Z" fill="#ffffff"/><circle cx="12" cy="12" r="2.2" fill="#6d28d9"/><defs><linearGradient id="lumiAvatarGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse"><stop stop-color="#8b5cf6"/><stop offset="1" stop-color="#6d28d9"/></linearGradient></defs></svg></div>`;

    if (!turns.length) {
      feed.innerHTML = `
        <article class="talk-turn-card">
          <div class="talk-lumi6-box">
            <div class="talk-lumi6-header">
              ${LUMI6_AVATAR_HTML}
              <span class="talk-lumi6-name">Lumi6</span>
            </div>
            <div class="talk-explanation-body">
              <p>Welcome! Tap <strong>Talk</strong> below or type a question to start exploring.</p>
            </div>
          </div>
        </article>
      `;
      return;
    }

    const pairs = [];
    let current = null;
    for (const turn of turns) {
      if (turn.role === "student") {
        if (current) pairs.push(current);
        current = { asked: turn.text, explanation: [], image: turn.image || "", question: "" };
      } else {
        if (!current) current = { asked: "", explanation: [], image: turn.image || "", question: "" };
        const cleanSpoken = String(turn.text || "")
          .replace(/^(Hey|Hello|Hi|Welcome back|Welcome|Good morning|Good afternoon)\s+[A-Za-z0-9_]+[.,!?:-]*\s*/i, "")
          .replace(/^([A-Za-z0-9_]+)[,!:]\s+(?=[A-Z])/i, "")
          .replace(/^(Hey|Hello|Hi|Welcome)\s*[,!.]\s*/i, "")
          .trim();
        const { keyInsight, deeperExpl, question } = splitTeacherTurn(cleanSpoken);
        if (deeperExpl || keyInsight) current.explanation.push([keyInsight, deeperExpl].filter(Boolean).join(" "));
        if (question) current.question = question;
        if (turn.image) current.image = turn.image;
      }
    }
    if (current) pairs.push(current);

    feed.innerHTML = pairs.map((step, idx) => {
      const allSentences = (step.explanation || []).join(" ").split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
      const parsed = splitTeacherTurn(allSentences.join(" "));
      const keyInsight = parsed.keyInsight;
      const deeperExpl = parsed.deeperExpl;
      const question = step.question || parsed.question;

      if (!allSentences.length && !question) {
        return `
        <article class="talk-turn-card">
          ${step.asked ? `
            <div class="talk-child-prompt">
              <span class="talk-child-badge">You asked</span>
              <p class="talk-child-text">${escapeHtml(step.asked)}</p>
            </div>
          ` : ""}
          <div class="talk-lumi6-box talk-shimmer-box">
            <div class="talk-lumi6-header">
              ${LUMI6_AVATAR_HTML}
              <span class="talk-lumi6-name">Lumi6</span>
              <span class="talk-topic-pill talk-shimmer-pill">Exploring…</span>
            </div>
            <div class="talk-shimmer-content">
              <div class="talk-shimmer-line line-long"></div>
              <div class="talk-shimmer-line line-med"></div>
              <div class="talk-shimmer-line line-short"></div>
              <div class="talk-shimmer-image-placeholder">
                <span class="talk-spinner">✦</span>
                <span>Lumi6 is preparing your explanation & visual model…</span>
              </div>
            </div>
          </div>
        </article>
        `;
      }

      return `
      <article class="talk-turn-card">
        ${step.asked ? `
          <div class="talk-child-prompt">
            <span class="talk-child-badge">You asked</span>
            <p class="talk-child-text">${escapeHtml(step.asked)}</p>
          </div>
        ` : ""}
        <div class="talk-lumi6-box">
          <div class="talk-lumi6-header">
            ${LUMI6_AVATAR_HTML}
            <span class="talk-lumi6-name">Lumi6</span>
            <span class="talk-topic-pill">${escapeHtml(titleText)}</span>
          </div>

          ${keyInsight ? `
            <div class="talk-concept-card">
              <div class="talk-concept-icon">💡</div>
              <div class="talk-concept-text">
                <strong>Key Discovery:</strong> ${escapeHtml(keyInsight)}
              </div>
            </div>
          ` : ""}

          ${deeperExpl ? `
            <div class="talk-explanation-body">
              <p>${escapeHtml(deeperExpl)}</p>
            </div>
          ` : ""}

          ${step.image ? `
            <div class="talk-image-wrapper">
              <img src="${escapeHtml(step.image)}" alt="Lesson illustration" class="talk-lesson-image" loading="lazy">
              <figcaption class="talk-image-caption">
                <span class="talk-image-tag">Visual Model</span>
                ${escapeHtml(titleText)}
              </figcaption>
            </div>
          ` : (idx === pairs.length - 1 && window.__atlasGraphicLoading ? `
            <div class="talk-image-wrapper talk-image-loading-wrapper">
              <div class="talk-image-loading-indicator">
                <span class="talk-spinner">✦</span>
                <span>Illustrating visual concept for this step…</span>
              </div>
            </div>
          ` : "")}

          ${question ? `
            <div class="talk-question-capsule">
              <div class="talk-question-icon">🤔</div>
              <div class="talk-question-content">
                <span class="talk-question-tag">Your Turn</span>
                <p class="talk-question-text">${escapeHtml(question)}</p>
              </div>
            </div>
          ` : ""}
        </div>
      </article>
      `;
    }).join("");

    const scrollArea = document.querySelector("#talkScrollArea");
    if (scrollArea) scrollArea.scrollTop = scrollArea.scrollHeight;
  }

  window.syncTalkModeFeed = syncTalkModeFeed;
  window.setAppViewMode = setAppViewMode;

  const bindModeBtn = (selector, mode) => {
    document.querySelectorAll(selector).forEach(el => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        setAppViewMode(mode);
      });
    });
  };

  bindModeBtn("#modeDrawBtn", "draw");
  bindModeBtn("#modeTalkBtn", "talk");

  const talkMic = document.querySelector("#talkModeMicBtn");
  if (talkMic && window.atlasVoice && typeof window.atlasVoice.bindMicTriggers === "function") {
    window.atlasVoice.bindMicTriggers(talkMic);
  }

  document.querySelector("#talkModeForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.querySelector("#talkModeTextInput");
    const val = input?.value?.trim();
    if (!val) return;
    input.value = "";
    if (window.atlasChat && typeof window.atlasChat.sendMessage === "function") {
      window.atlasChat.sendMessage(val);
    } else {
      const chatInput = document.querySelector("#atlasChatInput");
      if (chatInput) {
        chatInput.value = val;
        document.querySelector("#atlasChatForm")?.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
      }
    }
  });

  if (document.fonts?.load) {
    document.fonts.load('72px "Patrick Hand"').then(() => requestRender()).catch(() => {});
  }
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const initialMode = (urlParams.get("mode") === "talk" || window.location.hash === "#talk") ? "talk" : "draw";
    setAppViewMode(initialMode, false);
  } catch {
    setAppViewMode("draw", false);
  }
  requestAnimationFrame(() => requestAnimationFrame(maybeStartOnboarding));
})();
