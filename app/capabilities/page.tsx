import type { Metadata } from "next";
import Link from "next/link";
import { canonicalMeta } from "@/lib/seo";
import { CAPABILITIES, STATUS_LABEL, type Capability } from "@/lib/seo-content";
import SeoPage, { FaqSection, RelatedLinks, faqJsonLd, techArticleJsonLd } from "@/components/seo/SeoPage";

const DESCRIPTION =
  "Does Audityxe have a CLI, VS Code extension, GitHub Action, Docker image, SARIF, or compliance reports? A direct yes/no answer to each, with what exists.";

export const metadata: Metadata = {
  ...canonicalMeta("capabilities"),
  title: "Audityxe Capabilities & Limitations",
  description: DESCRIPTION,
};

const GROUPS: Capability["group"][] = [
  "Distribution",
  "Automation & CI",
  "Editors",
  "Checks",
  "Compliance & scanning",
  "Integrations & reporting",
];

const BADGE: Record<Capability["status"], string> = {
  available: "text-emerald",
  partial: "text-amber-400",
  planned: "text-sky-400",
  "not-available": "text-rose",
};

// A curated headline subset rendered as FAQPage — each Q/A is visible below
// in the matrix in the same words.
const FAQ_IDS = ["npm", "cli", "vscode", "github-action", "docker", "config-file", "owasp-top-10", "compliance", "sarif", "web-vitals"];
const FAQS = FAQ_IDS.map((id) => CAPABILITIES.find((c) => c.id === id)).filter((c): c is Capability => !!c).map((c) => ({ q: c.question, a: c.answer }));

export default function CapabilitiesPage() {
  return (
    <SeoPage
      crumbs={[{ name: "Capabilities", path: "/capabilities" }]}
      eyebrow="Capability matrix"
      title="Audityxe capabilities & limitations"
      directQuestion="What does Audityxe do — and what does it not do?"
      directAnswer="Audityxe audits a live website URL (SEO, performance, accessibility, security configuration, UX) through a web app, the audityxe-cli npm package, a GitHub Action, and a REST API; it does not scan source code, dependencies, or containers, test for exploitable vulnerabilities, or produce compliance reports."
      jsonLd={[techArticleJsonLd({ path: "/capabilities", headline: "Audityxe capabilities & limitations", description: DESCRIPTION }), faqJsonLd(FAQS)]}
    >
      <p className="text-sm text-text-secondary mb-8">
        Every row is verified against the Audityxe source code. If something isn&apos;t listed as available, it isn&apos;t built. Planned items are tracked on the{" "}
        <Link href="/roadmap" className="text-primary hover:underline">roadmap</Link>.
      </p>

      {GROUPS.map((g) => {
        const rows = CAPABILITIES.filter((c) => c.group === g);
        if (!rows.length) return null;
        const id = `grp-${g.toLowerCase().replace(/[^a-z]+/g, "-")}`;
        return (
          <section key={g} aria-labelledby={id} className="mb-10">
            <h2 id={id} className="font-display font-semibold text-xl mb-4">
              {g}
            </h2>
            <div className="space-y-3">
              {rows.map((c) => (
                <div key={c.id} id={c.id} className="glass rounded-card p-4">
                  <h3 className="font-display font-semibold text-sm mb-1">{c.question}</h3>
                  <p className="text-sm">
                    <span className={`font-mono text-xs mr-2 ${BADGE[c.status]}`}>[{STATUS_LABEL[c.status]}]</span>
                    <strong>{c.answer}</strong>
                  </p>
                  <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
                    {c.detail}
                    {c.href && (
                      <>
                        {" "}
                        <Link href={c.href} className="text-primary hover:underline">
                          Learn more
                        </Link>
                      </>
                    )}
                  </p>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      <FaqSection faqs={FAQS} heading="Most-asked capability questions" />
      <RelatedLinks
        links={[
          { href: "/cli", label: "CLI guide" },
          { href: "/integrations", label: "Integrations" },
          { href: "/compare", label: "Audityxe vs other tools" },
          { href: "/roadmap", label: "Roadmap" },
        ]}
      />
    </SeoPage>
  );
}
