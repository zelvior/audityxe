import type { Metadata } from "next";
import { canonicalMeta } from "@/lib/seo";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  ...canonicalMeta("crash-reports"),
  title: "Crash Reports — Audityxe",
  description: "Recent incidents and their resolution status.",
};

const INCIDENTS: { title: string; date: string; status: "resolved" | "monitoring"; detail: string }[] = [
  {
    title: "/api/audit returning 500 (ERR_REQUIRE_ESM)",
    date: "2026-09-03",
    status: "resolved",
    detail:
      "A transitive dependency (jwks-rsa) required an ESM-only build of jose at runtime. Pinned jose to a CJS-compatible version via a package override.",
  },
  {
    title: "/api/account returning 500",
    date: "2026-09-01",
    status: "resolved",
    detail: "Missing Firebase Admin service-account environment variables in production.",
  },
];

export default function CrashReportsPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-14 sm:py-20">
        <p className="font-mono text-xs text-text-secondary mb-2">STATUS</p>
        <h1 className="font-display font-bold text-2xl sm:text-3xl mb-10">Crash reports</h1>
        <div className="flex flex-col gap-4">
          {INCIDENTS.map((inc, i) => (
            <div key={i} className="glass rounded-card p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3 mb-2">
                <h2 className="font-display font-semibold text-sm">{inc.title}</h2>
                <span
                  className={
                    "text-[10px] font-mono uppercase px-2 py-1 rounded-btn " +
                    (inc.status === "resolved"
                      ? "text-emerald border border-emerald/40"
                      : "text-amber border border-amber/40")
                  }
                >
                  {inc.status}
                </span>
              </div>
              <p className="text-xs text-text-secondary mb-2">{inc.date}</p>
              <p className="text-sm text-text-secondary">{inc.detail}</p>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </main>
  );
}
