import type { Metadata } from "next";
import { canonicalMeta } from "@/lib/seo";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CHANGELOG_ENTRIES } from "@/lib/changelog-data";
import { Rss } from "lucide-react";

export const metadata: Metadata = {
  ...canonicalMeta("changelog"),
  title: "Changelog — Audityxe",
  description: "What's new, fixed, and changed in Audityxe.",
  alternates: {
    ...canonicalMeta("changelog").alternates,
    types: { "application/rss+xml": "https://audityxe.vercel.app/changelog/rss.xml" },
  },
};


export default function ChangelogPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-14 sm:py-20">
        <p className="font-mono text-xs text-text-secondary mb-2">CHANGELOG</p>
        <div className="flex items-baseline justify-between mb-10 flex-wrap gap-2">
          <h1 className="font-display font-bold text-2xl sm:text-3xl">
            What's <span className="hand-underline">changed</span>
          </h1>
          <a
            href="/changelog/rss.xml"
            className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-primary transition"
          >
            <Rss size={13} /> RSS feed
          </a>
        </div>
        <div className="flex flex-col gap-8">
          {CHANGELOG_ENTRIES.map((e) => (
            <div key={e.version} id={`v${e.version.replace(/\./g, "-")}`} className="glass rounded-card p-5 sm:p-6 scroll-mt-24">
              <div className="flex items-baseline gap-3 mb-3">
                <span className="font-mono text-sm text-primary">v{e.version}</span>
                <span className="text-xs text-text-secondary">{e.date}</span>
              </div>
              <ul className="list-disc pl-5 space-y-1.5 text-sm text-text-secondary">
                {e.changes.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </main>
  );
}
