"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { AuditModule } from "@/lib/types";

function statusColor(status: AuditModule["status"]) {
  if (status === "good") return { text: "text-emerald", bar: "bg-emerald", chip: "bg-emerald/15 text-emerald" };
  if (status === "warning") return { text: "text-amber", bar: "bg-amber", chip: "bg-amber/15 text-amber" };
  return { text: "text-rose", bar: "bg-rose", chip: "bg-rose/15 text-rose" };
}

function FindingIcon({ status }: { status: "pass" | "warn" | "fail" }) {
  if (status === "pass") return <CheckCircle2 size={14} className="text-emerald shrink-0 mt-0.5" />;
  if (status === "warn") return <AlertTriangle size={14} className="text-amber shrink-0 mt-0.5" />;
  return <XCircle size={14} className="text-rose shrink-0 mt-0.5" />;
}

function ModuleCard({ module }: { module: AuditModule }) {
  const [open, setOpen] = useState(false);
  const c = statusColor(module.status);
  const passCount = module.findings.filter((f) => f.status === "pass").length;

  return (
    <div className="glass rounded-card overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 p-4 sm:p-5 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-display font-semibold text-sm sm:text-base">{module.label}</h3>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${c.chip}`}>
              {passCount}/{module.findings.length} passed
            </span>
          </div>
          <p className="text-xs sm:text-sm text-text-secondary truncate">{module.summary}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className={`font-display font-bold text-lg ${c.text}`}>{module.score.toFixed(1)}</span>
          <ChevronDown
            size={16}
            className={`text-text-secondary transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      <div className="px-4 sm:px-5 pb-1">
        <div className="h-1.5 rounded-full bg-surface2 overflow-hidden">
          <div className={`h-full rounded-full ${c.bar}`} style={{ width: `${module.score * 10}%` }} />
        </div>
      </div>

      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="px-4 sm:px-5 pb-4 sm:pb-5 pt-3 space-y-2.5"
        >
          {module.findings.map((f, i) => (
            <div key={i} className="flex items-start gap-2 text-xs sm:text-sm">
              <FindingIcon status={f.status} />
              <div className="min-w-0">
                <span className="font-medium">{f.label}:</span>{" "}
                <span className="text-text-secondary break-words">{f.detail}</span>
                {f.evidence && (
                  <p className="text-[11px] text-text-secondary/70 mt-0.5 break-words">
                    <span className="font-medium">Evidence:</span> {f.evidence}
                  </p>
                )}
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

export default function AuditModules({ modules }: { modules: AuditModule[] }) {
  const [filter, setFilter] = useState<"all" | "critical" | "warning">("all");

  const filtered = modules.filter((m) => {
    if (filter === "all") return true;
    if (filter === "critical") return m.status === "critical";
    if (filter === "warning") return m.status === "warning" || m.status === "critical";
    return true;
  });

  const criticalCount = modules.filter((m) => m.status === "critical").length;
  const warningCount = modules.filter((m) => m.status === "warning").length;

  return (
    <section className="px-4 sm:px-6 py-8 sm:py-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-1">
          <h2 className="font-display font-semibold text-xl sm:text-2xl">Full Deep Audit</h2>
        </div>
        <p className="text-text-secondary text-xs sm:text-sm mb-5">
          {modules.length} areas checked live against this URL — SEO, performance, security,
          accessibility, and more. Every finding below comes from a real fetch, not a guess.
        </p>

        <div className="flex items-center gap-2 mb-5">
          <button
            onClick={() => setFilter("all")}
            className={`text-xs font-mono px-3 py-1.5 rounded-full transition ${
              filter === "all" ? "bg-primary/20 text-primary" : "glass text-text-secondary"
            }`}
          >
            All {modules.length}
          </button>
          <button
            onClick={() => setFilter("warning")}
            className={`text-xs font-mono px-3 py-1.5 rounded-full transition ${
              filter === "warning" ? "bg-amber/20 text-amber" : "glass text-text-secondary"
            }`}
          >
            Needs attention {warningCount + criticalCount}
          </button>
          <button
            onClick={() => setFilter("critical")}
            className={`text-xs font-mono px-3 py-1.5 rounded-full transition ${
              filter === "critical" ? "bg-rose/20 text-rose" : "glass text-text-secondary"
            }`}
          >
            Critical {criticalCount}
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
          {filtered.map((m) => (
            <ModuleCard key={m.id} module={m} />
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-sm text-text-secondary text-center py-8">
            Nothing in this filter — nice work.
          </p>
        )}
      </div>
    </section>
  );
}
