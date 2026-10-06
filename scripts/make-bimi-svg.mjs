#!/usr/bin/env node
/**
 * Builds the BIMI-compliant logo (public/audityxelogo.svg) from the
 * original artwork (audityxelogo.svg in the repo root).
 *
 * BIMI needs the SVG Tiny Portable/Secure profile: version="1.2",
 * baseProfile="tiny-ps", a <title>, a viewBox, no x/y on the root, a
 * square canvas, a solid background, no scripts / styles / external
 * references / raster images, and a file under 32 KB.
 *
 * Mail clients crop BIMI logos to a circle or rounded square, so the
 * artwork is scaled to 80% inside the (still full-bleed) background — the
 * original's feet sit within ~2% of the circle's edge and would be clipped.
 *
 *   node scripts/make-bimi-svg.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(join(root, "audityxelogo.svg"), "utf8");

const SIZE = 180;
const SCALE = 0.8;

const paths = [...src.matchAll(/<path\b[^>]*\/>/g)].map((m) => m[0]);
if (paths.length < 2) throw new Error("Expected a background path plus the logo paths in audityxelogo.svg");

// The first path is the full-bleed solid background; everything after it is the mark.
const [background, ...mark] = paths;
const offset = ((SIZE - SIZE * SCALE) / 2).toFixed(2);

// Presentation attributes only (Tiny PS forbids style attributes/elements).
for (const p of paths) {
  if (/\sstyle=|<style|<script|<image|href=/i.test(p)) throw new Error("Unsupported content found in a path");
}

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg version="1.2" baseProfile="tiny-ps" xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 ${SIZE} ${SIZE}">
<title>Audityxe</title>
${background}
<g transform="translate(${offset},${offset}) scale(${SCALE})">
${mark.join("\n")}
</g>
</svg>
`;

const out = join(root, "public", "audityxelogo.svg");
writeFileSync(out, svg);
console.log(`wrote ${out} (${Buffer.byteLength(svg)} bytes)`);
