import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { breadcrumbJsonLd } from "@/lib/breadcrumb";

export default function LegalLayout({
  title,
  updated,
  path,
  children,
}: {
  title: string;
  updated: string;
  /** Route slug (no leading slash) — enables BreadcrumbList JSON-LD. */
  path?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex flex-col">
      {path && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(breadcrumbJsonLd(title, path)).replace(/</g, "\\u003c"),
          }}
        />
      )}
      <Header />
      <div className="flex-1 px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-text-secondary hover:text-primary transition mb-6 sm:mb-8"
          >
            <ArrowLeft size={14} /> Back to Audityxe
          </Link>

          <div className="flex items-center gap-3 mb-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-card bg-primary/10 border border-primary/20 shrink-0">
              <FileText size={18} className="text-primary" />
            </span>
            <h1 className="font-display font-bold text-2xl sm:text-3xl md:text-4xl tracking-tight hand-underline">
              {title}
            </h1>
          </div>
          <span className="inline-block text-[11px] font-mono text-text-secondary bg-surface2 border border-border/70 rounded-full px-2.5 py-1 mb-8 sm:mb-10">
            Last updated: {updated}
          </span>

          <div className="prose-legal space-y-6 sm:space-y-8 text-sm sm:text-base text-text-secondary leading-relaxed">
            {children}
          </div>

          <div className="mt-12 pt-6 border-t border-border/60 flex items-start gap-3 text-xs sm:text-sm text-text-secondary">
            <p>
              Questions about this page? Reach out via the{" "}
              <Link href="/contact" className="text-primary hover:underline underline-offset-2">
                Contact page
              </Link>
              , or see our other legal documents in the{" "}
              <Link href="/trust-center" className="text-primary hover:underline underline-offset-2">
                Trust Center
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
