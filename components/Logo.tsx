import Image from "next/image";

interface LogoProps {
  size?: number;
  className?: string;
}

// Real trimmed pixel dimensions of the new source PNG (900×836) — used
// to preserve its actual aspect ratio rather than stretching it into a
// square box.
const MARK_ASPECT_RATIO = 900 / 836;

/**
 * Audityxe's real brand mark — the uploaded artwork, auto-trimmed of its
 * surrounding padding and re-keyed to a transparent background so it
 * sits correctly on both light and dark surfaces. This is the single
 * source of truth for the mark used across the Header, Footer, loading
 * screen, and other in-app spots. The favicon (app/icon.png) and Apple
 * touch icon (app/apple-icon.png) are separately-sized static exports
 * of the same source image, composited onto the site's paper background
 * since favicons can't rely on transparency reading correctly in every
 * browser chrome.
 *
 * `size` is the rendered height in px. The source artwork was a fairly
 * small mark on a large canvas, so callers should generally reach for a
 * larger `size` than feels natural at first — see Header/Footer for the
 * current baseline.
 */
export default function Logo({ size = 40, className = "" }: LogoProps) {
  return (
    <Image
      src="/logo-mark-trimmed.png"
      alt="Audityxe"
      width={Math.round(size * MARK_ASPECT_RATIO)}
      height={size}
      className={`shrink-0 object-contain ${className}`}
      priority
    />
  );
}
