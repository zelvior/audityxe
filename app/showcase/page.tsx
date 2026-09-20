"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, Loader2, ExternalLink } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { fetchJson } from "@/lib/fetch-json";

interface ShowcaseEntry {
  host: string;
  submittedAt: string;
  overall: number | null;
}

function scoreColor(score: number | null): string {
  if (score === null) return "text-text-secondary";
  if (score >= 8) return "text-emerald";
  if (score >= 5) return "text-yellow";
  return "text-rose";
}

export default function ShowcasePage() {
  const [entries, setEntries] = useState<ShowcaseEntry[] | null>(null);
  const [loadError, setLoadError] = useState("");

  const [domain, setDomain] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const load = useCallback(async () => {
    const { ok, data, error } = await fetchJson<{ entries: ShowcaseEntry[] }>("/api/showcase");
    if (ok && data) setEntries(data.entries);
    else setLoadError(error || "Couldn't load the showcase.");
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = useCallback(async () => {
    if (!domain.trim() || submitting) return;
    setSubmitting(true);
    setSubmitError("");
    setSubmitSuccess(false);
    try {
      const { ok, error } = await fetchJson("/api/showcase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host: domain }),
      });
      if (!ok) throw new Error(error || "Couldn't verify that domain.");
      setSubmitSuccess(true);
      setDomain("");
      load();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }, [domain, submitting, load]);

  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary mb-6">
            <ArrowLeft size={16} /> Back home
          </Link>

          <div className="flex items-center gap-3 mb-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-card bg-primary/10 border border-primary/20 shrink-0">
              <Sparkles size={18} className="text-primary" />
            </span>
            <h1 className="font-display font-bold text-2xl sm:text-3xl md:text-4xl tracking-tight">
              <span className="hand-underline">Showcase</span>
            </h1>
          </div>
          <p className="text-sm sm:text-base text-text-secondary mb-8">
            Real sites using the Audityxe badge. Submission is ownership-verified — we check that
            your site actually embeds a real Audityxe badge link before listing it, so nobody can
            add a domain they don't control.
          </p>

          <div className="glass rounded-card p-5 sm:p-6 mb-10">
            <span className="text-sm font-semibold mb-1 block">Add your site</span>
            <p className="text-xs text-text-secondary mb-4">
              Embed the badge from <Link href="/badge" className="text-primary hover:underline">/badge</Link>{" "}
              first, then submit your domain here — we'll verify the link is live before adding you.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="yoursite.com"
                className="flex-1 min-w-0 rounded-card bg-[rgb(var(--color-text-primary)/0.045)] border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
                disabled={submitting}
              />
              <button
                onClick={submit}
                disabled={submitting || !domain.trim()}
                className="px-4 py-2 rounded-card bg-primary text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : "Verify & add"}
              </button>
            </div>
            {submitError && <p className="text-xs text-rose mt-2">{submitError}</p>}
            {submitSuccess && <p className="text-xs text-emerald mt-2">Verified and added — thanks!</p>}
          </div>

          {!entries && !loadError && (
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <Loader2 size={14} className="animate-spin" /> Loading…
            </div>
          )}
          {loadError && <p className="text-sm text-rose">{loadError}</p>}
          {entries && entries.length === 0 && (
            <p className="text-sm text-text-secondary">No sites yet — be the first to add yours above.</p>
          )}

          {entries && entries.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-3">
              {entries.map((e) => (
                <a
                  key={e.host}
                  href={`https://${e.host}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass rounded-card p-4 flex items-center justify-between gap-3 hover:border-[rgb(var(--color-text-primary)/0.2)] transition"
                >
                  <span className="font-mono text-sm truncate">{e.host}</span>
                  <span className="flex items-center gap-2 shrink-0">
                    {e.overall !== null && (
                      <span className={`text-xs font-semibold ${scoreColor(e.overall)}`}>{e.overall}/10</span>
                    )}
                    <ExternalLink size={13} className="text-text-secondary" />
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </main>
  );
}
