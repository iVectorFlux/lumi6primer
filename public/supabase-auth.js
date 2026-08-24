/**
 * Supabase Authentication Module for ATLAS
 */
(function () {
  "use strict";

  class SupabaseAuthController {
    constructor() {
      this.supabase = null;
      this.user = null;
      this.session = null;
      this.elements = {};
      this._sessionReady = false;
      this._eventsBound = false;
      this._signingOut = false;

      this.init();
    }

    async init() {
      this.initSupabaseClient();
      this.cacheElements();
      this.bindEvents();

      if (this.supabase) {
        try {
          const { data } = await this.supabase.auth.getSession();
          this._sessionReady = true;
          this.handleSessionChange(data?.session, { allowKick: false });

          this.supabase.auth.onAuthStateChange((event, session) => {
            if (event === "INITIAL_SESSION") return;
            if (event === "SIGNED_OUT") {
              if (this._signingOut) this.handleSessionChange(null, { allowKick: true });
              return;
            }
            if (session) this.handleSessionChange(session, { allowKick: false });
          });
          window.addEventListener("lumi6-profile", () => this.renderUserBadge());
        } catch (err) {
          console.warn("Supabase auth session check failed:", err.message);
          this._sessionReady = true;
        }
      } else {
        this._sessionReady = true;
      }
    }

    /**
     * Read Supabase URL & Anon Key strictly from application config or environment.
     * No user-facing credential inputs or local storage configuration.
     */
    initSupabaseClient() {
      const config = window.LUMI6_CONFIG || {};
      const envUrl = typeof process !== "undefined" && process.env ? process.env.SUPABASE_URL : null;
      const envKey = typeof process !== "undefined" && process.env ? (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY) : null;

      const url = config.supabaseUrl || envUrl;
      const key = config.supabaseAnonKey || envKey;

      if (window.supabase && url && key) {
        try {
          this.supabase = window.supabase.createClient(url, key, {
            auth: {
              persistSession: true,
              autoRefreshToken: true,
              detectSessionInUrl: false,
              storage: window.localStorage
            }
          });
        } catch (e) {
          console.warn("Failed to create Supabase client:", e.message);
        }
      }
    }

    cacheElements() {
      this.elements = {
        modal: document.getElementById("supabaseAuthModal"),
        modalClose: document.getElementById("authModalClose"),
        tabs: Array.from(document.querySelectorAll(".auth-tab")),
        panels: Array.from(document.querySelectorAll(".auth-panel")),
        loginForm: document.getElementById("authLoginForm"),
        notice: document.getElementById("authNotice"),
        userAuthContainer: document.getElementById("userAuthContainer"),
        submitButton: document.querySelector("#authLoginForm button[type='submit']")
      };
    }

    isLandingPage() {
      const path = window.location.pathname;
      return path === "/" || path === "/login" || path.endsWith("/login") || path.endsWith("login.html") || path.endsWith("landing.html");
    }

    bindEvents() {
      if (this._eventsBound) return;
      this._eventsBound = true;
      document.addEventListener("click", (e) => {
        const target = e.target.closest("button, a, .auth-tab");
        if (!target) return;

        if (target.id === "navLoginBtn" || target.id === "heroLoginBtn" || target.id === "topbarSignInBtn") {
          e.preventDefault();
          this.openAuthModal("login");
        } else if (target.id === "authModalClose") {
          e.preventDefault();
          this.closeAuthModal();
        } else if (target.id === "userLogoutBtn") {
          e.preventDefault();
          this.signOut();
        }
      });

      document.addEventListener("click", (e) => {
        if (e.target.closest("#userLogoutBtn")) return;
        if (e.target.closest("#openProfileCard")) {
          e.preventDefault();
          if (typeof window.Lumi6Profile?.openPanel === "function") window.Lumi6Profile.openPanel();
        }
      });
      document.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        if (e.target?.id !== "openProfileCard") return;
        e.preventDefault();
        if (typeof window.Lumi6Profile?.openPanel === "function") window.Lumi6Profile.openPanel();
      });

      document.addEventListener("click", (e) => {
        const modal = document.getElementById("supabaseAuthModal");
        if (modal && e.target === modal) {
          this.closeAuthModal();
        }
      });

      document.addEventListener("submit", (e) => {
        if (e.target.id === "authLoginForm") this.handleLogin(e);
      });
    }

    switchTab(tabId) {
      this.clearNotice();
      const tabs = Array.from(document.querySelectorAll(".auth-tab"));
      const panels = Array.from(document.querySelectorAll(".auth-panel"));

      tabs.forEach(t => t.classList.toggle("active", t.dataset.tab === tabId));
      panels.forEach(p => {
        const isMatch = p.id.toLowerCase().includes(tabId.toLowerCase());
        p.hidden = !isMatch;
        p.style.display = isMatch ? "flex" : "none";
      });
    }

    openAuthModal(initialTab = "login") {
      this.cacheElements();
      const modal = document.getElementById("supabaseAuthModal");
      if (modal) {
        this.switchTab(initialTab);
        modal.hidden = false;
        modal.setAttribute("open", "");
        modal.style.display = "flex";
      }
    }

    closeAuthModal() {
      const modal = document.getElementById("supabaseAuthModal");
      if (modal) {
        modal.hidden = true;
        modal.removeAttribute("open");
        modal.style.display = "none";
      }
    }

    showNotice(message, type = "error") {
      const notice = document.getElementById("authNotice");
      if (notice) {
        const base = notice.classList.contains("login-notice") || this.isLandingPage() ? "login-notice" : "auth-notice";
        notice.textContent = message;
        notice.className = `${base} ${type}`;
        notice.hidden = false;
        notice.style.display = "block";
      }
    }

    clearNotice() {
      const notice = document.getElementById("authNotice");
      if (notice) {
        notice.hidden = true;
        notice.style.display = "none";
        notice.textContent = "";
      }
    }

    handleSessionChange(session, options = {}) {
      const allowKick = Boolean(options.allowKick);
      this.session = session;
      this.user = session ? session.user : null;
      const localName = localStorage.getItem("primerChildName") || localStorage.getItem("primerProfile");
      const localId = localStorage.getItem("primerChildId");
      const isAuthenticated = Boolean(this.user || localName || localId);

      if (isAuthenticated && this.isLandingPage()) {
        window.location.replace("/dashboard");
        return;
      }
      if (!isAuthenticated && !this.isLandingPage() && (allowKick || this._signingOut)) {
        window.location.replace("/login");
        return;
      }
      this.renderUserBadge();
    }

    renderUserBadge() {
      const container = document.getElementById("userAuthContainer");
      if (!container) return;

      const localName = localStorage.getItem("primerChildName");
      if (this.user || localName) {
        const display = localName || (this.user?.email ? this.user.email.split("@")[0] : "Student");
        const initial = String(display).charAt(0).toUpperCase();
        container.innerHTML = `
          <div class="sidebar-user-card" id="openProfileCard" role="button" tabindex="0" title="Open profile">
            <div class="sidebar-user-avatar">${initial}</div>
            <div class="sidebar-user-info">
              <span class="sidebar-user-name" title="${display}">${display}</span>
              <span class="sidebar-user-role">Student</span>
            </div>
            <button id="userLogoutBtn" type="button" class="sidebar-user-chevron" title="Logout" aria-label="Logout">
              <svg viewBox="0 0 24 24" aria-hidden="true" style="width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2;"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
            </button>
          </div>
        `;
      } else {
        container.innerHTML = `
          <button id="topbarSignInBtn" class="nav-item" type="button" style="width:100%;justify-content:flex-start;">
            <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span>Login</span>
          </button>
        `;
      }
    }

    async handleLogin(e) {
      e.preventDefault();
      this.clearNotice();

      const email = document.getElementById("loginEmail")?.value?.trim();
      const password = document.getElementById("loginPassword")?.value?.trim();
      const submitButton = e.target.querySelector("button[type='submit']");
      if (submitButton) submitButton.disabled = true;

      try {
        if (this.supabase) {
          const { error } = await this.supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
        } else {
          // Local offline auth fallback
          if (!email) throw new Error("Please enter an email address.");
          const displayName = email.split("@")[0];
          localStorage.setItem("primerChildName", displayName);
          localStorage.setItem("primerChildId", "local-" + Date.now());
        }

        this.showNotice("Signed in successfully.", "success");
        if (this.isLandingPage()) {
          window.location.replace("/dashboard");
          return;
        }
        this.renderUserBadge();
        setTimeout(() => this.closeAuthModal(), 500);
      } catch (err) {
        this.showNotice(err.message || "Could not sign in.", "error");
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
    }

    async signOut() {
      this._signingOut = true;
      if (this.supabase) {
        try { await this.supabase.auth.signOut(); } catch (e) {}
      }
      try {
        localStorage.removeItem("primerChildId");
        localStorage.removeItem("primerChildName");
        localStorage.removeItem("primerProfile");
        localStorage.removeItem("primerSessionId");
      } catch {}
      this.user = null;
      this.session = null;
      this.renderUserBadge();
      window.location.replace("/login");
    }
  }

  const controller = new SupabaseAuthController();
  window.supabaseAuth = controller;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      controller.cacheElements();
      controller.bindEvents();
      controller.renderUserBadge();
    });
  }
})();
