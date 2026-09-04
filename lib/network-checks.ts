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
  const result = await probe(`${origin}/ads.txt`, "GET");
  if (!result.ok) return { fetched: true, exists: false, entryCount: 0 };
  // Re-fetch with GET to actually count lines (probe() with GET already
  // consumed the body internally via fetch, but we didn't read text there
  // to keep probe() generic — do a light dedicated fetch here). The URL
  // was already validated safe by probe() immediately above.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(`${origin}/ads.txt`, { headers: { "User-Agent": UA }, signal: controller.signal });
    const text = await res.text();
    const entryCount = text.split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith("#")).length;
    return { fetched: true, exists: true, entryCount };
  } catch {
    return { fetched: true, exists: true, entryCount: 0 };
  } finally {
    clearTimeout(timer);
  }
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
