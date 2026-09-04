import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-text-secondary hover:text-primary transition mb-6 sm:mb-8"
          >
            <ArrowLeft size={14} /> Back to Audityxe
          </Link>

          <h1 className="font-display font-bold text-2xl sm:text-3xl md:text-4xl tracking-tight mb-2">
            {title}
          </h1>
          <p className="text-xs sm:text-sm font-mono text-text-secondary mb-8 sm:mb-10">
            Last updated: {updated}
          </p>

          <div className="prose-legal space-y-6 sm:space-y-8 text-sm sm:text-base text-text-secondary leading-relaxed">
            {children}
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
