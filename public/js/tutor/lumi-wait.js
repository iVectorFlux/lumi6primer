(function () {
  const SRC = "/assets/lottie/lumi-wait.json";
  const COPY = {
    think: {
      title: "Lumi6 is gathering the pieces",
      line: "Looking it up, then we will walk through it together."
    },
    visual: {
      title: "Lumi6 is putting the picture together",
      line: "The idea is coming into focus."
    }
  };
  let animationData = null;
  let loadingData = null;

  function copyFor(kind) {
    return COPY[kind] || COPY.think;
  }

  function lottieApi() {
    return window.lottie || window.bodymovin || null;
  }

  function waitHtml(kind) {
    const { title, line } = copyFor(kind);
    return `
      <div class="lumi-wait" data-lumi-wait="${kind === "visual" ? "visual" : "think"}">
        <div class="lumi-wait-stage" aria-hidden="true">
          <div class="lumi-wait-fallback"></div>
          <div class="lumi-wait-lottie" data-lottie="${SRC}"></div>
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

  function loadData() {
    if (animationData) return Promise.resolve(animationData);
    if (loadingData) return loadingData;
    loadingData = fetch(SRC, { credentials: "same-origin" })
      .then((res) => {
        if (!res.ok) throw new Error("lottie missing");
        return res.json();
      })
      .then((data) => {
        animationData = data;
        return data;
      })
      .catch((err) => {
        loadingData = null;
        throw err;
      });
    return loadingData;
  }

  function play(el, data) {
    const api = lottieApi();
    if (!api || !data || el.dataset.mounted) return;
    el.dataset.mounted = "1";
    try {
      el._lumiAnim = api.loadAnimation({
        container: el,
        renderer: "svg",
        loop: true,
        autoplay: true,
        animationData: data
      });
      el.closest(".lumi-wait")?.classList.add("is-ready");
    } catch {
      delete el.dataset.mounted;
    }
  }

  function mountWaiters(root) {
    const scope = root || document;
    const nodes = [...scope.querySelectorAll(".lumi-wait-lottie:not([data-mounted])")];
    if (!nodes.length) return;
    const start = () => {
      loadData().then((data) => {
        nodes.forEach((el) => play(el, data));
      }).catch(() => {});
    };
    if (lottieApi()) start();
    else setTimeout(() => { if (lottieApi()) start(); }, 80);
  }

  window.lumiWaitHtml = waitHtml;
  window.mountLumiWaiters = mountWaiters;
  window.destroyLumiWaiters = destroyWaiters;
})();
