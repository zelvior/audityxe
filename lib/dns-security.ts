import dns from "node:dns/promises";

export interface DnsSecurityInfo {
  fetched: boolean;
  error: string | null;
  hasCaaRecords: boolean;
  caaIssuers: string[];
  cnameTarget: string | null;
  cnamePointsToKnownService: string | null; // e.g. "GitHub Pages", "Heroku"
  cnameTargetResolves: boolean;
  possibleDanglingCname: boolean;
  dnssecEnabled: boolean;
  mxRecords: { exchange: string; priority: number }[];
  nsRecords: string[];
  /** True when nameservers span 2+ distinct root providers (e.g. one
   * NS on Cloudflare, one on AWS) — a single provider is a single point
   * of failure for the entire zone. */
  nsProviderDiversity: boolean;
  hasSoaRecord: boolean;
  /** True when the NS lookup itself errored/timed out — as opposed to
   * resolving successfully with zero records. Every delegated domain has
   * NS records, so an empty result almost always means the lookup
   * failed, not that the domain truly has none; conflating the two used
   * to produce a confident-sounding "no NS records" finding when really
   * nothing was verified. */
  nsLookupFailed: boolean;
  /** Same distinction as nsLookupFailed, for the SOA lookup. */
  soaLookupFailed: boolean;
}

const TAKEOVER_PATTERNS: { pattern: RegExp; service: string }[] = [
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
async function checkDnssec(hostname: string, timeoutMs: number): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=DNSKEY&do=1`,
      { headers: { Accept: "application/dns-json" }, signal: controller.signal }
    );
    if (!res.ok) return false;
    const data = await res.json();
    return !!data?.AD;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function checkDnsSecurity(hostname: string, timeoutMs = 6000): Promise<DnsSecurityInfo> {
  const empty: DnsSecurityInfo = {
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

  const withTimeout = <T>(p: Promise<T>): Promise<T> => {
    let timer: ReturnType<typeof setTimeout>;
    const timeout = new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error("DNS lookup timed out")), timeoutMs);
    });
    return Promise.race<T>([p, timeout]).finally(() => clearTimeout(timer));
  };

  try {
    // CAA, CNAME, and DNSSEC are three independent DNS round trips — run
    // them concurrently instead of one after another. Each has its own
    // timeout, so this alone can cut this check's worst-case latency by
    // roughly two-thirds compared to running them in sequence.
    let nsLookupFailed = false;
    let soaLookupFailed = false;

    const [caaSettled, cnameSettled, dnssecEnabled, mxSettled, nsSettled, soaSettled] = await Promise.all([
      withTimeout(dns.resolveCaa(hostname)).catch(() => [] as { issue?: string; issuewild?: string }[]),
      withTimeout(dns.resolveCname(hostname)).catch(() => [] as string[]),
      checkDnssec(hostname, timeoutMs).catch(() => false),
      withTimeout(dns.resolveMx(hostname)).catch(() => [] as { exchange: string; priority: number }[]),
      withTimeout(dns.resolveNs(hostname)).catch(() => {
        nsLookupFailed = true;
        return [] as string[];
      }),
      withTimeout(dns.resolveSoa(hostname))
        .then(() => true)
        .catch(() => {
          soaLookupFailed = true;
          return false;
        }),
    ]);

    const hasCaaRecords = caaSettled.length > 0;
    const caaIssuers = caaSettled.map((r) => r.issue || r.issuewild || "").filter(Boolean);

    const cnameTarget: string | null = cnameSettled[0] || null;

    let cnamePointsToKnownService: string | null = null;
    let cnameTargetResolves = true;
    let possibleDanglingCname = false;

    if (cnameTarget) {
      const match = TAKEOVER_PATTERNS.find((t) => t.pattern.test(cnameTarget as string));
      cnamePointsToKnownService = match?.service || null;

      try {
        await withTimeout(dns.resolve4(cnameTarget)).catch(() => withTimeout(dns.resolve6(cnameTarget as string)));
      } catch {
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
    const providerDomains = new Set(
      nsSettled.map((ns) => {
        const parts = ns.replace(/\.$/, "").split(".");
        return parts.slice(-2).join(".").toLowerCase();
      })
    );

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
  } catch (err) {
    return { ...empty, error: err instanceof Error ? err.message : "DNS lookup failed." };
  }
}
