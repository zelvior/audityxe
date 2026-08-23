import type { Metadata } from "next";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const SITE_URL = "https://audityxe.vercel.app";
const SITE_NAME = "Audityxe";
const SITE_DESCRIPTION =
  "Run a deep AI audit on any website and generate viral social promo kits in seconds.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Audityxe — Instant AI Site Audit & Viral Promo Generator",
  description: SITE_DESCRIPTION,
  generator: "Next.js",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Audityxe — Instant AI Site Audit & Viral Promo Generator",
    description: SITE_DESCRIPTION,
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
  },
  twitter: {
    card: "summary_large_image",
    title: "Audityxe — Instant AI Site Audit & Viral Promo Generator",
    description: SITE_DESCRIPTION,
    site: "@audityxe",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      email: "zelvior@proton.me",
      description: SITE_DESCRIPTION,
    },
    {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITE_URL}/?url={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "SoftwareApplication",
      name: SITE_NAME,
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Web",
      description: SITE_DESCRIPTION,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
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
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="font-body antialiased min-h-screen">
        <AuthProvider>{children}</AuthProvider>
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
