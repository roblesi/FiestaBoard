import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Run as a server (not static export)
  // NEXT_PUBLIC_API_URL is set via:
  // - Docker env vars for development (http://localhost:8000)
  // - Production: Set to http://vestaboard-api:8000 or external URL
  // Don't hardcode here to allow env override
};

export default nextConfig;
