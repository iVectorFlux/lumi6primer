/**
 * Kid-readable lesson PDF & interactive web learning document.
 * Curates conversation, first-principles explanations, diagrams, and thinking questions.
 */
(function () {
  "use strict";

  const turns = [];

  function normalizeText(t) {
    return String(t || "").toLowerCase().replace(/[^a-z0-9]/g, "").trim();
  }

  function record(role, text) {
    const spoken = String(text || "").replace(/\s+/g, " ").trim();
    if (!spoken) return;
    const cleanRole = role === "student" ? "student" : "teacher";
    const norm = normalizeText(spoken);
    if (!norm) return;

    for (let i = turns.length - 1; i >= Math.max(0, turns.length - 3); i--) {
      if (turns[i].role === cleanRole) {
        if (!turns[i].text && turns[i].image) {
          turns[i].text = spoken;
          try {
            sessionStorage.setItem("lumi6_lesson_turns", JSON.stringify(turns.slice(-30)));
          } catch {}
          if (typeof window.syncTalkModeFeed === "function") window.syncTalkModeFeed();
          return;
        }
        const existingNorm = normalizeText(turns[i].text);
        if (existingNorm === norm || (existingNorm.length > 20 && (existingNorm.includes(norm) || norm.includes(existingNorm)))) {
          if (spoken.length > (turns[i].text || "").length) {
            turns[i].text = spoken;
          }
          if (typeof window.syncTalkModeFeed === "function") window.syncTalkModeFeed();
          return;
        }
      }
    }

    turns.push({ role: cleanRole, text: spoken, image: "" });
    try {
      sessionStorage.setItem("lumi6_lesson_turns", JSON.stringify(turns.slice(-30)));
    } catch {}
    if (typeof window.syncTalkModeFeed === "function") window.syncTalkModeFeed();
  }

  function attachImage(href) {
    const url = String(href || "").trim();
    if (!url) return;
    for (let i = turns.length - 1; i >= 0; i -= 1) {
      if (turns[i].role === "teacher") {
        turns[i].image = url;
        try {
          sessionStorage.setItem("lumi6_lesson_turns", JSON.stringify(turns.slice(-30)));
        } catch {}
        if (typeof window.syncTalkModeFeed === "function") window.syncTalkModeFeed();
        return;
      }
    }
    turns.push({ role: "teacher", text: "", image: url });
    try {
      sessionStorage.setItem("lumi6_lesson_turns", JSON.stringify(turns.slice(-30)));
    } catch {}
    if (typeof window.syncTalkModeFeed === "function") window.syncTalkModeFeed();
  }

  function turnsFromChat() {
    // 1. In-memory turns array
    if (turns.length > 0) return turns.slice();

    // 2. SessionStorage restore
    try {
      const stored = sessionStorage.getItem("lumi6_lesson_turns");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}

    // 3. Talk Mode DOM Feed
    const talkCards = document.querySelectorAll("#talkFeed .talk-turn-card");
    if (talkCards.length > 0) {
      const fromTalk = [];
      talkCards.forEach((card) => {
        const asked = card.querySelector(".talk-child-text")?.textContent?.trim();
        if (asked) fromTalk.push({ role: "student", text: asked, image: "" });

        const explanation = Array.from(card.querySelectorAll(".talk-explanation-body p"))
          .map((p) => p.textContent.trim())
          .filter(Boolean)
          .join(" ");
        const question = card.querySelector(".talk-question-text")?.textContent?.trim();
        const img = card.querySelector(".talk-lesson-image")?.getAttribute("src") || "";

        const teacherText = [explanation, question ? `Think About It: ${question}` : ""].filter(Boolean).join("\n\n");
        if (teacherText || img) {
          fromTalk.push({ role: "teacher", text: teacherText, image: img });
        }
      });
      if (fromTalk.length > 0) return fromTalk;
    }

    // 4. Whiteboard Chat DOM
    const nodes = document.querySelectorAll("#atlasMessages .atlas-msg");
    if (nodes.length > 0) {
      const fromDom = [];
      nodes.forEach((el) => {
        const role = el.classList.contains("student") ? "student" : "teacher";
        const text = String(el.querySelector(".atlas-msg-bubble")?.textContent || "").trim();
        const image = el.dataset.image || "";
        if (!text && !image) return;
        if (/what concept would you like to explore|ask me something you want to understand/i.test(text)) return;
        fromDom.push({ role, text, image });
      });
      if (fromDom.length > 0) return fromDom;
    }

    return [];
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function toDataUrl(href) {
    if (!href) return "";
    if (/^data:/i.test(href)) return href;
    try {
      const response = await fetch(href, { credentials: "same-origin" });
      if (!response.ok) return href;
      const blob = await response.blob();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || href));
        reader.onerror = () => resolve(href);
        reader.readAsDataURL(blob);
      });
    } catch {
      return href;
    }
  }

  function pairSteps(items) {
    const steps = [];
    let current = null;
    items.forEach((item) => {
      if (item.role === "student") {
        if (current) steps.push(current);
        current = { asked: item.text || "", answers: [], images: [] };
        return;
      }
      if (!current) current = { asked: "", answers: [], images: [] };
      if (item.text) current.answers.push(item.text);
      if (item.image) current.images.push(item.image);
    });
    if (current) steps.push(current);
    return steps.filter((step) => step.asked || step.answers.length || step.images.length);
  }

  function crispTitle(steps, child) {
    const asked = steps.find((step) => step.asked)?.asked || "";
    let topic = asked
      .replace(/\s+/g, " ")
      .replace(/^(hey|hi|hello|please|can you|could you|would you)\b[,!. ]*/gi, "")
      .replace(/^(teach me|tell me about|tell me|explain|what is|what's|whats|how does|how do|how to)\b[,!. ]*/gi, "")
      .replace(/[?.!]+$/g, "")
      .trim();
    if (!topic || topic.length < 3) {
      return child ? `${child}'s Discovery Journey` : "Science Discovery Journey";
    }
    const words = topic.split(" ");
    if (words.length > 8) topic = words.slice(0, 8).join(" ");
    if (topic.length > 56) topic = `${topic.slice(0, 53).trim()}…`;
    return topic.charAt(0).toUpperCase() + topic.slice(1);
  }

  function readableParagraphs(text) {
    const chunks = String(text || "")
      .split(/\n{2,}/)
      .map((chunk) => chunk.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    const paras = [];
    chunks.forEach((chunk) => {
      const sentences = chunk.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [chunk];
      let buffer = "";
      sentences.forEach((sentence) => {
        const next = `${buffer} ${sentence}`.trim();
        if (next.length > 220 && buffer) {
          paras.push(buffer);
          buffer = sentence.trim();
        } else {
          buffer = next;
        }
      });
      if (buffer) paras.push(buffer);
    });
    return paras.length ? paras : [];
  }

  function stepsHtml(steps, boardPng) {
    if (!steps.length) {
      if (boardPng) return "";
      return `<p class="empty">This lesson does not have conversation turns yet. Ask Lumi6 a question or talk via voice, then download again.</p>`;
    }
    return steps.map((step, index) => {
      const asked = step.asked
        ? `<div class="ask-card">
            <div class="card-meta">
              <span class="role-pill you">You Asked</span>
            </div>
            <p class="ask-text">${escapeHtml(step.asked)}</p>
          </div>`
        : "";

      const rawAnswer = step.answers.join(" ");
      const sentences = rawAnswer.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
      const questionSentence = sentences.find((s) => s.endsWith("?") || /^(what|how|why|can you|where|do you think|if you)\b/i.test(s));
      const explanationSentences = sentences.filter((s) => s !== questionSentence);

      const answerParas = readableParagraphs(explanationSentences.join(" "));
      const answered = answerParas.length
        ? `<div class="answer-card">
            <div class="card-meta">
              <span class="role-pill lumi">Lumi6 Explanation</span>
            </div>
            <div class="answer-body">
              ${answerParas.map((para) => `<p>${escapeHtml(para)}</p>`).join("")}
            </div>
          </div>`
        : "";

      const questionHtml = questionSentence
        ? `<div class="question-capsule">
            <div class="question-icon">?</div>
            <div class="question-content">
              <span class="question-tag">Think About It</span>
              <p class="question-text">${escapeHtml(questionSentence)}</p>
            </div>
          </div>`
        : "";

      const pictures = step.images.map((src, picIndex) =>
        `<figure class="picture">
          <img src="${escapeHtml(src)}" alt="Lesson illustration" loading="eager">
          <figcaption>${step.images.length > 1 ? `Figure ${index + 1}.${picIndex + 1} — Visual concept` : `Figure ${index + 1} — Visual concept`}</figcaption>
        </figure>`
      ).join("");

      return `<section class="step-card">
        <div class="chapter-badge">Chapter ${index + 1}</div>
        ${asked}
        ${answered}
        ${pictures}
        ${questionHtml}
      </section>`;
    }).join("");
  }

  function boardHtml(boardPng) {
    if (!boardPng) return "";
    return `<section class="step-card board-step">
      <div class="chapter-badge">Interactive Canvas</div>
      <h2 class="board-heading">Your Whiteboard Sketches & Notes</h2>
      <figure class="picture">
        <img src="${escapeHtml(boardPng)}" alt="The whiteboard">
        <figcaption>Your whiteboard workspace</figcaption>
      </figure>
    </section>`;
  }

  async function captureBoardPng() {
    try {
      if (typeof window.LUMI6_CANVAS_ADAPTER?.captureLessonBoardPng === "function") {
        return await window.LUMI6_CANVAS_ADAPTER.captureLessonBoardPng() || "";
      }
      if (typeof window.LUMI6_CANVAS_ADAPTER?.captureBoardImage === "function") {
        return window.LUMI6_CANVAS_ADAPTER.captureBoardImage() || "";
      }
    } catch {}
    return "";
  }

  function cleanConceptTitle(raw) {
    if (!raw) return "";
    let clean = String(raw)
      .replace(/\s+/g, " ")
      .replace(/^(hey|hi|hello|please|can you|could you|would you)\b[,!. ]*/gi, "")
      .replace(/^(teach me|tell me about|tell me|explain|what is|what's|whats|how does|how do|how to|i want to learn about)\b[,!. ]*/gi, "")
      .replace(/[?.!]+$/g, "")
      .trim();

    const words = clean.split(" ");
    const deduped = [];
    words.forEach((w) => {
      if (deduped.length === 0 || deduped[deduped.length - 1].toLowerCase() !== w.toLowerCase()) {
        deduped.push(w);
      }
    });
    clean = deduped.join(" ");

    clean = clean.replace(/\bdarvin\b/gi, "Darwin");
    clean = clean.replace(/\btarzan theory\b/gi, "Theory of Evolution");

    if (words.length > 7) clean = words.slice(0, 7).join(" ");
    if (clean.length > 60) clean = `${clean.slice(0, 57).trim()}…`;
    if (!clean) return "Exploration & Discovery";

    return clean
      .split(" ")
      .map((w) => (w.length > 2 || w.toLowerCase() === "ai" ? w.charAt(0).toUpperCase() + w.slice(1) : w.toLowerCase()))
      .join(" ");
  }

  function recapHtml(steps) {
    const topics = steps.map((step) => cleanConceptTitle(step.asked)).filter(Boolean);
    const uniqueTopics = [...new Set(topics)];
    if (!uniqueTopics.length) return "";
    return `<section class="recap-card">
      <div class="chapter-badge">Thinking Profile & Discoveries</div>
      <h2>Core Concepts Discovered</h2>
      <ol>${uniqueTopics.map((topic) => `<li>${escapeHtml(topic)}</li>`).join("")}</ol>
      <div style="margin-top: 18px; padding-top: 14px; border-top: 1px solid #e2e8f0;">
        <h3 style="margin: 0 0 8px; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: var(--violet);">Thinking Capabilities Practiced</h3>
        <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px;">
          <span style="background: #ede9fe; color: #6d28d9; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700;">✦ Hypothesis Generation</span>
          <span style="background: #ede9fe; color: #6d28d9; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700;">✦ Causal Reasoning</span>
          <span style="background: #ede9fe; color: #6d28d9; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700;">✦ Far Transfer Application</span>
          <span style="background: #ede9fe; color: #6d28d9; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700;">✦ Independent Teach-Back</span>
        </div>
      </div>
    </section>`;
  }

  async function waitForImages(doc) {
    const imgs = Array.from(doc.images || []);
    await Promise.all(imgs.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });
    }));
  }

  async function buildLessonPdfData() {
    const raw = turnsFromChat();
    const items = await Promise.all(raw.map(async (item) => ({
      ...item,
      image: await toDataUrl(item.image)
    })));
    const steps = pairSteps(items);
    const boardPng = await captureBoardPng();
    const child = String(localStorage.getItem("primerChildName") || "Learner").trim() || "Learner";
    const title = steps.some((step) => step.asked)
      ? crispTitle(steps, child)
      : (boardPng ? `${child}'s Whiteboard` : `${child}'s Lesson`);
    const when = new Date().toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric"
    });

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)} — Lumi6 Learning Document</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Caveat:wght@700&display=swap" rel="stylesheet">
<style>
  :root {
    --ink: #0f172a;
    --slate: #475569;
    --violet: #7c3aed;
    --violet-dark: #6d28d9;
    --purple-light: #f5f3ff;
    --purple-border: #ddd6fe;
    --card-bg: #ffffff;
    --page-bg: #f8fafc;
    --line: rgba(124, 58, 237, 0.12);
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    color: var(--ink);
    font-family: "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: var(--page-bg);
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .web-toolbar {
    position: sticky;
    top: 0;
    z-index: 100;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid #e2e8f0;
    padding: 12px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 4px 20px rgba(0,0,0,0.04);
  }
  .toolbar-brand {
    font-weight: 800;
    font-size: 16px;
    color: var(--violet);
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .toolbar-actions {
    display: flex;
    gap: 12px;
  }
  .btn {
    appearance: none;
    border: none;
    cursor: pointer;
    font-family: inherit;
    font-size: 13px;
    font-weight: 700;
    padding: 8px 18px;
    border-radius: 999px;
    transition: all 0.15s ease;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .btn-primary {
    background: linear-gradient(135deg, #8b5cf6, #6d28d9);
    color: #ffffff;
    box-shadow: 0 4px 12px rgba(109, 40, 217, 0.25);
  }
  .btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(109, 40, 217, 0.35);
  }
  .btn-secondary {
    background: #ede9fe;
    color: #5b21b6;
  }
  .page {
    max-width: 820px;
    margin: 0 auto;
    padding: 40px 32px 64px;
  }
  .hero-header {
    background: linear-gradient(135deg, #ffffff 0%, #f5f3ff 100%);
    border: 1px solid var(--purple-border);
    border-radius: 24px;
    padding: 36px 36px 28px;
    margin-bottom: 32px;
    box-shadow: 0 10px 30px rgba(109, 40, 217, 0.06);
    page-break-inside: avoid;
  }
  .hero-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #ede9fe;
    color: #6d28d9;
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 5px 14px;
    border-radius: 999px;
    margin-bottom: 12px;
  }
  .hero-title {
    margin: 0 0 10px;
    font-size: 32px;
    font-weight: 800;
    color: var(--ink);
    line-height: 1.2;
    letter-spacing: -0.02em;
  }
  .hero-meta {
    font-size: 14px;
    color: var(--slate);
    display: flex;
    align-items: center;
    gap: 12px;
    font-weight: 500;
  }
  .step-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 22px;
    padding: 26px 28px;
    margin-bottom: 28px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
    page-break-inside: avoid;
  }
  .chapter-badge {
    display: inline-block;
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--violet);
    background: #f5f3ff;
    border: 1px solid #ddd6fe;
    padding: 3px 10px;
    border-radius: 8px;
    margin-bottom: 16px;
  }
  .ask-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-left: 4px solid #8b5cf6;
    border-radius: 14px;
    padding: 14px 18px;
    margin-bottom: 16px;
  }
  .card-meta {
    margin-bottom: 6px;
  }
  .role-pill {
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 2px 8px;
    border-radius: 6px;
  }
  .role-pill.you {
    background: #e2e8f0;
    color: #334155;
  }
  .role-pill.lumi {
    background: #ede9fe;
    color: #6d28d9;
  }
  .ask-text {
    margin: 0;
    font-size: 17px;
    font-weight: 700;
    color: #1e293b;
    line-height: 1.4;
  }
  .answer-card {
    background: #ffffff;
    border: 1px solid #f1f5f9;
    border-radius: 16px;
    padding: 18px 20px;
    margin-bottom: 16px;
  }
  .answer-body p {
    margin: 0 0 12px;
    font-size: 15.5px;
    line-height: 1.65;
    color: #334155;
  }
  .answer-body p:last-child {
    margin-bottom: 0;
  }
  .picture {
    margin: 18px 0;
    padding: 12px;
    border-radius: 18px;
    background: #fafafa;
    border: 1px solid #e2e8f0;
    text-align: center;
    page-break-inside: avoid;
  }
  .picture img {
    max-width: 100%;
    max-height: 380px;
    border-radius: 12px;
    display: block;
    margin: 0 auto;
    object-fit: contain;
  }
  .picture figcaption {
    margin-top: 10px;
    font-size: 12px;
    font-weight: 700;
    color: #64748b;
  }
  .question-capsule {
    margin-top: 18px;
    padding: 16px 18px;
    border-radius: 16px;
    background: linear-gradient(135deg, #fdf4ff 0%, #fae8ff 100%);
    border: 1px solid #f0abfc;
    display: flex;
    gap: 14px;
    align-items: flex-start;
  }
  .question-icon {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #d946ef;
    color: #ffffff;
    font-weight: 800;
    font-size: 15px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 2px;
  }
  .question-content {
    flex: 1;
  }
  .question-tag {
    display: block;
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #a21caf;
    margin-bottom: 4px;
  }
  .question-text {
    margin: 0;
    font-size: 15.5px;
    font-weight: 700;
    color: #701a75;
    line-height: 1.45;
  }
  .recap-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 22px;
    padding: 26px 28px;
    margin-top: 32px;
    page-break-inside: avoid;
  }
  .recap-card h2 {
    margin: 0 0 14px;
    font-size: 20px;
    font-weight: 800;
    color: var(--ink);
  }
  .recap-card ol {
    margin: 0;
    padding-left: 24px;
    color: var(--slate);
    font-size: 15px;
    line-height: 1.7;
    font-weight: 500;
  }
  .board-heading {
    margin: 0 0 14px;
    font-size: 18px;
    font-weight: 800;
    color: var(--ink);
  }
  .empty {
    padding: 32px;
    text-align: center;
    color: #64748b;
    font-style: italic;
  }
  .love-footer {
    margin-top: 48px;
    text-align: center;
    font-size: 13px;
    font-weight: 700;
    color: var(--violet);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }
  .heart {
    color: #ef4444;
    font-size: 16px;
  }
  @media print {
    .no-print { display: none !important; }
    body { background: #ffffff; }
    .page { max-width: 100%; padding: 0; }
    .hero-header, .step-card, .recap-card { box-shadow: none; border-color: #cbd5e1; }
  }
</style>
</head>
<body>
  <div class="web-toolbar no-print">
    <div class="toolbar-brand">
      <span>✦</span>
      <span>Lumi6 Learning Journey</span>
    </div>
    <div class="toolbar-actions">
      <button onclick="window.print()" class="btn btn-primary" type="button">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><path d="M6 14h12v8H6z"/></svg>
        <span>Save as PDF / Print</span>
      </button>
      <button onclick="window.close()" class="btn btn-secondary" type="button">Close</button>
    </div>
  </div>

  <article class="page">
    <header class="hero-header">
      <div class="hero-pill">✦ Interactive Learning Chapter</div>
      <h1 class="hero-title">${escapeHtml(title)}</h1>
      <div class="hero-meta">
        <span>Learner: <strong>${escapeHtml(child)}</strong></span>
        <span>•</span>
        <span>${escapeHtml(when)}</span>
        <span>•</span>
        <span>${steps.length} ${steps.length === 1 ? "Chapter" : "Chapters"} Explored</span>
      </div>
    </header>

    ${boardHtml(boardPng)}
    ${stepsHtml(steps, boardPng)}
    ${recapHtml(steps)}

    <div class="love-footer">
      <span>Made with love</span>
      <span class="heart" aria-hidden="true">♥</span>
      <span>by Lumi6 AI Thinking Tutor</span>
    </div>
  </article>
</body>
</html>`;

    return { html, title, child, steps };
  }

  async function generateLessonPdfBlob() {
    const data = await buildLessonPdfData();
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.left = "-9999px";
    container.style.top = "0";
    container.style.width = "780px";
    container.style.background = "#ffffff";
    container.innerHTML = data.html;
    document.body.appendChild(container);

    try {
      if (window.html2pdf) {
        const cleanName = (data.title || "Lumi6_Lesson").replace(/[^a-zA-Z0-9_-]/g, "_");
        const opt = {
          margin: [8, 8, 8, 8],
          filename: `${cleanName}.pdf`,
          image: { type: "jpeg", quality: 0.95 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
        };
        const blob = await window.html2pdf().set(opt).from(container).outputPdf("blob");
        return { blob, title: data.title, filename: `${cleanName}.pdf` };
      }
    } catch (err) {
      console.warn("[PDF] html2pdf generation error:", err);
    } finally {
      container.remove();
    }
    return { blob: null, title: data.title, filename: `${(data.title || "Lumi6_Lesson").replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf` };
  }

  async function exportLessonPdf() {
    const btn = document.getElementById("exportPngBtn");
    if (btn) btn.disabled = true;
    try {
      const { html } = await buildLessonPdfData();
      const win = window.open("", "_blank");
      if (!win) {
        // Fallback if popup blocked
        const { blob, filename } = await generateLessonPdfBlob();
        if (blob) {
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
        } else {
          window.alert("Please allow pop-ups to open the lesson document and download the PDF.");
        }
        return;
      }
      win.document.open();
      win.document.write(html);
      win.document.close();

      let printed = false;
      const printOnce = async () => {
        if (printed) return;
        printed = true;
        try {
          await waitForImages(win.document);
          win.focus();
        } catch {}
      };
      if (win.document.readyState === "complete") setTimeout(printOnce, 250);
      else win.addEventListener("load", () => setTimeout(printOnce, 250), { once: true });
    } catch (err) {
      window.alert(err.message || "Could not generate the lesson PDF.");
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async function shareLessonOnWhatsApp() {
    const btn = document.getElementById("shareWhatsAppBtn");
    if (btn) btn.disabled = true;
    try {
      const { title } = await buildLessonPdfData();
      const cleanTitle = title || "Lesson";
      const shareText = `Check out what we explored on Lumi6 today: ${cleanTitle}!`;
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, "_blank");
    } catch (err) {
      window.alert("Could not open WhatsApp sharing.");
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function clear() {
    turns.length = 0;
    try {
      sessionStorage.removeItem("lumi6_lesson_turns");
      localStorage.removeItem("lumi6_lesson_turns");
    } catch {}
    const feed = document.getElementById("talkFeed");
    if (feed) feed.replaceChildren();
    if (typeof window.syncTalkModeFeed === "function") {
      window.syncTalkModeFeed();
    }
  }

  window.Lumi6Lesson = { record, attachImage, turns: turnsFromChat, clear };
  window.exportLessonPdf = exportLessonPdf;
  window.generateLessonPdfBlob = generateLessonPdfBlob;
  window.shareLessonOnWhatsApp = shareLessonOnWhatsApp;
})();
