import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import ModerationGuard from "@/components/ModerationGuard";
import AnnouncementBanner from "@/components/AnnouncementBanner";

const SITE_URL = "https://audityxe.vercel.app";
const SITE_NAME = "Audityxe";
const SITE_TITLE = "Audityxe: Free Website Audit & Promo Kit";
const SITE_DESCRIPTION =
  "Free website audit tool: instant SEO, performance, accessibility, security & UX scores with evidence-based fixes and a viral promo kit, the same strict benchmark for every site.";
const SITE_KEYWORDS = [
  "Audityxe",
  "website audit tool",
  "website auditor",
  "free website audit",
  "website audit online",
  "website analysis tool",
  "website checker",
  "website quality checker",
  "website health checker",
  "website performance checker",
  "free seo audit",
  "technical seo audit tool",
  "website seo checker",
  "seo website analyzer",
  "website performance audit",
  "website speed checker",
  "website accessibility checker",
  "accessibility audit tool",
  "website accessibility audit tool",
  "website security checker",
  "website security audit",
  "security headers checker",
  "website ux audit",
  "website usability checker",
  "website ux checker",
  "website conversion audit",
  "website cro audit",
  "landing page audit",
  "how to audit a website",
  "how to check website quality",
  "how to audit a website for seo",
  "website audit checklist",
  "website quality checklist",
  "website launch checklist",
  "production ready website checklist",
  "website technical audit checklist",
  "website audit report example",
  "free website audit report",
  "website quality score",
  "website quality benchmark",
  "website benchmark tool",
  "website quality audit",
  "production ready quality audit",
  "website quality standards",
  "website audit score",
  "website audit benchmark",
  "website compliance checklist",
  "Audityxe Standard",
  "Audityxe Verified",
  "Audityxe Score",
];

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  generator: "Next.js",
  alternates: { canonical: "/" },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: "@audityxe",
  },
  manifest: "/manifest.webmanifest",
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || "hUqXugrHc_xzhUYio3bjW6G1dcc87Iyi8IL4fpCIiN0",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/logo-mark-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: "/logo-mark-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#050609",
  viewportFit: "cover",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      legalName: SITE_NAME,
      url: SITE_URL,
      email: "zelvior@proton.me",
      description: SITE_DESCRIPTION,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/logo-mark-192.png`,
      },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      alternateName: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      publisher: { "@id": `${SITE_URL}/#organization` },
      isPartOf: { "@id": `${SITE_URL}/#website` },
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITE_URL}/?url={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#software`,
      name: SITE_NAME,
      publisher: { "@id": `${SITE_URL}/#organization` },
      applicationCategory: "DeveloperApplication",
      applicationSubCategory: "Website Audit Tool",
      operatingSystem: "Web",
      description: SITE_DESCRIPTION,
      keywords: SITE_KEYWORDS.join(", "),
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      featureList: [
        "Free website audit tool and website analysis tool",
        "Technical SEO audit and SEO website analyzer",
        "Website performance audit and speed checker",
        "Website accessibility audit tool",
        "Website security audit and security headers checker",
        "Website UX and conversion (CRO) audit",
        "Evidence-based fixes with real code snippets",
        "Shareable Audityxe Verified badge with live re-audit",
      ],
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          // JSON.stringify never emits unescaped "<", so this can't be
          // used to break out of the script tag even if a future field
          // contains user-influenced text; the replace is defense-in-depth.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
      </head>
      <body className="font-body antialiased min-h-screen">
        <AuthProvider>
          <ModerationGuard />
          <AnnouncementBanner />
          {children}
        </AuthProvider>
        <Analytics />
        {/* Zelvior Runtime — lightweight client-side performance instrumentation. */}
        <Script src="https://cdn.jsdelivr.net/npm/zelvior-runtime/dist/zelvior.min.js" strategy="afterInteractive" />
        <Script id="zelvior-enable" strategy="afterInteractive">
          {`if (typeof Zelvior !== 'undefined') { Zelvior.enable(); }`}
        </Script>
      </body>
    </html>
  );
}
