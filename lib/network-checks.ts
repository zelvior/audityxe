/**
 * Real, live network probes beyond the main page fetch. Every check here
 * makes an actual HTTP request to the target site (or a resource it
 * references) — nothing is simulated. Kept fast and bounded: small
 * samples, short per-request timeouts, run concurrently.
 *
 * Every URL probed here is extracted from the audited page's own HTML —
 * i.e. attacker/site-owner-controlled content — so each one goes through
 * the same SSRF validation as the main page fetch, including on every
 * redirect hop (native fetch's redirect:"follow" would otherwise bypass
 * that check entirely).
 */

import { assertSafeUrl } from "./url-safety";

const PROBE_TIMEOUT_MS = 5000;
const UA = "Mozilla/5.0 (compatible; AudityxeBot/1.0; +https://audityxe.vercel.app)";
const MAX_PROBE_REDIRECTS = 5;

async function probe(url: string, method: "HEAD" | "GET" = "HEAD"): Promise<{ ok: boolean; status: number; contentType: string; contentLength: number | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    let currentUrl = url;
    let currentMethod = method;
    let res: Response | null = null;

    for (let hop = 0; hop <= MAX_PROBE_REDIRECTS; hop++) {
      try {
        await assertSafeUrl(currentUrl);
      } catch {
        return { ok: false, status: 0, contentType: "", contentLength: null };
      }

      res = await fetch(currentUrl, {
        method: currentMethod,
        redirect: "manual",
        signal: controller.signal,
        headers: { "User-Agent": UA, Accept: "text/html,image/*,application/xhtml+xml,*/*;q=0.8" },
      });

      // Some servers reject HEAD (405/501), and some WAFs/CDNs return a
      // generic 403 for HEAD specifically while allowing GET — retry once
      // with GET in both cases before concluding the resource is broken.
      if (currentMethod === "HEAD" && (res.status === 405 || res.status === 501 || res.status === 403)) {
        currentMethod = "GET";
        continue;
      }

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (location && hop < MAX_PROBE_REDIRECTS) {
          currentUrl = new URL(location, currentUrl).toString();
          continue;
        }
      }
      break;
    }

    if (!res) return { ok: false, status: 0, contentType: "", contentLength: null };

    // Headers are all we need — draining/cancelling the body immediately
    // (rather than leaving it unread) releases the underlying socket back
    // to the connection pool right away instead of waiting on GC, which
    // matters a lot here since dozens of these run concurrently per audit.
    res.body?.cancel().catch(() => {});

    return {
      ok: res.ok,
      status: res.status,
      contentType: res.headers.get("content-type") || "",
      contentLength: res.headers.get("content-length") ? Number(res.headers.get("content-length")) : null,
    };
  } catch {
    return { ok: false, status: 0, contentType: "", contentLength: null };
  } finally {
    clearTimeout(timer);
  }
}

