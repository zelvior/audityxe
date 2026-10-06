import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runChecks, parseTags } from "./check-email-dns.mjs";

const D = "audityxe.xyz";
const goodSvg = readFileSync(new URL("../public/audityxelogo.svg", import.meta.url), "utf8");
const mk = (txt = {}, cname = {}, mx = [], logo = { status: 200, type: "image/svg+xml", body: goodSvg }) => ({
  domain: D,
  resolveTxt: async (n) => { if (!(n in txt)) throw new Error("ENODATA"); return txt[n].map((s) => [s]); },
  resolveCname: async (n) => { if (!(n in cname)) throw new Error("ENODATA"); return [cname[n]]; },
  resolveMx: async () => mx,
  fetchFn: async () => ({ status: logo.status, headers: { get: () => logo.type }, text: async () => logo.body }),
});
const by = (r, id) => r.results.find((x) => x.id === id);

assert.deepEqual(parseTags("v=DMARC1; p=quarantine; pct=100; rua=mailto:a@b.c"), { v: "DMARC1", p: "quarantine", pct: "100", rua: "mailto:a@b.c" });

// Fully set up, certificate present
const good = await runChecks(mk(
  { [D]: ["v=spf1 include:_spf.firebasemail.com ~all", "firebase=audityxe"],
    [`_dmarc.${D}`]: ["v=DMARC1; p=quarantine; pct=100; rua=mailto:zelvior@proton.me"],
    [`default._bimi.${D}`]: [`v=BIMI1; l=https://${D}/audityxelogo.svg; a=https://${D}/bimi/audityxe.pem`] },
  { [`firebase1._domainkey.${D}`]: "mail-audityxe-xyz.dkim1._domainkey.firebasemail.com.", [`firebase2._domainkey.${D}`]: "mail-audityxe-xyz.dkim2._domainkey.firebasemail.com." }));
for (const id of ["spf", "firebase-verify", "dkim1", "dkim2", "dmarc", "bimi", "bimi-logo", "bimi-cert"]) assert.equal(by(good, id).status, "PASS", id);
assert.equal(good.enforced, true);

// Typical day-one state: monitor-only DMARC, BIMI without certificate
const early = await runChecks(mk(
  { [D]: ["v=spf1 include:_spf.firebasemail.com ~all", "firebase=audityxe"],
    [`_dmarc.${D}`]: ["v=DMARC1; p=none; rua=mailto:zelvior@proton.me"],
    [`default._bimi.${D}`]: [`v=BIMI1; l=https://${D}/audityxelogo.svg; a=`] },
  { [`firebase1._domainkey.${D}`]: "mail-audityxe-xyz.dkim1._domainkey.firebasemail.com.", [`firebase2._domainkey.${D}`]: "mail-audityxe-xyz.dkim2._domainkey.firebasemail.com." }));
assert.equal(by(early, "dmarc").status, "WARN"); assert.match(by(early, "dmarc").message, /p=none/);
assert.equal(by(early, "bimi-cert").status, "WARN"); assert.equal(early.enforced, false);

// Common mistakes
const bad = await runChecks(mk({ [D]: ["v=spf1 include:_spf.google.com ~all", "v=spf1 include:_spf.firebasemail.com ~all"], [`_dmarc.${D}`]: ["v=DMARC1; p=quarantine; pct=50"] }, {}, [],
  { status: 301, type: "text/html", body: "" }));
assert.equal(by(bad, "spf").status, "FAIL"); assert.match(by(bad, "spf").message, /exactly one/);
assert.equal(by(bad, "dkim1").status, "FAIL"); assert.equal(by(bad, "firebase-verify").status, "FAIL");
assert.equal(by(bad, "dmarc").status, "WARN"); assert.equal(bad.enforced, false);
assert.equal(by(bad, "bimi").status, "FAIL");
const noFirebase = await runChecks(mk({ [D]: ["v=spf1 include:_spf.google.com ~all"] }));
assert.match(by(noFirebase, "spf").message, /authorize Firebase/);
const redirecting = await runChecks(mk({ [`default._bimi.${D}`]: [`v=BIMI1; l=https://${D}/audityxelogo.svg; a=`] }, {}, [], { status: 301, type: "text/html", body: "" }));
assert.equal(by(redirecting, "bimi-logo").status, "FAIL"); assert.match(by(redirecting, "bimi-logo").message, /301/);
const badSvg = await runChecks(mk({ [`default._bimi.${D}`]: [`v=BIMI1; l=https://${D}/l.svg; a=`] }, {}, [], { status: 200, type: "image/svg+xml", body: '<svg version="1.1"><script/></svg>' }));
assert.equal(by(badSvg, "bimi-logo").status, "FAIL");
const newline = await runChecks(mk({ [`default._bimi.${D}`]: [`v=BIMI1;\nl=https://${D}/audityxelogo.svg;`] }));
assert.equal(by(newline, "bimi-format").status, "FAIL");
assert.equal(by(await runChecks(mk({ [`default._bimi.${D}`]: [`v=BIMI1; l=https://${D}/audityxelogo.svg; a=`] })), "bimi-format"), undefined);
console.log("email DNS checker tests passed");
