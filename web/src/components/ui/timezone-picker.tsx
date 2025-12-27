"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { COMMON_TIMEZONES } from "@/lib/timezone-utils";

interface TimezonePickerProps {
  value: string;
  onChange: (timezone: string) => void;
  className?: string;
  disabled?: boolean;
}

export function TimezonePicker({ value, onChange, className, disabled }: TimezonePickerProps) {
  // Find the display label for the current value
  const currentLabel = useMemo(() => {
    const tz = COMMON_TIMEZONES.find((t) => t.value === value);
    return tz ? tz.label : value;
  }, [value]);

  return (
    <div className={cn("relative", className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        {COMMON_TIMEZONES.map((timezone) => (
          <option key={timezone.value} value={timezone.value}>
            {timezone.label}
          </option>
        ))}
      </select>
    </div>
  );
}
