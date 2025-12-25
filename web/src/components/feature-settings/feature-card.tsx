"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Save, Eye, EyeOff, AlertCircle, Copy, Check, Plus, Trash2, ArrowUp, ArrowDown, MapPin, Loader2 } from "lucide-react";
import { api, FeatureName } from "@/lib/api";
import { LucideIcon } from "lucide-react";
import { VESTABOARD_COLORS, AVAILABLE_COLORS as VESTA_AVAILABLE_COLORS, VestaboardColorName } from "@/lib/vestaboard-colors";

export interface FeatureField {
  key: string;
  label: string;
  type: "text" | "password" | "select" | "number" | "location";
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
  icon: LucideIcon;
  fields: FeatureField[];
  outputs?: OutputParameter[];
  initialConfig?: Record<string, unknown>;
  isLoading?: boolean;
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

  // Initialize form data from config
  useEffect(() => {
    if (initialConfig) {
      setFormData(initialConfig);
      setHasChanges(false);
    }
  }, [initialConfig]);

  const enabled = formData.enabled as boolean ?? false;

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.updateFeatureConfig(featureName, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["features-config"] });
      queryClient.invalidateQueries({ queryKey: ["config"] });
      queryClient.invalidateQueries({ queryKey: ["status"] });
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
    updateMutation.mutate(formData);
  };

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
    <Card className={enabled ? "border-primary/30" : ""}>
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
          {/* Settings Section */}
          {fields.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Settings</h4>
              {fields.map((field) => (
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
          <ColorRulesEditor
            featureName={featureName}
            colorRules={(formData.color_rules as ColorRulesConfig) || {}}
            onChange={(newRules) => {
              handleChange("color_rules", newRules);
            }}
            onCopyVar={handleCopyVar}
            copiedVar={copiedVar}
          />

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
            // For other fields, check if value is empty
            return !value || (typeof value === "string" && value.trim() === "");
          }) && (
            <div className="flex items-center gap-2 p-2 rounded-md bg-destructive/10 text-destructive text-xs">
              <AlertCircle className="h-4 w-4" />
              <span>Some required fields are empty</span>
            </div>
          )}

          {/* Save button */}
          {hasChanges && (
            <div className="pt-2">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
