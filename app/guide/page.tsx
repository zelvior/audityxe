import type { Metadata } from "next";
import { canonicalMeta } from "@/lib/seo";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HomepageSeoContent from "@/components/HomepageSeoContent";
import { breadcrumbJsonLd } from "@/lib/breadcrumb";

export const metadata: Metadata = {
  ...canonicalMeta("guide"),
  title: "Website Audit Guide — Audityxe",
  description:
    "How to audit a website for SEO, performance, accessibility, security and UX, and how Audityxe's scoring works.",
};

export default function GuidePage() {
  return (
    <main>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd("Guide", "guide")).replace(/</g, "\\u003c"),
        }}
      />
      <Header />
      <HomepageSeoContent />
      <Footer />
    </main>
  );
}
