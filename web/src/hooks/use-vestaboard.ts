"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// Query keys for cache management
export const queryKeys = {
  status: ["status"] as const,
  config: ["config"] as const,
  activePage: ["activePage"] as const,
  pages: ["pages"] as const,
  pagePreview: (pageId: string) => ["pagePreview", pageId] as const,
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

// Active page query
export function useActivePage() {
  return useQuery({
    queryKey: queryKeys.activePage,
    queryFn: api.getActivePage,
    retry: 1,
  });
}

// Set active page mutation - backend handles immediate send to board
export function useSetActivePage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pageId: string | null) => api.setActivePage(pageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.activePage });
      queryClient.invalidateQueries({ queryKey: queryKeys.status });
    },
  });
}

// Pages list query
export function usePages() {
  return useQuery({
    queryKey: queryKeys.pages,
    queryFn: api.getPages,
    retry: 1,
  });
}

// Page preview query - for displaying a specific page
export function usePagePreview(pageId: string | null, options?: { enabled?: boolean; refetchInterval?: number }) {
  return useQuery({
    queryKey: queryKeys.pagePreview(pageId || ""),
    queryFn: () => (pageId ? api.previewPage(pageId) : Promise.reject("No page ID")),
    enabled: !!pageId && (options?.enabled !== false),
    retry: 1,
    refetchInterval: options?.refetchInterval,
  });
}
