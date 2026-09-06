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

  function talkVisualHtml(step, titleText, isLast) {
    if (step.interactive && step.interactive.slug) {
      const href = step.interactive.href || `/api/primer/interactive/${encodeURIComponent(step.interactive.slug)}`;
      const label = step.interactive.title || titleText;
      return `
            <div class="talk-image-wrapper talk-interactive-wrapper">
              <iframe
                class="talk-lesson-interactive"
                data-slug="${escapeHtml(step.interactive.slug)}"
                src="${escapeHtml(href.includes("?") ? href : `${href}?embed=1`)}"
                title="${escapeHtml(label)}"
                sandbox="allow-scripts"
                loading="lazy"
              ></iframe>
              <figcaption class="talk-image-caption">
                <span class="talk-image-tag">Try it</span>
                ${escapeHtml(label)}
              </figcaption>
            </div>`;
    }
    if (step.image) {
      return `
            <div class="talk-image-wrapper">
              <img src="${escapeHtml(step.image)}" alt="Lesson illustration" class="talk-lesson-image" loading="lazy">
              <figcaption class="talk-image-caption">
                <span class="talk-image-tag">Visual Model</span>
                ${escapeHtml(titleText)}
              </figcaption>
            </div>`;
    }
    if (isLast && window.__primerGraphicLoading) {
      return `
            <div class="talk-image-wrapper talk-image-loading-wrapper">
              <div class="talk-image-loading-indicator">
                <span class="talk-spinner">✦</span>
                <span>Illustrating visual concept for this step…</span>
              </div>
            </div>`;
    }
    return "";
  }

  function formatCleanLessonTitle(raw) {
    if (!raw || raw === "Untitled") return "Science Discovery";
    return String(raw)
      .replace(/^[#\s*_-]+|[#\s*_-]+$/g, "")
      .replace(/^[Aa]n?\s+/, "")
      .trim();
  }

  const DOUBT_CHECK_RE = /everything making sense|does that make sense|does this make sense|any part you want me to explain|any doubts|anything unclear|want me to explain.+again|making sense so far|with me so far|any questions so far/i;

  function isDoubtCheck(sentence) {
    return DOUBT_CHECK_RE.test(String(sentence || "").trim());
  }

  function extractSpokenParts(text) {
    let raw = String(text || "").replace(/\s+/g, " ").trim();
    const choices = [];
    let blockStart = raw.search(/\(\s*[aA]\s*\)/);
    if (blockStart < 0) blockStart = raw.search(/(?:^|\s)[aA][).]\s+\S/);
    if (blockStart >= 0) {
      const block = raw.slice(blockStart);
      const re = /\(\s*([a-c])\s*\)\s*([^]+?)(?=\s*\(\s*[a-c]\s*\)|$)/gi;
      let match;
      while ((match = re.exec(block))) {
        const choice = String(match[2] || "").replace(/\s+/g, " ").trim().replace(/[.;]+$/, "");
        if (choice) choices.push({ letter: match[1].toLowerCase(), text: choice });
      }
      if (choices.length >= 2) raw = raw.slice(0, blockStart).replace(/\s+/g, " ").trim();
      else choices.length = 0;
    }

    const sentences = raw.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean).filter((s) => !isDoubtCheck(s));
    let question = "";
    const teaching = [];
    for (const sentence of sentences) {
      const isQuestion = sentence.endsWith("?")
        || /^(what|how|why|can you|where|do you think|imagine|can you guess)\b/i.test(sentence);
      if (isQuestion) question = sentence;
      else teaching.push(sentence);
    }
    return { teaching: teaching.join(" "), question, choices };
  }

  function splitTeacherTurn(cleanSpoken) {
    const parts = extractSpokenParts(cleanSpoken);
    return {
      keyInsight: "",
      deeperExpl: parts.teaching,
      question: parts.question,
      choices: parts.choices
    };
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
      if (window.primerVoice && typeof window.primerVoice.turnOff === "function") {
        window.primerVoice.turnOff();
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
        current = { asked: turn.text, explanation: [], image: turn.image || "", interactive: turn.interactive || null, question: "", choices: [] };
      } else {
        if (!current) current = { asked: "", explanation: [], image: turn.image || "", interactive: turn.interactive || null, question: "", choices: [] };
        const cleanSpoken = String(turn.text || "")
          .replace(/^(Hey|Hello|Hi|Welcome back|Welcome|Good morning|Good afternoon)\s+[A-Za-z0-9_]+[.,!?:-]*\s*/i, "")
          .replace(/^([A-Za-z0-9_]+)[,!:]\s+(?=[A-Z])/i, "")
          .replace(/^(Hey|Hello|Hi|Welcome)\s*[,!.]\s*/i, "")
          .trim();
        const { deeperExpl, question, choices } = splitTeacherTurn(cleanSpoken);
        if (deeperExpl) current.explanation.push(deeperExpl);
        if (question) current.question = question;
        if (choices && choices.length) current.choices = choices;
        if (turn.image) current.image = turn.image;
        if (turn.interactive) current.interactive = turn.interactive;
      }
    }
    if (current) pairs.push(current);

    const liveFrames = [];
    feed.querySelectorAll("iframe.talk-lesson-interactive").forEach((frame) => {
      liveFrames.push({ slug: frame.dataset.slug, node: frame });
    });

    feed.innerHTML = pairs.map((step, idx) => {
      const parsed = splitTeacherTurn((step.explanation || []).join(" ") + (step.question ? ` ${step.question}` : ""));
      const deeperExpl = parsed.deeperExpl;
      const question = step.question || parsed.question;
      const choices = (step.choices && step.choices.length) ? step.choices : parsed.choices;

      if (!deeperExpl && !question) {
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

          ${deeperExpl ? `
            <div class="talk-explanation-body">
              <p>${escapeHtml(deeperExpl)}</p>
            </div>
          ` : ""}

          ${talkVisualHtml(step, titleText, idx === pairs.length - 1)}

          ${question || (choices && choices.length) ? `
            <div class="talk-question-capsule">
              <div class="talk-question-icon">🤔</div>
              <div class="talk-question-content">
                <span class="talk-question-tag">Your Turn</span>
                ${question ? `<p class="talk-question-text">${escapeHtml(question)}</p>` : ""}
                ${choices && choices.length ? `
                  <div class="talk-choice-list" role="list">
                    ${choices.map((choice) => `
                      <div class="talk-choice" role="listitem">
                        <span class="talk-choice-letter">${escapeHtml((choice.letter || "").toUpperCase())}</span>
                        <span class="talk-choice-text">${escapeHtml(choice.text)}</span>
                      </div>
                    `).join("")}
                  </div>
                ` : ""}
              </div>
            </div>
          ` : ""}
        </div>
      </article>
      `;
    }).join("");

    feed.querySelectorAll("iframe.talk-lesson-interactive").forEach((frame) => {
      const kept = liveFrames.find((item) => item.slug && item.slug === frame.dataset.slug);
      if (kept?.node && kept.node !== frame) frame.replaceWith(kept.node);
    });

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
  if (talkMic && window.primerVoice && typeof window.primerVoice.bindMicTriggers === "function") {
    window.primerVoice.bindMicTriggers(talkMic);
  }

  document.querySelector("#talkModeForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.querySelector("#talkModeTextInput");
    const val = input?.value?.trim();
    if (!val) return;
    input.value = "";
    if (window.primerChat && typeof window.primerChat.sendMessage === "function") {
      window.primerChat.sendMessage(val);
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
