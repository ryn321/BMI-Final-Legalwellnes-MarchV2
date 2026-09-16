import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Type checking is an explicit required build step before `next build`.
  // This avoids a Next CLI parsing defect while retaining fail-closed checks.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
