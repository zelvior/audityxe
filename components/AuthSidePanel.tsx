export default function AuthSidePanel() {
  return (
    <div className="hidden lg:flex relative w-[46%] shrink-0 bg-secondary overflow-hidden items-center justify-center">
      <svg viewBox="0 0 520 640" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="authPanelBg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#503E70" />
            <stop offset="100%" stopColor="#3A2D54" />
          </linearGradient>
        </defs>
        <rect width="520" height="640" fill="url(#authPanelBg)" />

        {/* scattered outline glyphs — audit / monitoring motif */}
        <g stroke="#A7ABCE" strokeOpacity="0.35" strokeWidth="1.6" fill="none">
          <circle cx="90" cy="90" r="18" />
          <path d="M84 90h12M90 84v12" />
          <rect x="360" y="60" width="34" height="34" rx="8" />
          <path d="M370 77h14M377 70v14" />
          <rect x="60" y="230" width="30" height="30" rx="15" />
          <path d="M68 245l6 6l10 -12" />
          <circle cx="440" cy="200" r="16" />
          <path d="M433 200h14M440 193v14" />
          <rect x="420" y="330" width="30" height="24" rx="4" />
          <path d="M420 336h30" />
          <circle cx="70" cy="400" r="14" />
          <path d="M64 400h12" />
        </g>

        {/* central "audit report" card mockup */}
        <g transform="translate(150 190)">
          <rect x="0" y="0" width="220" height="280" rx="12" fill="#050609" fillOpacity="0.9" />
          <rect x="18" y="24" width="90" height="10" rx="3" fill="#A7ABCE" fillOpacity="0.7" />
          <rect x="18" y="44" width="140" height="7" rx="3" fill="#9A9AA9" fillOpacity="0.6" />

          <circle cx="110" cy="110" r="52" fill="none" stroke="#1D1E27" strokeWidth="10" />
          <circle
            cx="110"
            cy="110"
            r="52"
            fill="none"
            stroke="#8F6EAF"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray="280 327"
            transform="rotate(-90 110 110)"
          />
          <text x="110" y="104" textAnchor="middle" fontFamily="Manrope, sans-serif" fontWeight="700" fontSize="30" fill="#E4E5F0">
            8.6
          </text>
          <text x="110" y="124" textAnchor="middle" fontFamily="Manrope, sans-serif" fontSize="10" fill="#9A9AA9">
            OVERALL SCORE
          </text>

          <g transform="translate(18 190)">
            <rect width="184" height="14" rx="4" fill="#1D1E27" />
            <rect width="150" height="14" rx="4" fill="#8F6EAF" />
          </g>
          <g transform="translate(18 214)">
            <rect width="184" height="14" rx="4" fill="#1D1E27" />
            <rect width="120" height="14" rx="4" fill="#A7ABCE" />
          </g>
          <g transform="translate(18 238)">
            <rect width="184" height="14" rx="4" fill="#1D1E27" />
            <rect width="90" height="14" rx="4" fill="#503E70" />
          </g>
        </g>

        {/* floating check badge, echoing the reference image's badge accent */}
        <g transform="translate(120 420)">
          <circle cx="0" cy="0" r="30" fill="#E4E5F0" />
          <path d="M-11 0l7 8l16 -18" fill="none" stroke="#503E70" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </g>

        {/* soft wave accents */}
        <path
          d="M20 560 Q 60 540 100 560 T 180 560"
          fill="none"
          stroke="#E4E5F0"
          strokeOpacity="0.25"
          strokeWidth="2"
        />
        <path
          d="M340 520 Q 380 500 420 520 T 500 520"
          fill="none"
          stroke="#E4E5F0"
          strokeOpacity="0.2"
          strokeWidth="2"
        />
      </svg>

      <div className="absolute bottom-8 left-8 right-8">
        <p className="text-text-primary font-display font-semibold text-lg leading-snug">
          Every audit, backed by real evidence.
        </p>
        <p className="text-primary/80 text-sm mt-1">
          No black-box scores — just deterministic checks you can verify yourself.
        </p>
      </div>
    </div>
  );
}
