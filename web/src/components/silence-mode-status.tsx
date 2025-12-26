"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Moon, Sun, Clock, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { utcToLocalTime, getTimezoneAbbreviation } from "@/lib/timezone-utils";

interface SilenceModeStatusProps {
  className?: string;
  showDetails?: boolean;
}

export function SilenceModeStatus({ className, showDetails = true }: SilenceModeStatusProps) {
  // Fetch general config for timezone
  const { data: generalConfig } = useQuery({
    queryKey: ["generalConfig"],
    queryFn: api.getGeneralConfig,
  });

  // Fetch silence status (poll every minute)
  const { data: silenceStatus, isLoading } = useQuery({
    queryKey: ["silenceStatus"],
    queryFn: api.getSilenceStatus,
    refetchInterval: 60000, // Poll every minute
  });

  if (isLoading || !silenceStatus || !generalConfig) {
    return (
      <div className={className}>
        <Badge variant="secondary" className="gap-1.5">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading...
        </Badge>
      </div>
    );
  }

  if (!silenceStatus.enabled) {
    return (
      <div className={className}>
        <Badge variant="outline" className="gap-1.5">
          <Moon className="h-3 w-3" />
          Silence Mode: Disabled
        </Badge>
      </div>
    );
  }

  const userTimezone = generalConfig.timezone || "America/Los_Angeles";
  const timezoneAbbr = getTimezoneAbbreviation(userTimezone);

  // Convert UTC times to local for display
  const startLocal = utcToLocalTime(silenceStatus.start_time_utc, userTimezone);
  const endLocal = utcToLocalTime(silenceStatus.end_time_utc, userTimezone);
  const nextChangeLocal = utcToLocalTime(silenceStatus.next_change_utc, userTimezone);

  if (silenceStatus.active) {
    return (
      <div className={className}>
        <Badge variant="destructive" className="gap-1.5">
          <Moon className="h-3 w-3" />
          <span>Silence Mode: Active</span>
        </Badge>
        {showDetails && (
          <p className="text-xs text-muted-foreground mt-1">
            <Clock className="h-3 w-3 inline mr-1" />
            Until {nextChangeLocal} {timezoneAbbr}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      <Badge variant="secondary" className="gap-1.5">
        <Sun className="h-3 w-3" />
        <span>Silence Mode: Inactive</span>
      </Badge>
      {showDetails && (
        <p className="text-xs text-muted-foreground mt-1">
          <Clock className="h-3 w-3 inline mr-1" />
          Starts at {nextChangeLocal} {timezoneAbbr}
        </p>
      )}
    </div>
  );
}

// Compact version for use in headers or tight spaces
export function SilenceModeStatusCompact({ className }: { className?: string }) {
  const { data: silenceStatus } = useQuery({
    queryKey: ["silenceStatus"],
    queryFn: api.getSilenceStatus,
    refetchInterval: 60000,
  });

  if (!silenceStatus?.enabled) {
    return null;
  }

  return (
    <Badge 
      variant={silenceStatus.active ? "destructive" : "secondary"} 
      className={className}
    >
      {silenceStatus.active ? (
        <>
          <Moon className="h-3 w-3 mr-1" />
          Silent
        </>
      ) : (
        <>
          <Sun className="h-3 w-3 mr-1" />
          Active
        </>
      )}
    </Badge>
  );
}

