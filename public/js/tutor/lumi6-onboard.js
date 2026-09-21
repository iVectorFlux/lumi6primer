/**
 * Kids/teen onboarding + learner profile for Lumi6.
 */
(function () {
  "use strict";

  const INTERESTS = [
    { id: "science", label: "Science" },
    { id: "math", label: "Math" },
    { id: "space", label: "Space" },
    { id: "animals", label: "Animals" },
    { id: "stories", label: "Stories" },
    { id: "coding", label: "Coding" },
    { id: "history", label: "History" },
    { id: "art", label: "Art" },
    { id: "sports", label: "Sports" },
    { id: "music", label: "Music" }
  ];
  const CLASSES = ["3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
  const CLASS_AGE = { 3: 8, 4: 9, 5: 10, 6: 11, 7: 12, 8: 13, 9: 14, 10: 15, 11: 16, 12: 17 };

  const state = {
    step: 1,
    name: "",
    grade: "",
    interests: [],
    profile: null,
    ready: false,
    editingFromProfile: false
  };

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function normalizeInterests(list) {
    const byId = Object.fromEntries(INTERESTS.map((item) => [item.id, item.label]));
    const byLabel = Object.fromEntries(INTERESTS.map((item) => [item.label.toLowerCase(), item.label]));
    const seen = new Set();
    return (Array.isArray(list) ? list : [])
      .map((item) => byId[item] || byLabel[String(item || "").toLowerCase()] || "")
      .filter((label) => {
        if (!label || seen.has(label)) return false;
        seen.add(label);
        return true;
      });
  }

  function setEditingFromProfile(on) {
    state.editingFromProfile = Boolean(on);
    try {
      if (on) sessionStorage.setItem("lumi6EditProfile", "1");
      else sessionStorage.removeItem("lumi6EditProfile");
    } catch {}
  }

  function isEditingFromProfile() {
    if (state.editingFromProfile) return true;
    try { return sessionStorage.getItem("lumi6EditProfile") === "1"; } catch { return false; }
  }

  function client() {
    return window.supabaseAuth?.supabase || null;
  }

  function configured() {
    const cfg = window.LUMI6_CONFIG || {};
    return Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey);
  }

  function readLocal() {
    try {
      const raw = localStorage.getItem("primerProfile");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function saveLocal(profile) {
    if (!profile) return;
    try {
      localStorage.setItem("primerProfile", JSON.stringify(profile));
      if (profile.id) localStorage.setItem("primerChildId", profile.id);
      if (profile.name) localStorage.setItem("primerChildName", profile.name);
    } catch {}
    state.profile = profile;
    window.dispatchEvent(new CustomEvent("lumi6-profile", { detail: profile }));
  }

  function childPayload() {
    const profile = state.profile || readLocal() || {};
    return {
      name: profile.name || undefined,
      grade: profile.grade || undefined,
      age_years: profile.age_years || undefined,
      interests: Array.isArray(profile.interests) ? profile.interests : undefined,
      onboarded_at: profile.onboarded_at || undefined
    };
  }

  async function authHeaders() {
    const headers = {};
    const sb = client();
    if (!sb) return headers;
    try {
      const { data } = await sb.auth.getSession();
      const token = data?.session?.access_token;
      if (token) headers.Authorization = `Bearer ${token}`;
    } catch {}
    return headers;
  }

  async function currentUser(retries = 1) {
    for (let i = 0; i < retries; i += 1) {
      const sb = client();
      if (sb) {
        try {
          const { data } = await sb.auth.getSession();
          if (data?.session?.user) return data.session.user;
        } catch {}
      }
      if (i < retries - 1) await sleep(80);
    }
    return null;
  }

  async function loadRemoteProfile() {
    const sb = client();
    const user = await currentUser(8);
    if (!sb || !user) return null;
    const { data, error } = await sb.from("users").select("*").eq("user_id", user.id).maybeSingle();
    if (error) {
      console.warn("[Lumi6] profile load failed:", error.message);
      return null;
    }
    return data || null;
  }

  async function saveRemoteProfile(fields) {
    const sb = client();
    const user = await currentUser(8);
    if (!sb || !user) throw new Error("Sign in first.");
    const grade = String(fields.grade || "").replace(/^class\s+/i, "");
    const row = {
      user_id: user.id,
      name: String(fields.name || "Learner").trim().slice(0, 40) || "Learner",
      grade,
      age_years: CLASS_AGE[grade] || null,
      interests: normalizeInterests(fields.interests),
      onboarded_at: new Date().toISOString()
    };
    const existing = await loadRemoteProfile();
    let saved;
    if (existing?.id) {
      const { data, error } = await sb.from("users").update(row).eq("id", existing.id).select("*").single();
      if (error) throw error;
      saved = data;
    } else {
      const { data, error } = await sb.from("users").insert(row).select("*").single();
      if (error) throw error;
      saved = data;
    }
    saveLocal(saved);
    return saved;
  }

  function overlay() {
    return document.getElementById("lumi6Onboard");
  }

  function showOverlay() {
    const el = overlay();
    if (!el) return;
    el.hidden = false;
    renderStep();
  }

  function hideOverlay() {
    const el = overlay();
    if (el) el.hidden = true;
  }

  function renderStep() {
    const root = document.getElementById("lumi6OnboardBody");
    if (!root) return;
    const dots = [1, 2, 3].map((n) => `<i class="${n === state.step ? "on" : ""}"></i>`).join("");
    if (state.step === 1) {
      root.innerHTML = `
        <div class="onboard-scroll">
          <p class="onboard-kicker">Step 1 of 3</p>
          <h2>What should I call you?</h2>
          <p class="onboard-lead">A first name is perfect. Nicknames are welcome.</p>
          <label class="onboard-field">
            <span>Your name</span>
            <input id="onboardName" type="text" maxlength="40" autocomplete="nickname" placeholder="e.g. Aanya" value="${escapeAttr(state.name)}">
          </label>
        </div>
        <div class="onboard-actions">
          ${isEditingFromProfile() ? `<button type="button" class="onboard-back" data-onboard="cancel-edit">Cancel</button>` : ""}
          <button type="button" class="onboard-next" data-onboard="next">That's me</button>
        </div>
        <div class="onboard-dots">${dots}</div>`;
      document.getElementById("onboardName")?.focus();
      return;
    }
    if (state.step === 2) {
      root.innerHTML = `
        <div class="onboard-scroll">
          <p class="onboard-kicker">Step 2 of 3</p>
          <h2>Which class are you in?</h2>
          <p class="onboard-lead">This helps me keep examples at your level.</p>
          <div class="onboard-chips" role="listbox" aria-label="Class">
            ${CLASSES.map((n) => `<button type="button" class="onboard-chip ${state.grade === n ? "selected" : ""}" data-grade="${n}">Class ${n}</button>`).join("")}
          </div>
        </div>
        <div class="onboard-actions">
          <button type="button" class="onboard-back" data-onboard="back">Back</button>
          <button type="button" class="onboard-next" data-onboard="next">Next</button>
        </div>
        <div class="onboard-dots">${dots}</div>`;
      return;
    }
    root.innerHTML = `
      <div class="onboard-scroll">
        <p class="onboard-kicker">Step 3 of 3</p>
        <h2>What do you like?</h2>
        <p class="onboard-lead">Pick a few. I will remember these for later.</p>
        <div class="onboard-chips" role="group" aria-label="Interests">
          ${INTERESTS.map((item) => `<button type="button" class="onboard-chip ${state.interests.includes(item.label) ? "selected" : ""}" data-interest="${item.label}">${item.label}</button>`).join("")}
        </div>
      </div>
      <div class="onboard-actions">
        <button type="button" class="onboard-back" data-onboard="back">Back</button>
        <button type="button" class="onboard-next" data-onboard="finish">${isEditingFromProfile() ? "Save profile" : "Let's go"}</button>
      </div>
      <div class="onboard-dots">${dots}</div>`;
  }

  function showOnboardError(message) {
    const notice = document.getElementById("onboardNotice");
    if (!notice) return;
    notice.hidden = !message;
    notice.textContent = message || "";
  }

  function escapeAttr(value) {
    return String(value || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  }

  function visualBandLabel(grade) {
    const n = Number(String(grade || "").replace(/^[^\d]*/, "").replace(/[^\d].*$/, ""));
    if (n >= 3 && n <= 5) return "Cartoon, kid-friendly pictures";
    if (n >= 6 && n <= 10) return "Textbook-style drawings";
    if (n >= 11) return "Clean educational graphics";
    return "Pictures that match your class";
  }

  function profilePanel() {
    return document.getElementById("lumi6ProfilePanel");
  }

  function closeProfilePanel() {
    const el = profilePanel();
    if (window.Lumi6Orb) window.Lumi6Orb.destroyPicker();
    if (el) el.hidden = true;
  }

  function fillFromProfile(profile) {
    state.name = profile?.name || "";
    state.grade = String(profile?.grade || "").replace(/^class\s+/i, "");
    state.interests = normalizeInterests(profile?.interests);
  }

  function openEditFromProfile() {
    fillFromProfile(state.profile || readLocal() || {});
    setEditingFromProfile(true);
    state.step = 1;
    closeProfilePanel();
    showOnboardError("");
    showOverlay();
  }

  function bindProfilePanel() {
    const el = profilePanel();
    if (!el || el.dataset.bound) return;
    el.dataset.bound = "1";
    el.addEventListener("click", (event) => {
      if (event.target === el) {
        closeProfilePanel();
        return;
      }
      const action = event.target.closest("[data-profile]")?.dataset.profile;
      if (action === "close") closeProfilePanel();
      if (action === "edit") openEditFromProfile();
      if (action === "theme") renderThemeChooser();
      if (action === "theme-back") {
        if (window.Lumi6Orb) window.Lumi6Orb.destroyPicker();
        renderProfileBody(window.supabaseAuth?.user || null, state.profile || readLocal() || {});
      }
      const autoBtn = event.target.closest("#profileAutoToggle");
      if (autoBtn) {
        const current = autoBtn.classList.contains("on");
        const next = !current;
        autoBtn.classList.toggle("on", next);
        autoBtn.setAttribute("aria-checked", String(next));
        if (window.Lumi6AppSettings?.setAuto) {
          window.Lumi6AppSettings.setAuto(next);
        } else {
          try { localStorage.setItem("lumi6-auto", String(next)); } catch {}
          const mainToggle = document.querySelector("#settingsAutoToggle");
          if (mainToggle) {
            mainToggle.classList.toggle("on", next);
            mainToggle.setAttribute("aria-checked", String(next));
          }
        }
      }
      const summonBtn = event.target.closest("#profileSummonToggle");
      if (summonBtn) {
        const current = summonBtn.classList.contains("on");
        const next = !current;
        summonBtn.classList.toggle("on", next);
        summonBtn.setAttribute("aria-checked", String(next));
        if (window.Lumi6AppSettings?.setSummonEnabled) {
          window.Lumi6AppSettings.setSummonEnabled(next);
        } else {
          try { localStorage.setItem("lumi6-summon-enabled", String(next)); } catch {}
          const mainToggle = document.querySelector("#summonToggle");
          if (mainToggle) {
            mainToggle.classList.toggle("on", next);
            mainToggle.setAttribute("aria-checked", String(next));
          }
        }
      }
    });

    el.addEventListener("change", (event) => {
      if (event.target?.id === "profileAiFont") {
        const val = event.target.value;
        if (window.Lumi6AppSettings?.setAiFont) {
          window.Lumi6AppSettings.setAiFont(val);
        } else {
          try { localStorage.setItem("lumi6-ai-font", val); } catch {}
          const mainSelect = document.querySelector("#aiFont");
          if (mainSelect) mainSelect.value = val;
        }
      }
    });
  }

  function renderProfileBody(user, profile) {
    const body = document.getElementById("lumi6ProfileBody");
    if (!body) return;
    const email = user?.email || "";
    const name = profile?.name || "Learner";
    const grade = String(profile?.grade || "").replace(/^class\s+/i, "");
    const interests = normalizeInterests(profile?.interests);
    const autoOn = window.Lumi6AppSettings?.getAuto ? window.Lumi6AppSettings.getAuto() : (localStorage.getItem("lumi6-auto") !== "false");
    const summonOn = window.Lumi6AppSettings?.getSummonEnabled ? window.Lumi6AppSettings.getSummonEnabled() : (localStorage.getItem("lumi6-summon-enabled") !== "false");
    const currentFont = window.Lumi6AppSettings?.getAiFont ? window.Lumi6AppSettings.getAiFont() : (localStorage.getItem("lumi6-ai-font") || '"Patrick Hand", "Segoe Print", "Comic Sans MS", cursive');

    body.innerHTML = `
      <div class="onboard-scroll">
        <div class="profile-head">
          <p class="onboard-kicker">Learner Profile</p>
          <button type="button" class="profile-close" data-profile="close" aria-label="Close">&times;</button>
        </div>
        <h2 id="profileTitle">${escapeAttr(name)}</h2>
        <p class="onboard-lead">Personalized for your learning level and interests.</p>
        <dl class="profile-facts">
          <div><dt>Class</dt><dd>${grade ? `Class ${escapeAttr(grade)}` : "Not set"}</dd></div>
          <div><dt>Account</dt><dd>${escapeAttr(email) || "Signed in"}</dd></div>
          <div class="fact-full"><dt>Interests</dt><dd>${interests.length ? escapeAttr(interests.join(", ")) : "All topics"}</dd></div>
        </dl>

        <section class="profile-settings-group" aria-label="AI Settings">
          <h3 class="profile-settings-title">Settings</h3>
          <div class="profile-settings-row">
            <span class="profile-settings-label">Auto AI</span>
            <button id="profileAutoToggle" class="settings-switch${autoOn ? " on" : ""}" type="button" role="switch" aria-checked="${autoOn}"><span class="settings-switch-thumb" aria-hidden="true"></span></button>
          </div>
          <div class="profile-settings-row">
            <label class="profile-settings-label" for="profileAiFont">AI font</label>
            <select id="profileAiFont" class="profile-settings-select" aria-label="AI font">
              <option value='"Patrick Hand", "Segoe Print", "Comic Sans MS", cursive' ${currentFont.includes("Patrick") ? "selected" : ""}>Handwritten</option>
              <option value='"Lora", Georgia, "Times New Roman", serif' ${currentFont.includes("Lora") ? "selected" : ""}>Storybook (Lora)</option>
            </select>
          </div>
          <div class="profile-settings-row">
            <span class="profile-settings-label">Show while AI thinks</span>
            <button id="profileSummonToggle" class="settings-switch${summonOn ? " on" : ""}" type="button" role="switch" aria-checked="${summonOn}"><span class="settings-switch-thumb" aria-hidden="true"></span></button>
          </div>
        </section>

        <button type="button" class="onboard-back orb-theme-open" data-profile="theme">Choose Voice Theme</button>
      </div>
      <div class="onboard-actions">
        <button type="button" class="onboard-back" data-profile="close">Done</button>
        <button type="button" class="onboard-next" data-profile="edit">Edit Profile</button>
      </div>`;
  }

  function renderThemeChooser() {
    const body = document.getElementById("lumi6ProfileBody");
    if (!body) return;
    if (window.Lumi6Orb) window.Lumi6Orb.destroyPicker();
    body.innerHTML = `
      <div class="onboard-scroll">
        <div class="profile-head">
          <p class="onboard-kicker">AI Character</p>
          <button type="button" class="profile-close" data-profile="theme-back" aria-label="Back">&times;</button>
        </div>
        <h2 id="profileTitle">Voice Pill Theme</h2>
        <p class="onboard-lead">Customize gradient colors, eye styling, and reactions for your AI tutor.</p>
        <div class="voice-pill-customizer-host" id="voicePillCustomizerHost"></div>
      </div>
      <div class="onboard-actions">
        <button type="button" class="onboard-next" data-profile="theme-back">Done</button>
      </div>`;
    if (window.Lumi6Orb) {
      window.Lumi6Orb.mountThemePicker(
        document.getElementById("voicePillCustomizerHost")
      );
    }
  }

  async function openProfilePanel() {
    const el = profilePanel();
    if (!el) return;
    bindProfilePanel();
    hideOverlay();
    const local = state.profile || readLocal() || {};
    renderProfileBody(window.supabaseAuth?.user || null, local);
    el.hidden = false;
    const user = await currentUser(6);
    const remote = await loadRemoteProfile();
    if (document.getElementById("orbThemeList")) return;
    if (remote) {
      saveLocal(remote);
      renderProfileBody(user, remote);
    } else {
      renderProfileBody(user, local);
    }
  }

  async function finish() {
    const returnToProfile = isEditingFromProfile();
    const btn = document.querySelector("[data-onboard='finish']");
    if (btn) btn.disabled = true;
    showOnboardError("");
    try {
      await saveRemoteProfile({
        name: state.name,
        grade: state.grade,
        interests: state.interests
      });
      setEditingFromProfile(false);
      hideOverlay();
      if (returnToProfile) await openProfilePanel();
    } catch (err) {
      showOnboardError(err.message || "Could not save your profile. Try again.");
      if (btn) btn.disabled = false;
    }
  }

  function bindOverlay() {
    const el = overlay();
    if (!el || el.dataset.bound) return;
    el.dataset.bound = "1";
    el.addEventListener("click", (event) => {
      const grade = event.target.closest("[data-grade]")?.dataset.grade;
      if (grade) {
        state.grade = grade;
        showOnboardError("");
        renderStep();
        return;
      }
      const interest = event.target.closest("[data-interest]")?.dataset.interest;
      if (interest) {
        state.interests = state.interests.includes(interest)
          ? state.interests.filter((item) => item !== interest)
          : [...state.interests, interest].slice(0, 8);
        showOnboardError("");
        renderStep();
        return;
      }
      const action = event.target.closest("[data-onboard]")?.dataset.onboard;
      if (action === "cancel-edit") {
        setEditingFromProfile(false);
        hideOverlay();
        openProfilePanel();
        return;
      }
      if (action === "back") {
        showOnboardError("");
        state.step = Math.max(1, state.step - 1);
        renderStep();
      } else if (action === "next") {
        if (state.step === 1) {
          state.name = String(document.getElementById("onboardName")?.value || "").trim();
          if (state.name.length < 2) {
            showOnboardError("Type your name first.");
            return;
          }
        }
        if (state.step === 2 && !state.grade) {
          showOnboardError("Pick your class.");
          return;
        }
        showOnboardError("");
        state.step += 1;
        renderStep();
      } else if (action === "finish") {
        if (!state.interests.length) {
          showOnboardError("Pick at least one thing you like.");
          return;
        }
        finish();
      }
    });
    el.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && state.step === 1) {
        event.preventDefault();
        el.querySelector("[data-onboard='next']")?.click();
      }
    });
  }

  async function gateCanvas() {
    const path = window.location.pathname;
    if (path === "/" || path === "/login" || path.endsWith("/login") || path.endsWith("login.html") || path.endsWith("landing.html")) return;

    // Wait for supabaseAuth controller to initialize if available
    for (let i = 0; i < 50 && !window.supabaseAuth?._sessionReady; i += 1) {
      await sleep(50);
    }

    bindOverlay();
    const user = (await currentUser(15)) || window.supabaseAuth?.user || null;

    if (!user) {
      window.location.replace("/login");
      return;
    }

    if (user) {
      const profile = await loadRemoteProfile();
      if (profile?.onboarded_at || (profile?.name && profile.name !== "Learner")) {
        saveLocal(profile);
        hideOverlay();
        state.ready = true;
        if (isEditingFromProfile()) await openProfilePanel();
        return;
      }
    }

    const local = readLocal();
    if (local?.onboarded_at) {
      hideOverlay();
      state.ready = true;
      return;
    }

    const initialProfile = local || { name: user.email?.split("@")[0] || "Learner" };
    fillFromProfile(initialProfile);
    showOverlay();
    state.ready = true;
  }

  window.Lumi6Profile = {
    get: () => state.profile || readLocal(),
    childPayload,
    authHeaders,
    configured,
    openPanel: openProfilePanel
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", gateCanvas);
  } else {
    gateCanvas();
  }
})();
