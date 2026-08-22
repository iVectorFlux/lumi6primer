/**
 * Kid-readable lesson PDF: title, You asked / Lumi6 answered, pictures.
 */
(function () {
  "use strict";

  const turns = [];

  function record(role, text) {
    const spoken = String(text || "").replace(/\s+/g, " ").trim();
    if (!spoken) return;
    const last = turns[turns.length - 1];
    if (last && last.role === role && last.text === spoken) return;
    turns.push({ role: role === "student" ? "student" : "teacher", text: spoken, image: "" });
  }

  function attachImage(href) {
    const url = String(href || "").trim();
    if (!url) return;
    for (let i = turns.length - 1; i >= 0; i -= 1) {
      if (turns[i].role === "teacher") {
        if (!turns[i].image) turns[i].image = url;
        return;
      }
    }
    turns.push({ role: "teacher", text: "", image: url });
  }

  function turnsFromChat() {
    const nodes = document.querySelectorAll("#atlasMessages .atlas-msg");
    if (!nodes.length) return turns.slice();
    const fromDom = [];
    nodes.forEach((el) => {
      const role = el.classList.contains("student") ? "student" : "teacher";
      const text = String(el.querySelector(".atlas-msg-bubble")?.textContent || "").trim();
      const image = el.dataset.image || "";
      if (!text && !image) return;
      if (/what concept would you like to explore|ask me something you want to understand/i.test(text)) return;
      fromDom.push({ role, text, image });
    });
    fromDom.forEach((item, index) => {
      if (!item.image && turns[index]?.image) item.image = turns[index].image;
    });
    return fromDom.length ? fromDom : turns.slice();
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
      return child ? `${child}'s Lesson` : "Today's Lesson";
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
      return `<p class="empty">This board does not have a lesson yet. Draw or ask Lumi6 something, then download again.</p>`;
    }
    return steps.map((step, index) => {
      const asked = step.asked
        ? `<div class="ask-card">
            <p class="label">You asked</p>
            <p class="ask-text">${escapeHtml(step.asked)}</p>
          </div>`
        : "";
      const answerParas = readableParagraphs(step.answers.join(" "));
      const answered = answerParas.length
        ? `<div class="answer-card">
            <p class="label">Lumi6 answered</p>
            ${answerParas.map((para) => `<p>${escapeHtml(para)}</p>`).join("")}
          </div>`
        : "";
      const pictures = step.images.map((src, picIndex) =>
        `<figure class="picture">
          <img src="${escapeHtml(src)}" alt="">
          <figcaption>${step.images.length > 1 ? `Look at this · picture ${picIndex + 1}` : "Look at this"}</figcaption>
        </figure>`
      ).join("");
      return `<section class="step">
        <p class="step-kicker">Step ${index + 1}</p>
        ${asked}
        ${answered}
        ${pictures}
      </section>`;
    }).join("");
  }

  function boardHtml(boardPng) {
    if (!boardPng) return "";
    return `<section class="step board-step">
      <p class="step-kicker">Your board</p>
      <h2 class="board-heading">What you drew</h2>
      <figure class="picture">
        <img src="${escapeHtml(boardPng)}" alt="The whiteboard">
        <figcaption>Your sketch on the board</figcaption>
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
  function recapHtml(steps) {
    const topics = steps.map((step) => step.asked).filter(Boolean);
    if (topics.length < 2) return "";
    return `<section class="recap">
      <p class="step-kicker">Remember</p>
      <h2>What you asked today</h2>
      <ol>${topics.map((topic) => `<li>${escapeHtml(topic)}</li>`).join("")}</ol>
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

  async function exportLessonPdf() {
    const btn = document.getElementById("exportPngBtn");
    if (btn) btn.disabled = true;
    try {
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
        : (boardPng ? `${child}'s board` : `${child}'s Lesson`);
      const when = new Date().toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric"
      });
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)} — Lumi6</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Patrick+Hand&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  :root {
    --ink: #2e1065;
    --violet: #6d28d9;
    --deep: #4c1d95;
    --chip: #7c3aed;
    --wash: #f6f3ff;
    --lilac: #f5f3ff;
    --line: rgba(109, 40, 217, 0.12);
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background:
      radial-gradient(circle at 18% 8%, rgba(196, 181, 253, 0.55), transparent 42%),
      radial-gradient(circle at 88% 92%, rgba(125, 211, 252, 0.35), transparent 38%),
      var(--wash);
    color: var(--ink);
    font-family: Inter, system-ui, sans-serif;
  }
  .page {
    max-width: 720px;
    margin: 0 auto;
    padding: 40px 32px 56px;
  }
  .hero {
    padding: 22px 24px 18px;
    border: 1px solid var(--line);
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.92);
    box-shadow: 0 18px 50px rgba(76, 29, 149, 0.12);
    margin-bottom: 28px;
  }
  .kicker {
    margin: 0 0 6px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--violet);
  }
  h1 {
    margin: 0 0 8px;
    font-family: "Patrick Hand", "Segoe Print", "Comic Sans MS", cursive;
    font-size: 42px;
    line-height: 1.1;
    font-weight: 700;
    color: var(--ink);
  }
  .lede {
    margin: 0;
    color: #5b21b6;
    font-size: 15px;
    font-weight: 600;
  }
  .step {
    margin: 0 0 22px;
    padding: 18px 18px 16px;
    border: 1px solid var(--line);
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.92);
    page-break-inside: avoid;
  }
  .step-kicker {
    margin: 0 0 12px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--chip);
  }
  .label {
    margin: 0 0 4px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--violet);
  }
  .ask-card {
    margin: 0 0 12px;
    padding: 12px 14px;
    border-radius: 14px;
    background: var(--lilac);
  }
  .ask-text {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    line-height: 1.35;
  }
  .answer-card {
    margin: 0 0 12px;
    padding: 14px 16px;
    border-radius: 16px;
    border-left: 4px solid var(--chip);
    background: #fff;
  }
  .answer-card p {
    margin: 0 0 10px;
    font-size: 16px;
    line-height: 1.65;
    color: #3b0764;
  }
  .answer-card p:last-child { margin-bottom: 0; }
  .picture {
    margin: 12px 0 0;
    padding: 0;
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: 16px;
    background: #fff;
  }
  .picture img {
    display: block;
    width: 100%;
    height: auto;
  }
  .picture figcaption {
    padding: 8px 12px;
    font-size: 12px;
    font-weight: 700;
    color: var(--violet);
  }
  .recap {
    margin: 8px 0 0;
    padding: 18px;
    border: 1px solid var(--line);
    border-radius: 24px;
    background: var(--lilac);
    page-break-inside: avoid;
  }
  .board-heading {
    margin: 0 0 12px;
    font-family: "Patrick Hand", "Segoe Print", "Comic Sans MS", cursive;
    font-size: 28px;
    color: var(--ink);
  }
  .recap h2 {
    margin: 0 0 10px;
    font-family: "Patrick Hand", "Segoe Print", "Comic Sans MS", cursive;
    font-size: 28px;
  }
  .recap ol {
    margin: 0;
    padding-left: 22px;
  }
  .recap li {
    margin: 0 0 8px;
    font-size: 15px;
    line-height: 1.45;
    font-weight: 600;
  }
  .love {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin: 28px 0 0;
    color: var(--deep);
    font-weight: 700;
    font-size: 15px;
  }
  .heart {
    color: #e11d48;
    font-size: 18px;
    line-height: 1;
  }
  .empty {
    padding: 24px;
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.92);
    line-height: 1.6;
  }
  @media print {
    body { background: #fff; }
    .page { padding: 10mm 12mm 14mm; }
    .hero, .step, .recap { box-shadow: none; }
  }
</style>
</head>
<body>
  <article class="page">
    <header class="hero">
      <p class="kicker">Lumi6 lesson</p>
      <h1>${escapeHtml(title)}</h1>
      <p class="lede">A lesson for ${escapeHtml(child)} · ${escapeHtml(when)}</p>
    </header>
    ${boardHtml(boardPng)}
    ${stepsHtml(steps, boardPng)}
    ${recapHtml(steps)}
    <p class="love"><span>Made with love</span><span class="heart" aria-hidden="true">♥</span><span>by Lumi6</span></p>
  </article>
</body>
</html>`;
      const win = window.open("", "_blank");
      if (!win) {
        window.alert("Allow pop-ups to download the lesson PDF.");
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
          win.print();
        } catch {}
      };
      if (win.document.readyState === "complete") setTimeout(printOnce, 200);
      else win.addEventListener("load", () => setTimeout(printOnce, 200), { once: true });
      setTimeout(printOnce, 2500);
    } catch (err) {
      window.alert(err.message || "Could not build the lesson PDF.");
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  window.Lumi6Lesson = { record, attachImage, turns: turnsFromChat };
  window.exportLessonPdf = exportLessonPdf;
})();
