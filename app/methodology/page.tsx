import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, XCircle, Sparkles } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Methodology — How Audityxe measures your site",
  description:
    "A transparent breakdown of exactly what Audityxe measures, how each score is calculated, what's automated vs. AI-generated, and where the limits are.",
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
            How Audityxe actually measures a site
          </h1>
          <p className="text-text-secondary text-sm sm:text-base mb-10">
            No black box. Here's exactly what happens between you pasting a URL and getting a
            score — what's measured directly, what's AI-generated commentary, and where the
            limits are.
          </p>

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
              live HTTP HEAD requests, and check for a real <code>/ads.txt</code> file. Nothing
              here is simulated — see the "Live network requests" section below for the exact list.
            </p>
          </Section>

          <Section title="2. Automated measurements vs. AI-generated commentary">
            <p>
              This distinction matters, so we keep it explicit everywhere in the product:
            </p>
            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <div className="glass rounded-xl p-4">
                <p className="flex items-center gap-2 font-semibold text-sm mb-2 text-emerald">
                  <CheckCircle2 size={15} /> Deterministic measurements
                </p>
                <p className="text-xs sm:text-sm">
                  All 6 category scores, all 16 deep-audit modules, and every "pass/warn/fail"
                  finding come from parsing the real HTML and HTTP responses — regex/DOM pattern
                  matching against real markup and headers. Run the same audit twice against an
                  unchanged page and you'll get the same score. No AI model touches these numbers.
                </p>
              </div>
              <div className="glass rounded-xl p-4">
                <p className="flex items-center gap-2 font-semibold text-sm mb-2 text-accent">
                  <Sparkles size={15} /> AI-generated commentary
                </p>
                <p className="text-xs sm:text-sm">
                  The one-line "verdict" (constructive and brutal-roast versions), the X/LinkedIn
                  promo copy, and the banner's headline/tagline are written by Gemini, given your
                  real scores as input. If no AI key is configured or the API is unavailable, a
                  built-in rule-based generator writes equivalent copy from the same real data —
                  the scores never change, only the wording.
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

          <Section title="5. How code/copy fixes are generated">
            <p>
              Fixes are template-based, triggered by specific real findings — e.g. "no meta
              description found" always produces the same category of fix with a concrete before/
              after snippet. They are <strong>not</strong> independently validated against your
              live codebase (we don't have access to it) — they're the standard, correct fix for
              the specific problem detected, written by us, not generated per-request by an AI
              model. Always test a fix in a staging environment before shipping to production.
            </p>
          </Section>

          <Section title="6. Competitor comparison methodology">
            <p>
              When a competitor URL is provided (Standard/Pro plans), we run the exact same audit
              pipeline against it independently, then compare category-by-category. A category is
              called out as a "win" only when the score difference is 0.4 or greater, to avoid
              overstating noise-level differences as meaningful wins.
            </p>
          </Section>

          <Section id="7-what-audityxe-cannot-measure-limitations" title="7. What Audityxe cannot measure (limitations)">
            <div className="flex items-start gap-2">
              <XCircle size={16} className="text-rose mt-0.5 shrink-0" />
              <p>
                We fetch raw HTML over HTTP — we do not run a headless browser. That means we
                can't measure things that only exist after JavaScript executes: client-side
                rendered content, real Core Web Vitals (LCP/CLS/INP as Chrome measures them),
                actual color-contrast ratios, or truly rendered layout shift. Signals like "missing
                width/height attributes" and "lazy loading usage" are real proxies for these, not
                the metrics themselves.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <XCircle size={16} className="text-rose mt-0.5 shrink-0" />
              <p>
                Some link/image checks may show as "ambiguous" (401/403/429) rather than
                "broken" — this is intentional. Many sites block automated HEAD requests from bots
                as a matter of policy, which looks identical to a broken link from our side. We
                label these separately rather than falsely reporting them as dead links.
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

          <Section title="8. AI limitations">
            <p>
              Gemini-generated verdict and promo copy can occasionally be generic, miss nuance a
              human reviewer would catch, or (rarely) be unavailable due to provider-side rate
              limits — in which case Audityxe automatically falls back to rule-based copy rather
              than failing the audit. AI copy is commentary on top of the real scores, never a
              substitute for them.
            </p>
          </Section>

          <div className="glass rounded-2xl p-5 sm:p-6 mt-10">
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
