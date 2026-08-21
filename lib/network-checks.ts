/**
 * Real, live network probes beyond the main page fetch. Every check here
 * makes an actual HTTP request to the target site (or a resource it
 * references) — nothing is simulated. Kept fast and bounded: small
 * samples, short per-request timeouts, run concurrently.
 */

const PROBE_TIMEOUT_MS = 5000;
const UA = "Mozilla/5.0 (compatible; AudityxeBot/1.0; +https://audityxe.app)";

async function probe(url: string, method: "HEAD" | "GET" = "HEAD"): Promise<{ ok: boolean; status: number; contentType: string; contentLength: number | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    let res = await fetch(url, {
      method,
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": UA,
        Accept: "text/html,image/*,application/xhtml+xml,*/*;q=0.8",
      },
    });
    // Some servers reject HEAD (405/501), and some WAFs/CDNs return a
    // generic 403 for HEAD specifically while allowing GET — retry once
    // with GET in both cases before concluding the resource is broken.
    if (method === "HEAD" && (res.status === 405 || res.status === 501 || res.status === 403)) {
      res = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: { "User-Agent": UA, Accept: "text/html,image/*,application/xhtml+xml,*/*;q=0.8" },
      });
    }
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
  // to keep probe() generic — do a light dedicated fetch here).
  try {
    const res = await fetch(`${origin}/ads.txt`, { headers: { "User-Agent": UA } });
    const text = await res.text();
    const entryCount = text.split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith("#")).length;
    return { fetched: true, exists: true, entryCount };
  } catch {
    return { fetched: true, exists: true, entryCount: 0 };
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
  const result = await probe(resolved, "HEAD");
  return {
    checked: true,
    exists: result.ok,
    isImage: result.ok && /^image\//i.test(result.contentType),
    sizeKb: result.contentLength ? Math.round(result.contentLength / 1024) : null,
  };
}
