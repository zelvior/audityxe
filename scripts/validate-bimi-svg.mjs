#!/usr/bin/env node
/**
 * Local lint for BIMI's SVG Tiny Portable/Secure requirements.
 * Catches the common rejections before a mailbox provider does. It is NOT
 * the official validator — confirm with the BIMI Group inspector
 * (bimigroup.org) once the file is live.
 *
 *   node scripts/validate-bimi-svg.mjs [path-or-url]
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export function validateBimiSvg(svg, byteLength = Buffer.byteLength(svg)) {
  const errors = [];
  const warnings = [];
  const rootTag = svg.match(/<svg\b[^>]*>/)?.[0] || "";
  const attr = (name) => rootTag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];

  if (!rootTag) errors.push("No <svg> root element.");
  if (attr("version") !== "1.2") errors.push('Root must have version="1.2".');
  if (attr("baseProfile") !== "tiny-ps") errors.push('Root must have baseProfile="tiny-ps".');
  if (!/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/.test(rootTag)) errors.push("Root must declare the SVG xmlns.");
  if (attr("x") !== undefined || attr("y") !== undefined) errors.push("Root must not have x or y attributes.");

  const vb = attr("viewBox")?.trim().split(/[\s,]+/).map(Number);
  if (!vb || vb.length !== 4 || vb.some(Number.isNaN)) errors.push("Root needs a numeric viewBox.");
  else if (vb[2] !== vb[3]) errors.push(`viewBox must be square (got ${vb[2]}x${vb[3]}).`);

  const w = parseFloat(attr("width") || ""), h = parseFloat(attr("height") || "");
  if (!Number.isNaN(w) && !Number.isNaN(h)) {
    if (w !== h) errors.push(`width and height must match (got ${w}x${h}).`);
    if (w < 96) warnings.push("Declared size is below 96px.");
  }

  if (!/<title>[^<]+<\/title>/.test(svg)) errors.push("A non-empty <title> is required.");
  if (byteLength > 32 * 1024) errors.push(`File is ${byteLength} bytes; the limit is 32 KB.`);

  const banned = [
    [/<script\b/i, "<script>"], [/<style\b/i, "<style>"], [/\sstyle\s*=/i, "style attribute"],
    [/<image\b/i, "<image> (raster)"], [/<foreignObject\b/i, "<foreignObject>"], [/<a\b/i, "<a> link"],
    [/<animate/i, "animation"], [/<set\b/i, "<set>"], [/<use\b/i, "<use>"], [/<text\b/i, "<text> (convert text to paths)"],
    [/<filter\b/i, "<filter>"], [/<mask\b/i, "<mask>"], [/<pattern\b/i, "<pattern>"], [/<switch\b/i, "<switch>"],
    [/\son[a-z]+\s*=/i, "event handler"], [/(?:xlink:)?href\s*=/i, "href / external reference"],
    [/url\(\s*['"]?(?!#)/i, "url() pointing outside the file"], [/<!ENTITY/i, "entity declaration"], [/data:/i, "data: URI"],
  ];
  for (const [re, label] of banned) if (re.test(svg)) errors.push(`Contains ${label}, which SVG Tiny PS forbids.`);

  // A solid, full-bleed background is required so the logo reads on any avatar background.
  if (vb && vb.length === 4) {
    const first = svg.match(/<path\b[^>]*>/)?.[0] || "";
    if (!/\sfill="#[0-9a-fA-F]{3,8}"/.test(first)) warnings.push("First shape isn't a solid filled background.");
  }
  return { errors, warnings };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const here = dirname(fileURLToPath(import.meta.url));
  const target = process.argv[2] || join(here, "..", "public", "audityxelogo.svg");
  let svg, bytes;
  if (/^https?:\/\//.test(target)) {
    const res = await fetch(target, { redirect: "manual" });
    if (res.status !== 200) { console.error(`FAIL ${target} returned HTTP ${res.status} (BIMI fetchers need a direct 200, no redirect).`); process.exit(1); }
    const ct = res.headers.get("content-type") || "";
    if (!/image\/svg\+xml/.test(ct)) console.warn(`WARN content-type is "${ct}", expected image/svg+xml`);
    svg = await res.text(); bytes = Buffer.byteLength(svg);
  } else { svg = readFileSync(target, "utf8"); bytes = Buffer.byteLength(svg); }
  const { errors, warnings } = validateBimiSvg(svg, bytes);
  warnings.forEach((w) => console.warn("WARN", w));
  errors.forEach((e) => console.error("FAIL", e));
  console.log(errors.length ? `${errors.length} problem(s)` : `OK  ${target} (${bytes} bytes) passes the local SVG Tiny PS checks`);
  process.exit(errors.length ? 1 : 0);
}
