import type { Metadata } from "next";
import { canonicalMeta } from "@/lib/seo";
import Link from "next/link";
import { ArrowLeft, Terminal, KeyRound, Mail } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  ...canonicalMeta("api-docs"),
  title: "API Docs — Audityxe",
  description:
    "REST API reference for Audityxe's /api/audit endpoint, plus the CLI and GitHub Action for free, unlimited automated audits.",
};

export default function ApiDocsPage() {
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
              <Terminal size={18} className="text-primary" />
            </span>
            <h1 className="font-display font-bold text-2xl sm:text-3xl md:text-4xl tracking-tight">
              <span className="hand-underline">API Docs</span>
            </h1>
          </div>

          <div className="glass rounded-card p-4 sm:p-5 mb-8 text-sm">
            <p className="text-text-secondary">
              For automation, scripts, or CI — use{" "}
              <a
                href="https://github.com/zelvior/audityxe/tree/main/cli"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-semibold"
              >
                audityxe-cli
              </a>{" "}
              instead of this REST API. It's the same audit engine, running on your own machine —
              free, genuinely unlimited, no account and no rate limit. This REST API is what the
              website's own UI calls, documented here for transparency, and it's subject to the
              same per-plan daily limits as the site itself.
            </p>
          </div>

          <h2 className="font-display font-semibold text-lg sm:text-xl mb-2">POST /api/audit</h2>
          <p className="text-sm text-text-secondary mb-4">
            Runs a full audit and returns the complete scored result. Full machine-readable spec:{" "}
            <a href="/openapi.yaml" className="text-primary hover:underline">
              openapi.yaml
            </a>
            .
          </p>

          <h3 className="font-display font-semibold text-base mb-2 mt-6">Authentication</h3>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-text-secondary mb-4">
            <li>
              No <code>Authorization</code> or <code>x-api-key</code> header — treated as an
              anonymous visitor: 1 free audit per IP per calendar day (UTC).
            </li>
            <li>
              <code>Authorization: Bearer &lt;Firebase ID token&gt;</code> — uses that account's
              plan limit instead. This is a Firebase ID token obtained by signing in through the
              Firebase client SDK, not a static API key. Tokens expire in about an hour and need
              refreshing through Firebase, which is straightforward from a browser but extra work
              from a plain script.
            </li>
            <li>
              <code>x-api-key: atx_live_...</code> — a long-lived, revocable key for{" "}
              <strong>Pro-plan accounts</strong>, purpose-built for scripts/CI where refreshing a
              Firebase token every hour isn't practical. Uses that account's own daily limit, not a
              separate quota — and skips the cross-site Origin/bot checks below, since those exist
              for browser CSRF protection and don't apply to a keyed, non-browser caller. Keys
              aren't self-serve — see "Requesting an API key" below.
            </li>
            <li>
              A cross-site browser request (no <code>x-api-key</code> present) is rejected with{" "}
              <code>403</code> — CSRF protection for browser clients specifically, not a block on
              server-side/script callers, which typically don't send an <code>Origin</code> header
              at all.
            </li>
          </ul>

          <div className="glass rounded-card p-4 sm:p-5 mb-6 border border-primary/20">
            <h4 className="font-display font-semibold text-sm mb-1.5 flex items-center gap-2">
              <KeyRound size={15} className="text-primary" /> Requesting an API key
            </h4>
            <p className="text-sm text-text-secondary mb-3">
              API keys are issued manually from the admin panel — there's no self-serve signup —
              and only to accounts already on the <strong>Pro plan</strong>. If that's you, email a
              request and we'll get one issued.
            </p>
            <a
              href={`mailto:zelvior@proton.me?subject=${encodeURIComponent(
                "Audityxe API key request"
              )}&body=${encodeURIComponent(
                "Hi,\n\nI'd like to request an Audityxe API key for /api/audit.\n\nAccount email (must be on the Pro plan): \nIntended use: \n\nThanks!"
              )}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-card bg-primary text-white text-sm font-semibold hover:opacity-90"
            >
              <Mail size={15} /> Email zelvior@proton.me to request a key
            </a>
            <p className="text-xs text-text-secondary/70 mt-2">
              Opens your email client with the subject and a starter message already filled in —
              just add your account email and what you're building.
            </p>
          </div>

          <h3 className="font-display font-semibold text-base mb-2">Request body</h3>
          <div className="glass rounded-card p-4 mb-6 overflow-x-auto">
            <pre className="text-xs font-mono text-text-secondary whitespace-pre">
{`{
  "url": "https://example.com",        // required
  "competitorUrl": "https://...",      // Standard/Pro only, ignored otherwise
  "confirmPageSpeed": true,            // Pro only — opt-in real Lighthouse pass
  "crawlMode": "fast" | "deep"         // default "fast"
}`}
            </pre>
          </div>

          <h3 className="font-display font-semibold text-base mb-2">Example</h3>
          <div className="glass rounded-card p-4 mb-2 overflow-x-auto">
            <pre className="text-xs font-mono text-text-secondary whitespace-pre">
{`curl -X POST https://audityxe.vercel.app/api/audit \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://example.com"}'`}
            </pre>
          </div>
          <p className="text-xs text-text-secondary/70 mb-6">
            With a Pro API key instead of the anonymous 1/day limit, add{" "}
            <code>-H "x-api-key: atx_live_..."</code>.
          </p>

          <h3 className="font-display font-semibold text-base mb-2">Response</h3>
          <p className="text-sm text-text-secondary mb-2">
            The full <code>AuditResult</code> object (score, categories, every module and finding,
            fixes) plus:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-text-secondary mb-6">
            <li>
              <code>_usage</code> — your remaining quota after this request:{" "}
              <code>{`{ used, limit, remaining, plan }`}</code>
            </li>
            <li>
              <code>pageSpeedLockReason</code> — present when the Lighthouse pass wasn't run:{" "}
              <code>"not_confirmed"</code> or <code>"weekly_limit"</code>
            </li>
          </ul>

          <h3 className="font-display font-semibold text-base mb-2">Status codes</h3>
          <div className="glass rounded-card p-4 mb-8 overflow-x-auto">
            <table className="w-full text-xs">
              <tbody>
                <tr className="border-b border-border/60">
                  <td className="py-1.5 pr-4 font-mono text-text-secondary">200</td>
                  <td className="py-1.5 text-text-secondary">Audit completed</td>
                </tr>
                <tr className="border-b border-border/60">
                  <td className="py-1.5 pr-4 font-mono text-text-secondary">400</td>
                  <td className="py-1.5 text-text-secondary">Invalid request (missing/malformed URL, oversized body)</td>
                </tr>
                <tr className="border-b border-border/60">
                  <td className="py-1.5 pr-4 font-mono text-text-secondary">401</td>
                  <td className="py-1.5 text-text-secondary">
                    Invalid/expired Firebase ID token, or an invalid, revoked, or no-longer-Pro API
                    key
                  </td>
                </tr>
                <tr className="border-b border-border/60">
                  <td className="py-1.5 pr-4 font-mono text-text-secondary">403</td>
                  <td className="py-1.5 text-text-secondary">Cross-site request rejected, or automated-traffic pattern detected</td>
                </tr>
                <tr className="border-b border-border/60">
                  <td className="py-1.5 pr-4 font-mono text-text-secondary">429</td>
                  <td className="py-1.5 text-text-secondary">Daily/weekly quota exhausted</td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-4 font-mono text-text-secondary">502</td>
                  <td className="py-1.5 text-text-secondary">The audit itself failed (target site unreachable, timed out)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-xs text-text-secondary">
            Prefer automation without any auth or rate limit at all? See{" "}
            <a
              href="https://github.com/zelvior/audityxe/tree/main/cli"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              audityxe-cli
            </a>{" "}
            and the{" "}
            <a
              href="https://github.com/zelvior/audityxe/blob/main/action.yml"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              GitHub Action
            </a>
            .
          </p>
        </div>
      </div>
      <Footer />
    </main>
  );
}
