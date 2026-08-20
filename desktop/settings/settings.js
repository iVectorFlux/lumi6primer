"use strict";

const desktop = window.lumi6Desktop;
const form = document.getElementById("settingsForm");
const submitButton = document.getElementById("submitButton");
const statusBox = document.getElementById("statusBox");
const statusTitle = document.getElementById("statusTitle");
const statusMessage = document.getElementById("statusMessage");
const statusSymbol = statusBox.querySelector(".status-symbol");
const statusAction = document.getElementById("statusAction");
const savedKeyBadge = document.getElementById("savedKeyBadge");
const cliButtons = [...document.querySelectorAll("[data-install-cli]")];
const lanAccessHint = document.getElementById("lanAccessHint");
const lanAccessAddresses = document.getElementById("lanAccessAddresses");
const lanAccessHelp = document.getElementById("lanAccessHelp");
const copyLanAddress = document.getElementById("copyLanAddress");
let currentLanguage = localStorage.getItem("lumi6-setup-language") === "zh" ? "zh" : "en";
let statusActionHandler = null;
let activeProvider = "api";
let detectedLanHosts = [];
let displayedLanUrls = [];

const API_FIELDS = ["apiFormat", "apiUrl", "apiModel", "apiKey"];
const apiDrafts = {
  api:{ apiFormat:"openai", apiUrl:"https://api.openai.com/v1", apiModel:"gpt-5.6-sol", apiKey:"" },
  kimi:{ apiFormat:"openai", apiUrl:"https://api.kimi.com/coding/v1", apiModel:"k3", apiKey:"" },
};
const KIMI_ENDPOINTS = Object.freeze({
  code:Object.freeze({ openai:"https://api.kimi.com/coding/v1", anthropic:"https://api.kimi.com/coding" }),
  platform:Object.freeze({ china:"https://api.moonshot.cn/v1", global:"https://api.moonshot.ai/v1" }),
});
const KIMI_MODELS = Object.freeze({ code:"k3", platform:"kimi-k3" });
const KIMI_PRESET_ENDPOINTS = new Set([
  ...Object.values(KIMI_ENDPOINTS.code),
  ...Object.values(KIMI_ENDPOINTS.platform),
]);
const KIMI_PRESET_MODELS = new Set(Object.values(KIMI_MODELS));

const translations = {
  zh:{
  },
};

function translate() {
  document.documentElement.lang = currentLanguage === "zh" ? "zh-CN" : "en";
  for (const element of document.querySelectorAll("[data-i18n]")) {
    element.dataset.english ||= element.textContent;
    const value = currentLanguage === "en" ? element.dataset.english : translations[currentLanguage]?.[element.dataset.i18n];
    if (value) element.textContent = value;
  }
  for (const button of document.querySelectorAll("[data-language]")) button.classList.toggle("active", button.dataset.language === currentLanguage);
}

function setStatus(kind, title, message, action = null) {
  statusBox.hidden = false;
  statusBox.className = `status-box ${kind}`;
  statusTitle.textContent = title;
  statusMessage.textContent = message;
  statusSymbol.textContent = kind === "success" ? "✓" : ["error", "warning"].includes(kind) ? "!" : "";
  statusActionHandler = action?.handler || null;
  statusAction.hidden = !action;
  statusAction.textContent = action?.label || "";
}

function setBusy(busy) {
  submitButton.disabled = busy;
  for (const button of cliButtons) button.disabled = busy;
}

function provider() {
  return form.elements.provider.value;
}

function updateProviderPanels() {
  const selected = provider();
  for (const panel of document.querySelectorAll("[data-provider-panel]")) panel.hidden = !panel.dataset.providerPanel.split(/\s+/).includes(selected);
  for (const element of document.querySelectorAll("[data-kimi-only]")) element.hidden = selected !== "kimi";
  updateApiFormatAvailability();
}

function updateLanAccessHint() {
  const enabled = value("host") === "0.0.0.0", port = Number(value("port"));
  lanAccessHint.hidden = !enabled;
  if (!enabled) return;
  displayedLanUrls = Number.isInteger(port) && port > 0 && port <= 65535
    ? detectedLanHosts.map(host => `http://${host}:${port}/`)
    : [];
  const fallback = port === 0
    ? (translations[currentLanguage]?.lanDynamicPort || "The system will choose a port at launch and show the final LAN address.")
    : (translations[currentLanguage]?.noLanAddress || "No LAN address is detected yet. The final address will be shown at launch.");
  lanAccessAddresses.textContent = displayedLanUrls.join("\n");
  lanAccessAddresses.hidden = displayedLanUrls.length === 0;
  lanAccessHelp.textContent = displayedLanUrls.length ? (translations[currentLanguage]?.lanAccessHelp || lanAccessHelp.dataset.english) : fallback;
  copyLanAddress.hidden = displayedLanUrls.length === 0;
}

