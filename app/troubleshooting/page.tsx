import type { Metadata } from "next";
import { canonicalMeta } from "@/lib/seo";
import { TROUBLESHOOTING } from "@/lib/seo-content";
import SeoPage, { FaqSection, RelatedLinks, faqJsonLd, techArticleJsonLd } from "@/components/seo/SeoPage";

const DESCRIPTION =
  "Fix Audityxe problems: CLI exit code 1 or 2, the right npm package (audityxe-cli), Node.js version, missing flags or config file, and plan limits.";

export const metadata: Metadata = {
  ...canonicalMeta("troubleshooting"),
  title: "Audityxe Troubleshooting: CLI Exit Codes, Install Errors & Limits",
  description: DESCRIPTION,
};

export default function TroubleshootingPage() {
  return (
    <SeoPage
      crumbs={[{ name: "Troubleshooting", path: "/troubleshooting" }]}
      eyebrow="Help"
      title="Audityxe troubleshooting"
      directQuestion="Why is my Audityxe command failing?"
      directAnswer="Check three things first: the npm package is audityxe-cli (not audityxe), Node.js must be 18.17 or newer, and exit code 1 means a failed audit or a score below --min-score while exit code 2 means invalid arguments."
      jsonLd={[techArticleJsonLd({ path: "/troubleshooting", headline: "Audityxe troubleshooting", description: DESCRIPTION }), faqJsonLd(TROUBLESHOOTING)]}
    >
      <FaqSection faqs={TROUBLESHOOTING} heading="Common problems" />
      <RelatedLinks
        links={[
          { href: "/cli", label: "CLI guide" },
          { href: "/capabilities", label: "Capabilities & limitations" },
          { href: "/contact", label: "Contact support" },
        ]}
      />
    </SeoPage>
  );
}
