import type { Metadata } from "next";
import Link from "next/link";
import { canonicalMeta, SITE_URL } from "@/lib/seo";
import { CLI_EXIT_CODES, CLI_FLAGS, GITHUB_URL, INSTALL_COMMANDS, NPM_URL } from "@/lib/seo-content";
import SeoPage, { CodeBlock, FaqSection, RelatedLinks, faqJsonLd, techArticleJsonLd } from "@/components/seo/SeoPage";

const DESCRIPTION =
  "Install and use audityxe-cli, a free, unlimited website audit command line: npm, npx, pnpm, and Yarn commands, flags, exit codes, and a --min-score CI gate.";

export const metadata: Metadata = {
  ...canonicalMeta("cli"),
  title: "Audityxe CLI (audityxe-cli): Install, Usage, Flags & CI Gate",
  description: DESCRIPTION,
};

const FAQS = [
  {
    q: "How do I install the Audityxe CLI?",
    a: "Run npx audityxe-cli https://example.com to use it without installing, or install it with npm install --global audityxe-cli. It requires Node.js 18.17 or newer, and the installed command is audityxe.",
  },
  {
    q: "What is the Audityxe npm package name?",
    a: "The package is audityxe-cli — there is no package named plain audityxe. Install it with npm, pnpm add -g, or yarn global add using that name.",
  },
  {
    q: "Is the Audityxe CLI free and does it need an account?",
    a: "Yes, it is free. It needs no account, no API key, and has no rate limit; it runs the audit engine on your own machine and only contacts the site you audit.",
  },
  {
    q: "How do I fail a CI build when the score is too low?",
    a: "Add --min-score <0-100>, for example npx audityxe-cli https://staging.example.com --min-score 75. The command exits with status 1 when the overall score is below the threshold.",
  },
  {
    q: "Does the Audityxe CLI support a config file, Docker image, or Homebrew?",
    a: "No. Options are command-line flags only, there is no official Docker image or Homebrew formula, and installation is through npm (or npx).",
  },
  {
    q: "Does the CLI send any data to Audityxe?",
    a: "No. It sends no telemetry. Its only network requests go to the URL you audit and, if you pass --psi-key, to Google's PageSpeed Insights API.",
  },
];

export default function CliPage() {
  return (
    <SeoPage
      crumbs={[{ name: "CLI", path: "/cli" }]}
      eyebrow="Command line"
      title="Audityxe CLI (audityxe-cli)"
      directQuestion="How do I run Audityxe from the command line?"
      directAnswer="Run npx audityxe-cli https://your-site.com — the free audityxe-cli npm package (Node.js 18.17+) runs the full Audityxe audit engine locally with no account, no API key, and no rate limit."
      jsonLd={[
        techArticleJsonLd({ path: "/cli", headline: "Audityxe CLI (audityxe-cli)", description: DESCRIPTION }),
        faqJsonLd(FAQS),
        {
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "@id": `${SITE_URL}/#cli`,
          name: "audityxe-cli",
          alternateName: "Audityxe CLI",
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
      <section aria-labelledby="install" className="mb-10">
        <h2 id="install" className="font-display font-semibold text-xl mb-3">
          Install
        </h2>
        <p className="text-sm text-text-secondary mb-3">
          The package on npm is <a href={NPM_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">audityxe-cli</a>. Works the same on
          macOS, Linux, and Windows (PowerShell, Command Prompt, or WSL) anywhere Node.js 18.17+ is installed.
        </p>
        {INSTALL_COMMANDS.map((c) => (
          <CodeBlock key={c.label} label={c.label} code={c.command} />
        ))}
      </section>

      <section aria-labelledby="flags" className="mb-10">
        <h2 id="flags" className="font-display font-semibold text-xl mb-3">
          Command-line options
        </h2>
        <div className="overflow-x-auto rounded-card border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-mono text-text-secondary border-b border-border">
                <th className="p-3">Option</th>
                <th className="p-3">What it does</th>
              </tr>
            </thead>
            <tbody>
              {CLI_FLAGS.map((f) => (
                <tr key={f.flag} className="border-b border-border last:border-0 align-top">
                  <td className="p-3 font-mono text-xs whitespace-nowrap">{f.flag}</td>
                  <td className="p-3 text-text-secondary">{f.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="examples" className="mb-10">
        <h2 id="examples" className="font-display font-semibold text-xl mb-3">
          Examples
        </h2>
        <CodeBlock label="Deep crawl with a CI gate" code="npx audityxe-cli https://example.com --deep --min-score 80" />
        <CodeBlock label="Head-to-head comparison" code="npx audityxe-cli https://yoursite.com --compare https://competitor.com" />
        <CodeBlock label="JSON output (use instead of an --output flag)" code="npx audityxe-cli https://example.com --json > report.json" />
        <CodeBlock label="Add real-browser Lighthouse and Core Web Vitals" code="npx audityxe-cli https://example.com --psi-key YOUR_GOOGLE_KEY" />
        <CodeBlock label="Track the score over time (local file only)" code={"npx audityxe-cli https://example.com --track\nnpx audityxe-cli history https://example.com"} />
      </section>

      <section aria-labelledby="exit" className="mb-4">
        <h2 id="exit" className="font-display font-semibold text-xl mb-3">
          Exit codes
        </h2>
        <dl className="space-y-2 text-sm">
          {CLI_EXIT_CODES.map((e) => (
            <div key={e.code} className="flex gap-3">
              <dt className="font-mono font-semibold w-6">{e.code}</dt>
              <dd className="text-text-secondary">{e.meaning}</dd>
            </div>
          ))}
        </dl>
      </section>

      <FaqSection faqs={FAQS} />
      <RelatedLinks
        links={[
          { href: "/integrations", label: "CI/CD integrations", description: "GitHub Actions, GitLab, Jenkins, CircleCI, Bitbucket, Azure DevOps." },
          { href: "/troubleshooting", label: "Troubleshooting", description: "Exit codes, package name, Node version." },
          { href: "/capabilities", label: "Capabilities & limitations", description: "What the CLI does and doesn't have." },
          { href: "/api-docs", label: "REST API", description: "When you need the hosted API instead." },
        ]}
      />
      <p className="text-xs text-text-secondary mt-6">
        Source and license: <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">github.com/zelvior/audityxe</a> —{" "}
        <Link href="/license" className="text-primary hover:underline">license</Link>.
      </p>
    </SeoPage>
  );
}
