import type { Metadata } from "next";
import { canonicalMeta } from "@/lib/seo";
import Link from "next/link";
import { ArrowLeft, Map } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  ...canonicalMeta("roadmap"),
  title: "Roadmap — Audityxe",
  description: "What's planned next for Audityxe, and how to weigh in or contribute.",
};

const SECTIONS: { title: string; items: string[] }[] = [
  {
    title: "Shipping next",
    items: [
      "~~Publish audityxe-cli to npm~~ — done: live at npmjs.com/package/audityxe-cli.",
      "Publish the GitHub Action to the GitHub Marketplace.",
      "Publish the VS Code extension to the Marketplace — a pre-built .vsix already ships in the repo for local install in the meantime.",
    ],
  },
  {
    title: "Audit engine",
    items: [
      "Lightweight headless-browser fallback (Playwright/Puppeteer serverless) for JavaScript-heavy SPAs the current static-HTML crawl can't fully see — flagged today via possibleJsRenderedContent, not yet actually rendered.",
      "Server-side caching layer (Redis/Supabase/KV) for repeat audits of the same domain, to reduce redundant PageSpeed Insights calls and protect everyone's shared quota.",
      "Async background queue (e.g. Upstash QStash) for large bulk audits, so a big batch isn't bound by one serverless function's timeout.",
    ],
  },
  {
    title: "CLI, Action & extension",
    items: [
      "CI regression gating on --compare — fail a build when a score drops vs. a stored baseline (e.g. production), not just below an absolute --min-score.",
      "Hosted-account score history/trend view in the web app itself, matching what the CLI's local --track/history already does on your own machine.",
      "A shared, documented JSON result schema version, so tooling built against the CLI/API's JSON output has a stable contract to depend on across releases.",
    ],
  },
  {
    title: "Community & extensibility",
    items: [
      "A reviewed-PR pathway for community-contributed audit modules — see CONTRIBUTING.md. Deliberately not a live third-party plugin loader (arbitrary code executing inside the audit engine is a real security risk), so new checks ship as reviewed, merged code.",
      "Expand the Showcase wall and make submitted sites' badges link back with richer context (category breakdown, not just overall score).",
      "More language locales for the audit UI and generated report copy.",
    ],
  },
];

export default function RoadmapPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary mb-6">
            <ArrowLeft size={16} /> Back home
          </Link>

          <div className="flex items-center gap-3 mb-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-card bg-primary/10 border border-primary/20 shrink-0">
              <Map size={18} className="text-primary" />
            </span>
            <h1 className="font-display font-bold text-2xl sm:text-3xl md:text-4xl tracking-tight">
              <span className="hand-underline">Roadmap</span>
            </h1>
          </div>
          <p className="text-sm sm:text-base text-text-secondary mb-10">
            What's planned, in roughly the order it'll ship. Nothing here is a promise of an exact
            date — it's a direction, not a contract. See{" "}
            <a
              href="https://github.com/zelvior/audityxe/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              GitHub Issues
            </a>{" "}
            to weigh in, request something, or track progress, and{" "}
            <a
              href="https://github.com/zelvior/audityxe/blob/main/CONTRIBUTING.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              CONTRIBUTING.md
            </a>{" "}
            if you want to build one of these yourself.
          </p>

          <div className="space-y-8">
            {SECTIONS.map((section) => (
              <div key={section.title}>
                <h2 className="font-display font-semibold text-lg sm:text-xl mb-3">{section.title}</h2>
                <ul className="space-y-2.5">
                  {section.items.map((item, i) => (
                    <li key={i} className="glass rounded-card p-4 text-sm text-text-secondary">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
