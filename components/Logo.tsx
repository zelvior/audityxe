import Image from "next/image";

interface LogoProps {
  size?: number;
  className?: string;
}

// Real trimmed pixel dimensions of the source PNG — used to preserve
// its actual aspect ratio (it's not perfectly square) rather than
// stretching it into a square box.
const MARK_ASPECT_RATIO = 266 / 236;

/**
 * Audityxe's real brand mark (the uploaded PNG, transparent background,
 * auto-trimmed of padding). This is the single source of truth for the
 * mark used across the Header, loading screen, and other in-app spots.
 * The favicon (app/icon.png) and Apple touch icon (app/apple-icon.png)
 * are separately-sized static exports of the same source image.
 */
export default function Logo({ size = 32, className = "" }: LogoProps) {
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
