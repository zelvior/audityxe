import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SampleReportView from "@/components/SampleReportView";
import { getReport } from "@/lib/reports";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const report = await getReport(params.id).catch(() => null);
  if (!report) return { title: "Report not found — Audityxe" };
  return {
    title: `${report.url} audit report (${report.overall.toFixed(1)}/10) — Audityxe`,
    description: `A live Audityxe audit of ${report.url}, scored ${report.overall.toFixed(1)}/10.`,
  };
}

export default async function PublicReportPage({ params }: PageProps) {
  const report = await getReport(params.id).catch(() => null);

  if (!report) {
    notFound();
  }
  const safeReport = report;

  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 px-4 sm:px-6 py-8 sm:py-10">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-text-secondary hover:text-primary transition mb-6"
          >
            <ArrowLeft size={14} /> Back to Audityxe
          </Link>

          <div className="glass rounded-2xl p-5 sm:p-6 mb-6">
            <p className="text-xs font-mono text-primary mb-2">SHARED AUDIT REPORT</p>
            <h1 className="font-display font-bold text-2xl sm:text-3xl tracking-tight mb-2">
              {safeReport.url} — {safeReport.overall.toFixed(1)}/10
            </h1>
            <p className="text-sm text-text-secondary">
              Generated {new Date(safeReport.createdAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
              . This is a real audit result, saved at the time it ran.
            </p>
          </div>

          <SampleReportView result={safeReport.result} />
        </div>
      </div>
      <Footer />
    </main>
  );
}
