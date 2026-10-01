/**
 * Single source of truth for the search/AI-answer-engine landing pages:
 * /what-is-audityxe, /docs, /cli, /integrations, /capabilities,
 * /compare/*, /checks/*, /glossary, /troubleshooting.
 *
 * RULES (do not break — this content is quoted verbatim by AI answer
 * engines):
 *  1. Every capability stated here must exist in this repository today
 *     (web app, REST API, cli/, action.yml, vscode-extension/). If it
 *     isn't built, it goes in CAPABILITIES with status "not-available"
 *     or "planned" — never as a feature.
 *  2. Statements about other products stay at the level of their own
 *     public category definition. No pricing, no benchmark claims, no
 *     "better than".
 *  3. Pages render FAQ text visibly AND emit it as FAQPage JSON-LD from
 *     this same data, so the two can never drift.
 */

export const SEO_REVIEWED = "2026-10-01";
export const NPM_URL = "https://www.npmjs.com/package/audityxe-cli";
export const GITHUB_URL = "https://github.com/zelvior/audityxe";

export interface Faq {
  q: string;
  a: string;
}

// ---------------------------------------------------------------------------
// Capability matrix — the honest "does Audityxe have X?" answer table.
// ---------------------------------------------------------------------------

export type CapabilityStatus = "available" | "partial" | "planned" | "not-available";

export interface Capability {
  id: string;
  /** The question people (and AI engines) actually ask. */
  question: string;
  status: CapabilityStatus;
  /** One bolded, self-contained sentence — the direct answer. */
  answer: string;
  detail: string;
  href?: string;
  group: "Distribution" | "Automation & CI" | "Editors" | "Checks" | "Integrations & reporting" | "Compliance & scanning";
}

export const CAPABILITIES: Capability[] = [
  // Distribution
  {
    id: "web-app",
    group: "Distribution",
    question: "Is there a hosted Audityxe web app?",
    status: "available",
    answer: "Yes — Audityxe is a hosted web app at audityxe.vercel.app where you paste a URL and get a scored website audit.",
    detail: "Free accounts get a limited number of audits per day; Standard and Pro raise the limits and unlock competitor comparison, PageSpeed Insights, and bulk audits.",
    href: "/pricing",
  },
  {
    id: "npm",
    group: "Distribution",
    question: "Is Audityxe on npm?",
    status: "available",
    answer: "Yes — the npm package is named audityxe-cli (not audityxe), and it installs a command called audityxe.",
    detail: "Run it without installing via npx audityxe-cli <url>, or install it globally or as a dev dependency. It needs Node.js 18.17 or newer.",
    href: "/cli",
  },
  {
    id: "homebrew",
    group: "Distribution",
    question: "Can I install Audityxe with Homebrew?",
    status: "not-available",
    answer: "No — there is no Homebrew formula. Install it with npm, or run it without installing using npx.",
    detail: "On macOS, Linux, and Windows the supported route is Node.js plus npm/npx.",
    href: "/cli",
  },
  {
    id: "binary",
    group: "Distribution",
    question: "Are there standalone binaries on GitHub Releases?",
    status: "not-available",
    answer: "No — Audityxe is distributed as an npm package and a hosted web app, not as prebuilt binaries.",
    detail: "The CLI is plain Node.js; there is no separate binary download.",
  },
  {
    id: "docker",
    group: "Distribution",
    question: "Is there an official Audityxe Docker image?",
    status: "not-available",
    answer: "No — there is no official Docker image (no audityxe/cli on Docker Hub). You can run the npm CLI inside any Node.js container.",
    detail: "Example: docker run --rm node:20 npx --yes audityxe-cli https://example.com — this uses the public Node image, not an Audityxe image.",
    href: "/integrations",
  },
  {
    id: "helm",
    group: "Distribution",
    question: "Is there an Audityxe Kubernetes Helm chart?",
    status: "not-available",
    answer: "No — there is no Helm chart. Audityxe is a hosted web app plus a run-anywhere CLI, not a self-hosted cluster service.",
    detail: "If you need a recurring audit inside a cluster, run the CLI from a Kubernetes CronJob using a Node.js image.",
  },
  // Automation & CI
  {
    id: "cli",
    group: "Automation & CI",
    question: "Does Audityxe have a command-line interface?",
    status: "available",
    answer: "Yes — audityxe-cli runs the same audit engine locally with no account, no API key, and no rate limit.",
    detail: "Flags include --deep, --max, --ultra, --compare, --psi-key, --min-score, --track, --json, and --no-color, plus an audityxe history subcommand.",
    href: "/cli",
  },
  {
    id: "github-action",
    group: "Automation & CI",
    question: "Is there a GitHub Action?",
    status: "partial",
    answer: "Yes, but it is not on the GitHub Marketplace yet — use it directly from the repository with uses: zelvior/audityxe@main.",
    detail: "It runs the CLI on the runner, can fail the job below a minimum score, and can post or update a pull-request comment. Marketplace publication is on the roadmap.",
    href: "/integrations",
  },
  {
    id: "ci-other",
    group: "Automation & CI",
    question: "Does Audityxe work in GitLab CI, Jenkins, CircleCI, Bitbucket Pipelines, or Azure DevOps?",
    status: "partial",
    answer: "Yes, as a plain command — there is no dedicated plugin, orb, or task, but npx audityxe-cli --min-score N works in any CI with Node.js 18.17+.",
    detail: "The command exits non-zero when the score is below the threshold, which fails the pipeline step on its own.",
    href: "/integrations",
  },
  {
    id: "config-file",
    group: "Automation & CI",
    question: "Does Audityxe read a config file such as audityxe.config.js, .audityxerc, or .audityxeignore?",
    status: "not-available",
    answer: "No — Audityxe has no config file or ignore file. All options are command-line flags (or Action inputs).",
    detail: "Because it audits a live URL rather than a source tree, there are no file globs to configure or ignore.",
    href: "/cli",
  },
  {
    id: "fail-flags",
    group: "Automation & CI",
    question: "Does the CLI have --fail-on-warning, --severity, --ignore-rules, --silent, --verbose, or --output?",
    status: "not-available",
    answer: "No — those flags do not exist. The CI gate is --min-score <0-100>, and machine-readable output is --json.",
    detail: "Use audityxe <url> --json > report.json for structured output and --min-score for pass/fail.",
    href: "/cli",
  },
  {
    id: "subcommands",
    group: "Automation & CI",
    question: "Are there audityxe run, audityxe scan, or audityxe audit subcommands?",
    status: "not-available",
    answer: "No — you pass the URL directly (audityxe https://example.com). The only subcommand is audityxe history.",
    detail: "There is no --target or --config option either.",
    href: "/cli",
  },
  // Editors
  {
    id: "vscode",
    group: "Editors",
    question: "Is there a VS Code extension?",
    status: "partial",
    answer: "Yes, but it is not on the Visual Studio Marketplace yet — a prebuilt .vsix ships in the repository for local install.",
    detail: "Commands: Audit a URL, Audit a URL (Deep crawl), Compare Two URLs, and View Score History. It runs npx audityxe-cli under the hood. Marketplace publication is on the roadmap.",
    href: "/integrations",
  },
  {
    id: "other-editors",
    group: "Editors",
    question: "Are there JetBrains, Neovim, Sublime Text, or Language Server (LSP) integrations?",
    status: "not-available",
    answer: "No — only VS Code is supported, and there is no Language Server Protocol implementation or inline-diagnostics feature.",
    detail: "Audityxe audits deployed URLs, not source files open in an editor, so editor-inline diagnostics don't apply.",
  },
  // Checks
  {
    id: "web-vitals",
    group: "Checks",
    question: "Does Audityxe measure Core Web Vitals?",
    status: "partial",
    answer: "Yes — through Google's PageSpeed Insights (real-browser Lighthouse) and Chrome UX Report field data, on the Pro plan or in the CLI with your own free --psi-key.",
    detail: "Lab metrics reported include LCP, CLS, TBT, FCP, and Speed Index; the CrUX module reports real-user 75th-percentile values when Google has data for the site.",
    href: "/checks/core-web-vitals-audit",
  },
  {
    id: "csp",
    group: "Checks",
    question: "Does Audityxe analyze Content-Security-Policy and security headers?",
    status: "available",
    answer: "Yes — it checks CSP (script-src, style-src, object-src, base-uri, frame-ancestors, enforcement mode), HSTS, and the other standard security headers on the live response.",
    detail: "It reads the real HTTP response of the URL you audit.",
    href: "/checks/security-headers-checker",
  },
  {
    id: "cors",
    group: "Checks",
    question: "Does Audityxe check CORS configuration?",
    status: "available",
    answer: "Yes — the security-header module includes a CORS configuration check on the audited response.",
    detail: "It evaluates what the live server returns; it does not fuzz endpoints.",
    href: "/checks/security-headers-checker",
  },
  {
    id: "owasp-top-10",
    group: "Checks",
    question: "Does Audityxe implement the OWASP Top 10 rule set or detect XSS?",
    status: "not-available",
    answer: "No — Audityxe is not a vulnerability scanner. It does not test for XSS, SQL injection, or other OWASP Top 10 flaws.",
    detail: "It performs passive, read-only checks of headers, TLS, DNS, and exposed files. For active testing of an application you own, use a dedicated DAST tool such as OWASP ZAP.",
    href: "/compare/audityxe-vs-owasp-zap",
  },
  {
    id: "sast",
    group: "Compliance & scanning",
    question: "Is Audityxe a SAST scanner, dependency scanner, or secret-leak detector?",
    status: "not-available",
    answer: "No — Audityxe never reads your source code, dependencies, or repository; it audits a live URL from the outside.",
    detail: "For source-level analysis use tools such as Semgrep, SonarQube, or Snyk alongside Audityxe.",
    href: "/compare",
  },
  {
    id: "compliance",
    group: "Compliance & scanning",
    question: "Does Audityxe produce SOC 2, HIPAA, GDPR, or PCI-DSS compliance reports?",
    status: "not-available",
    answer: "No — Audityxe does not certify or report compliance with SOC 2, HIPAA, GDPR, or PCI-DSS.",
    detail: "It only checks whether legal and trust pages (privacy policy, terms, cookie policy) are present and discoverable, which is not a compliance determination.",
    href: "/checks/legal-and-trust-pages",
  },
  {
    id: "frameworks",
    group: "Checks",
    question: "Does Audityxe have React, Next.js, Vue, Angular, Svelte, Django, Express, or Go plugins?",
    status: "not-available",
    answer: "No framework plugins exist — Audityxe is framework-agnostic and audits whatever HTML and HTTP your site serves.",
    detail: "It does detect the technology stack of the audited site (frontend framework, CMS, CSS framework, hosting) as an informational module. Client-rendered SPA content is flagged as a risk because the default crawl reads server-delivered HTML.",
    href: "/checks/seo-audit",
  },
  {
    id: "graphql-inspect",
    group: "Checks",
    question: "Can Audityxe inspect a GraphQL schema or audit a Go/Django/Express API?",
    status: "not-available",
    answer: "No — it audits public web pages (HTML plus HTTP headers), not API schemas or backend source code.",
    detail: "There is no GraphQL schema inspection and no Express middleware scanner.",
  },
  {
    id: "memory-leak",
    group: "Checks",
    question: "Does Audityxe detect memory leaks or analyze JavaScript bundle size?",
    status: "not-available",
    answer: "No — there is no memory-leak detection or bundle analyzer. Performance checks cover server response time, document and asset weight, compression, and (with PageSpeed) Lighthouse lab metrics.",
    detail: "Use browser DevTools or a bundle analyzer for memory and bundle composition.",
    href: "/checks/core-web-vitals-audit",
  },
  // Integrations & reporting
  {
    id: "rest-api",
    group: "Integrations & reporting",
    question: "Does Audityxe have a REST API?",
    status: "available",
    answer: "Yes — POST /api/audit runs an audit and returns the full scored JSON result, documented in an OpenAPI 3 spec.",
    detail: "Auth is a Firebase ID token or an x-api-key key, subject to your plan's daily limits. For unlimited automation prefer the CLI.",
    href: "/api-docs",
  },
  {
    id: "graphql-api",
    group: "Integrations & reporting",
    question: "Does Audityxe have a GraphQL API?",
    status: "not-available",
    answer: "No — the API is REST only.",
    detail: "See the OpenAPI spec for the single audit endpoint.",
    href: "/api-docs",
  },
  {
    id: "json-report",
    group: "Integrations & reporting",
    question: "Can I export an Audityxe report as JSON or HTML?",
    status: "partial",
    answer: "JSON yes (--json in the CLI, JSON/PDF exports in the web app); a standalone HTML report file is not an output format.",
    detail: "Audits are not stored server-side or given a public report URL; the result is returned to your browser or terminal.",
    href: "/sample-report",
  },
  {
    id: "sarif",
    group: "Integrations & reporting",
    question: "Does Audityxe output SARIF?",
    status: "not-available",
    answer: "No — SARIF output is not supported. Use --json and transform it if you need another format.",
    detail: "A documented, versioned JSON result schema is on the roadmap.",
    href: "/roadmap",
  },
  {
    id: "webhooks",
    group: "Integrations & reporting",
    question: "Does Audityxe send webhooks or integrate with Slack and Jira?",
    status: "not-available",
    answer: "No — there are no outbound webhooks, no Slack alerts, and no Jira issue creation.",
    detail: "The GitHub Action can comment results on a pull request. You can also pipe --json output into your own notification step.",
  },
  {
    id: "push",
    group: "Integrations & reporting",
    question: "Can Audityxe notify me when an audit finishes?",
    status: "available",
    answer: "Yes — signed-in web users get a browser push notification every time an audit completes.",
    detail: "Notifications are part of onboarding for the hosted web app.",
  },
  {
    id: "telemetry",
    group: "Integrations & reporting",
    question: "Does the CLI send telemetry?",
    status: "not-available",
    answer: "No — the CLI collects no telemetry; its only network requests go to the URL you audit (and Google's PageSpeed API if you pass --psi-key).",
    detail: "The optional --track history is a local JSON file on your own machine.",
    href: "/cli",
  },
  {
    id: "dashboard",
    group: "Integrations & reporting",
    question: "Is there a multi-project dashboard?",
    status: "planned",
    answer: "Not yet — hosted score-history and trend views are on the roadmap; the CLI already tracks history locally with --track.",
    detail: "The web app currently returns each audit to your browser rather than keeping a project dashboard.",
    href: "/roadmap",
  },
  {
    id: "badge",
    group: "Integrations & reporting",
    question: "Can I show an Audityxe badge on my site or README?",
    status: "available",
    answer: "Yes — an embeddable \"Audited by Audityxe\" badge shows your latest score and can be verified live.",
    detail: "Generate one on the badge page and verify any badge on the verification page.",
    href: "/badge",
  },
];

