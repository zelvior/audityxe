import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { canonicalMeta } from "@/lib/seo";
import { CHECK_PAGES } from "@/lib/seo-content";
import SeoPage, { CodeBlock, FaqSection, RelatedLinks, faqJsonLd, techArticleJsonLd } from "@/components/seo/SeoPage";

export const dynamicParams = false;

export function generateStaticParams() {
  return CHECK_PAGES.map((c) => ({ slug: c.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const c = CHECK_PAGES.find((x) => x.slug === params.slug);
  if (!c) return {};
  return {
    ...canonicalMeta(`checks/${c.slug}`),
    title: `${c.title} — Audityxe`,
    description: c.metaDescription,
  };
}

export default function CheckPage({ params }: { params: { slug: string } }) {
  const c = CHECK_PAGES.find((x) => x.slug === params.slug);
  if (!c) notFound();
  const path = `/checks/${c.slug}`;
  const related = c.related.map((s) => CHECK_PAGES.find((x) => x.slug === s)).filter((x): x is NonNullable<typeof x> => !!x);

  return (
    <SeoPage
      crumbs={[
        { name: "Checks", path: "/checks" },
        { name: c.title, path },
      ]}
      eyebrow="Audit module"
      title={c.title}
      directQuestion={c.directQuestion}
      directAnswer={c.directAnswer}
      jsonLd={[techArticleJsonLd({ path, headline: c.title, description: c.metaDescription }), faqJsonLd(c.faqs)]}
    >
      <p className="text-sm text-text-secondary mb-8 leading-relaxed">{c.intro}</p>

      {c.planNote && <p className="glass rounded-card p-3 text-sm mb-8">{c.planNote}</p>}

      <section aria-labelledby="modules" className="mb-10">
        <h2 id="modules" className="font-display font-semibold text-xl mb-4">
          What is checked
        </h2>
        <div className="space-y-4">
          {c.modules.map((m) => (
            <section key={m.name} className="glass rounded-card p-4">
              <h3 className="font-display font-semibold text-base">{m.name}</h3>
              <p className="text-xs text-text-secondary mb-2">{m.summary}</p>
              <ul className="list-disc pl-5 space-y-1 text-sm text-text-secondary">
                {m.checks.map((k) => (
                  <li key={k}>{k}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </section>

      <section aria-labelledby="run" className="mb-4">
        <h2 id="run" className="font-display font-semibold text-xl mb-2">
          How to run it
        </h2>
        <p className="text-sm text-text-secondary">
          <strong className="text-text-primary">Web app:</strong> {c.run.web}
        </p>
        <p className="text-sm text-text-secondary mt-2">
          <strong className="text-text-primary">Command line</strong> (see the <Link href="/cli" className="text-primary hover:underline">CLI guide</Link>):
        </p>
        <CodeBlock code={c.run.cli} />
      </section>

      <FaqSection faqs={c.faqs} />
      <RelatedLinks
        heading="Related checks"
        links={[
          ...related.map((r) => ({ href: `/checks/${r.slug}`, label: r.title })),
          { href: "/methodology", label: "Methodology", description: "How scores are calculated." },
          { href: "/capabilities", label: "Capabilities & limitations" },
        ]}
      />
    </SeoPage>
  );
}
