import type { Metadata } from "next";
import { getMaintenanceMessage } from "@/lib/ops";
import { Wrench } from "lucide-react";
import { noindexMeta } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { ...noindexMeta("maintenance"), title: "Maintenance — Audityxe" };

export default function MaintenancePage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 sm:px-6 bg-bg">
      <div className="max-w-md mx-auto text-center">
        <div className="w-16 h-16 rounded-card glass flex items-center justify-center mx-auto mb-6">
          <Wrench size={28} className="text-text-secondary" />
        </div>
        <p className="font-mono text-xs text-text-secondary mb-2">MAINTENANCE</p>
        <h1 className="font-display font-bold text-2xl sm:text-3xl mb-3">
          Be right back.
        </h1>
        <p className="text-sm sm:text-base text-text-secondary">{getMaintenanceMessage()}</p>
      </div>
    </main>
  );
}
