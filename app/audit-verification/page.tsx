import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Audit Verification — Audityxe",
  description: "How to verify an Audityxe report is genuine and unmodified.",
};

export default function AuditVerificationPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-14 sm:py-20">
        <p className="font-mono text-xs text-text-secondary mb-2">VERIFICATION</p>
        <h1 className="font-display font-bold text-2xl sm:text-3xl mb-6">
          Verifying an Audityxe report
        </h1>
        <p className="text-sm text-text-secondary mb-8">
          Every audit is generated live from the target URL's real HTTP response at request time —
          there is no stored database of pre-scored sites, so a report can't be edited after the
          fact.
        </p>

        <div className="glass rounded-card p-5 sm:p-6 mb-4">
          <h2 className="font-display font-semibold text-sm mb-2">1. Re-run it</h2>
          <p className="text-sm text-text-secondary">
            The fastest check: submit the same URL again. Deterministic scoring means the category
            scores will match unless the underlying site changed.
          </p>
        </div>
        <div className="glass rounded-card p-5 sm:p-6 mb-4">
          <h2 className="font-display font-semibold text-sm mb-2">2. Check the timestamp</h2>
          <p className="text-sm text-text-secondary">
            Every report includes the exact UTC time it was generated. Compare it against the
            site's actual state at that time if you suspect drift.
          </p>
        </div>
        <div className="glass rounded-card p-5 sm:p-6">
          <h2 className="font-display font-semibold text-sm mb-2">3. Cross-check the methodology</h2>
          <p className="text-sm text-text-secondary">
            The scoring logic for each category is documented on the Methodology page, so any
            score can be independently recomputed from the same public signals.
          </p>
        </div>
      </div>
      <Footer />
    </main>
  );
}
