import Link from "next/link";
import { ShieldCheck, Users, ArrowRight, Check } from "lucide-react";

export default function TrustSection() {
  return (
    <section className="px-4 sm:px-8 py-16 sm:py-24">
      <div className="max-w-5xl mx-auto">
        {/* Why different */}
        <div className="text-center mb-10 sm:mb-12">
          <p className="text-xs font-mono text-text-secondary mb-3">WHY AUDITYXE IS DIFFERENT</p>
          <h2 className="font-display font-bold text-2xl sm:text-3xl tracking-tight mb-4">
            Real measurements first. Everything else second.
          </h2>
          <p className="text-text-secondary text-sm sm:text-base max-w-2xl mx-auto">
            Most audit tools guess a score from a screenshot. Audityxe doesn't. Every score comes
            from parsing your site's actual HTML, HTTP headers, redirect chain, robots.txt,
            sitemap.xml, live-sampled links and images, and a real browser-rendered performance and
            accessibility pass.{" "}
            <Link href="/methodology" className="text-primary hover:underline">
              See exactly how →
            </Link>
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:gap-5 mb-14 sm:mb-16">
          <div className="glass rounded-card p-5 sm:p-6">
            <h3 className="font-display font-semibold text-sm mb-1.5">Live, not cached</h3>
            <p className="text-xs sm:text-sm text-text-secondary">
              Every audit is a fresh set of real HTTP requests made the moment you click Analyze;
              full results are never stored server-side. (One narrow exception: your domain's
              latest score and date are kept to power the{" "}
              <Link href="/badge" className="text-primary hover:underline">
                embeddable badge
              </Link>
              .)
            </p>
          </div>
          <div className="glass rounded-card p-5 sm:p-6">
            <h3 className="font-display font-semibold text-sm mb-1.5">Deterministic scoring</h3>
            <p className="text-xs sm:text-sm text-text-secondary">
              Scores come from real signal parsing, not a language model guessing. Same page, same
              score, every time, verifiable in the{" "}
              <Link href="/sample-report" className="text-primary hover:underline">
                sample report
              </Link>
              .
            </p>
          </div>
          <div className="glass rounded-card p-5 sm:p-6">
            <h3 className="font-display font-semibold text-sm mb-1.5">Transparent limits</h3>
            <p className="text-xs sm:text-sm text-text-secondary">
              We tell you what we can't measure (JS-rendered content, real Core Web Vitals) instead
              of pretending otherwise.{" "}
              <Link href="/methodology#7-what-audityxe-cannot-measure-limitations" className="text-primary hover:underline">
                Read the limits
              </Link>
              .
            </p>
          </div>
        </div>

        {/* Who it's for + Free vs paid — condensed to one line each so
            the homepage isn't three near-identical "trust" sections
            stacked back to back. Full detail still lives on their own
            pages (/pricing has the complete plan comparison table);
            nothing here was deleted, just moved so it's not duplicated
            on the page people are trying to actually run an audit on. */}
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 mb-14 sm:mb-16 text-sm text-text-secondary">
          <div className="glass rounded-card p-5 flex-1 flex items-start gap-3">
            <Users size={16} className="text-primary shrink-0 mt-0.5" />
            <p>
              <span className="font-semibold text-text-primary">Built for people who ship</span> — indie
              makers, marketers, and agencies who need a repeatable report, not a retainer.
            </p>
          </div>
          <div className="glass rounded-card p-5 flex-1 flex items-start gap-3">
            <Check size={16} className="text-emerald shrink-0 mt-0.5" />
            <p>
              <span className="font-semibold text-text-primary">Nothing dumbed down on Free</span> —
              every plan runs the identical engine.{" "}
              <Link href="/pricing" className="text-primary hover:underline inline-flex items-center gap-1">
                Compare plans <ArrowRight size={12} />
              </Link>
            </p>
          </div>
        </div>

        {/* Security/privacy reassurance */}
        <div className="glass rounded-card p-6 sm:p-8 flex flex-col sm:flex-row items-start gap-4">
          <ShieldCheck size={24} className="text-emerald shrink-0 mt-0.5" />
          <div>
            <h3 className="font-display font-semibold text-base mb-2">Your data, handled plainly</h3>
            <p className="text-sm text-text-secondary mb-3">
              We fetch the public HTML of the URL you submit to generate your report. We don't
              require anything beyond a login email, we don't sell data, and we don't use
              third-party advertising trackers.
            </p>
            <div className="flex flex-wrap gap-4 text-xs">
              <Link href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
              <Link href="/disclaimer" className="text-primary hover:underline">
                Audit Limitations
              </Link>
              <Link href="/faq" className="text-primary hover:underline">
                FAQ
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
