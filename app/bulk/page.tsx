"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Layers, Lock, AlertTriangle } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";

interface BulkResultItem {
  url: string;
  ok: boolean;
  overall?: number;
  categories?: { key: string; label: string; score: number }[];
  error?: string;
}

function scoreColor(score: number) {
  if (score >= 8) return "text-emerald";
  if (score >= 5) return "text-amber";
  return "text-rose";
}

export default function BulkAuditPage() {
  const { user, loading, getToken } = useAuth();
  const router = useRouter();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<BulkResultItem[] | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login?redirect=/bulk");
  }, [loading, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const urls = input
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (urls.length === 0) return;
    setBusy(true);
    setError("");
    setResults(null);

    try {
      const token = await getToken();
      const res = await fetch("/api/audit/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ urls }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Bulk audit failed.");
        return;
      }
      setResults(data.results);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (loading || !user) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 size={22} className="animate-spin text-text-secondary" />
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-text-secondary hover:text-primary transition mb-6"
          >
            <ArrowLeft size={14} /> Back to Audityxe
          </Link>

          <div className="flex items-center gap-2 mb-2">
            <Layers size={20} className="text-primary" />
            <h1 className="font-display font-bold text-2xl sm:text-3xl tracking-tight">Bulk Audit</h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-accent/15 text-accent">PRO</span>
          </div>
          <p className="text-sm text-text-secondary mb-6">
            Audit up to 20 URLs in one request — ideal for a client's full site map or a portfolio
            of properties. Each URL counts as one audit against your daily quota.
          </p>

          <form onSubmit={handleSubmit} className="glass rounded-2xl p-5 sm:p-6 mb-6">
            <label className="block text-xs font-mono text-text-secondary mb-2">
              One URL per line (max 20)
            </label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={8}
              placeholder={"example.com\nexample.com/pricing\nexample.com/about"}
              className="w-full bg-surface2 border border-border rounded-xl px-3.5 py-2.5 text-sm font-mono outline-none focus-visible:border-primary resize-none mb-4"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-primary to-accent font-semibold text-sm hover:brightness-110 transition disabled:opacity-40"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Layers size={16} />}
              {busy ? "Auditing all URLs…" : "Run bulk audit"}
            </button>
          </form>

          {error && (
            <div className="glass rounded-2xl p-5 border border-rose/30 flex items-start gap-3 mb-6">
              {error.includes("Pro-plan") ? (
                <Lock size={18} className="text-amber mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle size={18} className="text-rose mt-0.5 shrink-0" />
              )}
              <div>
                <p className="text-sm text-text-secondary">{error}</p>
                {error.includes("Pro-plan") && (
                  <Link href="/pricing" className="inline-block mt-2 text-xs font-mono text-primary hover:underline">
                    View plans →
                  </Link>
                )}
              </div>
            </div>
          )}

          {results && (
            <div className="glass rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs font-mono text-text-secondary">
                    <th className="text-left px-4 py-3">URL</th>
                    <th className="text-right px-4 py-3">Overall</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i} className="border-b border-border/50 last:border-0">
                      <td className="px-4 py-3 truncate max-w-xs">{r.url}</td>
                      <td className="px-4 py-3 text-right">
                        {r.ok ? (
                          <span className={`font-display font-bold ${scoreColor(r.overall || 0)}`}>
                            {r.overall?.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-rose text-xs">{r.error}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </main>
  );
}
