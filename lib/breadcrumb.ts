import { SITE_URL } from "@/lib/seo";

/** BreadcrumbList JSON-LD for a nested (non-homepage) route. */
export function breadcrumbJsonLd(label: string, path: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: label, item: `${SITE_URL}/${path.replace(/^\/+/, "")}` },
    ],
  };
}
