import type { Metadata } from "next";
import Link from "next/link";
import { canonicalMeta, SITE_URL } from "@/lib/seo";
import { CHECK_PAGES, COMPARISON_PAGES } from "@/lib/seo-content";
import SeoPage, { CodeBlock, RelatedLinks, techArticleJsonLd } from "@/components/seo/SeoPage";

const DESCRIPTION =
  "Audityxe documentation and quickstart: audit in the web app, run the free CLI with npx, gate CI on a minimum score, call the REST API, and browse references.";

export const metadata: Metadata = {
  ...canonicalMeta("docs"),
  title: "Audityxe Documentation & Quickstart Guide",
  description: DESCRIPTION,
};

const HOWTO = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to audit a website with Audityxe",
  description: "Run your first Audityxe website audit in the web app or the command line.",
  step: [
    { "@type": "HowToStep", position: 1, name: "Choose how to run it", text: "Use the web app at audityxe.xyz, or the free CLI with npx audityxe-cli." },
    { "@type": "HowToStep", position: 2, name: "Enter the URL", text: "Paste the public URL in the web app, or pass it as the argument: npx audityxe-cli https://example.com." },
    { "@type": "HowToStep", position: 3, name: "Read the scored report", text: "Review the six category scores and the module findings, each with evidence and a suggested fix." },
    { "@type": "HowToStep", position: 4, name: "Gate your CI (optional)", text: "Add --min-score 75 to the CLI command, or use the GitHub Action, to fail a build when the score drops." },
  ],
};

export default function DocsPage() {
  return (
    <SeoPage
      crumbs={[{ name: "Docs", path: "/docs" }]}
      eyebrow="Documentation"
      title="Audityxe documentation"
      directQuestion="How do I get started with Audityxe?"
      directAnswer="Run npx audityxe-cli https://your-site.com in a terminal, or paste your URL on the Audityxe homepage — both return the same scored audit, and the CLI is free with no account and no rate limit."
      jsonLd={[techArticleJsonLd({ path: "/docs", headline: "Audityxe documentation", description: DESCRIPTION }), HOWTO]}
    >
      <section aria-labelledby="quickstart" className="mb-10">
        <h2 id="quickstart" className="font-display font-semibold text-xl mb-3">
          Quickstart
        </h2>
        <ol className="list-decimal pl-5 space-y-4 text-sm text-text-secondary">
          <li>
            <strong className="text-text-primary">Web app:</strong> open the <Link href="/" className="text-primary hover:underline">homepage</Link>, paste a public URL, and
            click Analyze (a free account is required).
          </li>
          <li>
            <strong className="text-text-primary">Command line:</strong> requires Node.js 18.17+.
            <CodeBlock code="npx audityxe-cli https://example.com" />
          </li>
          <li>
            <strong className="text-text-primary">CI gate:</strong> fail the build below a score.
            <CodeBlock code="npx --yes audityxe-cli https://staging.example.com --min-score 75" />
          </li>
          <li>
            <strong className="text-text-primary">API:</strong> <code>POST /api/audit</code> with a JSON body <code>{"{ \"url\": \"https://example.com\" }"}</code>; see the{" "}
            <Link href="/api-docs" className="text-primary hover:underline">API docs</Link> and the{" "}
            <a href={`${SITE_URL}/openapi.yaml`} className="text-primary hover:underline">OpenAPI spec</a>.
          </li>
        </ol>
      </section>

      <section aria-labelledby="reference" className="mb-6">
        <h2 id="reference" className="font-display font-semibold text-xl mb-3">
          Reference
        </h2>
        <ul className="space-y-2 text-sm">
          <li><Link href="/what-is-audityxe" className="text-primary hover:underline">What is Audityxe?</Link> — overview and what it is not</li>
          <li><Link href="/cli" className="text-primary hover:underline">CLI guide</Link> — install, flags, exit codes</li>
          <li><Link href="/integrations" className="text-primary hover:underline">Integrations</Link> — GitHub Actions, GitLab, Jenkins, CircleCI, Bitbucket, Azure DevOps, Docker, VS Code</li>
          <li><Link href="/capabilities" className="text-primary hover:underline">Capabilities &amp; limitations</Link> — what exists and what doesn&apos;t</li>
          <li><Link href="/api-docs" className="text-primary hover:underline">REST API</Link> — endpoint, auth, limits</li>
          <li><Link href="/methodology" className="text-primary hover:underline">Methodology</Link> — how scores work</li>
          <li><Link href="/glossary" className="text-primary hover:underline">Glossary</Link> — LCP, CSP, HSTS, DMARC, SAST, GEO and more</li>
          <li><Link href="/troubleshooting" className="text-primary hover:underline">Troubleshooting</Link> — exit codes, package name, Node version</li>
          <li><Link href="/changelog" className="text-primary hover:underline">Changelog</Link></li>
        </ul>
      </section>

      <RelatedLinks
        heading="What Audityxe checks"
        links={CHECK_PAGES.map((c) => ({ href: `/checks/${c.slug}`, label: c.title, description: c.directAnswer.slice(0, 120) + "…" }))}
      />
      <RelatedLinks
        heading="Compared with other tools"
        links={COMPARISON_PAGES.map((c) => ({ href: `/compare/${c.slug}`, label: `Audityxe vs ${c.other}`, description: c.otherDefinition.slice(0, 110) + "…" }))}
      />
    </SeoPage>
  );
}
