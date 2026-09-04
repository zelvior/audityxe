import Link from "next/link";

/**
 * Long-form, static (server-rendered, no client JS required) content
 * block for the homepage. Two jobs at once:
 *  1. Content depth — the homepage's interactive tool above the fold is
 *     necessarily thin on visible copy; this gives crawlers and readers
 *     real substance to index and read.
 *  2. Organic search coverage for the audit-tool keyword space Audityxe
 *     competes in, written as genuinely useful reference material
 *     rather than keyword-stuffed filler — every heading answers a real
 *     question a visitor would search for.
 */
export default function HomepageSeoContent() {
  return (
    <section className="px-4 sm:px-6 py-12 sm:py-16 border-t border-border">
      <div className="max-w-3xl mx-auto">
        <h2 className="font-display font-bold text-2xl sm:text-3xl mb-4">
          Audityxe: a free website audit tool built on real evidence
        </h2>
        <p className="text-sm sm:text-base text-text-secondary mb-4 leading-relaxed">
          Audityxe is a free website audit tool and website analysis tool you run entirely online —
          no install, no signup required for your first check. Paste a URL into the website checker
          above and Audityxe acts as a website auditor, pulling the page's real HTTP response and
          HTML, then scoring it the same way for every site it looks at. If you've been searching
          for a website quality checker, a website health checker, or simply a free website audit
          online that doesn't ask you to trust a black-box number, this is built for that.
        </p>
        <p className="text-sm sm:text-base text-text-secondary mb-8 leading-relaxed">
          Every score traces back to something you can verify yourself in the response headers or
          page source — see the full{" "}
          <Link href="/methodology#how-audityxe-audits-and-scores" className="text-primary hover:underline">
            audit methodology
          </Link>{" "}
          for exactly how each category is calculated, or view a{" "}
          <Link href="/sample-report" className="text-primary hover:underline">
            free website audit report
          </Link>{" "}
          to see a real website audit report example before you run your own.
        </p>

        <h2 className="font-display font-bold text-xl sm:text-2xl mb-4">
          What Audityxe checks: SEO, performance, accessibility, security &amp; UX
        </h2>

        <h3 className="font-display font-semibold text-base sm:text-lg mb-2 mt-6">
          Free SEO audit &amp; technical SEO audit tool
        </h3>
        <p className="text-sm sm:text-base text-text-secondary mb-4 leading-relaxed">
          As a website SEO checker, Audityxe works as an seo website analyzer that inspects title
          tags, meta descriptions, heading hierarchy, canonical tags, structured data, robots.txt,
          and sitemap.xml — the same fundamentals a technical SEO audit tool should check before
          anything else. It's a genuine technical seo audit tool rather than a keyword-density
          gimmick.
        </p>

        <h3 className="font-display font-semibold text-base sm:text-lg mb-2 mt-6">
          Website performance audit &amp; speed checker
        </h3>
        <p className="text-sm sm:text-base text-text-secondary mb-4 leading-relaxed">
          On Pro, Audityxe runs a real browser-rendered website performance audit via Google
          PageSpeed Insights — functioning as both a website speed checker and a full website
          performance checker, covering Core Web Vitals (LCP, CLS, TBT) rather than estimating
          performance from static HTML alone.
        </p>

        <h3 className="font-display font-semibold text-base sm:text-lg mb-2 mt-6">
          Website accessibility checker &amp; accessibility audit tool
        </h3>
        <p className="text-sm sm:text-base text-text-secondary mb-4 leading-relaxed">
          As a website accessibility checker, Audityxe flags missing alt text, poor color contrast,
          missing form labels, and heading-hierarchy issues — the kind of thing any accessibility
          audit tool or website accessibility audit tool should catch before real users hit them.
        </p>

        <h3 className="font-display font-semibold text-base sm:text-lg mb-2 mt-6">
          Website security checker &amp; security headers checker
        </h3>
        <p className="text-sm sm:text-base text-text-secondary mb-4 leading-relaxed">
          Every audit doubles as a website security audit: Audityxe works as a website security
          checker and security headers checker, verifying HTTPS enforcement, HSTS,
          Content-Security-Policy, X-Frame-Options, and other response headers that a real security
          audit tool checks for.
        </p>

        <h3 className="font-display font-semibold text-base sm:text-lg mb-2 mt-6">
          Website UX audit &amp; conversion (CRO) audit
        </h3>
        <p className="text-sm sm:text-base text-text-secondary mb-4 leading-relaxed">
          Beyond technical checks, Audityxe runs a lightweight website ux audit and website
          usability checker pass — mobile viewport configuration, tap-target sizing, broken links,
          broken images — the same signals a landing page audit or website cro audit would flag as
          silently killing conversions. Think of it as a website ux checker built into the same
          score as everything else, not a separate paid add-on.
        </p>

        <h2 className="font-display font-bold text-xl sm:text-2xl mb-4 mt-10">
          How to audit a website: a step-by-step checklist
        </h2>
        <p className="text-sm sm:text-base text-text-secondary mb-4 leading-relaxed">
          If you're wondering how to audit a website or how to check website quality without
          hiring an agency, the short version — and roughly what Audityxe automates — looks like
          this website audit checklist:
        </p>
        <ol className="list-decimal pl-5 space-y-2 text-sm sm:text-base text-text-secondary mb-4">
          <li>Confirm HTTPS is enforced and security headers are present (website security audit).</li>
          <li>Check title tags, meta descriptions, and heading structure (how to audit a website for seo).</li>
          <li>Run a real performance pass — not just a guess from file sizes (website performance checker).</li>
          <li>Scan for accessibility issues: alt text, contrast, labels (accessibility audit tool).</li>
          <li>Test mobile viewport, tap targets, and broken links/images (website usability checker).</li>
          <li>Verify robots.txt, sitemap.xml, and canonical tags resolve correctly (technical seo audit tool).</li>
        </ol>
        <p className="text-sm sm:text-base text-text-secondary mb-8 leading-relaxed">
          Teams shipping a new site often run this as a website launch checklist or a broader
          production ready website checklist before going live — Audityxe compresses the same
          website technical audit checklist into one request instead of a dozen separate tools.
        </p>

        <h2 className="font-display font-bold text-xl sm:text-2xl mb-4">
          Understanding your Audityxe score
        </h2>
        <p className="text-sm sm:text-base text-text-secondary mb-4 leading-relaxed">
          Your website audit score is a website quality score out of 10, built from six weighted
          categories. It functions as a website quality benchmark you can compare across sites
          audited days or months apart, because Audityxe applies a strict same benchmark for every
          website — the same checks, the same weighting, every time, with no manual adjustment.
          That consistency is what makes it useful as a website benchmark tool and not just a
          one-off website quality audit.
        </p>
        <p className="text-sm sm:text-base text-text-secondary mb-4 leading-relaxed">
          Every fix suggestion is evidence-based: instead of a generic "improve your SEO" line,
          Audityxe points to the exact tag, header, or HTML pattern behind the deduction, so the
          website audit score reflects things you can literally go fix and re-check. Sites that
          consistently clear our production ready quality audit bar and meet Audityxe's own
          website quality standards can display an <strong>Audityxe Verified</strong> badge — see{" "}
          <Link href="/badge" className="text-primary hover:underline">
            /badge
          </Link>{" "}
          to generate one, or read the full{" "}
          <Link href="/audit-verification" className="text-primary hover:underline">
            audit verification
          </Link>{" "}
          page for how the Audityxe Standard and Audityxe Score are defined and how anyone can
          re-verify a badge live rather than taking it on faith.
        </p>
        <p className="text-sm sm:text-base text-text-secondary leading-relaxed">
          For teams that need to track this over time — a website compliance checklist, a recurring
          website audit benchmark, or simply a running website quality checklist — the{" "}
          <Link href="/pricing" className="text-primary hover:underline">
            Standard and Pro plans
          </Link>{" "}
          add daily audits, competitor comparison, and bulk auditing on top of the same free
          scoring engine.
        </p>
      </div>
    </section>
  );
}