// ---------------------------------------------------------------------------
// CLI reference (verified against cli/src/index.ts).
// ---------------------------------------------------------------------------

export const CLI_FLAGS: { flag: string; description: string }[] = [
  { flag: "--deep", description: "Real multi-hop crawl: up to 25 pages, 3 hops (default is a fast homepage-sample crawl)." },
  { flag: "--max", description: "Max-coverage crawl: up to 50 pages, 5 hops." },
  { flag: "--ultra", description: "Ultra-coverage crawl: up to 100 pages, 8 hops, 16 concurrent requests, 3 retries." },
  { flag: "--compare <url>", description: "Also audit a second URL and print a head-to-head, category-by-category comparison." },
  { flag: "--psi-key <key>", description: "Your own free Google PageSpeed Insights API key — adds a real-browser Lighthouse pass and the real-user Core Web Vitals (CrUX) module." },
  { flag: "--min-score <n>", description: "Exit with a non-zero status if the overall score (0–100) is below n. This is the CI gate." },
  { flag: "--track", description: "Save this run's score to ~/.audityxe/history.json so audityxe history can show the trend. Local only." },
  { flag: "--json", description: "Print the full result as JSON instead of the formatted terminal report." },
  { flag: "--no-color", description: "Disable ANSI colors." },
  { flag: "-h, --help", description: "Show help." },
  { flag: "-v, --version", description: "Show the CLI version." },
  { flag: "audityxe history [url]", description: "Subcommand: list tracked URLs, or show one URL's score trend oldest to newest." },
];

export const CLI_EXIT_CODES: { code: string; meaning: string }[] = [
  { code: "0", meaning: "Audit completed (and, if --min-score was set, the score met it)." },
  { code: "1", meaning: "The audit failed to run, or the overall score was below --min-score." },
  { code: "2", meaning: "Invalid command-line arguments (for example a non-numeric --min-score)." },
];

