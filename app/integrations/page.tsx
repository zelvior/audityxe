import type { Metadata } from "next";
import Link from "next/link";
import { canonicalMeta } from "@/lib/seo";
import { CI_SNIPPETS } from "@/lib/seo-content";
import SeoPage, { CodeBlock, FaqSection, RelatedLinks, faqJsonLd, techArticleJsonLd } from "@/components/seo/SeoPage";

const DESCRIPTION =
  "Add Audityxe to CI/CD: a GitHub Action with PR comments and score gating, plus snippets for GitLab CI, Jenkins, CircleCI, Bitbucket, Azure DevOps, and Docker.";

export const metadata: Metadata = {
  ...canonicalMeta("integrations"),
  title: "Audityxe Integrations: GitHub Actions, GitLab CI, Docker",
  description: DESCRIPTION,
};

const FAQS = [
  {
    q: "Is there an Audityxe GitHub Action?",
    a: "Yes. Use zelvior/audityxe@main in a workflow to audit a URL, fail the job below a minimum score, and post or update a pull-request comment. It is not on the GitHub Marketplace yet.",
  },
  {
    q: "Does Audityxe have plugins for GitLab CI, Jenkins, CircleCI, Bitbucket, or Azure DevOps?",
    a: "There are no dedicated plugins, orbs, or tasks. Any of these CI systems can run it as a plain command — npx --yes audityxe-cli <url> --min-score N — on a Node.js 18.17+ image, and the non-zero exit code fails the step.",
  },
  {
    q: "Is there an official Audityxe Docker image or Helm chart?",
    a: "No. Run the npm CLI inside the public node image (docker run --rm node:20 npx --yes audityxe-cli <url>), or from a Kubernetes CronJob that uses that image.",
  },
  {
    q: "Is the Audityxe VS Code extension on the Marketplace?",
    a: "Not yet. A prebuilt .vsix ships in the repository for local install, and Marketplace publication is on the roadmap. It adds commands to audit a URL, run a deep crawl, compare two URLs, and view score history.",
  },
  {
    q: "Can Audityxe send Slack alerts or create Jira issues?",
    a: "No. There are no webhooks, Slack, or Jira integrations. The GitHub Action can comment on pull requests, and the CLI's --json output can be piped into your own notification step.",
  },
];

export default function IntegrationsPage() {
  return (
    <SeoPage
      crumbs={[{ name: "Integrations", path: "/integrations" }]}
      eyebrow="CI/CD & editors"
      title="Audityxe integrations"
      directQuestion="How do I add Audityxe to my CI/CD pipeline?"
      directAnswer="Run npx --yes audityxe-cli <url> --min-score 75 as a step in any CI that has Node.js 18.17+ — the step fails automatically when the score is below the threshold — or use the dedicated GitHub Action, which also comments the results on pull requests."
      jsonLd={[techArticleJsonLd({ path: "/integrations", headline: "Audityxe integrations", description: DESCRIPTION }), faqJsonLd(FAQS)]}
    >
      <p className="text-sm text-text-secondary mb-8">
        Audityxe audits a deployed URL, so in CI point it at a staging or preview environment. Each snippet below runs the free{" "}
        <Link href="/cli" className="text-primary hover:underline">audityxe-cli</Link> and exits non-zero when the score is under the threshold.
      </p>

      {CI_SNIPPETS.map((s) => (
        <section key={s.id} aria-labelledby={s.id} className="mb-8">
          <h2 id={s.id} className="font-display font-semibold text-lg mb-1">
            {s.title}
          </h2>
          <CodeBlock code={s.code} />
          {s.note && <p className="text-xs text-text-secondary">{s.note}</p>}
        </section>
      ))}

      <section aria-labelledby="vscode" className="mb-4">
        <h2 id="vscode" className="font-display font-semibold text-lg mb-2">
          VS Code extension
        </h2>
        <p className="text-sm text-text-secondary">
          A prebuilt <code>.vsix</code> is included in the repository&apos;s <code>vscode-extension</code> folder for local install (Extensions → ⋯ → Install from VSIX). Commands:
          Audityxe: Audit a URL, Audit a URL (Deep crawl), Compare Two URLs, and View Score History. It is not on the Visual Studio Marketplace yet.
        </p>
      </section>

      <FaqSection faqs={FAQS} />
      <RelatedLinks
        links={[
          { href: "/cli", label: "CLI guide", description: "All flags and exit codes." },
          { href: "/capabilities", label: "Capabilities & limitations", description: "Everything Audityxe does and doesn't integrate with." },
          { href: "/roadmap", label: "Roadmap", description: "Marketplace publication and CI regression gating." },
        ]}
      />
    </SeoPage>
  );
}
