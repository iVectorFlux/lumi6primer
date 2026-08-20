"use strict";

const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");
const png2icons = require("png2icons");

const ROOT = path.resolve(__dirname, ".."),
  iconRoot = path.join(ROOT, "build", "icons"),
  generated = path.join(iconRoot, "generated"),
  source = path.join(ROOT, "public", "lumi6-mark.png");

async function png(size, output) {
  await sharp(source)
    .resize(size, size, { fit:"cover", kernel:sharp.kernel.lanczos3 })
    .png({ compressionLevel:9, palette:false })
    .toFile(output);
}

async function main() {
  if (!fs.existsSync(source)) throw new Error(`Missing icon source: ${source}`);
  fs.mkdirSync(iconRoot, { recursive:true });
  const png512 = path.join(iconRoot, "lumi6.png");
  const png1024 = path.join(iconRoot, "lumi6-1024.png");
  await png(512, png512);
  await png(1024, png1024);
  const sourcePng = fs.readFileSync(png1024),
    icns = png2icons.createICNS(sourcePng, png2icons.BICUBIC2, 0),
    ico = png2icons.createICO(sourcePng, png2icons.BICUBIC2, 0, false, true);
  if (!icns || !ico) throw new Error("Unable to encode desktop icon files.");
  fs.writeFileSync(path.join(iconRoot, "lumi6.icns"), icns);
  fs.writeFileSync(path.join(iconRoot, "lumi6.ico"), ico);
  fs.rmSync(generated, { recursive:true, force:true });
  console.log(`Generated Lumi6 desktop icons in ${iconRoot}`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
