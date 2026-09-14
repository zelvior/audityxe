interface LogoProps {
  size?: number;
  className?: string;
}

/**
 * Audityxe's brand mark — a clean hand-built vector redraw (an open "A"
 * outline with an integrated checkmark + dot), not a raster export.
 * Previous versions used a cropped/recolored PNG of the original
 * uploaded artwork, which — being a small mark on a large, heavily
 * compressed source image — never got fully crisp no matter how the
 * edges were cleaned up, and always risked a leftover background
 * fringe. An inline SVG has neither problem: it's infinitely crisp at
 * any size, has no background to remove, and its two colors are driven
 * by the same theme CSS variables as the rest of the site, so it
 * repaints correctly for light/dark automatically instead of needing a
 * separate flattened PNG per theme.
 *
 * The favicon (app/icon.png), Apple touch icon (app/apple-icon.png),
 * and the various /public/logo-mark-*.png files are static rasterized
 * exports of this same shape (see public/logo-mark.svg in the design
 * source) for the handful of spots that require a real image file
 * (favicon, manifest icons, OG image, PDF export).
 */
export default function Logo({ size = 40, className = "" }: LogoProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      aria-label="Audityxe"
      role="img"
    >
      <path
        d="M50 10 L14 88 L27 88"
        fill="none"
        stroke="rgb(var(--color-text-primary))"
        strokeWidth="7.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M50 10 L86 88 L73 88"
        fill="none"
        stroke="rgb(var(--color-text-primary))"
        strokeWidth="7.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="40" cy="50" r="5" fill="rgb(var(--color-accent))" />
      <path
        d="M35 58 L46 70 L80 26"
        fill="none"
        stroke="rgb(var(--color-accent))"
        strokeWidth="8.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
