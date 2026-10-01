import type { Metadata } from "next";
import { canonicalMeta } from "@/lib/seo";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Zap, ShieldCheck, Layers, BarChart3, Code, Globe } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  ...canonicalMeta("onboarding/welcome"),
  title: "Welcome to Audityxe — Onboarding",
  description: "Learn how Audityxe works and get started with your first website audit.",
};

const FEATURES = [
  {
    icon: Zap,
    title: "Instant Results",
    description: "Paste any URL and get a real score in under a minute — no setup, no waiting.",
  },
  {
    icon: ShieldCheck,
    title: "Evidence-Based",
    description: "Every finding is backed by real HTTP/HTML signals — not a black-box guess.",
  },
  {
    icon: Layers,
    title: "6 Categories",
    description: "SEO, performance, accessibility, security, UX, and technical health — all in one audit.",
  },
  {
    icon: BarChart3,
    title: "Real Scores",
    description: "Live-measured Lighthouse & CrUX data on Pro, with the same strict benchmark for every site.",
  },
  {
    icon: Code,
    title: "Exact Fixes",
    description: "Priority fixes with real code snippets — know exactly what to change and how.",
  },
  {
    icon: Globe,
    title: "For Any URL",
    description: "Audit your own site, a competitor's, or a client's — any public URL works.",
  },
];

export default function OnboardingWelcomePage() {
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
              <Zap size={18} className="text-primary" />
            </span>
            <h1 className="font-display font-bold text-2xl sm:text-3xl md:text-4xl tracking-tight">
              <span className="hand-underline">Welcome to Audityxe</span>
            </h1>
          </div>

          <p className="text-text-secondary text-sm sm:text-base mb-8 max-w-xl">
            Your free website audit tool. Get instant SEO, performance, accessibility, security &amp; UX scores with evidence-based fixes.
          </p>

          <div className="grid sm:grid-cols-2 gap-4 mb-10">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="glass rounded-card p-4 sm:p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={16} className="text-primary" />
                    <h3 className="font-display font-semibold text-sm">{feature.title}</h3>
                  </div>
                  <p className="text-xs sm:text-sm text-text-secondary">{feature.description}</p>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/onboarding/features"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-card bg-secondary font-semibold text-sm hover:brightness-110 transition"
            >
              Explore Features
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/login?redirect=/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-card glass font-semibold text-sm hover:bg-primary/10 transition"
            >
              Sign Up Free
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