function value(name) {
  return form.elements[name]?.value ?? "";
}

function payload() {
  return {
    provider:provider(),
    apiFormat:value("apiFormat"), apiUrl:value("apiUrl"), apiModel:value("apiModel"), apiKey:value("apiKey"),
    kimiProduct:value("kimiProduct"), kimiRegion:value("kimiRegion"), kimiCliModel:value("kimiCliModel"), kimiCliPath:value("kimiCliPath"),
    codexModel:value("codexModel"), codexPath:value("codexPath"), claudeModel:value("claudeModel"), claudePath:value("claudePath"),
    effort:value("effort"), imageFormat:value("imageFormat"), timeout:value("timeout"), autoDelay:value("autoDelay"),
    host:value("host"), port:value("port"), requestTrace:form.elements.requestTrace.checked, traceLimit:value("traceLimit"),
  };
}

function assign(name, value) {
  if (form.elements[name] && value !== undefined && value !== null) form.elements[name].value = String(value);
}

function captureApiDraft(name) {
  if (!["api", "kimi"].includes(name)) return;
  apiDrafts[name] = Object.fromEntries(API_FIELDS.map(field => [field, value(field)]));
}

function restoreApiDraft(name) {
  const draft = apiDrafts[name];
  if (!draft) return;
  for (const field of API_FIELDS) assign(field, draft[field]);
}

function updateApiFormatAvailability() {
  const anthropicOption = form.elements.apiFormat.querySelector('option[value="anthropic"]'),
    kimiPlatform = provider() === "kimi" && value("kimiProduct") === "platform";
  anthropicOption.disabled = kimiPlatform;
  if (kimiPlatform && value("apiFormat") === "anthropic") assign("apiFormat", "openai");
}

function updateKimiEndpoint(updateUrl = true, updateModel = false) {
  const product = value("kimiProduct") || "code", region = value("kimiRegion") || "global";
  updateApiFormatAvailability();
  if (updateUrl) {
    const endpoint = product === "code" ? KIMI_ENDPOINTS.code[value("apiFormat") || "openai"] : KIMI_ENDPOINTS.platform[region];
    assign("apiUrl", endpoint);
  }
  if (updateModel) assign("apiModel", KIMI_MODELS[product]);
}

function repairKimiPreset() {
  const currentUrl = value("apiUrl").trim().replace(/\/+$/, ""),
    currentModel = value("apiModel").trim();
  updateKimiEndpoint(!currentUrl || KIMI_PRESET_ENDPOINTS.has(currentUrl), !currentModel || KIMI_PRESET_MODELS.has(currentModel));
}

function changeProvider() {
  const selected = provider();
  captureApiDraft(activeProvider);
  activeProvider = selected;
  if (["api", "kimi"].includes(selected)) restoreApiDraft(selected);
  updateProviderPanels();
  if (selected === "kimi") repairKimiPreset();
}

async function initialize() {
  translate();
  if (!desktop) {
    setStatus("error", translations[currentLanguage]?.failed || "Desktop setup unavailable", translations[currentLanguage]?.unexpected || "The secure desktop bridge is unavailable.");
    submitButton.disabled = true;
    return;
  }
  try {
    const settings = await desktop.getSettings();
    detectedLanHosts = Array.isArray(settings.lanHosts) ? settings.lanHosts : [];
    document.getElementById("versionLabel").textContent = `Desktop v${settings.version}`;
    document.getElementById("configPath").textContent = settings.configFile;
    const selected = form.querySelector(`input[name="provider"][value="${CSS.escape(settings.provider)}"]`) || form.elements.provider[0];
    selected.checked = true;
    for (const name of ["apiFormat","apiUrl","apiModel","kimiProduct","kimiRegion","kimiCliModel","kimiCliPath","codexModel","codexPath","claudeModel","claudePath","effort","imageFormat","timeout","autoDelay","host","port","traceLimit"]) assign(name, settings[name]);
    form.elements.requestTrace.checked = settings.requestTrace === true;
    savedKeyBadge.hidden = !settings.apiKeySaved;
    form.elements.apiKey.placeholder = settings.apiKeySaved ? "Leave blank to keep saved key" : "Paste your API key";
    activeProvider = settings.provider;
    updateProviderPanels();
    if (activeProvider === "kimi") repairKimiPreset();
    if (["api", "kimi"].includes(activeProvider)) captureApiDraft(activeProvider);
    updateLanAccessHint();
  } catch (error) {
    setStatus("error", "Setup could not load", error.message || String(error));
    submitButton.disabled = true;
  }
}

