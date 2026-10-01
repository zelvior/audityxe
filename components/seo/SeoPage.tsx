import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SITE_URL } from "@/lib/seo";
import { SEO_REVIEWED, type Faq } from "@/lib/seo-content";

/** JSON.stringify never emits an unescaped "<"; the replace is defense-in-depth. */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export interface Crumb {
  name: string;
  path: string;
}

export function breadcrumbs(crumbs: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Home", path: "" }, ...crumbs].map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: `${SITE_URL}${c.path}`,
    })),
  };
}

export function faqJsonLd(faqs: Faq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export function techArticleJsonLd(args: { path: string; headline: string; description: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    "@id": `${SITE_URL}${args.path}#article`,
    headline: args.headline,
    description: args.description,
    url: `${SITE_URL}${args.path}`,
    mainEntityOfPage: `${SITE_URL}${args.path}`,
    dateModified: SEO_REVIEWED,
    inLanguage: "en",
    author: { "@id": `${SITE_URL}/#organization` },
    publisher: { "@id": `${SITE_URL}/#organization` },
    isPartOf: { "@id": `${SITE_URL}/#website` },
  };
}

/** Visible FAQ — the same strings feed faqJsonLd, so schema and page never drift. */
export function FaqSection({ faqs, heading = "Frequently asked questions" }: { faqs: Faq[]; heading?: string }) {
  return (
    <section aria-labelledby="faq-heading" className="mt-12">
      <h2 id="faq-heading" className="font-display font-semibold text-xl mb-4">
        {heading}
      </h2>
      <div className="space-y-4">
        {faqs.map((f) => (
          <div key={f.q} className="glass rounded-card p-4 sm:p-5">
            <h3 className="font-display font-semibold text-base mb-2">{f.q}</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              <strong className="text-text-primary font-semibold">{f.a}</strong>
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function CodeBlock({ code, label }: { code: string; label?: string }) {
  return (
    <figure className="my-3">
      {label && <figcaption className="text-xs font-mono text-text-secondary mb-1">{label}</figcaption>}
      <pre className="overflow-x-auto rounded-card border border-border bg-[rgb(var(--color-text-primary)/0.045)] p-3 text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
    </figure>
  );
}

export interface RelatedLink {
  href: string;
  label: string;
  description?: string;
}

export function RelatedLinks({ links, heading = "Related" }: { links: RelatedLink[]; heading?: string }) {
  if (!links.length) return null;
  return (
    <nav aria-label={heading} className="mt-12">
      <h2 className="font-display font-semibold text-xl mb-4">{heading}</h2>
      <ul className="grid sm:grid-cols-2 gap-3">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="block glass rounded-card p-4 hover:border-primary/40 transition h-full">
              <span className="font-display font-semibold text-sm text-primary">{l.label}</span>
              {l.description && <span className="block text-xs text-text-secondary mt-1 leading-relaxed">{l.description}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Shared shell: header/footer, visible breadcrumb, single H1, review date. */
export default function SeoPage({
  crumbs,
  eyebrow,
  title,
  directQuestion,
  directAnswer,
  children,
  jsonLd = [],
}: {
  crumbs: Crumb[];
  eyebrow: string;
  title: string;
  /** Question phrasing of the primary intent; rendered as H2 immediately followed by a bolded answer. */
  directQuestion?: string;
  directAnswer?: string;
  children: React.ReactNode;
  jsonLd?: unknown[];
}) {
  return (
    <main className="min-h-screen flex flex-col">
      <JsonLd data={breadcrumbs(crumbs)} />
      {jsonLd.map((d, i) => (
        <JsonLd key={i} data={d} />
      ))}
      <Header />
      <div className="flex-1 px-4 sm:px-6 py-10 sm:py-14">
        <article className="max-w-3xl mx-auto">
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex flex-wrap items-center gap-1.5 text-xs text-text-secondary">
              <li>
                <Link href="/" className="hover:text-primary inline-flex items-center gap-1">
                  <ArrowLeft size={12} /> Home
                </Link>
              </li>
              {crumbs.map((c, i) => (
                <li key={c.path} className="flex items-center gap-1.5">
                  <span aria-hidden="true">/</span>
                  {i < crumbs.length - 1 ? (
                    <Link href={c.path} className="hover:text-primary">
                      {c.name}
                    </Link>
                  ) : (
                    <span aria-current="page">{c.name}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>

          <p className="text-xs font-mono text-text-secondary mb-3">{eyebrow}</p>
          <h1 className="font-display font-bold text-3xl sm:text-4xl tracking-tight mb-6">{title}</h1>

          {directQuestion && directAnswer && (
            <section aria-labelledby="direct-answer" className="glass rounded-card p-5 sm:p-6 mb-8">
              <h2 id="direct-answer" className="font-display font-semibold text-lg mb-2">
                {directQuestion}
              </h2>
              <p className="text-sm sm:text-base leading-relaxed">
                <strong>{directAnswer}</strong>
              </p>
            </section>
          )}

          {children}

          <p className="mt-12 text-xs text-text-secondary">
            Last reviewed <time dateTime={SEO_REVIEWED}>{SEO_REVIEWED}</time> against the Audityxe source code.{" "}
            Product names mentioned are trademarks of their respective owners; Audityxe is not affiliated with them.
          </p>
        </article>
      </div>
      <Footer />
    </main>
  );
}
