"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { Play, Pause, Clock } from "lucide-react";

export function RotationStatus() {
  const { data: rotationState, isLoading } = useQuery({
    queryKey: ["rotation-state"],
    queryFn: api.getActiveRotation,
    refetchInterval: 2000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="text-base">Rotation Status</CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!rotationState?.active) {
    return (
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="text-base flex items-center gap-2">
            <Pause className="h-4 w-4" />
            Rotation Status
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <p className="text-sm text-muted-foreground">No rotation active</p>
        </CardContent>
      </Card>
    );
  }

  const progress = rotationState.time_on_page && rotationState.page_duration
    ? (rotationState.time_on_page / rotationState.page_duration) * 100
    : 0;

  return (
    <Card>
      <CardHeader className="px-4 sm:px-6">
        <CardTitle className="text-base flex items-center gap-2">
          <Play className="h-4 w-4 text-vesta-green" />
          Rotation Active
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 px-4 sm:px-6">
        <div>
          <div className="flex items-center justify-between text-sm mb-1 gap-2">
            <span className="font-medium truncate">{rotationState.rotation_name}</span>
            <Badge variant="secondary" className="text-xs shrink-0">
              {rotationState.current_page_index !== null && rotationState.total_pages
                ? `${rotationState.current_page_index + 1}/${rotationState.total_pages}`
                : "—"}
            </Badge>
          </div>
          
          {rotationState.current_page_id && (
            <p className="text-xs text-muted-foreground truncate">
              Page: {rotationState.current_page_id}
            </p>
          )}
        </div>

        {rotationState.time_on_page !== null && rotationState.page_duration && (
          <div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {Math.round(rotationState.time_on_page / 1000)}s / {Math.round(rotationState.page_duration / 1000)}s
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2.5 sm:h-2 overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-300"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

