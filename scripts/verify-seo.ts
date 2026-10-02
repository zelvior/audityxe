/**
 * Build-time guardrail for the SEO/GEO pages. Run: npx tsx scripts/verify-seo.ts
 * Fails (exit 1) if content data and the footer link list drift, any
 * llms.txt link points to a route that doesn't exist, or a claim marked
 * "not-available" slips into a page as a feature.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CAPABILITIES, CHECK_PAGES, COMPARISON_PAGES, allSeoPages } from "../lib/seo-content";
import { SEO_DEEP_LINKS } from "../lib/seo-nav";

const root = join(__dirname, "..");
let failed = 0;
const fail = (m: string) => { console.error("FAIL:", m); failed++; };

// 1. footer deep links == content data
const expected = new Set([...CHECK_PAGES.map((c) => `/checks/${c.slug}`), ...COMPARISON_PAGES.map((c) => `/compare/${c.slug}`)]);
const actual = new Set(SEO_DEEP_LINKS.map((l) => l.href));
for (const e of Array.from(expected)) if (!actual.has(e)) fail(`seo-nav missing ${e}`);
for (const a of Array.from(actual)) if (!expected.has(a)) fail(`seo-nav has stale ${a}`);

// 2. every registered page has a route file
for (const p of allSeoPages()) {
  const dir = p.path.split("/").filter(Boolean);
  const direct = join(root, "app", ...dir, "page.tsx");
  const dynamic = join(root, "app", dir[0] ?? "", "[slug]", "page.tsx");
  if (!existsSync(direct) && !existsSync(dynamic)) fail(`no route for ${p.path}`);
}

// 3. every internal link in llms.txt / llms-full.txt resolves to a known page or static file
const known = new Set(["/", ...allSeoPages().map((p) => p.path)]);
const staticOk = ["/pricing", "/sample-report", "/methodology", "/faq", "/api-docs", "/openapi.yaml", "/changelog", "/roadmap", "/llms-full.txt", "/license", "/guide", "/about"];
for (const f of ["public/llms.txt", "public/llms-full.txt"]) {
  const txt = readFileSync(join(root, f), "utf8");
  for (const m of Array.from(txt.matchAll(/https:\/\/audityxe\.xyz(\/[^\s)]*)?/g))) {
    const path = (m[1] || "/").replace(/[.,;]$/, "");
    if (known.has(path) || staticOk.includes(path)) continue;
    const dir = path.split("/").filter(Boolean);
    if (existsSync(join(root, "app", ...dir, "page.tsx")) || existsSync(join(root, "public", ...dir))) continue;
    fail(`${f} links to missing ${path}`);
  }
}

// 4. facts that must stay true
const must = (id: string, status: string) => {
  const c = CAPABILITIES.find((x) => x.id === id);
  if (!c || c.status !== status) fail(`capability ${id} expected ${status}, got ${c?.status}`);
};
must("npm", "available"); must("docker", "not-available"); must("sarif", "not-available");
must("owasp-top-10", "not-available"); must("compliance", "not-available"); must("config-file", "not-available");
const cli = readFileSync(join(root, "cli/src/index.ts"), "utf8");
for (const flag of ["--deep", "--max", "--ultra", "--compare", "--psi-key", "--min-score", "--track", "--json", "--no-color"]) {
  if (!cli.includes(flag)) fail(`CLI no longer implements ${flag} but docs claim it`);
}
for (const bogus of ["--fail-on-warning", "--severity", "--ignore-rules", "--verbose", "--silent", "--output"]) {
  if (cli.includes(`"${bogus}"`)) fail(`CLI now implements ${bogus} — update CAPABILITIES (it is marked not-available)`);
}
const pkg = JSON.parse(readFileSync(join(root, "cli/package.json"), "utf8"));
if (pkg.name !== "audityxe-cli") fail(`cli package name is ${pkg.name}, docs say audityxe-cli`);
if (!/18\.17/.test(pkg.engines?.node || "")) fail(`cli engines.node is ${pkg.engines?.node}, docs say 18.17`);

// 5. the sitemap must contain only indexable, crawlable, unique URLs
// (a noindex or robots-blocked entry shows up as a Search Console error)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sitemapEntries: { url: string }[] = require("../app/sitemap").default();
const seen = new Set<string>();
const robotsSrc = readFileSync(join(root, "app/robots.ts"), "utf8");
const disallowed = Array.from(robotsSrc.matchAll(/disallow\s*=\s*\[([^\]]*)\]/g)).flatMap((m) => Array.from(m[1].matchAll(/"([^"]+)"/g)).map((x) => x[1]));
for (const { url } of sitemapEntries) {
  if (seen.has(url)) fail(`sitemap lists ${url} twice`);
  seen.add(url);
  if (!url.startsWith("https://audityxe.xyz")) fail(`sitemap URL on wrong host: ${url}`);
  const path = url.replace("https://audityxe.xyz", "") || "/";
  if (disallowed.some((d) => path === d || path.startsWith(d.endsWith("/") ? d : d + "/"))) fail(`sitemap lists robots-blocked ${path}`);
  const dir = path.split("/").filter(Boolean);
  for (const f of [join(root, "app", ...dir, "page.tsx"), join(root, "app", ...dir, "layout.tsx")]) {
    if (!existsSync(f)) continue;
    if (/noindexMeta\(|index:\s*false/.test(readFileSync(f, "utf8"))) fail(`sitemap lists noindex page ${path} (${f.replace(root + "/", "")})`);
  }
}

console.log(failed ? `${failed} problem(s)` : "seo content verified");
process.exit(failed ? 1 : 0);
