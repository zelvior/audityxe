/**
 * Live third-party trust/verification badges for audityxe.vercel.app —
 * independently run scans, not self-reported. Update the underlying
 * URLs here if a provider's badge path or account changes.
 *
 * "Featured on" listing/directory badges (VibeRank, ProgrammerNeeds,
 * Product Hunt, ...) live separately in FeaturedOn.tsx — different
 * category (where the product is listed, not a security/uptime scan
 * of it) and a better fit on /credits than sitting in the middle of a
 * "we got independently scanned" trust section.
 */
export default function TrustBadges() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-mono text-text-secondary mb-3">
          UPTIME · UPTIMEROBOT
        </p>
        <a
          href="https://stats.uptimerobot.com/PHQOGeVpYz?utm_source=status_badge&utm_medium=referral"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block"
        >
          <picture>
            <source
              media="(prefers-color-scheme: dark)"
              srcSet="https://badge.uptimerobot.com/psp/f6267da51916d8f2a4d06001bac44cba.svg?style=logo&theme=dark"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://badge.uptimerobot.com/psp/f6267da51916d8f2a4d06001bac44cba.svg?style=logo&theme=light"
              alt="Audityxe uptime status"
              width={250}
              height={54}
            />
          </picture>
        </a>
      </div>

      <div>
        <p className="text-xs font-mono text-text-secondary mb-3">
          SSL/TLS · QUALYS SSL LABS
        </p>
        <a
          href="https://www.ssllabs.com/ssltest/analyze.html?d=audityxe.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block"
        >
          {/* Self-hosted badge, backed by a Firestore cache refreshed
              once a day by a cron job (see lib/security-badges.ts) —
              replaces the old shields.io dynamic-json badge, which made
              shields.io fetch api.ssllabs.com live on every single page
              load and frequently rendered broken because SSL Labs'
              analyze endpoint can take 60+ seconds on an uncached scan,
              well past shields.io's own fetch timeout. This route never
              calls SSL Labs directly — only reads the cached grade. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/api/badge/qualys"
            alt="Qualys SSL Labs grade for audityxe.vercel.app"
            width={300}
            height={90}
          />
        </a>
      </div>

      <div>
        <p className="text-xs font-mono text-text-secondary mb-3">
          SECURITY SCORE · MDN HTTP OBSERVATORY
        </p>
        <a
          href="https://developer.mozilla.org/en-US/observatory/analyze?host=audityxe.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block"
        >
          {/* Same fix and same reasoning as SSL Labs above — self-hosted,
              cache-backed, never calls MDN Observatory live from this
              request path. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/api/badge/mdn"
            alt="MDN HTTP Observatory grade for audityxe.vercel.app"
            width={300}
            height={90}
          />
        </a>
      </div>

      <div>
        <p className="text-xs font-mono text-text-secondary mb-3">
          DOMAIN RISK AUDIT · OMNINTEL
        </p>
        <a
          href="https://omnintel.net/scan/audityxe.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://omnintel.net/api/badge/audityxe.vercel.app.svg"
            alt="OMNIntel security verdict for audityxe.vercel.app"
            width={320}
            height={84}
          />
        </a>
      </div>

      <div>
        <p className="text-xs font-mono text-text-secondary mb-3">
          DOMAIN SECURITY GRADE · WEBSCAN RADAR
        </p>
        <a href="https://webscan-radar.com" target="_blank" rel="noopener noreferrer" className="inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://webscan-radar.com/badge/audityxe.vercel.app"
            alt="Webscan Radar Security Grade"
            width={220}
            height={64}
          />
        </a>
      </div>
    </div>
  );
}
