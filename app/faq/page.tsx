import type { Metadata } from "next";
import { canonicalMeta } from "@/lib/seo";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  ...canonicalMeta("faq"),
  title: "FAQ — Audityxe",
  description: "Answers to common questions about how Audityxe works, pricing, and limitations.",
};

/**
 * Plain-text FAQPage schema — a condensed, search/AI-answer-engine
 * friendly subset of the fuller JSX answers below (which include links
 * and can't serialize cleanly to schema text). Keep in sync when the
 * core answers below change meaningfully.
 */
const FAQ_SCHEMA = [
  {
    q: "How do I audit a website for free?",
    a: "Paste any URL into Audityxe's website checker and click Analyze. It's a free website audit tool — no signup required for your first audit, and a free account unlocks more per day. You'll get a website quality score out of 10 across 6 categories: SEO, performance, accessibility, security, UX, and technical health.",
  },
  {
    q: "How are Audityxe's scores actually calculated?",
    a: "All category scores come from parsing the real, live HTML and HTTP response of the page being audited — heading structure, meta tags, security headers, redirect chains, robots.txt and sitemap.xml fetched live, and sampled broken-link/image checks. The same strict benchmark and weighting is applied to every website, so scores are comparable across audits and over time.",
  },
  {
    q: "What does Audityxe check in a website audit?",
    a: "Audityxe runs a technical SEO audit (titles, meta tags, headings, canonical tags, structured data), a website accessibility audit (alt text, contrast, form labels), a website security audit (HTTPS, HSTS, CSP, security headers), a website UX and conversion audit (mobile viewport, tap targets, broken links/images), and on Pro, a real browser-rendered performance audit via Google PageSpeed Insights covering Core Web Vitals.",
  },
  {
    q: "What's the difference between the Free, Standard, and Pro plans?",
    a: "Free gives a limited number of audits per day with the full 6-category score and 17-area breakdown. Standard adds more daily audits and competitor head-to-head comparison. Pro adds real browser-rendered PageSpeed performance auditing, bulk audits for agencies, and AI-generated promo copy using your own API key.",
  },
  {
    q: "Is Audityxe's audit data stored?",
    a: "No — full audit results are computed fresh per request and returned directly to your browser, with no public report page or cross-account history. The one exception is a minimal per-domain score-and-date record used only to power the embeddable Audityxe badge.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_SCHEMA.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.a,
    },
  })),
};

