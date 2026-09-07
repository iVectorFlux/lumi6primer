// ── 7. DRAW MODE & TALK MODE INTERACTIVE CONTROLLER ─────────────
  let currentAppViewMode = "draw";
  let talkPlaygroundSlug = "";

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function childPromptHtml(text) {
    const raw = String(text || "").trim();
    if (!raw) return "";
    const choice = parseChildChoice(raw);
    if (choice) {
      return `
            <div class="talk-child-prompt">
              <span class="talk-child-badge">You answered</span>
              <p class="talk-child-text">${escapeHtml(choice)}</p>
            </div>`;
    }
    return `
            <div class="talk-child-prompt">
              <span class="talk-child-badge">You asked</span>
              <p class="talk-child-text">${escapeHtml(raw)}</p>
            </div>`;
  }

  function parseChildChoice(text) {
    const raw = String(text || "").trim();
    const match = raw.match(/(?:i choose|i pick|my answer is)\s*\(?\s*([a-c])\s*\)?\s*(.*)$/i)
      || raw.match(/^you asked:.*?\bi choose\s*\(?\s*([a-c])\s*\)?\s*(.*)$/i);
    if (!match) return "";
    const letter = String(match[1] || "").toUpperCase();
    const rest = String(match[2] || "")
      .replace(/^[:\-–]\s*/, "")
      .replace(/[,;:\s]+or\.?$/i, "")
      .replace(/[.;]+$/, "")
      .trim();
    return rest ? `${letter} — ${rest}` : letter;
  }

  function talkVisualHtml(step, titleText, isLast) {
    if (step.interactive && step.interactive.slug) {
      const href = step.interactive.href || `/api/primer/interactive/${encodeURIComponent(step.interactive.slug)}`;
      const label = step.interactive.title || titleText;
      return `
            <div class="talk-image-wrapper talk-interactive-wrapper" data-interactive-slug="${escapeHtml(step.interactive.slug)}">
              <div class="talk-interactive-stage">
                <iframe
                  class="talk-lesson-interactive"
                  data-slug="${escapeHtml(step.interactive.slug)}"
                  src="${escapeHtml(href.includes("?") ? href : `${href}?embed=1`)}"
                  title="${escapeHtml(label)}"
                  sandbox="allow-scripts"
                  loading="lazy"
                ></iframe>
              </div>
              <figcaption class="talk-image-caption">
                <span class="talk-image-tag">Try it</span>
                <span class="talk-image-caption-title">${escapeHtml(label)}</span>
                <button type="button" class="talk-interactive-expand" data-expand-interactive>
                  Open playground
                </button>
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
        const choice = String(match[2] || "")
          .replace(/\s+/g, " ")
          .trim()
          .replace(/[,;:\s]+or\.?$/i, "")
          .replace(/^[.,;:\s]+/, "")
          .replace(/[.;]+$/, "")
          .trim();
        if (choice) choices.push({ letter: match[1].toLowerCase(), text: choice });
      }
      if (choices.length >= 2) raw = raw.slice(0, blockStart).replace(/\s+/g, " ").trim();
      else choices.length = 0;
    }

    const sentences = raw.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean).filter((s) => !isDoubtCheck(s));
    let question = "";
    const teaching = [];
    for (const sentence of sentences) {
      const isQuestion = sentence.endsWith("?");
      if (isQuestion) question = sentence;
      else teaching.push(sentence);
    }
    return { teaching: teaching.join(" "), question, choices };
  }

  function explanationParagraphs(text) {
    const sentences = String(text || "").split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
    if (!sentences.length) return "";
    const paras = [];
    for (let i = 0; i < sentences.length; i += 2) {
      paras.push(sentences.slice(i, i + 2).join(" "));
    }
    return paras.map((para) => `<p>${escapeHtml(para)}</p>`).join("");
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
      syncTalkModeFeed({ scroll: true });
    } else {
      if (window.primerVoice && typeof window.primerVoice.turnOff === "function") {
        window.primerVoice.turnOff();
      }
      render();
    }
  }

  function syncTalkModeFeed(options = {}) {
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
              <p>Welcome! Press and hold <strong>Talk</strong> below, then release to send — or type a question to start exploring.</p>
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

    const playgroundOpen = Boolean(talkPlaygroundSlug) && !document.getElementById("talkPlayground")?.hidden;
    const liveFrames = [];
    document.querySelectorAll("iframe.talk-lesson-interactive").forEach((frame) => {
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
          ${step.asked ? childPromptHtml(step.asked) : ""}
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
        ${step.asked ? childPromptHtml(step.asked) : ""}
        <div class="talk-lumi6-box${(step.interactive || step.image || (idx === pairs.length - 1 && window.__primerGraphicLoading)) ? " has-visual" : ""}">
          <div class="talk-lumi6-header">
            ${LUMI6_AVATAR_HTML}
            <span class="talk-lumi6-name">Lumi6</span>
            <span class="talk-topic-pill">${escapeHtml(titleText)}</span>
          </div>

          ${deeperExpl ? `
            <div class="talk-explanation-body">
              ${explanationParagraphs(deeperExpl)}
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
                      <button type="button" class="talk-choice" role="listitem" data-choice-letter="${escapeHtml((choice.letter || "").toUpperCase())}" data-choice-text="${escapeHtml(choice.text)}">
                        <span class="talk-choice-letter">${escapeHtml((choice.letter || "").toUpperCase())}</span>
                        <span class="talk-choice-text">${escapeHtml(choice.text)}</span>
                      </button>
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

    bindTalkChoices(feed);
    bindTalkPlayground(feed);
    if (playgroundOpen && talkPlaygroundSlug) {
      const home = feed.querySelector(`.talk-interactive-wrapper[data-interactive-slug="${CSS.escape(talkPlaygroundSlug)}"]`);
      const frame = home?.querySelector("iframe.talk-lesson-interactive");
      if (frame) openTalkPlayground(frame);
    }
    if (options.scroll !== false) scrollTalkToLatest(options.scroll === true);
  }

  let lastTalkScrollKey = "";

  function talkScrollKey() {
    const turns = typeof window.Lumi6Lesson?.turns === "function" ? window.Lumi6Lesson.turns() : [];
    const last = turns[turns.length - 1] || {};
    return `${turns.length}:${last.role || ""}:${String(last.text || "").slice(0, 80)}`;
  }

  function scrollTalkToLatest(force) {
    const scrollArea = document.querySelector("#talkScrollArea");
    const last = document.querySelector("#talkFeed .talk-turn-card:last-of-type");
    if (!scrollArea || !last) return;
    const key = talkScrollKey();
    if (!force && key === lastTalkScrollKey) return;
    lastTalkScrollKey = key;
    const areaRect = scrollArea.getBoundingClientRect();
    const cardRect = last.getBoundingClientRect();
    const top = scrollArea.scrollTop + (cardRect.top - areaRect.top) - 10;
    scrollArea.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }

  function bindTalkChoices(feed) {
    const cards = feed.querySelectorAll(".talk-turn-card");
    const last = cards[cards.length - 1];
    if (!last) return;
    const list = last.querySelector(".talk-choice-list");
    if (!list) return;
    const question = last.querySelector(".talk-question-text")?.textContent?.trim() || "";
    list.querySelectorAll(".talk-choice").forEach((btn) => {
      btn.addEventListener("click", () => sendTalkChoice(btn, question, list));
    });
  }

  function sendTalkChoice(btn, question, list) {
    if (!btn || list?.classList.contains("is-locked")) return;
    const letter = btn.getAttribute("data-choice-letter") || "";
    const choice = btn.getAttribute("data-choice-text") || btn.querySelector(".talk-choice-text")?.textContent?.trim() || "";
    if (!choice) return;
    list.classList.add("is-locked");
    btn.classList.add("is-selected");
    const payload = `I choose (${letter}) ${choice.replace(/[,;:\s]+or\.?$/i, "").trim()}.`;
    if (window.primerChat && typeof window.primerChat.sendMessage === "function") {
      window.primerChat.sendMessage(payload);
    }
  }

  function bindTalkPlayground(feed) {
    feed.querySelectorAll("[data-expand-interactive]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const frame = btn.closest(".talk-interactive-wrapper")?.querySelector("iframe.talk-lesson-interactive");
        if (frame) openTalkPlayground(frame);
      });
    });
  }

  function openTalkPlayground(frame) {
    const sheet = document.getElementById("talkPlayground");
    const stage = document.getElementById("talkPlaygroundStage");
    const title = document.getElementById("talkPlaygroundTitle");
    const home = frame.closest(".talk-interactive-stage") || frame.parentElement;
    if (!sheet || !stage || !home) return;
    talkPlaygroundSlug = frame.dataset.slug || "";
    home.dataset.playgroundHome = "1";
    if (title) title.textContent = frame.getAttribute("title") || "Playground";
    stage.replaceChildren(frame);
    sheet.hidden = false;
    document.body.classList.add("talk-playground-open");
    requestAnimationFrame(() => {
      frame.style.width = "100%";
      frame.style.height = "100%";
    });
  }

  function closeTalkPlayground() {
    const sheet = document.getElementById("talkPlayground");
    const stage = document.getElementById("talkPlaygroundStage");
    const frame = stage?.querySelector("iframe.talk-lesson-interactive");
    const home = document.querySelector(".talk-interactive-stage[data-playground-home]")
      || document.querySelector(`.talk-interactive-wrapper[data-interactive-slug="${CSS.escape(talkPlaygroundSlug)}"] .talk-interactive-stage`);
    if (frame && home) {
      frame.style.width = "";
      frame.style.height = "";
      home.prepend(frame);
      delete home.dataset.playgroundHome;
    }
    if (sheet) sheet.hidden = true;
    document.body.classList.remove("talk-playground-open");
    talkPlaygroundSlug = "";
  }

  window.syncTalkModeFeed = (options) => syncTalkModeFeed(options);
  window.scrollTalkToLatest = () => scrollTalkToLatest(true);
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

  document.getElementById("talkPlaygroundClose")?.addEventListener("click", closeTalkPlayground);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && document.body.classList.contains("talk-playground-open")) {
      closeTalkPlayground();
    }
  });

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
    const hash = String(window.location.hash || "").toLowerCase();
    const initialMode = (urlParams.get("mode") === "draw" || hash === "#draw") ? "draw" : "talk";
    setAppViewMode(initialMode, false);
  } catch {
    setAppViewMode("talk", false);
  }
  requestAnimationFrame(() => requestAnimationFrame(maybeStartOnboarding));
})();
