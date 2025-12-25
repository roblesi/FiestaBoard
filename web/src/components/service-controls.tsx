"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useStatus, useToggleDevMode } from "@/hooks/use-vestaboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { FlaskConical, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

// Cache status response type
interface CacheStatus {
  cached: boolean;
  last_message_hash: string | null;
  last_sent_at: string | null;
  cache_hits: number;
  total_sends: number;
}

export function ServiceControls() {
  const queryClient = useQueryClient();
  const { data: status, isLoading } = useStatus();
  const devModeMutation = useToggleDevMode();

  // Cache status query
  const { data: cacheStatus, refetch: refetchCache } = useQuery<CacheStatus>({
    queryKey: ["cache-status"],
    queryFn: async () => {
      const res = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/cache-status`
          : typeof window !== "undefined" && window.location.hostname === "localhost"
          ? "http://localhost:8000/cache-status"
          : "/api/cache-status"
      );
      if (!res.ok) throw new Error("Failed to fetch cache status");
      return res.json();
    },
    refetchInterval: 10000,
  });

  // Clear cache mutation
  const clearCacheMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/clear-cache`
          : typeof window !== "undefined" && window.location.hostname === "localhost"
          ? "http://localhost:8000/clear-cache"
          : "/api/clear-cache",
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Failed to clear cache");
      return res.json();
    },
    onSuccess: () => {
      refetchCache();
      toast.success("Cache cleared");
    },
    onError: () => {
      toast.error("Failed to clear cache");
    },
  });

  // Force refresh mutation
  const forceRefreshMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/force-refresh`
          : typeof window !== "undefined" && window.location.hostname === "localhost"
          ? "http://localhost:8000/force-refresh"
          : "/api/force-refresh",
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Failed to force refresh");
      return res.json();
    },
    onSuccess: () => {
      refetchCache();
      toast.success("Display force-refreshed");
    },
    onError: () => {
      toast.error("Failed to force refresh");
    },
  });

  const handleDevModeToggle = async (checked: boolean) => {
    try {
      const result = await devModeMutation.mutateAsync(checked);
      toast.success(result.message || `Dev mode ${checked ? "enabled" : "disabled"}`);
    } catch {
      toast.error("Failed to toggle dev mode");
    }
  };

  const isRunning = status?.running ?? false;
  const devMode = status?.config_summary?.dev_mode ?? false;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="text-base sm:text-lg">Service Control</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 sm:px-6">
          <Skeleton className="h-5 w-full max-w-[200px]" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="px-4 sm:px-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base sm:text-lg">Service Control</CardTitle>
          <Badge variant={isRunning ? "default" : "secondary"} className="text-xs">
            {isRunning ? "● Running" : "○ Stopped"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <FlaskConical className="h-4 w-4 text-muted-foreground shrink-0" />
          <Switch
            checked={devMode}
            onCheckedChange={handleDevModeToggle}
            disabled={devModeMutation.isPending}
            id="dev-mode"
          />
          <label htmlFor="dev-mode" className="text-xs sm:text-sm cursor-pointer flex-1">
            Dev Mode
            <span className="text-muted-foreground ml-1">
              {devMode ? "(preview only)" : "(live - sends to board)"}
            </span>
          </label>
        </div>
        
        <p className="text-[10px] text-muted-foreground">
          {devMode 
            ? "Preview mode: Web UI displays content but nothing is sent to the physical board"
            : "Live mode: Content is automatically sent to the physical Vestaboard"}
        </p>

        {/* Cache Status */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs sm:text-sm font-medium">Message Cache</label>
            {cacheStatus?.cached && (
              <Badge variant="secondary" className="text-[10px]">
                Cached
              </Badge>
            )}
          </div>
          {cacheStatus && (
            <div className="text-[10px] sm:text-xs text-muted-foreground space-y-0.5">
              <p>Hits: {cacheStatus.cache_hits} / {cacheStatus.total_sends} sends</p>
              {cacheStatus.last_sent_at && (
                <p>Last sent: {new Date(cacheStatus.last_sent_at).toLocaleTimeString()}</p>
              )}
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-1 mt-3">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-9 sm:h-8 text-xs gap-1.5"
              onClick={() => clearCacheMutation.mutate()}
              disabled={clearCacheMutation.isPending || !cacheStatus?.cached}
            >
              <Trash2 className="h-4 w-4 sm:h-3 sm:w-3" />
              Clear Cache
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-9 sm:h-8 text-xs gap-1.5"
              onClick={() => forceRefreshMutation.mutate()}
              disabled={forceRefreshMutation.isPending}
            >
              <RefreshCw className="h-4 w-4 sm:h-3 sm:w-3" />
              Force Refresh
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

