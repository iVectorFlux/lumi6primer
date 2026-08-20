"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("lumi6Desktop", Object.freeze({
  getSettings:() => ipcRenderer.invoke("lumi6:get-settings"),
  installCli:provider => ipcRenderer.invoke("lumi6:install-cli", provider),
  saveAndTest:settings => ipcRenderer.invoke("lumi6:save-and-test", settings),
  launch:() => ipcRenderer.invoke("lumi6:launch"),
  copyText:text => ipcRenderer.invoke("lumi6:copy-text", text),
  openHelp:() => ipcRenderer.invoke("lumi6:open-help"),
  platform:process.platform,
}));
