import type { MetadataRoute } from "next";
import { allSeoPages, SEO_REVIEWED } from "@/lib/seo-content";

const BASE_URL = "https://audityxe.xyz";

interface RouteEntry {
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
}

// Every real, publicly indexable route in the app. A sitemap must list
// ONLY URLs that return 200, are indexable, and are not blocked by
// robots.txt — otherwise Search Console reports "Submitted URL marked
// 'noindex'" errors. So the auth-gated and auth-form pages (/account,
// /settings, /bulk, /login, /register) are intentionally excluded:
// they are noindex. scripts/verify-seo.ts fails if a noindex or
// robots-blocked route ever gets added here. (Audits themselves are
// never stored server-side or given a public URL at all, by design —
// see the Privacy section of the README.)
const ROUTES: RouteEntry[] = [
  { path: "", priority: 1.0, changeFrequency: "daily" },
  { path: "/pricing", priority: 0.9, changeFrequency: "weekly" },
  { path: "/sample-report", priority: 0.9, changeFrequency: "hourly" },
  { path: "/methodology", priority: 0.8, changeFrequency: "monthly" },
  { path: "/guide", priority: 0.8, changeFrequency: "monthly" },
  { path: "/onboarding/welcome", priority: 0.7, changeFrequency: "monthly" },
  { path: "/onboarding/features", priority: 0.6, changeFrequency: "monthly" },
  { path: "/onboarding/get-started", priority: 0.6, changeFrequency: "monthly" },
  { path: "/faq", priority: 0.8, changeFrequency: "monthly" },
  { path: "/about", priority: 0.7, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.5, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
  { path: "/cookies", priority: 0.3, changeFrequency: "yearly" },
  { path: "/disclaimer", priority: 0.3, changeFrequency: "yearly" },
  { path: "/changelog", priority: 0.6, changeFrequency: "weekly" },
  { path: "/trust-center", priority: 0.5, changeFrequency: "monthly" },
  { path: "/dpa", priority: 0.3, changeFrequency: "yearly" },
  { path: "/acceptable-use", priority: 0.3, changeFrequency: "yearly" },
  { path: "/third-party-services", priority: 0.3, changeFrequency: "yearly" },
  { path: "/audit-verification", priority: 0.4, changeFrequency: "monthly" },
  { path: "/api-docs", priority: 0.4, changeFrequency: "monthly" },
  { path: "/roadmap", priority: 0.4, changeFrequency: "weekly" },
  { path: "/showcase", priority: 0.4, changeFrequency: "weekly" },
  { path: "/badge", priority: 0.4, changeFrequency: "monthly" },
  { path: "/crash-reports", priority: 0.3, changeFrequency: "weekly" },
  { path: "/license", priority: 0.3, changeFrequency: "yearly" },
  { path: "/refund-policy", priority: 0.3, changeFrequency: "yearly" },
];

// YYYY-MM-DD is the simplest valid W3C date for <lastmod>; avoids the
// millisecond/timezone variants some parsers are stricter about.
const day = (d: Date) => d.toISOString().slice(0, 10);

export default function sitemap(): MetadataRoute.Sitemap {
  const now = day(new Date());
  const core = ROUTES.map((route) => ({
    url: `${BASE_URL}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
  // Docs / comparison / check / glossary pages carry a stable, honest
  // lastmod (the date their content was last reviewed against the code)
  // instead of "now" — search engines learn to ignore lastmod on sites
  // where every URL changes on every deploy.
  const reviewed = SEO_REVIEWED; // already YYYY-MM-DD
  const seo = allSeoPages().map((p) => ({
    url: `${BASE_URL}${p.path}`,
    lastModified: reviewed,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
  return [...core, ...seo];
}
