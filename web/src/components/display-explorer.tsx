"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Layers,
  Eye,
  Send,
  Code,
  ChevronRight,
  X,
  Cloud,
  Clock,
  Home,
  Music,
  Wifi,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { api, DisplayInfo, DisplayResponse, DisplayRawResponse } from "@/lib/api";

// Icons for display types
const DISPLAY_ICONS: Record<string, typeof Cloud> = {
  weather: Cloud,
  datetime: Clock,
  weather_datetime: Cloud,
  home_assistant: Home,
  apple_music: Music,
  star_trek: Sparkles,
  guest_wifi: Wifi,
};

interface DisplayExplorerProps {
  onClose?: () => void;
}

export function DisplayExplorer({ onClose }: DisplayExplorerProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"formatted" | "raw">("formatted");
  const [previewData, setPreviewData] = useState<DisplayResponse | null>(null);
  const [rawData, setRawData] = useState<DisplayRawResponse | null>(null);

  // Fetch all displays
  const { data: displaysData, isLoading } = useQuery({
    queryKey: ["displays"],
    queryFn: () => api.getDisplays(),
    refetchInterval: 30000,
  });

  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: (type: string) => api.getDisplay(type),
    onSuccess: (data) => {
      setPreviewData(data);
      setViewMode("formatted");
    },
    onError: () => {
      toast.error("Failed to load preview");
    },
  });

  // Raw data mutation
  const rawMutation = useMutation({
    mutationFn: (type: string) => api.getDisplayRaw(type),
    onSuccess: (data) => {
      setRawData(data);
      setViewMode("raw");
    },
    onError: () => {
      toast.error("Failed to load raw data");
    },
  });

  // Send display mutation
  const sendMutation = useMutation({
    mutationFn: (type: string) => api.sendDisplay(type),
    onSuccess: (result) => {
      toast.success(result.message || "Display sent to board");
    },
    onError: () => {
      toast.error("Failed to send display");
    },
  });

  const handleSelectType = (type: string) => {
    setSelectedType(type);
    setPreviewData(null);
    setRawData(null);
    previewMutation.mutate(type);
  };

  const displays = displaysData?.displays || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Display Sources
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Display Sources
          </CardTitle>
          {onClose && (
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {displaysData?.available_count} of {displaysData?.total} sources available
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Display grid */}
        <div className="grid grid-cols-2 gap-2">
          {displays.map((display: DisplayInfo) => {
            const Icon = DISPLAY_ICONS[display.type] || Layers;
            const isSelected = selectedType === display.type;

            return (
              <button
                key={display.type}
                onClick={() => display.available && handleSelectType(display.type)}
                disabled={!display.available}
                className={`flex items-center gap-2 p-2 rounded-md border transition-all ${
                  isSelected
                    ? "border-primary bg-primary/10"
                    : display.available
                    ? "border-muted hover:border-primary/50 hover:bg-muted/50"
                    : "border-muted bg-muted/30 opacity-50 cursor-not-allowed"
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    isSelected
                      ? "text-primary"
                      : display.available
                      ? "text-muted-foreground"
                      : "text-muted-foreground/50"
                  }`}
                />
                <span className="text-xs truncate flex-1 text-left">
                  {display.type.replace(/_/g, " ")}
                </span>
                {display.available ? (
                  <Badge variant="secondary" className="text-[8px] shrink-0">
                    OK
                  </Badge>
                ) : (
                  <AlertCircle className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Preview area */}
        {selectedType && (
          <div className="border rounded-lg overflow-hidden">
            {/* Preview header */}
            <div className="flex items-center justify-between p-2 bg-muted/30 border-b">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium capitalize">
                  {selectedType.replace(/_/g, " ")}
                </span>
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={viewMode === "formatted" ? "default" : "ghost"}
                  className="h-6 px-2 text-[10px]"
                  onClick={() => {
                    if (!previewData) previewMutation.mutate(selectedType);
                    setViewMode("formatted");
                  }}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Preview
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === "raw" ? "default" : "ghost"}
                  className="h-6 px-2 text-[10px]"
                  onClick={() => {
                    if (!rawData) rawMutation.mutate(selectedType);
                    setViewMode("raw");
                  }}
                >
                  <Code className="h-3 w-3 mr-1" />
                  Raw
                </Button>
              </div>
            </div>

            {/* Preview content */}
            <div className="p-2">
              {(previewMutation.isPending || rawMutation.isPending) ? (
                <Skeleton className="h-24 w-full" />
              ) : viewMode === "formatted" && previewData ? (
                <div className="bg-black text-white font-mono text-xs p-2 rounded">
                  <pre className="whitespace-pre-wrap">{previewData.message}</pre>
                </div>
              ) : viewMode === "raw" && rawData ? (
                <div className="bg-muted text-xs p-2 rounded overflow-x-auto">
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(rawData.data, null, 2)}
                  </pre>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Click Preview or Raw to load data
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 p-2 border-t bg-muted/20">
              <Button
                size="sm"
                className="flex-1 h-7 text-xs"
                onClick={() => sendMutation.mutate(selectedType)}
                disabled={sendMutation.isPending}
              >
                <Send className="h-3 w-3 mr-1" />
                Send to Board
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => previewMutation.mutate(selectedType)}
                disabled={previewMutation.isPending}
              >
                Refresh
              </Button>
            </div>
          </div>
        )}

        {!selectedType && (
          <div className="text-center py-4 text-xs text-muted-foreground">
            <ChevronRight className="h-4 w-4 mx-auto mb-1" />
            Select a source to preview
          </div>
        )}
      </CardContent>
    </Card>
  );
}

