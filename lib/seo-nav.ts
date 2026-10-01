/**
 * Lightweight link list for the footer's crawlable directory. Kept
 * separate from lib/seo-content.ts on purpose: the footer is a client
 * component on every page, and importing the full content module would
 * ship all of that copy in every page's JavaScript bundle.
 * scripts/verify-seo.ts asserts this list stays in sync with the content.
 */
export const SEO_DEEP_LINKS: { href: string; label: string }[] = [
  { href: "/checks/security-headers-checker", label: "Security Headers, CSP & HSTS Checker" },
  { href: "/checks/core-web-vitals-audit", label: "Core Web Vitals & Performance Audit" },
  { href: "/checks/seo-audit", label: "Technical SEO Audit" },
  { href: "/checks/accessibility-audit", label: "Website Accessibility Audit" },
  { href: "/checks/ai-search-readiness", label: "AI Search Readiness (GEO / AEO / llms.txt) Audit" },
  { href: "/checks/dns-tls-and-email-authentication", label: "DNS, TLS & Email Authentication Audit" },
  { href: "/checks/legal-and-trust-pages", label: "Legal & Trust Pages Check" },
  { href: "/compare/audityxe-vs-lighthouse", label: "Audityxe vs Lighthouse" },
  { href: "/compare/audityxe-vs-sonarqube", label: "Audityxe vs SonarQube" },
  { href: "/compare/audityxe-vs-snyk", label: "Audityxe vs Snyk" },
  { href: "/compare/audityxe-vs-eslint", label: "Audityxe vs ESLint" },
  { href: "/compare/audityxe-vs-semgrep", label: "Audityxe vs Semgrep" },
  { href: "/compare/audityxe-vs-owasp-zap", label: "Audityxe vs OWASP ZAP" },
  { href: "/compare/audityxe-vs-codeclimate", label: "Audityxe vs Code Climate" },
];
