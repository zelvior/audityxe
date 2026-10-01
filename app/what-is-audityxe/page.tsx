import type { Metadata } from "next";
import Link from "next/link";
import { canonicalMeta, SITE_URL } from "@/lib/seo";
import { GITHUB_URL, NPM_URL } from "@/lib/seo-content";
import SeoPage, { FaqSection, RelatedLinks, faqJsonLd, techArticleJsonLd } from "@/components/seo/SeoPage";

const DESCRIPTION =
  "Audityxe is a website audit tool: paste a URL for a scored SEO, performance, accessibility, security, and UX report — web app, free CLI, GitHub Action, or API.";

export const metadata: Metadata = {
  ...canonicalMeta("what-is-audityxe"),
  title: "What is Audityxe? Website Audit Tool, CLI & API Explained",
  description: DESCRIPTION,
};

const FAQS = [
  {
    q: "What is Audityxe?",
    a: "Audityxe is a website audit tool that scores a live URL across SEO, performance, accessibility, security, and UX, and returns evidence-based fixes.",
  },
  {
    q: "Is Audityxe a code scanner or a security vulnerability scanner?",
    a: "No. Audityxe never reads your source code and does not test for exploitable vulnerabilities. It audits a deployed site from the outside using passive, read-only checks.",
  },
  {
    q: "Is Audityxe free?",
    a: "Yes, with limits. A free account includes a limited number of audits per day, and the audityxe-cli command-line tool is free with no account and no rate limit. Standard and Pro plans add more daily audits, competitor comparison, PageSpeed Insights, and bulk audits.",
  },
  {
    q: "Who makes Audityxe?",
    a: "Audityxe is built and maintained by Zelvior Labs. Its functional code is source-available under the Audityxe Custom Open-Source License, while its visual design is not open source.",
  },
  {
    q: "What is the npm package for Audityxe?",
    a: "The npm package is audityxe-cli (not audityxe). It installs a command named audityxe and runs with npx audityxe-cli <url>.",
  },
];

export default function WhatIsAudityxePage() {
  return (
    <SeoPage
      crumbs={[{ name: "What is Audityxe?", path: "/what-is-audityxe" }]}
      eyebrow="Overview"
      title="What is Audityxe?"
      directQuestion="What does Audityxe do?"
      directAnswer="Audityxe is a website audit tool that scores any public URL across SEO, performance, accessibility, security, and UX, and explains each finding with evidence and a suggested fix — through a web app, a free command-line tool, a GitHub Action, and a REST API."
      jsonLd={[
        techArticleJsonLd({ path: "/what-is-audityxe", headline: "What is Audityxe?", description: DESCRIPTION }),
        faqJsonLd(FAQS),
        {
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "@id": `${SITE_URL}/#cli`,
          name: "audityxe-cli",
          applicationCategory: "DeveloperApplication",
          operatingSystem: "Windows, macOS, Linux",
          softwareRequirements: "Node.js 18.17.0 or newer",
          downloadUrl: NPM_URL,
          codeRepository: GITHUB_URL,
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          publisher: { "@id": `${SITE_URL}/#organization` },
          description: "Free, unlimited, local-first website audit command-line tool powered by the same engine as the Audityxe web app.",
        },
      ]}
    >
      <section aria-labelledby="ways" className="mb-10">
        <h2 id="ways" className="font-display font-semibold text-xl mb-3">
          Ways to use Audityxe
        </h2>
        <dl className="space-y-4">
          <div>
            <dt className="font-semibold text-sm">Web app</dt>
            <dd className="text-sm text-text-secondary">
              Paste a URL on the <Link href="/" className="text-primary hover:underline">homepage</Link> and get a scored report. Plans and limits are on the{" "}
              <Link href="/pricing" className="text-primary hover:underline">pricing page</Link>.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-sm">Command-line tool (audityxe-cli)</dt>
            <dd className="text-sm text-text-secondary">
              Run <code>npx audityxe-cli https://example.com</code> — free, no account, no rate limit. See the{" "}
              <Link href="/cli" className="text-primary hover:underline">CLI guide</Link>.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-sm">GitHub Action and CI</dt>
            <dd className="text-sm text-text-secondary">
              Gate builds on a minimum score and comment results on pull requests. See{" "}
              <Link href="/integrations" className="text-primary hover:underline">integrations</Link>.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-sm">REST API</dt>
            <dd className="text-sm text-text-secondary">
              <code>POST /api/audit</code> returns the full scored result as JSON. See the{" "}
              <Link href="/api-docs" className="text-primary hover:underline">API docs</Link>.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-sm">VS Code extension</dt>
            <dd className="text-sm text-text-secondary">A prebuilt .vsix ships in the repository; it is not on the Marketplace yet.</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="is-not" className="mb-10">
        <h2 id="is-not" className="font-display font-semibold text-xl mb-3">
          What Audityxe is not
        </h2>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-text-secondary">
          <li>Not a static code analyzer, linter, or SAST tool — it never reads source code.</li>
          <li>Not a dependency, container, or secret scanner.</li>
          <li>Not a penetration-testing or XSS/SQL-injection scanner.</li>
          <li>Not a SOC 2, HIPAA, GDPR, or PCI-DSS compliance tool.</li>
        </ul>
        <p className="text-sm text-text-secondary mt-3">
          The full list is on the <Link href="/capabilities" className="text-primary hover:underline">capabilities</Link> page, and how Audityxe differs from
          similar tools is on the <Link href="/compare" className="text-primary hover:underline">comparison</Link> page.
        </p>
      </section>

      <section aria-labelledby="facts" className="mb-4">
        <h2 id="facts" className="font-display font-semibold text-xl mb-3">
          Key facts
        </h2>
        <dl className="grid sm:grid-cols-2 gap-3 text-sm">
          {[
            ["Category", "Website audit and analysis tool"],
            ["Official site", "audityxe.vercel.app"],
            ["Source code", "github.com/zelvior/audityxe"],
            ["npm package", "audityxe-cli (command: audityxe)"],
            ["Maintainer", "Zelvior Labs"],
            ["Runtime for the CLI", "Node.js 18.17.0 or newer"],
          ].map(([k, v]) => (
            <div key={k} className="glass rounded-card p-3">
              <dt className="text-xs font-mono text-text-secondary">{k}</dt>
              <dd className="font-semibold">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <FaqSection faqs={FAQS} />
      <RelatedLinks
        links={[
          { href: "/docs", label: "Documentation", description: "Getting started and every reference page." },
          { href: "/checks", label: "What Audityxe checks", description: "Every audit module explained." },
          { href: "/methodology", label: "Methodology", description: "How scores are calculated." },
          { href: "/sample-report", label: "Sample report", description: "See a real audit result." },
        ]}
      />
    </SeoPage>
  );
}
