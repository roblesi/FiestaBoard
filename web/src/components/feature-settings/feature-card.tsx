"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TimePicker } from "@/components/ui/time-picker";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Eye, EyeOff, AlertCircle, Copy, Check, Plus, Trash2, ArrowUp, ArrowDown, MapPin, Loader2, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { api, FeatureName, GeneralConfig } from "@/lib/api";
import { LucideIcon } from "lucide-react";
import { ComponentType } from "react";
import { VESTABOARD_COLORS, AVAILABLE_COLORS as VESTA_AVAILABLE_COLORS, VestaboardColorName } from "@/lib/vestaboard-colors";
import { BayWheelsStationFinder } from "./baywheels-station-finder";
import { MuniStopFinder } from "./muni-stop-finder";
import { TrafficRoutePlanner } from "./traffic-route-planner";
import { WeatherLocationManager } from "./weather-location-manager";
import { StockSymbolInput } from "./stock-symbol-input";
import { utcToLocalTime, localTimeToUTC } from "@/lib/timezone-utils";

export interface FeatureField {
  key: string;
  label: string;
  type: "text" | "password" | "select" | "number" | "location" | "time" | "stocks";
  placeholder?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  description?: string;
}

export interface OutputParameter {
  name: string;
  description: string;
  example: string;
  maxChars: number;
  typical?: string;
}

export interface ColorRule {
  condition: string;
  value: string | number;
  color: string;
}

export interface ColorRulesConfig {
  [fieldName: string]: ColorRule[];
}

// Color display helpers - using Vestaboard's official colors
const COLOR_DISPLAY: Record<VestaboardColorName, { bg: string; text: string; hex: string }> = {
  red: { bg: "bg-vesta-red", text: "text-white", hex: VESTABOARD_COLORS.red },
  orange: { bg: "bg-vesta-orange", text: "text-white", hex: VESTABOARD_COLORS.orange },
  yellow: { bg: "bg-vesta-yellow", text: "text-black", hex: VESTABOARD_COLORS.yellow },
  green: { bg: "bg-vesta-green", text: "text-white", hex: VESTABOARD_COLORS.green },
  blue: { bg: "bg-vesta-blue", text: "text-white", hex: VESTABOARD_COLORS.blue },
  violet: { bg: "bg-vesta-violet", text: "text-white", hex: VESTABOARD_COLORS.violet },
  white: { bg: "bg-vesta-white border", text: "text-black", hex: VESTABOARD_COLORS.white },
  black: { bg: "bg-vesta-black", text: "text-white", hex: VESTABOARD_COLORS.black },
};

// Available colors for picker
const AVAILABLE_COLORS = VESTA_AVAILABLE_COLORS;

// Available conditions
const AVAILABLE_CONDITIONS = [
  { value: ">=", label: ">= (greater or equal)" },
  { value: "<=", label: "<= (less or equal)" },
  { value: ">", label: "> (greater than)" },
  { value: "<", label: "< (less than)" },
  { value: "==", label: "== (equals)" },
  { value: "!=", label: "!= (not equals)" },
];

interface FeatureCardProps {
  featureName: FeatureName;
  title: string;
  description: string;
  icon: LucideIcon | ComponentType<{ className?: string }>;
  fields: FeatureField[];
  outputs?: OutputParameter[];
  initialConfig?: Record<string, unknown>;
  isLoading?: boolean;
}

