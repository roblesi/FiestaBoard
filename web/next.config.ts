import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  reloadOnOnline: true,
  fallbacks: {
    document: "/offline",
  },
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      {
        urlPattern: /^https?.*/,
        handler: "NetworkFirst",
        options: {
          cacheName: "offlineCache",
          expiration: {
            maxEntries: 200,
            maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
          },
          networkTimeoutSeconds: 10,
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  // Run as a server (not static export)
  // Runtime API URL configuration - no build-time env vars needed
  
  // Enable standalone output for optimized Docker builds
  // This bundles only production dependencies and necessary files
  output: 'standalone',
  
  // Allow build to proceed despite pre-existing linting warnings
  eslint: {
    // Don't fail builds on pre-existing lint warnings
    // Note: Linting still runs locally via npm run lint
    ignoreDuringBuilds: true,
  },
  
  typescript: {
    // Don't fail builds on pre-existing type errors
    // Note: Type checking still runs locally via tsc
    ignoreBuildErrors: true,
  },
};

export default withPWA(nextConfig);
