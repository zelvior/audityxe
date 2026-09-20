import { SiteContext } from "./site-context";
export type LegalPageId = "privacy" | "terms" | "cookies" | "about" | "faq" | "trust_center" | "dpa" | "acceptable_use" | "third_party_services" | "changelog" | "contact";
export type LegalPageRank = "necessary" | "recommended" | "skippable";
export interface LegalPageCheck {
    id: LegalPageId;
    label: string;
    rank: LegalPageRank;
    /** Why it got that rank for *this* site — shown as evidence, never a
     * silent fixed table, since the same page can be necessary for one
     * site type and skippable for another. */
    rankReason: string;
    found: boolean;
    /** How it was found — a real <a> link on the page, or a direct
     * live probe of a conventional path when no link existed. */
    discoveredVia: "linked" | "guessed_path" | null;
    url: string | null;
    httpStatus: number | null;
}
export interface LegalPagesResult {
    checked: boolean;
    pages: LegalPageCheck[];
}
export declare function checkLegalPages(html: string, origin: string, baseUrl: string, ctx: SiteContext): Promise<LegalPagesResult>;
