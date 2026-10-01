import { NextResponse } from "next/server";
import { CHANGELOG_ENTRIES } from "@/lib/changelog-data";

export const dynamic = "force-static";
export const revalidate = 3600;

const SITE_URL = "https://audityxe.vercel.app";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// CHANGELOG_ENTRIES only stores a human month/year string ("September
// 2026"), not a precise date — RSS readers want a real RFC 822
// pubDate. Approximating each entry to the 1st of its stated month is
// honest (it doesn't claim a day-level precision the source data
// doesn't have) and still sorts/displays correctly in any reader.
function toPubDate(monthYear: string): string {
  const parsed = new Date(`1 ${monthYear}`);
  const date = isNaN(parsed.getTime()) ? new Date() : parsed;
  return date.toUTCString();
}

export async function GET() {
  const items = CHANGELOG_ENTRIES.map((entry) => {
    const title = `v${entry.version}`;
    const link = `${SITE_URL}/changelog#v${entry.version.replace(/\./g, "-")}`;
    const description = entry.changes.map((c) => `<li>${escapeXml(c)}</li>`).join("");
    return `
    <item>
      <title>${escapeXml(title)}</title>
      <link>${link}</link>
      <guid isPermaLink="false">audityxe-changelog-${entry.version}</guid>
      <pubDate>${toPubDate(entry.date)}</pubDate>
      <description><![CDATA[<ul>${description}</ul>]]></description>
    </item>`;
  }).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Audityxe Changelog</title>
    <link>${SITE_URL}/changelog</link>
    <description>What's new, fixed, and changed in Audityxe.</description>
    <language>en-us</language>
    <atom:link href="${SITE_URL}/changelog/rss.xml" rel="self" type="application/rss+xml" />${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
