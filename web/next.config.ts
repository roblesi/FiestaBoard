import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // NEXT_PUBLIC_API_URL is set via:
  // - Docker env vars for development (http://localhost:8000)
  // - Empty string in production (nginx proxies /api to backend)
  // Don't hardcode here to allow env override
};

export default nextConfig;
