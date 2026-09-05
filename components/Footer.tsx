import Link from "next/link";

const links = [
  { href: "/about", label: "About" },
  { href: "/methodology", label: "Methodology" },
  { href: "/guide", label: "Audit Guide" },
  { href: "/sample-report", label: "Sample Report" },
  { href: "/faq", label: "FAQ" },
  { href: "/pricing", label: "Pricing" },
  { href: "/bulk", label: "Bulk Audit" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/cookies", label: "Cookie Policy" },
  { href: "/disclaimer", label: "Disclaimer" },
  { href: "/trust-center", label: "Trust Center" },
  { href: "/dpa", label: "DPA" },
  { href: "/acceptable-use", label: "Acceptable Use" },
  { href: "/third-party-services", label: "Third-Party Services" },
  { href: "/badge", label: "Get a Badge" },
  { href: "/audit-verification", label: "Verify a Badge" },
  { href: "/changelog", label: "Changelog" },
  { href: "/contact", label: "Contact" },
];

export default function Footer() {
  return (
    <footer className="px-4 sm:px-6 py-10 sm:py-12 border-t border-border/60 mt-6">
      <div className="max-w-5xl mx-auto flex flex-col items-center gap-5">
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs sm:text-sm text-text-secondary">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-primary transition">
              {l.label}
            </Link>
          ))}
        </nav>
        <p className="text-[11px] sm:text-xs font-mono text-text-secondary/60 text-center px-4">
          Audityxe audits run live against the URL you enter. Scores and fixes are generated
          automatically and are not a substitute for professional review.
        </p>
        <p className="text-[11px] sm:text-xs font-mono text-text-secondary/40">
          &copy; {new Date().getFullYear()} Audityxe. All rights reserved.
        </p>
        <p className="text-[11px] sm:text-xs font-mono text-text-secondary/40 text-center">
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
    </footer>
  );
}