// Selected Stations Display Component (for Bay Wheels)
function SelectedStationsDisplay({
  stationIds,
  stationNames,
  onRemove,
}: {
  stationIds: string[];
  stationNames: string[];
  onRemove: (stationId: string) => void;
}) {
  const [loadedNames, setLoadedNames] = useState<Map<string, string>>(new Map());
  
  // Fetch station names if not available
  useEffect(() => {
    const fetchNames = async () => {
      const missingIds = stationIds.filter((id, index) => !stationNames[index] || stationNames[index] === id);
      if (missingIds.length > 0) {
        try {
          const allStations = await api.listBayWheelsStations();
          const newMap = new Map<string, string>();
          allStations.stations.forEach(station => {
            if (stationIds.includes(station.station_id)) {
              // Prefer name, then address, then ID
              const displayName = station.name || station.address || station.station_id;
              newMap.set(station.station_id, displayName);
            }
          });
          setLoadedNames(newMap);
        } catch (err) {
          console.debug("Failed to fetch station names:", err);
        }
      }
    };
    fetchNames();
  }, [stationIds, stationNames]);

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium">Selected Stations</Label>
      <div className="flex flex-wrap gap-2">
        {stationIds.map((stationId, index) => {
          // Try to get name from: 1) stationNames array, 2) loadedNames map, 3) fallback to ID
          const nameFromArray = stationNames[index];
          const nameFromMap = loadedNames.get(stationId);
          const displayName = nameFromArray && nameFromArray !== stationId 
            ? nameFromArray 
            : (nameFromMap || stationId);
          
          return (
            <Badge key={stationId} variant="secondary" className="flex items-center gap-1 max-w-full">
              <span className="text-xs font-mono text-muted-foreground shrink-0">[{index}]</span>
              <span className="truncate" title={displayName}>{displayName}</span>
              <button
                onClick={() => onRemove(stationId)}
                className="ml-1 hover:text-destructive shrink-0"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Use <code className="bg-muted px-1 rounded">baywheels.stations.{`{index}`}.electric_bikes</code> in templates (e.g., stations.0, stations.1)
      </p>
    </div>
  );
}

// Selected Stops Display Component (for MUNI)
function SelectedStopsDisplay({
  stopCodes,
  stopNames,
  onRemove,
}: {
  stopCodes: string[];
  stopNames: string[];
  onRemove: (stopCode: string) => void;
}) {
  const [loadedNames, setLoadedNames] = useState<Map<string, string>>(new Map());
  
  // Fetch stop names if not available
  useEffect(() => {
    const fetchNames = async () => {
      const missingCodes = stopCodes.filter((code, index) => !stopNames[index] || stopNames[index] === code);
      if (missingCodes.length > 0) {
        try {
          const allStops = await api.listMuniStops();
          const newMap = new Map<string, string>();
          allStops.stops.forEach(stop => {
            if (stopCodes.includes(stop.stop_code)) {
              newMap.set(stop.stop_code, stop.name);
            }
          });
          setLoadedNames(newMap);
        } catch (err) {
          console.debug("Failed to fetch stop names:", err);
        }
      }
    };
    fetchNames();
  }, [stopCodes, stopNames]);

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium">Selected Stops</Label>
      <div className="flex flex-wrap gap-2">
        {stopCodes.map((stopCode, index) => {
          // Try to get name from: 1) stopNames array, 2) loadedNames map, 3) fallback to code
          const nameFromArray = stopNames[index];
          const nameFromMap = loadedNames.get(stopCode);
          const displayName = nameFromArray && nameFromArray !== stopCode 
            ? nameFromArray 
            : (nameFromMap || stopCode);
          
          return (
            <Badge key={stopCode} variant="secondary" className="flex items-center gap-1 max-w-full">
              <span className="text-xs font-mono text-muted-foreground shrink-0">[{index}]</span>
              <span className="truncate" title={displayName}>{displayName}</span>
              <button
                onClick={() => onRemove(stopCode)}
                className="ml-1 hover:text-destructive shrink-0"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Use <code className="bg-muted px-1 rounded">muni.stops.{`{index}`}.line</code> in templates (e.g., stops.0, stops.1)
      </p>
    </div>
  );
}

// Selected Routes Display Component (for Traffic)
function SelectedRoutesDisplay({
  routes,
  onRemove,
}: {
  routes: Array<{ origin: string; destination: string; destination_name: string }>;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium">Selected Routes</Label>
      <div className="space-y-2">
        {routes.map((route, index) => (
          <div key={index} className="flex items-center gap-2 p-2 border rounded-lg bg-muted/30">
            <Badge variant="secondary" className="text-xs font-mono shrink-0">
              [{index}]
            </Badge>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{route.destination_name}</div>
              <div className="text-xs text-muted-foreground truncate">
                {route.origin} → {route.destination}
              </div>
            </div>
            <button
              onClick={() => onRemove(index)}
              className="hover:text-destructive shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Use <code className="bg-muted px-1 rounded">traffic.routes.{`{index}`}.duration_minutes</code> in templates (e.g., routes.0, routes.1)
      </p>
    </div>
  );
}

// Color Rules Editor Component
function ColorRulesEditor({
  featureName,
  colorRules,
  onChange,
  onCopyVar,
  copiedVar,
}: {
  featureName: string;
  colorRules: ColorRulesConfig;
  onChange: (rules: ColorRulesConfig) => void;
  onCopyVar: (varName: string) => void;
  copiedVar: string | null;
}) {
  const [newFieldName, setNewFieldName] = useState("");
  const [showAddField, setShowAddField] = useState(false);

  const handleUpdateRule = (fieldName: string, ruleIndex: number, updates: Partial<ColorRule>) => {
    const newRules = { ...colorRules };
    newRules[fieldName] = [...newRules[fieldName]];
    newRules[fieldName][ruleIndex] = { ...newRules[fieldName][ruleIndex], ...updates };
    onChange(newRules);
  };

  const handleDeleteRule = (fieldName: string, ruleIndex: number) => {
    const newRules = { ...colorRules };
    newRules[fieldName] = newRules[fieldName].filter((_, i) => i !== ruleIndex);
    if (newRules[fieldName].length === 0) {
      delete newRules[fieldName];
    }
    onChange(newRules);
  };

  const handleAddRule = (fieldName: string) => {
    const newRules = { ...colorRules };
    if (!newRules[fieldName]) {
      newRules[fieldName] = [];
    }
    newRules[fieldName] = [...newRules[fieldName], { condition: ">=", value: 0, color: "green" }];
    onChange(newRules);
  };

  const handleMoveRule = (fieldName: string, ruleIndex: number, direction: "up" | "down") => {
    const newRules = { ...colorRules };
    const rules = [...newRules[fieldName]];
    const newIndex = direction === "up" ? ruleIndex - 1 : ruleIndex + 1;
    if (newIndex < 0 || newIndex >= rules.length) return;
    [rules[ruleIndex], rules[newIndex]] = [rules[newIndex], rules[ruleIndex]];
    newRules[fieldName] = rules;
    onChange(newRules);
  };

  const handleAddField = () => {
    if (!newFieldName.trim()) return;
    const newRules = { ...colorRules };
    newRules[newFieldName.trim()] = [{ condition: ">=", value: 0, color: "green" }];
    onChange(newRules);
    setNewFieldName("");
    setShowAddField(false);
  };

  const handleDeleteField = (fieldName: string) => {
    const newRules = { ...colorRules };
    delete newRules[fieldName];
    onChange(newRules);
  };

  const fieldNames = Object.keys(colorRules);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-muted-foreground">
          Dynamic Colors
          <span className="ml-2 text-xs font-normal">(first match wins)</span>
        </h4>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setShowAddField(!showAddField)}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Field
        </Button>
      </div>

      {/* Add new field input */}
      {showAddField && (
        <div className="flex gap-2 p-2 rounded-md border bg-muted/30">
          <input
            type="text"
            value={newFieldName}
            onChange={(e) => setNewFieldName(e.target.value)}
            placeholder="Field name (e.g., temp)"
            className="flex-1 h-8 px-2 text-xs rounded border bg-background"
          />
          <Button size="sm" className="h-8 text-xs" onClick={handleAddField}>
            Add
          </Button>
          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setShowAddField(false)}>
            Cancel
          </Button>
        </div>
      )}

      {fieldNames.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">
          No color rules configured. Add a field to create dynamic colors.
        </p>
      ) : (
        <div className="space-y-3">
          {fieldNames.map((fieldName) => {
            const rules = colorRules[fieldName];
            return (
              <div key={fieldName} className="rounded-md border overflow-hidden">
                {/* Field header */}
                <div className="bg-muted/50 px-3 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                      {featureName}.{fieldName}
                    </code>
                    <span className="text-xs text-muted-foreground">→ color based on value</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onCopyVar(`${fieldName}_color`)}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded hover:bg-muted"
                    >
                      {copiedVar === `${fieldName}_color` ? (
                        <Check className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      <code className="font-mono text-[10px]">{fieldName}_color</code>
                    </button>
                    <button
                      onClick={() => handleDeleteField(fieldName)}
                      className="p-1 text-destructive hover:bg-destructive/10 rounded"
                      title="Delete all rules for this field"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Rules */}
                <div className="divide-y">
                  {rules.map((rule, idx) => {
                    const colorStyle = COLOR_DISPLAY[rule.color as VestaboardColorName] || { bg: "bg-gray-500", text: "text-white", hex: "#6b7280" };
                    return (
                      <div key={idx} className="px-3 py-2 flex items-center gap-2 text-xs">
                        {/* Reorder buttons */}
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => handleMoveRule(fieldName, idx, "up")}
                            disabled={idx === 0}
                            className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleMoveRule(fieldName, idx, "down")}
                            disabled={idx === rules.length - 1}
                            className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </button>
                        </div>

                        {/* Color picker */}
                        <select
                          value={rule.color}
                          onChange={(e) => handleUpdateRule(fieldName, idx, { color: e.target.value })}
                          className="h-7 px-2 rounded border text-xs font-medium"
                          style={{ backgroundColor: colorStyle.hex, color: colorStyle.text === "text-black" ? "#000" : "#fff" }}
                        >
                          {AVAILABLE_COLORS.map((color) => (
                            <option key={color} value={color} className="bg-background text-foreground">
                              {color}
                            </option>
                          ))}
                        </select>

                        <span className="text-muted-foreground shrink-0">when</span>

                        {/* Condition picker */}
                        <select
                          value={rule.condition}
                          onChange={(e) => handleUpdateRule(fieldName, idx, { condition: e.target.value })}
                          className="h-7 px-2 rounded border bg-background text-xs font-mono"
                        >
                          {AVAILABLE_CONDITIONS.map((cond) => (
                            <option key={cond.value} value={cond.value}>
                              {cond.value}
                            </option>
                          ))}
                        </select>

                        {/* Value input */}
                        <input
                          type="text"
                          value={rule.value}
                          onChange={(e) => {
                            const val = e.target.value;
                            // Try to parse as number, otherwise keep as string
                            const numVal = parseFloat(val);
                            handleUpdateRule(fieldName, idx, { 
                              value: isNaN(numVal) ? val : numVal 
                            });
                          }}
                          className="w-20 h-7 px-2 rounded border bg-background text-xs font-mono"
                          placeholder="value"
                        />

                        {/* Delete button */}
                        <button
                          onClick={() => handleDeleteRule(fieldName, idx)}
                          className="p-1 text-destructive hover:bg-destructive/10 rounded ml-auto"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Add rule button */}
                <div className="px-3 py-2 border-t bg-muted/20">
                  <button
                    onClick={() => handleAddRule(fieldName)}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Add rule
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Rules are evaluated in order (first match wins). Use <code className="bg-muted px-1 rounded">{`{{${featureName}.field_color}}`}</code> for just the color tile.
      </p>
    </div>
  );
}

export function FeatureCard({
  featureName,
  title,
  description,
  icon: Icon,
  fields,
  outputs = [],
  initialConfig,
  isLoading = false,
}: FeatureCardProps) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [copiedVar, setCopiedVar] = useState<string | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Fetch general config to get user's timezone (needed for silence_schedule)
  const { data: generalConfig } = useQuery<GeneralConfig>({
    queryKey: ["generalConfig"],
    queryFn: () => api.getGeneralConfig(),
    enabled: featureName === "silence_schedule",
  });

  const userTimezone = generalConfig?.timezone || "America/Los_Angeles";

  // Initialize form data from config
  useEffect(() => {
    if (initialConfig) {
      // For silence_schedule, convert UTC times to local times for display
      if (featureName === "silence_schedule") {
        const startTimeUtc = initialConfig.start_time as string;
        const endTimeUtc = initialConfig.end_time as string;
        
        // Convert from UTC ISO format (e.g., "04:00+00:00") to local HH:MM
        const startTimeLocal = startTimeUtc && userTimezone
          ? utcToLocalTime(startTimeUtc, userTimezone) || "20:00"
          : "20:00";
        const endTimeLocal = endTimeUtc && userTimezone
          ? utcToLocalTime(endTimeUtc, userTimezone) || "07:00"
          : "07:00";

        setFormData({
          enabled: initialConfig.enabled ?? false,
          start_time: startTimeLocal,
          end_time: endTimeLocal,
        });
      } else {
        setFormData(initialConfig);
      }
      setHasChanges(false);
    } else if (featureName === "silence_schedule") {
      // Set default values for silence_schedule if no config exists
      setFormData({
        enabled: false,
        start_time: "20:00",
        end_time: "07:00",
      });
      setHasChanges(false);
    }
  }, [initialConfig, featureName, userTimezone]);

  const enabled = formData.enabled as boolean ?? false;

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.updateFeatureConfig(featureName, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["features-config"] });
      queryClient.invalidateQueries({ queryKey: ["config"] });
      queryClient.invalidateQueries({ queryKey: ["status"] });
      
      // Invalidate live data queries used by VariablePicker sidebar
      // This ensures the template editor sidebar refreshes with new data
      if (featureName === "muni") {
        queryClient.invalidateQueries({ queryKey: ["muni-live-data"] });
      } else if (featureName === "baywheels") {
        queryClient.invalidateQueries({ queryKey: ["baywheels-live-data"] });
      } else if (featureName === "traffic") {
        queryClient.invalidateQueries({ queryKey: ["traffic-live-data"] });
      } else if (featureName === "weather") {
        queryClient.invalidateQueries({ queryKey: ["weather-live-data"] });
      }
      
      toast.success(`${title} settings saved`);
      setHasChanges(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Handle field change
  const handleChange = (key: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  // Handle toggle
  const handleToggle = (checked: boolean) => {
    const newData = { ...formData, enabled: checked };
    setFormData(newData);
    // Immediately save when toggling
    updateMutation.mutate(newData);
  };

  // Handle save
  const handleSave = () => {
    // For silence_schedule, convert local times to UTC before saving
    if (featureName === "silence_schedule") {
      const startTimeLocal = formData.start_time as string;
      const endTimeLocal = formData.end_time as string;

      const startTimeUtc = localTimeToUTC(startTimeLocal, userTimezone);
      const endTimeUtc = localTimeToUTC(endTimeLocal, userTimezone);

      if (!startTimeUtc || !endTimeUtc) {
        toast.error("Invalid time format for silence schedule");
        return;
      }

      updateMutation.mutate({
        ...formData,
        start_time: startTimeUtc,
        end_time: endTimeUtc,
      });
    } else {
      updateMutation.mutate(formData);
    }
  };

  // Auto-save when form data changes (debounced)
  useEffect(() => {
    // Skip if no changes or if a mutation is already in progress
    if (!hasChanges || updateMutation.isPending) {
      return;
    }

    // Debounce auto-save by 1 second
    const timeoutId = setTimeout(() => {
      handleSave();
    }, 1000);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, hasChanges]);

  // Copy template variable
  const handleCopyVar = (varName: string) => {
    const templateVar = `{{${featureName}.${varName}}}`;
    navigator.clipboard.writeText(templateVar);
    setCopiedVar(varName);
    setTimeout(() => setCopiedVar(null), 2000);
    toast.success(`Copied ${templateVar}`);
  };

  // Get current location using browser geolocation
  const handleGetCurrentLocation = (fieldKey: string) => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        // Format as "lat,lon" which works with both WeatherAPI and OpenWeatherMap
        const locationString = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
        handleChange(fieldKey, locationString);
        setIsGettingLocation(false);
        toast.success("Location updated to your current position");
      },
      (error) => {
        setIsGettingLocation(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error("Location permission denied. Please enable location access in your browser.");
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error("Location information is unavailable.");
            break;
          case error.TIMEOUT:
            toast.error("Location request timed out.");
            break;
          default:
            toast.error("Failed to get your location.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Check if secret field has value (masked as ***)
  const hasSecretValue = (key: string) => {
    const value = formData[key];
    return value === "***" || (typeof value === "string" && value.length > 0);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={enabled ? "border-primary/30" : ""}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-md ${enabled ? "bg-primary/10" : "bg-muted"}`}>
              <Icon className={`h-5 w-5 ${enabled ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {title}
                {enabled && (
                  <Badge variant="default" className="text-xs bg-vesta-green">
                    Enabled
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">{description}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={enabled}
              onCheckedChange={handleToggle}
              disabled={updateMutation.isPending}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="h-8 w-8 p-0"
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 space-y-6">
          {/* Weather Location Manager */}
          {(featureName as string) === "weather" && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Locations</h4>
              <WeatherLocationManager
                selectedLocations={(formData.locations as any[]) || (formData.location ? [{
                  location: formData.location as string,
                  name: "HOME"
                }] : [])}
                onLocationsSelected={(locations) => {
                  // Migrate from old location to new locations format
                  const newData = { ...formData };
                  if (locations.length > 0) {
                    newData.locations = locations;
                    // Keep location for backward compatibility if only one location
                    if (locations.length === 1) {
                      newData.location = locations[0].location;
                    } else {
                      delete newData.location;
                    }
                  } else {
                    delete newData.locations;
                    delete newData.location;
                  }
                  setFormData(newData);
                  setHasChanges(true);
                }}
                maxLocations={10}
              />
            </div>
          )}

          {/* Bay Wheels Station Finder */}
          {(featureName as string) === "baywheels" && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Stations</h4>
              <BayWheelsStationFinder
                selectedStationIds={(formData.station_ids as string[]) || (formData.station_id ? [formData.station_id as string] : [])}
                onStationsSelected={(stations) => {
                  // Migrate from old station_id to new station_ids format
                  const newData = { ...formData };
                  if (stations.length > 0) {
                    const stationIds = stations.map(s => s.station_id);
                    const stationNames = stations.map(s => s.name);
                    newData.station_ids = stationIds;
                    newData.station_names = stationNames; // Store names for display
                    // Keep station_id for backward compatibility if only one station
                    if (stationIds.length === 1) {
                      newData.station_id = stationIds[0];
                      newData.station_name = stationNames[0];
                    } else {
                      delete newData.station_id;
                      delete newData.station_name;
                    }
                  } else {
                    delete newData.station_ids;
                    delete newData.station_names;
                    delete newData.station_id;
                    delete newData.station_name;
                  }
                  setFormData(newData);
                  setHasChanges(true);
                }}
                maxStations={20}
              />
              {/* Show currently selected stations */}
              {((formData.station_ids as string[]) || (formData.station_id ? [formData.station_id as string] : [])).length > 0 && (
                <SelectedStationsDisplay
                  stationIds={(formData.station_ids as string[]) || (formData.station_id ? [formData.station_id as string] : [])}
                  stationNames={(formData.station_names as string[]) || (formData.station_name ? [formData.station_name as string] : [])}
                  onRemove={(stationId) => {
                    const currentIds = (formData.station_ids as string[]) || (formData.station_id ? [formData.station_id as string] : []);
                    const currentNames = (formData.station_names as string[]) || (formData.station_name ? [formData.station_name as string] : []);
                    const newIds = currentIds.filter((id) => id !== stationId);
                    const newNames = currentNames.filter((_, i) => currentIds[i] !== stationId);
                    const newData = { ...formData };
                    if (newIds.length > 0) {
                      newData.station_ids = newIds;
                      newData.station_names = newNames;
                      if (newIds.length === 1) {
                        newData.station_id = newIds[0];
                        newData.station_name = newNames[0];
                      } else {
                        delete newData.station_id;
                        delete newData.station_name;
                      }
                    } else {
                      delete newData.station_ids;
                      delete newData.station_names;
                      delete newData.station_id;
                      delete newData.station_name;
                    }
                    setFormData(newData);
                    setHasChanges(true);
                  }}
                />
              )}
            </div>
          )}

          {/* MUNI Stop Finder */}
          {(featureName as string) === "muni" && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Stops</h4>
              <MuniStopFinder
                selectedStopCodes={(formData.stop_codes as string[]) || (formData.stop_code ? [formData.stop_code as string] : [])}
                onStopsSelected={(stops) => {
                  // Migrate from old stop_code to new stop_codes format
                  const newData = { ...formData };
                  if (stops.length > 0) {
                    const stopCodes = stops.map(s => s.stop_code);
                    const stopNames = stops.map(s => s.name);
                    newData.stop_codes = stopCodes;
                    newData.stop_names = stopNames; // Store names for display
                    // Keep stop_code for backward compatibility if only one stop
                    if (stopCodes.length === 1) {
                      newData.stop_code = stopCodes[0];
                    } else {
                      delete newData.stop_code;
                    }
                  } else {
                    delete newData.stop_codes;
                    delete newData.stop_names;
                    delete newData.stop_code;
                  }
                  setFormData(newData);
                  setHasChanges(true);
                }}
                maxStops={20}
              />
              {/* Show currently selected stops */}
              {((formData.stop_codes as string[]) || (formData.stop_code ? [formData.stop_code as string] : [])).length > 0 && (
                <SelectedStopsDisplay
                  stopCodes={(formData.stop_codes as string[]) || (formData.stop_code ? [formData.stop_code as string] : [])}
                  stopNames={(formData.stop_names as string[]) || []}
                  onRemove={(stopCode) => {
                    const currentCodes = (formData.stop_codes as string[]) || (formData.stop_code ? [formData.stop_code as string] : []);
                    const currentNames = (formData.stop_names as string[]) || [];
                    const newCodes = currentCodes.filter((code) => code !== stopCode);
                    const newNames = currentNames.filter((_, i) => currentCodes[i] !== stopCode);
                    const newData = { ...formData };
                    if (newCodes.length > 0) {
                      newData.stop_codes = newCodes;
                      newData.stop_names = newNames;
                      if (newCodes.length === 1) {
                        newData.stop_code = newCodes[0];
                      } else {
                        delete newData.stop_code;
                      }
                    } else {
                      delete newData.stop_codes;
                      delete newData.stop_names;
                      delete newData.stop_code;
                    }
                    setFormData(newData);
                    setHasChanges(true);
                  }}
                />
              )}
            </div>
          )}

          {/* Traffic Route Planner */}
          {(featureName as string) === "traffic" && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Routes</h4>
              <TrafficRoutePlanner
                selectedRoutes={(formData.routes as any[]) || (formData.origin && formData.destination ? [{
                  origin: formData.origin as string,
                  destination: formData.destination as string,
                  destination_name: (formData.destination_name as string) || "DESTINATION",
                  travel_mode: (formData.travel_mode as string) || "DRIVE"
                }] : [])}
                onRoutesSelected={(routes) => {
                  // Migrate from old origin/destination to new routes format
                  const newData = { ...formData };
                  if (routes.length > 0) {
                    newData.routes = routes;
                    // Keep origin/destination for backward compatibility if only one route
                    if (routes.length === 1) {
                      newData.origin = routes[0].origin;
                      newData.destination = routes[0].destination;
                      newData.destination_name = routes[0].destination_name;
                    } else {
                      delete newData.origin;
                      delete newData.destination;
                      delete newData.destination_name;
                    }
                  } else {
                    delete newData.routes;
                    delete newData.origin;
                    delete newData.destination;
                    delete newData.destination_name;
                  }
                  setFormData(newData);
                  setHasChanges(true);
                }}
                maxRoutes={20}
              />
              {/* Show currently selected routes */}
              {((formData.routes as any[]) || []).length > 0 && (
                <SelectedRoutesDisplay
                  routes={(formData.routes as any[]) || []}
                  onRemove={(index) => {
                    const currentRoutes = (formData.routes as any[]) || [];
                    const newRoutes = currentRoutes.filter((_, i) => i !== index);
                    const newData = { ...formData };
                    if (newRoutes.length > 0) {
                      newData.routes = newRoutes;
                      if (newRoutes.length === 1) {
                        newData.origin = newRoutes[0].origin;
                        newData.destination = newRoutes[0].destination;
                        newData.destination_name = newRoutes[0].destination_name;
                      } else {
                        delete newData.origin;
                        delete newData.destination;
                        delete newData.destination_name;
                      }
                    } else {
                      delete newData.routes;
                      delete newData.origin;
                      delete newData.destination;
                      delete newData.destination_name;
                    }
                    setFormData(newData);
                    setHasChanges(true);
                  }}
                />
              )}
            </div>
          )}

          {/* Settings Section */}
          {fields.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Settings</h4>
              {fields.filter((field) => {
                // Hide stop_code field for MUNI (replaced by stop finder)
                if ((featureName as string) === "muni" && field.key === "stop_code") {
                  return false;
                }
                // Hide origin/destination fields for Traffic (replaced by route planner)
                if ((featureName as string) === "traffic" && (field.key === "origin" || field.key === "destination" || field.key === "destination_name")) {
                  return false;
                }
                // Hide location field for weather when using locations array
                if ((featureName as string) === "weather" && field.key === "location" && (formData.locations as any[])?.length > 0) {
                  return false;
                }
                return true;
              }).map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <label className="text-xs font-medium flex items-center gap-1">
                    {field.label}
                    {field.required && enabled && (
                      <span className="text-destructive">*</span>
                    )}
                  </label>
                  
                  {field.type === "select" ? (
                    <select
                      value={(formData[field.key] as string) ?? ""}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      className="w-full h-9 px-3 text-sm rounded-md border bg-background"
                    >
                      {field.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "password" ? (
                    <div className="flex gap-2">
                      <input
                        type={showSecrets[field.key] ? "text" : "password"}
                        value={
                          formData[field.key] === "***" && !showSecrets[field.key]
                            ? ""
                            : ((formData[field.key] as string) ?? "")
                        }
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        placeholder={
                          hasSecretValue(field.key) && !showSecrets[field.key]
                            ? "••••••••••• (value set)"
                            : field.placeholder
                        }
                        className="flex-1 h-9 px-3 text-sm rounded-md border bg-background font-mono"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setShowSecrets((prev) => ({
                            ...prev,
                            [field.key]: !prev[field.key],
                          }))
                        }
                        className="h-9 w-9 p-0"
                      >
                        {showSecrets[field.key] ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ) : field.type === "number" ? (
                    <input
                      type="number"
                      value={(formData[field.key] as number) ?? ""}
                      onChange={(e) => handleChange(field.key, parseInt(e.target.value) || 0)}
                      placeholder={field.placeholder}
                      className="w-full h-9 px-3 text-sm rounded-md border bg-background"
                    />
                  ) : field.type === "location" ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={(formData[field.key] as string) ?? ""}
                          onChange={(e) => handleChange(field.key, e.target.value)}
                          placeholder={field.placeholder}
                          className="flex-1 h-9 px-3 text-sm rounded-md border bg-background"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleGetCurrentLocation(field.key)}
                          disabled={isGettingLocation}
                          className="h-9 px-3 shrink-0"
                          title="Use your current location"
                        >
                          {isGettingLocation ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <MapPin className="h-4 w-4" />
                          )}
                          <span className="ml-1.5 hidden sm:inline">Current Location</span>
                        </Button>
                      </div>
                    </div>
                  ) : field.type === "time" ? (
                    <TimePicker
                      value={(formData[field.key] as string) ?? ""}
                      onChange={(value) => handleChange(field.key, value)}
                      placeholder={field.placeholder}
                    />
                  ) : field.type === "stocks" ? (
                    <StockSymbolInput
                      selectedSymbols={(formData[field.key] as string[]) ?? []}
                      onSymbolsChange={(symbols) => handleChange(field.key, symbols)}
                      maxSymbols={5}
                    />
                  ) : (
                    <input
                      type="text"
                      value={(formData[field.key] as string) ?? ""}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full h-9 px-3 text-sm rounded-md border bg-background"
                    />
                  )}
                  
                  {field.description && (
                    <p className="text-xs text-muted-foreground">{field.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Output Parameters Section */}
          {outputs.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">
                Template Variables
                <span className="ml-2 text-xs font-normal">(click to copy)</span>
              </h4>
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Variable</th>
                      <th className="text-left px-3 py-2 font-medium">Description</th>
                      <th className="text-left px-3 py-2 font-medium">Example</th>
                      <th className="text-center px-3 py-2 font-medium">Max</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {outputs.map((output) => (
                      <tr 
                        key={output.name} 
                        className="hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => handleCopyVar(output.name)}
                      >
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <code className="text-primary font-mono bg-primary/10 px-1.5 py-0.5 rounded">
                              {featureName}.{output.name}
                            </code>
                            {copiedVar === output.name ? (
                              <Check className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Copy className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {output.description}
                        </td>
                        <td className="px-3 py-2">
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {output.example}
                          </code>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Badge variant="outline" className="text-[10px]">
                            {output.maxChars}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground">
                Use in templates as <code className="bg-muted px-1 rounded">{`{{${featureName}.variable}}`}</code>
              </p>
            </div>
          )}

          {/* Color Rules Section */}
          {featureName !== "silence_schedule" && (
            <ColorRulesEditor
              featureName={featureName}
              colorRules={(formData.color_rules as ColorRulesConfig) || {}}
              onChange={(newRules) => {
                handleChange("color_rules", newRules);
              }}
              onCopyVar={handleCopyVar}
              copiedVar={copiedVar}
            />
          )}

          {/* No config needed message */}
          {fields.length === 0 && outputs.length === 0 && (
            <p className="text-sm text-muted-foreground">No additional configuration required.</p>
          )}

          {/* Warning for enabled but missing required fields */}
          {enabled && fields.some((f) => {
            if (!f.required) return false;
            const value = formData[f.key];
            // For password fields, "***" indicates a value is set
            if (f.type === "password") {
              return !hasSecretValue(f.key);
            }
            // For array fields (like stocks symbols), check if array is empty
            if (f.type === "stocks" || Array.isArray(value)) {
              return !value || (Array.isArray(value) && value.length === 0);
            }
            // For other fields, check if value is empty
            return !value || (typeof value === "string" && value.trim() === "");
          }) && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-destructive/10 text-destructive text-xs">
              <AlertCircle className="h-4 w-4" />
              <span>Some required fields are empty</span>
            </div>
          )}

          {/* Auto-save indicator */}
          {updateMutation.isPending && (
            <div className="flex items-center justify-center gap-2 pt-2 text-xs text-muted-foreground">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span>Saving...</span>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
