"use client";

import { useState } from "react";
import { Check, Copy, ShieldCheck } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const SITE_URL = "https://audityxe.vercel.app";

function normalizeDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
}

export default function BadgePage() {
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);

  const domain = normalizeDomain(input) || "yoursite.com";
  const badgeSrc = `${SITE_URL}/api/badge/${encodeURIComponent(domain)}`;
  const linkHref = `${SITE_URL}/audit-verification`;

  const snippet = `<a href="${linkHref}" target="_blank" rel="noopener noreferrer">
  <img src="${badgeSrc}" alt="Audited by Audityxe — ${domain}" width="320" height="84" />
</a>`;

  async function copySnippet() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard unavailable — user can still select the code block manually
    }
  }

  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-14 sm:py-20">
        <p className="font-mono text-xs text-text-secondary mb-2">BADGE</p>
        <h1 className="font-display font-bold text-2xl sm:text-3xl mb-3">
          Get your "Audited by Audityxe" badge
        </h1>
        <p className="text-sm text-text-secondary mb-8">
          Drop this in your README or footer to show visitors your site has been audited. The
          badge links to our live verification page — anyone can click through and re-run the
          audit themselves, so it's never just a static claim.
        </p>

        <label className="block text-xs font-mono text-text-secondary mb-2">Your domain</label>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="yoursite.com"
          className="w-full bg-surface2 border border-border rounded-input px-3.5 py-2.5 text-sm outline-none focus-visible:border-primary mb-6"
        />

        <div className="glass rounded-card p-6 flex items-center justify-center mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={badgeSrc} alt={`Audited by Audityxe — ${domain}`} width={320} height={84} />
        </div>

        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-mono text-text-secondary">Embed code</p>
          <button
            onClick={copySnippet}
            className="inline-flex items-center gap-1.5 text-xs font-mono text-primary hover:underline"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <pre className="glass rounded-card p-4 text-xs overflow-x-auto font-mono text-text-secondary whitespace-pre-wrap break-all">
          {snippet}
        </pre>

        <div className="glass rounded-card p-4 mt-6 flex items-start gap-3">
          <ShieldCheck size={16} className="text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-text-secondary">
            The badge image itself is static and free to embed for any domain — it's a promotional
            mark, not a database-backed certificate. Real verification happens when someone clicks
            through and Audityxe re-runs a live audit on your site, per our{" "}
            <a href="/audit-verification" className="text-primary hover:underline">
              verification methodology
            </a>
            .
          </p>
        </div>
      </div>
      <Footer />
    </main>
  );
}
