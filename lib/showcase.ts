import { adminDb } from "./firebase/admin";
import { Timestamp } from "firebase-admin/firestore";
import { assertSafeUrl } from "./url-safety";

/**
 * The public /showcase wall — deliberately opt-in and ownership-verified,
 * not a dump of every domain that's ever had a badge generated for it
 * (see badge-store.ts). Anyone can request a badge for any domain
 * without proving they own it, so badge_scores alone isn't safe to list
 * publicly — some of those domains never agreed to be featured, and
 * could belong to someone who requested a badge for an unrelated or
 * competitor site out of curiosity. Showcase submission instead proves
 * ownership the same way a domain-verification TXT record does: by
 * requiring something only the real site owner could have put there —
 * here, a live, real embed of the actual Audityxe badge link on the
 * submitted domain's own homepage.
 */

export interface ShowcaseEntry {
  host: string;
  submittedAt: string;
}

const BADGE_LINK_PATTERN = /href=["'][^"']*audityxe\.vercel\.app[^"']*["']/i;

function normalizeHost(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}

export class ShowcaseVerificationError extends Error {}

/**
 * Fetches the domain's own homepage and confirms it actually contains a
 * link back to Audityxe — the same proof-of-embed the badge system
 * itself relies on. Reuses assertSafeUrl for the same SSRF protections
 * every other outbound fetch in this codebase gets; a showcase
 * submission is exactly the same "fetch a URL someone gave us" shape of
 * request as an audit, so it needs the same guardrails.
 */
export async function verifyAndSubmitToShowcase(rawHost: string): Promise<ShowcaseEntry> {
  const host = normalizeHost(rawHost);
  if (!host || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host)) {
    throw new ShowcaseVerificationError("That doesn't look like a valid domain.");
  }

  const target = `https://${host}/`;
  await assertSafeUrl(target);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  let html: string;
  try {
    const res = await fetch(target, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AudityxeBot/1.0; +https://audityxe.vercel.app)" },
    });
    if (!res.ok) {
      throw new ShowcaseVerificationError(`Couldn't fetch https://${host}/ (HTTP ${res.status}).`);
    }
    html = await res.text();
  } catch (err) {
    if (err instanceof ShowcaseVerificationError) throw err;
    throw new ShowcaseVerificationError(`Couldn't reach https://${host}/ — is it publicly accessible?`);
  } finally {
    clearTimeout(timer);
  }

  if (!BADGE_LINK_PATTERN.test(html)) {
    throw new ShowcaseVerificationError(
      `No Audityxe badge link found on https://${host}/ — embed the badge from /badge first, then submit again. This check confirms you actually own/control the site, the same way a badge embed itself does.`
    );
  }

  const entry = { host, submittedAt: new Date().toISOString() };
  await adminDb().collection("showcase_submissions").doc(host).set(entry, { merge: true });
  return entry;
}

export async function listShowcaseEntries(): Promise<ShowcaseEntry[]> {
  const snap = await adminDb().collection("showcase_submissions").orderBy("submittedAt", "desc").limit(60).get();
  return snap.docs.map((d) => {
    const data = d.data();
    const submittedAt = data.submittedAt instanceof Timestamp ? data.submittedAt.toDate().toISOString() : data.submittedAt;
    return { host: d.id, submittedAt };
  });
}

export async function removeShowcaseEntry(host: string): Promise<void> {
  await adminDb().collection("showcase_submissions").doc(normalizeHost(host)).delete();
}
