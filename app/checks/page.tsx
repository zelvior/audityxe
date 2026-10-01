import type { Metadata } from "next";
import { canonicalMeta } from "@/lib/seo";
import { CHECK_PAGES } from "@/lib/seo-content";
import SeoPage, { RelatedLinks, techArticleJsonLd } from "@/components/seo/SeoPage";

const DESCRIPTION =
  "Every Audityxe audit module explained: security headers and CSP, Core Web Vitals, SEO, accessibility, AI search readiness, DNS/TLS/email auth, legal pages.";

export const metadata: Metadata = {
  ...canonicalMeta("checks"),
  title: "What Audityxe Checks: Security, Web Vitals, SEO & AI",
  description: DESCRIPTION,
};

export default function ChecksIndexPage() {
  return (
    <SeoPage
      crumbs={[{ name: "Checks", path: "/checks" }]}
      eyebrow="Audit modules"
      title="What Audityxe checks"
      directQuestion="What does an Audityxe audit cover?"
      directAnswer="An Audityxe audit scores a live URL in six categories and reports findings from more than thirty modules covering security headers and TLS, Core Web Vitals and performance, technical SEO, accessibility, AI search readiness, DNS and email authentication, and legal and trust pages."
      jsonLd={[techArticleJsonLd({ path: "/checks", headline: "What Audityxe checks", description: DESCRIPTION })]}
    >
      <RelatedLinks heading="Check pages" links={CHECK_PAGES.map((c) => ({ href: `/checks/${c.slug}`, label: c.title, description: c.directAnswer }))} />
    </SeoPage>
  );
}