const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: "Who is Audityxe actually for?",
    a: (
      <>
        Indie makers and solo founders shipping a landing page who want a fast, specific first
        pass before launch; marketers who need a defensible reason a page underperforms; and
        small agencies/freelancers who audit client sites and want a repeatable, shareable report
        instead of a manual checklist. It's not a replacement for a full manual UX/SEO audit —
        it's the fast first pass before you decide whether one is needed.
      </>
    ),
  },
  {
    q: "How are the scores actually calculated — is this just guesswork?",
    a: (
      <>
        No — and this is worth being precise about. All 6 category scores and the full 17-area
        deep audit come from parsing the real live HTML and HTTP response of your page: heading
        structure, meta tags, security headers, redirect chains, robots.txt/sitemap.xml fetched
        live, sampled broken-link and image checks over real HTTP requests, plus a real
        browser-rendered performance and accessibility pass. Only the one-line verdict, the
        social promo copy, and the banner's headline are written commentary layered on top of
        those real, deterministic measurements — the scores themselves never change based on how
        that commentary is generated. See the full{" "}
        <Link href="/methodology" className="text-primary hover:underline">
          methodology
        </Link>{" "}
        page.
      </>
    ),
  },
  {
    q: "Do I need to create an account?",
    a: "Yes. Running an audit requires a free account (email/password, Google, or GitHub) with a verified email — this keeps per-account daily limits fair instead of one person exhausting shared capacity. If you sign up with email/password, check your inbox (and your spam/junk folder — verification emails sometimes land there) for the verification link before trying to run an audit.",
  },
  {
    q: "What's the difference between Free, Standard, and Pro?",
    a: (
      <>
        All three get the identical audit engine — the same 6 scores and 17-area deep audit,
        nothing is dumbed down on Free. The only differences are daily audit volume (3 / 20 / 50
        per day) and whether competitor head-to-head comparisons are unlocked (Standard and Pro
        only). See the full breakdown on{" "}
        <Link href="/pricing" className="text-primary hover:underline">
          Pricing
        </Link>
        .
      </>
    ),
  },
  {
    q: "How do I actually pay and upgrade?",
    a: "There's no self-serve card checkout yet. Pick a plan and duration on the Pricing page, sign in, and clicking the buy button opens a pre-filled email to zelvior@proton.me with your account details — attach a payment screenshot and send it. Access is granted manually, usually within 24 hours, for the exact 30 or 365-day duration you selected.",
  },
  {
    q: "Can I rerun an audit on the same URL?",
    a: "Yes, anytime, as many times as your daily quota allows. Each run is a fresh live fetch, so if you've since fixed something, the new score will reflect that — nothing is cached against your account.",
  },
  {
    q: "Why did my score change between two audits of the same page?",
    a: "That means something about the page's live response actually changed — a deploy, an A/B test, a CDN cache update, or a feature flag. The engine has no randomness in it; identical HTML and headers always produce identical scores.",
  },
  {
    q: "What can't Audityxe check?",
    a: (
      <>
        Most of the classic gap — JavaScript-rendered content, real Core Web Vitals, actual
        rendered accessibility issues — is now covered by a real browser-rendered pass (we
        actually render the page in Chrome and run a full audit against it). What's left is
        mostly interpretation: we can't verify a fix was actually deployed correctly, or judge
        subjective design quality. Full details on the{" "}
        <Link href="/methodology" className="text-primary hover:underline">
          methodology
        </Link>{" "}
        page.
      </>
    ),
  },
  {
    q: "Are the 'broken links' and 'broken images' checks always accurate?",
    a: "We flag unambiguous errors (404, 410, 5xx) as broken. Ambiguous responses (401, 403, 429) are reported separately as 'blocked automated checks' rather than 'broken,' since many sites intentionally block bot traffic — that's not the same as a dead link, and we don't want to falsely alarm you.",
  },
  {
    q: "What happens to the URLs and data I submit?",
    a: (
      <>
        We fetch the public HTML of the URL you submit to generate your report — we don't store
        your target site's HTML long-term, and we don't require any personal data beyond your
        login email. See the full{" "}
        <Link href="/privacy" className="text-primary hover:underline">
          Privacy Policy
        </Link>{" "}
        for specifics.
      </>
    ),
  },
  {
    q: "Can I share a report with someone else?",
    a: "Yes — use the copy, export, share, or email buttons on any completed audit. Copy grabs a plain-text summary, export downloads the full result as JSON, share uses your device's native share sheet, and email opens a pre-filled message. There's no public, anyone-with-the-link report page — audits aren't stored on our servers or made publicly viewable, for your privacy.",
  },
  {
    q: "Is there a bulk-audit option for agencies?",
    a: "Yes — Pro plan accounts get bulk audit: submit up to 20 URLs at once and get back category scores for all of them in one request, ideal for auditing a client's full site map or a portfolio of properties.",
  },
  {
    q: "Why don't you show customer testimonials?",
    a: "Because Audityxe is new, and we'd rather show you a real, live sample report than fabricate quotes. Check the Sample Report page to see exactly what a real audit looks like before you sign up.",
  },
];

export default function FaqPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }}
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

          <p className="text-xs font-mono text-text-secondary mb-3">FAQ</p>
          <h1 className="font-display font-bold text-3xl sm:text-4xl tracking-tight mb-8">
            Frequently asked questions
          </h1>

          <div className="space-y-6">
            {FAQS.map((item, i) => (
              <div key={i} className="glass rounded-card p-5 sm:p-6">
                <h2 className="font-display font-semibold text-sm sm:text-base mb-2">{item.q}</h2>
                <div className="text-sm text-text-secondary leading-relaxed">{item.a}</div>
              </div>
            ))}
          </div>

          <p className="text-sm text-text-secondary text-center mt-10">
            Still have a question?{" "}
            <Link href="/contact" className="text-primary hover:underline">
              Get in touch
            </Link>
            .
          </p>
        </div>
      </div>
      <Footer />
    </main>
  );
}
