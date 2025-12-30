"use client";

import { useEffect, useMemo, useTransition, useRef, useDeferredValue, useCallback, useState } from "react";
import { useActivePage, useSetActivePage, usePagePreview, usePages, useBoardSettings } from "@/hooks/use-vestaboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Moon, ArrowLeftRight } from "lucide-react";
import { VestaboardDisplay } from "@/components/vestaboard-display";
import { useQuery } from "@tanstack/react-query";
import type { SilenceStatus } from "@/lib/api";
import { api } from "@/lib/api";
import { PageGridSelector } from "@/components/page-grid-selector";

// Parse a line into tokens (same logic as VestaboardDisplay)
type Token = { type: "char"; value: string } | { type: "color"; code: string };

function parseLine(line: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  
  while (i < line.length) {
    if (line[i] === "{") {
      const closingBrace = line.indexOf("}", i);
      if (closingBrace !== -1) {
        const content = line.substring(i + 1, closingBrace);
        
        // Skip end tags {/...} or {/}
        if (content.startsWith("/")) {
          i = closingBrace + 1;
          continue;
        }
        
        // Check if it's a color code (63-70 or named colors)
        if (/^\d+$/.test(content) && parseInt(content) >= 63 && parseInt(content) <= 70) {
          tokens.push({ type: "color", code: content });
          i = closingBrace + 1;
          continue;
        }
      }
    }
    
    // Convert to uppercase since Vestaboard only supports uppercase letters
    tokens.push({ type: "char", value: line[i].toUpperCase() });
    i++;
  }
  
  return tokens;
}

function tokensToString(tokens: Token[]): string {
  return tokens.map(token => {
    if (token.type === "color") {
      return `{${token.code}}`;
    }
    return token.value;
  }).join('');
}

// Add snoozing indicator to bottom right of board content
function addSnoozingIndicator(content: string): string {
  const lines = content.split('\n');
  
  // Ensure we have exactly 6 lines (Vestaboard rows)
  while (lines.length < 6) {
    lines.push("");
  }
  
  // Parse the last line into tokens (each token = 1 board position)
  const lastLineTokens = parseLine(lines[5] || "");
  
  // Pad to 22 tokens total
  while (lastLineTokens.length < 22) {
    lastLineTokens.push({ type: "char", value: " " });
  }
  
  // Truncate if too long
  const boardTokens = lastLineTokens.slice(0, 22);
  
  // Replace positions 14-21 with "SNOOZING" (8 characters)
  const indicator = "SNOOZING";
  for (let i = 0; i < indicator.length; i++) {
    boardTokens[14 + i] = { type: "char", value: indicator[i] };
  }
  
  // Convert back to string
  lines[5] = tokensToString(boardTokens);
  
  return lines.slice(0, 6).join('\n');
}

