import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SampleReportView from "@/components/SampleReportView";
import { runAudit } from "@/lib/analyze";

export const metadata: Metadata = {
  title: "Sample Report — see a real Audityxe audit",
  description: "A real, live audit result — not a mockup — so you can see exactly what you get before signing up.",
};

// Regenerated at most once an hour — still a genuinely live, real audit,
// just not re-fetched on every single page view.
export const revalidate = 3600;

const SAMPLE_TARGET = "https://github.com";

export default async function SampleReportPage() {
  let result = null;
  let error = null;
  try {
    result = await runAudit(SAMPLE_TARGET);
  } catch (err) {
    error = err instanceof Error ? err.message : "Couldn't generate the sample right now.";
  }

  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 px-4 sm:px-6 py-8 sm:py-10">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-text-secondary hover:text-primary transition mb-6"
          >
            <ArrowLeft size={14} /> Back to Audityxe
          </Link>

          <div className="glass rounded-2xl p-5 sm:p-6 mb-6">
            <p className="text-xs font-mono text-primary mb-2">REAL, LIVE SAMPLE — NOT A MOCKUP</p>
            <h1 className="font-display font-bold text-2xl sm:text-3xl tracking-tight mb-2">
              This is an actual Audityxe audit of {SAMPLE_TARGET}
            </h1>
            <p className="text-sm text-text-secondary">
              Every number below was measured live from {SAMPLE_TARGET}'s real HTML and HTTP
              response the last time this page regenerated (at most once an hour) — nothing here
              is hand-picked or faked to look good. Run the same audit on your own site to see
              your own real numbers.
            </p>
          </div>

          {error && (
            <div className="glass rounded-2xl p-6 border border-rose/30 flex items-start gap-3">
              <AlertTriangle size={18} className="text-rose mt-0.5 shrink-0" />
              <p className="text-sm text-text-secondary">{error}</p>
            </div>
          )}

          {result && <SampleReportView result={result} />}
        </div>
      </div>
      <Footer />
    </main>
  );
}
