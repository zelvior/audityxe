/**
 * Live third-party trust/verification badges for audityxe.vercel.app.
 * These are real, externally-verified signals (screenshots on file) —
 * not aspirational placeholders. Update the underlying URLs here if a
 * provider's badge path or account changes.
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://img.shields.io/badge/Qualys%20SSL%20Labs-A%2B-emerald?style=flat-square&logo=qualys"
            alt="Qualys SSL Labs Grade A+"
            width={172}
            height={20}
          />
        </a>
      </div>

      <div>
        <p className="text-xs font-mono text-text-secondary mb-3">
          SECURITY SCORE · MOZILLA OBSERVATORY
        </p>
        <a
          href="https://observatory.mozilla.org/analyze/audityxe.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://img.shields.io/mozilla-observatory/grade-score/audityxe.vercel.app?style=flat-square"
            alt="Mozilla HTTP Observatory Grade"
            width={160}
            height={20}
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