for (const radio of form.elements.provider) radio.addEventListener("change", changeProvider);
form.elements.host.addEventListener("change", updateLanAccessHint);
form.elements.port.addEventListener("input", updateLanAccessHint);
form.elements.kimiProduct.addEventListener("change", () => updateKimiEndpoint(true, true));
form.elements.kimiRegion.addEventListener("change", () => updateKimiEndpoint(true));
form.elements.apiFormat.addEventListener("change", () => { if (provider() === "kimi") updateKimiEndpoint(true); });
for (const button of document.querySelectorAll("[data-language]")) button.addEventListener("click", () => {
  currentLanguage = button.dataset.language;
  localStorage.setItem("lumi6-setup-language", currentLanguage);
  translate();
  updateLanAccessHint();
});
copyLanAddress.addEventListener("click", () => { if (displayedLanUrls[0]) void desktop?.copyText(displayedLanUrls[0]); });
document.getElementById("helpButton").addEventListener("click", () => void desktop?.openHelp());
statusAction.addEventListener("click", () => void statusActionHandler?.());

async function testAndLaunch() {
  setBusy(true);
  setStatus("loading", translations[currentLanguage]?.testing || "Testing connection", translations[currentLanguage]?.testingBody || "Saving settings locally and checking your model…");
  try {
    const result = await desktop.saveAndTest(payload());
    if (!result.ok) {
      const selected = provider(), missingCli = ["kimi-cli", "codex-cli", "claude-cli"].includes(selected) && /not found|executable|install/i.test(result.error || ""),
        action = missingCli
          ? { label:translations[currentLanguage]?.install || "Install", handler:() => installProvider(selected) }
          : result.saved ? { label:translations[currentLanguage]?.launchAnyway || "Launch anyway", handler:launchSavedSettings } : null;
      if (result.timedOut) {
        setStatus("warning",
          translations[currentLanguage]?.testTimedOut || "Connection test timed out",
          translations[currentLanguage]?.testTimedOutBody || "Settings were saved. The connection test exceeded 30 seconds; you can still launch Lumi6 and enter the canvas.",
          action);
        return;
      }
      setStatus(result.saved ? "warning" : "error", result.saved
        ? (translations[currentLanguage]?.savedTestFailed || "Settings saved; connection test failed")
        : (translations[currentLanguage]?.failed || "Connection needs attention"), result.error || "Connection test failed.", action);
      return;
    }
    setStatus("success", translations[currentLanguage]?.success || "Connection ready", `${result.message} ${translations[currentLanguage]?.launching || "Lumi6 will launch now."}`);
    const launched = await desktop.launch();
    if (!launched?.ok) setStatus("error", translations[currentLanguage]?.failed || "Unable to launch", launched?.error || "Restart Lumi6 to use the saved settings.");
  } catch (error) {
    setStatus("error", translations[currentLanguage]?.failed || "Connection needs attention", error.message || String(error));
  } finally { setBusy(false); }
}

async function launchSavedSettings() {
  setBusy(true);
  setStatus("loading", translations[currentLanguage]?.launching || "Launching Lumi6", translations[currentLanguage]?.launchingSaved || "Starting Lumi6 with your saved settings…");
  try {
    const launched = await desktop.launch();
    if (!launched?.ok) setStatus("error", translations[currentLanguage]?.failed || "Unable to launch", launched?.error || "Restart Lumi6 to use the saved settings.");
  } catch (error) {
    setStatus("error", translations[currentLanguage]?.failed || "Unable to launch", error.message || String(error));
  } finally { setBusy(false); }
}

async function installProvider(providerName) {
  setBusy(true);
  setStatus("loading", translations[currentLanguage]?.installing || "Installing", translations[currentLanguage]?.installingBody || "Downloading and verifying the official installer…");
  try {
    const result = await desktop.installCli(providerName);
    if (!result.ok) {
      setStatus("error", translations[currentLanguage]?.installFailed || "Automatic installation did not finish", result.error || "Installation failed.");
      return;
    }
    assign({
      "kimi-cli":"kimiCliPath",
      "codex-cli":"codexPath",
      "claude-cli":"claudePath",
    }[providerName], result.executable);
    setStatus("success", translations[currentLanguage]?.installed || "Installation complete", translations[currentLanguage]?.checkingExistingSession || "Checking your existing account session…");
    await testAndLaunch();
  } catch (error) {
    setStatus("error", translations[currentLanguage]?.installFailed || "Automatic installation did not finish", error.message || String(error));
  } finally { setBusy(false); }
}

for (const button of document.querySelectorAll("[data-install-cli]")) button.addEventListener("click", () => void installProvider(button.dataset.installCli));

form.addEventListener("submit", async event => {
  event.preventDefault();
  await testAndLaunch();
});

void initialize();
