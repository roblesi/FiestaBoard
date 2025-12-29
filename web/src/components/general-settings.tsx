"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TimePicker } from "@/components/ui/time-picker";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Settings, Save, Clock, FlaskConical, Moon, RefreshCw, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { TimezonePicker } from "@/components/ui/timezone-picker";
import { formatInTimeZone } from "date-fns-tz";
import { useStatus, useToggleDevMode } from "@/hooks/use-vestaboard";
import { utcToLocalTime, localTimeToUTC } from "@/lib/timezone-utils";

export function GeneralSettings() {
  const queryClient = useQueryClient();
  const [hasChanges, setHasChanges] = useState(false);
  const [timezone, setTimezone] = useState("America/Los_Angeles");
  const [silenceEnabled, setSilenceEnabled] = useState(false);
  const [silenceStartTime, setSilenceStartTime] = useState("20:00");
  const [silenceEndTime, setSilenceEndTime] = useState("07:00");
  const [pollingInterval, setPollingInterval] = useState(60);

  // Fetch general config
  const { data: generalConfig, isLoading: isLoadingConfig } = useQuery({
    queryKey: ["generalConfig"],
    queryFn: api.getGeneralConfig,
  });

  // Fetch silence schedule config
  const { data: silenceConfig, isLoading: isLoadingSilence } = useQuery({
    queryKey: ["features-config", "silence_schedule"],
    queryFn: () => api.getFeatureConfig("silence_schedule"),
  });

  // Fetch polling settings
  const { data: pollingSettings, isLoading: isLoadingPolling } = useQuery({
    queryKey: ["polling-settings"],
    queryFn: api.getPollingSettings,
  });

  // Fetch service status
  const { data: status, isLoading: isLoadingStatus } = useStatus();
  const devModeMutation = useToggleDevMode();

  // Initialize form data when config loads
  useEffect(() => {
    if (generalConfig) {
      setTimezone(generalConfig.timezone || "America/Los_Angeles");
    }
  }, [generalConfig]);

  // Initialize silence schedule when config loads
  useEffect(() => {
    if (silenceConfig?.config && generalConfig?.timezone) {
      const userTimezone = generalConfig.timezone;
      const config = silenceConfig.config;
      
      setSilenceEnabled((config.enabled as boolean) ?? false);
      
      // Convert UTC times to local for display
      const startUtc = config.start_time as string;
      const endUtc = config.end_time as string;
      
      if (startUtc && endUtc) {
        const startLocal = utcToLocalTime(startUtc, userTimezone) || "20:00";
        const endLocal = utcToLocalTime(endUtc, userTimezone) || "07:00";
        setSilenceStartTime(startLocal);
        setSilenceEndTime(endLocal);
      }
      
      setHasChanges(false);
    }
  }, [silenceConfig, generalConfig?.timezone]);

  // Initialize polling interval when settings load
  useEffect(() => {
    if (pollingSettings) {
      setPollingInterval(pollingSettings.interval_seconds);
    }
  }, [pollingSettings]);

  // Update general config mutation
  const updateGeneralMutation = useMutation({
    mutationFn: api.updateGeneralConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["generalConfig"] });
      queryClient.invalidateQueries({ queryKey: ["config"] });
      toast.success("Settings saved successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to save settings: ${error.message}`);
    },
  });

  // Update silence schedule mutation
  const updateSilenceMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => 
      api.updateFeatureConfig("silence_schedule", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["features-config"] });
      queryClient.invalidateQueries({ queryKey: ["config"] });
      toast.success("Settings saved successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to save silence schedule: ${error.message}`);
    },
  });

  // Update polling settings mutation
  const updatePollingMutation = useMutation({
    mutationFn: (interval: number) => api.updatePollingSettings(interval),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["polling-settings"] });
      if (data.requires_restart) {
        toast.success("Polling interval updated. Restart service to apply changes.", {
          duration: 5000,
        });
      } else {
        toast.success("Polling interval updated");
      }
      setHasChanges(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update polling interval: ${error.message}`);
    },
  });

  const handleTimezoneChange = (newTimezone: string) => {
    setTimezone(newTimezone);
    setHasChanges(true);
  };

  const handlePollingIntervalChange = (value: string) => {
    const interval = parseInt(value, 10);
    if (!isNaN(interval) && interval >= 10) {
      setPollingInterval(interval);
      setHasChanges(true);
    }
  };

  const handleSilenceToggle = (checked: boolean) => {
    setSilenceEnabled(checked);
    setHasChanges(true);
  };

  const handleSilenceTimeChange = (field: "start" | "end", value: string) => {
    if (field === "start") {
      setSilenceStartTime(value);
    } else {
      setSilenceEndTime(value);
    }
    setHasChanges(true);
  };

  const handleSave = async () => {
    const promises = [];
    
    // Save timezone if changed
    promises.push(
      updateGeneralMutation.mutateAsync({ timezone })
    );
    
    // Save silence schedule if changed
    const startUtc = localTimeToUTC(silenceStartTime, timezone);
    const endUtc = localTimeToUTC(silenceEndTime, timezone);
    
    if (startUtc && endUtc) {
      promises.push(
        updateSilenceMutation.mutateAsync({
          enabled: silenceEnabled,
          start_time: startUtc,
          end_time: endUtc,
        })
      );
    }
    
    await Promise.all(promises);
    setHasChanges(false);
  };

  const handleDevModeToggle = async (checked: boolean) => {
    try {
      const result = await devModeMutation.mutateAsync(checked);
      toast.success(result.message || `Dev mode ${checked ? "enabled" : "disabled"}`);
    } catch {
      toast.error("Failed to toggle dev mode");
    }
  };

  // Get current time in selected timezone for display
  const getCurrentTimeInTimezone = () => {
    try {
      const now = new Date();
      return formatInTimeZone(now, timezone, "h:mm:ss a zzz");
    } catch {
      return "Invalid timezone";
    }
  };

  const isLoading = isLoadingConfig || isLoadingStatus || isLoadingSilence || isLoadingPolling;
  const isRunning = status?.running ?? false;
  const devMode = status?.config_summary?.dev_mode ?? false;
  const isSaving = updateGeneralMutation.isPending || updateSilenceMutation.isPending || updatePollingMutation.isPending;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            General Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              General Settings
            </CardTitle>
            <CardDescription>
              Configure global settings and service control
            </CardDescription>
          </div>
          <Badge variant={isRunning ? "default" : "secondary"} className="text-xs">
            {isRunning ? "● Running" : "○ Stopped"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Dev Mode Toggle */}
        <div className="flex items-center gap-3 pb-6 border-b">
          <FlaskConical className="h-4 w-4 text-muted-foreground shrink-0" />
          <Switch
            checked={devMode}
            onCheckedChange={handleDevModeToggle}
            disabled={devModeMutation.isPending}
            id="dev-mode"
          />
          <label htmlFor="dev-mode" className="text-sm cursor-pointer flex-1">
            Dev Mode{" "}
            <span className="text-muted-foreground">
              {devMode ? "(preview only)" : ""}
            </span>
          </label>
        </div>

        {/* Timezone & Polling Interval - Side by Side */}
        <div className="pb-6 border-b">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Timezone Setting */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <Label htmlFor="timezone" className="text-sm font-medium">
                    Timezone
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    All times in the application will be displayed in this timezone
                  </p>
                </div>
              </div>
              
              <TimezonePicker
                value={timezone}
                onChange={handleTimezoneChange}
              />
              
              {/* Current time display */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Current time: {getCurrentTimeInTimezone()}</span>
              </div>
            </div>

            {/* Polling Interval Setting */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1">
                  <Label htmlFor="polling-interval" className="text-sm font-medium">
                    Board Update Interval
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    How often the board checks for content updates (in seconds)
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Input
                  id="polling-interval"
                  type="number"
                  min={10}
                  max={3600}
                  value={pollingInterval}
                  onChange={(e) => handlePollingIntervalChange(e.target.value)}
                  disabled={isSaving}
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground">seconds</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <span>Requires service restart</span>
              </div>
            </div>
          </div>
        </div>

        {/* Silence Schedule */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Moon className="h-4 w-4 text-muted-foreground shrink-0" />
            <Switch
              checked={silenceEnabled}
              onCheckedChange={handleSilenceToggle}
              disabled={isSaving}
              id="silence-enabled"
            />
            <div className="flex-1">
              <label htmlFor="silence-enabled" className="text-sm font-medium cursor-pointer">
                Silence Schedule
              </label>
              <p className="text-xs text-muted-foreground">
                Prevent Vestaboard updates during specified hours
              </p>
            </div>
          </div>

          {silenceEnabled && (
            <div className="ml-7 space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="silence-start" className="text-xs">Start Time</Label>
                  <TimePicker
                    value={silenceStartTime}
                    onChange={(val) => handleSilenceTimeChange("start", val)}
                    disabled={isSaving}
                  />
                  <p className="text-xs text-muted-foreground">When silence begins</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="silence-end" className="text-xs">End Time</Label>
                  <TimePicker
                    value={silenceEndTime}
                    onChange={(val) => handleSilenceTimeChange("end", val)}
                    disabled={isSaving}
                  />
                  <p className="text-xs text-muted-foreground">When silence ends</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
        {hasChanges && (
          <div className="flex justify-end pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

