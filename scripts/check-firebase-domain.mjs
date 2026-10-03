#!/usr/bin/env node
/**
 * Checks whether a domain is in your Firebase project's Authorized domains —
 * the usual reason the console says "An error occurred updating action URL".
 *
 * It calls the same public endpoint the Firebase JS SDK itself uses to
 * validate domains (GET identitytoolkit.googleapis.com/v1/projects), with the
 * public web API key already shipped in your site's JavaScript.
 *
 *   node scripts/check-firebase-domain.mjs                 # checks audityxe.xyz
 *   node scripts/check-firebase-domain.mjs example.com
 *   NEXT_PUBLIC_FIREBASE_API_KEY=... node scripts/check-firebase-domain.mjs
 */
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDsGnFrKRgQhnzsekz11mPT5geMlpKCrhg";
const BASE = process.env.FIREBASE_API_BASE || "https://identitytoolkit.googleapis.com";
const domain = (process.argv[2] || "audityxe.xyz").replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase();

const res = await fetch(`${BASE}/v1/projects?key=${encodeURIComponent(API_KEY)}`, {
  headers: { Referer: "https://audityxe.xyz/" },
});
const body = await res.json().catch(() => ({}));

if (!res.ok) {
  console.error(`Firebase returned HTTP ${res.status}: ${body?.error?.message || JSON.stringify(body)}`);
  console.error("If this is an API-key restriction error, run the check from the Firebase console instead.");
  process.exit(2);
}

const domains = (body.authorizedDomains || []).map((d) => String(d).toLowerCase());
console.log(`Project: ${body.projectId}`);
console.log(`Authorized domains: ${domains.join(", ") || "(none)"}`);

if (domains.includes(domain)) {
  console.log(`\nOK  ${domain} is authorized. The action URL should save.`);
  console.log("    If the console still errors, the project itself is refusing the change — see firebase/email-templates/README.md, step 'If it still fails'.");
} else {
  console.log(`\nMISSING  ${domain} is NOT in the list.`);
  console.log("    Firebase Console → Authentication → Settings → Authorized domains → Add domain →");
  console.log(`    enter exactly:  ${domain}   (no https://, no path), then save the action URL again.`);
  process.exit(1);
}
