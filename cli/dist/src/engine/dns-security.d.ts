export interface DnsSecurityInfo {
    fetched: boolean;
    error: string | null;
    hasCaaRecords: boolean;
    caaIssuers: string[];
    cnameTarget: string | null;
    cnamePointsToKnownService: string | null;
    cnameTargetResolves: boolean;
    possibleDanglingCname: boolean;
    dnssecEnabled: boolean;
    mxRecords: {
        exchange: string;
        priority: number;
    }[];
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
export declare function checkDnsSecurity(hostname: string, timeoutMs?: number): Promise<DnsSecurityInfo>;
