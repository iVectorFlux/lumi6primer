"use strict";

(() => {
  const COPY = {
    en: {
      localCanvas:"Local Canvas", kicker:"LOCAL ACCESS", checkingTitle:"Checking this Lumi6 server", checkingBody:"Confirming how this Canvas is protected.", checking:"Checking access...",
      setupTitle:"Protect this Lumi6 server", setupBody:"Choose how every browser and device may access this running Lumi6 instance.", scopeTitle:"Instance-wide protection", scopeBody:"This is not a code for only this browser. Once set, the same code is required by every browser and device that opens this running Lumi6 instance. It helps prevent unauthorized people on your local network from accessing the Canvas.", setCode:"Set a 6-digit security code", setCodeHelp:"One shared code will protect this server from every new local-network visitor.", continueOpen:"Continue without a code", continueOpenHelp:"Anyone on this local network may be able to open this Canvas.",
      forgotLead:"A forgotten code is not a problem.", forgotCode:"Forgot the code?", restartHelp:"Restart Lumi6 to clear it. Your Canvas files and settings are not affected.", enterTitle:"Enter your security code", enterBody:"Use the shared code for this running Lumi6 server.", createTitle:"Create a security code", createBody:"Choose six digits for every device that opens this Lumi6 server. The code is submitted as soon as the sixth digit is entered.", unlockStep:"6-digit code",
      back:"Back", clear:"Clear", openRiskTitle:"This Canvas will be open on your local network", openRiskBody:"Other people on the same network may be able to open the Canvas, use its configured AI provider, and manage local plugins.", confirmOpen:"Keep open on this LAN",
      wrong:"That security code is not correct.", tooMany:"Too many attempts. Try again in {seconds} seconds.", failed:"Lumi6 could not update local access. Try again.", unavailableTitle:"This Lumi6 server is unavailable", unavailableBody:"Check the local connection, then try again.", retry:"Retry",
    },
  };

  const $ = (selector) => document.querySelector(selector),
    title=$("#accessTitle"),description=$("#accessDescription"),loading=$("#accessLoading"),setup=$("#accessSetup"),pinView=$("#accessPin"),risk=$("#accessRisk"),errorBox=$("#accessError"),retryButton=$("#accessRetry"),dots=[...document.querySelectorAll("#accessPinDots i")],pinStep=$("#accessPinStep"),backButton=$("#accessPinBack");
  let language="en",flow="unlock",entry="",busy=false,cooldownTimer=0,cooldownUntil=0;

  function text(key, values={}) {
    let value=COPY[language][key]||COPY.en[key]||key;
    for(const [name,replacement] of Object.entries(values))value=value.replace(`{${name}}`,String(replacement));
    return value;
  }
  function applyLanguage() {
    document.documentElement.lang=language==="zh"?"zh-CN":"en";
    document.querySelectorAll("[data-copy]").forEach(node=>{node.textContent=text(node.dataset.copy);});
    document.querySelectorAll("[data-copy-aria]").forEach(node=>node.setAttribute("aria-label",text(node.dataset.copyAria)));
    document.querySelectorAll("[data-copy-title]").forEach(node=>node.setAttribute("title",text(node.dataset.copyTitle)));
    document.querySelectorAll("[data-language]").forEach(button=>button.setAttribute("aria-pressed",String(button.dataset.language===language)));
    renderPinCopy();
  }
  function show(view) {
    for(const node of [loading,setup,pinView,risk])node.hidden=node!==view;
    errorBox.hidden=true;retryButton.hidden=true;
  }
  function setHeading(titleKey,bodyKey) {
    title.textContent=text(titleKey);description.textContent=text(bodyKey);
  }
  function showError(message) { errorBox.textContent=message;errorBox.hidden=false; }
  function renderEntry() {
    dots.forEach((dot,index)=>dot.classList.toggle("filled",index<entry.length));
  }
  function renderPinCopy() {
    if(pinView.hidden)return;
    if(flow==="unlock") { setHeading("enterTitle","enterBody");pinStep.textContent=text("unlockStep"); }
    else { setHeading("createTitle","createBody");pinStep.textContent=text("unlockStep"); }
  }
  function beginPin(nextFlow) {
    flow=nextFlow;entry="";backButton.hidden=nextFlow==="unlock";show(pinView);renderPinCopy();renderEntry();
    document.querySelector("#accessKeypad button[data-digit]")?.focus();
  }
  function addDigit(digit) {
    if(busy||Date.now()<cooldownUntil||entry.length>=6)return;
    entry+=digit;errorBox.hidden=true;renderEntry();
    if(entry.length===6)submitPin();
  }
  function removeDigit() { if(!busy&&entry.length){entry=entry.slice(0,-1);renderEntry();} }
  function clearEntry() { if(!busy){entry="";renderEntry();} }
  async function request(path,payload) {
    const response=await fetch(path,{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)}),body=await response.json().catch(()=>({}));
    if(!response.ok)throw Object.assign(new Error(body.error||text("failed")),{status:response.status,cooldownSeconds:Number(body.cooldownSeconds||0)});
    if(typeof body.accessSessionToken==="string"&&body.accessSessionToken)sessionStorage.setItem("lumi6-access-session",body.accessSessionToken);
    return body;
  }
  function enterCanvas() { window.location.replace("/index.html"); }
  async function submitPin() {
    if(entry.length!==6||busy)return;
    busy=true;renderEntry();
    try {
      if(flow==="setup")await request("/api/local-access/setup-pin",{pin:entry,confirmation:entry});
      else await request("/api/local-access/unlock",{pin:entry});
      enterCanvas();
    } catch(error) {
      entry="";
      if(error.status===429&&error.cooldownSeconds)startCooldown(error.cooldownSeconds);
      else showError(error.status===401?text("wrong"):error.message||text("failed"));
    } finally { busy=false;renderEntry(); }
  }
  function startCooldown(seconds) {
    clearInterval(cooldownTimer);
    let remaining=Math.max(1,Math.ceil(seconds));
    cooldownUntil=Date.now()+remaining*1000;
    showError(text("tooMany",{seconds:remaining}));
    cooldownTimer=setInterval(()=>{remaining-=1;if(remaining<=0){clearInterval(cooldownTimer);cooldownUntil=0;errorBox.hidden=true;renderEntry();}else showError(text("tooMany",{seconds:remaining}));},1000);
  }
  async function loadStatus() {
    show(loading);setup.querySelector(".access-choice-list").hidden=false;setHeading("checkingTitle","checkingBody");
    try {
      const response=await fetch("/api/local-access/status",{credentials:"same-origin",cache:"no-store"}),status=await response.json();
      if(!response.ok)throw new Error(status.error||text("failed"));
      if(typeof status.accessSessionToken==="string"&&status.accessSessionToken)sessionStorage.setItem("lumi6-access-session",status.accessSessionToken);
      if(status.unlocked)return enterCanvas();
      if(status.mode==="pin") { beginPin("unlock");if(status.cooldownSeconds)startCooldown(status.cooldownSeconds);return; }
      show(setup);setHeading("setupTitle","setupBody");
    } catch {
      show(setup);setHeading("unavailableTitle","unavailableBody");setup.querySelector(".access-choice-list").hidden=true;showError(text("failed"));retryButton.hidden=false;
    }
  }

  async function confirmOpenAccess() {
    if (busy) return;
    busy = true;
    try {
      await request("/api/local-access/open", { acknowledgeRisk: true });
      enterCanvas();
    } catch(error) {
      showError(error.message || text("failed"));
      busy = false;
    }
  }
  document.querySelectorAll("[data-language]").forEach(button=>button.addEventListener("click",()=>{language=button.dataset.language;localStorage.setItem("lumi6-language",language);applyLanguage();}));
  $("#accessChoosePin").addEventListener("click",()=>beginPin("setup"));
  $("#accessChooseOpen").addEventListener("click",confirmOpenAccess);
  $("#accessRiskBack").addEventListener("click",()=>{show(setup);setHeading("setupTitle","setupBody");});
  backButton.addEventListener("click",()=>{show(setup);setHeading("setupTitle","setupBody");});
  $("#accessConfirmOpen").addEventListener("click",confirmOpenAccess);
  retryButton.addEventListener("click",loadStatus);
  $("#accessKeypad").addEventListener("click",event=>{const button=event.target.closest("button");if(!button)return;if(button.dataset.digit)addDigit(button.dataset.digit);if(button.dataset.action==="backspace")removeDigit();if(button.dataset.action==="clear")clearEntry();});
  document.addEventListener("keydown",event=>{if(pinView.hidden)return;if(/^\d$/.test(event.key)){event.preventDefault();addDigit(event.key);}else if(event.key==="Backspace"){event.preventDefault();removeDigit();}else if(event.key==="Delete"){event.preventDefault();clearEntry();}else if(event.key==="Enter"){event.preventDefault();submitPin();}});
  applyLanguage();loadStatus();
})();
