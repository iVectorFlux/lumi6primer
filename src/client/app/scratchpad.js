// ── 8. LIGHT SCRATCHPAD CONTROLLER ──────────────────────────────────────
(function() {
  "use strict";

  let canvas = null;
  let ctx = null;
  let drawer = null;
  let isDrawing = false;
  let hasDrawn = false;
  let currentTool = "pen"; // "pen" | "eraser"
  let currentColor = "#1e293b";
  let lastX = 0;
  let lastY = 0;

  function initScratchpad() {
    drawer = document.getElementById("talkScratchpadDrawer");
    canvas = document.getElementById("talkScratchpadCanvas");
    if (!drawer || !canvas) return;

    ctx = canvas.getContext("2d");
    resizeScratchpad();
    window.addEventListener("resize", resizeScratchpad);

    const toggleBtn = document.getElementById("talkModeDrawBtn");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        toggleScratchpad();
      });
    }

    const closeBtn = document.getElementById("spCloseBtn");
    if (closeBtn) closeBtn.addEventListener("click", () => closeScratchpad());

    const clearBtn = document.getElementById("spClearBtn");
    if (clearBtn) clearBtn.addEventListener("click", () => clearScratchpad());

    const submitBtn = document.getElementById("spSubmitBtn");
    if (submitBtn) submitBtn.addEventListener("click", () => submitScratchpad());

    drawer.querySelectorAll(".sp-tool-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        drawer.querySelectorAll(".sp-tool-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        currentTool = btn.dataset.spTool || "pen";
      });
    });

    drawer.querySelectorAll(".sp-color-dot").forEach((dot) => {
      dot.addEventListener("click", () => {
        drawer.querySelectorAll(".sp-color-dot").forEach((d) => d.classList.remove("active"));
        dot.classList.add("active");
        currentColor = dot.dataset.spColor || "#1e293b";
        currentTool = "pen";
        drawer.querySelectorAll(".sp-tool-btn").forEach((b) => b.classList.toggle("active", b.dataset.spTool === "pen"));
      });
    });

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
  }

  function resizeScratchpad() {
    if (!canvas || !drawer || drawer.hidden) return;
    const wrapper = canvas.parentElement;
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    if (rect.width <= 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let tempImg = null;
    if (hasDrawn && canvas.width > 0 && canvas.height > 0) {
      tempImg = document.createElement("canvas");
      tempImg.width = canvas.width;
      tempImg.height = canvas.height;
      tempImg.getContext("2d").drawImage(canvas, 0, 0);
    }

    const cssWidth = Math.floor(rect.width);
    const cssHeight = Math.min(Math.max(Math.floor(window.innerHeight * 0.32), 220), 380);

    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    canvas.width = Math.floor(cssWidth * dpr);
    canvas.height = Math.floor(cssHeight * dpr);

    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (tempImg) {
      ctx.drawImage(tempImg, 0, 0, cssWidth, cssHeight);
    }
  }

  function toggleScratchpad() {
    if (!drawer) return;
    if (drawer.hidden) openScratchpad();
    else closeScratchpad();
  }

  function openScratchpad() {
    if (!drawer) return;
    drawer.hidden = false;
    drawer.classList.add("is-open");
    const toggleBtn = document.getElementById("talkModeDrawBtn");
    if (toggleBtn) toggleBtn.classList.add("active");
    requestAnimationFrame(() => resizeScratchpad());
  }

  function closeScratchpad() {
    if (!drawer) return;
    drawer.hidden = true;
    drawer.classList.remove("is-open");
    const toggleBtn = document.getElementById("talkModeDrawBtn");
    if (toggleBtn) toggleBtn.classList.remove("active");
  }

  function clearScratchpad() {
    if (!ctx || !canvas) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    hasDrawn = false;
  }

  function getCanvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  function onPointerDown(e) {
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    isDrawing = true;
    const { x, y } = getCanvasCoords(e);
    lastX = x;
    lastY = y;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.1, y + 0.1);
    ctx.strokeStyle = currentTool === "eraser" ? "#ffffff" : currentColor;
    ctx.lineWidth = currentTool === "eraser" ? 22 : (e.pointerType === "pen" ? Math.max((e.pressure || 0.5) * 6, 2.5) : 3.5);
    ctx.stroke();
    hasDrawn = true;
  }

  function onPointerMove(e) {
    if (!isDrawing) return;
    e.preventDefault();
    const { x, y } = getCanvasCoords(e);

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    const midX = (lastX + x) / 2;
    const midY = (lastY + y) / 2;
    ctx.quadraticCurveTo(lastX, lastY, midX, midY);
    ctx.strokeStyle = currentTool === "eraser" ? "#ffffff" : currentColor;
    ctx.lineWidth = currentTool === "eraser" ? 22 : (e.pointerType === "pen" ? Math.max((e.pressure || 0.5) * 6, 2.5) : 3.5);
    ctx.stroke();

    lastX = x;
    lastY = y;
  }

  function onPointerUp(e) {
    if (!isDrawing) return;
    isDrawing = false;
    try { canvas.releasePointerCapture(e.pointerId); } catch {}
  }

  async function submitScratchpad() {
    if (!hasDrawn || !canvas) {
      if (typeof window.showToast === "function") window.showToast("Draw something first!");
      return;
    }

    const offscreen = document.createElement("canvas");
    offscreen.width = canvas.width;
    offscreen.height = canvas.height;
    const offCtx = offscreen.getContext("2d");
    offCtx.fillStyle = "#ffffff";
    offCtx.fillRect(0, 0, offscreen.width, offscreen.height);
    offCtx.drawImage(canvas, 0, 0);

    const dataUrl = offscreen.toDataURL("image/jpeg", 0.90);
    closeScratchpad();
    clearScratchpad();

    if (window.primerChat && typeof window.primerChat.handleSendMessage === "function") {
      await window.primerChat.handleSendMessage({
        text: "I drew this on the scratchpad for you to check!",
        boardImage: dataUrl
      });
    }
  }

  window.openScratchpad = openScratchpad;
  window.closeScratchpad = closeScratchpad;
  window.toggleScratchpad = toggleScratchpad;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initScratchpad);
  } else {
    initScratchpad();
  }
})();
