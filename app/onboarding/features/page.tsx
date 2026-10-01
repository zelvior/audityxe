import type { Metadata } from "next";
import { canonicalMeta } from "@/lib/seo";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Search, Gauge, Eye, Shield, Palette, Code, Globe, Smartphone, Lock, Zap, BarChart3, FileText } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  ...canonicalMeta("onboarding/features"),
  title: "Features — Audityxe Onboarding",
  description: "Explore all the features Audityxe offers for website auditing, scoring, and fixing.",
};

const CATEGORIES = [
  {
    icon: Search,
    name: "SEO Audit",
    color: "text-blue-400",
    items: [
      "Title tag & meta description analysis",
      "Heading structure (H1-H6) validation",
      "Canonical tag & duplicate detection",
      "Structured data (JSON-LD) check",
      "robots.txt & sitemap.xml validation",
      "Open Graph & Twitter Card tags",
    ],
  },
  {
    icon: Gauge,
    name: "Performance",
    color: "text-amber-400",
    items: [
      "PageSpeed Insights (Pro)",
      "Core Web Vitals (LCP, FID, CLS)",
      "CrUX field data (Pro)",
      "Render-blocking resource detection",
      "Image optimization analysis",
      "Redirect chain tracking",
    ],
  },
  {
    icon: Eye,
    name: "Accessibility",
    color: "text-green-400",
    items: [
      "Alt text on all images",
      "Form label associations",
      "Color contrast ratios",
      "ARIA landmark roles",
      "Keyboard navigation support",
      "Focus indicator visibility",
    ],
  },
  {
    icon: Shield,
    name: "Security",
    color: "text-rose-400",
    items: [
      "HTTPS enforcement",
      "HSTS header check",
      "Content Security Policy",
      "X-Frame-Options & X-Content-Type-Options",
      "Security.txt validation",
      "DNS security (DNSSEC, CAA)",
    ],
  },
  {
    icon: Palette,
    name: "UX & CRO",
    color: "text-purple-400",
    items: [
      "Mobile viewport configuration",
      "Tap target size & spacing",
      "Broken link detection",
      "Broken image detection",
      "Above-the-fold content analysis",
      "Call-to-action visibility",
    ],
  },
  {
    icon: Code,
    name: "Technical",
    color: "text-cyan-400",
    items: [
      "HTML validation & structure",
      "CSS/JS minification status",
      "Favicon & apple-touch-icon",
      "Manifest.json (PWA) check",
      "TLS certificate validation",
      "Email authentication (SPF, DKIM, DMARC)",
    ],
  },
];

export default function OnboardingFeaturesPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto">
          <Link href="/onboarding/welcome" className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary mb-6">
            <ArrowLeft size={16} /> Back to welcome
          </Link>

          <div className="flex items-center gap-3 mb-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-card bg-primary/10 border border-primary/20 shrink-0">
              <BarChart3 size={18} className="text-primary" />
            </span>
            <h1 className="font-display font-bold text-2xl sm:text-3xl md:text-4xl tracking-tight">
              <span className="hand-underline">Audit Categories</span>
            </h1>
          </div>

          <p className="text-text-secondary text-sm sm:text-base mb-8 max-w-xl">
            Audityxe checks 6 major categories with 17+ sub-areas. Here's exactly what gets audited.
          </p>

          <div className="grid sm:grid-cols-2 gap-4 mb-10">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <div key={cat.name} className="glass rounded-card p-4 sm:p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon size={18} className={cat.color} />
                    <h3 className="font-display font-semibold text-base">{cat.name}</h3>
                  </div>
                  <ul className="space-y-1.5">
                    {cat.items.map((item) => (
                      <li key={item} className="text-xs sm:text-sm text-text-secondary flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/onboarding/notifications"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-card bg-secondary font-semibold text-sm hover:brightness-110 transition"
            >
              Get Started
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/methodology"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-card glass font-semibold text-sm hover:bg-primary/10 transition"
            >
              <FileText size={16} />
              Read Methodology
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
