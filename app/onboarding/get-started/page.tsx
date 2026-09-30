import type { Metadata } from "next";
import { canonicalMeta } from "@/lib/seo";
import Link from "next/link";
import { ArrowLeft, Check, Zap, FileText, Share2, Bell, Download, Code } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  ...canonicalMeta("onboarding/get-started"),
  title: "Get Started — Audityxe Onboarding",
  description: "Start your first audit and learn about all the ways to use Audityxe.",
};

const STEPS = [
  {
    icon: Zap,
    title: "Run Your First Audit",
    description: "Paste any URL into the homepage and click Analyze. You'll get 6 category scores plus a written verdict in under a minute.",
    action: { label: "Go to Homepage", href: "/" },
  },
  {
    icon: FileText,
    title: "Read Your Report",
    description: "Every finding includes evidence (real HTTP statuses, element counts, markup snippets) and an exact fix with a code snippet.",
    action: { label: "View Sample Report", href: "/sample-report" },
  },
  {
    icon: Share2,
    title: "Share Your Score",
    description: "Get a shareable Audityxe Verified badge with live re-audit — embed it on your site to prove your quality score.",
    action: { label: "Learn About Badges", href: "/badge" },
  },
  {
    icon: Bell,
    title: "Get Notified",
    description: "Enable push notifications to get alerted when your background audit finishes — no need to keep the tab open.",
    action: { label: "Enable Notifications", href: "/settings" },
  },
  {
    icon: Download,
    title: "Export Results",
    description: "Download your audit as a PDF report or CSV (Pro) for client documentation or team review.",
    action: { label: "See Pricing", href: "/pricing" },
  },
  {
    icon: Code,
    title: "Use the API",
    description: "Integrate Audityxe into your CI/CD pipeline with the REST API or CLI — same engine, running on your machine.",
    action: { label: "API Docs", href: "/api-docs" },
  },
];

export default function OnboardingGetStartedPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-3xl mx-auto">
          <Link href="/onboarding/features" className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary mb-6">
            <ArrowLeft size={16} /> Back to features
          </Link>

          <div className="flex items-center gap-3 mb-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-card bg-primary/10 border border-primary/20 shrink-0">
              <Check size={18} className="text-primary" />
            </span>
            <h1 className="font-display font-bold text-2xl sm:text-3xl md:text-4xl tracking-tight">
              <span className="hand-underline">Get Started</span>
            </h1>
          </div>

          <p className="text-text-secondary text-sm sm:text-base mb-8 max-w-xl">
            Everything you can do with Audityxe — from your first audit to automation.
          </p>

          <div className="space-y-4 mb-10">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="glass rounded-card p-4 sm:p-5 flex items-start gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-btn bg-secondary shrink-0">
                    <Icon size={18} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-text-secondary">Step {i + 1}</span>
                    </div>
                    <h3 className="font-display font-semibold text-sm mb-1">{step.title}</h3>
                    <p className="text-xs sm:text-sm text-text-secondary mb-3">{step.description}</p>
                    <Link
                      href={step.action.href}
                      className="text-xs font-mono text-primary hover:underline"
                    >
                      {step.action.label} →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="glass rounded-card p-6 text-center">
            <h3 className="font-display font-semibold text-lg mb-2">Ready to audit?</h3>
            <p className="text-sm text-text-secondary mb-4">
              Sign up free and run your first audit in under a minute.
            </p>
            <Link
              href="/login?redirect=/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-card bg-secondary font-semibold text-sm hover:brightness-110 transition"
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
