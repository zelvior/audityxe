import type { Metadata } from "next";
import Link from "next/link";
import { canonicalMeta } from "@/lib/seo";
import LegalLayout from "@/components/LegalLayout";
import FeaturedOn from "@/components/FeaturedOn";
import { Code2, Palette, Flame, MousePointerClick, Type, Compass, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  ...canonicalMeta("credits"),
  title: "Credits — Audityxe",
  description: "Every tool, platform, and source that went into building Audityxe, with credit where it's due.",
};

function CreditCard({
  icon: Icon,
  name,
  role,
  href,
}: {
  icon: typeof Code2;
  name: string;
  role: string;
  href?: string;
}) {
  const inner = (
    <div className="glass rounded-card p-4 flex items-start gap-3 h-full">
      <span className="flex items-center justify-center w-9 h-9 rounded-card bg-primary/10 border border-primary/20 shrink-0">
        <Icon size={16} className="text-primary" />
      </span>
      <div className="min-w-0">
        <p className="font-display font-semibold text-sm text-text-primary">{name}</p>
        <p className="text-xs text-text-secondary mt-0.5">{role}</p>
      </div>
    </div>
  );
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className="block h-full">
      {inner}
    </a>
  ) : (
    inner
  );
}

export default function CreditsPage() {
  return (
    <LegalLayout title="Credits" updated="September 2026" path="credits">
      <p>
        Audityxe is the <Link href="/license">original, open-source work of Zelvior</Link> — but no project
        is built from nothing. Here's every tool, platform, framework, and source of inspiration that went
        into it, with credit where it's due.
      </p>
      <p className="text-xs text-text-secondary/80">
        Note on logos: rather than embed third-party trademarked logo images (which risks using an outdated
        or incorrect mark), each entry below is a plain-text credit with a themed icon badge and a link to
        the real source.
      </p>

      <h2>Core stack</h2>
      <div className="grid sm:grid-cols-2 gap-3 not-prose">
        <CreditCard icon={Code2} name="Next.js" role="React framework — App Router, edge/serverless functions" href="https://nextjs.org" />
        <CreditCard icon={Code2} name="jsPDF + jspdf-autotable" role="Generates the downloadable PDF audit report" href="https://github.com/parallax/jsPDF" />
        <CreditCard icon={Code2} name="TypeScript" role="Static typing across the whole codebase" href="https://www.typescriptlang.org" />
        <CreditCard icon={Palette} name="Tailwind CSS" role="Utility-first styling and the design-token system" href="https://tailwindcss.com" />
        <CreditCard icon={Sparkles} name="Framer Motion" role="Animation — entrance transitions, the audit puzzle, scan effects" href="https://www.framer.com/motion/" />
        <CreditCard icon={Flame} name="Firebase" role="Auth, Firestore (accounts, badge records, admin config)" href="https://firebase.google.com" />
        <CreditCard icon={Compass} name="lucide-react" role="The icon set used throughout the entire UI" href="https://lucide.dev" />
      </div>

      <h2>Typography</h2>
      <div className="grid sm:grid-cols-2 gap-3 not-prose">
        <CreditCard icon={Type} name="Fraunces" role="Display/headline serif — Google Fonts, by Un-Type" href="https://fonts.google.com/specimen/Fraunces" />
        <CreditCard icon={Type} name="Public Sans" role="Body sans-serif — Google Fonts, by USWDS" href="https://fonts.google.com/specimen/Public+Sans" />
      </div>

      <h2>Interactive elements</h2>
      <p>
        The hover-reveal button in the footer and the isometric loading animation are both rebuilt,
        re-themed adaptations of community-contributed snippets from Uiverse.io — recolored from their
        original palettes to Audityxe's own, and rewritten as reusable, typed React components, but the
        original interaction design is theirs.
      </p>
      <div className="grid sm:grid-cols-2 gap-3 not-prose">
        <CreditCard icon={MousePointerClick} name="Gaurav-WebDev" role="Original hover-reveal button design, via Uiverse.io" href="https://uiverse.io/Gaurav-WebDev" />
        <CreditCard icon={MousePointerClick} name="Juanes200122" role="Original isometric loader design, via Uiverse.io" href="https://uiverse.io/Juanes200122" />
      </div>

      <h2>Inspiration & references</h2>
      <p>
        The audit engine's newer checks (UX heuristics, AI-crawler/GEO readiness) were informed by
        general, publicly-documented best practices rather than any one proprietary source — but two
        are worth naming directly for the categories of thinking they represent:
      </p>
      <ul>
        <li>
          <strong>
            <a href="https://www.checklist.design" target="_blank" rel="noopener noreferrer">
              Checklist Design
            </a>
          </strong>{" "}
          — a curated library of UI/UX design checklists. Audityxe doesn't reproduce their checklist
          content (it's their original, proprietary work); their category structure informed which
          additional UX-heuristic checks were worth writing from scratch for the audit engine.
        </li>
        <li>
          <strong>WCAG 2.1 AA</strong> — the accessibility module's contrast, keyboard-navigation, and
          focus-management checks follow the W3C's published Web Content Accessibility Guidelines.
        </li>
      </ul>

      <h2>Hosting & infrastructure</h2>
      <div className="grid sm:grid-cols-2 gap-3 not-prose">
        <CreditCard icon={Compass} name="Vercel / Netlify" role="Deployment target (project-configurable)" href="https://vercel.com" />
        <CreditCard icon={Compass} name="Google PageSpeed Insights API" role="Real-browser Lighthouse pass for the Performance module" href="https://developers.google.com/speed/docs/insights/v5/get-started" />
        <CreditCard icon={Compass} name="Cloudflare DNS over HTTPS" role="DNSSEC, CAA, and email-authentication record lookups" href="https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-https/" />
        <CreditCard icon={Compass} name="NOWPayments" role="Hosted crypto checkout and payment notifications" href="https://nowpayments.io" />
        <CreditCard icon={Compass} name="UptimeRobot" role="Public uptime monitoring badge on the status page" href="https://uptimerobot.com" />
        <CreditCard icon={Compass} name="MDN HTTP Observatory" role="Independent third-party security header grading" href="https://developer.mozilla.org/en-US/observatory" />
        <CreditCard icon={Compass} name="Qualys SSL Labs" role="Independent third-party TLS configuration grading" href="https://www.ssllabs.com/ssltest/" />
      </div>

      <h2>Featured on</h2>
      <p>Where Audityxe is listed and covered:</p>
      <FeaturedOn />

      <p className="text-xs text-text-secondary/80 mt-6">
        Team, contact, and site credits are also published machine-readably at{" "}
        <a href="/humans.txt">/humans.txt</a>, following the{" "}
        <a href="https://humanstxt.org" target="_blank" rel="noopener noreferrer">
          humanstxt.org
        </a>{" "}
        convention.
      </p>

      <p className="text-xs text-text-secondary/80 mt-8">
        Missing something you contributed or think should be credited? See the{" "}
        <Link href="/contact">Contact page</Link>.
      </p>
    </LegalLayout>
  );
}
