"use strict";

const path = require("node:path");
const pkg = require("./package.json");
const desktopTools = require("./tools/electron/package.json");

const ROOT = __dirname;
const ICON = path.join(ROOT, "build", "icons", "lumi6");
const DESKTOP_TOOLS = path.join(ROOT, "tools", "electron");
const ELECTRON_VERSION = desktopTools.devDependencies.electron;
const desktopModule = name => {
  try {
    return require.resolve(name, { paths:[DESKTOP_TOOLS] });
  } catch (error) {
    if (error && error.code === "MODULE_NOT_FOUND") {
      throw new Error(`Desktop build dependencies are missing. Run "npm run desktop:deps" before packaging. (${name})`);
    }
    throw error;
  }
};
const hasAppleNotarization = Boolean(
  process.env.MAC_CODESIGN_IDENTITY && process.env.APPLE_ID && process.env.APPLE_APP_SPECIFIC_PASSWORD && process.env.APPLE_TEAM_ID,
), hasWindowsCertificate = Boolean(process.env.WINDOWS_CERTIFICATE_FILE && process.env.WINDOWS_CERTIFICATE_PASSWORD),
  macEntitlements = path.join(ROOT, "build", "entitlements.mac.plist");
const macSigning = process.env.MAC_CODESIGN_IDENTITY ? {
  identity:process.env.MAC_CODESIGN_IDENTITY,
  optionsForFile:() => ({
    hardenedRuntime:true,
    entitlements:macEntitlements,
  }),
} : {
  // Sign the complete bundle even when Developer ID credentials are unavailable.
  // Electron's linker signature only covers its main executable and Gatekeeper
  // rejects the resulting quarantined app as damaged.
  identity:"-",
  identityValidation:false,
  optionsForFile:() => ({
    hardenedRuntime:false,
    entitlements:macEntitlements,
  }),
  preAutoEntitlements:false,
  preEmbedProvisioningProfile:false,
};

module.exports = {
  packagerConfig: {
    name:"Lumi6",
    executableName:"Lumi6",
    icon:ICON,
    asar:{ unpack:"**/node_modules/{sharp,@img}/**/*" },
    prune:true,
    appBundleId:"app.lumi6.desktop",
    appCategoryType:"public.app-category.productivity",
    appCopyright:`Copyright © ${new Date().getFullYear()} Lumi6`,
    extendInfo:{
      CFBundleDisplayName:"Lumi6",
      CFBundleName:"Lumi6",
      NSHumanReadableCopyright:`Copyright © ${new Date().getFullYear()} Lumi6`,
    },
    osxSign:macSigning,
    ...(hasAppleNotarization ? {
      osxNotarize:{
        tool:"notarytool",
        appleId:process.env.APPLE_ID,
        appleIdPassword:process.env.APPLE_APP_SPECIFIC_PASSWORD,
        teamId:process.env.APPLE_TEAM_ID,
      },
    } : {}),
    ...(hasWindowsCertificate ? {
      windowsSign:{
        signToolOptions:{
          certificateFile:process.env.WINDOWS_CERTIFICATE_FILE,
          certificatePassword:process.env.WINDOWS_CERTIFICATE_PASSWORD,
        },
      },
    } : {}),
    ignore:[
      /^\/\.git(?:\/|$)/,
      /^\/\.github(?:\/|$)/,
      /^\/tools(?:\/|$)/,
      /^\/out(?:\/|$)/,
      /^\/release(?:\/|$)/,
      /^\/coverage(?:\/|$)/,
      /^\/test-results(?:\/|$)/,
      /^\/playwright-report(?:\/|$)/,
      /^\/public\/plugins\/private(?:\/|$)/,
    ],
  },
  rebuildConfig:{ force:true },
  hooks:{
    readPackageJson:(_forgeConfig, packageJson) => ({
      ...packageJson,
      devDependencies:{ ...packageJson.devDependencies, electron:ELECTRON_VERSION },
    }),
  },
  makers:[
    {
      name:desktopModule("@electron-forge/maker-dmg"),
      platforms:["darwin"],
      config:{
        name:`Lumi6-${pkg.version}`,
        title:"Lumi6",
        icon:`${ICON}.icns`,
        overwrite:true,
      },
    },
    {
      name:desktopModule("@electron-forge/maker-zip"),
      platforms:["darwin"],
      config:{},
    },
    {
      name:desktopModule("@electron-forge/maker-squirrel"),
      platforms:["win32"],
      config:{
        name:"lumi6",
        authors:"Lumi6",
        description:pkg.description,
        exe:"Lumi6.exe",
        setupExe:`Lumi6-Setup-${pkg.version}-win-x64.exe`,
        setupIcon:`${ICON}.ico`,
        // Avoid invoking rcedit through Wine during cross-platform builds.
        // The installed app and Setup.exe still use the Lumi6 icon.
        skipUpdateIcon:true,
        iconUrl:`https://github.com/iVectorFlux/lumi6primer/releases/download/v${pkg.version}/lumi6.ico`,
        noMsi:true,
      },
    },
  ],
};
