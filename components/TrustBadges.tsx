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
          {/* Was a hand-typed static "A+" claim that could silently go
              stale (or just be wrong) — replaced with a genuinely live
              badge pulling the real current grade from SSL Labs' own
              public API (api.ssllabs.com/api/v3/analyze) via shields.io's
              dynamic/json badge, fromCache=on so this doesn't trigger a
              fresh scan on every badge render, only reads whatever SSL
              Labs already has cached. Third-party API response shapes do
              change over time and this can't be exercised from a
              sandboxed build environment with no network access to
              ssllabs.com — if this ever renders shields.io's grey
              "invalid" badge instead of a real grade, the fix is almost
              certainly just the JSONPath in `query` below needing an
              update to match SSL Labs' current response shape; the live
              scan page linked above always works regardless. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fapi.ssllabs.com%2Fapi%2Fv3%2Fanalyze%3Fhost%3Daudityxe.vercel.app%26fromCache%3Don%26all%3Ddone&query=%24.endpoints%5B0%5D.grade&label=SSL%20Labs&style=flat-square"
            alt="Qualys SSL Labs — live grade for audityxe.vercel.app"
            width={172}
            height={20}
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
          {/* Was a static "Scan" label with no actual grade — same fix
              as SSL Labs above: a live shields.io dynamic/json badge
              reading the real current grade from MDN's public HTTP
              Observatory API. Same caveat applies: this API's exact
              path/response shape can't be verified from this sandbox
              (no network access to observatory-api.mdn.mozilla.net) — if
              a scan has never been run for this host, or the response
              shape has changed, shields.io will show its grey "invalid"
              badge instead of a grade. Trigger a scan from the linked
              page first if so; the JSONPath in `query` is the first
              thing to check against whatever the API actually returns. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fobservatory-api.mdn.mozilla.net%2Fapi%2Fv2%2Fanalyze%3Fhost%3Daudityxe.vercel.app&query=%24.grade&label=HTTP%20Observatory&style=flat-square"
            alt="MDN HTTP Observatory — live grade for audityxe.vercel.app"
            width={190}
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

      <div>
        <p className="text-xs font-mono text-text-secondary mb-3">FEATURED ON</p>
        <div className="flex flex-wrap items-center gap-3">
          <a href="https://viberank.dev/apps/Audityxe" target="_blank" rel="noopener noreferrer" className="inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://viberank.dev/badge?app=Audityxe&theme=dark" alt="Audityxe on VibeRank" />
          </a>
          <a
            href="https://programmerneeds.com/tools/audityxe-a2486b?utm_source=maker-site&utm_medium=badge&utm_campaign=audityxe-a2486b"
            target="_blank"
            rel="noopener"
            className="inline-block"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://programmerneeds.com/api/badge/audityxe-a2486b?v=9"
              alt="Find Audityxe on ProgrammerNeeds"
              width={220}
              height={54}
            />
          </a>
        </div>
      </div>
    </div>
  );
}
