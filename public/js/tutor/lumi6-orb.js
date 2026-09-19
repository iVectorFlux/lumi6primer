/**
 * Talk-mode voice orb + profile theme picker.
 * Uses the 56px pill size and the studio's default grain / zoom / turbulence.
 */
(function () {
  const STORAGE_KEY = "lumi6OrbTheme";
  const PILL_SIZE = 56;
  const DEFAULT_THEME = "peach";
  const IDLE = {
    speed: 1.0,
    zoom: 1.55,
    turb: 0.7,
    grain: 0.8
  };
  const STATE_PRESETS = {
    idle: IDLE,
    ready: { speed: 1.22, zoom: 1.52, turb: 1.15, grain: 1.05 },
    listening: { speed: 1.6, zoom: 1.52, turb: 2.4, grain: 1.8 },
    thinking: { speed: 1.55, zoom: 1.50, turb: 1.9, grain: 1.25 },
    speaking: { speed: 2.0, zoom: 1.52, turb: 1.7, grain: 0.6 }
  };

  let talkOrb = null;
  let drawOrb = null;
  let pickerOrb = null;
  let talkState = "idle";
  let talkVoiceActive = false;
  let talkVoiceTimer = null;
  const drawBusy = new Set();

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

  function applyPreset(orb, stateName, shaderState) {
    if (!orb) return;
    const preset = STATE_PRESETS[stateName] || IDLE;
    orb.setSpeed(preset.speed);
    orb.setZoom(preset.zoom);
    orb.setTurbulence(preset.turb);
    orb.setGrain(preset.grain);
    orb.setState(shaderState || (stateName === "ready" ? "listening" : stateName));
  }

  function makeOrb(container, extra) {
    if (!container || typeof window.VoiceOrb !== "function") return null;
    container.innerHTML = "";
    return new window.VoiceOrb(container, Object.assign({
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
    const enteredListen = next === "listening" && talkState !== "listening";
    talkState = next;
    if (talkState !== "listening") {
      talkVoiceActive = false;
      if (talkVoiceTimer) {
        clearTimeout(talkVoiceTimer);
        talkVoiceTimer = null;
      }
    } else if (enteredListen) {
      talkVoiceActive = true;
      if (talkVoiceTimer) clearTimeout(talkVoiceTimer);
      talkVoiceTimer = setTimeout(() => {
        talkVoiceTimer = null;
        talkVoiceActive = false;
        applyTalkVisual();
      }, 720);
    }
    applyTalkVisual();
  }

  function setTalkVoiceActive(active, holdMs = 560) {
    if (talkState !== "listening") return;
    if (talkVoiceTimer) {
      clearTimeout(talkVoiceTimer);
      talkVoiceTimer = null;
    }
    talkVoiceActive = Boolean(active);
    applyTalkVisual();
    if (talkVoiceActive && holdMs > 0) {
      talkVoiceTimer = setTimeout(() => {
        talkVoiceTimer = null;
        talkVoiceActive = false;
        applyTalkVisual();
      }, holdMs);
    }
  }

  function setTheme(key) {
    const themes = palettes();
    if (!themes[key]) return readTheme();
    saveTheme(key);
    if (talkOrb) talkOrb.setTheme(key);
    if (drawOrb) drawOrb.setTheme(key);
    if (pickerOrb) pickerOrb.setTheme(key);
    document.querySelectorAll("[data-orb-theme]").forEach((btn) => {
      btn.classList.toggle("is-selected", btn.getAttribute("data-orb-theme") === key);
    });
    return key;
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
  }

  function mountThemePicker(previewHost, listHost) {
    destroyPicker();
    const themes = palettes();
    const current = readTheme();
    if (previewHost && typeof window.VoiceOrb === "function") {
      pickerOrb = makeOrb(previewHost, { showShadow: true, state: "idle" });
      applyPreset(pickerOrb, "idle");
    }
    if (!listHost) return;
    listHost.innerHTML = themeKeys().map((key) => {
      const palette = themes[key];
      const selected = key === current ? " is-selected" : "";
      return `
        <button type="button" class="orb-theme-choice${selected}" data-orb-theme="${key}">
          <span class="orb-theme-swatch" style="background:${swatchStyle(palette)}" aria-hidden="true"></span>
          <span class="orb-theme-copy">
            <span class="orb-theme-name">${palette.name || key}</span>
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
    mountTalkOrb();
    mountDrawOrb();
  }

  window.Lumi6Orb = {
    mountTalkOrb,
    mountDrawOrb,
    setTalkState,
    setTalkVoiceActive,
    setDrawBusy,
    refreshDrawOrb,
    setTheme,
    getTheme: readTheme,
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
