import Link from "next/link";
import Logo from "./Logo";
import HoverRevealButton from "./HoverRevealButton";
import { Heart } from "lucide-react";

// Points at our own /donate page by default, which embeds the
// NOWPayments donation widget and also offers non-financial ways to
// help. NEXT_PUBLIC_DONATION_URL can override it with an external link
// (a NOWPayments-hosted donation link, GitHub Sponsors, etc.).
const DONATION_URL = process.env.NEXT_PUBLIC_DONATION_URL || "/donate";
const DONATION_IS_EXTERNAL = DONATION_URL.startsWith("http");

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Product",
    links: [
      { href: "/pricing", label: "Pricing" },
      { href: "/bulk", label: "Bulk Audit" },
      { href: "/sample-report", label: "Sample Report" },
      { href: "/badge", label: "Get a Badge" },
      { href: "/audit-verification", label: "Verify a Badge" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/methodology", label: "Methodology" },
      { href: "/guide", label: "Audit Guide" },
      { href: "/faq", label: "FAQ" },
      { href: "/trust-center", label: "Trust Center" },
      { href: "/changelog", label: "Changelog" },
      { href: "/status", label: "Service Status" },
      { href: "/crash-reports", label: "Crash Reports" },
      { href: "/workflow", label: "Workflow Diagram" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Service" },
      { href: "/cookies", label: "Cookie Policy" },
      { href: "/disclaimer", label: "Disclaimer" },
      { href: "/license", label: "License" },
    ],
  },
  {
    title: "Compliance",
    links: [
      { href: "/dpa", label: "DPA" },
      { href: "/acceptable-use", label: "Acceptable Use" },
      { href: "/third-party-services", label: "Third-Party Services" },
      { href: "/refund-policy", label: "Refund Policy" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
      { href: "/credits", label: "Credits" },
      { href: "/donate", label: "Sponsor" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="px-4 sm:px-6 pt-14 sm:pt-16 pb-8 border-t border-border/60 mt-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-[1.1fr_repeat(5,1fr)] gap-x-6 gap-y-10">
          {/* brand block */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-1 mb-2 lg:mb-0">
            <Link href="/" className="inline-flex items-center gap-2 mb-3">
              <Logo size={36} />
              <span className="font-display font-bold text-base tracking-tight hand-underline">Audityxe</span>
            </Link>
            <p className="text-xs text-text-secondary max-w-[220px] leading-relaxed mb-4">
              Instant, evidence-based website audits — every score backed by a real, live check.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <HoverRevealButton
                frontLabel="Star on GitHub"
                backLabel="Thanks! ⭐"
                href="https://github.com/zelvior/audityxe"
              />
              {/* Sponsor button, styled after GitHub's own — outlined
                  rather than filled so it reads as a genuine optional
                  ask sitting next to the primary action, not a second
                  competing CTA. */}
              <a
                href={DONATION_URL}
                {...(DONATION_IS_EXTERNAL ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="inline-flex items-center gap-1.5 h-[44px] px-4 rounded-[10px] border border-border bg-surface text-xs font-semibold text-text-primary hover:border-rose/50 hover:text-rose transition group"
              >
                <Heart size={13} className="text-rose group-hover:fill-rose transition" />
                Sponsor
              </a>
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title} className="min-w-0">
              <h3 className="text-xs font-display font-semibold text-text-primary mb-3 tracking-wide">
                {col.title}
              </h3>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-xs sm:text-[13px] text-text-secondary hover:text-primary transition"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-text-secondary/70 text-center sm:text-left order-2 sm:order-1">
            &copy; {new Date().getFullYear()} Audityxe. All rights reserved.
          </p>
          <p className="text-[11px] text-text-secondary/70 text-center order-1 sm:order-2">
            Made by{" "}
            <a href="mailto:zelvior@proton.me" className="hover:text-primary transition">
              Zelvior
            </a>
            {" · "}
            <a
              href="https://zsupport.netlify.app"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition"
            >
              Support
            </a>
          </p>
        </div>

        <p className="mt-4 text-[10px] sm:text-[11px] font-mono text-text-secondary/50 text-center max-w-2xl mx-auto leading-relaxed">
          Audityxe audits run live against the URL you enter. Scores and fixes are generated
          automatically and are not a substitute for professional review.
        </p>
        <p className="mt-2 text-[10px] sm:text-[11px] font-mono text-text-secondary/50 text-center max-w-2xl mx-auto leading-relaxed">
          Audityxe is the original, open-source work of Zelvior —{" "}
          <a
            href="https://github.com/zelvior/audityxe"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition"
          >
            github.com/zelvior/audityxe
          </a>
          .
        </p>
      </div>
    </footer>
  );
}
