"use client";

import { useState } from "react";
import { Copy, Download, Share2, Mail, Check } from "lucide-react";
import { AuditResult } from "@/lib/types";

function buildSummaryText(result: AuditResult): string {
  const lines = [
    `Audit report for ${result.url} — ${result.overall.toFixed(1)}/10`,
    "",
    ...result.categories.map((c) => `${c.label}: ${c.score.toFixed(1)}/10`),
    "",
    result.verdict,
  ];
  return lines.join("\n");
}

export default function AuditActionBar({ result }: { result: AuditResult }) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [copyError, setCopyError] = useState(false);

  async function copyToClipboard(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // fall through to the legacy fallback below
    }
    // Fallback for browsers/contexts where the async Clipboard API is
    // unavailable (older Safari, non-HTTPS, some in-app webviews).
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(textarea);
      return ok;
    } catch {
      return false;
    }
  }

  async function handleCopy() {
    const ok = await copyToClipboard(buildSummaryText(result));
    if (ok) {
      setCopied(true);
      setCopyError(false);
      setTimeout(() => setCopied(false), 1800);
    } else {
      setCopyError(true);
      setTimeout(() => setCopyError(false), 1800);
    }
  }

  function handleExport() {
    const exportable = {
      url: result.url,
      overall: result.overall,
      verdict: result.verdict,
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
    link.download = `audit-${result.url}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function handleShare() {
    const text = buildSummaryText(result);
    if (navigator.share) {
      try {
        await navigator.share({ title: `Audit report for ${result.url}`, text });
        setShared(true);
        setTimeout(() => setShared(false), 1800);
        return;
      } catch {
        // User cancelled the native share sheet, or it's unsupported here — fall back to copy.
      }
    }
    const ok = await copyToClipboard(text);
    if (ok) {
      setShared(true);
      setTimeout(() => setShared(false), 1800);
    }
  }

  function handleEmail() {
    const subject = `Audit report: ${result.url} (${result.overall.toFixed(1)}/10)`;
    const body = buildSummaryText(result);
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  const buttonClass =
    "flex items-center justify-center w-9 h-9 rounded-full glass text-text-secondary hover:text-primary hover:border-white/20 transition";

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleCopy}
        className={buttonClass}
        aria-label={copyError ? "Copy failed" : "Copy summary"}
        title={copyError ? "Copy failed — try again" : "Copy summary"}
      >
        {copied ? <Check size={15} className="text-emerald" /> : <Copy size={15} className={copyError ? "text-rose" : ""} />}
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
