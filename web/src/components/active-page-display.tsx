"use client";

import { useEffect, useCallback, useMemo, useState, memo, useTransition, useRef, useDeferredValue } from "react";
import { useActivePage, useSetActivePage, usePages, usePagePreview } from "@/hooks/use-vestaboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  RefreshCw, 
  FileText, 
  Grid3X3, 
  Code2,
} from "lucide-react";
import { VestaboardDisplay } from "@/components/vestaboard-display";
import type { Page, PagePreviewResponse } from "@/lib/api";
import { api } from "@/lib/api";

// Page type icons
const PAGE_TYPE_ICONS: Record<string, typeof FileText> = {
  single: FileText,
  composite: Grid3X3,
  template: Code2,
};

// Cache key prefix for localStorage
const PREVIEW_CACHE_PREFIX = "vestaboard_preview_";

// Get cached preview from localStorage
function getCachedPreview(pageId: string, pageUpdatedAt: string): PagePreviewResponse | null {
  if (typeof window === "undefined") return null;
  
  try {
    const cacheKey = `${PREVIEW_CACHE_PREFIX}${pageId}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (!cached) return null;
    
    const { preview, pageUpdatedAt: cachedUpdatedAt } = JSON.parse(cached);
    
    // Check if page has been updated since we cached the preview
    if (cachedUpdatedAt !== pageUpdatedAt) {
      // Page changed, cache is stale
      return null;
    }
    
    return preview;
  } catch (error) {
    console.error("Error reading preview cache:", error);
    return null;
  }
}

// Save preview to localStorage
function setCachedPreview(pageId: string, pageUpdatedAt: string, preview: PagePreviewResponse): void {
  if (typeof window === "undefined") return;
  
  try {
    const cacheKey = `${PREVIEW_CACHE_PREFIX}${pageId}`;
    const cacheData = {
      preview,
      pageUpdatedAt,
      cachedAt: new Date().toISOString(),
    };
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (error) {
    console.error("Error writing preview cache:", error);
  }
}

// Mini preview component for each page button - uses localStorage caching
// Memoized to prevent unnecessary re-renders when parent updates
const PageButtonPreview = memo(function PageButtonPreview({ page }: { page: Page }) {
  const pageId = page.id;
  // Use empty string as fallback for optional updated_at
  const pageUpdatedAt = page.updated_at || "";
  const pageName = page.name;
  
  const [preview, setPreview] = useState<PagePreviewResponse | null>(() => 
    getCachedPreview(pageId, pageUpdatedAt)
  );
  const [isLoading, setIsLoading] = useState(!preview);
  
  useEffect(() => {
    // Check if we already have a valid cached preview
    const cached = getCachedPreview(pageId, pageUpdatedAt);
    if (cached) {
      setPreview(cached);
      setIsLoading(false);
      return;
    }
    
    // Fetch fresh preview
    let mounted = true;
    
    const fetchPreview = async () => {
      try {
        const result = await api.previewPage(pageId);
        if (mounted) {
          setPreview(result);
          setCachedPreview(pageId, pageUpdatedAt, result);
          setIsLoading(false);
        }
      } catch (error) {
        console.error(`Failed to fetch preview for ${pageName}:`, error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };
    
    fetchPreview();
    
    return () => {
      mounted = false;
    };
  }, [pageId, pageUpdatedAt, pageName]);
  
  return (
    <div className="w-full hover-stable">
      <VestaboardDisplay 
        message={preview?.message || null} 
        isLoading={isLoading}
        size="sm"
      />
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if page ID or updated_at changes
  return prevProps.page.id === nextProps.page.id && 
         prevProps.page.updated_at === nextProps.page.updated_at;
});

// Memoized page button component to prevent unnecessary re-renders
const PageButton = memo(function PageButton({
  page,
  isActive,
  isPending,
  onSelect,
}: {
  page: Page;
  isActive: boolean;
  isPending: boolean;
  onSelect: (pageId: string) => void;
}) {
  const TypeIcon = PAGE_TYPE_ICONS[page.type] || FileText;
  
  // Pre-compute className to avoid template string parsing on every render
  // Remove ALL transitions for instant, snappy feedback
  const buttonClassName = isActive
    ? "group relative flex flex-col gap-2 p-3 rounded-lg border-2 border-primary bg-primary/10 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-left page-button-container"
    : "group relative flex flex-col gap-2 p-3 rounded-lg border-2 border-border hover:border-primary/50 hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed text-left page-button-container";
  
  // No transitions - instant color changes
  const iconClassName = isActive
    ? "h-4 w-4 shrink-0 text-primary"
    : "h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground";
  
  const nameClassName = isActive
    ? "text-sm font-medium truncate text-foreground"
    : "text-sm font-medium truncate text-muted-foreground group-hover:text-foreground";
  
  // Memoize click handler to prevent function recreation
  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!isPending && !isActive) {
      onSelect(page.id);
    }
  }, [page.id, isPending, isActive, onSelect]);
  
  return (
    <button
      key={page.id}
      onClick={handleClick}
      disabled={isPending || isActive}
      className={buttonClassName}
      type="button"
    >
      {/* Page info header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <TypeIcon className={iconClassName} />
          <span className={nameClassName}>
            {page.name}
          </span>
        </div>
        <Badge 
          variant={isActive ? "default" : "secondary"} 
          className="text-[10px] px-1.5 py-0 shrink-0"
        >
          {page.type}
        </Badge>
      </div>
      
      {/* Mini preview - isolated to prevent hover re-renders */}
      <div className="hover-stable">
        <PageButtonPreview page={page} />
      </div>
      
      {/* Active indicator */}
      {isActive && (
        <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-primary rounded-full" />
      )}
    </button>
  );
}, (prevProps, nextProps) => {
  // Only re-render if relevant props change
  return prevProps.page.id === nextProps.page.id &&
         prevProps.isActive === nextProps.isActive &&
         prevProps.isPending === nextProps.isPending &&
         prevProps.page.updated_at === nextProps.page.updated_at;
});

export function ActivePageDisplay() {
  // Fetch active page setting
  const { 
    data: activePageData, 
    isLoading: isLoadingActivePage,
    refetch: refetchActivePage 
  } = useActivePage();
  
  // Fetch all pages for selection
  const { data: pagesData, isLoading: isLoadingPages } = usePages();
  
  // Set active page mutation
  const setActivePageMutation = useSetActivePage();
  
  // Get the active page ID
  const activePageId = activePageData?.page_id || null;
  // Defer activePageId updates to reduce priority of non-urgent re-renders
  // This makes clicking feel more responsive
  const deferredActivePageId = useDeferredValue(activePageId);
  
  // Memoize pages array to prevent unnecessary re-renders
  // Only recreate if the pages array reference changes (which should only happen on actual data changes)
  const pages = useMemo(() => pagesData?.pages || [], [pagesData]);
  
  // Fetch preview of active page with auto-refresh every 30 seconds
  const { 
    data: previewData, 
    isLoading: isLoadingPreview,
    refetch: refetchPreview,
    isRefetching 
  } = usePagePreview(activePageId, { 
    enabled: !!activePageId,
    refetchInterval: 30000 // 30 seconds
  });
  
  // Default to first page if no active page is set
  useEffect(() => {
    if (!isLoadingActivePage && !isLoadingPages && !activePageId && pages.length > 0) {
      const firstPage = pages[0];
      setActivePageMutation.mutate(firstPage.id, {
        onSuccess: (result) => {
          if (result.sent_to_board) {
            toast.success(`Set "${firstPage.name}" as active page`);
          } else {
            toast.info(`Set "${firstPage.name}" as active page (dev mode)`);
          }
        },
        onError: () => {
          toast.error("Failed to set default page");
        }
      });
    }
  }, [isLoadingActivePage, isLoadingPages, activePageId, pages, setActivePageMutation]);
  
  // Use transition for non-urgent updates to improve perceived performance
  const [isPending, startTransition] = useTransition();
  const lastClickTimeRef = useRef<number>(0);
  const lastPageIdRef = useRef<string | null>(null);
  
  // Handle page selection with debouncing and optimistic updates
  const handleSelectPage = useCallback((pageId: string) => {
    if (pageId === activePageId) return; // Don't re-select the same page
    
    // Debounce rapid clicks (within 200ms) to prevent spam
    const now = Date.now();
    if (pageId === lastPageIdRef.current && now - lastClickTimeRef.current < 200) {
      return;
    }
    lastClickTimeRef.current = now;
    lastPageIdRef.current = pageId;
    
    const page = pages.find(p => p.id === pageId);
    
    // Immediately update UI optimistically, then sync with server
    // Don't wrap in startTransition - we want this to feel instant
    setActivePageMutation.mutate(pageId, {
      onSuccess: (result) => {
        // Use startTransition for toast notifications (non-urgent)
        startTransition(() => {
          if (result.sent_to_board) {
            toast.success(`Switched to "${page?.name || 'page'}"`);
          } else {
            toast.info(`Switched to "${page?.name || 'page'}" (dev mode)`);
          }
        });
      },
      onError: () => {
        toast.error("Failed to switch page");
      }
    });
  }, [pages, activePageId, setActivePageMutation]);
  
  const handleRefresh = useCallback(() => {
    refetchActivePage();
    refetchPreview();
  }, [refetchActivePage, refetchPreview]);

  const isLoading = isLoadingActivePage || isLoadingPages;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Active Display</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefetching}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
        
        {/* Status indicator */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-3">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-vesta-green animate-pulse" />
            <span>Auto-refresh every 30s</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Vestaboard Frame */}
        <VestaboardDisplay 
          message={previewData?.message || null} 
          isLoading={isLoadingPreview || (!!activePageId && !previewData)}
          size="md"
        />
        
        {/* Page selector - with mini previews */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : pages.length > 0 ? (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-3 block">
              SELECT PAGE
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {pages.map((page) => (
                <PageButton
                  key={page.id}
                  page={page}
                  isActive={page.id === deferredActivePageId}
                  isPending={isPending || setActivePageMutation.isPending}
                  onSelect={handleSelectPage}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center text-sm text-muted-foreground py-4">
            <p>No pages created yet.</p>
            <p className="mt-1">
              <a href="/pages/new" className="text-primary hover:underline">
                Create your first page
              </a>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

