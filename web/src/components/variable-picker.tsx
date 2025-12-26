"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DragEvent } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { api } from "@/lib/api";
import { ChevronDown, X, Bike } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { VESTABOARD_COLORS } from "@/lib/vestaboard-colors";

// Color mapping with contrast info - uses Vestaboard's official colors
const COLOR_MAP: Record<string, { bg: string; needsDarkText: boolean }> = {
  red: { bg: VESTABOARD_COLORS.red, needsDarkText: false },
  orange: { bg: VESTABOARD_COLORS.orange, needsDarkText: false },
  yellow: { bg: VESTABOARD_COLORS.yellow, needsDarkText: true },
  green: { bg: VESTABOARD_COLORS.green, needsDarkText: true },
  blue: { bg: VESTABOARD_COLORS.blue, needsDarkText: false },
  violet: { bg: VESTABOARD_COLORS.violet, needsDarkText: false },
  white: { bg: VESTABOARD_COLORS.white, needsDarkText: true },
  black: { bg: VESTABOARD_COLORS.black, needsDarkText: false },
};

interface VariablePickerProps {
  onInsert?: (variable: string) => void;
  showColors?: boolean;
  showSymbols?: boolean;
}

// Collapsible section component
function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border/50 last:border-b-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full py-2 text-left text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="capitalize">{title.replace(/_/g, " ")}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>
      <div
        className={cn(
          "overflow-y-auto transition-all duration-200",
          isOpen ? "max-h-[600px] pb-3" : "max-h-0"
        )}
      >
        {children}
      </div>
    </div>
  );
}

// Variable pill component - matches editor badge style
function VariablePill({
  label,
  value,
  onInsert,
  onDragStart,
}: {
  label: string;
  value: string;
  onInsert: () => void;
  onDragStart: (e: DragEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      draggable
      onDragStart={onDragStart}
      onClick={onInsert}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-mono",
        "bg-indigo-500/15 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300",
        "hover:bg-indigo-500/25 cursor-grab active:cursor-grabbing transition-colors"
      )}
    >
      {label}
    </button>
  );
}

// Color pill component - solid color like in editor
function ColorPill({
  colorName,
  onInsert,
  onDragStart,
}: {
  colorName: string;
  onInsert: () => void;
  onDragStart: (e: DragEvent<HTMLButtonElement>) => void;
}) {
  const colorInfo = COLOR_MAP[colorName.toLowerCase()];
  if (!colorInfo) return null;

  return (
    <button
      type="button"
      draggable
      onDragStart={onDragStart}
      onClick={onInsert}
      style={{ backgroundColor: colorInfo.bg }}
      className={cn(
        "inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-medium",
        "cursor-grab active:cursor-grabbing transition-all hover:scale-105",
        colorInfo.needsDarkText ? "text-black/80" : "text-white/90"
      )}
      aria-label={`${colorName} color`}
    >
      {colorName}
    </button>
  );
}

interface BayWheelsStationData {
  station_id: string;
  station_name: string;
  electric_bikes: number;
  classic_bikes: number;
  num_bikes_available: number;
  status_color: string;
  is_renting: boolean;
  num_docks_available: number;
}