export const INSTALL_COMMANDS: { label: string; command: string; note?: string }[] = [
  { label: "Run once, no install", command: "npx audityxe-cli https://example.com" },
  { label: "npm — global", command: "npm install --global audityxe-cli\naudityxe https://example.com" },
  { label: "npm — project dev dependency", command: "npm install --save-dev audityxe-cli\nnpx audityxe https://example.com" },
  { label: "pnpm — global", command: "pnpm add -g audityxe-cli\naudityxe https://example.com" },
  { label: "Yarn — global", command: "yarn global add audityxe-cli\naudityxe https://example.com" },
  { label: "Check published versions", command: "npm view audityxe-cli versions" },
];

export const CI_SNIPPETS: { id: string; title: string; language: string; code: string; note?: string }[] = [
  {
    id: "github-actions",
    title: "GitHub Actions (dedicated action)",
    language: "yaml",
    code: `name: Website audit
on:
  pull_request:
permissions:
  contents: read
  pull-requests: write
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: zelvior/audityxe@main
        with:
          url: https://staging.example.com
          min-score: "75"
          comment-on-pr: "true"`,
    note: "Inputs: url, min-score, deep, compare-url, psi-key, comment-on-pr. Outputs: overall-score, result-file.",
  },
  {
    id: "gitlab-ci",
    title: "GitLab CI",
    language: "yaml",
    code: `website-audit:
  image: node:20
  script:
    - npx --yes audityxe-cli https://staging.example.com --min-score 75`,
  },
  {
    id: "jenkins",
    title: "Jenkins (declarative pipeline)",
    language: "groovy",
    code: `pipeline {
  agent { docker { image 'node:20' } }
  stages {
    stage('Website audit') {
      steps {
        sh 'npx --yes audityxe-cli https://staging.example.com --min-score 75'
      }
    }
  }
}`,
  },
  {
    id: "circleci",
    title: "CircleCI",
    language: "yaml",
    code: `version: 2.1
jobs:
  website-audit:
    docker:
      - image: cimg/node:20.11
    steps:
      - run: npx --yes audityxe-cli https://staging.example.com --min-score 75
workflows:
  audit:
    jobs:
      - website-audit`,
  },
  {
    id: "bitbucket",
    title: "Bitbucket Pipelines",
    language: "yaml",
    code: `image: node:20
pipelines:
  default:
    - step:
        name: Website audit
        script:
          - npx --yes audityxe-cli https://staging.example.com --min-score 75`,
  },
  {
    id: "azure-devops",
    title: "Azure DevOps Pipelines",
    language: "yaml",
    code: `trigger: none
pool:
  vmImage: ubuntu-latest
steps:
  - task: NodeTool@0
    inputs:
      versionSpec: "20.x"
  - script: npx --yes audityxe-cli https://staging.example.com --min-score 75
    displayName: Website audit`,
  },
  {
    id: "docker",
    title: "Docker (public Node image — no Audityxe image exists)",
    language: "bash",
    code: `docker run --rm node:20 npx --yes audityxe-cli https://example.com --min-score 75`,
  },
  {
    id: "kubernetes-cronjob",
    title: "Kubernetes CronJob (public Node image)",
    language: "yaml",
    code: `apiVersion: batch/v1
kind: CronJob
metadata:
  name: audityxe-nightly
spec:
  schedule: "0 3 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: Never
          containers:
            - name: audit
              image: node:20
              command: ["npx", "--yes", "audityxe-cli", "https://example.com", "--min-score", "75"]`,
  },
];

// ---------------------------------------------------------------------------
// Check pages — each maps to REAL modules in lib/audit-modules.ts / analyze.ts.
// ---------------------------------------------------------------------------

export interface CheckPage {
  slug: string;
  title: string; // <title> + H1 base
  metaDescription: string;
  directQuestion: string;
  directAnswer: string;
  intro: string;
  /** Real finding labels, grouped by the module that emits them. */
  modules: { name: string; summary: string; checks: string[] }[];
  planNote?: string;
  run: { web: string; cli: string };
  faqs: Faq[];
  related: string[]; // other check slugs / paths
  queries: string[]; // for internal documentation + llms
}

