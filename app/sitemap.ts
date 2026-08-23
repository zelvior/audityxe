import type { MetadataRoute } from "next";

const BASE_URL = "https://audityxe.vercel.app";

interface RouteEntry {
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
}

// Every real, publicly indexable route in the app. Auth-gated pages
// (/account, /bulk) and individually-generated public report pages
// (/report/[id] — one per completed audit, not enumerable in advance)
// are intentionally excluded; login/register are included since they're
// public and legitimately land-able from search.
const ROUTES: RouteEntry[] = [
  { path: "", priority: 1.0, changeFrequency: "daily" },
  { path: "/pricing", priority: 0.9, changeFrequency: "weekly" },
  { path: "/sample-report", priority: 0.9, changeFrequency: "hourly" },
  { path: "/methodology", priority: 0.8, changeFrequency: "monthly" },
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
