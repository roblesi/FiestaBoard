"use client";

import { useEffect, useCallback } from "react";
import { useActivePage, useSetActivePage, usePages, usePagePreview } from "@/hooks/use-vestaboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  RefreshCw, 
  Check,
  FileText, 
  Grid3X3, 
  Code2,
  ChevronDown
} from "lucide-react";
import { VestaboardDisplay } from "@/components/vestaboard-display";
import { useState } from "react";

// Page type icons
const PAGE_TYPE_ICONS: Record<string, typeof FileText> = {
  single: FileText,
  composite: Grid3X3,
  template: Code2,
};

export function ActivePageDisplay() {
  const [showPageSelector, setShowPageSelector] = useState(false);
  
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
  
  // Find the active page details
  const activePage = pages.find(p => p.id === activePageId);
  
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
    const page = pages.find(p => p.id === pageId);
    setActivePageMutation.mutate(pageId, {
      onSuccess: (result) => {
        setShowPageSelector(false);
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
  }, [pages, setActivePageMutation]);
  
  const handleRefresh = useCallback(() => {
    refetchActivePage();
    refetchPreview();
  }, [refetchActivePage, refetchPreview]);

  const isLoading = isLoadingActivePage || isLoadingPages;

  return (
    <Card>
      <CardHeader className="pb-3">
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
        
        {/* Page selector dropdown */}
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-between"
            onClick={() => setShowPageSelector(!showPageSelector)}
            disabled={isLoading || pages.length === 0}
          >
            {isLoading ? (
              <span className="text-muted-foreground">Loading...</span>
            ) : activePage ? (
              <div className="flex items-center gap-2">
                {(() => {
                  const TypeIcon = PAGE_TYPE_ICONS[activePage.type] || FileText;
                  return <TypeIcon className="h-4 w-4" />;
                })()}
                <span className="truncate">{activePage.name}</span>
              </div>
            ) : pages.length === 0 ? (
              <span className="text-muted-foreground">No pages available</span>
            ) : (
              <span className="text-muted-foreground">Select a page</span>
            )}
            <ChevronDown className={`h-4 w-4 transition-transform ${showPageSelector ? "rotate-180" : ""}`} />
          </Button>
          
          {/* Dropdown menu */}
          {showPageSelector && pages.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
              {pages.map((page) => {
                const TypeIcon = PAGE_TYPE_ICONS[page.type] || FileText;
                const isActive = page.id === activePageId;
                
                return (
                  <button
                    key={page.id}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors ${
                      isActive ? "bg-accent/50" : ""
                    }`}
                    onClick={() => handleSelectPage(page.id)}
                    disabled={setActivePageMutation.isPending}
                  >
                    <TypeIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 text-left truncate">{page.name}</span>
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      {page.type}
                    </Badge>
                    {isActive && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Status indicator */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span>Auto-updating every 1 min</span>
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

