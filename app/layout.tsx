import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://audityxe.app"),
  title: "Audityxe — Instant AI Site Audit & Viral Promo Generator",
  description:
    "Run a deep AI audit on any website and generate viral social promo kits in seconds.",
  openGraph: {
    title: "Audityxe — Instant AI Site Audit & Viral Promo Generator",
    description:
      "Run a deep AI audit on any website and generate viral social promo kits in seconds.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-body antialiased min-h-screen">{children}</body>
    </html>
  );
}
