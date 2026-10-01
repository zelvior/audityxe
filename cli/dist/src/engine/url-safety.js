"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnsafeUrlError = void 0;
exports.assertSafeUrl = assertSafeUrl;
const dns_1 = require("dns");
const net_1 = require("net");
/**
 * SSRF protection for every outbound fetch Audityxe makes to a
 * user-supplied URL (the target site, redirect hops, robots.txt,
 * sitemap.xml, sampled links/images, og:image). Blocks:
 *   - non-http(s) schemes
 *   - literal loopback/private/link-local/reserved IPs (v4 and v6)
 *   - localhost and other well-known internal hostnames
 *   - cloud metadata endpoints (169.254.169.254, metadata.google.internal, etc.)
 *   - hostnames that resolve to any of the above (DNS-based SSRF)
 *
 * Known limitation: this validates the resolved IP at check time: a
 * malicious DNS server could theoretically change the answer between
 * this check and the actual fetch() call (DNS rebinding). Full
 * protection requires pinning the connection to the validated IP at the
 * socket level, which native fetch doesn't expose. As a mitigation, we
 * re-validate on every redirect hop (not just the first request), which
 * closes the most common real-world exploitation path.
 */
const BLOCKED_HOSTNAMES = new Set([
    "localhost",
    "metadata.google.internal",
    "metadata.goog",
    "instance-data",
]);
const BLOCKED_HOSTNAME_SUFFIXES = [".local", ".localhost", ".internal", ".corp", ".home", ".lan"];
class UnsafeUrlError extends Error {
    constructor(message) {
        super(message);
        this.name = "UnsafeUrlError";
    }
}
exports.UnsafeUrlError = UnsafeUrlError;
function ipv4ToInt(ip) {
    return ip.split(".").reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
}
function isPrivateIpv4(ip) {
    const int = ipv4ToInt(ip);
    const inRange = (base, bits) => {
        const baseInt = ipv4ToInt(base);
        const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
        return (int & mask) === (baseInt & mask);
    };
    return (inRange("0.0.0.0", 8) || // "this" network
        inRange("10.0.0.0", 8) || // RFC1918
        inRange("100.64.0.0", 10) || // CGNAT
        inRange("127.0.0.0", 8) || // loopback
        inRange("169.254.0.0", 16) || // link-local (incl. cloud metadata 169.254.169.254)
        inRange("172.16.0.0", 12) || // RFC1918
        inRange("192.0.0.0", 24) || // IETF protocol assignments
        inRange("192.0.2.0", 24) || // TEST-NET-1
        inRange("192.168.0.0", 16) || // RFC1918
        inRange("198.18.0.0", 15) || // benchmarking
        inRange("198.51.100.0", 24) || // TEST-NET-2
        inRange("203.0.113.0", 24) || // TEST-NET-3
        inRange("224.0.0.0", 4) || // multicast
        inRange("240.0.0.0", 4) // reserved
    );
}
function isPrivateIpv6(ip) {
    const normalized = ip.toLowerCase();
    if (normalized === "::1" || normalized === "::")
        return true; // loopback / unspecified
    if (normalized.startsWith("::ffff:")) {
        // IPv4-mapped IPv6 — unwrap and re-check as IPv4.
        const v4 = normalized.split(":").pop();
        if (v4 && (0, net_1.isIP)(v4) === 4)
            return isPrivateIpv4(v4);
    }
    if (/^fe80:/.test(normalized))
        return true; // link-local
    if (/^f[cd][0-9a-f]{2}:/.test(normalized))
        return true; // unique local (fc00::/7)
    if (/^ff/.test(normalized))
        return true; // multicast
    return false;
}
function isPrivateIp(ip) {
    const version = (0, net_1.isIP)(ip);
    if (version === 4)
        return isPrivateIpv4(ip);
    if (version === 6)
        return isPrivateIpv6(ip);
    return true; // not a recognizable IP at all — fail closed
}
function isBlockedHostname(hostname) {
    const h = hostname.toLowerCase().replace(/\.$/, "");
    if (BLOCKED_HOSTNAMES.has(h))
        return true;
    return BLOCKED_HOSTNAME_SUFFIXES.some((suffix) => h.endsWith(suffix));
}
/**
 * Validates that a URL is safe to fetch server-side: http(s) only, not a
 * blocked hostname, and — if it resolves via DNS — not a private/internal
 * IP. Throws UnsafeUrlError with a user-safe message on failure. Call
 * this before EVERY outbound fetch to a user/site-supplied URL,
 * including every redirect hop, not just the initial request.
 */
async function assertSafeUrl(rawUrl) {
    let url;
    try {
        url = new URL(rawUrl);
    }
    catch {
        throw new UnsafeUrlError("That doesn't look like a valid URL.");
    }
    if (!/^https?:$/.test(url.protocol)) {
        throw new UnsafeUrlError("Only http:// and https:// URLs can be audited.");
    }
    const hostname = url.hostname;
    if (!hostname) {
        throw new UnsafeUrlError("That URL has no valid hostname.");
    }
    if (isBlockedHostname(hostname)) {
        throw new UnsafeUrlError("This host can't be audited.");
    }
    // If the hostname is itself a literal IP, check it directly. IPv6
    // literals in a URL are bracketed (e.g. "[::1]") — net.isIP() doesn't
    // recognize the brackets, so strip them first or this would silently
    // fall through to DNS resolution instead of being caught here.
    const unbracketed = hostname.replace(/^\[|\]$/g, "");
    if ((0, net_1.isIP)(unbracketed)) {
        if (isPrivateIp(unbracketed)) {
            throw new UnsafeUrlError("This host can't be audited.");
        }
        return url;
    }
    // Otherwise resolve it and make sure every answer is a public address.
    let addresses;
    try {
        const results = await dns_1.promises.lookup(hostname, { all: true, verbatim: true });
        addresses = results.map((r) => r.address);
    }
    catch {
        throw new UnsafeUrlError("This domain doesn't resolve to anything.");
    }
    if (addresses.length === 0) {
        throw new UnsafeUrlError("This domain doesn't resolve to anything.");
    }
    if (addresses.some((addr) => isPrivateIp(addr))) {
        throw new UnsafeUrlError("This host resolves to a private or internal address and can't be audited.");
    }
    return url;
}
