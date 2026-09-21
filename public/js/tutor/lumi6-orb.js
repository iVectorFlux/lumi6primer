/**
 * Lumi6 Voice Integration
 * - Talk Mode: VoicePill (Character capsule in chat bar)
 * - Board/Draw Mode: VoiceOrb (3D Raymarched Fluid Sphere on whiteboard canvas)
 * - Profile Customizer: Dual-mode character switcher for both Talk Pill & Board Orb
 */
(function () {
  "use strict";

  // Storage Keys
  const PILL_PALETTE_KEY = "lumi6VoicePillPalette";
  const PILL_EYE_KEY = "lumi6VoicePillEyeColor";
  const ORB_THEME_KEY = "lumi6OrbTheme";

  // Defaults
  const DEFAULT_PILL_PALETTE = "amber";
  const DEFAULT_PILL_EYE = "auto";
  const DEFAULT_ORB_THEME = "peach";

  // VoiceOrb 3D Presets
  const ORB_IDLE = { speed: 0.65, zoom: 1.55, turb: 0.35, grain: 0.5 };
  const ORB_PRESETS = {
    idle: ORB_IDLE,
    ready: { speed: 0.75, zoom: 1.53, turb: 0.45, grain: 0.6 },
    listening: { speed: 1.45, zoom: 1.52, turb: 1.6, grain: 1.2 },
    thinking: { speed: 1.25, zoom: 1.50, turb: 0.95, grain: 0.8 },
    speaking: { speed: 1.6, zoom: 1.52, turb: 1.35, grain: 0.5 }
  };

  // Running Instances
  let talkPill = null;   // VoicePill instance (Talk Mode)
  let drawOrb = null;    // VoiceOrb instance (Board / Draw Mode)
  let pickerPill = null; // VoicePill preview in settings
  let pickerOrb = null;  // VoiceOrb preview in settings
  let activePickerTab = "talk"; // "talk" | "board"

  let talkState = "idle";
  let activeMode = "talk";
  const drawBusy = new Set();

  // ── Palettes & Settings Accessors ──────────────────────────────
  function getPillPalettes() {
    return window.VoicePill?.PALETTES || {
      amber: { name: "Amber Ember", subtitle: "Warm Spiced Cognac", bodyGrad: ["#f59e0b", "#b45309"], defaultEyeColor: "black" },
      violet: { name: "Cyber Violet", subtitle: "Electric Plum Indigo", bodyGrad: ["#a855f7", "#6b21a8"], defaultEyeColor: "black" },
      emerald: { name: "Emerald Jade", subtitle: "Lush Seafoam Forest", bodyGrad: ["#10b981", "#047857"], defaultEyeColor: "black" },
      azure: { name: "Ocean Azure", subtitle: "Sky Sapphire Cobalt", bodyGrad: ["#0ea5e9", "#1d4ed8"], defaultEyeColor: "black" },
      coral: { name: "Sunset Coral", subtitle: "Fiery Rose Peach", bodyGrad: ["#f43f5e", "#ea580c"], defaultEyeColor: "black" },
      gunmetal: { name: "Titanium Steel", subtitle: "Brushed Silver Slate", bodyGrad: ["#94a3b8", "#475569"], defaultEyeColor: "black" },
      obsidian: { name: "Obsidian Slate", subtitle: "Deep Graphite Dark", bodyGrad: ["#334155", "#0f172a"], defaultEyeColor: "white" },
      puredark: { name: "Matte Carbon", subtitle: "Minimalist Pitch Black", bodyGrad: ["#27272a", "#09090b"], defaultEyeColor: "white" }
    };
  }

  function getOrbPalettes() {
    return window.VoiceOrbPalettes || window.VoiceOrb?.PALETTES || {};
  }

  function readPillPalette() {
    try {
      const stored = String(localStorage.getItem(PILL_PALETTE_KEY) || "").trim().toLowerCase();
      if (stored && getPillPalettes()[stored]) return stored;
    } catch {}
    return DEFAULT_PILL_PALETTE;
  }

  function savePillPalette(key) {
    try {
      localStorage.setItem(PILL_PALETTE_KEY, key);
    } catch {}
  }

  function readPillEyeColor() {
    try {
      const stored = String(localStorage.getItem(PILL_EYE_KEY) || "").trim().toLowerCase();
      if (["auto", "black", "white"].includes(stored)) return stored;
    } catch {}
    return DEFAULT_PILL_EYE;
  }

  function savePillEyeColor(mode) {
    try {
      localStorage.setItem(PILL_EYE_KEY, mode);
    } catch {}
  }

  function readOrbTheme() {
    try {
      const stored = String(localStorage.getItem(ORB_THEME_KEY) || "").trim().toLowerCase();
      if (stored && getOrbPalettes()[stored]) return stored;
    } catch {}
    return DEFAULT_ORB_THEME;
  }

  function saveOrbTheme(key) {
    try {
      localStorage.setItem(ORB_THEME_KEY, key);
    } catch {}
  }

  function rgb(c) {
    return `rgb(${Math.round(c[0] * 255)}, ${Math.round(c[1] * 255)}, ${Math.round(c[2] * 255)})`;
  }

  // User-calibrated Rich / Vibrant / Saturated tone transformation from voice-orb.html
  function toRichTheme(baseTheme) {
    if (!baseTheme) return baseTheme;
    const copy = {
      name: baseTheme.name,
      subtitle: baseTheme.subtitle,
      glow: "rgba(255, 120, 60, 0.45)",
      c1: [...baseTheme.c1],
      c2: [...baseTheme.c2],
      c3: [...baseTheme.c3],
      c4: [...baseTheme.c4],
      c5: [...baseTheme.c5]
    };
    const transformColor = (rgb) => {
      let [r, g, b] = rgb;
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      r = Math.min(1.0, Math.max(0.0, lum + (r - lum) * 1.45));
      g = Math.min(1.0, Math.max(0.0, lum + (g - lum) * 1.45));
      b = Math.min(1.0, Math.max(0.0, lum + (b - lum) * 1.45));
      r = Math.pow(r, 1.12);
      g = Math.pow(g, 1.12);
      b = Math.pow(b, 1.12);
      return [Math.min(1.0, Math.max(0.0, r)), Math.min(1.0, Math.max(0.0, g)), Math.min(1.0, Math.max(0.0, b))];
    };
    copy.c1 = transformColor(copy.c1);
    copy.c2 = transformColor(copy.c2);
    copy.c3 = transformColor(copy.c3);
    copy.c4 = transformColor(copy.c4);
    copy.c5 = transformColor(copy.c5);
    return copy;
  }

  function orbSwatchGradient(palette) {
    if (!palette) return "";
    const rich = toRichTheme(palette);
    return `radial-gradient(circle at 32% 28%, ${rgb(rich.c1)} 0%, ${rgb(rich.c2)} 26%, ${rgb(rich.c3)} 52%, ${rgb(rich.c4)} 78%, ${rgb(rich.c5)} 100%)`;
  }

  // ── Animation & Process Lifecycle ─────────────────────────────
  function pauseItem(item) {
    if (item && typeof item.pause === "function") item.pause();
  }

  function resumeItem(item) {
    if (item && typeof item.resume === "function") item.resume();
  }

  function syncRunningOrbs() {
    if (document.hidden) {
      pauseItem(talkPill);
      pauseItem(drawOrb);
      pauseItem(pickerPill);
      pauseItem(pickerOrb);
      return;
    }

    // When modal picker preview is active
    if (pickerPill || pickerOrb) {
      if (activePickerTab === "talk") {
        resumeItem(pickerPill);
        pauseItem(pickerOrb);
      } else {
        resumeItem(pickerOrb);
        pauseItem(pickerPill);
      }
      pauseItem(talkPill);
      pauseItem(drawOrb);
      return;
    }

    // App Workspace Mode
    if (activeMode === "talk") {
      resumeItem(talkPill);
      pauseItem(drawOrb);
    } else if (activeMode === "draw") {
      resumeItem(drawOrb);
      pauseItem(talkPill);
    } else {
      pauseItem(talkPill);
      pauseItem(drawOrb);
    }
  }

  function setActiveMode(mode) {
    const next = mode === "draw" || mode === "sim" ? mode : "talk";
    activeMode = next;
    if (next === "talk") mountTalkOrb();
    if (next === "draw") mountDrawOrb();
    syncRunningOrbs();
  }

  // ── TALK MODE: VoicePill ───────────────────────────────────────
  function makePill(container, width, height, extra = {}) {
    if (!container || typeof window.VoicePill !== "function") return null;
    container.innerHTML = "";
    const pill = new window.VoicePill(container, Object.assign({
      width,
      height,
      palette: readPillPalette(),
      eyeColorMode: readPillEyeColor(),
      state: "idle",
      expression: "normal",
      trackPointer: true,
      showNoseOnSpeaking: true,
      autoStop: false
    }, extra));
    return pill;
  }

  function mountTalkOrb() {
    const host = document.getElementById("talkVoiceOrb");
    if (!host || typeof window.VoicePill !== "function") return talkPill;
    if (talkPill && host.contains(talkPill.canvas)) {
      talkPill.setState(talkState);
      return talkPill;
    }
    if (talkPill) {
      try { talkPill.destroy(); } catch {}
      talkPill = null;
    }
    talkPill = makePill(host, 68, 44, {
      state: talkState,
      trackPointer: true
    });

    const micBtn = document.getElementById("talkModeMicBtn");
    if (micBtn && !micBtn._vpHoverBound) {
      micBtn._vpHoverBound = true;
      micBtn.addEventListener("pointerenter", () => {
        if (talkPill) talkPill.isHovered = true;
      });
      micBtn.addEventListener("pointerleave", () => {
        if (talkPill) talkPill.isHovered = false;
      });
    }

    return talkPill;
  }

  function setTalkState(stateName) {
    const next = ["listening", "thinking", "speaking"].includes(stateName) ? stateName : "idle";
    talkState = next;
    if (!talkPill) mountTalkOrb();
    if (talkPill) {
      talkPill.setState(next);
    }
  }

  function setTalkVoiceActive(active, holdMs = 280) {
    if (!talkPill) return;
    if (active) {
      talkPill.setAudioLevel(0.85);
      if (holdMs > 0) {
        setTimeout(() => {
          if (talkPill) talkPill.setAudioLevel(0.0);
        }, holdMs);
      }
    } else {
      talkPill.setAudioLevel(0.0);
    }
  }

  function setPillPalette(key) {
    const pals = getPillPalettes();
    if (!pals[key]) return readPillPalette();
    savePillPalette(key);
    if (talkPill) talkPill.setPalette(key);
    if (pickerPill) pickerPill.setPalette(key);
    if (window.VoicePill && typeof window.VoicePill.applyThemeTokens === "function") {
      window.VoicePill.applyThemeTokens(key);
    }
    return key;
  }

  function setPillEyeColorMode(mode) {
    if (!["auto", "black", "white"].includes(mode)) return readPillEyeColor();
    savePillEyeColor(mode);
    if (talkPill) talkPill.setEyeColorMode(mode);
    if (pickerPill) pickerPill.setEyeColorMode(mode);
    return mode;
  }

  // ── BOARD / DRAW MODE: VoiceOrb ────────────────────────────────
  function applyOrbPreset(orb, stateName, shaderState) {
    if (!orb) return;
    const preset = ORB_PRESETS[stateName] || ORB_IDLE;
    orb.setSpeed(preset.speed);
    orb.setZoom(preset.zoom);
    orb.setTurbulence(preset.turb);
    orb.setGrain(preset.grain);
    const effectiveState = shaderState || (stateName === "ready" ? "idle" : stateName);
    orb.setState(effectiveState);
  }

  function paintOrbTheme(orb) {
    if (!orb) return;
    const themes = getOrbPalettes();
    const key = readOrbTheme();
    const raw = themes[key] || themes.peach;
    const rich = toRichTheme(raw);
    orb.themeKey = key;
    orb.setTheme(rich);
  }

  function makeVoiceOrb(container, extra = {}) {
    if (!container || typeof window.VoiceOrb !== "function") return null;
    container.innerHTML = "";
    const orb = new window.VoiceOrb(container, Object.assign({
      size: 56,
      theme: readOrbTheme(),
      state: "idle",
      reactToMic: false,
      speed: ORB_IDLE.speed,
      turbulence: ORB_IDLE.turb,
      zoom: ORB_IDLE.zoom,
      grain: ORB_IDLE.grain,
      showShadow: false,
      interactive: false
    }, extra));
    paintOrbTheme(orb);
    return orb;
  }

  function mountDrawOrb() {
    const host = document.getElementById("drawVoiceOrb");
    if (!host || typeof window.VoiceOrb !== "function") return drawOrb;
    if (drawOrb && host.contains(drawOrb.canvas) && drawOrb.canvas.width >= 8) {
      applyOrbPreset(drawOrb, drawBusy.size ? "thinking" : "idle");
      return drawOrb;
    }
    if (drawOrb) {
      try { drawOrb.destroy(); } catch {}
      drawOrb = null;
    }
    drawOrb = makeVoiceOrb(host, { size: 56 });
    applyOrbPreset(drawOrb, drawBusy.size ? "thinking" : "idle");
    return drawOrb;
  }

  function refreshDrawOrb() {
    if (drawOrb && drawOrb.canvas && drawOrb.canvas.width >= 8) {
      try { drawOrb._updateCanvasSize(); } catch {}
      applyOrbPreset(drawOrb, drawBusy.size ? "thinking" : "idle");
      return drawOrb;
    }
    return mountDrawOrb();
  }

  function setDrawBusy(busy, reason = "draw") {
    const key = String(reason || "draw");
    if (busy) drawBusy.add(key);
    else drawBusy.delete(key);
    if (!drawOrb) mountDrawOrb();
    if (drawOrb) {
      applyOrbPreset(drawOrb, drawBusy.size ? "thinking" : "idle");
    }
  }

  function setOrbTheme(key) {
    const themes = getOrbPalettes();
    if (!themes[key]) return readOrbTheme();
    saveOrbTheme(key);
    paintOrbTheme(drawOrb);
    paintOrbTheme(pickerOrb);
    return key;
  }

  // ── PROFILE CUSTOMIZER (Dual Character Switcher) ───────────────
  function destroyPicker() {
    if (pickerPill) {
      try { pickerPill.destroy(); } catch {}
      pickerPill = null;
    }
    if (pickerOrb) {
      try { pickerOrb.destroy(); } catch {}
      pickerOrb = null;
    }
    syncRunningOrbs();
  }

  function mountThemePicker(containerOrPreviewHost) {
    destroyPicker();
    let mountHost = containerOrPreviewHost;
    if (!mountHost) return;

    if (!mountHost.classList.contains("voice-pill-customizer-host")) {
      const parent = mountHost.closest(".onboard-scroll") || mountHost.parentElement;
      if (parent && !parent.querySelector(".voice-pill-customizer")) {
        mountHost = parent;
      }
    }

    renderCustomizerUI(mountHost);
  }

  function renderCustomizerUI(mountHost) {
    const currentPillPal = readPillPalette();
    const currentEye = readPillEyeColor();
    const pillPals = getPillPalettes();

    const currentOrbTheme = readOrbTheme();
    const orbPals = getOrbPalettes();

    mountHost.innerHTML = `
      <div class="voice-pill-customizer">
        <!-- Mode Tabs: Talk Pill vs Board Orb -->
        <div class="vp-mode-tabs" role="tablist">
          <button type="button" class="vp-mode-tab${activePickerTab === "talk" ? " active" : ""}" data-tab="talk" role="tab" aria-selected="${activePickerTab === "talk"}">
            <span class="vp-tab-icon">💊</span> Talk Pill (Chat)
          </button>
          <button type="button" class="vp-mode-tab${activePickerTab === "board" ? " active" : ""}" data-tab="board" role="tab" aria-selected="${activePickerTab === "board"}">
            <span class="vp-tab-icon">🔮</span> Board Orb (Canvas)
          </button>
        </div>

        <!-- ═════════ TAB 1: TALK MODE PILL ═════════ -->
        <div id="vpTalkPillPanel" class="vp-tab-panel"${activePickerTab === "talk" ? "" : " hidden"}>
          <!-- 1. Hero Preview Stage -->
          <div class="vp-preview-stage">
            <div class="vp-preview-mount" id="voicePillHeroMount"></div>
            <p class="vp-preview-hint">Tap pill to trigger reactions &bull; Follows your cursor</p>
          </div>

          <!-- 2. Eye Color Contrast Selector -->
          <div class="vp-section">
            <div class="vp-section-header">
              <span class="vp-section-title">Eye Styling</span>
              <span class="vp-section-sub">Smart contrast adapt or fixed</span>
            </div>
            <div class="vp-eye-selector" id="vpEyeSelect" role="radiogroup" aria-label="Eye color">
              <button type="button" class="vp-eye-btn${currentEye === "auto" ? " active" : ""}" data-eye-mode="auto">
                <span class="vp-eye-dot auto"></span> Auto Contrast
              </button>
              <button type="button" class="vp-eye-btn${currentEye === "black" ? " active" : ""}" data-eye-mode="black">
                <span class="vp-eye-dot black"></span> Deep Black
              </button>
              <button type="button" class="vp-eye-btn${currentEye === "white" ? " active" : ""}" data-eye-mode="white">
                <span class="vp-eye-dot white"></span> Luminous White
              </button>
            </div>
          </div>

          <!-- 3. Expressions Suite -->
          <div class="vp-section">
            <div class="vp-section-header">
              <span class="vp-section-title">Test Gestures</span>
              <span class="vp-section-sub">Tap expression to preview</span>
            </div>
            <div class="vp-expr-chips" id="vpExprChips">
              <button type="button" class="vp-chip active" data-expr="normal">Normal</button>
              <button type="button" class="vp-chip" data-expr="happy">Happy ✨</button>
              <button type="button" class="vp-chip" data-expr="stars">Stars ⭐</button>
              <button type="button" class="vp-chip" data-expr="heart">Heart ♥</button>
              <button type="button" class="vp-chip" data-expr="proud">Proud 😊</button>
              <button type="button" class="vp-chip" data-expr="wink">Wink 😉</button>
              <button type="button" class="vp-chip" data-expr="thinking">Ponder 💭</button>
              <button type="button" class="vp-chip" data-expr="dizzy">Dizzy 🌀</button>
            </div>
          </div>

          <!-- 4. Palette Selection Grid -->
          <div class="vp-section">
            <div class="vp-section-header">
              <span class="vp-section-title">Curated Palettes</span>
              <span class="vp-section-sub">8 vibrant gradients</span>
            </div>
            <div class="vp-palette-grid" id="vpPillPaletteGrid" role="listbox" aria-label="Voice pill palettes">
              ${Object.keys(pillPals).map((key) => {
                const p = pillPals[key];
                const grad = `linear-gradient(135deg, ${p.bodyGrad[0]}, ${p.bodyGrad[1]})`;
                const active = key === currentPillPal ? " active" : "";
                return `
                  <button type="button" class="vp-palette-card${active}" data-palette="${key}" role="option" aria-selected="${key === currentPillPal}">
                    <span class="vp-swatch" style="background: ${grad};" aria-hidden="true"></span>
                    <span class="vp-card-info">
                      <span class="vp-card-name">${p.name}</span>
                      <span class="vp-card-sub">${p.subtitle}</span>
                    </span>
                  </button>
                `;
              }).join("")}
            </div>
          </div>
        </div>

        <!-- ═════════ TAB 2: BOARD MODE ORB ═════════ -->
        <div id="vpBoardOrbPanel" class="vp-tab-panel"${activePickerTab === "board" ? "" : " hidden"}>
          <!-- 1. Hero Preview Stage -->
          <div class="vp-preview-stage">
            <div class="vp-preview-mount" id="voiceOrbHeroMount"></div>
            <p class="vp-preview-hint">3D Raymarched Fluid Sphere on whiteboard canvas</p>
          </div>

          <!-- 2. Test States -->
          <div class="vp-section">
            <div class="vp-section-header">
              <span class="vp-section-title">Test States</span>
              <span class="vp-section-sub">Tap state to preview fluid motion</span>
            </div>
            <div class="vp-expr-chips" id="vpOrbStateChips">
              <button type="button" class="vp-chip active" data-orb-state="idle">Idle</button>
              <button type="button" class="vp-chip" data-orb-state="listening">Listening</button>
              <button type="button" class="vp-chip" data-orb-state="thinking">Thinking</button>
              <button type="button" class="vp-chip" data-orb-state="speaking">Speaking</button>
            </div>
          </div>

          <!-- 3. Orb 3D Palettes -->
          <div class="vp-section">
            <div class="vp-section-header">
              <span class="vp-section-title">3D Fluid Themes</span>
              <span class="vp-section-sub">12 vibrant luminous philosophies</span>
            </div>
            <div class="vp-palette-grid" id="vpOrbPaletteGrid" role="listbox" aria-label="Voice orb themes">
              ${Object.keys(orbPals).map((key) => {
                const p = orbPals[key];
                const active = key === currentOrbTheme ? " active" : "";
                return `
                  <button type="button" class="vp-palette-card${active}" data-orb-theme="${key}" role="option" aria-selected="${key === currentOrbTheme}">
                    <span class="vp-swatch circle" style="background: ${orbSwatchGradient(p)};" aria-hidden="true"></span>
                    <span class="vp-card-info">
                      <span class="vp-card-name">${p.name || key}</span>
                      <span class="vp-card-sub">${p.subtitle || ""}</span>
                    </span>
                  </button>
                `;
              }).join("")}
            </div>
          </div>
        </div>
      </div>
    `;

    bindCustomizerEvents(mountHost);
  }

  function bindCustomizerEvents(mountHost) {
    const pillMount = mountHost.querySelector("#voicePillHeroMount");
    const orbMount = mountHost.querySelector("#voiceOrbHeroMount");

    // Mount active tab preview
    if (activePickerTab === "talk") {
      mountPillPreview(pillMount, mountHost);
    } else {
      mountOrbPreview(orbMount, mountHost);
    }

    // Tab buttons
    mountHost.querySelectorAll(".vp-mode-tab").forEach((tabBtn) => {
      tabBtn.addEventListener("click", () => {
        const tab = tabBtn.getAttribute("data-tab");
        if (tab === activePickerTab) return;
        activePickerTab = tab;

        mountHost.querySelectorAll(".vp-mode-tab").forEach((b) => {
          const isAct = b.getAttribute("data-tab") === tab;
          b.classList.toggle("active", isAct);
          b.setAttribute("aria-selected", isAct ? "true" : "false");
        });

        const talkPanel = mountHost.querySelector("#vpTalkPillPanel");
        const boardPanel = mountHost.querySelector("#vpBoardOrbPanel");
        if (talkPanel) talkPanel.hidden = (tab !== "talk");
        if (boardPanel) boardPanel.hidden = (tab !== "board");

        if (tab === "talk") {
          if (pickerOrb) { try { pickerOrb.destroy(); } catch {} pickerOrb = null; }
          mountPillPreview(pillMount, mountHost);
        } else {
          if (pickerPill) { try { pickerPill.destroy(); } catch {} pickerPill = null; }
          mountOrbPreview(orbMount, mountHost);
        }
        syncRunningOrbs();
      });
    });

    // ── Pill Tab Event Handlers ──
    mountHost.querySelectorAll("#vpEyeSelect .vp-eye-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const mode = btn.getAttribute("data-eye-mode");
        mountHost.querySelectorAll("#vpEyeSelect .vp-eye-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        setPillEyeColorMode(mode);
      });
    });

    mountHost.querySelectorAll("#vpExprChips .vp-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        const expr = btn.getAttribute("data-expr");
        mountHost.querySelectorAll("#vpExprChips .vp-chip").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        if (pickerPill) pickerPill.setExpression(expr);
      });
    });

    mountHost.querySelectorAll("#vpPillPaletteGrid .vp-palette-card").forEach((card) => {
      card.addEventListener("click", () => {
        const key = card.getAttribute("data-palette");
        mountHost.querySelectorAll("#vpPillPaletteGrid .vp-palette-card").forEach((c) => {
          c.classList.remove("active");
          c.setAttribute("aria-selected", "false");
        });
        card.classList.add("active");
        card.setAttribute("aria-selected", "true");
        setPillPalette(key);
      });
    });

    // ── Orb Tab Event Handlers ──
    mountHost.querySelectorAll("#vpOrbStateChips .vp-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        const stateName = btn.getAttribute("data-orb-state");
        mountHost.querySelectorAll("#vpOrbStateChips .vp-chip").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        if (pickerOrb) applyOrbPreset(pickerOrb, stateName);
      });
    });

    mountHost.querySelectorAll("#vpOrbPaletteGrid .vp-palette-card").forEach((card) => {
      card.addEventListener("click", () => {
        const key = card.getAttribute("data-orb-theme");
        mountHost.querySelectorAll("#vpOrbPaletteGrid .vp-palette-card").forEach((c) => {
          c.classList.remove("active");
          c.setAttribute("aria-selected", "false");
        });
        card.classList.add("active");
        card.setAttribute("aria-selected", "true");
        setOrbTheme(key);
      });
    });
  }

  function mountPillPreview(mountEl, parentHost) {
    if (!mountEl || typeof window.VoicePill !== "function") return;
    if (pickerPill) { try { pickerPill.destroy(); } catch {} pickerPill = null; }
    pickerPill = new window.VoicePill(mountEl, {
      width: 120,
      height: 74,
      palette: readPillPalette(),
      eyeColorMode: readPillEyeColor(),
      state: "idle",
      expression: "normal",
      trackPointer: true
    });

    const expressions = ["happy", "stars", "heart", "proud", "wink", "thinking", "normal"];
    let exprIdx = 0;
    mountEl.onclick = () => {
      if (!pickerPill) return;
      exprIdx = (exprIdx + 1) % expressions.length;
      const next = expressions[exprIdx];
      pickerPill.setExpression(next);
      parentHost.querySelectorAll("#vpExprChips .vp-chip").forEach((btn) => {
        btn.classList.toggle("active", btn.getAttribute("data-expr") === next);
      });
    };
  }

  function mountOrbPreview(mountEl) {
    if (!mountEl || typeof window.VoiceOrb !== "function") return;
    if (pickerOrb) { try { pickerOrb.destroy(); } catch {} pickerOrb = null; }
    pickerOrb = makeVoiceOrb(mountEl, {
      size: 110,
      showShadow: true,
      interactive: true,
      state: "idle"
    });
    applyOrbPreset(pickerOrb, "idle");
  }

  // ── Initialization & Public API ────────────────────────────────
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
    const activeKey = readPillPalette();
    if (window.VoicePill && typeof window.VoicePill.applyThemeTokens === "function") {
      window.VoicePill.applyThemeTokens(activeKey);
    }
  }

  window.Lumi6Orb = {
    // Talk Mode (VoicePill)
    mountTalkOrb,
    setTalkState,
    setTalkVoiceActive,
    setPalette: setPillPalette,
    getPalette: readPillPalette,
    setEyeColorMode: setPillEyeColorMode,
    getEyeColorMode: readPillEyeColor,
    palettes: getPillPalettes,

    // Board/Draw Mode (VoiceOrb)
    mountDrawOrb,
    setDrawBusy,
    refreshDrawOrb,
    setOrbTheme,
    getOrbTheme: readOrbTheme,
    orbPalettes: getOrbPalettes,

    // Shared & Navigation
    setActiveMode,
    setTheme: setPillPalette, // Backward-compat alias
    getTheme: readPillPalette, // Backward-compat alias
    mountThemePicker,
    destroyPicker,
    PILL_SIZE: 44
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
