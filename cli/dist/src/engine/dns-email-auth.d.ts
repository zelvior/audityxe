export interface EmailAuthInfo {
    fetched: boolean;
    error: string | null;
    hasSpf: boolean;
    spfRecord: string | null;
    spfIsPermissive: boolean;
    /** Count of DNS-lookup-consuming mechanisms (include/a/mx/ptr/exists/
     * redirect) in the SPF record. RFC 7208 hard-caps this at 10 — going
     * over means receiving mail servers return a permerror and can treat
     * the record as if SPF wasn't published at all. */
    spfLookupCount: number;
    spfExceedsLookupLimit: boolean;
    hasDmarc: boolean;
    dmarcRecord: string | null;
    dmarcPolicy: "none" | "quarantine" | "reject" | null;
    dkimSelectorsChecked: string[];
    hasDkimOnAnyCommonSelector: boolean;
}
export declare function checkEmailAuthDns(hostname: string, timeoutMs?: number): Promise<EmailAuthInfo>;