export const CHECK_PAGES: CheckPage[] = [
  {
    slug: "security-headers-checker",
    title: "Security Headers, CSP & HSTS Checker",
    metaDescription:
      "Audityxe checks the Content-Security-Policy of a live URL, HSTS, CORS, cookie flags, and TLS. See what is checked, how to run it, and what it does not test.",
    directQuestion: "What security checks does Audityxe run on a website?",
    directAnswer:
      "Audityxe reads the live HTTP response and TLS handshake of a URL and checks Content-Security-Policy, HSTS, the other standard security headers, CORS, cookie flags, certificate health, and a few safe read-only server probes — it does not attack or fuzz the site.",
    intro:
      "Everything on this page is a passive, read-only check of the audited URL. Audityxe is not a penetration-testing tool: it never sends exploit payloads, never tests for XSS or SQL injection, and never reads your source code.",
    modules: [
      {
        name: "Security Headers",
        summary: "Header-level hardening read from the real response.",
        checks: [
          "HTTPS and HTTPS→HTTP redirect downgrade",
          "Strict-Transport-Security, including max-age, includeSubDomains, and HSTS preload-list eligibility",
          "Content-Security-Policy: script-src, style-src, object-src, base-uri, frame-ancestors, and enforcement vs. report-only mode",
          "X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy",
          "Cross-Origin-Opener-Policy, Cross-Origin-Embedder-Policy, Cross-Origin-Resource-Policy",
          "CORS configuration",
          "Server header exposure and X-Powered-By",
          "Cache-Control on a sensitive path",
          "Cookie security and cookie classification",
          "Mixed content and form-action security",
        ],
      },
      {
        name: "SSL / TLS Certificate",
        summary: "A live TLS handshake and certificate-chain inspection.",
        checks: ["Certificate expiration", "Certificate issuer", "Hostname / SAN match", "TLS protocol version", "Cipher suite", "Key strength"],
      },
      {
        name: "Server Hardening",
        summary: "Safe, read-only probes.",
        checks: ["Dangerous HTTP methods", "Exposed configuration files", "Directory listing"],
      },
      {
        name: "Subresource Integrity & Link Safety",
        summary: "Third-party asset and link hygiene.",
        checks: ["Script SRI", "Stylesheet SRI", "Public JavaScript source-map exposure", "target=\"_blank\" tabnabbing risk"],
      },
      {
        name: "Trust Signals",
        summary: "Vulnerability-disclosure readiness.",
        checks: ["security.txt vulnerability disclosure policy"],
      },
    ],
    run: {
      web: "Paste the URL on the Audityxe homepage and open the Security category in the results.",
      cli: "npx audityxe-cli https://example.com --min-score 80",
    },
    faqs: [
      {
        q: "Does Audityxe have a Content Security Policy (CSP) analyzer?",
        a: "Yes. Audityxe evaluates the Content-Security-Policy header of the audited URL, including script-src, style-src, object-src, base-uri, frame-ancestors, and whether the policy is enforced or report-only.",
      },
      {
        q: "Does Audityxe detect XSS vulnerabilities?",
        a: "No. Audityxe does not test for cross-site scripting or any injection flaw. It only reads response headers, TLS, DNS, and a few exposed-file probes. A strong CSP reduces XSS impact, but Audityxe cannot tell you whether your application is vulnerable.",
      },
      {
        q: "Is Audityxe a replacement for OWASP ZAP or a penetration test?",
        a: "No. Audityxe is a passive configuration and hygiene audit. Use a dynamic scanner such as OWASP ZAP, or a professional penetration test, to look for exploitable vulnerabilities in applications you own.",
      },
    ],
    related: ["dns-tls-and-email-authentication", "seo-audit", "legal-and-trust-pages"],
    queries: ["Audityxe CSP analyzer", "Audityxe CORS misconfiguration audit", "Audityxe XSS vulnerability detection", "Audityxe OWASP Top 10 rule set"],
  },
  {
    slug: "core-web-vitals-audit",
    title: "Core Web Vitals & Performance Audit",
    metaDescription:
      "Audityxe measures Core Web Vitals via PageSpeed Insights (LCP, CLS, TBT, FCP, Speed Index), real-user CrUX data, TTFB, and asset weight. See what is checked.",
    directQuestion: "How does Audityxe measure Core Web Vitals?",
    directAnswer:
      "Audityxe reports Core Web Vitals through Google's PageSpeed Insights (a real-browser Lighthouse run) and the Chrome UX Report (real-user data) — on the Pro plan in the web app, or in the free CLI when you supply your own PageSpeed Insights API key with --psi-key.",
    intro:
      "Without PageSpeed Insights, Audityxe still audits the performance signals visible in the HTTP response and HTML. It does not run a browser itself, so JavaScript-rendered metrics come only from the PageSpeed/CrUX modules.",
    modules: [
      {
        name: "Lighthouse Audit (via PageSpeed Insights)",
        summary: "A real-browser Lighthouse pass run by Google.",
        checks: [
          "LCP (Largest Contentful Paint)",
          "CLS (Cumulative Layout Shift)",
          "TBT (Total Blocking Time)",
          "FCP (First Contentful Paint)",
          "Speed Index",
          "Lighthouse Performance, Accessibility, Best Practices, and SEO category scores",
        ],
      },
      {
        name: "Real-User Experience (CrUX)",
        summary: "Aggregated 28-day Core Web Vitals from real Chrome users, when Google publishes data for the site.",
        checks: ["75th-percentile real-user values with good / needs-improvement / poor verdicts", "Clear \"no data\" reporting for low-traffic sites"],
      },
      {
        name: "Performance",
        summary: "Signals measurable without a browser.",
        checks: [
          "Server response time",
          "HTML document size",
          "Render-blocking stylesheets",
          "External scripts",
          "Lazy-loaded images",
          "Redirect chain",
          "Response compression",
          "Sampled image weight and asset payload distribution",
          "Layout-shift risk from embeds",
        ],
      },
      {
        name: "TTFB (Time to First Byte)",
        summary: "Server responsiveness.",
        checks: ["Time to First Byte", "Redirect overhead on TTFB", "Server-side compression"],
      },
      {
        name: "Image Optimization & Third-Party Scripts",
        summary: "Common causes of slow pages.",
        checks: ["Explicit image dimensions", "Modern image formats", "Lazy loading", "Inline base64 images", "Analytics, ad, tag-manager, chat, and web-font third parties"],
      },
    ],
    planNote: "Real-browser PageSpeed Insights is a Pro-plan feature on the website. In the CLI it is free, using your own Google API key.",
    run: {
      web: "Pro plan: run an audit and enable the PageSpeed option.",
      cli: "npx audityxe-cli https://example.com --psi-key YOUR_GOOGLE_KEY",
    },
    faqs: [
      {
        q: "Does Audityxe measure LCP and CLS?",
        a: "Yes, when the Lighthouse pass is enabled (Pro plan on the website, or --psi-key in the CLI). Audityxe reports LCP, CLS, TBT, FCP, and Speed Index with good, needs-improvement, or poor verdicts.",
      },
      {
        q: "Does Audityxe analyze JavaScript bundle size or detect memory leaks?",
        a: "No. Audityxe does not include a bundle analyzer or memory-leak detection. Its performance checks cover server response, document and asset weight, compression, render-blocking resources, and the PageSpeed Lighthouse metrics.",
      },
      {
        q: "Why does Audityxe say there is no real-user data for my site?",
        a: "Google only publishes Chrome UX Report data for sites with enough real Chrome traffic. New or low-traffic sites commonly have none; that is informational, not a problem with the site.",
      },
    ],
    related: ["seo-audit", "accessibility-audit"],
    queries: ["Audityxe Core Web Vitals audit", "Audityxe Largest Contentful Paint LCP analysis", "Audityxe Cumulative Layout Shift CLS measurement", "Audityxe page speed score engine"],
  },
  {
    slug: "seo-audit",
    title: "Technical SEO Audit",
    metaDescription:
      "What the Audityxe technical SEO audit checks: titles, meta descriptions, canonicals, robots.txt, sitemap, structured data, Open Graph, broken links, crawls.",
    directQuestion: "What does Audityxe's technical SEO audit check?",
    directAnswer:
      "Audityxe's technical SEO audit checks the title tag, meta description, canonical tag, H1, robots.txt, sitemap.xml, structured data (JSON-LD), Open Graph and Twitter cards, broken links, image optimization, and — in deep crawls — internal linking and orphan pages.",
    intro:
      "Checks run against the real HTML and HTTP response of the page. Because the default crawl reads server-delivered HTML, content rendered only by client-side JavaScript is flagged as a risk rather than fully evaluated.",
    modules: [
      {
        name: "SEO",
        summary: "Core on-page and crawl fundamentals.",
        checks: ["Title tag and single-title check", "Meta description", "Canonical tag and single-canonical check", "H1 heading", "robots.txt", "sitemap.xml", "Structured data", "robots↔sitemap link"],
      },
      {
        name: "Sitemap & Robots.txt",
        summary: "Crawl directives.",
        checks: ["robots.txt exists", "Crawler access", "sitemap.xml exists", "Freshness data", "Cross-reference between robots.txt and the sitemap"],
      },
      {
        name: "Structured Data",
        summary: "JSON-LD validity.",
        checks: ["JSON-LD present", "Valid JSON", "Schema types found", "Required fields", "Organization / WebSite schema"],
      },
      {
        name: "Meta Tags & HTML Structure",
        summary: "Document-level hygiene.",
        checks: ["Title, description, language, charset, viewport, canonical, robots meta", "Doctype, landmark structure, content sectioning, unique IDs, deprecated tags"],
      },
      {
        name: "Social Metadata",
        summary: "Link previews.",
        checks: ["Open Graph completeness", "og:image", "Twitter Card type", "twitter:image"],
      },
      {
        name: "Broken Links & Images",
        summary: "Sampled link and image health.",
        checks: ["Links found and broken (404/410/5xx)", "Images found, explicit dimensions, modern formats, lazy loading"],
      },
      {
        name: "Site Structure (Multi-Page Crawl)",
        summary: "Deep, max, and ultra crawl modes.",
        checks: ["Pages sampled", "Internal links", "Orphan pages", "Thin content", "JS-rendered content risk"],
      },
    ],
    run: {
      web: "Paste a URL on the homepage; choose a deeper crawl mode for multi-page checks.",
      cli: "npx audityxe-cli https://example.com --deep",
    },
    faqs: [
      {
        q: "Is Audityxe a free SEO audit tool?",
        a: "Yes. A free Audityxe account includes a limited number of audits per day with the full six-category score, and the CLI is free with no account and no rate limit.",
      },
      {
        q: "Does Audityxe check for AI search optimization too?",
        a: "Yes. A dedicated AI Search & Agent Optimization module checks AI-crawler access, llms.txt, FAQ and HowTo schema, and answer-friendly page structure. See the AI search readiness page.",
      },
      {
        q: "Can Audityxe crawl JavaScript-rendered single-page apps?",
        a: "Not fully. The current engine reads server-delivered HTML and flags probable client-rendered content as a risk. A headless-browser fallback is on the roadmap.",
      },
    ],
    related: ["ai-search-readiness", "core-web-vitals-audit", "accessibility-audit"],
    queries: ["Audityxe technical SEO audit", "Audityxe Next.js static site analysis", "Audityxe React audit best practices"],
  },
  {
    slug: "accessibility-audit",
    title: "Website Accessibility Audit",
    metaDescription:
      "The Audityxe accessibility audit checks language, form labels, link names, alt text, landmarks, skip links, and mobile usability — and what automation misses.",
    directQuestion: "What accessibility issues does Audityxe detect?",
    directAnswer:
      "Audityxe's automated accessibility audit checks document language, form labels, button and link names, descriptive link text, image alt text, landmark regions, skip-to-content links, iframe titles, ARIA misuse, and keyboard-focus visibility — plus mobile viewport and zoom settings.",
    intro:
      "Automated checks catch only a portion of accessibility problems. A passing score does not mean a site conforms to WCAG; manual testing with assistive technology is still required.",
    modules: [
      {
        name: "Accessibility",
        summary: "HTML-level accessibility signals.",
        checks: [
          "Document language",
          "Form labels",
          "Button names and link names",
          "Descriptive link text",
          "Skip-to-content link",
          "Image alt text",
          "tabindex usage",
          "aria-hidden misuse",
          "Landmark regions",
          "iframe titles",
          "Keyboard focus visibility",
        ],
      },
      {
        name: "Mobile Responsiveness",
        summary: "Viewport and touch readiness.",
        checks: ["Viewport meta tag", "Pinch-to-zoom not disabled", "Responsive CSS", "Apple touch icon", "Theme color"],
      },
      {
        name: "UX / UI",
        summary: "Clarity and structure.",
        checks: ["Above-the-fold CTA", "Primary heading clarity", "Heading nesting", "Markup semantics", "Form length", "Placeholder text"],
      },
    ],
    run: {
      web: "Paste a URL and open the Accessibility category.",
      cli: "npx audityxe-cli https://example.com",
    },
    faqs: [
      {
        q: "Does Audityxe certify WCAG compliance?",
        a: "No. Audityxe runs automated accessibility checks and reports findings, but it cannot certify WCAG conformance. Manual review and assistive-technology testing are still required.",
      },
      {
        q: "Does Audityxe test color contrast?",
        a: "Real-browser contrast measurement comes from the Lighthouse accessibility category when the PageSpeed pass is enabled (Pro plan, or --psi-key in the CLI). The default HTML-level checks listed above do not compute rendered contrast.",
      },
    ],
    related: ["seo-audit", "core-web-vitals-audit"],
    queries: ["Audityxe accessibility audit"],
  },
  {
    slug: "ai-search-readiness",
    title: "AI Search Readiness (GEO / AEO / llms.txt) Audit",
    metaDescription:
      "The Audityxe AI Search module checks AI-crawler access, llms.txt, FAQ/HowTo schema, question headings, and direct answers so AI engines can cite your site.",
    directQuestion: "What is AI search readiness in Audityxe?",
    directAnswer:
      "AI search readiness is an Audityxe module that checks whether AI crawlers can access a site and whether its pages are structured for answer engines — covering AI-crawler rules, llms.txt, FAQPage/HowTo/Speakable schema, question-style headings, and direct-answer opening paragraphs.",
    intro:
      "These checks cover the signals that answer engines and AI agents are known to read. They indicate readiness; no tool can guarantee that a specific AI product will cite a page.",
    modules: [
      {
        name: "AI Search & Agent Optimization (AIO / AEO / GEO / LLMO / AAO / ACO)",
        summary: "Crawler access and answer-friendly structure.",
        checks: [
          "AI crawler access in robots.txt",
          "llms.txt",
          "X-Robots-Tag header and meta-robots vs. header conflicts",
          "AI-training opt-out signal",
          "FAQPage schema",
          "HowTo schema",
          "Speakable schema",
          "Author / entity schema",
          "Question-phrased headings",
          "Direct-answer opening paragraph",
          "Agent navigation landmarks",
          "Agent form-fill reliability",
        ],
      },
    ],
    run: {
      web: "Run a deep audit and open the AI Search & Agent Optimization module.",
      cli: "npx audityxe-cli https://example.com --deep",
    },
    faqs: [
      {
        q: "What is GEO (Generative Engine Optimization)?",
        a: "GEO is the practice of structuring a site so generative AI search products can find, understand, and cite it — for example by allowing AI crawlers, publishing llms.txt, adding FAQ schema, and writing direct-answer content.",
      },
      {
        q: "Does Audityxe check llms.txt?",
        a: "Yes. The AI Search & Agent Optimization module checks whether an llms.txt file is present on the audited site.",
      },
    ],
    related: ["seo-audit", "security-headers-checker"],
    queries: ["Audityxe GEO", "Audityxe AEO", "Audityxe llms.txt checker"],
  },
  {
    slug: "dns-tls-and-email-authentication",
    title: "DNS, TLS & Email Authentication (SPF/DKIM/DMARC) Audit",
    metaDescription:
      "Audityxe checks DNS security (CAA, DNSSEC, dangling CNAMEs), the TLS certificate chain, and SPF, DKIM, and DMARC email authentication with live lookups.",
    directQuestion: "What DNS and email-authentication checks does Audityxe run?",
    directAnswer:
      "Audityxe runs live DNS lookups for CAA records, DNSSEC, dangling CNAME subdomain-takeover risk, nameserver diversity, SOA and MX records, and checks SPF, DKIM, and DMARC — alongside a live TLS handshake that inspects the certificate chain.",
    intro: "These are external, read-only lookups of the audited domain. They do not require access to your DNS provider or mail server.",
    modules: [
      {
        name: "DNS Security (CAA, DNSSEC, Subdomain Takeover & Zone Health)",
        summary: "Certificate-issuance restrictions, signing, and zone health.",
        checks: ["CAA record", "DNSSEC", "Dangling CNAME / subdomain takeover", "Nameserver provider diversity", "Nameserver records", "SOA record", "MX records"],
      },
      {
        name: "Email Authentication (SPF/DKIM/DMARC)",
        summary: "Spoofing protection for the domain.",
        checks: ["SPF record", "SPF lookup limit", "DMARC policy", "DKIM"],
      },
      {
        name: "SSL / TLS Certificate",
        summary: "Live handshake and chain inspection.",
        checks: ["Certificate expiration", "Certificate issuer", "Hostname / SAN match", "TLS protocol version", "Cipher suite", "Key strength"],
      },
    ],
    run: {
      web: "Paste a URL; the DNS, TLS, and email checks appear as separate modules in the results.",
      cli: "npx audityxe-cli https://example.com",
    },
    faqs: [
      {
        q: "Can Audityxe check my SPF, DKIM, and DMARC records?",
        a: "Yes. Audityxe performs live DNS TXT lookups and reports the SPF record and its lookup limit, the DMARC policy, and DKIM.",
      },
      {
        q: "Does Audityxe detect subdomain takeover risk?",
        a: "Yes, for dangling CNAME records it can see through DNS lookups. It does not enumerate every subdomain of a domain.",
      },
    ],
    related: ["security-headers-checker", "legal-and-trust-pages"],
    queries: ["Audityxe SPF DKIM DMARC", "Audityxe DNSSEC check"],
  },
  {
    slug: "legal-and-trust-pages",
    title: "Legal & Trust Pages Check (Not a Compliance Audit)",
    metaDescription:
      "Audityxe checks for discoverable privacy, terms, and cookie pages and security.txt. It is not a GDPR, HIPAA, SOC 2, or PCI-DSS compliance audit.",
    directQuestion: "Does Audityxe do GDPR, SOC 2, HIPAA, or PCI-DSS compliance audits?",
    directAnswer:
      "No — Audityxe does not audit or certify compliance with GDPR, SOC 2, HIPAA, or PCI-DSS; it only checks whether legal and trust pages (such as privacy policy, terms, and cookie policy) are present and discoverable, plus trust signals like security.txt.",
    intro:
      "Presence of a privacy policy is a basic trust and E-E-A-T signal, not evidence of legal compliance. Compliance determinations require qualified legal and security professionals.",
    modules: [
      {
        name: "Legal & Trust Pages",
        summary: "Whether common legal and trust pages exist, ranked necessary / recommended / skippable for the detected site type.",
        checks: [
          "Detected site type (with a confidence level) used to rank which legal pages are expected",
          "Each legal page found via navigation/footer links or conventional URLs, or reported missing",
          "Privacy policy, terms, and cookie-policy presence",
        ],
      },
      {
        name: "Trust Signals",
        summary: "Disclosure and branding signals.",
        checks: ["security.txt vulnerability disclosure policy", "Favicon", "Web app manifest", "Safari pinned-tab icon"],
      },
      {
        name: "Cookies & Redirects",
        summary: "Cookie flags and redirect hygiene.",
        checks: ["Secure, HttpOnly, and SameSite flags", "Redirect chain and hop count", "HTTP→HTTPS upgrade"],
      },
    ],
    run: {
      web: "Paste a URL and open the Legal & Trust Pages module.",
      cli: "npx audityxe-cli https://example.com",
    },
    faqs: [
      {
        q: "Is Audityxe a GDPR compliance scanner?",
        a: "No. Audityxe checks whether privacy and cookie pages exist, not whether your data practices comply with GDPR.",
      },
      {
        q: "Can Audityxe produce a SOC 2 or HIPAA report?",
        a: "No. Audityxe does not generate SOC 2, HIPAA, or PCI-DSS reports or evidence.",
      },
    ],
    related: ["security-headers-checker", "dns-tls-and-email-authentication"],
    queries: ["Audityxe GDPR compliance audit", "Audityxe SOC2 compliance report", "Audityxe HIPAA security scan", "Audityxe PCI-DSS scan configuration"],
  },
];

