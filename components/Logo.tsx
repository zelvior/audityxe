import Image from "next/image";

interface LogoProps {
  size?: number;
  className?: string;
}

// Real trimmed pixel dimensions of the current source PNG (900×817).
const MARK_ASPECT_RATIO = 900 / 817;

/**
 * Audityxe's real brand mark — the person's own uploaded artwork,
 * cleaned rather than replaced: background removed via flood-fill
 * (reachability from the canvas edges, not just a raw color-distance
 * threshold, so it doesn't misfire on enclosed pixels), edge pixels
 * un-blended against the source's cream background to remove baked-in
 * color fringing, and the purple ink recolored to the site's ink/rust
 * palette. This is the single source of truth for the mark used across
 * the Header, Footer, loading screen, and other in-app spots. The
 * favicon (app/icon.png), Apple touch icon (app/apple-icon.png), and
 * the /public/logo-mark-*.png files are separately-sized static
 * exports of this same cleaned artwork.
 */
export default function Logo({ size = 40, className = "" }: LogoProps) {
  const width = Math.round(size * MARK_ASPECT_RATIO);
  return (
    <Image
      src="/logo-mark-trimmed.png"
      alt="Audityxe"
      width={width}
      height={size}
      className={`shrink-0 ${className}`}
      priority
    />
  );
}
