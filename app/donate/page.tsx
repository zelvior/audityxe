import type { Metadata } from "next";
import Link from "next/link";
import { canonicalMeta } from "@/lib/seo";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Heart, Github, Mail } from "lucide-react";

export const metadata: Metadata = {
  ...canonicalMeta("donate"),
  title: "Sponsor Audityxe",
  description: "Support Audityxe's development. Donate in crypto, or sponsor the open-source project.",
};

// Public NOWPayments donation-widget key. This one IS meant to be
// public — it only identifies which merchant account a donation is
// destined for, and cannot be used to move funds or read the account.
// It is deliberately a different variable from NOWPAYMENTS_API_KEY,
// which is a real secret and must never reach the browser.
const DONATION_WIDGET_KEY = process.env.NEXT_PUBLIC_NOWPAYMENTS_DONATION_KEY;

export default function DonatePage() {
  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-card bg-rose/10 border border-rose/20 shrink-0">
              <Heart size={18} className="text-rose" />
            </span>
            <h1 className="font-display font-bold text-2xl sm:text-3xl md:text-4xl tracking-tight">
              <span className="hand-underline">Sponsor Audityxe</span>
            </h1>
          </div>

          <p className="text-sm sm:text-base text-text-secondary mb-8">
            Audityxe is free, open-source, and runs every audit against live infrastructure. If it
            has been useful to you, a contribution helps cover hosting and API costs and keeps the
            free tier genuinely free. Entirely optional — nothing here is paywalled behind it.
          </p>

          {DONATION_WIDGET_KEY ? (
            <div className="glass rounded-card p-3 sm:p-4 mb-6 flex justify-center">
              <div className="w-full max-w-[346px]">
                <iframe
                  src={`https://nowpayments.io/embeds/donation-widget?api_key=${DONATION_WIDGET_KEY}`}
                  width="346"
                  height="623"
                  style={{ overflowY: "hidden", border: "none", width: "100%", maxWidth: "346px", aspectRatio: "346 / 623" }}
                  scrolling="no"
                  title="Donate with cryptocurrency via NOWPayments"
                  className="block rounded-input mx-auto"
                >
                  Can&apos;t load widget
                </iframe>
              </div>
            </div>
          ) : (
            <div className="glass rounded-card p-5 mb-6">
              <p className="text-sm text-text-secondary">
                The crypto donation widget isn&apos;t configured on this deployment. Set{" "}
                <code className="font-mono text-xs">NEXT_PUBLIC_NOWPAYMENTS_DONATION_KEY</code> to
                enable it — you can still support the project through the options below.
              </p>
            </div>
          )}

          <h2 className="font-display font-semibold text-lg mb-3">Other ways to help</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <a
              href="https://github.com/zelvior/audityxe"
              target="_blank"
              rel="noopener noreferrer"
              className="glass rounded-card p-4 flex items-start gap-3 hover:border-primary/40 transition"
            >
              <Github size={16} className="text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-display font-semibold text-sm">Star the repo</p>
                <p className="text-xs text-text-secondary mt-0.5">
                  Free, and genuinely the most useful thing for discoverability.
                </p>
              </div>
            </a>
            <a
              href="mailto:zelvior@proton.me"
              className="glass rounded-card p-4 flex items-start gap-3 hover:border-primary/40 transition"
            >
              <Mail size={16} className="text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-display font-semibold text-sm">Report a bug or idea</p>
                <p className="text-xs text-text-secondary mt-0.5">
                  Real feedback from real use is worth more than money.
                </p>
              </div>
            </a>
          </div>

          <p className="text-xs text-text-secondary/80 mt-8">
            Donations are voluntary contributions, not purchases, and are non-refundable — see the{" "}
            <Link href="/refund-policy" className="text-primary hover:underline">
              Refund Policy
            </Link>
            . Crypto donations are processed by NOWPayments; Audityxe never sees your wallet or any
            payment credentials.
          </p>
        </div>
      </div>
      <Footer />
    </main>
  );
}
