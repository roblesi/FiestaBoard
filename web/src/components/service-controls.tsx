"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useStatus, useStartService, useStopService, useToggleDevMode } from "@/hooks/use-vestaboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Play, Square, FlaskConical, Monitor, Tv, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

// Output target options
const OUTPUT_TARGETS = [
  { value: "ui" as const, label: "UI Only", icon: Monitor },
  { value: "board" as const, label: "Board Only", icon: Tv },
  { value: "both" as const, label: "Both", icon: null },
];

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
  const startMutation = useStartService();
  const stopMutation = useStopService();
  const devModeMutation = useToggleDevMode();

  // Output settings query
  const { data: outputSettings } = useQuery({
    queryKey: ["output-settings"],
    queryFn: () => api.getOutputSettings(),
    refetchInterval: 30000,
  });

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

  // Update output settings mutation
  const updateOutputMutation = useMutation({
    mutationFn: (target: "ui" | "board" | "both") => api.updateOutputSettings(target),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["output-settings"] });
      toast.success("Output target updated");
    },
    onError: () => {
      toast.error("Failed to update output target");
    },
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

  const handleStart = async () => {
    try {
      const result = await startMutation.mutateAsync();
      toast.success(result.message || "Service started");
    } catch {
      toast.error("Failed to start service");
    }
  };

  const handleStop = async () => {
    try {
      const result = await stopMutation.mutateAsync();
      toast.success(result.message || "Service stopped");
    } catch {
      toast.error("Failed to stop service");
    }
  };

  const handleDevModeToggle = async (checked: boolean) => {
    try {
      const result = await devModeMutation.mutateAsync(checked);
      
      // When enabling dev mode, switch to UI only
      if (checked && outputSettings?.target !== "ui") {
        await updateOutputMutation.mutateAsync("ui");
      }
      
      toast.success(result.message || `Dev mode ${checked ? "enabled" : "disabled"}`);
    } catch {
      toast.error("Failed to toggle dev mode");
    }
  };

  const handleOutputChange = async (target: "ui" | "board" | "both") => {
    try {
      // If switching away from UI only while in dev mode, turn off dev mode
      if (devMode && target !== "ui") {
        await devModeMutation.mutateAsync(false);
        toast.info("Dev mode disabled");
      }
      
      await updateOutputMutation.mutateAsync(target);
    } catch {
      toast.error("Failed to update output target");
    }
  };

  const isRunning = status?.running ?? false;
  const devMode = status?.config_summary?.dev_mode ?? false;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Service Control</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
          <Skeleton className="h-5 w-full max-w-[200px]" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Service Control</CardTitle>
          <Badge variant={isRunning ? "default" : "secondary"} className="text-xs">
            {isRunning ? "● Running" : "○ Stopped"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={handleStart}
            disabled={isRunning || startMutation.isPending}
            variant={isRunning ? "outline" : "default"}
            size="sm"
            className="gap-1.5"
          >
            <Play className="h-3.5 w-3.5" />
            Start
          </Button>
          <Button
            onClick={handleStop}
            disabled={!isRunning || stopMutation.isPending}
            variant={!isRunning ? "outline" : "destructive"}
            size="sm"
            className="gap-1.5"
          >
            <Square className="h-3.5 w-3.5" />
            Stop
          </Button>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <FlaskConical className="h-4 w-4 text-muted-foreground shrink-0" />
          <Switch
            checked={devMode}
            onCheckedChange={handleDevModeToggle}
            disabled={devModeMutation.isPending}
            id="dev-mode"
          />
          <label htmlFor="dev-mode" className="text-xs cursor-pointer">
            Dev Mode
            <span className="text-muted-foreground ml-1">
              {devMode ? "(preview)" : "(live)"}
            </span>
          </label>
        </div>

        {/* Output Target Settings */}
        <div className="pt-2 border-t">
          <label className="text-xs font-medium">Output Target</label>
          <div className="flex gap-1 mt-1.5">
            {OUTPUT_TARGETS.map(({ value, label, icon: Icon }) => (
              <Button
                key={value}
                size="sm"
                variant={outputSettings?.target === value ? "default" : "outline"}
                className="flex-1 h-7 text-xs gap-1"
                onClick={() => handleOutputChange(value)}
                disabled={updateOutputMutation.isPending || devModeMutation.isPending}
              >
                {Icon && <Icon className="h-3 w-3" />}
                {label}
              </Button>
            ))}
          </div>
          {outputSettings && (
            <p className="text-[10px] text-muted-foreground mt-1">
              Effective: {outputSettings.effective_target}
            </p>
          )}
        </div>

        {/* Cache Status */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium">Message Cache</label>
            {cacheStatus?.cached && (
              <Badge variant="secondary" className="text-[10px]">
                Cached
              </Badge>
            )}
          </div>
          {cacheStatus && (
            <div className="text-[10px] text-muted-foreground space-y-0.5">
              <p>Hits: {cacheStatus.cache_hits} / {cacheStatus.total_sends} sends</p>
              {cacheStatus.last_sent_at && (
                <p>Last sent: {new Date(cacheStatus.last_sent_at).toLocaleTimeString()}</p>
              )}
            </div>
          )}
          <div className="flex gap-1 mt-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-7 text-xs gap-1"
              onClick={() => clearCacheMutation.mutate()}
              disabled={clearCacheMutation.isPending || !cacheStatus?.cached}
            >
              <Trash2 className="h-3 w-3" />
              Clear Cache
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-7 text-xs gap-1"
              onClick={() => forceRefreshMutation.mutate()}
              disabled={forceRefreshMutation.isPending}
            >
              <RefreshCw className="h-3 w-3" />
              Force Refresh
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

