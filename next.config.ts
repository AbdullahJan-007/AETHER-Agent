import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev-mode indicator renders a portal overlay in the bottom-left corner
  // that sits on top of real page content — confirmed via elementFromPoint that
  // it was silently swallowing clicks meant for the attach button underneath it
  // during `npm run dev`. Production builds never render this at all, but local
  // dev is the everyday experience, so it needs to not eat clicks there either.
  devIndicators: false,

  async headers() {
    // Strong security headers for the entire app (defense in depth).
    // CSP is tuned for Next.js + Sonner + our internal /api/chat SSE streaming.
    // No external script/style sources besides what Next bundles.
    // connect-src 'self' covers the client fetch to our API (LLM calls happen server-side).
    const securityHeaders = [
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js dev + prod requirements; prod can be tightened with nonces if desired
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob:",
          "font-src 'self' data:",
          "connect-src 'self'", // Gemini calls happen server-side (route.ts) — the browser never talks to Google directly
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join('; '),
      },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'clipboard-write=(self)' },
      // HSTS - only enable in prod with a real domain + HTTPS
      // { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
    ];

    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      // Slightly looser for the streaming chat endpoint if needed (SSE works fine with above)
      {
        source: '/api/agent',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
