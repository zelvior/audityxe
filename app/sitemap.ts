import type { MetadataRoute } from "next";

const BASE_URL = "https://audityxe.vercel.app";

interface RouteEntry {
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
}

// Every real, publicly indexable route in the app. Auth-gated pages
// (/account, /settings, /bulk) are intentionally excluded — audits
// themselves are never stored server-side or given a public URL at
// all, by design (see the Privacy section of the README).
const ROUTES: RouteEntry[] = [
  { path: "", priority: 1.0, changeFrequency: "daily" },
  { path: "/pricing", priority: 0.9, changeFrequency: "weekly" },
  { path: "/sample-report", priority: 0.9, changeFrequency: "hourly" },
  { path: "/methodology", priority: 0.8, changeFrequency: "monthly" },
  { path: "/guide", priority: 0.8, changeFrequency: "monthly" },
  { path: "/faq", priority: 0.8, changeFrequency: "monthly" },
  { path: "/about", priority: 0.7, changeFrequency: "monthly" },
  { path: "/bulk", priority: 0.6, changeFrequency: "monthly" },
  { path: "/login", priority: 0.5, changeFrequency: "yearly" },
  { path: "/register", priority: 0.5, changeFrequency: "yearly" },
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
  { path: "/badge", priority: 0.4, changeFrequency: "monthly" },
  { path: "/workflow", priority: 0.5, changeFrequency: "monthly" },
  { path: "/crash-reports", priority: 0.3, changeFrequency: "weekly" },
  { path: "/license", priority: 0.3, changeFrequency: "yearly" },
  { path: "/refund-policy", priority: 0.3, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return ROUTES.map((route) => ({
    url: `${BASE_URL}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
