"use client";

import { useStatus, useStartService, useStopService, useToggleDevMode } from "@/hooks/use-vestaboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Play, Square, FlaskConical } from "lucide-react";
import { toast } from "sonner";

export function ServiceControls() {
  const { data: status, isLoading } = useStatus();
  const startMutation = useStartService();
  const stopMutation = useStopService();
  const devModeMutation = useToggleDevMode();

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
        <CardTitle className="text-lg">Service Control</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={handleStart}
            disabled={isRunning || startMutation.isPending}
            variant="default"
            size="sm"
            className="gap-1.5"
          >
            <Play className="h-3.5 w-3.5" />
            Start
          </Button>
          <Button
            onClick={handleStop}
            disabled={!isRunning || stopMutation.isPending}
            variant="destructive"
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
      </CardContent>
    </Card>
  );
}