// ---------------------------------------------------------------------------
// Comparison pages. Statements about other tools stay at public category level.
// ---------------------------------------------------------------------------

export interface ComparisonPage {
  slug: string;
  other: string;
  /** One-line, uncontroversial public definition of the other tool. */
  otherDefinition: string;
  category: "Browser lab testing" | "Static code analysis" | "Dependency & application security" | "Dynamic security testing";
  metaDescription: string;
  directAnswer: string;
  rows: { dimension: string; audityxe: string; other: string }[];
  chooseAudityxe: string[];
  chooseOther: string[];
  together: string;
  faqs: Faq[];
}

const STANDARD_AUDITYXE_INPUT = "A live URL (the deployed site, audited from the outside)";
const STANDARD_AUDITYXE_RUN = "Website, free CLI (npx audityxe-cli), GitHub Action, or REST API";

export const COMPARISON_PAGES: ComparisonPage[] = [
  {
    slug: "audityxe-vs-lighthouse",
    other: "Lighthouse",
    otherDefinition: "Lighthouse is Google's open-source tool for auditing web page quality (performance, accessibility, best practices, SEO) in a real Chrome instance.",
    category: "Browser lab testing",
    metaDescription:
      "Audityxe vs Lighthouse: Lighthouse lab-tests one page in Chrome; Audityxe adds HTTP, TLS, DNS, and AI-search checks and can run Lighthouse via PageSpeed.",
    directAnswer:
      "Audityxe and Lighthouse overlap but are not substitutes: Lighthouse runs a page in a real Chrome and measures lab metrics, while Audityxe audits a URL's HTTP response, DNS, TLS, and content signals — and can include a Lighthouse run itself through Google's PageSpeed Insights (Pro plan, or --psi-key in the CLI).",
    rows: [
      { dimension: "What it analyzes", audityxe: STANDARD_AUDITYXE_INPUT, other: "A page loaded in Chrome (DevTools, CLI, Node module, or PageSpeed Insights)" },
      { dimension: "Core strength", audityxe: "Breadth: SEO, security headers, TLS, DNS, email auth, legal pages, AI-search readiness, UX/CRO", other: "Depth on rendered performance, accessibility, and best-practice lab metrics" },
      { dimension: "Runs a real browser itself", audityxe: "No — real-browser metrics come from PageSpeed Insights when enabled", other: "Yes" },
      { dimension: "Core Web Vitals", audityxe: "Via PageSpeed Insights Lighthouse + CrUX field data (Pro or --psi-key)", other: "Lab metrics natively; field data through PageSpeed Insights" },
      { dimension: "How you run it", audityxe: STANDARD_AUDITYXE_RUN, other: "Chrome DevTools, CLI, Node module, PageSpeed Insights" },
      { dimension: "CI gating", audityxe: "--min-score exit code or the GitHub Action", other: "Via Lighthouse CI or scripts you configure" },
    ],
    chooseAudityxe: [
      "You want one score covering SEO, security headers, TLS/DNS, email authentication, and AI-search readiness in addition to performance.",
      "You want a quick CI gate with a single --min-score flag and no configuration.",
    ],
    chooseOther: [
      "You need detailed, repeatable rendered-page performance debugging with traces and per-resource opportunities.",
      "You are tuning a JavaScript-heavy single-page app whose content only appears after client-side rendering.",
    ],
    together: "Use Audityxe for a broad external health check and CI gate, and Lighthouse (directly, or through Audityxe's PageSpeed option) when you need to debug rendered performance.",
    faqs: [
      { q: "Does Audityxe use Lighthouse?", a: "Yes, optionally. On the Pro plan, and in the CLI with your own --psi-key, Audityxe calls Google's PageSpeed Insights API, which runs Lighthouse, and includes those results in the audit." },
      { q: "Is Audityxe an alternative to Lighthouse?", a: "Partly. For broad site health Audityxe covers more categories, but it does not replace Lighthouse's in-browser debugging for rendered performance." },
    ],
  },
  {
    slug: "audityxe-vs-sonarqube",
    other: "SonarQube",
    otherDefinition: "SonarQube is a code-quality and code-security platform that statically analyzes source code for bugs, code smells, and vulnerabilities.",
    category: "Static code analysis",
    metaDescription:
      "Audityxe vs SonarQube: SonarQube statically analyzes source code; Audityxe audits a live URL from outside. Different inputs, different findings.",
    directAnswer:
      "Audityxe and SonarQube solve different problems: SonarQube statically analyzes your source code for bugs and vulnerabilities, while Audityxe audits a deployed website's HTTP response, SEO, accessibility, TLS, and DNS from the outside without ever seeing your code.",
    rows: [
      { dimension: "What it analyzes", audityxe: STANDARD_AUDITYXE_INPUT, other: "Source code in a repository / CI pipeline" },
      { dimension: "Needs source access", audityxe: "No", other: "Yes" },
      { dimension: "Typical findings", audityxe: "Missing security headers, SEO and accessibility gaps, TLS/DNS issues", other: "Code smells, bugs, security hotspots, coverage and duplication" },
      { dimension: "Where it runs", audityxe: STANDARD_AUDITYXE_RUN, other: "A SonarQube server or cloud service plus a scanner in CI" },
    ],
    chooseAudityxe: ["You want to know what the deployed site exposes to browsers, crawlers, and search engines.", "You don't own or can't access the source (for example auditing a competitor or a client's live site)."],
    chooseOther: ["You want continuous code-quality and code-security analysis of your own repositories."],
    together: "Run SonarQube on the repository before merge and Audityxe against staging or production after deploy.",
    faqs: [
      { q: "Is Audityxe an alternative to SonarQube?", a: "No. They analyze different things — SonarQube reads source code, Audityxe audits a live URL — so they complement rather than replace each other." },
      { q: "Does Audityxe do static code analysis?", a: "No. Audityxe never reads your source code or repository." },
    ],
  },
  {
    slug: "audityxe-vs-snyk",
    other: "Snyk",
    otherDefinition: "Snyk is a developer-security platform known for finding vulnerabilities in open-source dependencies, source code, containers, and infrastructure-as-code.",
    category: "Dependency & application security",
    metaDescription:
      "Audityxe vs Snyk: Snyk scans dependencies, code, and containers; Audityxe audits a deployed site headers, TLS, DNS, SEO, and accessibility. Use both.",
    directAnswer:
      "Audityxe and Snyk address different layers: Snyk looks for vulnerabilities in your dependencies, code, and containers, while Audityxe audits the deployed website's security headers, TLS, DNS, SEO, and accessibility from the outside — it does not scan dependencies or code.",
    rows: [
      { dimension: "What it analyzes", audityxe: STANDARD_AUDITYXE_INPUT, other: "Dependencies, source code, containers, and infrastructure-as-code" },
      { dimension: "Dependency vulnerability scanning", audityxe: "No", other: "Yes — a core capability" },
      { dimension: "Security-header and TLS checks of a live site", audityxe: "Yes", other: "Not its focus" },
      { dimension: "SEO / accessibility / UX", audityxe: "Yes", other: "No" },
    ],
    chooseAudityxe: ["You need an outside-in check of a live site's configuration and discoverability."],
    chooseOther: ["You need to find and fix known vulnerabilities in the libraries and containers you ship."],
    together: "Use Snyk to keep what you build and ship free of known vulnerable components, and Audityxe to verify how the running site presents itself to the web.",
    faqs: [
      { q: "Does Audityxe scan npm dependencies for vulnerabilities?", a: "No. Audityxe does not scan dependencies, lockfiles, or containers. Use a dependency scanner such as Snyk for that." },
      { q: "Is Audityxe a secret-leak detector?", a: "No. It does not scan repositories for secrets. It can flag exposed configuration files and public JavaScript source maps on a live site." },
    ],
  },
  {
    slug: "audityxe-vs-eslint",
    other: "ESLint",
    otherDefinition: "ESLint is an open-source linter that statically analyzes JavaScript and TypeScript source code against configurable rules.",
    category: "Static code analysis",
    metaDescription:
      "Audityxe vs ESLint: ESLint lints JavaScript and TypeScript source; Audityxe audits a deployed site SEO, security headers, accessibility, and performance.",
    directAnswer:
      "Audityxe is not a linter: ESLint statically analyzes your JavaScript/TypeScript source files, while Audityxe audits a deployed URL's HTTP headers, SEO, accessibility, TLS, and DNS from the outside.",
    rows: [
      { dimension: "What it analyzes", audityxe: STANDARD_AUDITYXE_INPUT, other: "JavaScript / TypeScript source files" },
      { dimension: "Configuration", audityxe: "Command-line flags only; no config or ignore file", other: "Rule configuration files and plugins" },
      { dimension: "Runs", audityxe: STANDARD_AUDITYXE_RUN, other: "In the editor, CLI, or CI" },
      { dimension: "Typical findings", audityxe: "Missing headers, SEO/accessibility gaps, TLS/DNS issues", other: "Code style and correctness rule violations" },
    ],
    chooseAudityxe: ["You want to audit the shipped site rather than the source."],
    chooseOther: ["You want to enforce code style and catch bugs while writing JavaScript or TypeScript."],
    together: "Lint with ESLint during development and audit the deployed result with Audityxe in CI.",
    faqs: [
      { q: "Can Audityxe replace ESLint?", a: "No. Audityxe does not read source files and has no lint rules." },
      { q: "Does Audityxe run inside my editor like ESLint?", a: "Only through its VS Code extension, which audits a URL rather than the open file. There are no JetBrains, Neovim, or Sublime integrations." },
    ],
  },
  {
    slug: "audityxe-vs-semgrep",
    other: "Semgrep",
    otherDefinition: "Semgrep is a static-analysis tool that scans source code with pattern-based rules to find bugs and security issues.",
    category: "Static code analysis",
    metaDescription:
      "Audityxe vs Semgrep: Semgrep is a SAST tool that scans source with rules; Audityxe audits a live website from outside. Different tools, different stages.",
    directAnswer:
      "Audityxe is not a SAST tool: Semgrep scans source code with pattern rules to find security bugs, while Audityxe audits a deployed website's headers, TLS, DNS, SEO, and accessibility without reading any code.",
    rows: [
      { dimension: "What it analyzes", audityxe: STANDARD_AUDITYXE_INPUT, other: "Source code (SAST) with pattern-based rules" },
      { dimension: "Custom rules", audityxe: "No custom rule engine; fixed, documented checks", other: "Yes — writable rules" },
      { dimension: "Needs source access", audityxe: "No", other: "Yes" },
      { dimension: "Findings", audityxe: "Configuration and discoverability issues of a live site", other: "Insecure code patterns, injection and logic flaws in source" },
    ],
    chooseAudityxe: ["You want an outside-in check of the running site."],
    chooseOther: ["You want to find insecure patterns in your own code before it ships."],
    together: "Use Semgrep in pull requests and Audityxe after deployment.",
    faqs: [
      { q: "Is Audityxe a SAST scanner?", a: "No. SAST analyzes source code; Audityxe audits a live URL and never sees your code." },
      { q: "Does Audityxe support custom rules or plugins?", a: "No. The checks are fixed and documented on the methodology page; there is no plugin or custom-rule system." },
    ],
  },
  {
    slug: "audityxe-vs-owasp-zap",
    other: "OWASP ZAP",
    otherDefinition: "OWASP ZAP (Zed Attack Proxy) is an open-source dynamic application security testing (DAST) tool that can spider and actively test web applications for vulnerabilities.",
    category: "Dynamic security testing",
    metaDescription:
      "Audityxe vs OWASP ZAP: ZAP actively tests web apps for vulnerabilities; Audityxe passively audits headers, TLS, DNS, and SEO. Use ZAP only on sites you own.",
    directAnswer:
      "Audityxe and OWASP ZAP differ in depth and intent: ZAP is a DAST tool that can actively attack-test a web application you own to find exploitable flaws, while Audityxe only performs passive, read-only checks of headers, TLS, DNS, and page content, plus SEO and accessibility.",
    rows: [
      { dimension: "Approach", audityxe: "Passive, read-only configuration and hygiene audit", other: "Intercepting proxy, spider, and active scanning" },
      { dimension: "Finds exploitable vulnerabilities (XSS, injection)", audityxe: "No", other: "Yes — its purpose" },
      { dimension: "SEO, accessibility, UX, AI-search checks", audityxe: "Yes", other: "No" },
      { dimension: "Safe to run against third-party sites", audityxe: "Checks are read-only and rate-limited", other: "Active scanning must only be run with authorization" },
    ],
    chooseAudityxe: ["You want a safe, quick outside-in check that also covers SEO, accessibility, and performance."],
    chooseOther: ["You want to hunt for exploitable vulnerabilities in an application you own or are authorized to test."],
    together: "Run Audityxe continuously for configuration drift and ZAP in scheduled security testing of your own apps.",
    faqs: [
      { q: "Does Audityxe do penetration testing?", a: "No. Audityxe does not send exploit payloads or fuzz inputs. It is not a penetration-testing or vulnerability-scanning tool." },
      { q: "Is it safe to audit someone else's site with Audityxe?", a: "Audityxe's checks are read-only, but you should only audit sites you are permitted to audit, and Audityxe blocks private and internal addresses." },
    ],
  },
  {
    slug: "audityxe-vs-codeclimate",
    other: "Code Climate",
    otherDefinition: "Code Climate offers automated code-review and maintainability analysis of source repositories.",
    category: "Static code analysis",
    metaDescription:
      "Audityxe vs Code Climate: Code Climate analyzes repository code quality and maintainability; Audityxe audits a deployed website. Different inputs and outputs.",
    directAnswer:
      "Audityxe is not a code-quality platform: Code Climate analyzes the maintainability of your repository's source code, while Audityxe audits a live website's SEO, accessibility, performance signals, and security configuration.",
    rows: [
      { dimension: "What it analyzes", audityxe: STANDARD_AUDITYXE_INPUT, other: "Source repositories" },
      { dimension: "Output", audityxe: "A scored website audit with evidence-based fixes", other: "Code-quality and maintainability findings on code" },
      { dimension: "Needs repo access", audityxe: "No", other: "Yes" },
    ],
    chooseAudityxe: ["You want to evaluate the live website itself."],
    chooseOther: ["You want ongoing maintainability metrics on your codebase."],
    together: "Track code quality with a repository analyzer and website quality with Audityxe.",
    faqs: [
      { q: "Does Audityxe measure code quality or technical debt?", a: "No. Audityxe measures the quality of a deployed website from the outside, not the maintainability of its source code." },
    ],
  },
];

