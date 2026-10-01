import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { canonicalMeta } from "@/lib/seo";
import { COMPARISON_PAGES } from "@/lib/seo-content";
import SeoPage, { FaqSection, RelatedLinks, faqJsonLd, techArticleJsonLd } from "@/components/seo/SeoPage";

export const dynamicParams = false;

export function generateStaticParams() {
  return COMPARISON_PAGES.map((c) => ({ slug: c.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const c = COMPARISON_PAGES.find((x) => x.slug === params.slug);
  if (!c) return {};
  return {
    ...canonicalMeta(`compare/${c.slug}`),
    title: `Audityxe vs ${c.other}: Differences & When to Use Each`,
    description: c.metaDescription,
  };
}

export default function ComparePage({ params }: { params: { slug: string } }) {
  const c = COMPARISON_PAGES.find((x) => x.slug === params.slug);
  if (!c) notFound();
  const path = `/compare/${c.slug}`;
  const others = COMPARISON_PAGES.filter((x) => x.slug !== c.slug).slice(0, 4);

  return (
    <SeoPage
      crumbs={[
        { name: "Compare", path: "/compare" },
        { name: `Audityxe vs ${c.other}`, path },
      ]}
      eyebrow={`Comparison · ${c.category}`}
      title={`Audityxe vs ${c.other}`}
      directQuestion={`What is the difference between Audityxe and ${c.other}?`}
      directAnswer={c.directAnswer}
      jsonLd={[techArticleJsonLd({ path, headline: `Audityxe vs ${c.other}`, description: c.metaDescription }), faqJsonLd(c.faqs)]}
    >
      <p className="text-sm text-text-secondary mb-8">{c.otherDefinition}</p>

      <section aria-labelledby="table" className="mb-10">
        <h2 id="table" className="font-display font-semibold text-xl mb-3">
          Side by side
        </h2>
        <div className="overflow-x-auto rounded-card border border-border">
          <table className="w-full text-sm">
            <caption className="sr-only">Audityxe compared with {c.other}</caption>
            <thead>
              <tr className="text-left text-xs font-mono text-text-secondary border-b border-border">
                <th className="p-3">&nbsp;</th>
                <th className="p-3">Audityxe</th>
                <th className="p-3">{c.other}</th>
              </tr>
            </thead>
            <tbody>
              {c.rows.map((r) => (
                <tr key={r.dimension} className="border-b border-border last:border-0 align-top">
                  <th scope="row" className="p-3 text-left font-semibold">{r.dimension}</th>
                  <td className="p-3 text-text-secondary">{r.audityxe}</td>
                  <td className="p-3 text-text-secondary">{r.other}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid sm:grid-cols-2 gap-4 mb-10">
        <section aria-labelledby="pick-a" className="glass rounded-card p-4">
          <h2 id="pick-a" className="font-display font-semibold text-base mb-2">Choose Audityxe when</h2>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-text-secondary">
            {c.chooseAudityxe.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </section>
        <section aria-labelledby="pick-b" className="glass rounded-card p-4">
          <h2 id="pick-b" className="font-display font-semibold text-base mb-2">Choose {c.other} when</h2>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-text-secondary">
            {c.chooseOther.map((t) => <li key={t}>{t}</li>)}
          </ul>
        </section>
      </div>

      <section aria-labelledby="together" className="mb-4">
        <h2 id="together" className="font-display font-semibold text-xl mb-2">Using them together</h2>
        <p className="text-sm text-text-secondary leading-relaxed">{c.together}</p>
      </section>

      <FaqSection faqs={c.faqs} />
      <RelatedLinks
        heading="More comparisons"
        links={[
          ...others.map((o) => ({ href: `/compare/${o.slug}`, label: `Audityxe vs ${o.other}` })),
          { href: "/capabilities", label: "Capabilities & limitations", description: "What Audityxe does and doesn't do." },
        ]}
      />
    </SeoPage>
  );
}
