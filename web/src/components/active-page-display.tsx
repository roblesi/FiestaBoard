"use client";

import { useEffect, useCallback } from "react";
import { useActivePage, useSetActivePage, usePages, usePagePreview } from "@/hooks/use-vestaboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  RefreshCw, 
  FileText, 
  Grid3X3, 
  Code2,
} from "lucide-react";
import { VestaboardDisplay } from "@/components/vestaboard-display";

// Page type icons
const PAGE_TYPE_ICONS: Record<string, typeof FileText> = {
  single: FileText,
  composite: Grid3X3,
  template: Code2,
};

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
  const pages = pagesData?.pages || [];
  
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
  
  // Handle page selection
  const handleSelectPage = useCallback((pageId: string) => {
    if (pageId === activePageId) return; // Don't re-select the same page
    
    const page = pages.find(p => p.id === pageId);
    setActivePageMutation.mutate(pageId, {
      onSuccess: (result) => {
        if (result.sent_to_board) {
          toast.success(`Switched to "${page?.name || 'page'}"`);
        } else {
          toast.info(`Switched to "${page?.name || 'page'}" (dev mode)`);
        }
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
        <div className="flex items-center justify-between mb-4">
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
        
        {/* Page selector - Horizontal Pills */}
        {isLoading ? (
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        ) : pages.length > 0 ? (
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-2 pb-2">
              {pages.map((page) => {
                const TypeIcon = PAGE_TYPE_ICONS[page.type] || FileText;
                const isActive = page.id === activePageId;
                
                return (
                  <button
                    key={page.id}
                    onClick={() => handleSelectPage(page.id)}
                    disabled={setActivePageMutation.isPending || isActive}
                    className={`
                      group relative flex items-center gap-2 px-4 py-2.5 rounded-lg
                      transition-all duration-200 ease-out
                      border-2 
                      ${isActive 
                        ? "border-primary bg-primary/10 shadow-sm" 
                        : "border-border hover:border-primary/50 hover:bg-accent"
                      }
                      disabled:opacity-50 disabled:cursor-not-allowed
                      flex-shrink-0
                    `}
                  >
                    <TypeIcon className={`h-4 w-4 transition-colors ${
                      isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                    }`} />
                    <span className={`text-sm font-medium transition-colors ${
                      isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                    }`}>
                      {page.name}
                    </span>
                    <Badge 
                      variant={isActive ? "default" : "secondary"} 
                      className="text-[10px] px-1.5 py-0"
                    >
                      {page.type}
                    </Badge>
                    {isActive && (
                      <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-sm text-muted-foreground py-2">
            No pages available
          </div>
        )}
        
        {/* Status indicator */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-3">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
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
        
        {/* No pages message */}
        {!isLoading && pages.length === 0 && (
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

