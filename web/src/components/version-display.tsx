"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Package } from "lucide-react";

export function VersionDisplay() {
  const { data: version } = useQuery({
    queryKey: ["version"],
    queryFn: () => api.getVersion(),
    staleTime: Infinity, // Version doesn't change often
    retry: false,
  });

  if (!version) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Package className="h-3 w-3" />
      <span suppressHydrationWarning>
        v{version.package_version}
        {version.is_dev && " (dev)"}
      </span>
    </div>
  );
}

