import type { Metadata } from "next";
import Link from "next/link";
import { canonicalMeta } from "@/lib/seo";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TrustBadges from "@/components/TrustBadges";
import { Activity } from "lucide-react";

export const metadata: Metadata = {
  ...canonicalMeta("status"),
  title: "Service Status — Audityxe",
  description: "Live uptime and operational status for Audityxe and the external services it depends on.",
};

/** Third-party services an audit actually depends on at request time —
 * worth listing explicitly, because when one of these degrades the
 * symptom shows up inside Audityxe (a module failing to run) and it's
 * genuinely useful to know the cause isn't us. */
const DEPENDENCIES = [
  {
    name: "Google PageSpeed Insights",
    role: "Powers the Lighthouse Audit module and Core Web Vitals.",
    href: "https://status.cloud.google.com/",
  },
  {
    name: "Firebase (Auth + Firestore)",
    role: "Accounts, sign-in, plan records, and the embeddable badge.",
    href: "https://status.firebase.google.com/",
  },
  {
    name: "Hosting provider",
    role: "Hosting and the serverless functions that run every audit. See Credits for who.",
    href: "https://www.vercel-status.com/",
  },
  {
    name: "Cloudflare DNS (DoH)",
    role: "DNSSEC, CAA, and email-authentication record lookups.",
    href: "https://www.cloudflarestatus.com/",
  },
];

export default function StatusPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-card bg-primary/10 border border-primary/20 shrink-0">
              <Activity size={18} className="text-primary" />
            </span>
            <h1 className="font-display font-bold text-2xl sm:text-3xl md:text-4xl tracking-tight">
              <span className="hand-underline">Service Status</span>
            </h1>
          </div>
          <p className="text-sm sm:text-base text-text-secondary mb-8 sm:mb-10">
            Live uptime for Audityxe itself, plus the external services an audit depends on. These
            badges are served directly by the monitoring providers — they reflect current reality,
            not a value cached at build time.
          </p>

          <div className="glass rounded-card p-5 sm:p-6 mb-8">
            <TrustBadges />
          </div>

          <h2 className="font-display font-semibold text-lg sm:text-xl mb-1">Upstream dependencies</h2>
          <p className="text-xs sm:text-sm text-text-secondary mb-4">
            If one of these is degraded, the matching part of an Audityxe report may fail to run.
            The report will say so explicitly rather than silently omitting it.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {DEPENDENCIES.map((d) => (
              <a
                key={d.name}
                href={d.href}
                target="_blank"
                rel="noopener noreferrer"
                className="glass rounded-card p-4 block hover:border-primary/40 transition"
              >
                <p className="font-display font-semibold text-sm text-text-primary">{d.name}</p>
                <p className="text-xs text-text-secondary mt-1">{d.role}</p>
                <span className="text-[11px] font-mono text-primary mt-2 inline-block">
                  View provider status →
                </span>
              </a>
            ))}
          </div>

          <p className="text-xs text-text-secondary mt-8">
            Seeing something broken that isn&apos;t reflected here?{" "}
            <Link href="/contact" className="text-primary hover:underline">
              Let us know
            </Link>
            .
          </p>
        </div>
      </div>
      <Footer />
    </main>
  );
}
