import { probe } from "./network-checks";
import { assertSafeUrl } from "./url-safety";
import { SiteContext, SiteType } from "./site-context";

export type LegalPageId =
  | "privacy"
  | "terms"
  | "cookies"
  | "about"
  | "faq"
  | "trust_center"
  | "dpa"
  | "acceptable_use"
  | "third_party_services"
  | "changelog"
  | "contact";

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

interface Catalog {
  id: LegalPageId;
  label: string;
  /** Matches either the href path or the visible link text. */
  hrefPattern: RegExp;
  textPattern: RegExp;
  /** Common real-world paths to probe directly when nothing in the HTML
   * links to this page — catches orphaned-but-real pages instead of
   * only trusting what happens to be in the nav/footer. */
  guessPaths: string[];
}

const CATALOG: Catalog[] = [
  {
    id: "privacy",
    label: "Privacy Policy",
    hrefPattern: /privacy/i,
    textPattern: /privacy/i,
    guessPaths: ["/privacy", "/privacy-policy", "/legal/privacy"],
  },
  {
    id: "terms",
    label: "Terms & Conditions",
    hrefPattern: /terms/i,
    textPattern: /terms\s*(of\s*(service|use)|&|and)?\s*(conditions)?/i,
    guessPaths: ["/terms", "/terms-of-service", "/tos", "/legal/terms"],
  },
  {
    id: "cookies",
    label: "Cookie Policy",
    hrefPattern: /cookie/i,
    textPattern: /cookie/i,
    guessPaths: ["/cookies", "/cookie-policy", "/legal/cookies"],
  },
  {
    id: "about",
    label: "About",
    hrefPattern: /\babout\b/i,
    textPattern: /\babout\b/i,
    guessPaths: ["/about", "/about-us"],
  },
  {
    id: "faq",
    label: "FAQ",
    hrefPattern: /faq/i,
    textPattern: /\bfaq\b|frequently asked/i,
    guessPaths: ["/faq", "/faqs", "/help/faq"],
  },
  {
    id: "trust_center",
    label: "Trust Center",
    hrefPattern: /trust[-_]?center/i,
    textPattern: /trust\s*center/i,
    guessPaths: ["/trust-center", "/trust"],
  },
  {
    id: "dpa",
    label: "Data Processing Agreement (DPA)",
    hrefPattern: /\bdpa\b|data-processing/i,
    textPattern: /\bdpa\b|data processing agreement/i,
    guessPaths: ["/dpa", "/legal/dpa", "/data-processing-agreement"],
  },
  {
    id: "acceptable_use",
    label: "Acceptable Use Policy",
    hrefPattern: /acceptable[-_]?use/i,
    textPattern: /acceptable use/i,
    guessPaths: ["/acceptable-use", "/aup", "/legal/acceptable-use"],
  },
  {
    id: "third_party_services",
    label: "Third-Party Services / Subprocessors",
    hrefPattern: /third[-_]?party|subprocessor/i,
    textPattern: /third[-\s]?party services|subprocessors?/i,
    guessPaths: ["/third-party-services", "/subprocessors", "/legal/subprocessors"],
  },
  {
    id: "changelog",
    label: "Changelog",
    hrefPattern: /changelog|release-notes/i,
    textPattern: /changelog|release notes|what'?s new/i,
    guessPaths: ["/changelog", "/release-notes"],
  },
  {
    id: "contact",
    label: "Contact",
    hrefPattern: /contact/i,
    textPattern: /contact/i,
    guessPaths: ["/contact", "/contact-us"],
  },
];

/**
 * Ranks each legal/trust page's real-world necessity against the site's
 * inferred context, rather than one fixed checklist for every site — a
 * one-page portfolio isn't missing anything by not having a DPA, but a
 * SaaS product handling customer data on their behalf genuinely is.
 */
