/**
 * Talk-mode voice orb + profile theme picker.
 * Uses the 56px pill size and the studio's default grain / zoom / turbulence.
 */
(function () {
  const STORAGE_KEY = "lumi6OrbTheme";
  const FINISH_KEY = "lumi6OrbFinish";
  const PILL_SIZE = 44;
  const DEFAULT_THEME = "peach";
  const DEFAULT_FINISH = "light";
  const IDLE = {
    speed: 0.65,
    zoom: 1.55,
    turb: 0.35,
    grain: 0.5
  };
  const STATE_PRESETS = {
    idle: IDLE,
    ready: { speed: 0.75, zoom: 1.53, turb: 0.45, grain: 0.6 },
    listening: { speed: 1.45, zoom: 1.52, turb: 1.6, grain: 1.2 },
    thinking: { speed: 1.25, zoom: 1.50, turb: 0.95, grain: 0.8 },
    speaking: { speed: 1.6, zoom: 1.52, turb: 1.35, grain: 0.5 }
  };

  let talkOrb = null;
  let drawOrb = null;
  let pickerOrb = null;
  let talkState = "idle";
  let talkVoiceActive = false;
  let talkVoiceTimer = null;
  let activeMode = "talk";
  const drawBusy = new Set();

  function pauseOrb(orb) {
    if (orb && typeof orb.pause === "function") orb.pause();
  }

  function resumeOrb(orb) {
    if (orb && typeof orb.resume === "function") orb.resume();
  }

  function syncRunningOrbs() {
    if (document.hidden) {
      pauseOrb(talkOrb);
      pauseOrb(drawOrb);
      pauseOrb(pickerOrb);
      return;
    }
    if (pickerOrb) {
      resumeOrb(pickerOrb);
      pauseOrb(talkOrb);
      pauseOrb(drawOrb);
      return;
    }
    if (activeMode === "talk") {
      resumeOrb(talkOrb);
      pauseOrb(drawOrb);
    } else if (activeMode === "draw") {
      resumeOrb(drawOrb);
      pauseOrb(talkOrb);
    } else {
      pauseOrb(talkOrb);
      pauseOrb(drawOrb);
    }
  }

  function setActiveMode(mode) {
    const next = mode === "draw" || mode === "sim" ? mode : "talk";
    activeMode = next;
    if (next === "talk") mountTalkOrb();
    if (next === "draw") mountDrawOrb();
    syncRunningOrbs();
  }

  function palettes() {
    return window.VoiceOrb?.getPalettes?.() || window.VoiceOrbPalettes || {};
  }

  function themeKeys() {
    return Object.keys(palettes());
  }

  function readTheme() {
    try {
      const stored = String(localStorage.getItem(STORAGE_KEY) || "").trim();
      if (stored && palettes()[stored]) return stored;
    } catch {}
    return palettes()[DEFAULT_THEME] ? DEFAULT_THEME : themeKeys()[0] || DEFAULT_THEME;
  }

  function saveTheme(key) {
    try { localStorage.setItem(STORAGE_KEY, key); } catch {}
  }

  function readFinish() {
    try {
      const stored = String(localStorage.getItem(FINISH_KEY) || "").trim();
      if (stored === "rich" || stored === "light") return stored;
    } catch {}
    return DEFAULT_FINISH;
  }

  function saveFinish(finish) {
    try { localStorage.setItem(FINISH_KEY, finish); } catch {}
  }

  function mixColor(a, b, t) {
    return [
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
      a[2] + (b[2] - a[2]) * t
    ];
  }

  function finishedPalette(palette, finish) {
    if (!palette) return palette;
    const rich = finish === "rich";
    return {
      name: palette.name,
      subtitle: palette.subtitle,
      glow: palette.glow,
      c1: rich ? mixColor(palette.c1, palette.c3, 0.32) : mixColor(palette.c1, palette.c2, 0.28),
      c2: rich ? mixColor(palette.c2, palette.c3, 0.28) : mixColor(palette.c2, palette.c3, 0.16),
      c3: rich ? mixColor(palette.c3, palette.c4, 0.22) : palette.c3,
      c4: rich ? mixColor(palette.c4, palette.c5, 0.16) : palette.c4,
      c5: palette.c5
    };
  }

  function currentPalette() {
    const key = readTheme();
    return finishedPalette(palettes()[key], readFinish()) || palettes()[key];
  }

  function paintOrbTheme(orb) {
    if (!orb) return;
    const key = readTheme();
    const painted = currentPalette();
    if (!painted) return;
    orb.themeKey = key;
    orb.setTheme(painted);
  }

  function applyPreset(orb, stateName, shaderState) {
    if (!orb) return;
    const preset = STATE_PRESETS[stateName] || IDLE;
    orb.setSpeed(preset.speed);
    orb.setZoom(preset.zoom);
    orb.setTurbulence(preset.turb);
    orb.setGrain(preset.grain);
    const effectiveShaderState = shaderState || (stateName === "ready" ? "idle" : stateName);
    orb.setState(effectiveShaderState);
  }

  function makeOrb(container, extra) {
    if (!container || typeof window.VoiceOrb !== "function") return null;
    container.innerHTML = "";
    const orb = new window.VoiceOrb(container, Object.assign({
      size: PILL_SIZE,
      theme: readTheme(),
      state: "idle",
      reactToMic: false,
      speed: IDLE.speed,
      turbulence: IDLE.turb,
      zoom: IDLE.zoom,
      grain: IDLE.grain,
      showShadow: false,
      interactive: false
    }, extra || {}));
    paintOrbTheme(orb);
    return orb;
  }

  function mountTalkOrb() {
    const host = document.getElementById("talkVoiceOrb");
    if (!host || talkOrb || typeof window.VoiceOrb !== "function") return talkOrb;
    talkOrb = makeOrb(host);
    applyTalkVisual();
    return talkOrb;
  }

  function applyTalkVisual() {
    if (!talkOrb) mountTalkOrb();
    if (!talkOrb) return;
    if (talkState === "listening") {
      applyPreset(talkOrb, talkVoiceActive ? "listening" : "ready");
      return;
    }
    applyPreset(talkOrb, talkState);
  }

  function setTalkState(stateName) {
    const next = stateName === "listening" || stateName === "thinking" || stateName === "speaking" ? stateName : "idle";
    talkState = next;
    if (talkVoiceTimer) {
      clearTimeout(talkVoiceTimer);
      talkVoiceTimer = null;
    }
    talkVoiceActive = false;
    applyTalkVisual();
  }

  function setTalkVoiceActive(active, holdMs = 280) {
    if (talkState !== "listening") return;
    if (talkVoiceTimer) {
      clearTimeout(talkVoiceTimer);
      talkVoiceTimer = null;
    }
    if (!active) {
      talkVoiceActive = false;
      applyTalkVisual();
      return;
    }
    talkVoiceActive = true;
    applyTalkVisual();
    if (holdMs > 0) {
      talkVoiceTimer = setTimeout(() => {
        talkVoiceTimer = null;
        talkVoiceActive = false;
        applyTalkVisual();
      }, holdMs);
    }
  }

  function syncThemeButtons() {
    const theme = readTheme();
    const finish = readFinish();
    document.querySelectorAll("[data-orb-theme]").forEach((btn) => {
      btn.classList.toggle("is-selected", btn.getAttribute("data-orb-theme") === theme);
    });
    document.querySelectorAll("[data-orb-finish]").forEach((btn) => {
      btn.classList.toggle("is-selected", btn.getAttribute("data-orb-finish") === finish);
    });
  }

  function paintAllOrbs() {
    paintOrbTheme(talkOrb);
    paintOrbTheme(drawOrb);
    paintOrbTheme(pickerOrb);
    document.querySelectorAll("[data-orb-theme]").forEach((btn) => {
      const key = btn.getAttribute("data-orb-theme");
      const swatch = btn.querySelector(".orb-theme-swatch");
      const painted = finishedPalette(palettes()[key], readFinish());
      if (swatch && painted) swatch.style.background = swatchStyle(painted);
    });
    syncThemeButtons();
  }

  function setTheme(key) {
    const themes = palettes();
    if (!themes[key]) return readTheme();
    saveTheme(key);
    paintAllOrbs();
    return key;
  }

  function setFinish(finish) {
    const next = finish === "rich" ? "rich" : "light";
    saveFinish(next);
    paintAllOrbs();
    return next;
  }

  function rgb(c) {
    return `rgb(${Math.round(c[0] * 255)}, ${Math.round(c[1] * 255)}, ${Math.round(c[2] * 255)})`;
  }

  function swatchStyle(palette) {
    if (!palette) return "";
    return `radial-gradient(circle at 32% 28%, ${rgb(palette.c1)} 0%, ${rgb(palette.c2)} 26%, ${rgb(palette.c3)} 52%, ${rgb(palette.c4)} 78%, ${rgb(palette.c5)} 100%)`;
  }

  function destroyPicker() {
    if (pickerOrb) {
      try { pickerOrb.destroy(); } catch {}
      pickerOrb = null;
    }
    syncRunningOrbs();
  }

  function mountThemePicker(previewHost, listHost, finishHost) {
    destroyPicker();
    const themes = palettes();
    const current = readTheme();
    const finish = readFinish();
    if (previewHost && typeof window.VoiceOrb === "function") {
      pickerOrb = makeOrb(previewHost, { showShadow: true, state: "idle" });
      applyPreset(pickerOrb, "idle");
      paintOrbTheme(pickerOrb);
      syncRunningOrbs();
    }
    if (finishHost) {
      finishHost.innerHTML = `
        <button type="button" class="orb-finish-choice${finish === "light" ? " is-selected" : ""}" data-orb-finish="light">Light</button>
        <button type="button" class="orb-finish-choice${finish === "rich" ? " is-selected" : ""}" data-orb-finish="rich">Rich</button>`;
      finishHost.querySelectorAll("[data-orb-finish]").forEach((btn) => {
        btn.addEventListener("click", () => setFinish(btn.getAttribute("data-orb-finish")));
      });
    }
    if (!listHost) return;
    listHost.innerHTML = themeKeys().map((key) => {
      const palette = finishedPalette(themes[key], finish);
      const selected = key === current ? " is-selected" : "";
      return `
        <button type="button" class="orb-theme-choice${selected}" data-orb-theme="${key}">
          <span class="orb-theme-swatch" style="background:${swatchStyle(palette)}" aria-hidden="true"></span>
          <span class="orb-theme-copy">
            <span class="orb-theme-name">${themes[key].name || key}</span>
          </span>
        </button>`;
    }).join("");
    listHost.querySelectorAll("[data-orb-theme]").forEach((btn) => {
      btn.addEventListener("click", () => setTheme(btn.getAttribute("data-orb-theme")));
    });
  }

  function drawOrbNeedsRemount() {
    if (!drawOrb) return true;
    const canvas = drawOrb.canvas;
    return !canvas || canvas.width < 8 || canvas.height < 8;
  }

  function mountDrawOrb() {
    const host = document.getElementById("drawVoiceOrb");
    if (!host || typeof window.VoiceOrb !== "function") return drawOrb;
    if (drawOrb && !drawOrbNeedsRemount()) {
      applyPreset(drawOrb, drawBusy.size ? "thinking" : "idle");
      return drawOrb;
    }
    if (drawOrb) {
      try { drawOrb.destroy(); } catch {}
      drawOrb = null;
    }
    drawOrb = makeOrb(host);
    applyPreset(drawOrb, drawBusy.size ? "thinking" : "idle");
    return drawOrb;
  }

  function refreshDrawOrb() {
    if (drawOrb && !drawOrbNeedsRemount()) {
      try { drawOrb._updateCanvasSize(); } catch {}
      applyPreset(drawOrb, drawBusy.size ? "thinking" : "idle");
      return drawOrb;
    }
    return mountDrawOrb();
  }

  function setDrawBusy(busy, reason = "draw") {
    const key = String(reason || "draw");
    if (busy) drawBusy.add(key);
    else drawBusy.delete(key);
    refreshDrawOrb();
  }

  function boot() {
    const start = /[?&]mode=sim/.test(location.search)
      ? "sim"
      : /[?&]mode=talk/.test(location.search)
        ? "talk"
        : document.body.classList.contains("mode-draw-active")
          ? "draw"
          : "talk";
    setActiveMode(start);
    document.addEventListener("visibilitychange", syncRunningOrbs);
  }

  window.Lumi6Orb = {
    mountTalkOrb,
    mountDrawOrb,
    setTalkState,
    setTalkVoiceActive,
    setDrawBusy,
    refreshDrawOrb,
    setActiveMode,
    setTheme,
    getTheme: readTheme,
    setFinish,
    getFinish: readFinish,
    palettes,
    mountThemePicker,
    destroyPicker,
    PILL_SIZE
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