export function ActivePageDisplay() {
  // Sheet open state
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  // Pre-render state - start rendering grid in background after initial mount
  const [shouldPreRender, setShouldPreRender] = useState(false);
  
  // Start pre-rendering grid in background after component mounts
  useEffect(() => {
    // Use startTransition to make this low-priority
    const timer = setTimeout(() => {
      startTransition(() => {
        setShouldPreRender(true);
      });
    }, 500); // Wait 500ms after mount to avoid blocking initial render
    
    return () => clearTimeout(timer);
  }, []);
  
  // Fetch active page setting
  const { 
    data: activePageData, 
    isLoading: isLoadingActivePage
  } = useActivePage();
  
  // Fetch silence mode status to show snoozing indicator
  const { data: silenceStatus } = useQuery<SilenceStatus>({
    queryKey: ["silenceStatus"],
    queryFn: api.getSilenceStatus,
  });
  
  // Fetch board settings for display type
  const { data: boardSettings } = useBoardSettings();
  
  // Set active page mutation
  const setActivePageMutation = useSetActivePage();
  
  // Get the active page ID
  const activePageId = activePageData?.page_id || null;
  // Defer activePageId updates to reduce priority of non-urgent re-renders
  // This makes clicking feel more responsive
  const deferredActivePageId = useDeferredValue(activePageId);
  
  // Fetch all pages for default page selection and sheet display
  const { data: pagesData, isLoading: isLoadingPages } = usePages();
  
  // Fetch preview of active page
  const { 
    data: previewData, 
    isLoading: isLoadingPreview
  } = usePagePreview(activePageId, { 
    enabled: !!activePageId
  });
  
  // Default to first page if no active page is set
  const pages = useMemo(() => pagesData?.pages || [], [pagesData]);
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
    if (pageId === activePageId) {
      // Close sheet if re-selecting same page
      setIsSheetOpen(false);
      return;
    }
    
    // Debounce rapid clicks (within 200ms) to prevent spam
    const now = Date.now();
    if (pageId === lastPageIdRef.current && now - lastClickTimeRef.current < 200) {
      return;
    }
    lastClickTimeRef.current = now;
    lastPageIdRef.current = pageId;
    
    // Immediately update UI optimistically, then sync with server
    // Don't wrap in startTransition - we want this to feel instant
    setActivePageMutation.mutate(pageId, {
      onSuccess: (result) => {
        // Close the sheet after successful selection
        setIsSheetOpen(false);
        
        // Use startTransition for toast notifications (non-urgent)
        startTransition(() => {
          if (result.sent_to_board) {
            toast.success(`Switched to active page`);
          } else {
            toast.info(`Switched to active page (dev mode)`);
          }
        });
      },
      onError: () => {
        toast.error("Failed to switch page");
      }
    });
  }, [activePageId, setActivePageMutation]);
  
  // Get the active page name for display
  const activePageName = useMemo(() => {
    const page = pages.find(p => p.id === activePageId);
    return page?.name || "No page selected";
  }, [pages, activePageId]);
  
  // Compute the display message with snoozing indicator if needed
  const displayMessage = useMemo(() => {
    const baseMessage = previewData?.message || null;
    if (!baseMessage) return null;
    
    // If silence mode is active, add the snoozing indicator
    if (silenceStatus?.active) {
      return addSnoozingIndicator(baseMessage);
    }
    
    return baseMessage;
  }, [previewData?.message, silenceStatus?.active]);

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Active Display</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSheetOpen(true)}
              className="gap-2"
            >
              <ArrowLeftRight className="h-4 w-4" />
              Change Page
            </Button>
          </div>
          
          {/* Active page name and status */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-foreground">{activePageName}</span>
            </div>
            {silenceStatus?.active && (
              <div className="flex items-center gap-1.5">
                <Moon className="h-3 w-3 text-blue-500" />
                <span className="text-blue-500">Silence mode active</span>
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Vestaboard Frame */}
          <VestaboardDisplay 
            message={displayMessage} 
            isLoading={isLoadingPreview || (!!activePageId && !previewData)}
            size="md"
            boardType={boardSettings?.board_type || "black"}
          />
        </CardContent>
      </Card>

      {/* Pre-render grid in background (hidden) to warm up cache */}
      {shouldPreRender && !isSheetOpen && (
        <div className="hidden">
          <PageGridSelector
            activePageId={deferredActivePageId}
            onSelectPage={handleSelectPage}
            isPending={isPending || setActivePageMutation.isPending}
            showActiveIndicator={true}
            label=""
          />
        </div>
      )}

      {/* Page Selector Sheet - grid is already cached so opens instantly */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-4xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Select Page</SheetTitle>
            <SheetDescription>
              Choose which page to display on your Vestaboard
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6">
            {shouldPreRender ? (
              <PageGridSelector
                activePageId={deferredActivePageId}
                onSelectPage={handleSelectPage}
                isPending={isPending || setActivePageMutation.isPending}
                showActiveIndicator={true}
                label=""
              />
            ) : (
              <div className="text-center text-sm text-muted-foreground py-8">
                Loading pages...
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

