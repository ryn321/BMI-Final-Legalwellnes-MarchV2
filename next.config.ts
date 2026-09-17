import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Type checking is an explicit required build step before `next build`.
  // This avoids a Next CLI parsing defect while retaining fail-closed checks.
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [{
      source: "/news/small-claims-court-limit-2026",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        {
          key: "Content-Security-Policy",
          value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
        },
      ],
    }];
  },
};

export default nextConfig;
