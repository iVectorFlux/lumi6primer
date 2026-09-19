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
    if (!raw || /^stay on\b/i.test(raw)) return "";
    const choice = parseChildChoice(raw);
    return `
            <div class="talk-child-prompt">
              <p class="talk-child-text">${escapeHtml(choice || raw)}</p>
            </div>`;
  }

  const TALK_STARTERS = [
    "Explain to me water cycle",
    "Why is the sky blue",
    "How do plants make food",
    "Why do we have seasons"
  ];

  function talkStarterHtml() {
    return `
            <div class="talk-starter-row">
              ${TALK_STARTERS.map((question) => `
                <button type="button" class="talk-starter" data-talk-starter="${escapeHtml(question)}">${escapeHtml(question)}</button>
              `).join("")}
            </div>`;
  }

  function talkFollowHtml(question, choices) {
    const shortChoices = (Array.isArray(choices) ? choices : [])
      .map((choice, i) => {
        const text = String(typeof choice === "string" ? choice : (choice.text || "")).trim();
        const letter = String((typeof choice === "object" && choice.letter) || String.fromCharCode(97 + i)).toUpperCase();
        return { letter, text };
      })
      .filter((choice) => choice.text && choice.text.length < 42 && !choice.text.includes("?"));
    if (!question && !shortChoices.length) return "";
    return `
          <div class="talk-wonder">
            ${question ? `<p class="talk-follow-question">${escapeHtml(question)}</p>` : ""}
            ${shortChoices.length ? `
              <div class="talk-choice-list" role="list">
                ${shortChoices.map((choice) => `
                  <button type="button" class="talk-choice" role="listitem" data-choice-letter="${escapeHtml(choice.letter)}" data-choice-text="${escapeHtml(choice.text)}">
                    ${escapeHtml(choice.text)}
                  </button>
                `).join("")}
              </div>
            ` : ""}
          </div>`;
  }

  function talkThinkingHtml() {
    return `
          <div class="talk-thinking" aria-live="polite">
            <span class="talk-thinking-dots" aria-hidden="true"><span></span><span></span><span></span></span>
            <p class="talk-wait-hint">Working on this…</p>
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
      `data-href-drawer="${escapeHtml(interactive.hrefDrawer || "")}"`,
      `data-href-desktop="${escapeHtml(interactive.hrefDesktop || "")}"`
    ].join("\n                  ");
  }

  function nativeInteractivePillHtml(interactive, label, subtitle, extraClass = "") {
    const extra = extraClass ? ` ${extraClass}` : "";
    return `
            <div class="talk-interactive-pill-wrapper${extra}" data-interactive-slug="${escapeHtml(interactive.slug)}" ${interactiveMetaAttrs(interactive)}>
              <button type="button" class="talk-interactive-pill" data-expand-interactive title="${escapeHtml(label)}">
                <span class="talk-pill-icon" aria-hidden="true">
                  <svg width="32" height="24" viewBox="0 0 32 24" fill="none">
                    <polygon points="6,20 26,20 6,6" fill="rgba(139,92,246,0.12)" stroke="#8b5cf6" stroke-width="1.8"/>
                    <rect x="6" y="15" width="5" height="5" fill="none" stroke="#94a3b8" stroke-width="1"/>
                  </svg>
                </span>
                <span class="talk-pill-body">
                  <span class="talk-pill-title">${escapeHtml(label)}</span>
                  <span class="talk-pill-sub">${escapeHtml(subtitle)}</span>
                </span>
                <span class="talk-pill-action" aria-hidden="true">
                  <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
                </span>
              </button>
              <div class="talk-interactive-stage" hidden aria-hidden="true"></div>
            </div>`;
  }

  /** Designed HTML pill when the sim has one; compact native pill otherwise. */
  function talkInteractivePillHtml(step, titleText, extraClass = "") {
    const interactive = step.interactive;
    const pill = interactive.pill || {};
    const label = pill.title || interactive.title || titleText;
    const subtitle = pill.subtitle || interactive.concept || interactive.summary || "Tap to explore";
    if (!interactive.scenario && !pill.title) {
      return nativeInteractivePillHtml(interactive, label, subtitle, extraClass);
    }
    const href = interactive.hrefPill || interactive.href || `/api/primer/interactive/${encodeURIComponent(interactive.slug)}?embed=1&mode=pill`;
    const src = href.includes("mode=") ? href : `${href}${href.includes("?") ? "&" : "?"}mode=pill`;
    const extra = extraClass ? ` ${extraClass}` : "";
    return `
            <div class="talk-interactive-pill-wrapper${extra}" data-interactive-slug="${escapeHtml(interactive.slug)}" ${interactiveMetaAttrs(interactive)}>
              <iframe
                class="talk-lesson-pill"
                ${interactiveMetaAttrs(interactive)}
                src="${escapeHtml(src)}"
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
              <img src="${escapeHtml(src)}" alt="${escapeHtml(titleText || "Lesson picture")}" class="talk-lesson-image">
            </div>`;
  }

  function talkVisualHtml(step, titleText, isLast) {
    const hasInteractive = Boolean(step.interactive && step.interactive.slug);
    const image = step.image ? talkImageHtml(step, titleText) : "";
    const interactive = hasInteractive ? talkInteractiveHtml(step, titleText) : "";
    if (image && interactive) {
      return `${image}${interactive}`;
    }
    if (interactive) return interactive;
    if (image) return image;
    if (isLast && window.__primerGraphicLoading) {
      return `<div class="talk-visual-pending talk-visual-pending-quiet"><p class="talk-wait-hint">Finding a picture…</p></div>`;
    }
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
      if (isQuestion) {
        if (question) teaching.push(question);
        question = sentence;
      } else teaching.push(sentence);
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
    return paras.map((para) => `<p>${renderTextbookMarks(para)}</p>`).join("");
  }

  const MARK_STOP = new Set("the a an of to in on and or for is it how does what why me about this that with from into then than they them their there".split(" "));
  const MARK_COLORS = ["yellow", "green", "blue"];
  const KEY_TERM = /\b((?:blue|red|green|sunlight|sun|air|water vapor|water vapour|water|heat|rain|cloud|vapor|vapour|gas|energy|force|gravity|oxygen|carbon dioxide|scattering|scatter|evaporation|condensation|precipitation|photosynthesis|season|cycle|molecule|wavelength|dust|particle)s?(?:\s+[A-Za-z]{3,12}){0,3})\b/gi;

  function pickTextbookMarks(text) {
    const raw = String(text || "");
    const found = [];
    const because = raw.match(/\bbecause\s+([^.]{10,80})/i);
    if (because) found.push(because[1].replace(/[,;:]+$/, "").trim());
    const named = raw.match(/\b(?:called|known as)\s+([^.]{6,48})/i);
    if (named) found.push(named[1].replace(/[,;:]+$/, "").trim());
    let match;
    const termRe = new RegExp(KEY_TERM.source, "gi");
    while ((match = termRe.exec(raw)) && found.length < 6) {
      const phrase = String(match[1] || "").replace(/\s+/g, " ").trim();
      if (phrase.length < 4 || MARK_STOP.has(phrase.toLowerCase())) continue;
      found.push(phrase);
    }
    const unique = [];
    for (const phrase of found.sort((a, b) => b.length - a.length)) {
      const key = phrase.toLowerCase();
      if (unique.some((item) => item.toLowerCase().includes(key) || key.includes(item.toLowerCase()))) continue;
      unique.push(phrase);
      if (unique.length >= 3) break;
    }
    return unique;
  }

  function renderTextbookMarks(text) {
    const raw = String(text || "");
    const marks = pickTextbookMarks(raw);
    if (!marks.length) return escapeHtml(raw);
    const hits = [];
    const lower = raw.toLowerCase();
    marks.forEach((phrase, idx) => {
      const at = lower.indexOf(phrase.toLowerCase());
      if (at < 0) return;
      if (hits.some((hit) => at < hit.end && at + phrase.length > hit.start)) return;
      hits.push({ start: at, end: at + phrase.length, color: MARK_COLORS[idx % MARK_COLORS.length] });
    });
    hits.sort((a, b) => a.start - b.start);
    let html = "";
    let cursor = 0;
    for (const hit of hits) {
      html += escapeHtml(raw.slice(cursor, hit.start));
      html += `<mark class="talk-mark talk-mark-${hit.color}">${escapeHtml(raw.slice(hit.start, hit.end))}</mark>`;
      cursor = hit.end;
    }
    html += escapeHtml(raw.slice(cursor));
    return html;
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
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (window.Lumi6Orb && typeof window.Lumi6Orb.refreshDrawOrb === "function") {
            window.Lumi6Orb.refreshDrawOrb();
          }
        });
      });
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

    const titleText = formatCleanLessonTitle(state.lessonTitle || state.boardTitle || document.querySelector("#currentDocName")?.textContent);
    const hasLesson = turns.some((turn) => turn.role === "teacher" && (String(turn.text || "").trim() || turn.image || turn.interactive));
    if (hasLesson && typeof window.hideTalkWait === "function") window.hideTalkWait();

    if (!turns.length) {
      feed.innerHTML = `
        <div class="talk-empty">
          <p class="talk-empty-title">Ask anything you want to understand.</p>
          <p class="talk-empty-hint">Tap the mic, type a question, or try one of these.</p>
          ${talkStarterHtml()}
        </div>
      `;
      bindTalkStarters(feed);
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
          ${idx === pairs.length - 1 && window.__primerWaiting ? talkThinkingHtml() : ""}
        </article>
        `;
      }

      return `
      <article class="talk-turn-card">
        ${step.asked ? childPromptHtml(step.asked) : ""}
        <div class="talk-lumi6-box${(step.interactive || step.image || (idx === pairs.length - 1 && window.__primerGraphicLoading)) ? " has-visual" : ""}">
          ${titleText ? `
          <div class="talk-lumi6-header">
            <span class="talk-topic-pill">${escapeHtml(titleText)}</span>
          </div>` : ""}

          ${deeperExpl ? `
            <div class="talk-explanation-body">
              ${explanationParagraphs(deeperExpl)}
            </div>
          ` : ""}

          ${talkVisualHtml(step, titleText, idx === pairs.length - 1)}

          ${talkFollowHtml(question, choices)}
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
    const question = last.querySelector(".talk-follow-question")?.textContent?.trim() || "";
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
      img.addEventListener("load", show);
      img.addEventListener("error", show);
      if (img.complete) show();
    });
  }

  function bindTalkStarters(feed) {
    feed.querySelectorAll("[data-talk-starter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const text = String(btn.getAttribute("data-talk-starter") || btn.textContent || "").trim();
        if (!text || !window.primerChat || typeof window.primerChat.sendMessage !== "function") return;
        window.primerChat.sendMessage(text);
      });
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

  function isPhoneViewport() {
    return window.matchMedia("(max-width: 900px), (hover: none) and (pointer: coarse)").matches;
  }

  function isMobileInteractiveView() {
    return isPhoneViewport();
  }

  function playgroundHref(frameOrTrigger, mode) {
    const data = frameOrTrigger?.dataset || {};
    const slug = data.slug || frameOrTrigger?.closest?.("[data-interactive-slug]")?.dataset?.interactiveSlug || "";
    if (!slug) return "";
    const mobile = data.hrefMobile || `/api/primer/interactive/${encodeURIComponent(slug)}?embed=1&mode=mobile`;
    const drawer = data.hrefDrawer || `/api/primer/interactive/${encodeURIComponent(slug)}?embed=1&mode=drawer`;
    const desktop = data.hrefDesktop || `/api/primer/interactive/${encodeURIComponent(slug)}?embed=1&mode=desktop`;
    if (mode === "desktop") return desktop;
    if (mode === "drawer") return drawer;
    return mobile;
  }

  function ensureInteractiveFrame(trigger, mode = "mobile") {
    const wrapper = trigger.closest?.(".talk-interactive-pill-wrapper, .talk-interactive-wrapper") || trigger;
    if (!wrapper) return null;
    const stage = wrapper.querySelector(".talk-interactive-stage") || wrapper;
    let frame = wrapper.querySelector("iframe.talk-lesson-interactive:not(.talk-lesson-pill)");
    const pill = wrapper.querySelector("iframe.talk-lesson-pill");
    const data = { ...wrapper.dataset, ...(pill?.dataset || {}), ...(trigger.dataset || {}) };
    const slug = data.slug || data.interactiveSlug || wrapper.dataset.interactiveSlug || "";
    const label = pill?.getAttribute("title") || trigger.getAttribute?.("title") || trigger.querySelector?.(".talk-pill-title")?.textContent?.trim() || slug;
    if (!frame) {
      frame = document.createElement("iframe");
      frame.className = "talk-lesson-interactive";
      frame.setAttribute("sandbox", "allow-scripts allow-same-origin");
      frame.setAttribute("title", label);
      for (const key of ["slug", "scenario", "subject", "klass", "idea", "concept", "summary", "hrefMobile", "hrefDrawer", "hrefDesktop", "hrefPill"]) {
        if (data[key] != null) frame.dataset[key] = data[key];
      }
      if (slug) frame.dataset.slug = slug;
      stage.appendChild(frame);
    }
    setFrameMode(frame, mode);
    return frame;
  }

  function setFrameMode(frame, mode) {
    if (!frame) return;
    const href = playgroundHref(frame, mode);
    if (href && frame.getAttribute("src") !== href) {
      frame.setAttribute("src", href);
      frame.addEventListener("load", () => {
        applyEmbedLayout(frame, document.body.classList.contains("talk-playground-fullscreen"));
        sizePlaygroundFrame(frame);
        nudgeInteractive(frame);
      }, { once: true });
    } else {
      nudgeInteractive(frame);
    }
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
      frame.style.height = `${Math.max(72, Math.min(height, 80))}px`;
      return;
    }
    const inPlayground = Boolean(frame.closest("#talkPlaygroundStage"));
    if (inPlayground) {
      sizePlaygroundFrame(frame);
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
      if (document.body.classList.contains("talk-playground-open")) return;
      const pills = [...document.querySelectorAll("iframe.talk-lesson-pill")];
      const bySource = pills.find((pill) => {
        try { return pill.contentWindow === event.source; } catch { return false; }
      });
      const bySlug = data.slug
        ? pills.find((pill) => pill.dataset.slug === data.slug)
        : null;
      const wrapper = bySource?.closest(".talk-interactive-pill-wrapper")
        || document.querySelector(`.talk-interactive-pill-wrapper[data-interactive-slug="${CSS.escape(data.slug || "")}"]`)
        || bySlug?.closest(".talk-interactive-pill-wrapper");
      const trigger = wrapper?.querySelector("iframe.talk-lesson-pill") || wrapper;
      if (trigger) {
        const frame = ensureInteractiveFrame(trigger, isPhoneViewport() ? "drawer" : "desktop");
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
    const phone = isPhoneViewport();
    document.body.classList.toggle("talk-playground-mobile", phone);
    document.body.classList.toggle("talk-playground-desktop-view", !phone);
    document.body.classList.remove("talk-playground-fullscreen");
    document.body.classList.add("talk-playground-open");
    setFrameMode(frame, phone ? "drawer" : "desktop");
    syncPlaygroundExpandLabel();
    if (typeof window.hideTalkWait === "function") window.hideTalkWait();
    const afterLoad = () => {
      applyEmbedLayout(frame, false);
      sizePlaygroundFrame(frame);
      nudgeInteractive(frame);
      setTimeout(() => nudgeInteractive(frame), 200);
      setTimeout(() => nudgeInteractive(frame), 700);
    };
    frame.addEventListener("load", afterLoad, { once: true });
    requestAnimationFrame(() => afterLoad());
  }

  function sizePlaygroundFrame(frame) {
    if (!frame) return;
    const scale = document.querySelector(".talk-playground-scale");
    const scroll = document.getElementById("talkPlaygroundScroll");
    const stage = document.getElementById("talkPlaygroundStage");
    const lock = (el, width, height) => {
      if (!el) return;
      el.style.setProperty("width", width, "important");
      el.style.setProperty("height", height, "important");
      el.style.setProperty("max-width", width, "important");
      el.style.setProperty("max-height", height, "important");
      el.style.setProperty("min-height", height === "100%" ? "0" : height, "important");
      el.style.setProperty("flex", height === "100%" ? "1 1 auto" : "none", "important");
    };
    if (document.body.classList.contains("talk-playground-desktop-view")) {
      lock(scale, "880px", "490px");
      lock(scroll, "880px", "490px");
      lock(stage, "880px", "490px");
      lock(frame, "880px", "490px");
      scaleDesktopPlayground();
      return;
    }
    lock(scale, "100%", "100%");
    lock(scroll, "100%", "100%");
    lock(stage, "100%", "100%");
    lock(frame, "100%", "100%");
    scaleDesktopPlayground();
  }

  function scaleDesktopPlayground() {
    const host = document.querySelector(".talk-playground-scale");
    if (!host) return;
    if (!document.body.classList.contains("talk-playground-desktop-view")) {
      host.style.transform = "";
      return;
    }
    const scale = Math.min(1, (window.innerWidth - 48) / 880, (window.innerHeight - 96) / 490);
    host.style.transformOrigin = "center center";
    host.style.transform = scale < 0.995 ? `scale(${scale})` : "";
  }

  function applyEmbedLayout(frame, full) {
    try {
      frame?.contentWindow?.document.documentElement.classList.toggle("lumi-full", Boolean(full));
    } catch {}
  }

  function syncPlaygroundExpandLabel() {
    const btn = document.getElementById("talkPlaygroundExpand");
    if (!btn) return;
    const enlarged = document.body.classList.contains("talk-playground-fullscreen");
    btn.hidden = !isPhoneViewport();
    const label = enlarged ? "Drawer" : "Full screen";
    btn.setAttribute("aria-label", enlarged ? "Back to drawer" : "Go full screen");
    btn.setAttribute("title", enlarged ? "Back to drawer" : "Go full screen");
    const text = btn.querySelector(".talk-playground-expand-label");
    if (text) text.textContent = label;
    btn.classList.toggle("is-enlarged", enlarged);
  }

  function setPlaygroundFullscreen(full) {
    const frame = document.querySelector("#talkPlaygroundStage iframe.talk-lesson-interactive");
    if (!full) {
      document.body.classList.remove("talk-playground-fullscreen", "talk-playground-desktop-view");
      document.body.classList.toggle("talk-playground-mobile", isPhoneViewport());
      applyEmbedLayout(frame, false);
      setFrameMode(frame, isPhoneViewport() ? "drawer" : "desktop");
      syncPlaygroundExpandLabel();
      sizePlaygroundFrame(frame);
      return;
    }
    if (isPhoneViewport()) {
      document.body.classList.add("talk-playground-fullscreen");
      document.body.classList.remove("talk-playground-desktop-view");
      applyEmbedLayout(frame, true);
      setFrameMode(frame, "mobile");
    } else {
      document.body.classList.add("talk-playground-desktop-view");
      document.body.classList.remove("talk-playground-fullscreen", "talk-playground-mobile");
      applyEmbedLayout(frame, false);
      setFrameMode(frame, "desktop");
    }
    syncPlaygroundExpandLabel();
    sizePlaygroundFrame(frame);
    nudgeInteractive(frame);
  }

  /** Ask the embed to re-measure after it changes container. */
  function nudgeInteractive(frame) {
    if (!frame) return;
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
      frame.style.maxWidth = "";
      frame.style.maxHeight = "";
      frame.style.minHeight = "";
      frame.style.flex = "";
      home.prepend(frame);
      delete home.dataset.playgroundHome;
      nudgeInteractive(frame);
    }
    [".talk-playground-scale", "#talkPlaygroundScroll", "#talkPlaygroundStage"].forEach((sel) => {
      const el = document.querySelector(sel);
      if (!el) return;
      el.style.width = "";
      el.style.height = "";
      el.style.maxWidth = "";
      el.style.maxHeight = "";
      el.style.minHeight = "";
      el.style.flex = "";
    });
    if (sheet) sheet.hidden = true;
    if (header) header.hidden = true;
    if (notes) notes.innerHTML = "";
    document.body.classList.remove("talk-playground-open", "talk-playground-scenario", "talk-playground-mobile", "talk-playground-fullscreen", "talk-playground-desktop-view");
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
            ${rows.map((interactive) => {
              const pill = interactive.pill || {};
              const label = pill.title || interactive.title || interactive.slug;
              const subtitle = pill.subtitle || interactive.concept || interactive.summary || "Tap to explore";
              return nativeInteractivePillHtml(interactive, label, subtitle, "sim-pill-item");
            }).join("")}
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
      bindTalkPlayground(feed);
    } catch {
      feed.innerHTML = `<p class="sim-feed-status">Could not load interactives. Try again.</p>`;
    }
  }

  window.addEventListener("resize", () => {
    if (document.body.classList.contains("talk-playground-desktop-view")) scaleDesktopPlayground();
    growTalkComposer();
  });

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
  document.getElementById("talkPlaygroundExpand")?.addEventListener("click", () => {
    const expanded = document.body.classList.contains("talk-playground-fullscreen");
    setPlaygroundFullscreen(!expanded);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && document.body.classList.contains("talk-playground-open")) {
      closeTalkPlayground();
    }
  });

  function growTalkComposer() {
    const input = document.getElementById("talkModeTextInput");
    if (!input) return;
    syncTalkPlaceholder();
    if (!String(input.value || "").trim()) {
      input.style.height = "";
      input.classList.remove("is-multiline");
      return;
    }
    input.style.height = "auto";
    const next = Math.min(Math.max(input.scrollHeight, 22), 160);
    input.style.height = `${next}px`;
    input.classList.toggle("is-multiline", next > 32);
  }

  function syncTalkPlaceholder() {
    const input = document.getElementById("talkModeTextInput");
    if (!input) return;
    input.placeholder = window.matchMedia("(max-width: 900px)").matches
      ? "Ask a question…"
      : "Ask a question or share a thought…";
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
    if (window.primerVoice && typeof window.primerVoice.stopDictation === "function") {
      window.primerVoice.stopDictation();
    }
    input.value = "";
    growTalkComposer();
    if (window.primerChat && typeof window.primerChat.sendMessage === "function") {
      window.primerChat.sendMessage(val);
    }
  });

  const talkComposer = document.querySelector("#talkModeTextInput");
  growTalkComposer();
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
