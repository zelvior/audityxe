import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { canonicalMeta } from "@/lib/seo";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Workflow } from "lucide-react";

export const metadata: Metadata = {
  ...canonicalMeta("workflow"),
  title: "Workflow Diagram — Audityxe",
  description:
    "How an Audityxe audit flows end-to-end: UI, API routes, the audit orchestrator, and every module and data store it touches.",
};

export default function WorkflowPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-card bg-primary/10 border border-primary/20 shrink-0">
              <Workflow size={18} className="text-primary" />
            </span>
            <h1 className="font-display font-bold text-2xl sm:text-3xl md:text-4xl tracking-tight">
              <span className="hand-underline">Workflow Diagram</span>
            </h1>
          </div>
          <p className="text-sm sm:text-base text-text-secondary mb-8 sm:mb-10">
            Audityxe is open source, so this diagram — the same one engineers use internally — is
            published for anyone to read. It traces every route, module, and data store a single
            audit request touches, end to end.
          </p>

          <div className="glass rounded-card p-3 sm:p-5 mb-8 overflow-x-auto">
            <Image
              src="/workflow-diagram.png"
              alt="Audityxe end-to-end architecture and data-flow diagram"
              width={2264}
              height={1636}
              className="w-full h-auto rounded-[10px]"
              priority
            />
          </div>

          <h2 className="font-display font-semibold text-lg sm:text-xl mb-2">Reading it</h2>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-text-secondary mb-8">
            <li>
              <strong className="text-text-primary">Audit Experience</strong> — the visitor-facing
              flow: <code>Audit API</code> and <code>Bulk Audit API</code> submit a URL,{" "}
              <code>Audit UI</code> renders the report, and <code>Report Exports</code> handles PDF
              export.
            </li>
            <li>
              <strong className="text-text-primary">Audit Runtime</strong> — the{" "}
              <code>Audit Orchestrator</code> (<code>analyze.ts</code>) fans out to the web/SEO,
              DNS/TLS, and deep-signal checks, plus Lighthouse via PageSpeed Insights.
            </li>
            <li>
              <strong className="text-text-primary">Operations And Outputs</strong> — admin console,
              announcements, badge issuance, and the audit log.
            </li>
            <li>
              <strong className="text-text-primary">Billing And Features</strong> — payments,
              webhooks, and the banner-image generator.
            </li>
            <li>
              <strong className="text-text-primary">Identity And Plans</strong> — auth, rate
              limiting/quotas, user settings, and Firestore.
            </li>
          </ul>

          <h2 className="font-display font-semibold text-lg sm:text-xl mb-2">
            Keeping this diagram current
          </h2>
          <p className="text-sm text-text-secondary mb-3">
            The diagram is a static image at <code>public/workflow-diagram.png</code> — it is not
            generated at build time, so it has to be refreshed by hand whenever the module wiring
            changes meaningfully (a new route, a new module, a rewired dependency). Full steps are
            documented in the{" "}
            <a
              href="https://github.com/zelvior/audityxe#workflow-diagram"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              README&apos;s &quot;Workflow Diagram&quot; section
            </a>
            . In short: regenerate the diagram from the current codebase, export it as a PNG, and
            replace <code>public/workflow-diagram.png</code> — this page and the README figure both
            point at that one file, so nothing else needs to change.
          </p>

          <p className="text-xs text-text-secondary mt-8">
            Spot something out of date on this page?{" "}
            <Link href="/contact" className="text-primary hover:underline">
              Let us know
            </Link>
            .
          </p>
        </div>
      </div>
      <Footer />
    </main>
  );
}
