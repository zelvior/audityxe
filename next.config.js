/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false, // don't leak X-Powered-By: Next.js
  experimental: {
    serverComponentsExternalPackages: ["firebase-admin", "jwks-rsa", "jose"],
  },
  async headers() {
    const csp = [
      "default-src 'self'",
      // Next.js needs 'unsafe-inline' for its hydration bootstrap script and
      // 'unsafe-eval' in dev mode; Framer Motion/inline styles need
      // 'unsafe-inline' for style-src. Scripts are further scoped to the
      // specific third-party origins Audityxe actually loads.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://apis.google.com https://www.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://generativelanguage.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://ipapi.co https://api.exchangerate-api.com https://image.pollinations.ai https:",
      "frame-src 'self' https://audityxe.firebaseapp.com https://accounts.google.com https://github.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");

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
        ],
      },
    ];
  },
};

module.exports = nextConfig;
