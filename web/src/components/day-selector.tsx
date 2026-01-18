"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DayPattern } from "@/lib/api";

interface DaySelectorProps {
  value: DayPattern;
  customDays?: string[];
  onChange: (pattern: DayPattern, customDays?: string[]) => void;
  className?: string;
}

const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"];
const WEEKENDS = ["saturday", "sunday"];
const ALL_DAYS = [...WEEKDAYS, ...WEEKENDS];

const DAY_LABELS: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

export function DaySelector({ value, customDays = [], onChange, className }: DaySelectorProps) {
  const [selectedCustomDays, setSelectedCustomDays] = useState<string[]>(customDays);

  // Update selectedCustomDays when customDays prop changes
  useEffect(() => {
    setSelectedCustomDays(customDays);
  }, [customDays]);

  const handlePatternChange = (pattern: DayPattern) => {
    if (pattern === "custom") {
      onChange(pattern, selectedCustomDays.length > 0 ? selectedCustomDays : ["monday"]);
    } else {
      onChange(pattern, undefined);
    }
  };

  const handleCustomDayToggle = (day: string) => {
    const newCustomDays = selectedCustomDays.includes(day)
      ? selectedCustomDays.filter((d) => d !== day)
      : [...selectedCustomDays, day];
    
    // Ensure at least one day is selected
    if (newCustomDays.length > 0) {
      setSelectedCustomDays(newCustomDays);
      onChange("custom", newCustomDays);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <Label>Days</Label>
      
      {/* Pattern Radio Buttons */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => handlePatternChange("all")}
          className={cn(
            "flex items-center gap-2 rounded-lg border px-4 py-3 text-left transition-colors",
            value === "all"
              ? "border-primary bg-primary/5 text-primary"
              : "border-border hover:bg-accent"
          )}
        >
          <div
            className={cn(
              "h-4 w-4 rounded-full border-2 flex items-center justify-center",
              value === "all"
                ? "border-primary"
                : "border-muted-foreground"
            )}
          >
            {value === "all" && (
              <div className="h-2 w-2 rounded-full bg-primary" />
            )}
          </div>
          <span className="text-sm font-medium">All Days</span>
          <div className="ml-auto flex gap-1">
            {ALL_DAYS.map((day) => (
              <Badge
                key={day}
                variant="secondary"
                className="text-xs"
              >
                {DAY_LABELS[day]}
              </Badge>
            ))}
          </div>
        </button>

        <button
          type="button"
          onClick={() => handlePatternChange("weekdays")}
          className={cn(
            "flex items-center gap-2 rounded-lg border px-4 py-3 text-left transition-colors",
            value === "weekdays"
              ? "border-primary bg-primary/5 text-primary"
              : "border-border hover:bg-accent"
          )}
        >
          <div
            className={cn(
              "h-4 w-4 rounded-full border-2 flex items-center justify-center",
              value === "weekdays"
                ? "border-primary"
                : "border-muted-foreground"
            )}
          >
            {value === "weekdays" && (
              <div className="h-2 w-2 rounded-full bg-primary" />
            )}
          </div>
          <span className="text-sm font-medium">Weekdays (Mon-Fri)</span>
          <div className="ml-auto flex gap-1">
            {WEEKDAYS.map((day) => (
              <Badge
                key={day}
                variant="secondary"
                className="text-xs"
              >
                {DAY_LABELS[day]}
              </Badge>
            ))}
          </div>
        </button>

        <button
          type="button"
          onClick={() => handlePatternChange("weekends")}
          className={cn(
            "flex items-center gap-2 rounded-lg border px-4 py-3 text-left transition-colors",
            value === "weekends"
              ? "border-primary bg-primary/5 text-primary"
              : "border-border hover:bg-accent"
          )}
        >
          <div
            className={cn(
              "h-4 w-4 rounded-full border-2 flex items-center justify-center",
              value === "weekends"
                ? "border-primary"
                : "border-muted-foreground"
            )}
          >
            {value === "weekends" && (
              <div className="h-2 w-2 rounded-full bg-primary" />
            )}
          </div>
          <span className="text-sm font-medium">Weekends (Sat-Sun)</span>
          <div className="ml-auto flex gap-1">
            {WEEKENDS.map((day) => (
              <Badge
                key={day}
                variant="secondary"
                className="text-xs"
              >
                {DAY_LABELS[day]}
              </Badge>
            ))}
          </div>
        </button>

        <button
          type="button"
          onClick={() => handlePatternChange("custom")}
          className={cn(
            "flex flex-col gap-2 rounded-lg border px-4 py-3 text-left transition-colors",
            value === "custom"
              ? "border-primary bg-primary/5 text-primary"
              : "border-border hover:bg-accent"
          )}
        >
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "h-4 w-4 rounded-full border-2 flex items-center justify-center",
                value === "custom"
                  ? "border-primary"
                  : "border-muted-foreground"
              )}
            >
              {value === "custom" && (
                <div className="h-2 w-2 rounded-full bg-primary" />
              )}
            </div>
            <span className="text-sm font-medium">Custom Days</span>
          </div>

          {/* Custom Day Checkboxes */}
          {value === "custom" && (
            <div className="ml-6 flex flex-wrap gap-2 pt-2">
              {ALL_DAYS.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCustomDayToggle(day);
                  }}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                    selectedCustomDays.includes(day)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-accent"
                  )}
                >
                  {DAY_LABELS[day]}
                </button>
              ))}
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
