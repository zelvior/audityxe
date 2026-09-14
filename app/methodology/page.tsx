import type { Metadata } from "next";
import { canonicalMeta } from "@/lib/seo";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, XCircle, PenSquare } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { breadcrumbJsonLd } from "@/lib/breadcrumb";

export const metadata: Metadata = {
  ...canonicalMeta("methodology"),
  title: "Methodology — How Audityxe measures your site",
  description:
    "A transparent breakdown of exactly what Audityxe measures, how each score is calculated, what's deterministic vs. written commentary, and where the limits are.",
};

function Section({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-10 scroll-mt-24">
      <h2 className="font-display font-semibold text-lg sm:text-xl mb-3">{title}</h2>
      <div className="space-y-3 text-sm sm:text-base text-text-secondary leading-relaxed">{children}</div>
    </section>
  );
}

export default function MethodologyPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd("Methodology", "methodology")).replace(/</g, "\\u003c"),
        }}
      />
      <Header />
      <div className="flex-1 px-4 sm:px-6 py-10 sm:py-14">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-text-secondary hover:text-primary transition mb-6"
          >
            <ArrowLeft size={14} /> Back to Audityxe
          </Link>

          <p className="text-xs font-mono text-text-secondary mb-3">METHODOLOGY</p>
          <h1 className="font-display font-bold text-3xl sm:text-4xl tracking-tight mb-4">
            How Audityxe <span className="hand-underline hand-underline--alt">actually measures</span> a site
          </h1>
          <p className="text-text-secondary text-sm sm:text-base mb-10">
            No black box. Here's exactly what happens between you pasting a URL and getting a
            score — what's measured directly, what's written commentary, and where the limits are.
          </p>

          <Section title="How Audityxe audits & scores a website" id="how-audityxe-audits-and-scores">
            <p>
              Short version, before the detailed sections below: when you submit a URL, Audityxe's
              audit engine makes a live HTTP request to that exact page — not a cached copy, not a
              database lookup — and parses the real HTML and response headers it gets back. There's
              no headless browser rendering JavaScript at this stage (that's what the Pro-only
              PageSpeed pass adds separately, below); this first pass reads what any server or bot
              would actually receive.
            </p>
            <p>From that single live fetch, the pipeline runs roughly seventeen distinct checks across six categories:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Technical &amp; Metadata Health</strong> — title tag, meta description, canonical tag, viewport meta, charset, doctype.</li>
              <li><strong>SEO Foundations</strong> — heading hierarchy (one H1, logical H2/H3 order), structured data (JSON-LD), robots.txt and sitemap.xml fetched live and checked for real matches, Open Graph and Twitter Card tags.</li>
              <li><strong>Security</strong> — HTTPS enforcement, HSTS, Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, and other response headers read directly off the live HTTP response.</li>
              <li><strong>Accessibility</strong> — image alt text coverage, form label association, color-contrast heuristics, heading structure re-checked from an accessibility angle.</li>
              <li><strong>UX &amp; Technical Hygiene</strong> — mobile viewport configuration, tap-target sizing signals, a sampled pass over on-page links and images to flag ones that 404 or fail to load, ads.txt presence where relevant.</li>
              <li><strong>Performance</strong> (Pro only) — a real browser-rendered pass via Google PageSpeed Insights, covering Core Web Vitals (LCP, CLS, TBT, FCP, Speed Index) rather than estimating from static HTML.</li>
            </ul>
            <p>
              Every category score is <strong>deterministic</strong>: the same input HTML and
              headers always produce the same category score, computed by fixed rules, not a
              language model guessing a number. The <strong>overall score</strong> (out of 10) is a
              weighted average of the six category scores — the exact weights and thresholds are
              documented in Section 4 below. The one place a model is involved at all is optional
              written commentary (the one-line verdict, and — Pro-only, bring-your-own-key — promo
              copy); it never touches the numbers themselves.
            </p>
            <p>
              Audityxe applies the <strong>same strict benchmark to every website</strong> it
              audits — there's no per-industry curve, no "good enough for a small business" leniency,
              no manual override. That's what makes a website audit score comparable across two
              unrelated sites, or across the same site audited weeks apart: the yardstick never
              moves.
            </p>
            <p>
              Every fix suggestion is <strong>evidence-based</strong>: rather than a generic "improve
              your SEO" note, each one names the exact tag, header, or HTML pattern that caused the
              deduction, so you can verify it yourself in view-source and re-run the audit to
              confirm the fix landed. See Section 6 below for exactly how fixes are generated.
            </p>
            <p>
              Full detail on every one of these — the exact network requests made, the category
              weighting formula, competitor-comparison methodology, and what Audityxe deliberately
              can't measure — is in the sections below.
            </p>
          </Section>

          <Section title="1. What happens on submit">
            <p>
              When you click "Analyze Now," our server fetches your page's live HTML directly —
              the same way a browser or search engine crawler would, with a real HTTP request,
              following real redirects, reading real response headers. There is no cached
              database of pre-scored sites; every audit is a fresh network request made at that
              moment.
            </p>
            <p>
              In parallel, we also fetch your site's real <code>/robots.txt</code> and{" "}
              <code>/sitemap.xml</code>, sample a handful of your on-page links and images with
              live HTTP requests, check for a real <code>/ads.txt</code> file, and run a real
              browser-rendered performance and accessibility pass. Nothing here is simulated — see
              the "Live network requests" section below for the exact list.
            </p>
          </Section>

          <Section title="2. Deterministic measurements vs. written commentary">
            <p>
              This distinction matters, so we keep it explicit everywhere in the product:
            </p>
            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <div className="glass rounded-card p-4">
                <p className="flex items-center gap-2 font-semibold text-sm mb-2 text-emerald">
                  <CheckCircle2 size={15} /> Deterministic measurements
                </p>
                <p className="text-xs sm:text-sm">
                  All 6 category scores, all 17 deep-audit modules, and every "pass/warn/fail"
                  finding come from parsing the real HTML and HTTP responses, or from a real
                  browser-rendered audit pass — never from guesswork. Run the same audit twice
                  against an unchanged page and you'll get the same score.
                </p>
              </div>
              <div className="glass rounded-card p-4">
                <p className="flex items-center gap-2 font-semibold text-sm mb-2 text-accent">
                  <PenSquare size={15} /> Written commentary
                </p>
                <p className="text-xs sm:text-sm">
                  The one-line verdict, the X/LinkedIn promo copy, and the banner's headline/
                  tagline are generated based on your real scores as input. If that generation is
                  ever unavailable, a built-in rule-based writer produces equivalent copy from the
                  same real data — the scores never change, only the wording.
                </p>
              </div>
            </div>
          </Section>

          <Section title="3. Live network requests made during a single audit">
            <ul className="list-disc list-inside space-y-1.5">
              <li>The target page itself, with manual redirect-chain tracking (real hop count, HTTPS→HTTP downgrade detection)</li>
              <li><code>/robots.txt</code> — existence, rules, sitemap cross-reference</li>
              <li><code>/sitemap.xml</code> — validity, URL count, freshness data</li>
              <li><code>/ads.txt</code> — existence and entry count</li>
              <li>Up to 10 on-page links, checked live via HEAD/GET for broken (404/410/5xx) responses</li>
              <li>Up to 8 on-page images, checked live via HEAD for actual file size and content-type</li>
              <li>The declared <code>og:image</code> URL, checked live to confirm it actually loads as an image</li>
              <li>A full render of the page in real Chrome (via Google's PageSpeed Insights service) for performance, accessibility, and Core Web Vitals</li>
            </ul>
          </Section>

          <Section title="4. How the 6 category scores are calculated">
            <p>
              Each category starts from a baseline and real signals add or subtract points —
              never randomness. For example, <strong>Technical & Metadata Health</strong> adds
              points for a present meta description, canonical tag, HTTPS, structured data, and a
              cross-referenced sitemap, and subtracts points for a missing robots.txt, a blanket{" "}
              <code>Disallow: /</code>, or a <code>noindex</code> directive. The exact formulas are
              open in the codebase (<code>lib/analyze.ts</code>) — we're not asking you to trust a
              black box.
            </p>
          </Section>

          <Section title="5. Real browser-rendered auditing">
            <p>
              Beyond parsing HTML, Audityxe also has your page actually rendered in real Chrome —
              via Google's free PageSpeed Insights service, the same underlying engine (Lighthouse)
              that powers Chrome DevTools. This measures things static HTML parsing simply can't:
              real Largest Contentful Paint, Cumulative Layout Shift, Total Blocking Time, and a
              full rendered accessibility audit (contrast, focus order, ARIA correctness against
              the actual rendered DOM). Every specific issue it flags is shown as its own finding
              with a description, not folded into a single opaque score.
            </p>
          </Section>

          <Section title="6. How code/copy fixes are generated, with evidence">
            <p>
              Fixes are template-based, triggered by specific real findings — e.g. "no meta
              description found" always produces the same category of fix with a concrete before/
              after snippet. Every fix also carries an <strong>evidence</strong> line stating
              exactly what was checked and what was found — "sent a live GET request to
              /sitemap.xml — no successful response," for example — so you can verify it yourself
              rather than take our word for it. Fixes are <strong>not</strong> independently
              validated against your live codebase (we don't have access to it) — they're the
              standard, correct fix for the specific problem detected. Always test a fix in a
              staging environment before shipping to production.
            </p>
          </Section>

          <Section title="7. Competitor comparison methodology">
            <p>
              When a competitor URL is provided (Standard/Pro plans), we run the exact same audit
              pipeline against it independently, then compare category-by-category. A category is
              called out as a "win" only when the score difference is 0.4 or greater, to avoid
              overstating noise-level differences as meaningful wins.
            </p>
          </Section>

          <Section id="8-what-audityxe-cannot-measure-limitations" title="8. What Audityxe cannot measure (limitations)">
            <div className="flex items-start gap-2">
              <XCircle size={16} className="text-rose mt-0.5 shrink-0" />
              <p>
                The HTML-parsing checks can't see anything that only exists after JavaScript
                executes on top of the raw response — though the real browser-rendered pass
                (section 5) covers most of that gap for performance and accessibility.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <XCircle size={16} className="text-rose mt-0.5 shrink-0" />
              <p>
                Some link/image checks may show as "ambiguous" (401/403/429) rather than
                "broken" — this is intentional. Many sites block automated requests from bots as a
                matter of policy, which looks identical to a broken link from our side. We label
                these separately rather than falsely reporting them as dead links.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <XCircle size={16} className="text-rose mt-0.5 shrink-0" />
              <p>
                Scores can shift between runs if the underlying page changes — A/B tests, feature
                flags, or a deploy between two audits will produce different (correctly different)
                results. This is expected behavior, not inconsistency in the engine.
              </p>
            </div>
          </Section>

          <Section title="9. Your privacy">
            <p>
              Full audit results are not stored on our servers once returned to your browser —
              there's no public report page, no cross-account history, and no database of who
              audited what. Everything you see is computed fresh for you, for that request, and
              belongs to you: use the copy/export/share buttons on any result to keep your own
              copy.
            </p>
            <p>
              One narrow exception: to power the embeddable badge at{" "}
              <a href="/badge" className="text-primary hover:underline">
                /badge
              </a>
              , we keep a per-domain record of your site's most recent overall score and audit
              date — nothing else about the audit is stored alongside it.
            </p>
          </Section>

          <div className="glass rounded-card p-5 sm:p-6 mt-10">
            <p className="text-sm text-text-secondary">
              Want to see this in action before signing up?{" "}
              <Link href="/sample-report" className="text-primary hover:underline font-medium">
                View a real, live sample report →
              </Link>
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
