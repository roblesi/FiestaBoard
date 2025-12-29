"use client";

import { useEffect, useCallback, useMemo, useState, memo } from "react";
import { usePages } from "@/hooks/use-vestaboard";
import { Skeleton } from "@/components/ui/skeleton";
import { LayoutTemplate } from "lucide-react";
import { VestaboardDisplay } from "@/components/vestaboard-display";
import type { Page, PagePreviewResponse } from "@/lib/api";
import { api } from "@/lib/api";

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
  showActiveIndicator = true,
}: {
  page: Page;
  isActive: boolean;
  isPending: boolean;
  onSelect: (pageId: string) => void;
  showActiveIndicator?: boolean;
}) {
  const TypeIcon = LayoutTemplate;
  
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
    if (!isPending) {
      onSelect(page.id);
    }
  }, [page.id, isPending, onSelect]);
  
  return (
    <button
      key={page.id}
      onClick={handleClick}
      disabled={isPending}
      className={buttonClassName}
      type="button"
    >
      {/* Page info header */}
      <div className="flex items-center gap-2 min-w-0">
        <TypeIcon className={iconClassName} />
        <span className={nameClassName}>
          {page.name}
        </span>
      </div>
      
      {/* Mini preview - isolated to prevent hover re-renders */}
      <div className="hover-stable">
        <PageButtonPreview page={page} />
      </div>
      
      {/* Active indicator */}
      {showActiveIndicator && isActive && (
        <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-primary rounded-full" />
      )}
    </button>
  );
}, (prevProps, nextProps) => {
  // Only re-render if relevant props change
  return prevProps.page.id === nextProps.page.id &&
         prevProps.isActive === nextProps.isActive &&
         prevProps.isPending === nextProps.isPending &&
         prevProps.page.updated_at === nextProps.page.updated_at &&
         prevProps.showActiveIndicator === nextProps.showActiveIndicator;
});

export interface PageGridSelectorProps {
  /** The currently active/selected page ID (for highlighting) */
  activePageId?: string | null;
  /** Callback when a page is selected */
  onSelectPage: (pageId: string) => void;
  /** Whether a selection is pending (for loading states) */
  isPending?: boolean;
  /** Whether to show the active indicator line */
  showActiveIndicator?: boolean;
  /** Label text above the grid */
  label?: string;
}

export function PageGridSelector({
  activePageId = null,
  onSelectPage,
  isPending = false,
  showActiveIndicator = true,
  label = "SELECT PAGE",
}: PageGridSelectorProps) {
  // Fetch all pages
  const { data: pagesData, isLoading: isLoadingPages } = usePages();
  
  // Memoize pages array to prevent unnecessary re-renders
  const pages = useMemo(() => pagesData?.pages || [], [pagesData]);
  
  if (isLoadingPages) {
    return (
      <div>
        {label && (
          <label className="text-xs font-medium text-muted-foreground mb-3 block">
            {label}
          </label>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }
  
  if (pages.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground py-4">
        <p>No pages created yet.</p>
        <p className="mt-1">
          <a href="/pages/new" className="text-primary hover:underline">
            Create your first page
          </a>
        </p>
      </div>
    );
  }
  
  return (
    <div>
      {label && (
        <label className="text-xs font-medium text-muted-foreground mb-3 block">
          {label}
        </label>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {pages.map((page) => (
          <PageButton
            key={page.id}
            page={page}
            isActive={page.id === activePageId}
            isPending={isPending}
            onSelect={onSelectPage}
            showActiveIndicator={showActiveIndicator}
          />
        ))}
      </div>
    </div>
  );
}