function rankFor(id: LegalPageId, ctx: SiteContext): { rank: LegalPageRank; reason: string } {
  const t: SiteType = ctx.siteType;

  switch (id) {
    case "privacy":
      // Universally necessary the moment the site collects any personal
      // data (a form) or runs any tracking script — which is nearly
      // every real site, so this is "necessary" almost by default.
      if (ctx.collectsFormData || ctx.usesTrackingScripts) {
        return { rank: "necessary", reason: "the site collects form data and/or runs tracking scripts" };
      }
      return { rank: "recommended", reason: "no forms or tracking detected, but still standard practice" };

    case "terms":
      if (t === "ecommerce" || t === "saas") {
        return { rank: "necessary", reason: `a ${ctx.label.toLowerCase()} needs clear terms governing purchases/usage` };
      }
      return { rank: "recommended", reason: "good practice even without a transactional relationship" };

    case "cookies":
      if (ctx.usesTrackingScripts) {
        return { rank: "necessary", reason: "third-party analytics/ad scripts were detected on the page" };
      }
      return { rank: "skippable", reason: "no tracking scripts detected, so a dedicated cookie policy is optional" };

    case "about":
      return { rank: "recommended", reason: "builds basic trust for any site type" };

    case "faq":
      if (t === "ecommerce" || t === "saas") {
        return { rank: "recommended", reason: `common expectation for a ${ctx.label.toLowerCase()}` };
      }
      return { rank: "skippable", reason: "not a strong expectation for this site type" };

    case "trust_center":
      if (t === "saas") {
        return { rank: "recommended", reason: "SaaS buyers commonly expect security/compliance transparency" };
      }
      return { rank: "skippable", reason: "mainly expected from SaaS/platform products" };

    case "dpa":
      if (t === "saas") {
        return { rank: "necessary", reason: "a SaaS product processing customer data typically needs a DPA for B2B customers" };
      }
      return { rank: "skippable", reason: "only relevant to products processing data on another business's behalf" };

    case "acceptable_use":
      if (t === "saas") {
        return { rank: "recommended", reason: "platforms with user accounts/usage commonly publish an AUP" };
      }
      return { rank: "skippable", reason: "mainly relevant to platforms with user accounts or UGC" };

    case "third_party_services":
      if (t === "saas") {
        return { rank: "recommended", reason: "SaaS customers increasingly expect subprocessor transparency" };
      }
      return { rank: "skippable", reason: "mainly relevant to SaaS handling customer data via subprocessors" };

    case "changelog":
      if (t === "saas") {
        return { rank: "recommended", reason: "actively-developed SaaS products commonly publish release notes" };
      }
      return { rank: "skippable", reason: "a nice-to-have, not an expectation, for this site type" };

    case "contact":
      return { rank: "necessary", reason: "every legitimate site should offer some way to reach the owner" };
  }
}

function findLinked(html: string, baseUrl: string, entry: Catalog): string | null {
  const anchors = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)];
  for (const m of anchors) {
    const attrs = m[1];
    const text = m[2].replace(/<[^>]+>/g, " ").trim();
    const hrefMatch = attrs.match(/href\s*=\s*["']([^"']+)["']/i);
    if (!hrefMatch) continue;
    const href = hrefMatch[1];
    if (entry.hrefPattern.test(href) || entry.textPattern.test(text)) {
      try {
        return new URL(href, baseUrl).toString();
      } catch {
        continue;
      }
    }
  }
  return null;
}

export async function checkLegalPages(html: string, origin: string, baseUrl: string, ctx: SiteContext): Promise<LegalPagesResult> {
  const pages = await Promise.all(
    CATALOG.map(async (entry): Promise<LegalPageCheck> => {
      const { rank, reason } = rankFor(entry.id, ctx);
      const linkedUrl = findLinked(html, baseUrl, entry);

      let url = linkedUrl;
      let discoveredVia: "linked" | "guessed_path" | null = linkedUrl ? "linked" : null;
      let httpStatus: number | null = null;
      let found = false;

      if (url) {
        try {
          await assertSafeUrl(url);
          const r = await probe(url, "HEAD");
          httpStatus = r.status || null;
          found = r.ok;
        } catch {
          found = false;
        }
      }

      // Not linked anywhere (or the linked URL turned out dead) — try a
      // small, bounded set of conventional paths before concluding the
      // page genuinely doesn't exist. Fired concurrently (not one at a
      // time) since they're independent, small in number, and this way
      // a site with none of the guesses live doesn't cost 3x the latency.
      if (!found) {
        const guessResults = await Promise.all(
          entry.guessPaths.map(async (guess) => {
            const guessUrl = `${origin.replace(/\/$/, "")}${guess}`;
            try {
              await assertSafeUrl(guessUrl);
              const r = await probe(guessUrl, "HEAD");
              return r.ok ? { guessUrl, status: r.status } : null;
            } catch {
              return null;
            }
          })
        );
        const hit = guessResults.find((g): g is { guessUrl: string; status: number } => !!g);
        if (hit) {
          url = hit.guessUrl;
          httpStatus = hit.status;
          found = true;
          discoveredVia = "guessed_path";
        }
      }

      return {
        id: entry.id,
        label: entry.label,
        rank,
        rankReason: reason,
        found,
        discoveredVia: found ? discoveredVia : null,
        url: found ? url : linkedUrl,
        httpStatus,
      };
    })
  );

  return { checked: true, pages };
}
