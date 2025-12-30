"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Monitor, Eye, EyeOff, AlertCircle, Check } from "lucide-react";
import { api, VestaboardConfig } from "@/lib/api";

export function VestaboardSettings() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Partial<VestaboardConfig>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch current config
  const { data: configData, isLoading } = useQuery({
    queryKey: ["vestaboard-config"],
    queryFn: api.getVestaboardConfig,
  });

  // Initialize form
  useEffect(() => {
    if (configData?.config) {
      setFormData(configData.config);
      setHasChanges(false);
    }
  }, [configData]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<VestaboardConfig>) =>
      api.updateVestaboardConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vestaboard-config"] });
      queryClient.invalidateQueries({ queryKey: ["config"] });
      queryClient.invalidateQueries({ queryKey: ["status"] });
      toast.success("Vestaboard settings saved");
      setHasChanges(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Handle field change
  const handleChange = (key: keyof VestaboardConfig, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  // Handle save
  const handleSave = () => {
    updateMutation.mutate(formData);
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

  const apiMode = formData.api_mode ?? "local";
  const hasLocalKey = formData.local_api_key === "***" || (formData.local_api_key && formData.local_api_key.length > 0);
  const hasCloudKey = formData.cloud_key === "***" || (formData.cloud_key && formData.cloud_key.length > 0);
  const hasHost = formData.host && formData.host.length > 0;

  const isConfigValid =
    (apiMode === "local" && hasLocalKey && hasHost) ||
    (apiMode === "cloud" && hasCloudKey);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-primary/10">
              <Monitor className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Vestaboard Connection
                {isConfigValid ? (
                  <Badge variant="default" className="text-xs bg-vesta-green">
                    <Check className="h-3 w-3 mr-1" />
                    Configured
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-xs">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Incomplete
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Configure how to connect to your Vestaboard
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* API Mode */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium">Connection Mode</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleChange("api_mode", "local")}
              className={`p-3 rounded-md border text-left transition-colors ${
                apiMode === "local"
                  ? "border-primary bg-primary/10"
                  : "border-muted hover:border-primary/50"
              }`}
            >
              <div className="text-sm font-medium">Local API</div>
              <div className="text-xs text-muted-foreground">
                Direct connection (faster)
              </div>
            </button>
            <button
              onClick={() => handleChange("api_mode", "cloud")}
              className={`p-3 rounded-md border text-left transition-colors ${
                apiMode === "cloud"
                  ? "border-primary bg-primary/10"
                  : "border-muted hover:border-primary/50"
              }`}
            >
              <div className="text-sm font-medium">Cloud API</div>
              <div className="text-xs text-muted-foreground">
                Via Vestaboard servers
              </div>
            </button>
          </div>
        </div>

        {/* Local API Fields */}
        {apiMode === "local" && (
          <>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">
                Local API Key <span className="text-destructive">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type={showSecrets.local_api_key ? "text" : "password"}
                  value={
                    formData.local_api_key === "***" && !showSecrets.local_api_key
                      ? ""
                      : (formData.local_api_key ?? "")
                  }
                  onChange={(e) => handleChange("local_api_key", e.target.value)}
                  placeholder={hasLocalKey ? "••••••••••• (key set)" : "Enter your local API key"}
                  className="flex-1 h-9 px-3 text-sm rounded-md border bg-background font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setShowSecrets((prev) => ({
                      ...prev,
                      local_api_key: !prev.local_api_key,
                    }))
                  }
                  className="h-9 w-9 p-0"
                >
                  {showSecrets.local_api_key ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Found in your Vestaboard app under Settings → Integrations → Local API
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium">
                Vestaboard Host <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={formData.host ?? ""}
                onChange={(e) => handleChange("host", e.target.value)}
                placeholder="192.168.1.100"
                className="w-full h-9 px-3 text-sm rounded-md border bg-background font-mono"
              />
              <p className="text-xs text-muted-foreground">
                IP address or hostname of your Vestaboard
              </p>
            </div>
          </>
        )}

        {/* Cloud API Fields */}
        {apiMode === "cloud" && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium">
              Read/Write API Key <span className="text-destructive">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type={showSecrets.cloud_key ? "text" : "password"}
                value={
                  formData.cloud_key === "***" && !showSecrets.cloud_key
                    ? ""
                    : (formData.cloud_key ?? "")
                }
                onChange={(e) => handleChange("cloud_key", e.target.value)}
                placeholder={hasCloudKey ? "••••••••••• (key set)" : "Enter your R/W API key"}
                className="flex-1 h-9 px-3 text-sm rounded-md border bg-background font-mono"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setShowSecrets((prev) => ({
                    ...prev,
                    cloud_key: !prev.cloud_key,
                  }))
                }
                className="h-9 w-9 p-0"
              >
                {showSecrets.cloud_key ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Found in your Vestaboard app under Settings → Integrations → Read/Write API
            </p>
          </div>
        )}

        {/* Validation message */}
        {!isConfigValid && (
          <div className="flex items-center gap-2 p-2 rounded-md bg-destructive/10 text-destructive text-xs">
            <AlertCircle className="h-4 w-4" />
            <span>
              {apiMode === "local"
                ? "Local API key and host are required"
                : "Cloud API key is required"}
            </span>
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
    </Card>
  );
}