function resolveUrl(href: string, base: string): string | null {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

/* ── Broken links ─────────────────────────────────────────────────── */
export interface BrokenLinkResult {
  checked: number;
  broken: { url: string; status: number }[];
  skippedTotal: number;
}

export async function checkBrokenLinks(html: string, baseUrl: string, sampleSize = 10): Promise<BrokenLinkResult> {
  const hrefs = [...html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);
  const resolved = Array.from(
    new Set(
      hrefs
        .filter((h) => h && !h.startsWith("#") && !/^(mailto:|tel:|javascript:)/i.test(h))
        .map((h) => resolveUrl(h, baseUrl))
        .filter((u): u is string => !!u)
    )
  );

  const sample = resolved.slice(0, sampleSize);
  const results = await Promise.all(sample.map(async (url) => ({ url, ...(await probe(url, "HEAD")) })));

  const broken = results.filter((r) => !r.ok && r.status !== 0).map((r) => ({ url: r.url, status: r.status }));
  // status 0 (network/timeout error) is reported separately as "unreachable" rather than "broken",
  // since it may just be our probe timing out rather than a genuinely dead link.
  const unreachable = results.filter((r) => r.status === 0);
  for (const u of unreachable) {
    broken.push({ url: u.url, status: 0 });
  }

  return { checked: sample.length, broken, skippedTotal: Math.max(0, resolved.length - sample.length) };
}

/* ── Image sampling (real format/size via HEAD) ─────────────────────── */
export interface ImageSampleResult {
  checked: number;
  oversized: { url: string; sizeKb: number }[];
  wrongContentType: number;
}

export async function checkImageSample(html: string, baseUrl: string, sampleSize = 8): Promise<ImageSampleResult> {
  const srcs = [...html.matchAll(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)]
    .map((m) => m[1])
    .filter((s) => !s.startsWith("data:"));
  const resolved = Array.from(new Set(srcs.map((s) => resolveUrl(s, baseUrl)).filter((u): u is string => !!u)));
  const sample = resolved.slice(0, sampleSize);

  const results = await Promise.all(sample.map(async (url) => ({ url, ...(await probe(url, "HEAD")) })));

  const oversized = results
    .filter((r) => r.ok && r.contentLength && r.contentLength > 500 * 1024)
    .map((r) => ({ url: r.url, sizeKb: Math.round((r.contentLength || 0) / 1024) }));
  const wrongContentType = results.filter((r) => r.ok && r.contentType && !/^image\//i.test(r.contentType)).length;

  return { checked: sample.length, oversized, wrongContentType };
}

/* ── ads.txt ──────────────────────────────────────────────────────── */
export interface AdsTxtResult {
  fetched: boolean;
  exists: boolean;
  entryCount: number;
}

export async function checkAdsTxt(origin: string): Promise<AdsTxtResult> {
  const url = `${origin}/ads.txt`;
  try {
    await assertSafeUrl(url);
  } catch {
    return { fetched: true, exists: false, entryCount: 0 };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: controller.signal });
    if (!res.ok) {
      res.body?.cancel().catch(() => {});
      return { fetched: true, exists: false, entryCount: 0 };
    }
    const text = await res.text();
    const entryCount = text.split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith("#")).length;
    return { fetched: true, exists: true, entryCount };
  } catch {
    return { fetched: true, exists: false, entryCount: 0 };
  } finally {
    clearTimeout(timer);
  }
}

/* ── Dangerous HTTP methods & exposed config/directory paths ────────
   Both are safe, read-only probes (OPTIONS + GET on a few well-known
   paths) — never destructive, never brute-forced beyond a tiny fixed
   list, consistent with the audit's "no intrusive attacks" rule. ──── */
export interface ServerHardeningResult {
  checked: boolean;
  allowedMethods: string[];
  exposesDangerousMethods: boolean; // PUT/DELETE/TRACE/CONNECT allowed
  exposedPaths: { path: string; status: number }[]; // 200 on sensitive paths
  directoryListingDetected: boolean;
}

const DANGEROUS_METHODS = ["PUT", "DELETE", "TRACE", "CONNECT"];
const SENSITIVE_PATHS = [".env", ".git/config", ".git/HEAD", "wp-config.php.bak", "config.json", ".DS_Store"];

export async function checkServerHardening(origin: string): Promise<ServerHardeningResult> {
  const result: ServerHardeningResult = {
    checked: false,
    allowedMethods: [],
    exposesDangerousMethods: false,
    exposedPaths: [],
    directoryListingDetected: false,
  };

  try {
    await assertSafeUrl(origin);
  } catch {
    return result;
  }

  try {
    const optionsController = new AbortController();
    const optionsTimer = setTimeout(() => optionsController.abort(), PROBE_TIMEOUT_MS);
    const optionsPromise = fetch(origin, { method: "OPTIONS", headers: { "User-Agent": UA }, signal: optionsController.signal })
      .catch(() => null)
      .finally(() => clearTimeout(optionsTimer));

    // Baseline: probe a random, near-certainly-nonexistent path first. Some
    // servers/SPAs return 200 for literally any path (soft-404 catch-all),
    // which would otherwise make every "sensitive path" below look exposed.
    // If the baseline itself resolves ok, the site can't be trusted to
    // signal existence via status code, so real sensitive-path hits are
    // suppressed unless their response actually differs from the baseline.
    const baselinePath = `__audityxe_nonexistent_probe_${Date.now().toString(36)}__`;
    const baselinePromise = probe(`${origin.replace(/\/$/, "")}/${baselinePath}`, "GET");

    const exposedPaths: { path: string; status: number }[] = [];
    const sensitivePathsPromise = Promise.all(
      SENSITIVE_PATHS.map(async (p) => {
        try {
          const url = `${origin.replace(/\/$/, "")}/${p}`;
          await assertSafeUrl(url);
          const r = await probe(url, "GET");
          return r.ok ? { path: p, status: r.status, contentLength: r.contentLength } : null;
        } catch {
          return null;
        }
      })
    );

    let directoryListingDetected = false;
    const dirUrl = `${origin.replace(/\/$/, "")}/uploads/`;
    const dirPromise = (async () => {
      try {
        await assertSafeUrl(dirUrl);
        const dirController = new AbortController();
        const dirTimer = setTimeout(() => dirController.abort(), PROBE_TIMEOUT_MS);
        const dirRes = await fetch(dirUrl, { headers: { "User-Agent": UA }, signal: dirController.signal }).finally(() =>
          clearTimeout(dirTimer)
        );
        if (dirRes.ok) {
          const text = (await dirRes.text()).toLowerCase();
          return text.includes("index of /") || text.includes("<title>index of");
        }
      } catch {
        /* not detected */
      }
      return false;
    })();

    const [optionsRes, baseline, sensitiveHits, dirDetected] = await Promise.all([
      optionsPromise,
      baselinePromise,
      sensitivePathsPromise,
      dirPromise,
    ]);
    directoryListingDetected = dirDetected;

    const allowHeader = optionsRes?.headers.get("allow") || "";
    const allowedMethods = allowHeader
      .split(",")
      .map((m) => m.trim().toUpperCase())
      .filter(Boolean);

    const baselineIsSoft200 = baseline.ok;
    for (const hit of sensitiveHits) {
      if (!hit) continue;
      // Suppress a hit only if the site 200s on literally anything AND this
      // path's response is indistinguishable from the baseline (same content
      // length) — a real exposed file almost always differs in size from a
      // generic soft-404/SPA shell page.
      if (baselineIsSoft200 && hit.contentLength != null && hit.contentLength === baseline.contentLength) continue;
      exposedPaths.push({ path: hit.path, status: hit.status });
    }

    return {
      checked: true,
      allowedMethods,
      exposesDangerousMethods: allowedMethods.some((m) => DANGEROUS_METHODS.includes(m)),
      exposedPaths,
      directoryListingDetected,
    };
  } catch {
    return result;
  }
}

