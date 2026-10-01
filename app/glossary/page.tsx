import type { Metadata } from "next";
import { canonicalMeta, SITE_URL } from "@/lib/seo";
import { GLOSSARY } from "@/lib/seo-content";
import SeoPage, { RelatedLinks, techArticleJsonLd } from "@/components/seo/SeoPage";

const DESCRIPTION =
  "Plain definitions of LCP, CLS, TTFB, CSP, HSTS, CORS, SPF/DMARC, SAST, DAST, SARIF, GEO/AEO, llms.txt, and how Audityxe relates to each.";

export const metadata: Metadata = {
  ...canonicalMeta("glossary"),
  title: "Glossary: Core Web Vitals, CSP, HSTS, SAST, DAST, GEO & More",
  description: DESCRIPTION,
};

const slug = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function GlossaryPage() {
  const termSet = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name: "Audityxe web audit glossary",
    url: `${SITE_URL}/glossary`,
    hasDefinedTerm: GLOSSARY.map((g) => ({
      "@type": "DefinedTerm",
      name: g.term,
      description: g.definition,
      url: `${SITE_URL}/glossary#${slug(g.term)}`,
      inDefinedTermSet: `${SITE_URL}/glossary`,
    })),
  };
  return (
    <SeoPage
      crumbs={[{ name: "Glossary", path: "/glossary" }]}
      eyebrow="Glossary"
      title="Web audit glossary"
      jsonLd={[techArticleJsonLd({ path: "/glossary", headline: "Web audit glossary", description: DESCRIPTION }), termSet]}
    >
      <p className="text-sm text-text-secondary mb-8">
        Each entry gives the standard definition and then states exactly how — or whether — Audityxe measures it.
      </p>
      <dl className="space-y-4">
        {GLOSSARY.map((g) => (
          <div key={g.term} id={slug(g.term)} className="glass rounded-card p-4">
            <dt className="font-display font-semibold text-base mb-1">{g.term}</dt>
            <dd className="text-sm text-text-secondary leading-relaxed">
              <strong className="text-text-primary">{g.definition}</strong>
              <span className="block mt-1.5">
                <span className="font-mono text-xs mr-1.5">In Audityxe:</span>
                {g.audityxe}
              </span>
            </dd>
          </div>
        ))}
      </dl>
      <RelatedLinks
        links={[
          { href: "/checks", label: "What Audityxe checks" },
          { href: "/capabilities", label: "Capabilities & limitations" },
        ]}
      />
    </SeoPage>
  );
}
