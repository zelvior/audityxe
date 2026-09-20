"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkDnsSecurity = checkDnsSecurity;
const promises_1 = __importDefault(require("node:dns/promises"));
const TAKEOVER_PATTERNS = [
    { pattern: /\.github\.io$/i, service: "GitHub Pages" },
    { pattern: /\.herokuapp\.com$/i, service: "Heroku" },
    { pattern: /\.herokudns\.com$/i, service: "Heroku DNS" },
    { pattern: /\.s3([.-][a-z0-9-]+)?\.amazonaws\.com$/i, service: "Amazon S3" },
    { pattern: /\.azurewebsites\.net$/i, service: "Azure App Service" },
    { pattern: /\.cloudapp\.azure\.com$/i, service: "Azure Cloud Service" },
    { pattern: /\.blob\.core\.windows\.net$/i, service: "Azure Blob Storage" },
    { pattern: /\.trafficmanager\.net$/i, service: "Azure Traffic Manager" },
    { pattern: /\.fastly\.net$/i, service: "Fastly" },
    { pattern: /\.pantheonsite\.io$/i, service: "Pantheon" },
    { pattern: /\.wpengine\.com$/i, service: "WP Engine" },
    { pattern: /\.zendesk\.com$/i, service: "Zendesk" },
    { pattern: /\.shopify\.com$/i, service: "Shopify" },
    { pattern: /\.surge\.sh$/i, service: "Surge.sh" },
    { pattern: /\.netlify\.app$/i, service: "Netlify" },
    { pattern: /\.vercel\.app$/i, service: "Vercel" },
    { pattern: /\.bitbucket\.io$/i, service: "Bitbucket Pages" },
    { pattern: /\.helpjuice\.com$/i, service: "Helpjuice" },
    { pattern: /\.helpscoutdocs\.com$/i, service: "Help Scout" },
    { pattern: /\.tumblr\.com$/i, service: "Tumblr" },
    { pattern: /\.unbouncepages\.com$/i, service: "Unbounce" },
];
/**
 * DNSSEC status via a DNS-over-HTTPS lookup with the DNSSEC OK (do) bit
 * set: a resolver that validates and sets the Authenticated Data (AD)
 * flag on the response confirms the zone is properly signed. Node's
 * built-in dns module has no DNSSEC-aware resolver, so this is the only
 * reliable way to check it without shelling out to `dig`.
 */
async function checkDnssec(hostname, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=DNSKEY&do=1`, { headers: { Accept: "application/dns-json" }, signal: controller.signal });
        if (!res.ok)
            return false;
        const data = await res.json();
        return !!data?.AD;
    }
    catch {
        return false;
    }
    finally {
        clearTimeout(timer);
    }
}
async function checkDnsSecurity(hostname, timeoutMs = 6000) {
    const empty = {
        fetched: false,
        error: null,
        hasCaaRecords: false,
        caaIssuers: [],
        cnameTarget: null,
        cnamePointsToKnownService: null,
        cnameTargetResolves: true,
        possibleDanglingCname: false,
        dnssecEnabled: false,
        mxRecords: [],
        nsRecords: [],
        nsProviderDiversity: false,
        hasSoaRecord: false,
        nsLookupFailed: true,
        soaLookupFailed: true,
    };
    const withTimeout = (p) => {
        let timer;
        const timeout = new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error("DNS lookup timed out")), timeoutMs);
        });
        return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
    };
    try {
        // CAA, CNAME, and DNSSEC are three independent DNS round trips — run
        // them concurrently instead of one after another. Each has its own
        // timeout, so this alone can cut this check's worst-case latency by
        // roughly two-thirds compared to running them in sequence.
        let nsLookupFailed = false;
        let soaLookupFailed = false;
        const [caaSettled, cnameSettled, dnssecEnabled, mxSettled, nsSettled, soaSettled] = await Promise.all([
            withTimeout(promises_1.default.resolveCaa(hostname)).catch(() => []),
            withTimeout(promises_1.default.resolveCname(hostname)).catch(() => []),
            checkDnssec(hostname, timeoutMs).catch(() => false),
            withTimeout(promises_1.default.resolveMx(hostname)).catch(() => []),
            withTimeout(promises_1.default.resolveNs(hostname)).catch(() => {
                nsLookupFailed = true;
                return [];
            }),
            withTimeout(promises_1.default.resolveSoa(hostname))
                .then(() => true)
                .catch(() => {
                soaLookupFailed = true;
                return false;
            }),
        ]);
        const hasCaaRecords = caaSettled.length > 0;
        const caaIssuers = caaSettled.map((r) => r.issue || r.issuewild || "").filter(Boolean);
        const cnameTarget = cnameSettled[0] || null;
        let cnamePointsToKnownService = null;
        let cnameTargetResolves = true;
        let possibleDanglingCname = false;
        if (cnameTarget) {
            const match = TAKEOVER_PATTERNS.find((t) => t.pattern.test(cnameTarget));
            cnamePointsToKnownService = match?.service || null;
            try {
                await withTimeout(promises_1.default.resolve4(cnameTarget)).catch(() => withTimeout(promises_1.default.resolve6(cnameTarget)));
            }
            catch {
                cnameTargetResolves = false;
            }
            // Flagged as a possible takeover only when the CNAME target is a
            // known third-party service pattern AND that target itself fails
            // to resolve — a live, correctly-configured service resolves fine,
            // so this combination is what actually signals an abandoned/
            // unclaimed subdomain pointing at a takeover-able service.
            possibleDanglingCname = !!cnamePointsToKnownService && !cnameTargetResolves;
        }
        // NS provider diversity — compare the registrable "provider domain"
        // (last two labels of each nameserver, e.g. ns1.cloudflare.com →
        // cloudflare.com) rather than the full hostname, since a single
        // provider's own nameservers are never literally identical strings
        // but still represent one point of failure for the whole zone.
        const providerDomains = new Set(nsSettled.map((ns) => {
            const parts = ns.replace(/\.$/, "").split(".");
            return parts.slice(-2).join(".").toLowerCase();
        }));
        return {
            fetched: true,
            error: null,
            hasCaaRecords,
            caaIssuers,
            cnameTarget,
            cnamePointsToKnownService,
            cnameTargetResolves,
            possibleDanglingCname,
            dnssecEnabled,
            mxRecords: mxSettled,
            nsRecords: nsSettled,
            nsProviderDiversity: providerDomains.size > 1,
            hasSoaRecord: soaSettled,
            nsLookupFailed,
            soaLookupFailed,
        };
    }
    catch (err) {
        return { ...empty, error: err instanceof Error ? err.message : "DNS lookup failed." };
    }
}