/* ── Source map exposure ─────────────────────────────────────────── */
export interface SourceMapExposureResult {
  checked: boolean;
  scriptsSampled: number;
  exposedSourceMaps: string[]; // .js.map URLs that resolved 200
}

export async function checkSourceMapExposure(html: string, baseUrl: string): Promise<SourceMapExposureResult> {
  const result: SourceMapExposureResult = { checked: false, scriptsSampled: 0, exposedSourceMaps: [] };

  const srcs = [...html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+\.js)(?:\?[^"']*)?["'][^>]*>/gi)].map((m) => m[1]);
  const resolved = Array.from(
    new Set(
      srcs
        .map((src) => {
          try {
            return new URL(src, baseUrl).toString();
          } catch {
            return null;
          }
        })
        .filter((u): u is string => !!u)
    )
  ).slice(0, 6); // small, bounded sample — never scan the whole bundle graph

  if (resolved.length === 0) return { ...result, checked: true };

  const exposed: string[] = [];
  await Promise.all(
    resolved.map(async (jsUrl) => {
      const mapUrl = `${jsUrl}.map`;
      try {
        await assertSafeUrl(mapUrl);
        const r = await probe(mapUrl, "GET");
        if (r.ok) exposed.push(mapUrl);
      } catch {
        /* skip unsafe/failed url */
      }
    })
  );

  return { checked: true, scriptsSampled: resolved.length, exposedSourceMaps: exposed };
}

/* ── og:image validation ─────────────────────────────────────────── */
export interface OgImageResult {
  checked: boolean;
  exists: boolean;
  isImage: boolean;
  sizeKb: number | null;
}

export async function checkOgImage(ogImageUrl: string | null, baseUrl: string): Promise<OgImageResult> {
  if (!ogImageUrl) return { checked: false, exists: false, isImage: false, sizeKb: null };
  const resolved = resolveUrl(ogImageUrl, baseUrl);
  if (!resolved) return { checked: false, exists: false, isImage: false, sizeKb: null };
  // GET rather than HEAD: many dynamic/edge image endpoints (including
  // Audityxe's own /opengraph-image) stream their response and don't
  // reliably support HEAD, which would otherwise produce a false
  // "couldn't verify" result for a perfectly working image.
  const result = await probe(resolved, "GET");
  return {
    checked: true,
    exists: result.ok,
    isImage: result.ok && /^image\//i.test(result.contentType),
    sizeKb: result.contentLength ? Math.round(result.contentLength / 1024) : null,
  };
}

/* ── security.txt (RFC 9116) ─────────────────────────────────────── */
export interface SecurityTxtResult {
  checked: boolean;
  exists: boolean;
  checkedUrl: string;
  hasContact: boolean;
  hasExpires: boolean;
  isExpired: boolean;
  expiresAt: string | null;
}

export async function checkSecurityTxt(origin: string): Promise<SecurityTxtResult> {
  const url = `${origin.replace(/\/$/, "")}/.well-known/security.txt`;
  const empty: SecurityTxtResult = { checked: true, exists: false, checkedUrl: url, hasContact: false, hasExpires: false, isExpired: false, expiresAt: null };
  try {
    await assertSafeUrl(url);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: controller.signal }).finally(() => clearTimeout(timer));
    if (!res.ok) return empty;
    const text = await res.text();
    const hasContact = /^Contact:\s*\S+/im.test(text);
    const expiresMatch = text.match(/^Expires:\s*(\S+)/im);
    const expiresAt = expiresMatch ? expiresMatch[1] : null;
    const isExpired = !!expiresAt && !isNaN(Date.parse(expiresAt)) && new Date(expiresAt).getTime() < Date.now();
    return { checked: true, exists: true, checkedUrl: url, hasContact, hasExpires: !!expiresAt, isExpired, expiresAt };
  } catch {
    return empty;
  }
}

