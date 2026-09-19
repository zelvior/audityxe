"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Logo from "./Logo";
import HoverRevealButton from "./HoverRevealButton";
import { Heart, ChevronDown, Youtube, Link2 } from "lucide-react";

// The real, minimal ORCID mark (a green circle with a white "iD"
// wordmark) — lucide-react has no ORCID icon, and a generic badge/id
// icon wouldn't be recognizable as ORCID specifically, so this is
// reproduced directly rather than approximated.
function OrcidIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" fill="none" aria-hidden="true">
      <circle cx="128" cy="128" r="128" fill="#A6CE39" />
      <path
        fill="#fff"
        d="M86.3 186.2H70.9V79.1h15.4v107.1zM108.9 79.1h41.6c39.6 0 57 28.3 57 53.6 0 27.5-21.5 53.6-56.8 53.6h-41.8V79.1zm15.4 93.3h24.5c34.9 0 42.9-26.5 42.9-39.7 0-21.5-13.7-39.7-43.7-39.7h-23.7v79.4zM78.6 63.5a9.9 9.9 0 1 1 0-19.8 9.9 9.9 0 0 1 0 19.8z"
      />
    </svg>
  );
}

// Points at our own /donate page by default, which embeds the
// NOWPayments donation widget and also offers non-financial ways to
// help. NEXT_PUBLIC_DONATION_URL can override it with an external link
// (a NOWPayments-hosted donation link, GitHub Sponsors, etc.).
const DONATION_URL = process.env.NEXT_PUBLIC_DONATION_URL || "/donate";
const DONATION_IS_EXTERNAL = DONATION_URL.startsWith("http");

const SOCIAL_LINKS = [
  { href: "https://orcid.org/0009-0009-2376-367X", label: "ORCID", icon: OrcidIcon },
  { href: "https://youtube.com/@zelviorhere", label: "YouTube", icon: Youtube },
  { href: "https://linktr.ee/zelvior", label: "Linktree", icon: Link2 },
];

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

/**
 * One footer category: a small pill button that reveals its links in a
 * popover instead of a permanently-expanded list. Hover opens it on
 * devices that have real hover (mouse/trackpad); a click/tap toggles it
 * open on touch devices, where hover either doesn't fire at all or
 * fires-and-sticks in a confusing way. Either path, clicking outside or
 * pressing Escape closes it, same as the account menu in Header.tsx.
 */
function FooterColumn({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className={`flex items-center gap-1 text-xs sm:text-[13px] font-display font-semibold tracking-wide px-3 py-2 rounded-full border transition ${
          open
            ? "bg-primary/10 border-primary/40 text-primary"
            : "border-border glass text-text-primary hover:border-[rgb(var(--color-text-primary)/0.16)]"
        }`}
      >
        {title}
        <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        // Outer box uses padding (not margin) to bridge the gap up to
        // the button — padding is still "inside" this element for
        // hover-hit-testing purposes, so the cursor never crosses dead
        // space between the button and the popover on its way up. A
        // margin here (the previous bug) sits outside the element's own
        // box, so the mouse briefly left every hoverable element while
        // crossing it and the popover closed before it could be reached.
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full pb-2 z-20 sm:left-0 sm:translate-x-0">
          <div className="w-48 glass backdrop-blur-xl rounded-card py-1.5 shadow-lg shadow-black/10">
            <ul>
              {links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="block px-3.5 py-2 text-sm text-text-secondary hover:text-primary hover:bg-[rgb(var(--color-text-primary)/0.07)] transition"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="px-4 sm:px-6 pt-14 sm:pt-16 pb-8 border-t border-border/60 mt-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col items-center text-center gap-5">
          {/* brand block */}
          <div>
            <Link href="/" className="inline-flex items-center gap-2 mb-3">
              <Logo size={36} />
              <span className="font-display font-bold text-base tracking-tight hand-underline">Audityxe</span>
            </Link>
            <p className="text-xs text-text-secondary max-w-[320px] mx-auto leading-relaxed mb-4">
              Instant, evidence-based website audits — every score backed by a real, live check.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
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

          {/* category popovers — every link from COLUMNS is still here,
              just tucked behind a hover/tap reveal instead of five
              permanently-expanded columns stacked on the page. */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {COLUMNS.map((col) => (
              <FooterColumn key={col.title} title={col.title} links={col.links} />
            ))}
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border/60 flex flex-col sm:flex-row flex-wrap items-center justify-center sm:justify-between gap-4">
          <p className="text-[11px] text-text-secondary/70 text-center sm:text-left order-3 sm:order-1">
            &copy; {new Date().getFullYear()} Audityxe. All rights reserved.
          </p>
          <p className="text-[11px] text-text-secondary/70 text-center order-2 flex items-center gap-1 flex-wrap justify-center">
            Made by{" "}
            <a href="mailto:zelvior@proton.me" className="hover:text-primary transition">
              Zelvior Labs
            </a>{" "}
            with <Heart size={11} className="inline text-rose fill-rose mx-0.5" /> from Pakistan
          </p>
          <div className="flex items-center gap-3 order-1 sm:order-3">
            {SOCIAL_LINKS.map(({ href, label, icon: Icon }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                title={label}
                className="w-8 h-8 rounded-full glass flex items-center justify-center text-text-secondary hover:text-primary hover:border-[rgb(var(--color-text-primary)/0.2)] transition"
              >
                <Icon size={15} />
              </a>
            ))}
          </div>
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
