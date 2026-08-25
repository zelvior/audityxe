"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ScoreCard from "@/components/ScoreCard";
import AuditModules from "@/components/AuditModules";
import DiffFixes from "@/components/DiffFixes";
import PromoKit from "@/components/PromoKit";
import { AuditResult } from "@/lib/types";

export default function SampleReportView({ result }: { result: AuditResult }) {
  return (
    <div>
      <ScoreCard result={result} />
      <AuditModules modules={result.modules} />
      <DiffFixes result={result} />
      <PromoKit result={result} />

      <div className="px-4 sm:px-6 py-10 sm:py-14">
        <div className="max-w-2xl mx-auto text-center glass rounded-2xl p-8 sm:p-10">
          <h2 className="font-display font-bold text-xl sm:text-2xl mb-3">
            Want this for your own site?
          </h2>
          <p className="text-sm sm:text-base text-text-secondary mb-6">
            Create a free account and run your first audit in under a minute — 3 free per day, no
            card required.
          </p>
          <Link
            href="/register?redirect=/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-accent font-semibold text-sm hover:brightness-110 transition"
          >
            Audit my site free
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
