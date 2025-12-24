"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Save, Eye, EyeOff, AlertCircle, Copy, Check } from "lucide-react";
import { api, FeatureName } from "@/lib/api";
import { LucideIcon } from "lucide-react";

export interface FeatureField {
  key: string;
  label: string;
  type: "text" | "password" | "select" | "number";
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
                  <Badge variant="default" className="text-xs bg-emerald-600">
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

          {/* No config needed message */}
          {fields.length === 0 && outputs.length === 0 && (
            <p className="text-sm text-muted-foreground">No additional configuration required.</p>
          )}

          {/* Warning for enabled but missing required fields */}
          {enabled && fields.some((f) => f.required && !formData[f.key]) && (
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
