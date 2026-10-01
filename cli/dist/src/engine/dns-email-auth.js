"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkEmailAuthDns = checkEmailAuthDns;
const promises_1 = __importDefault(require("node:dns/promises"));
const COMMON_DKIM_SELECTORS = ["default", "google", "selector1", "selector2", "k1", "s1", "mail"];
/** Counts SPF mechanisms that each cost one DNS lookup toward RFC 7208's
 * hard limit of 10 (include, a, mx, ptr, exists, redirect — "all", "ip4",
 * and "ip6" are free). Doesn't recurse into included records' own
 * lookups (that needs following each include chain), so this is a floor,
 * not an exact count — but a record already at or past 10 top-level
 * lookups is already over budget regardless of what's nested inside. */
function countSpfLookupMechanisms(spf) {
    const matches = spf.match(/\b(?:include|a|mx|ptr|exists|redirect)(?:[:=]|(?=\s|$))/gi) || [];
    return matches.length;
}
async function checkEmailAuthDns(hostname, timeoutMs = 6000) {
    const empty = {
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
    const withTimeout = (p) => {
        let timer;
        const timeout = new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error("DNS lookup timed out")), timeoutMs);
        });
        return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
    };
    try {
        const txtRecords = await withTimeout(promises_1.default.resolveTxt(hostname)).catch(() => []);
        const flat = txtRecords.map((parts) => parts.join(""));
        const spfRecord = flat.find((r) => r.toLowerCase().startsWith("v=spf1")) || null;
        const spfIsPermissive = spfRecord ? /[~+]all\s*$/i.test(spfRecord.trim()) || !/[-~?]all/i.test(spfRecord) : false;
        const spfLookupCount = spfRecord ? countSpfLookupMechanisms(spfRecord) : 0;
        const spfExceedsLookupLimit = spfLookupCount > 10;
        let dmarcRecord = null;
        try {
            const dmarcTxt = await withTimeout(promises_1.default.resolveTxt(`_dmarc.${hostname}`));
            dmarcRecord = dmarcTxt.map((p) => p.join("")).find((r) => r.toLowerCase().startsWith("v=dmarc1")) || null;
        }
        catch {
            /* no DMARC record — leave null */
        }
        const dmarcPolicyMatch = dmarcRecord?.match(/p=(none|quarantine|reject)/i);
        const dmarcPolicy = dmarcPolicyMatch?.[1]?.toLowerCase() || null;
        const dkimChecks = await Promise.all(COMMON_DKIM_SELECTORS.map(async (selector) => {
            try {
                const recs = await withTimeout(promises_1.default.resolveTxt(`${selector}._domainkey.${hostname}`));
                return recs.some((r) => r.join("").toLowerCase().includes("v=dkim1"));
            }
            catch {
                return false;
            }
        }));
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
    }
    catch (err) {
        return { ...empty, error: err instanceof Error ? err.message : "DNS lookup failed." };
    }
}
