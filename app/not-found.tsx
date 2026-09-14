import Link from "next/link";
import { SearchX, ArrowLeft } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import NotFoundGame from "@/components/NotFoundGame";

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-16 sm:py-24">
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 rounded-card glass flex items-center justify-center mx-auto mb-6">
            <SearchX size={28} className="text-text-secondary" />
          </div>
          <p className="font-mono text-xs text-text-secondary mb-2">ERROR 404</p>
          <h1 className="font-display font-bold text-2xl sm:text-3xl mb-3">
            This page didn't pass the audit.
          </h1>
          <p className="text-sm sm:text-base text-text-secondary mb-8">
            The page you're looking for doesn't exist or may have moved. Let's get you back to
            somewhere real.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-btn bg-secondary text-white font-semibold text-sm hover:brightness-110 transition"
          >
            <ArrowLeft size={16} />
            Back to Audityxe
          </Link>
          <NotFoundGame />
        </div>
      </div>
      <Footer />
    </main>
  );
}