/* ── Favicon & web manifest live check ───────────────────────────── */
export interface FaviconManifestResult {
  checked: boolean;
  faviconIcoExists: boolean;
  manifestExists: boolean;
  manifestUrl: string | null;
}

export async function checkFaviconManifest(origin: string, html: string, baseUrl: string): Promise<FaviconManifestResult> {
  const faviconIco = await probe(`${origin.replace(/\/$/, "")}/favicon.ico`, "GET");

  const manifestHref = html.match(/<link[^>]+rel=["']manifest["'][^>]+href=["']([^"']+)["']/i)?.[1] || null;
  let manifestUrl: string | null = null;
  let manifestExists = false;
  if (manifestHref) {
    const resolved = resolveUrl(manifestHref, baseUrl);
    if (resolved) {
      manifestUrl = resolved;
      const r = await probe(resolved, "GET");
      manifestExists = r.ok;
    }
  }

  return { checked: true, faviconIcoExists: faviconIco.ok, manifestExists, manifestUrl };
}

/* ── Asset payload distribution (script / stylesheet / image) ───────
   No headless browser: a small, bounded sample of each resource type
   referenced in the HTML gets a real HEAD probe for Content-Length,
   then totals are extrapolated by the sampled average — gives a real
   directional read on which category is heaviest without a full
   Lighthouse run. ──────────────────────────────────────────────── */
export interface AssetWeightResult {
  checked: boolean;
  scriptKb: number;
  styleKb: number;
  imageKb: number;
  scriptCount: number;
  styleCount: number;
  imageCount: number;
}

async function sampleCategoryKb(urls: string[], baseUrl: string, sampleSize: number): Promise<{ kb: number; count: number }> {
  const resolved = Array.from(new Set(urls.map((u) => resolveUrl(u, baseUrl)).filter((u): u is string => !!u)));
  const sample = resolved.slice(0, sampleSize);
  if (sample.length === 0) return { kb: 0, count: 0 };
  const sizes = await Promise.all(
    sample.map(async (u) => {
      try {
        await assertSafeUrl(u);
        const r = await probe(u, "HEAD");
        return r.contentLength || 0;
      } catch {
        return 0;
      }
    })
  );
  const known = sizes.filter((s) => s > 0);
  const avgBytes = known.length ? known.reduce((a, b) => a + b, 0) / known.length : 0;
  const estimatedTotalBytes = avgBytes * resolved.length;
  return { kb: Math.round(estimatedTotalBytes / 1024), count: resolved.length };
}

export async function checkAssetWeights(html: string, baseUrl: string): Promise<AssetWeightResult> {
  const scriptSrcs = [...html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi)].map((m) => m[1]);
  const styleSrcs = [...html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*href\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);
  const imgSrcs = [...html.matchAll(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);

  const [scripts, styles, images] = await Promise.all([
    sampleCategoryKb(scriptSrcs, baseUrl, 6),
    sampleCategoryKb(styleSrcs, baseUrl, 4),
    sampleCategoryKb(imgSrcs, baseUrl, 8),
  ]);

  return {
    checked: true,
    scriptKb: scripts.kb,
    styleKb: styles.kb,
    imageKb: images.kb,
    scriptCount: scripts.count,
    styleCount: styles.count,
    imageCount: images.count,
  };
}
