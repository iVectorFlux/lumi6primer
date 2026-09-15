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

  function interactiveMetaAttrs(interactive) {
    return [
      `data-slug="${escapeHtml(interactive.slug || "")}"`,
      `data-scenario="${interactive.scenario ? "1" : "0"}"`,
      `data-subject="${escapeHtml(interactive.subject || "")}"`,
      `data-klass="${escapeHtml(interactive.klass || "")}"`,
      `data-idea="${escapeHtml(interactive.idea || "")}"`,
      `data-concept="${escapeHtml(interactive.concept || "")}"`,
      `data-summary="${escapeHtml(interactive.summary || "")}"`,
      `data-href-pill="${escapeHtml(interactive.hrefPill || interactive.href || "")}"`,
      `data-href-mobile="${escapeHtml(interactive.hrefMobile || "")}"`,
      `data-href-desktop="${escapeHtml(interactive.hrefDesktop || "")}"`
    ].join("\n                  ");
  }

  /** Native pill iframe from the interactive HTML — tap expands in the parent. */
  function talkInteractivePillHtml(step, titleText) {
    const interactive = step.interactive;
    const pill = interactive.pill || {};
    const label = pill.title || interactive.title || titleText;
    const href = interactive.hrefPill || interactive.href || `/api/primer/interactive/${encodeURIComponent(interactive.slug)}?embed=1&mode=pill`;
    return `
            <div class="talk-interactive-pill-wrapper" data-interactive-slug="${escapeHtml(interactive.slug)}">
              <iframe
                class="talk-lesson-pill"
                ${interactiveMetaAttrs(interactive)}
                src="${escapeHtml(href.includes("mode=") ? href : `${href}${href.includes("?") ? "&" : "?"}mode=pill`)}"
                title="${escapeHtml(label)}"
                sandbox="allow-scripts allow-same-origin"
                loading="lazy"
              ></iframe>
              <div class="talk-interactive-stage" hidden aria-hidden="true"></div>
            </div>`;
  }

  function talkInteractiveHtml(step, titleText) {
    if (step.interactive?.pill?.title || step.interactive?.scenario) {
      return talkInteractivePillHtml(step, titleText);
    }
    const href = step.interactive.href || `/api/primer/interactive/${encodeURIComponent(step.interactive.slug)}`;
    const label = step.interactive.title || titleText;
    return `
            <div class="talk-image-wrapper talk-interactive-wrapper" data-interactive-slug="${escapeHtml(step.interactive.slug)}">
              <div class="talk-interactive-stage">
                <iframe
                  class="talk-lesson-interactive"
                  ${interactiveMetaAttrs(step.interactive)}
                  src="${escapeHtml(href.includes("?") ? href : `${href}?embed=1`)}"
                  title="${escapeHtml(label)}"
                  sandbox="allow-scripts allow-same-origin"
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

  function talkImageHtml(step, titleText) {
    const src = String(step.image || "").trim();
    if (!src) return "";
    return `
            <div class="talk-image-wrapper is-pending">
              <img src="${escapeHtml(src)}" alt="" class="talk-lesson-image" loading="lazy">
              <figcaption class="talk-image-caption">
                <span class="talk-image-tag">Visual Model</span>
                ${escapeHtml(titleText)}
              </figcaption>
            </div>`;
  }

  function talkVisualHtml(step, titleText, isLast) {
    const hasInteractive = Boolean(step.interactive && step.interactive.slug);
    // A reference picture and a thing to play with answer different questions,
    // so when we have both they share the row instead of pushing each other down.
    if (hasInteractive && step.image) {
      return `
            <div class="talk-visual-pair">
              ${talkImageHtml(step, titleText)}
              ${talkInteractiveHtml(step, titleText)}
            </div>`;
    }
    if (hasInteractive) return talkInteractiveHtml(step, titleText);
    if (step.image) return talkImageHtml(step, titleText);
    return "";
  }

  function formatCleanLessonTitle(raw) {
    const value = String(raw || "").trim();
    if (!value || value === "Untitled" || /^New board\b/i.test(value) || value === "Science Discovery") return "";
    return value
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

  function normalizeAppMode(mode) {
    if (mode === "talk" || mode === "sim" || mode === "draw") return mode;
    return "draw";
  }

  function setAppViewMode(mode, updateUrl = true) {
    const next = normalizeAppMode(mode);
    if (next !== currentAppViewMode) closeTalkPlayground();
    currentAppViewMode = next;
    const drawBtns = document.querySelectorAll("#modeDrawBtn, #topbarModeDrawBtn");
    const talkBtns = document.querySelectorAll("#modeTalkBtn, #topbarModeTalkBtn");
    const simBtns = document.querySelectorAll("#modeSimBtn, #topbarModeSimBtn");
    const canvasWorkspace = document.querySelector(".canvas-workspace");
    const talkWorkspace = document.querySelector("#talkModeWorkspace");
    const simWorkspace = document.querySelector("#simModeWorkspace");
    const docTitle = document.querySelector("#docTitleHeading");
    const hideBoard = currentAppViewMode !== "draw";

    document.body.classList.toggle("mode-talk-active", currentAppViewMode === "talk");
    document.body.classList.toggle("mode-sim-active", currentAppViewMode === "sim");
    document.body.classList.toggle("mode-draw-active", currentAppViewMode === "draw");

    drawBtns.forEach(btn => {
      btn.classList.toggle("active", currentAppViewMode === "draw");
      btn.setAttribute("aria-pressed", String(currentAppViewMode === "draw"));
    });
    talkBtns.forEach(btn => {
      btn.classList.toggle("active", currentAppViewMode === "talk");
      btn.setAttribute("aria-pressed", String(currentAppViewMode === "talk"));
    });
    simBtns.forEach(btn => {
      btn.classList.toggle("active", currentAppViewMode === "sim");
      btn.setAttribute("aria-pressed", String(currentAppViewMode === "sim"));
    });

    if (docTitle) {
      docTitle.textContent = currentAppViewMode === "talk"
        ? "Talk Mode"
        : currentAppViewMode === "sim"
          ? "SIM"
          : "Whiteboard";
    }

    if (canvasWorkspace) {
      canvasWorkspace.hidden = hideBoard;
      canvasWorkspace.style.display = hideBoard ? "none" : "";
    }
    if (talkWorkspace) {
      talkWorkspace.hidden = currentAppViewMode !== "talk";
      talkWorkspace.style.display = currentAppViewMode === "talk" ? "flex" : "none";
    }
    if (simWorkspace) {
      simWorkspace.hidden = currentAppViewMode !== "sim";
      simWorkspace.style.display = currentAppViewMode === "sim" ? "flex" : "none";
    }

    if (updateUrl && window.history?.replaceState) {
      try {
        const url = new URL(window.location.href);
        if (currentAppViewMode === "talk" || currentAppViewMode === "sim") {
          url.searchParams.set("mode", currentAppViewMode);
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

    if (currentAppViewMode !== "talk" && window.primerVoice && typeof window.primerVoice.turnOff === "function") {
      window.primerVoice.turnOff();
    }

    if (currentAppViewMode === "talk") {
      if (typeof window.hideTalkWait === "function") window.hideTalkWait();
      syncTalkModeFeed({ scroll: true });
    } else if (currentAppViewMode === "sim") {
      if (typeof window.hideTalkWait === "function") window.hideTalkWait();
      loadSimCatalog();
    } else {
      closeTalkPlayground();
      render();
    }
  }

  function syncTalkModeFeed(options = {}) {
    const feed = document.querySelector("#talkFeed");
    if (!feed) return;
    if (typeof window.destroyLumiWaiters === "function") window.destroyLumiWaiters(feed);

    const turns = typeof window.Lumi6Lesson?.turns === "function"
      ? window.Lumi6Lesson.turns()
      : [];
    const firstAsk = turns.find((turn) => turn.role === "student" && String(turn.text || "").trim())?.text || "";
    if (typeof maybeNameBoardFromText === "function") maybeNameBoardFromText(firstAsk);

    const titleText = formatCleanLessonTitle(state.lessonTitle || state.boardTitle || firstAsk || document.querySelector("#currentDocName")?.textContent) || "Science Discovery";
    const hasLesson = turns.some((turn) => turn.role === "teacher" && (String(turn.text || "").trim() || turn.image || turn.interactive));
    if (hasLesson && typeof window.hideTalkWait === "function") window.hideTalkWait();

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
              <p>Tap the mic to talk, or type a question and send. What would you like to explore?</p>
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
    document.querySelectorAll("iframe.talk-lesson-interactive, iframe.talk-lesson-pill").forEach((frame) => {
      liveFrames.push({ slug: frame.dataset.slug, node: frame });
    });

    feed.innerHTML = pairs.map((step, idx) => {
      const parsed = splitTeacherTurn((step.explanation || []).join(" ") + (step.question ? ` ${step.question}` : ""));
      const deeperExpl = parsed.deeperExpl;
      const question = step.question || parsed.question;
      const choices = (step.choices && step.choices.length) ? step.choices : parsed.choices;

      if (!deeperExpl && !question && !(step.interactive || step.image)) {
        return `
        <article class="talk-turn-card">
          ${step.asked ? childPromptHtml(step.asked) : ""}
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

    feed.querySelectorAll("iframe.talk-lesson-interactive, iframe.talk-lesson-pill").forEach((frame) => {
      const kept = liveFrames.find((item) => item.slug && item.slug === frame.dataset.slug);
      if (kept?.node && kept.node !== frame) frame.replaceWith(kept.node);
    });

    bindTalkChoices(feed);
    bindTalkPlayground(feed);
    bindTalkImages(feed);
    if (playgroundOpen && talkPlaygroundSlug) {
      const home = feed.querySelector(`.talk-interactive-pill-wrapper[data-interactive-slug="${CSS.escape(talkPlaygroundSlug)}"]`)
        || feed.querySelector(`.talk-interactive-wrapper[data-interactive-slug="${CSS.escape(talkPlaygroundSlug)}"]`);
      const frame = home?.querySelector("iframe.talk-lesson-interactive:not(.talk-lesson-pill)");
      if (frame) openTalkPlayground(frame);
    }
    if (typeof window.mountLumiWaiters === "function") window.mountLumiWaiters(feed);
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

  function bindTalkImages(feed) {
    feed.querySelectorAll(".talk-lesson-image").forEach((img) => {
      const wrap = img.closest(".talk-image-wrapper");
      if (!wrap) return;
      const show = () => {
        wrap.classList.remove("is-pending");
        wrap.classList.add("is-ready");
      };
      const hide = () => wrap.remove();
      img.addEventListener("load", show);
      img.addEventListener("error", hide);
      if (img.complete) {
        if (img.naturalWidth > 0) show();
        else hide();
      }
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

  function isMobileInteractiveView() {
    return window.matchMedia("(max-width: 900px), (hover: none) and (pointer: coarse)").matches;
  }

  function prefersMobilePlayground() {
    return currentAppViewMode === "sim" || isMobileInteractiveView();
  }

  function interactiveExpandHref(trigger) {
    const data = trigger?.dataset || {};
    const slug = data.slug || trigger?.closest("[data-interactive-slug]")?.dataset?.interactiveSlug || "";
    if (!slug) return "";
    const mobile = data.hrefMobile || `/api/primer/interactive/${encodeURIComponent(slug)}?embed=1&mode=mobile`;
    const desktop = data.hrefDesktop || `/api/primer/interactive/${encodeURIComponent(slug)}?embed=1&mode=desktop`;
    return prefersMobilePlayground() ? mobile : desktop;
  }

  function ensureInteractiveFrame(trigger) {
    const wrapper = trigger.closest(".talk-interactive-pill-wrapper, .talk-interactive-wrapper");
    if (!wrapper) return null;
    const stage = wrapper.querySelector(".talk-interactive-stage") || wrapper;
    let frame = wrapper.querySelector("iframe.talk-lesson-interactive:not(.talk-lesson-pill)");
    const data = trigger.dataset || {};
    const slug = data.slug || wrapper.dataset.interactiveSlug || "";
    const label = trigger.getAttribute("title") || slug;
    if (!frame) {
      frame = document.createElement("iframe");
      frame.className = "talk-lesson-interactive";
      frame.setAttribute("sandbox", "allow-scripts allow-same-origin");
      frame.setAttribute("title", label);
      for (const key of ["slug", "scenario", "subject", "klass", "idea", "concept", "summary", "hrefMobile", "hrefDesktop", "hrefPill"]) {
        if (data[key] != null) frame.dataset[key] = data[key];
      }
      stage.appendChild(frame);
    }
    const href = interactiveExpandHref(trigger);
    if (href && frame.getAttribute("src") !== href) frame.setAttribute("src", href);
    return frame;
  }

  function bindTalkPlayground(feed) {
    feed.querySelectorAll("[data-expand-interactive]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const frame = btn.closest(".talk-interactive-wrapper")?.querySelector("iframe.talk-lesson-interactive")
          || ensureInteractiveFrame(btn);
        if (frame) openTalkPlayground(frame);
      });
    });
  }

  const SUBJECT_LABELS = { math: "Maths", maths: "Maths", science: "Science" };

  function subjectLabel(value) {
    const key = String(value || "").trim().toLowerCase();
    if (!key) return "";
    return SUBJECT_LABELS[key] || key.charAt(0).toUpperCase() + key.slice(1);
  }

  function fillPlaygroundChrome(frame) {
    const header = document.getElementById("talkPlaygroundHeader");
    const notes = document.getElementById("talkPlaygroundNotes");
    const title = document.getElementById("talkPlaygroundTitle");
    if (header) header.hidden = true;
    if (notes) notes.innerHTML = "";
    if (title) title.textContent = "";
  }

  /** Height comes from the interactive itself, so its canvas is never stretched. */
  function applyInteractiveHeight(frame, height) {
    if (!frame || !height) return;
    if (frame.classList.contains("talk-lesson-pill")) {
      frame.style.height = `${Math.max(56, Math.min(height, 96))}px`;
      return;
    }
    const inPlayground = Boolean(frame.closest("#talkPlaygroundStage"));
    if (inPlayground) {
      frame.style.width = "100%";
      frame.style.height = "100%";
      frame.style.minHeight = "0";
      return;
    }
    const ceiling = inPlayground
      ? Math.round(window.innerHeight * 1.4)
      : Math.min(520, Math.round(window.innerHeight * 0.6));
    frame.style.height = `${Math.max(200, Math.min(height, ceiling))}px`;
  }

  window.addEventListener("message", (event) => {
    const data = event.data;
    if (data?.type === "lumi6:expand-interactive") {
      const stageFrame = document.querySelector("#talkPlaygroundStage iframe.talk-lesson-interactive");
      if (document.body.classList.contains("talk-playground-open") && stageFrame) {
        const fromStage = (() => { try { return stageFrame.contentWindow === event.source; } catch { return false; } })();
        if (fromStage || !data.slug || stageFrame.dataset.slug === data.slug) {
          document.body.classList.add("talk-playground-fullscreen");
          nudgeInteractive(stageFrame);
          return;
        }
      }
      const pills = [...document.querySelectorAll("iframe.talk-lesson-pill")];
      const bySource = pills.find((pill) => {
        try { return pill.contentWindow === event.source; } catch { return false; }
      });
      const bySlug = data.slug
        ? pills.find((pill) => pill.dataset.slug === data.slug)
        : null;
      const pill = bySource || bySlug || pills[pills.length - 1];
      if (pill) {
        const frame = ensureInteractiveFrame(pill);
        if (frame) openTalkPlayground(frame);
      }
      return;
    }
    if (!data || data.type !== "lumi6:interactive-height") return;
    const frames = document.querySelectorAll("iframe.talk-lesson-interactive, iframe.talk-lesson-pill");
    for (const frame of frames) {
      if (frame.contentWindow === event.source) {
        applyInteractiveHeight(frame, Number(data.height));
        return;
      }
    }
  });

  function openTalkPlayground(frame) {
    const sheet = document.getElementById("talkPlayground");
    const stage = document.getElementById("talkPlaygroundStage");
    const title = document.getElementById("talkPlaygroundTitle");
    const home = frame.closest(".talk-interactive-stage") || frame.parentElement;
    if (!sheet || !stage || !home) return;
    talkPlaygroundSlug = frame.dataset.slug || "";
    home.dataset.playgroundHome = "1";
    const scenario = frame.dataset.scenario === "1";
    if (title) title.textContent = "";
    fillPlaygroundChrome(frame);
    stage.replaceChildren(frame);
    sheet.hidden = false;
    document.body.classList.toggle("talk-playground-scenario", scenario);
    document.body.classList.toggle("talk-playground-mobile", prefersMobilePlayground());
    document.body.classList.remove("talk-playground-fullscreen");
    document.body.classList.add("talk-playground-open");
    if (typeof window.hideTalkWait === "function") window.hideTalkWait();
    requestAnimationFrame(() => {
      frame.style.width = "100%";
      frame.style.height = "100%";
      frame.style.minHeight = "0";
      nudgeInteractive(frame);
    });
  }

  /** Ask the embed to re-measure after it changes container. */
  function nudgeInteractive(frame) {
    try {
      frame.contentWindow?.dispatchEvent(new Event("resize"));
    } catch {}
  }

  function closeTalkPlayground() {
    const sheet = document.getElementById("talkPlayground");
    const stage = document.getElementById("talkPlaygroundStage");
    const header = document.getElementById("talkPlaygroundHeader");
    const notes = document.getElementById("talkPlaygroundNotes");
    const frame = stage?.querySelector("iframe.talk-lesson-interactive");
    const home = document.querySelector(".talk-interactive-stage[data-playground-home]")
      || document.querySelector(`.talk-interactive-pill-wrapper[data-interactive-slug="${CSS.escape(talkPlaygroundSlug)}"] .talk-interactive-stage`)
      || document.querySelector(`.talk-interactive-wrapper[data-interactive-slug="${CSS.escape(talkPlaygroundSlug)}"] .talk-interactive-stage`);
    if (frame && home) {
      frame.style.width = "";
      frame.style.height = "";
      home.prepend(frame);
      delete home.dataset.playgroundHome;
      nudgeInteractive(frame);
    }
    if (sheet) sheet.hidden = true;
    if (header) header.hidden = true;
    if (notes) notes.innerHTML = "";
    document.body.classList.remove("talk-playground-open", "talk-playground-scenario", "talk-playground-mobile", "talk-playground-fullscreen");
    talkPlaygroundSlug = "";
  }

  function classHeading(klass) {
    const grade = Number(klass);
    return Number.isFinite(grade) && grade > 0 ? `Class ${grade}` : "More";
  }

  function simCatalogHtml(items) {
    const groups = new Map();
    for (const item of items) {
      const key = Number.isFinite(Number(item.klass)) ? Number(item.klass) : 0;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    }
    return [...groups.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([klass, rows]) => `
        <section class="sim-class-block">
          <h2 class="sim-class-label">${escapeHtml(classHeading(klass))}</h2>
          <div class="sim-pill-list">
            ${rows.map((interactive) => talkInteractivePillHtml(
              { interactive },
              interactive.pill?.title || interactive.title
            )).join("")}
          </div>
        </section>
      `)
      .join("");
  }

  let simCatalogPromise = null;

  async function loadSimCatalog() {
    const feed = document.getElementById("simFeed");
    if (!feed) return;
    if (feed.querySelector(".sim-class-block")) return;
    if (!simCatalogPromise) {
      simCatalogPromise = (async () => {
        const headers = typeof window.Lumi6Profile?.authHeaders === "function"
          ? await window.Lumi6Profile.authHeaders()
          : {};
        const response = await fetch("/api/primer/interactives", { headers });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        return Array.isArray(data.items) ? data.items : [];
      })().catch((err) => {
        simCatalogPromise = null;
        throw err;
      });
    }
    feed.innerHTML = `<p class="sim-feed-status">Loading interactives…</p>`;
    try {
      const items = await simCatalogPromise;
      feed.innerHTML = items.length
        ? simCatalogHtml(items)
        : `<p class="sim-feed-status">No interactives yet.</p>`;
    } catch {
      feed.innerHTML = `<p class="sim-feed-status">Could not load interactives. Try again.</p>`;
    }
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
  bindModeBtn("#modeSimBtn", "sim");

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

  function growTalkComposer() {
    const input = document.getElementById("talkModeTextInput");
    if (!input) return;
    input.style.height = "auto";
    input.style.height = `${Math.min(Math.max(input.scrollHeight, 24), 160)}px`;
  }

  function syncComposerSpeech() {
    growTalkComposer();
    const voice = window.primerVoice;
    if (!voice || voice.state === "LISTENING") return;
    const value = String(document.getElementById("talkModeTextInput")?.value || "").trim();
    voice._speechSeed = value;
    voice.pendingHeard = value;
    if (voice.stt) {
      voice.stt._finalParts = [];
      voice.stt._interim = "";
      voice.stt.lastTranscript = "";
    }
  }

  window.growTalkComposer = growTalkComposer;

  document.querySelector("#talkModeForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.querySelector("#talkModeTextInput");
    const val = input?.value?.trim();
    if (!val) return;
    input.value = "";
    growTalkComposer();
    if (window.primerChat && typeof window.primerChat.sendMessage === "function") {
      window.primerChat.sendMessage(val);
    }
  });

  const talkComposer = document.querySelector("#talkModeTextInput");
  talkComposer?.addEventListener("input", syncComposerSpeech);
  talkComposer?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      document.querySelector("#talkModeForm")?.requestSubmit();
    }
  });

  if (document.fonts?.load) {
    document.fonts.load('72px "Patrick Hand"').then(() => requestRender()).catch(() => {});
  }
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const hash = String(window.location.hash || "").toLowerCase();
    const requested = String(urlParams.get("mode") || hash.replace("#", "") || "").toLowerCase();
    const initialMode = requested === "draw" || requested === "sim" || requested === "talk" ? requested : "talk";
    setAppViewMode(initialMode, false);
  } catch {
    setAppViewMode("talk", false);
  }
  if (typeof applyBoardTitle === "function") {
    applyBoardTitle(state.boardTitle || "New board", { placeholder: state.boardTitlePlaceholder !== false, force: true });
  }
  requestAnimationFrame(() => requestAnimationFrame(maybeStartOnboarding));
})();
