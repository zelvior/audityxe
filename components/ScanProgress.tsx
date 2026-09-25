"use client";

import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { SCAN_STEPS } from "@/lib/constants";
import IsometricLoader from "@/components/IsometricLoader";
import LiveScanPreview from "@/components/LiveScanPreview";

export default function ScanProgress({
  activeStep,
  isLongRun = false,
  scanningUrl = "",
}: {
  activeStep: number;
  isLongRun?: boolean;
  scanningUrl?: string;
}) {
  return (
    <section className="px-4 sm:px-6 py-10 sm:py-16">
      <div className="max-w-3xl mx-auto space-y-4">
        {scanningUrl && <LiveScanPreview url={scanningUrl} />}

        <div className="glass rounded-card p-5 sm:p-8 relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/20 to-transparent pointer-events-none" />
        <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent animate-scan" />

        <div className="flex items-center justify-between gap-4 mb-6 relative">
          <h3 className="font-display font-semibold text-lg">Scanning your site...</h3>
          <IsometricLoader size={56} className="shrink-0 -my-2 hidden sm:block" />
        </div>

        <ul className="space-y-4 relative">
          {SCAN_STEPS.map((step, i) => {
            const done = i < activeStep;
            const active = i === activeStep;
            return (
              <motion.li
                key={step}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: done || active ? 1 : 0.35, x: 0 }}
                className="flex items-center gap-3 text-sm"
              >
                <span
                  className={`flex items-center justify-center w-6 h-6 rounded-full border shrink-0 ${
                    done
                      ? "bg-emerald/20 border-emerald text-emerald"
                      : active
                      ? "border-primary text-primary"
                      : "border-border text-text-secondary"
                  }`}
                >
                  {done ? (
                    <Check size={13} />
                  ) : active ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-text-secondary/50" />
                  )}
                </span>
                <span className={done ? "text-text-secondary line-through" : active ? "text-text-primary" : "text-text-secondary"}>
                  {step}
                </span>
              </motion.li>
            );
          })}
        </ul>

        {isLongRun && activeStep >= SCAN_STEPS.length - 1 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-xs text-text-secondary mt-4 pt-4 border-t border-border relative"
          >
            Still running — the real-browser (Lighthouse) pass you asked for can take up to a
            minute on its own. This isn't stuck, Google's servers are still working on it.
          </motion.p>
        )}
        </div>
      </div>
    </section>
  );
}
