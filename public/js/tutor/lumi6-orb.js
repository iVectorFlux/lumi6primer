/**
 * Voice Pill integration for Talk Mode, Draw Mode, and Profile Theme Customizer.
 * Backed by VoicePill with 8 curated vibrant gradient palettes, eye-styling, and facial expressions.
 */
(function () {
  const STORAGE_KEY = "lumi6VoicePillPalette";
  const EYE_COLOR_KEY = "lumi6VoicePillEyeColor";
  const DEFAULT_PALETTE = "amber";
  const DEFAULT_EYE_COLOR = "auto";

  let talkPill = null;
  let drawPill = null;
  let pickerPill = null;
  let talkState = "idle";
  let activeMode = "talk";
  const drawBusy = new Set();

  function getPalettes() {
    return window.VoicePill?.PALETTES || {
      amber: { name: 'Amber Ember', subtitle: 'Warm Spiced Cognac', bodyGrad: ['#f59e0b', '#b45309'], defaultEyeColor: 'black', accent: '#78350f' },
      violet: { name: 'Cyber Violet', subtitle: 'Electric Plum Indigo', bodyGrad: ['#a855f7', '#6b21a8'], defaultEyeColor: 'black', accent: '#581c87' },
      emerald: { name: 'Emerald Jade', subtitle: 'Lush Seafoam Forest', bodyGrad: ['#10b981', '#047857'], defaultEyeColor: 'black', accent: '#064e3b' },
      azure: { name: 'Ocean Azure', subtitle: 'Sky Sapphire Cobalt', bodyGrad: ['#0ea5e9', '#1d4ed8'], defaultEyeColor: 'black', accent: '#1e3a8a' },
      coral: { name: 'Sunset Coral', subtitle: 'Fiery Rose Peach', bodyGrad: ['#f43f5e', '#ea580c'], defaultEyeColor: 'black', accent: '#9f1239' },
      gunmetal: { name: 'Titanium Steel', subtitle: 'Brushed Silver Slate', bodyGrad: ['#94a3b8', '#475569'], defaultEyeColor: 'black', accent: '#1e293b' },
      obsidian: { name: 'Obsidian Slate', subtitle: 'Deep Graphite Dark', bodyGrad: ['#334155', '#0f172a'], defaultEyeColor: 'white', accent: '#38bdf8' },
      puredark: { name: 'Matte Carbon', subtitle: 'Minimalist Pitch Black', bodyGrad: ['#27272a', '#09090b'], defaultEyeColor: 'white', accent: '#ffffff' }
    };
  }

  function paletteKeys() {
    return Object.keys(getPalettes());
  }

  function readPalette() {
    try {
      const stored = String(localStorage.getItem(STORAGE_KEY) || "").trim().toLowerCase();
      if (stored && getPalettes()[stored]) return stored;
      // Graceful fallback from legacy orb theme
      const legacy = String(localStorage.getItem("lumi6OrbTheme") || "").trim().toLowerCase();
      if (legacy) {
        if (legacy.includes("coral") || legacy.includes("rose") || legacy.includes("peach")) return "coral";
        if (legacy.includes("emerald") || legacy.includes("forest") || legacy.includes("mint") || legacy.includes("sage")) return "emerald";
        if (legacy.includes("ocean") || legacy.includes("sky") || legacy.includes("azure") || legacy.includes("cobalt")) return "azure";
        if (legacy.includes("galaxy") || legacy.includes("plum") || legacy.includes("violet") || legacy.includes("aurora") || legacy.includes("amethyst")) return "violet";
        if (legacy.includes("slate") || legacy.includes("mono") || legacy.includes("silver")) return "gunmetal";
        if (legacy.includes("dark") || legacy.includes("night") || legacy.includes("black")) return "obsidian";
      }
    } catch {}
    return DEFAULT_PALETTE;
  }

  function savePalette(key) {
    try {
      localStorage.setItem(STORAGE_KEY, key);
      localStorage.setItem("lumi6OrbTheme", key);
    } catch {}
  }

  function readEyeColorMode() {
    try {
      const stored = String(localStorage.getItem(EYE_COLOR_KEY) || "").trim().toLowerCase();
      if (["auto", "black", "white"].includes(stored)) return stored;
    } catch {}
    return DEFAULT_EYE_COLOR;
  }

  function saveEyeColorMode(mode) {
    try {
      localStorage.setItem(EYE_COLOR_KEY, mode);
    } catch {}
  }

  function pausePill(pill) {
    if (pill && typeof pill.pause === "function") pill.pause();
  }

  function resumePill(pill) {
    if (pill && typeof pill.resume === "function") pill.resume();
  }

  function syncRunningPills() {
    if (document.hidden) {
      pausePill(talkPill);
      pausePill(drawPill);
      pausePill(pickerPill);
      return;
    }
    if (pickerPill) {
      resumePill(pickerPill);
      pausePill(talkPill);
      pausePill(drawPill);
      return;
    }
    if (activeMode === "talk") {
      resumePill(talkPill);
      pausePill(drawPill);
    } else if (activeMode === "draw") {
      resumePill(drawPill);
      pausePill(talkPill);
    } else {
      pausePill(talkPill);
      pausePill(drawPill);
    }
  }

  function setActiveMode(mode) {
    const next = mode === "draw" || mode === "sim" ? mode : "talk";
    activeMode = next;
    if (next === "talk") mountTalkOrb();
    if (next === "draw") mountDrawOrb();
    syncRunningPills();
  }

  function paintPill(pill) {
    if (!pill) return;
    const pal = readPalette();
    const eye = readEyeColorMode();
    pill.setPalette(pal);
    pill.setEyeColorMode(eye);
  }

  function paintAllPills() {
    paintPill(talkPill);
    paintPill(drawPill);
    paintPill(pickerPill);
  }

  function setPalette(key) {
    const pals = getPalettes();
    if (!pals[key]) return readPalette();
    savePalette(key);
    paintAllPills();
    return key;
  }

  function setEyeColorMode(mode) {
    if (!["auto", "black", "white"].includes(mode)) return readEyeColorMode();
    saveEyeColorMode(mode);
    paintAllPills();
    return mode;
  }

  function makePill(container, width, height, extra = {}) {
    if (!container || typeof window.VoicePill !== "function") return null;
    container.innerHTML = "";
    const pill = new window.VoicePill(container, Object.assign({
      width,
      height,
      palette: readPalette(),
      eyeColorMode: readEyeColorMode(),
      state: "idle",
      expression: "normal",
      trackPointer: true,
      showNoseOnSpeaking: true
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
    talkPill = makePill(host, 52, 34, {
      state: talkState,
      trackPointer: true
    });
    return talkPill;
  }

  function setTalkState(stateName) {
    const next = stateName === "listening" || stateName === "thinking" || stateName === "speaking" ? stateName : "idle";
    talkState = next;
    if (!talkPill) mountTalkOrb();
    if (talkPill) {
      talkPill.setState(next);
    }
  }

  function setTalkVoiceActive(active, holdMs = 280) {
    if (!talkPill) return;
    if (active) {
      talkPill.setAudioLevel(0.8);
      if (holdMs > 0) {
        setTimeout(() => {
          if (talkPill) talkPill.setAudioLevel(0.0);
        }, holdMs);
      }
    } else {
      talkPill.setAudioLevel(0.0);
    }
  }

  function mountDrawOrb() {
    const host = document.getElementById("drawVoiceOrb");
    if (!host || typeof window.VoicePill !== "function") return drawPill;
    if (drawPill && host.contains(drawPill.canvas)) {
      drawPill.setState(drawBusy.size ? "thinking" : "idle");
      return drawPill;
    }
    if (drawPill) {
      try { drawPill.destroy(); } catch {}
      drawPill = null;
    }
    drawPill = makePill(host, 66, 42, {
      state: drawBusy.size ? "thinking" : "idle",
      trackPointer: true
    });
    return drawPill;
  }

  function refreshDrawOrb() {
    return mountDrawOrb();
  }

  function setDrawBusy(busy, reason = "draw") {
    const key = String(reason || "draw");
    if (busy) drawBusy.add(key);
    else drawBusy.delete(key);
    if (!drawPill) mountDrawOrb();
    if (drawPill) {
      drawPill.setState(drawBusy.size ? "thinking" : "idle");
    }
  }

  function destroyPicker() {
    if (pickerPill) {
      try { pickerPill.destroy(); } catch {}
      pickerPill = null;
    }
    syncRunningPills();
  }

  function mountThemePicker(containerOrPreviewHost, legacyListHost, legacyFinishHost) {
    destroyPicker();
    const currentPal = readPalette();
    const currentEye = readEyeColorMode();
    const pals = getPalettes();

    let mountHost = containerOrPreviewHost;
    if (!mountHost) return;

    // Handle single container or legacy multi-host
    if (legacyListHost || !mountHost.classList.contains("voice-pill-customizer-host")) {
      const parent = mountHost.closest(".onboard-scroll") || mountHost.parentElement;
      if (parent && !parent.querySelector(".voice-pill-customizer")) {
        mountHost = parent;
      }
    }

    mountHost.innerHTML = `
      <div class="voice-pill-customizer">
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
            <button type="button" class="vp-eye-btn${currentEye === 'auto' ? ' active' : ''}" data-eye-mode="auto">
              <span class="vp-eye-dot auto"></span> Auto Contrast
            </button>
            <button type="button" class="vp-eye-btn${currentEye === 'black' ? ' active' : ''}" data-eye-mode="black">
              <span class="vp-eye-dot black"></span> Deep Black
            </button>
            <button type="button" class="vp-eye-btn${currentEye === 'white' ? ' active' : ''}" data-eye-mode="white">
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
            <button type="button" class="vp-chip" data-expr="ponder">Ponder 💭</button>
            <button type="button" class="vp-chip" data-expr="dizzy">Dizzy 🌀</button>
          </div>
        </div>

        <!-- 4. Palette Selection Grid -->
        <div class="vp-section">
          <div class="vp-section-header">
            <span class="vp-section-title">Curated Palettes</span>
            <span class="vp-section-sub">8 vibrant gradients</span>
          </div>
          <div class="vp-palette-grid" id="vpPaletteGrid" role="listbox" aria-label="Voice pill palettes">
            ${paletteKeys().map((key) => {
              const p = pals[key];
              const grad = `linear-gradient(135deg, ${p.bodyGrad[0]}, ${p.bodyGrad[1]})`;
              const active = key === currentPal ? " active" : "";
              return `
                <button type="button" class="vp-palette-card${active}" data-palette="${key}" role="option" aria-selected="${key === currentPal}">
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
    `;

    const heroMount = mountHost.querySelector("#voicePillHeroMount");
    if (heroMount && typeof window.VoicePill === "function") {
      pickerPill = new window.VoicePill(heroMount, {
        width: 120,
        height: 74,
        palette: currentPal,
        eyeColorMode: currentEye,
        state: "idle",
        expression: "normal",
        trackPointer: true
      });
      syncRunningPills();

      // Tap on hero preview cycles through fun reactions
      const expressions = ["happy", "stars", "heart", "proud", "wink", "normal"];
      let exprIndex = 0;
      heroMount.addEventListener("click", () => {
        if (!pickerPill) return;
        exprIndex = (exprIndex + 1) % expressions.length;
        const next = expressions[exprIndex];
        pickerPill.setExpression(next);
        mountHost.querySelectorAll("#vpExprChips .vp-chip").forEach((btn) => {
          btn.classList.toggle("active", btn.getAttribute("data-expr") === next);
        });
      });
    }

    // Bind eye color selector
    mountHost.querySelectorAll("#vpEyeSelect .vp-eye-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const mode = btn.getAttribute("data-eye-mode");
        mountHost.querySelectorAll("#vpEyeSelect .vp-eye-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        setEyeColorMode(mode);
        if (pickerPill) pickerPill.setEyeColorMode(mode);
      });
    });

    // Bind expression chips
    mountHost.querySelectorAll("#vpExprChips .vp-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        const expr = btn.getAttribute("data-expr");
        mountHost.querySelectorAll("#vpExprChips .vp-chip").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        if (pickerPill) pickerPill.setExpression(expr);
      });
    });

    // Bind palette cards
    mountHost.querySelectorAll("#vpPaletteGrid .vp-palette-card").forEach((card) => {
      card.addEventListener("click", () => {
        const key = card.getAttribute("data-palette");
        mountHost.querySelectorAll("#vpPaletteGrid .vp-palette-card").forEach((c) => {
          c.classList.remove("active");
          c.setAttribute("aria-selected", "false");
        });
        card.classList.add("active");
        card.setAttribute("aria-selected", "true");
        setPalette(key);
        if (pickerPill) pickerPill.setPalette(key);

        // If dark theme (obsidian or puredark) on auto eye mode, refresh preview
        if (readEyeColorMode() === "auto" && pickerPill) {
          pickerPill.setEyeColorMode("auto");
        }
      });
    });
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
    document.addEventListener("visibilitychange", syncRunningPills);
  }

  window.Lumi6Orb = {
    mountTalkOrb,
    mountDrawOrb,
    setTalkState,
    setTalkVoiceActive,
    setDrawBusy,
    refreshDrawOrb,
    setActiveMode,
    setPalette,
    getPalette: readPalette,
    setTheme: setPalette,
    getTheme: readPalette,
    setEyeColorMode,
    getEyeColorMode: readEyeColorMode,
    palettes: getPalettes,
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
