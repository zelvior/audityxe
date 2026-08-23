"use client";

import { useState } from "react";
import { Copy, Download, Share2, Mail, Check } from "lucide-react";
import { AuditResult } from "@/lib/types";

function buildSummaryText(result: AuditResult): string {
  const lines = [
    `Audityxe report for ${result.url} — ${result.overall.toFixed(1)}/10`,
    "",
    ...result.categories.map((c) => `${c.label}: ${c.score.toFixed(1)}/10`),
    "",
    result.verdict.constructive,
  ];
  return lines.join("\n");
}

function reportUrl(result: AuditResult): string {
  if (result._reportId) return `${window.location.origin}/report/${result._reportId}`;
  return window.location.href;
}

export default function AuditActionBar({ result }: { result: AuditResult }) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  function handleCopy() {
    navigator.clipboard?.writeText(reportUrl(result)).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function handleExport() {
    const exportable = {
      url: result.url,
      overall: result.overall,
      categories: result.categories,
      modules: result.modules.map((m) => ({
        id: m.id,
        label: m.label,
        status: m.status,
        score: m.score,
        findings: m.findings,
      })),
      fixes: result.fixes,
      generatedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportable, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audityxe-${result.url}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleShare() {
    const url = reportUrl(result);
    const shareData = {
      title: `Audityxe report for ${result.url}`,
      text: `${result.url} scored ${result.overall.toFixed(1)}/10 on Audityxe.`,
      url,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        setShared(true);
        setTimeout(() => setShared(false), 1800);
        return;
      } catch {
        // User cancelled or share failed — fall through to clipboard copy.
      }
    }
    navigator.clipboard?.writeText(url).catch(() => {});
    setShared(true);
    setTimeout(() => setShared(false), 1800);
  }

  function handleEmail() {
    const subject = `Audityxe report: ${result.url} (${result.overall.toFixed(1)}/10)`;
    const body = `${buildSummaryText(result)}\n\nFull report: ${reportUrl(result)}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  const buttonClass =
    "flex items-center justify-center w-9 h-9 rounded-full glass text-text-secondary hover:text-primary hover:border-white/20 transition";

  return (
    <div className="flex items-center gap-2">
      <button onClick={handleCopy} className={buttonClass} aria-label="Copy report link" title="Copy report link">
        {copied ? <Check size={15} className="text-emerald" /> : <Copy size={15} />}
      </button>
      <button onClick={handleExport} className={buttonClass} aria-label="Export as JSON" title="Export as JSON">
        <Download size={15} />
      </button>
      <button onClick={handleShare} className={buttonClass} aria-label="Share report" title="Share">
        {shared ? <Check size={15} className="text-emerald" /> : <Share2 size={15} />}
      </button>
      <button onClick={handleEmail} className={buttonClass} aria-label="Email report" title="Email">
        <Mail size={15} />
      </button>
    </div>
  );
}