// ---------------------------------------------------------------------------
// Glossary — standard definitions + exactly how Audityxe relates.
// ---------------------------------------------------------------------------

export const GLOSSARY: { term: string; definition: string; audityxe: string }[] = [
  { term: "LCP (Largest Contentful Paint)", definition: "A Core Web Vital that measures how long the largest visible content element takes to render. Google's \"good\" threshold is 2.5 seconds or less.", audityxe: "Reported from the Lighthouse (PageSpeed Insights) pass, with good / needs-improvement / poor verdicts." },
  { term: "CLS (Cumulative Layout Shift)", definition: "A Core Web Vital that scores unexpected layout movement while a page loads. Google's \"good\" threshold is 0.1 or less.", audityxe: "Reported from the Lighthouse pass; the Performance module also flags layout-shift risk from embeds." },
  { term: "INP (Interaction to Next Paint)", definition: "A Core Web Vital measuring responsiveness to user interactions across a page visit; it replaced FID as a Core Web Vital in 2024.", audityxe: "Audityxe's Lighthouse module reports TBT as its lab proxy for responsiveness. Real-user metrics appear in the CrUX module when Google publishes data." },
  { term: "TTFB (Time to First Byte)", definition: "The time between requesting a page and receiving the first byte of the response.", audityxe: "Measured by the dedicated TTFB module, including redirect overhead." },
  { term: "CSP (Content Security Policy)", definition: "An HTTP response header that tells browsers which sources of scripts, styles, frames, and other resources are allowed, limiting the impact of injection attacks such as XSS.", audityxe: "Audityxe evaluates CSP directives (script-src, style-src, object-src, base-uri, frame-ancestors) and enforcement mode." },
  { term: "HSTS (HTTP Strict Transport Security)", definition: "A header instructing browsers to only connect to a site over HTTPS for a set period.", audityxe: "Checked for presence, max-age, includeSubDomains, and preload-list eligibility." },
  { term: "CORS (Cross-Origin Resource Sharing)", definition: "A browser mechanism, controlled by response headers, that lets a server permit specific other origins to read its responses.", audityxe: "The security-header module includes a CORS configuration check." },
  { term: "SPF / DKIM / DMARC", definition: "Email-authentication DNS standards that help receiving servers verify that mail from a domain is legitimate.", audityxe: "Checked with live DNS lookups in the Email Authentication module." },
  { term: "DNSSEC / CAA", definition: "DNSSEC cryptographically signs DNS records; CAA records restrict which certificate authorities may issue certificates for a domain.", audityxe: "Both are checked in the DNS Security module." },
  { term: "SAST (Static Application Security Testing)", definition: "Security analysis of source code without running it.", audityxe: "Not provided. Audityxe never reads source code. See the comparison pages." },
  { term: "DAST (Dynamic Application Security Testing)", definition: "Security testing of a running application by sending it requests, often including attack payloads.", audityxe: "Not provided. Audityxe's checks are passive and read-only." },
  { term: "SARIF", definition: "Static Analysis Results Interchange Format, a standard JSON format for static-analysis results.", audityxe: "Not supported. Use --json for structured output." },
  { term: "OWASP Top 10", definition: "A widely referenced list of the most critical web application security risks, maintained by the OWASP Foundation.", audityxe: "Audityxe does not implement an OWASP Top 10 rule set or test for those vulnerabilities." },
  { term: "GEO / AEO (Generative / Answer Engine Optimization)", definition: "Structuring content and crawl access so AI search and answer engines can find, understand, and cite a site.", audityxe: "Checked by the AI Search & Agent Optimization module (AI-crawler access, llms.txt, FAQ/HowTo schema, direct-answer structure)." },
  { term: "llms.txt", definition: "A proposed plain-markdown file at a site's root that summarizes the site for large language models.", audityxe: "Its presence is checked by the AI Search & Agent Optimization module." },
  { term: "CrUX (Chrome UX Report)", definition: "Google's public dataset of real-user performance data collected from Chrome users.", audityxe: "Surfaced by the Real-User Experience module when data exists for the site." },
  { term: "Subresource Integrity (SRI)", definition: "An attribute that lets browsers verify that a fetched script or stylesheet has not been tampered with.", audityxe: "Checked for cross-origin scripts and stylesheets." },
];

