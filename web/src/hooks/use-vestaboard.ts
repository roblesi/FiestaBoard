"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useConfigOverrides, ServiceKey } from "@/hooks/use-config-overrides";

// Query keys for cache management
export const queryKeys = {
  status: ["status"] as const,
  preview: (overrides: Partial<Record<ServiceKey, boolean>>) => ["preview", overrides] as const,
  config: ["config"] as const,
};

// Status query - refetches every 5 seconds
export function useStatus() {
  return useQuery({
    queryKey: queryKeys.status,
    queryFn: api.getStatus,
    refetchInterval: 5000,
    retry: 1,
  });
}

// Preview query - refetches when config overrides change
export function usePreview(enabled = true) {
  const { getActiveOverrides } = useConfigOverrides();
  const overrides = getActiveOverrides();
  
  return useQuery({
    queryKey: queryKeys.preview(overrides),
    queryFn: () => api.getPreview(overrides),
    enabled,
    retry: 1,
  });
}

// Config query
export function useConfig() {
  return useQuery({
    queryKey: queryKeys.config,
    queryFn: api.getConfig,
    retry: 1,
  });
}

// Start service mutation
export function useStartService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.startService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.status });
    },
  });
}

// Stop service mutation
export function useStopService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.stopService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.status });
    },
  });
}

// Toggle dev mode mutation
export function useToggleDevMode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.toggleDevMode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.status });
    },
  });
}

// Publish preview mutation - accepts overrides to publish exactly what's shown in UI
export function usePublishPreview() {
  return useMutation({
    mutationFn: (overrides?: Partial<Record<string, boolean>>) => api.publishPreview(overrides),
  });
}