export function VariablePicker({
  onInsert,
  showColors = true,
}: VariablePickerProps) {
  const { data: templateVars, isLoading } = useQuery({
    queryKey: ["template-variables"],
    queryFn: api.getTemplateVariables,
  });

  // Fetch live BayWheels station data
  const { data: baywheelsData } = useQuery({
    queryKey: ["baywheels-live-data"],
    queryFn: async () => {
      try {
        const display = await api.getDisplayRaw("baywheels");
        return display.data as { stations?: BayWheelsStationData[] };
      } catch {
        return null;
      }
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    enabled: templateVars?.variables?.baywheels !== undefined,
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const handleInsert = (variable: string) => {
    if (onInsert) {
      onInsert(variable);
    } else {
      handleCopy(variable);
    }
  };

  const handleDragStart = (e: DragEvent<HTMLButtonElement>, value: string) => {
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("text/plain", value);
    e.dataTransfer.setData("application/x-template-variable", value);
  };

  // Helper to get status emoji
  const getStatusEmoji = (electricBikes: number) => {
    if (electricBikes < 2) return "🔴";
    if (electricBikes > 5) return "🟢";
    return "🟡";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="text-base">Variables & Helpers</CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!templateVars) {
    return null;
  }

  return (
    <Card className="flex flex-col h-full min-h-0">
      <CardHeader className="flex-shrink-0 px-4 sm:px-6 pb-2">
        <CardTitle className="text-base">Template Variables</CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Tap to {onInsert ? "insert" : "copy"} or drag into template
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 flex flex-col overflow-y-auto px-4 sm:px-6 pt-0">
        <div className="space-y-1">
          {/* Data Variables - collapsible by category */}
          <div className="pb-2">
            <h4 className="text-sm font-semibold mb-2">Data Variables</h4>
            {Object.entries(templateVars.variables).map(([category, vars]) => {
              // Special handling for BayWheels with live station data
              if (category === "baywheels" && baywheelsData?.stations && baywheelsData.stations.length > 0) {
                return (
                  <CollapsibleSection key={category} title={category} defaultOpen={true}>
                    <div className="space-y-3">
                      {/* Aggregate/General Variables */}
                      <div>
                        <p className="text-xs text-muted-foreground mb-1.5">General</p>
                        <div className="flex flex-wrap gap-1.5">
                          {vars.filter(v => !v.startsWith("stations.")).map((variable) => {
                            const varValue = `{{${category}.${variable}}}`;
                            return (
                              <VariablePill
                                key={variable}
                                label={variable}
                                value={varValue}
                                onInsert={() => handleInsert(varValue)}
                                onDragStart={(e) => handleDragStart(e, varValue)}
                              />
                            );
                          })}
                        </div>
                      </div>

                      {/* Individual Stations Accordion */}
                      <div className="space-y-1.5">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Bike className="h-3 w-3" />
                          Stations ({baywheelsData.stations.length})
                        </p>
                        <div className="max-h-[400px] overflow-y-auto pr-1">
                          <Accordion type="single" collapsible className="w-full">
                            {baywheelsData.stations.map((station, index) => (
                            <AccordionItem key={station.station_id} value={`station-${index}`} className="border-b-0">
                              <AccordionTrigger className="py-2 hover:no-underline">
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-lg">{getStatusEmoji(station.electric_bikes)}</span>
                                  <div className="text-left">
                                    <div className="font-medium">{station.station_name}</div>
                                    <div className="text-muted-foreground text-xs">
                                      {station.electric_bikes}⚡ {station.classic_bikes}🚲 • Index: {index}
                                    </div>
                                  </div>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="space-y-2 pt-2 pl-2">
                                  <div className="flex flex-wrap gap-1.5">
                                    {["electric_bikes", "classic_bikes", "num_bikes_available", "status_color", "is_renting", "station_name"].map((field) => {
                                      const varValue = `{{${category}.stations.${index}.${field}}}`;
                                      return (
                                        <VariablePill
                                          key={field}
                                          label={field}
                                          value={varValue}
                                          onInsert={() => handleInsert(varValue)}
                                          onDragStart={(e) => handleDragStart(e, varValue)}
                                        />
                                      );
                                    })}
                                  </div>
                                  <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                                    <code className="text-xs">stations.{index}.*</code>
                                  </div>
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                          </Accordion>
                        </div>
                      </div>
                    </div>
                  </CollapsibleSection>
                );
              }

              // Default handling for other categories
              return (
                <CollapsibleSection key={category} title={category} defaultOpen={true}>
                  <div className="flex flex-wrap gap-1.5">
                    {vars.map((variable) => {
                      const varValue = `{{${category}.${variable}}}`;
                      return (
                        <VariablePill
                          key={variable}
                          label={variable}
                          value={varValue}
                          onInsert={() => handleInsert(varValue)}
                          onDragStart={(e) => handleDragStart(e, varValue)}
                        />
                      );
                    })}
                  </div>
                </CollapsibleSection>
              );
            })}
          </div>

          {/* Colors */}
          {showColors && Object.keys(templateVars.colors).length > 0 && (
            <div className="py-2 border-t border-border/50">
              <h4 className="text-sm font-semibold mb-3">Colors</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(templateVars.colors).map(([colorName]) => {
                  const colorValue = `{${colorName}}`;
                  return (
                    <ColorPill
                      key={colorName}
                      colorName={colorName}
                      onInsert={() => handleInsert(colorValue)}
                      onDragStart={(e) => handleDragStart(e, colorValue)}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Formatting */}
          {templateVars.formatting && Object.keys(templateVars.formatting).length > 0 && (
            <div className="py-2 border-t border-border/50">
              <h4 className="text-sm font-semibold mb-3">Formatting</h4>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(templateVars.formatting).map(([name, info]) => (
                  <VariablePill
                    key={name}
                    label={name.replace(/_/g, " ")}
                    value={info.syntax}
                    onInsert={() => handleInsert(info.syntax)}
                    onDragStart={(e) => handleDragStart(e, info.syntax)}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Use fill_space to push content apart: {"Left{{fill_space}}Right"}
              </p>
            </div>
          )}

          {/* Filters */}
          {templateVars.filters.length > 0 && (
            <div className="py-2 border-t border-border/50">
              <h4 className="text-sm font-semibold mb-3">Filters</h4>
              <div className="flex flex-wrap gap-1.5">
                {templateVars.filters.map((filter) => (
                  <Badge
                    key={filter}
                    variant="secondary"
                    className="cursor-pointer text-xs py-1 px-2 font-mono active:bg-muted"
                    onClick={() => handleCopy(`|${filter}`)}
                  >
                    |{filter}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Example: {"{{weather.temperature|upper}}"}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
