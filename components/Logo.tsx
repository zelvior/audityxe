interface LogoProps {
  size?: number;
  className?: string;
}

/**
 * Audityxe's brand mark: a radar sweep inside a rounded gradient square.
 * This is the single source of truth for the mark's shape — the same
 * geometry is mirrored (as raw SVG, since those routes can't import
 * React components) in app/icon.tsx, app/apple-icon.tsx, and
 * app/opengraph-image.tsx. If you change the mark here, update those
 * three files to match.
 */
export default function Logo({ size = 32, className = "" }: LogoProps) {
  return (
    <div
      className={`shrink-0 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" fill="#F4F4F5" />
        <path
          d="M12 3a9 9 0 0 1 9 9M12 6.5A5.5 5.5 0 0 1 17.5 12"
          stroke="#F4F4F5"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </div>
  );
}
