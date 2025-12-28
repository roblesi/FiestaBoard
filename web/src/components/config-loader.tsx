"use client";

import { useEffect, useState } from "react";
import { loadRuntimeConfig } from "@/lib/api";

/**
 * Component that loads runtime configuration at app startup.
 * This ensures the API URL is fetched before any API calls are made.
 */
export function ConfigLoader({ children }: { children: React.ReactNode }) {
  const [configLoaded, setConfigLoaded] = useState(false);

  useEffect(() => {
    loadRuntimeConfig().then(() => {
      setConfigLoaded(true);
    });
  }, []);

  // Show loading state while config is being fetched
  if (!configLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

