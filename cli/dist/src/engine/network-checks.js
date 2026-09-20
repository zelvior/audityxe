"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.probe = probe;
exports.checkBrokenLinks = checkBrokenLinks;
exports.checkImageSample = checkImageSample;
exports.checkAdsTxt = checkAdsTxt;
exports.checkServerHardening = checkServerHardening;
exports.checkSourceMapExposure = checkSourceMapExposure;
exports.checkOgImage = checkOgImage;
exports.checkSecurityTxt = checkSecurityTxt;
exports.checkFaviconManifest = checkFaviconManifest;
exports.checkCookieFlags = checkCookieFlags;
exports.checkRedirectChain = checkRedirectChain;
exports.checkAssetWeights = checkAssetWeights;
const url_safety_1 = require("./url-safety");
const PROBE_TIMEOUT_MS = 5000;
const UA = "Mozilla/5.0 (compatible; AudityxeBot/1.0; +https://audityxe.vercel.app)";
const MAX_PROBE_REDIRECTS = 5;
async function probe(url, method = "HEAD") {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    try {
        let currentUrl = url;
        let currentMethod = method;
        let res = null;
        for (let hop = 0; hop <= MAX_PROBE_REDIRECTS; hop++) {
            try {
                await (0, url_safety_1.assertSafeUrl)(currentUrl);
            }
            catch {
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
        if (!res)
            return { ok: false, status: 0, contentType: "", contentLength: null };
        // Headers are all we need — draining/cancelling the body immediately
        // (rather than leaving it unread) releases the underlying socket back
        // to the connection pool right away instead of waiting on GC, which
        // matters a lot here since dozens of these run concurrently per audit.
        res.body?.cancel().catch(() => { });
        return {
            ok: res.ok,
            status: res.status,
            contentType: res.headers.get("content-type") || "",
            contentLength: res.headers.get("content-length") ? Number(res.headers.get("content-length")) : null,
        };
    }
    catch {
        return { ok: false, status: 0, contentType: "", contentLength: null };
    }
    finally {
        clearTimeout(timer);
    }
}
function resolveUrl(href, base) {
    try {
        return new URL(href, base).toString();
    }
    catch {
        return null;
    }
}
async function checkBrokenLinks(html, baseUrl, sampleSize = 10) {
    const hrefs = [...html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);
    const resolved = Array.from(new Set(hrefs
        .filter((h) => h && !h.startsWith("#") && !/^(mailto:|tel:|javascript:)/i.test(h))
        .map((h) => resolveUrl(h, baseUrl))
        .filter((u) => !!u)));
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
async function checkImageSample(html, baseUrl, sampleSize = 8) {
    const srcs = [...html.matchAll(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)]
        .map((m) => m[1])
        .filter((s) => !s.startsWith("data:"));
    const resolved = Array.from(new Set(srcs.map((s) => resolveUrl(s, baseUrl)).filter((u) => !!u)));
    const sample = resolved.slice(0, sampleSize);
    const results = await Promise.all(sample.map(async (url) => ({ url, ...(await probe(url, "HEAD")) })));
    const oversized = results
        .filter((r) => r.ok && r.contentLength && r.contentLength > 500 * 1024)
        .map((r) => ({ url: r.url, sizeKb: Math.round((r.contentLength || 0) / 1024) }));
    const wrongContentType = results.filter((r) => r.ok && r.contentType && !/^image\//i.test(r.contentType)).length;
    return { checked: sample.length, oversized, wrongContentType };
}
async function checkAdsTxt(origin) {
    const url = `${origin}/ads.txt`;
    try {
        await (0, url_safety_1.assertSafeUrl)(url);
    }
    catch {
        return { fetched: true, exists: false, entryCount: 0 };
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    try {
        const res = await fetch(url, { headers: { "User-Agent": UA }, signal: controller.signal });
        if (!res.ok) {
            res.body?.cancel().catch(() => { });
            return { fetched: true, exists: false, entryCount: 0 };
        }
        const text = await res.text();
        const entryCount = text.split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith("#")).length;
        return { fetched: true, exists: true, entryCount };
    }
    catch {
        return { fetched: true, exists: false, entryCount: 0 };
    }
    finally {
        clearTimeout(timer);
    }
}
const DANGEROUS_METHODS = ["PUT", "DELETE", "TRACE", "CONNECT"];
const SENSITIVE_PATHS = [".env", ".git/config", ".git/HEAD", "wp-config.php.bak", "config.json", ".DS_Store"];
async function checkServerHardening(origin) {
    const result = {
        checked: false,
        allowedMethods: [],
        exposesDangerousMethods: false,
        exposedPaths: [],
        directoryListingDetected: false,
    };
    try {
        await (0, url_safety_1.assertSafeUrl)(origin);
    }
    catch {
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
        const exposedPaths = [];
        const sensitivePathsPromise = Promise.all(SENSITIVE_PATHS.map(async (p) => {
            try {
                const url = `${origin.replace(/\/$/, "")}/${p}`;
                await (0, url_safety_1.assertSafeUrl)(url);
                const r = await probe(url, "GET");
                return r.ok ? { path: p, status: r.status, contentLength: r.contentLength } : null;
            }
            catch {
                return null;
            }
        }));
        let directoryListingDetected = false;
        const dirUrl = `${origin.replace(/\/$/, "")}/uploads/`;
        const dirPromise = (async () => {
            try {
                await (0, url_safety_1.assertSafeUrl)(dirUrl);
                const dirController = new AbortController();
                const dirTimer = setTimeout(() => dirController.abort(), PROBE_TIMEOUT_MS);
                const dirRes = await fetch(dirUrl, { headers: { "User-Agent": UA }, signal: dirController.signal }).finally(() => clearTimeout(dirTimer));
                if (dirRes.ok) {
                    const text = (await dirRes.text()).toLowerCase();
                    return text.includes("index of /") || text.includes("<title>index of");
                }
            }
            catch {
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
            if (!hit)
                continue;
            // Suppress a hit only if the site 200s on literally anything AND this
            // path's response is indistinguishable from the baseline (same content
            // length) — a real exposed file almost always differs in size from a
            // generic soft-404/SPA shell page.
            if (baselineIsSoft200 && hit.contentLength != null && hit.contentLength === baseline.contentLength)
                continue;
            exposedPaths.push({ path: hit.path, status: hit.status });
        }
        return {
            checked: true,
            allowedMethods,
            exposesDangerousMethods: allowedMethods.some((m) => DANGEROUS_METHODS.includes(m)),
            exposedPaths,
            directoryListingDetected,
        };
    }
    catch {
        return result;
    }
}
async function checkSourceMapExposure(html, baseUrl) {
    const result = { checked: false, scriptsSampled: 0, exposedSourceMaps: [] };
    const srcs = [...html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+\.js)(?:\?[^"']*)?["'][^>]*>/gi)].map((m) => m[1]);
    const resolved = Array.from(new Set(srcs
        .map((src) => {
        try {
            return new URL(src, baseUrl).toString();
        }
        catch {
            return null;
        }
    })
        .filter((u) => !!u))).slice(0, 6); // small, bounded sample — never scan the whole bundle graph
    if (resolved.length === 0)
        return { ...result, checked: true };
    const exposed = [];
    await Promise.all(resolved.map(async (jsUrl) => {
        const mapUrl = `${jsUrl}.map`;
        try {
            await (0, url_safety_1.assertSafeUrl)(mapUrl);
            const r = await probe(mapUrl, "GET");
            if (r.ok)
                exposed.push(mapUrl);
        }
        catch {
            /* skip unsafe/failed url */
        }
    }));
    return { checked: true, scriptsSampled: resolved.length, exposedSourceMaps: exposed };
}
async function checkOgImage(ogImageUrl, baseUrl) {
    if (!ogImageUrl)
        return { checked: false, exists: false, isImage: false, sizeKb: null };
    const resolved = resolveUrl(ogImageUrl, baseUrl);
    if (!resolved)
        return { checked: false, exists: false, isImage: false, sizeKb: null };
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
async function checkSecurityTxt(origin) {
    const url = `${origin.replace(/\/$/, "")}/.well-known/security.txt`;
    const empty = { checked: true, exists: false, checkedUrl: url, hasContact: false, hasExpires: false, isExpired: false, expiresAt: null };
    try {
        await (0, url_safety_1.assertSafeUrl)(url);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
        const res = await fetch(url, { headers: { "User-Agent": UA }, signal: controller.signal }).finally(() => clearTimeout(timer));
        if (!res.ok)
            return empty;
        const text = await res.text();
        const hasContact = /^Contact:\s*\S+/im.test(text);
        const expiresMatch = text.match(/^Expires:\s*(\S+)/im);
        const expiresAt = expiresMatch ? expiresMatch[1] : null;
        const isExpired = !!expiresAt && !isNaN(Date.parse(expiresAt)) && new Date(expiresAt).getTime() < Date.now();
        return { checked: true, exists: true, checkedUrl: url, hasContact, hasExpires: !!expiresAt, isExpired, expiresAt };
    }
    catch {
        return empty;
    }
}
async function checkFaviconManifest(origin, html, baseUrl) {
    const faviconIco = await probe(`${origin.replace(/\/$/, "")}/favicon.ico`, "GET");
    const manifestHref = html.match(/<link[^>]+rel=["']manifest["'][^>]+href=["']([^"']+)["']/i)?.[1] || null;
    let manifestUrl = null;
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
async function checkCookieFlags(origin) {
    const result = { checked: false, cookieCount: 0, missingSecure: [], missingHttpOnly: [], missingSameSite: [] };
    try {
        await (0, url_safety_1.assertSafeUrl)(origin);
    }
    catch {
        return result;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    try {
        const res = await fetch(origin, { headers: { "User-Agent": UA }, redirect: "manual", signal: controller.signal });
        res.body?.cancel().catch(() => { });
        const raw = res.headers.getSetCookie?.() ?? [];
        const setCookieHeaders = raw.length ? raw : (res.headers.get("set-cookie") ? [res.headers.get("set-cookie")] : []);
        const missingSecure = [];
        const missingHttpOnly = [];
        const missingSameSite = [];
        for (const line of setCookieHeaders) {
            const name = line.split("=")[0]?.trim() || "unknown";
            if (!/;\s*secure/i.test(line))
                missingSecure.push(name);
            if (!/;\s*httponly/i.test(line))
                missingHttpOnly.push(name);
            if (!/;\s*samesite/i.test(line))
                missingSameSite.push(name);
        }
        return { checked: true, cookieCount: setCookieHeaders.length, missingSecure, missingHttpOnly, missingSameSite };
    }
    catch {
        return result;
    }
    finally {
        clearTimeout(timer);
    }
}
async function checkRedirectChain(rawUrl) {
    const result = { checked: false, hopCount: 0, chain: [], isLoop: false, excessiveHops: false, httpsUpgradeMissing: false };
    const chain = [];
    let currentUrl = rawUrl;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS * 2);
    try {
        for (let hop = 0; hop < MAX_PROBE_REDIRECTS + 2; hop++) {
            try {
                await (0, url_safety_1.assertSafeUrl)(currentUrl);
            }
            catch {
                break;
            }
            chain.push(currentUrl);
            if (new Set(chain).size !== chain.length) {
                return { checked: true, hopCount: chain.length - 1, chain, isLoop: true, excessiveHops: false, httpsUpgradeMissing: false };
            }
            const res = await fetch(currentUrl, { method: "HEAD", redirect: "manual", signal: controller.signal, headers: { "User-Agent": UA } });
            res.body?.cancel().catch(() => { });
            if (res.status >= 300 && res.status < 400) {
                const location = res.headers.get("location");
                if (!location)
                    break;
                currentUrl = new URL(location, currentUrl).toString();
                continue;
            }
            break;
        }
        const httpsUpgradeMissing = rawUrl.startsWith("http://") && chain.length > 0 && !chain.some((u) => u.startsWith("https://"));
        return { checked: true, hopCount: Math.max(0, chain.length - 1), chain, isLoop: false, excessiveHops: chain.length - 1 > 3, httpsUpgradeMissing };
    }
    catch {
        return result;
    }
    finally {
        clearTimeout(timer);
    }
}
async function sampleCategoryKb(urls, baseUrl, sampleSize) {
    const resolved = Array.from(new Set(urls.map((u) => resolveUrl(u, baseUrl)).filter((u) => !!u)));
    const sample = resolved.slice(0, sampleSize);
    if (sample.length === 0)
        return { kb: 0, count: 0 };
    const sizes = await Promise.all(sample.map(async (u) => {
        try {
            await (0, url_safety_1.assertSafeUrl)(u);
            const r = await probe(u, "HEAD");
            return r.contentLength || 0;
        }
        catch {
            return 0;
        }
    }));
    const known = sizes.filter((s) => s > 0);
    const avgBytes = known.length ? known.reduce((a, b) => a + b, 0) / known.length : 0;
    const estimatedTotalBytes = avgBytes * resolved.length;
    return { kb: Math.round(estimatedTotalBytes / 1024), count: resolved.length };
}
async function checkAssetWeights(html, baseUrl) {
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
