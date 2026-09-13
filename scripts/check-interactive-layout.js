#!/usr/bin/env node
"use strict";

/**
 * Layout check: at phone width, does the interactive keep its aspect ratio and
 * report a height that leaves room for the surrounding text?
 *
 * Playwright is not a project dependency, so install it somewhere out of the way:
 *   mkdir -p /tmp/pw && (cd /tmp/pw && npm install playwright --no-save)
 *   npx playwright install chromium --only-shell
 * Then, with the server running (npm start):
 *   NODE_PATH=/tmp/pw/node_modules node scripts/check-interactive-layout.js
 */

const { chromium } = require("playwright");

const BASE = process.env.PRIMER_BASE || "http://localhost:3888";
const SLUGS = (process.env.SLUGS || "gr3-sci-1,gr11-sci-15,gr11-sci-31").split(",");
const VIEWPORTS = [
  { label: "phone ", width: 390, height: 844 },
  { label: "tablet", width: 834, height: 1112 }
];

async function main() {
  const browser = await chromium.launch();
  let bad = 0;

  for (const viewport of VIEWPORTS) {
    const page = await browser.newPage({ viewport });
    console.log(`\n${viewport.label}  ${viewport.width}x${viewport.height}`);
    for (const slug of SLUGS) {
      const url = `${BASE}/api/primer/interactive/${encodeURIComponent(slug)}?embed=1`;
      const res = await page.goto(url, { waitUntil: "load" });
      if (!res || !res.ok()) {
        console.log(`  ${slug}: HTTP ${res ? res.status() : "no response"}`);
        bad += 1;
        continue;
      }
      await page.waitForTimeout(400);
      const box = await page.evaluate(() => {
        const canvas = document.querySelector("canvas");
        const rect = canvas ? canvas.getBoundingClientRect() : null;
        return {
          // Content height, the same number the embed reports to the board.
          docHeight: Math.ceil(document.body.getBoundingClientRect().height),
          canvasW: rect ? Math.round(rect.width) : 0,
          canvasH: rect ? Math.round(rect.height) : 0,
          backingW: canvas ? canvas.width : 0,
          backingH: canvas ? canvas.height : 0
        };
      });
      const ratio = box.canvasH ? (box.canvasW / box.canvasH) : 0;
      // A blank canvas has a zero backing store, and stretching shows up as the
      // backing store ratio drifting away from the displayed box ratio.
      const drawable = box.backingW > 0 && box.backingH > 0;
      const distortion = drawable && box.canvasH
        ? Math.abs((box.backingW / box.backingH) - ratio)
        : Infinity;
      const spare = viewport.height - box.docHeight;
      const reasons = [];
      if (Math.abs(ratio - 16 / 9) > 0.05) reasons.push(`ratio ${ratio.toFixed(2)}`);
      if (!drawable) reasons.push("canvas has no backing store");
      else if (distortion > 0.05) reasons.push(`stretched by ${distortion.toFixed(2)}`);
      if (spare <= 0) reasons.push("fills the viewport, no room for text");
      const ok = reasons.length === 0;
      if (!ok) bad += 1;
      console.log(
        `  ${ok ? "ok  " : "FAIL"} ${slug.padEnd(12)} canvas ${box.canvasW}x${box.canvasH}`
        + ` ratio ${ratio.toFixed(2)} backing ${box.backingW}x${box.backingH}`
        + ` doc ${box.docHeight}px, spare ${spare}px`
        + (ok ? "" : `  <- ${reasons.join("; ")}`)
      );
    }
    await page.close();
  }

  await browser.close();
  if (bad) {
    console.log(`\n${bad} check(s) failed`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