// ---------------------------------------------------------------------------
// Troubleshooting — only behaviours verified in cli/src/index.ts and docs.
// ---------------------------------------------------------------------------

export const TROUBLESHOOTING: Faq[] = [
  {
    q: "Why does the Audityxe CLI exit with code 1?",
    a: "Exit code 1 means either the audit could not run, or the overall score was below the --min-score you set. When it is a score failure the CLI prints \"FAILED: overall score N is below --min-score M\" before exiting.",
  },
  {
    q: "Why does the Audityxe CLI exit with code 2?",
    a: "Exit code 2 means invalid arguments — for example --min-score was not a number between 0 and 100.",
  },
  {
    q: "npm says it cannot find the package \"audityxe\". What is the right name?",
    a: "The package is audityxe-cli. Install or run it with npx audityxe-cli <url> or npm install --global audityxe-cli. The command it installs is audityxe.",
  },
  {
    q: "The CLI fails on my Node.js version. What does it require?",
    a: "audityxe-cli requires Node.js 18.17.0 or newer. Check with node --version and upgrade if needed.",
  },
  {
    q: "\"Configuration file not found\" — where is audityxe.config.json?",
    a: "There is no configuration file. Audityxe is configured entirely with command-line flags (or GitHub Action inputs), so there is nothing to create.",
  },
  {
    q: "The CLI says --fail-on-warning, --severity, --verbose, or --output is unknown.",
    a: "Those flags do not exist. Use --min-score <0-100> to gate CI, --json for structured output, and --deep / --max / --ultra for crawl depth.",
  },
  {
    q: "A deep audit takes a long time or returns less than expected. What can I do?",
    a: "The default crawl samples the homepage only. --deep crawls up to 25 pages, --max up to 50, and --ultra up to 100 pages with higher concurrency and retries, so deeper modes take longer. If a comparison site is slow or unreachable, the comparison is omitted but the primary audit still completes.",
  },
  {
    q: "Why is there no Core Web Vitals or Lighthouse section in my CLI output?",
    a: "Real-browser Lighthouse and real-user Core Web Vitals appear only when you pass your own free Google PageSpeed Insights API key with --psi-key. Without it, the CLI reports only the checks it can make from the HTTP response and HTML.",
  },
  {
    q: "Why does the web app say a URL cannot be audited?",
    a: "Audityxe blocks private and internal addresses (such as localhost and private IP ranges) when auditing from the hosted app, to prevent server-side request forgery. Audit a publicly reachable URL, or run the CLI locally against your own machine.",
  },
  {
    q: "I hit a daily limit on the website. How do I audit more?",
    a: "Daily limits depend on your plan (Free, Standard, Pro). The CLI has no account and no rate limit, so it is the way to run unlimited audits.",
  },
];

