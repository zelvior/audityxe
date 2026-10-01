"use client";

/**
 * Hover-reveal button — the Uiverse.io "Gaurav-WebDev" button mechanic
 * (two stacked labels that swap places with a slide + rotate on
 * hover), rebuilt as a themed, reusable component instead of the
 * original's hardcoded teal (#008080) and fixed "Hover Me"/"Thanks"
 * copy. Colors come from the same --color-accent/--color-surface CSS
 * variables as the rest of the site, so it repaints for light/dark
 * automatically along with everything else, and both labels are props
 * so it can be reused anywhere the two-state reveal makes sense.
 */
export default function HoverRevealButton({
  frontLabel,
  backLabel,
  href,
  onClick,
  className = "",
}: {
  frontLabel: string;
  backLabel: string;
  href?: string;
  onClick?: () => void;
  className?: string;
}) {
  const content = (
    <span className="hv-reveal-btn">
      <span className="hv-reveal-btn__front">{frontLabel}</span>
      <span className="hv-reveal-btn__back">{backLabel}</span>
      <style jsx>{`
        .hv-reveal-btn {
          display: inline-flex;
          vertical-align: middle;
          height: 44px;
          min-width: 148px;
          border-radius: 10px;
          position: relative;
          overflow: hidden;
        }
        .hv-reveal-btn__front,
        .hv-reveal-btn__back {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          font-weight: 600;
          padding: 0 18px;
          transition: transform 0.4s ease;
          white-space: nowrap;
        }
        .hv-reveal-btn__front {
          background: rgb(var(--color-accent));
          color: rgb(var(--color-bg));
          transform: translateY(0) scale(1);
        }
        .hv-reveal-btn__back {
          background: rgb(var(--color-surface));
          color: rgb(var(--color-accent));
          border: 1px solid rgb(var(--color-accent) / 0.3);
          transform: translateY(44px);
        }
        .hv-reveal-btn:hover .hv-reveal-btn__front {
          transform: translateY(-44px) scale(0.9) rotate(-8deg);
        }
        .hv-reveal-btn:hover .hv-reveal-btn__back {
          transform: translateY(0) scale(1);
        }
      `}</style>
    </span>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className} aria-label={frontLabel}>
        {content}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className} aria-label={frontLabel}>
      {content}
    </button>
  );
}
