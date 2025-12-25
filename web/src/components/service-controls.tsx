"use client";

import { useStatus, useToggleDevMode } from "@/hooks/use-vestaboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { FlaskConical } from "lucide-react";
import { toast } from "sonner";

export function ServiceControls() {
  const { data: status, isLoading } = useStatus();
  const devModeMutation = useToggleDevMode();

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
      </CardContent>
    </Card>
  );
}