// ---------------------------------------------------------------------------
// Registry used by sitemap, llms.txt, hub pages, related-links blocks.
// ---------------------------------------------------------------------------

export interface SeoPageEntry {
  path: string;
  title: string;
  summary: string;
  priority: number;
  changeFrequency: "daily" | "weekly" | "monthly" | "yearly";
}

export function allSeoPages(): SeoPageEntry[] {
  const pages: SeoPageEntry[] = [
    { path: "/what-is-audityxe", title: "What is Audityxe?", summary: "Plain-language definition, what Audityxe is and is not, and every way to use it.", priority: 0.9, changeFrequency: "monthly" },
    { path: "/docs", title: "Audityxe documentation", summary: "Getting started in the web app, the CLI, and the API — with links to every reference page.", priority: 0.9, changeFrequency: "monthly" },
    { path: "/cli", title: "Audityxe CLI (audityxe-cli)", summary: "Install and use the free, unlimited command-line auditor: npm, flags, exit codes, CI gate.", priority: 0.9, changeFrequency: "monthly" },
    { path: "/integrations", title: "Integrations: GitHub Actions, CI/CD, Docker, VS Code", summary: "Copy-paste CI snippets for GitHub Actions, GitLab, Jenkins, CircleCI, Bitbucket, Azure DevOps, Docker, and the VS Code extension.", priority: 0.8, changeFrequency: "monthly" },
    { path: "/capabilities", title: "Capabilities & limitations", summary: "A straight yes/no answer to every \"does Audityxe have…\" question.", priority: 0.8, changeFrequency: "monthly" },
    { path: "/compare", title: "Audityxe compared with other tools", summary: "Honest comparisons with Lighthouse, SonarQube, Snyk, ESLint, Semgrep, OWASP ZAP, and Code Climate.", priority: 0.8, changeFrequency: "monthly" },
    { path: "/checks", title: "What Audityxe checks", summary: "Every audit module explained: security headers, Core Web Vitals, SEO, accessibility, AI search readiness, DNS/TLS/email, legal pages.", priority: 0.8, changeFrequency: "monthly" },
    { path: "/glossary", title: "Glossary", summary: "Definitions of LCP, CLS, CSP, HSTS, SPF/DMARC, SAST, DAST, SARIF, GEO and how Audityxe relates to each.", priority: 0.6, changeFrequency: "monthly" },
    { path: "/troubleshooting", title: "Troubleshooting", summary: "Fixes for CLI exit codes, wrong package name, Node version, missing flags, and limits.", priority: 0.6, changeFrequency: "monthly" },
  ];
  for (const c of COMPARISON_PAGES) {
    pages.push({ path: `/compare/${c.slug}`, title: `Audityxe vs ${c.other}`, summary: c.directAnswer, priority: 0.7, changeFrequency: "monthly" });
  }
  for (const c of CHECK_PAGES) {
    pages.push({ path: `/checks/${c.slug}`, title: c.title, summary: c.directAnswer, priority: 0.7, changeFrequency: "monthly" });
  }
  return pages;
}

export const STATUS_LABEL: Record<CapabilityStatus, string> = {
  available: "Available",
  partial: "Partly available",
  planned: "Planned",
  "not-available": "Not available",
};
