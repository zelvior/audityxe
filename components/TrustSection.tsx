import Link from "next/link";
import { ShieldCheck, Radar, FlaskConical, Users, ArrowRight, Check, X } from "lucide-react";
import { PLANS } from "@/lib/plans";

export default function TrustSection() {
  return (
    <section className="px-4 sm:px-6 py-12 sm:py-16">
      <div className="max-w-5xl mx-auto">
        {/* Why different */}
        <div className="text-center mb-10 sm:mb-12">
          <p className="text-xs font-mono text-text-secondary mb-3">WHY AUDITYXE IS DIFFERENT</p>
          <h2 className="font-display font-bold text-2xl sm:text-3xl tracking-tight mb-4">
            Real measurements first. Everything else second.
          </h2>
          <p className="text-text-secondary text-sm sm:text-base max-w-2xl mx-auto">
            Most audit tools guess a score from a screenshot. Audityxe doesn't — every score comes
            from parsing your site's actual HTML, HTTP headers, redirect chain, robots.txt,
            sitemap.xml, live-sampled links and images, and a real browser-rendered performance and
            accessibility pass.{" "}
            <Link href="/methodology" className="text-primary hover:underline">
              See exactly how →
            </Link>
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 sm:gap-5 mb-14 sm:mb-16">
          <div className="glass rounded-2xl p-5 sm:p-6">
            <Radar size={20} className="text-primary mb-3" />
            <h3 className="font-display font-semibold text-sm mb-1.5">Live, not cached</h3>
            <p className="text-xs sm:text-sm text-text-secondary">
              Every audit is a fresh set of real HTTP requests made the moment you click Analyze —
              never a database of pre-scored sites.
            </p>
          </div>
          <div className="glass rounded-2xl p-5 sm:p-6">
            <FlaskConical size={20} className="text-accent mb-3" />
            <h3 className="font-display font-semibold text-sm mb-1.5">Deterministic scoring</h3>
            <p className="text-xs sm:text-sm text-text-secondary">
              Scores come from real signal parsing, not a language model guessing. Same page, same
              score, every time — verifiable in the{" "}
              <Link href="/sample-report" className="text-primary hover:underline">
                sample report
              </Link>
              .
            </p>
          </div>
          <div className="glass rounded-2xl p-5 sm:p-6">
            <ShieldCheck size={20} className="text-emerald mb-3" />
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

        {/* Who it's for */}
        <div className="text-center mb-8 sm:mb-10">
          <p className="text-xs font-mono text-text-secondary mb-3 flex items-center justify-center gap-1.5">
            <Users size={12} /> WHO IT'S FOR
          </p>
          <h2 className="font-display font-bold text-2xl sm:text-3xl tracking-tight">
            Built for people who ship, not agencies who bill by the hour
          </h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 sm:gap-5 mb-14 sm:mb-16 text-sm text-text-secondary">
          <div className="glass rounded-2xl p-5">
            <p className="font-semibold text-text-primary mb-1">Indie makers & solo founders</p>
            <p>A fast, specific first pass on a landing page before launch — no agency retainer needed.</p>
          </div>
          <div className="glass rounded-2xl p-5">
            <p className="font-semibold text-text-primary mb-1">Marketers</p>
            <p>A defensible, data-backed reason a page underperforms — and a promo kit to ship the fix.</p>
          </div>
          <div className="glass rounded-2xl p-5">
            <p className="font-semibold text-text-primary mb-1">Agencies & freelancers</p>
            <p>A repeatable, shareable report instead of a manual checklist — with bulk audit on Pro.</p>
          </div>
        </div>

        {/* Free vs paid */}
        <div className="text-center mb-8 sm:mb-10">
          <p className="text-xs font-mono text-text-secondary mb-3">FREE VS. PAID</p>
          <h2 className="font-display font-bold text-2xl sm:text-3xl tracking-tight">
            Nothing is dumbed down on Free
          </h2>
          <p className="text-text-secondary text-sm max-w-xl mx-auto mt-3">
            Every plan gets the identical audit engine — the only differences are daily volume and
            competitor comparisons.
          </p>
        </div>
        <div className="glass rounded-2xl overflow-hidden mb-10 sm:mb-12">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs font-mono text-text-secondary">
                <th className="text-left px-4 sm:px-5 py-3">Feature</th>
                <th className="text-center px-3 py-3">Free</th>
                <th className="text-center px-3 py-3">Standard</th>
                <th className="text-center px-3 py-3">Pro</th>
              </tr>
            </thead>
            <tbody className="text-text-secondary">
              {[
                ["All 6 score categories + 17-area deep audit", true, true, true],
                ["Shareable public report links", true, true, true],
                ["Written verdict + promo copy", true, true, true],
                ["Daily audits", "3", "25", "200"],
                ["Competitor comparison", false, true, true],
                ["Bulk audit (up to 20 URLs)", false, false, true],
              ].map(([feature, free, standard, pro], i) => (
                <tr key={i} className="border-b border-border/50 last:border-0">
                  <td className="px-4 sm:px-5 py-3">{feature as string}</td>
                  {[free, standard, pro].map((val, j) => (
                    <td key={j} className="text-center px-3 py-3">
                      {typeof val === "boolean" ? (
                        val ? (
                          <Check size={15} className="text-emerald inline" />
                        ) : (
                          <X size={15} className="text-text-secondary/40 inline" />
                        )
                      ) : (
                        <span className="font-mono text-xs">{val}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-center mb-14 sm:mb-16">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            See full pricing ({PLANS.standard.priceUsd30 > 0 ? `from $${PLANS.free.priceUsd30}` : "free"})
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Security/privacy reassurance */}
        <div className="glass rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start gap-4">
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
