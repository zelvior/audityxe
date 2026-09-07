import dns from "node:dns/promises";

export interface EmailAuthInfo {
  fetched: boolean;
  error: string | null;
  hasSpf: boolean;
  spfRecord: string | null;
  spfIsPermissive: boolean; // ends in ~all or +all instead of -all
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

const COMMON_DKIM_SELECTORS = ["default", "google", "selector1", "selector2", "k1", "s1", "mail"];

/** Counts SPF mechanisms that each cost one DNS lookup toward RFC 7208's
 * hard limit of 10 (include, a, mx, ptr, exists, redirect — "all", "ip4",
 * and "ip6" are free). Doesn't recurse into included records' own
 * lookups (that needs following each include chain), so this is a floor,
 * not an exact count — but a record already at or past 10 top-level
 * lookups is already over budget regardless of what's nested inside. */
function countSpfLookupMechanisms(spf: string): number {
  const matches = spf.match(/\b(?:include|a|mx|ptr|exists|redirect)(?:[:=]|(?=\s|$))/gi) || [];
  return matches.length;
}

export async function checkEmailAuthDns(hostname: string, timeoutMs = 6000): Promise<EmailAuthInfo> {
  const empty: EmailAuthInfo = {
    fetched: false,
    error: null,
    hasSpf: false,
    spfRecord: null,
    spfIsPermissive: false,
    spfLookupCount: 0,
    spfExceedsLookupLimit: false,
    hasDmarc: false,
    dmarcRecord: null,
    dmarcPolicy: null,
    dkimSelectorsChecked: COMMON_DKIM_SELECTORS,
    hasDkimOnAnyCommonSelector: false,
  };

  const withTimeout = <T>(p: Promise<T>): Promise<T> => {
    let timer: ReturnType<typeof setTimeout>;
    const timeout = new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error("DNS lookup timed out")), timeoutMs);
    });
    return Promise.race<T>([p, timeout]).finally(() => clearTimeout(timer));
  };

  try {
    const txtRecords: string[][] = await withTimeout(dns.resolveTxt(hostname)).catch(() => [] as string[][]);
    const flat = txtRecords.map((parts: string[]) => parts.join(""));

    const spfRecord = flat.find((r: string) => r.toLowerCase().startsWith("v=spf1")) || null;
    const spfIsPermissive = spfRecord ? /[~+]all\s*$/i.test(spfRecord.trim()) || !/[-~?]all/i.test(spfRecord) : false;
    const spfLookupCount = spfRecord ? countSpfLookupMechanisms(spfRecord) : 0;
    const spfExceedsLookupLimit = spfLookupCount > 10;

    let dmarcRecord: string | null = null;
    try {
      const dmarcTxt: string[][] = await withTimeout(dns.resolveTxt(`_dmarc.${hostname}`));
      dmarcRecord = dmarcTxt.map((p: string[]) => p.join("")).find((r: string) => r.toLowerCase().startsWith("v=dmarc1")) || null;
    } catch {
      /* no DMARC record — leave null */
    }
    const dmarcPolicyMatch = dmarcRecord?.match(/p=(none|quarantine|reject)/i);
    const dmarcPolicy = (dmarcPolicyMatch?.[1]?.toLowerCase() as EmailAuthInfo["dmarcPolicy"]) || null;

    const dkimChecks = await Promise.all(
      COMMON_DKIM_SELECTORS.map(async (selector) => {
        try {
          const recs: string[][] = await withTimeout(dns.resolveTxt(`${selector}._domainkey.${hostname}`));
          return recs.some((r: string[]) => r.join("").toLowerCase().includes("v=dkim1"));
        } catch {
          return false;
        }
      })
    );

    return {
      fetched: true,
      error: null,
      hasSpf: !!spfRecord,
      spfRecord,
      spfIsPermissive,
      spfLookupCount,
      spfExceedsLookupLimit,
      hasDmarc: !!dmarcRecord,
      dmarcRecord,
      dmarcPolicy,
      dkimSelectorsChecked: COMMON_DKIM_SELECTORS,
      hasDkimOnAnyCommonSelector: dkimChecks.some(Boolean),
    };
  } catch (err) {
    return { ...empty, error: err instanceof Error ? err.message : "DNS lookup failed." };
  }
}
