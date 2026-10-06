#!/usr/bin/env node
/**
 * Checks the live DNS for everything that decides whether your Firebase mail
 * is trusted and whether your logo can appear as the sender avatar (BIMI):
 * SPF, Firebase domain verification, DKIM, DMARC, BIMI, the hosted logo,
 * plus MX / MTA-STS / TLS-RPT for information.
 *
 *   node scripts/check-email-dns.mjs                 # audityxe.xyz
 *   node scripts/check-email-dns.mjs example.com
 */
import dns from "node:dns/promises";
import { fileURLToPath } from "node:url";
import { validateBimiSvg } from "./validate-bimi-svg.mjs";

const flat = (records) => records.map((r) => (Array.isArray(r) ? r.join("") : String(r)));
const safe = async (fn) => { try { return await fn(); } catch { return []; } };

export function parseTags(txt) {
  const tags = {};
  for (const part of txt.split(";")) {
    const i = part.indexOf("=");
    if (i > 0) tags[part.slice(0, i).trim().toLowerCase()] = part.slice(i + 1).trim();
  }
  return tags;
}

export async function runChecks({ domain, resolveTxt, resolveCname, resolveMx, fetchFn }) {
  const out = [];
  const add = (id, status, message) => out.push({ id, status, message });
  const txt = async (name) => flat(await safe(() => resolveTxt(name)));

  // ---- SPF -------------------------------------------------------------
  const spf = (await txt(domain)).filter((t) => /^v=spf1(\s|$)/i.test(t));
  if (spf.length === 0) add("spf", "FAIL", "No SPF record. Add: v=spf1 include:_spf.firebasemail.com ~all");
  else if (spf.length > 1) add("spf", "FAIL", `${spf.length} SPF records found — a domain may have exactly one. Merge them into a single record.`);
  else {
    const rec = spf[0];
    const lookups = (rec.match(/\b(include:|a\b|mx\b|ptr\b|exists:|redirect=)/gi) || []).length;
    if (!/include:_spf\.firebasemail\.com/i.test(rec)) add("spf", "FAIL", `SPF doesn't authorize Firebase. Add include:_spf.firebasemail.com. Current: ${rec}`);
    else if (!/[~-]all\s*$/i.test(rec)) add("spf", "WARN", `SPF should end in ~all (or -all). Current: ${rec}`);
    else if (lookups > 9) add("spf", "WARN", `SPF uses ~${lookups} DNS lookups; the limit is 10 including nested includes.`);
    else add("spf", "PASS", rec);
  }

  // ---- Firebase domain verification & DKIM ----------------------------
  const fbVerify = (await txt(domain)).filter((t) => /^firebase=/i.test(t));
  add("firebase-verify", fbVerify.length ? "PASS" : "FAIL", fbVerify.length ? fbVerify[0] : "No firebase=<project-id> TXT record (copy it from Firebase → Authentication → Templates → customize domain).");

  for (const n of [1, 2]) {
    const host = `firebase${n}._domainkey.${domain}`;
    const c = await safe(() => resolveCname(host));
    const ok = c.some((v) => new RegExp(`\\.dkim${n}\\._domainkey\\.firebasemail\\.com\\.?$`, "i").test(v));
    add(`dkim${n}`, ok ? "PASS" : "FAIL", ok ? `${host} -> ${c[0]}` : `${host} must be a CNAME to mail-<domain>.dkim${n}._domainkey.firebasemail.com (DNS only, not proxied).`);
  }

  // ---- DMARC -------------------------------------------------------------
  const dmarc = (await txt(`_dmarc.${domain}`)).filter((t) => /^v=DMARC1/i.test(t));
  let enforced = false;
  if (dmarc.length === 0) add("dmarc", "FAIL", `No DMARC record. Add TXT _dmarc: v=DMARC1; p=none; rua=mailto:you@${domain}; fo=1`);
  else if (dmarc.length > 1) add("dmarc", "FAIL", "More than one DMARC record — keep exactly one.");
  else {
    const t = parseTags(dmarc[0]);
    const p = (t.p || "").toLowerCase(), sp = (t.sp || p).toLowerCase(), pct = t.pct === undefined ? 100 : Number(t.pct);
    enforced = (p === "quarantine" || p === "reject") && pct === 100 && (sp === "quarantine" || sp === "reject");
    if (!t.rua) add("dmarc-rua", "WARN", "No rua= address, so you will never receive DMARC reports. Add rua=mailto:…");
    if (enforced) add("dmarc", "PASS", `Enforced (p=${p}, pct=${pct}${t.sp ? `, sp=${sp}` : ""}) — BIMI-eligible.`);
    else if (p === "none") add("dmarc", "WARN", "p=none is monitor-only. BIMI needs p=quarantine or p=reject at 100%. Watch the reports, then raise it.");
    else add("dmarc", "WARN", `Policy ${p || "(missing)"} with pct=${pct}${t.sp ? `, sp=${sp}` : ""} isn't full enforcement yet — BIMI needs p=quarantine/reject at pct=100 on the domain and subdomains.`);
  }

  // ---- BIMI ----------------------------------------------------------------
  const bimi = (await txt(`default._bimi.${domain}`)).filter((t) => /^v=BIMI1/i.test(t));
  if (bimi.length === 0) add("bimi", "FAIL", `No BIMI record. Add TXT default._bimi: v=BIMI1; l=https://${domain}/audityxelogo.svg; a=`);
  else {
    const t = parseTags(bimi[0]);
    if (/[\r\n]/.test(bimi[0])) add("bimi-format", "FAIL", "The BIMI TXT value contains a line break. It must be ONE line: v=BIMI1; l=https://…/logo.svg; a=");
    if (!t.l || !/^https:\/\//i.test(t.l)) add("bimi", "FAIL", "BIMI l= must be an https:// URL to the SVG logo.");
    else {
      add("bimi", "PASS", bimi[0]);
      try {
        const res = await fetchFn(t.l, { redirect: "manual" });
        if (res.status !== 200) add("bimi-logo", "FAIL", `${t.l} returned HTTP ${res.status}. It must be a direct 200 with no redirect.`);
        else {
          const ct = res.headers.get("content-type") || "";
          const svg = await res.text();
          const { errors, warnings } = validateBimiSvg(svg);
          if (!/image\/svg\+xml/i.test(ct)) add("bimi-logo-type", "WARN", `Content-Type is "${ct}"; expected image/svg+xml.`);
          if (errors.length) add("bimi-logo", "FAIL", errors.join(" "));
          else add("bimi-logo", "PASS", `${t.l} is a valid SVG Tiny PS file${warnings.length ? ` (warnings: ${warnings.join(" ")})` : ""}.`);
        }
      } catch (e) { add("bimi-logo", "FAIL", `Couldn't fetch ${t.l}: ${e.message}`); }
    }
    if (!t.a) add("bimi-cert", "WARN", "No a= certificate. Gmail and Apple Mail show a BIMI logo only with a VMC or CMC (PEM) referenced here; without it only some providers (e.g. Yahoo/AOL) may display it.");
    else add("bimi-cert", "PASS", `Certificate: ${t.a}`);
  }

  // ---- Informational ---------------------------------------------------------
  const mx = await safe(() => resolveMx(domain));
  add("mx", "INFO", mx.length ? `MX: ${mx.map((m) => m.exchange).join(", ")}` : "No MX records (fine if you only send mail from this domain; replies go to your Reply-To address).");
  add("mta-sts", "INFO", (await txt(`_mta-sts.${domain}`)).some((t) => /^v=STSv1/i.test(t)) ? "MTA-STS published" : "MTA-STS not published (optional; only matters if you receive mail on this domain).");
  add("tls-rpt", "INFO", (await txt(`_smtp._tls.${domain}`)).some((t) => /^v=TLSRPTv1/i.test(t)) ? "TLS-RPT published" : "TLS-RPT not published (optional).");

  const blocking = out.filter((r) => r.status === "FAIL" && !["bimi", "bimi-logo"].includes(r.id)).length;
  return { results: out, enforced, blocking };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const domain = (process.argv[2] || "audityxe.xyz").toLowerCase();
  const { results } = await runChecks({
    domain,
    resolveTxt: (n) => dns.resolveTxt(n),
    resolveCname: (n) => dns.resolveCname(n),
    resolveMx: (n) => dns.resolveMx(n),
    fetchFn: fetch,
  });
  const icon = { PASS: "PASS", WARN: "WARN", FAIL: "FAIL", INFO: "INFO" };
  for (const r of results) console.log(`${icon[r.status]}  ${r.id.padEnd(15)} ${r.message}`);
  const fails = results.filter((r) => r.status === "FAIL").length;
  console.log(fails ? `\n${fails} item(s) to fix.` : "\nNo failures.");
  process.exit(fails ? 1 : 0);
}
