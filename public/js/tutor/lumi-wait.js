(function () {
  const COPY = {
    think: {
      title: "Looking this up",
      line: "Then we will walk through it together."
    },
    visual: {
      title: "Putting the picture together",
      line: "The idea is coming into focus."
    }
  };

  function copyFor(kind) {
    return COPY[kind] || COPY.think;
  }

  function lottieApi() {
    return window.lottie || window.bodymovin || null;
  }

  function animationData() {
    return window.__LUMI_WAIT_ANIMATION || null;
  }

  function waitHtml(kind) {
    const { title, line } = copyFor(kind);
    return `
      <div class="lumi-wait" data-lumi-wait="${kind === "visual" ? "visual" : "think"}">
        <div class="lumi-wait-stage" aria-hidden="true">
          <div class="lumi-wait-fallback"></div>
          <div class="lumi-wait-lottie"></div>
        </div>
        <p class="lumi-wait-title">${title}</p>
        <p class="lumi-wait-line">${line}</p>
      </div>`;
  }

  function destroyWaiters(root) {
    const scope = root || document;
    scope.querySelectorAll(".lumi-wait-lottie").forEach((el) => {
      if (el._lumiAnim) {
        try { el._lumiAnim.destroy(); } catch {}
        el._lumiAnim = null;
      }
      delete el.dataset.mounted;
    });
  }

  function play(el, data) {
    const api = lottieApi();
    if (!api || !data || el.dataset.mounted) return false;
    el.dataset.mounted = "1";
    try {
      el._lumiAnim = api.loadAnimation({
        container: el,
        renderer: "svg",
        loop: true,
        autoplay: true,
        animationData: JSON.parse(JSON.stringify(data))
      });
      el.closest(".lumi-wait")?.classList.add("is-ready");
      return true;
    } catch (err) {
      delete el.dataset.mounted;
      return false;
    }
  }

  function mountWaiters(root) {
    const scope = root || document;
    const nodes = [...scope.querySelectorAll(".lumi-wait-lottie:not([data-mounted])")];
    if (!nodes.length) return;
    const data = animationData();
    const api = lottieApi();
    if (!api || !data) {
      setTimeout(() => mountWaiters(scope), 60);
      return;
    }
    nodes.forEach((el) => play(el, data));
  }

  function showTalkWait() {
    hideTalkWait();
  }

  function hideTalkWait() {
    const el = document.getElementById("talkWait");
    if (!el) return;
    destroyWaiters(el);
    el.innerHTML = "";
    el.hidden = true;
    el.classList.remove("is-on");
  }

  window.lumiWaitHtml = waitHtml;
  window.mountLumiWaiters = mountWaiters;
  window.destroyLumiWaiters = destroyWaiters;
  window.showTalkWait = showTalkWait;
  window.hideTalkWait = hideTalkWait;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      const el = document.getElementById("talkWait");
      if (el && !el.hidden) mountWaiters(el);
    });
  }
})();
