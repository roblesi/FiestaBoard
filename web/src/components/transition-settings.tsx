"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, TransitionSettings } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Wand2, RotateCcw, Play } from "lucide-react";
import { useState, useEffect } from "react";

// Strategy display names
const STRATEGY_LABELS: Record<string, string> = {
  column: "Wave (Left to Right)",
  "reverse-column": "Drift (Right to Left)",
  "edges-to-center": "Curtain (Outside In)",
  row: "Row (Top to Bottom)",
  diagonal: "Diagonal (Corner to Corner)",
  random: "Random",
};

export function TransitionSettingsComponent() {
  const queryClient = useQueryClient();
  
  // Fetch current settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["transition-settings"],
    queryFn: api.getTransitionSettings,
    refetchInterval: 30000, // Refresh every 30s
  });

  // Local state for form
  const [strategy, setStrategy] = useState<string | null>(null);
  const [intervalMs, setIntervalMs] = useState<number | null>(null);
  const [stepSize, setStepSize] = useState<number | null>(null);

  // Sync local state with fetched settings
  useEffect(() => {
    if (settings) {
      setStrategy(settings.strategy);
      setIntervalMs(settings.step_interval_ms);
      setStepSize(settings.step_size);
    }
  }, [settings]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (newSettings: Partial<TransitionSettings>) =>
      api.updateTransitionSettings(newSettings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transition-settings"] });
      toast.success("Transition settings updated");
    },
    onError: () => {
      toast.error("Failed to update settings");
    },
  });

  // Test transition mutation (send weather display with current settings)
  const testMutation = useMutation({
    mutationFn: () => api.sendDisplay("weather_datetime", "board"),
    onSuccess: () => {
      toast.success("Test message sent to board");
    },
    onError: () => {
      toast.error("Failed to send test message");
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      strategy,
      step_interval_ms: intervalMs,
      step_size: stepSize,
    });
  };

  const handleReset = () => {
    updateMutation.mutate({
      strategy: null,
      step_interval_ms: null,
      step_size: null,
    });
    setStrategy(null);
    setIntervalMs(null);
    setStepSize(null);
  };

  const hasChanges =
    strategy !== settings?.strategy ||
    intervalMs !== settings?.step_interval_ms ||
    stepSize !== settings?.step_size;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Wand2 className="h-4 w-4" />
            Transitions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Wand2 className="h-4 w-4" />
          Transitions
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Control how the board animates when displaying new messages
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Strategy selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium">Animation Style</label>
          <select
            value={strategy || ""}
            onChange={(e) => setStrategy(e.target.value || null)}
            className="w-full h-8 px-2 text-sm rounded-md border bg-background"
          >
            <option value="">None (Instant)</option>
            {settings?.available_strategies?.map((s) => (
              <option key={s} value={s}>
                {STRATEGY_LABELS[s] || s}
              </option>
            ))}
          </select>
        </div>

        {/* Interval slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <label className="text-xs font-medium">Step Interval</label>
            <span className="text-xs text-muted-foreground">
              {intervalMs ? `${intervalMs}ms` : "Fast"}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="2000"
            step="100"
            value={intervalMs || 0}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              setIntervalMs(val === 0 ? null : val);
            }}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-muted"
            disabled={!strategy}
          />
          <p className="text-[10px] text-muted-foreground">
            Delay between animation steps
          </p>
        </div>

        {/* Step size */}
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <label className="text-xs font-medium">Step Size</label>
            <span className="text-xs text-muted-foreground">
              {stepSize || 1} {stepSize === 1 || !stepSize ? "column" : "columns"}
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="11"
            step="1"
            value={stepSize || 1}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              setStepSize(val === 1 ? null : val);
            }}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-muted"
            disabled={!strategy}
          />
          <p className="text-[10px] text-muted-foreground">
            Columns/rows animated at once
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || updateMutation.isPending}
            className="flex-1"
          >
            {updateMutation.isPending ? "Saving..." : "Save"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleReset}
            disabled={updateMutation.isPending}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending}
            title="Test transition on board"
          >
            <Play className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

