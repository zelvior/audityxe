import type { Metadata } from "next";

/**
 * Every route needs its OWN canonical URL. Without this, a page with no
 * `alternates` of its own silently inherits the root layout's
 * `alternates: { canonical: "/" }` — which means, before this file
 * existed, every single subpage (pricing, faq, terms, privacy, contact,
 * ...) was telling Google "the canonical version of this page is the
 * homepage". That tells search engines these pages are duplicates of "/"
 * and can get them dropped from the index entirely in favor of the
 * homepage, regardless of how good their own content is.
 */
export const SITE_URL = "https://audityxe.vercel.app";

/** Canonical + OG url for a normal, public, indexable page. */
export function canonicalMeta(path: string): Pick<Metadata, "alternates" | "openGraph"> {
  const url = path === "/" ? "/" : `/${path.replace(/^\/+/, "")}`;
  return {
    alternates: { canonical: url },
    openGraph: { url },
  };
}

/** For authenticated/app-only routes (account, settings, bulk results,
 * auth flows) that have no business ranking in search — still gets a
 * correct self-canonical (never "/") so it's at least never mistaken
 * for a duplicate of the homepage, but is explicitly kept out of the
 * index rather than competing with real content pages. */
export function noindexMeta(path: string): Pick<Metadata, "alternates" | "robots"> {
  const url = path === "/" ? "/" : `/${path.replace(/^\/+/, "")}`;
  return {
    alternates: { canonical: url },
    robots: { index: false, follow: false },
  };
}
