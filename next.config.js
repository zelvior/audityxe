/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false, // don't leak X-Powered-By: Next.js
  async headers() {
    const csp = [
      "default-src 'self'",
      // Scripts scoped to specific third-party origins Audityxe actually loads.
      // 'unsafe-inline' and 'unsafe-eval' removed from script-src to prevent
      // XSS via injected inline scripts — the primary purpose of CSP.
      "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://apis.google.com https://www.gstatic.com",
      // 'unsafe-inline' removed from style-src — inline styles are managed
      // via CSS modules and external stylesheets, not style attributes.
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://generativelanguage.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://ipapi.co https://api.exchangerate-api.com https://image.pollinations.ai https:",
      "frame-src 'self' https://audityxe.firebaseapp.com https://accounts.google.com https://github.com https://nowpayments.io https://*.nowpayments.io",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");

    // The live scan-in-progress preview (components/LiveScanPreview.tsx,
    // shown only on "/" while an audit runs) frames the arbitrary
    // third-party site being audited — a fixed frame-src allowlist can
    // never cover that, since the target is different on every audit.
    // This was the root cause of the iframe "just not loading" for most
    // sites: the browser was silently enforcing the global CSP above
    // and refusing to even attempt the embed, no matter what
    // LiveScanPreview's own sandbox attribute allowed. Scoped to "/"
    // only — every other route keeps the strict, fixed frame-src list.
    // The iframe itself still runs allow-scripts only (no
    // allow-same-origin, no allow-top-navigation — see
    // LiveScanPreview.tsx) so a broader frame-src here doesn't hand the
    // framed page any new capability, only permission to be framed at
    // all.
    const homeCsp = csp.replace(
      "frame-src 'self' https://audityxe.firebaseapp.com https://accounts.google.com https://github.com https://nowpayments.io https://*.nowpayments.io",
      "frame-src 'self' https: https://audityxe.firebaseapp.com https://accounts.google.com https://github.com https://nowpayments.io https://*.nowpayments.io"
    );

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
        ],
      },
      {
        // Next.js applies the most specific matching `source` last-wins
        // per header key for the same path, so this second, more
        // specific "/" entry overrides just the CSP header set above
        // for the homepage only.
        source: "/",
        headers: [{ key: "Content-Security-Policy", value: homeCsp }],
      },
    ];
  },

  // Firebase's default handler lives at /__/auth/action. Serve the same
  // Audityxe page there too, so either form of the action URL works:
  //   https://audityxe.xyz/auth/action?mode=…&oobCode=…
  //   https://audityxe.xyz/__/auth/action?mode=…&oobCode=…
  // (Next ignores app/ folders starting with "__", so this is a rewrite.)
  async rewrites() {
    return [{ source: "/__/auth/action", destination: "/auth/action" }];
  },

  // /admin/discount-codes was renamed to /admin/redeem-codes when the
  // percent_off code type (and everything checkout-side built on it)
  // was removed — this keeps any bookmark or saved link working.
  async redirects() {
    return [
      { source: "/admin/discount-codes", destination: "/admin/redeem-codes", permanent: true },
    ];
  },
};

module.exports = nextConfig;
