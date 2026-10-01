import type { Metadata } from "next";
import { canonicalMeta } from "@/lib/seo";
import { COMPARISON_PAGES } from "@/lib/seo-content";
import SeoPage, { RelatedLinks, techArticleJsonLd } from "@/components/seo/SeoPage";

const DESCRIPTION =
  "Honest comparisons of Audityxe with Lighthouse, SonarQube, Snyk, ESLint, Semgrep, OWASP ZAP, and Code Climate: what each analyzes and when to use which.";

export const metadata: Metadata = {
  ...canonicalMeta("compare"),
  title: "Audityxe vs Lighthouse, SonarQube, Snyk, ZAP & More",
  description: DESCRIPTION,
};

export default function CompareIndexPage() {
  return (
    <SeoPage
      crumbs={[{ name: "Compare", path: "/compare" }]}
      eyebrow="Comparisons"
      title="Audityxe compared with other tools"
      directQuestion="How is Audityxe different from code scanners and security tools?"
      directAnswer="Audityxe audits a deployed website from the outside (a URL in, a scored report out), while tools like SonarQube, Semgrep, ESLint, Snyk, and Code Climate analyze source code or dependencies, and Lighthouse and OWASP ZAP test pages or applications in a browser or by active scanning — so they are complements, not substitutes."
      jsonLd={[techArticleJsonLd({ path: "/compare", headline: "Audityxe compared with other tools", description: DESCRIPTION })]}
    >
      <div className="overflow-x-auto rounded-card border border-border mb-8">
        <table className="w-full text-sm">
          <caption className="sr-only">What each tool takes as input</caption>
          <thead>
            <tr className="text-left text-xs font-mono text-text-secondary border-b border-border">
              <th className="p-3">Tool</th>
              <th className="p-3">Category</th>
              <th className="p-3">Analyzes</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border">
              <th scope="row" className="p-3 text-left font-semibold">Audityxe</th>
              <td className="p-3 text-text-secondary">Website audit</td>
              <td className="p-3 text-text-secondary">A live URL, from the outside</td>
            </tr>
            {COMPARISON_PAGES.map((c) => (
              <tr key={c.slug} className="border-b border-border last:border-0">
                <th scope="row" className="p-3 text-left font-semibold">{c.other}</th>
                <td className="p-3 text-text-secondary">{c.category}</td>
                <td className="p-3 text-text-secondary">{c.rows[0]?.other}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <RelatedLinks
        heading="Detailed comparisons"
        links={COMPARISON_PAGES.map((c) => ({ href: `/compare/${c.slug}`, label: `Audityxe vs ${c.other}`, description: c.otherDefinition }))}
      />
    </SeoPage>
  );
}
