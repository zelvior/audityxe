/**
 * "Featured on" listing/directory badges — where Audityxe is listed,
 * not a security/uptime scan of it (see TrustBadges.tsx for those).
 * These are the providers' own official embed badges, meant to be
 * displayed exactly as given — unlike the tech-stack logos on this
 * same page, which are deliberately plain-text credits instead (see
 * the note in app/credits/page.tsx), a maker-directory badge only
 * serves its purpose rendered as the actual image the directory
 * issues.
 */
export default function FeaturedOn() {
  return (
    <div className="flex flex-wrap items-center gap-3 not-prose">
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
      <a
        href="https://www.producthunt.com/products/audityxe?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-audityxe"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1256500&theme=neutral&t=1789932465351"
          alt="Audityxe - Build better. Launch faster. | Product Hunt"
          width={250}
          height={54}
        />
      </a>
      <a href="https://kittylaunch.com/p/audityxe?utm_source=badge" target="_blank" rel="noopener" className="inline-block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://kittylaunch.com/api/public/badges/launch_badge.svg?style=pill&theme=dark"
          width={296}
          alt="Audityxe — Verified by KittyLaunch"
          data-kittylaunch-badge="1"
        />
      </a>
    </div>
  );
}
