"use client";

import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BoardDisplay } from "@/components/board-display";
import { TipTapTemplateEditor } from "@/components/tiptap-template-editor/TipTapTemplateEditor";
import { toast } from "sonner";
import { queryKeys } from "@/hooks/use-board";
import {
  Wand2,
  X,
  Save,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { api, PageCreate, PageUpdate, PageType } from "@/lib/api";
import { useBoardSettings } from "@/hooks/use-board";

// Alignment type for template lines
type LineAlignment = "left" | "center" | "right";

// Extract alignment prefix from a template line
function extractAlignment(line: string): { alignment: LineAlignment; content: string } {
  if (line.startsWith("{center}")) {
    return { alignment: "center", content: line.slice(8) };
  }
  if (line.startsWith("{right}")) {
    return { alignment: "right", content: line.slice(7) };
  }
  // Default to left (no prefix needed)
  return { alignment: "left", content: line.startsWith("{left}") ? line.slice(6) : line };
}

// Apply alignment prefix to content
function applyAlignment(alignment: LineAlignment, content: string): string {
  // Remove any existing alignment prefix first
  let cleanContent = content;
  if (content.startsWith("{center}")) cleanContent = content.slice(8);
  else if (content.startsWith("{right}")) cleanContent = content.slice(7);
  else if (content.startsWith("{left}")) cleanContent = content.slice(6);
  
  // Don't add alignment prefix to empty lines - they need to stay empty for |wrap to work
  if (cleanContent === "") {
    return "";
  }
  
  switch (alignment) {
    case "center":
      return `{center}${cleanContent}`;
    case "right":
      return `{right}${cleanContent}`;
    case "left":
    default:
      return cleanContent; // Left is default, no prefix needed
  }
}



interface PageBuilderProps {
  pageId?: string; // If provided, edit existing page
  onClose: () => void;
  onSave?: () => void;
}

export function PageBuilder({ pageId, onClose, onSave }: PageBuilderProps) {
  const queryClient = useQueryClient();

  // Fetch board settings for display type
  const { data: boardSettings } = useBoardSettings();

  // Form state (immediate - for UI responsiveness)
  const [name, setName] = useState("");
  const [templateLines, setTemplateLines] = useState<string[]>(["", "", "", "", "", ""]);
  const [lineAlignments, setLineAlignments] = useState<LineAlignment[]>(["left", "left", "left", "left", "left", "left"]);
  const [preview, setPreview] = useState<string | null>(null);

  // Debounced state (for expensive operations)
  const [debouncedTemplateLines, setDebouncedTemplateLines] = useState<string[]>(["", "", "", "", "", ""]);
  const [debouncedLineAlignments, setDebouncedLineAlignments] = useState<LineAlignment[]>(["left", "left", "left", "left", "left", "left"]);

  // Track if we need to re-preview after current mutation completes
  const needsRePreview = useRef(false);

  // Fetch existing page if editing
  const { data: existingPage, isLoading: loadingPage } = useQuery({
    queryKey: ["page", pageId],
    queryFn: () => api.getPage(pageId!),
    enabled: !!pageId,
  });


  // Load existing page data
  useEffect(() => {
    if (existingPage) {
      const pageName = existingPage.name;
      setName(pageName);
      
      const rawLines = existingPage.template || ["", "", "", "", "", ""];
      // Extract alignments and clean content from stored lines
      const alignments: LineAlignment[] = [];
      const contents: string[] = [];
      for (let i = 0; i < 6; i++) {
        const { alignment, content } = extractAlignment(rawLines[i] || "");
        alignments.push(alignment);
        contents.push(content);
      }
      setLineAlignments(alignments);
      setTemplateLines(contents);
      // Initialize debounced state immediately when loading
      setDebouncedLineAlignments(alignments);
      setDebouncedTemplateLines(contents);
    }
  }, [existingPage]);


  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedTemplateLines(templateLines);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [templateLines]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedLineAlignments(lineAlignments);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [lineAlignments]);


  // Auto-resize textareas when content changes
  useEffect(() => {
    // Wait for DOM to update, then resize all textareas
    const timer = setTimeout(() => {
      const textareas = document.querySelectorAll<HTMLTextAreaElement>('textarea[placeholder*="Use {{variable}} syntax"]');
      textareas.forEach(textarea => {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [templateLines]);

  // Build template lines with alignment prefixes applied
  const getTemplateWithAlignments = (): string[] => {
    return templateLines.map((content, i) => applyAlignment(lineAlignments[i], content));
  };

  // Get raw text representation (6 lines joined by newlines)
  const _getRawText = (): string => {
    return getTemplateWithAlignments().join("\n");
  };

  // Parse raw text back into template lines and alignments
  // Enforces exactly 6 lines - truncates extras, pads if fewer
  const _parseRawText = (rawText: string) => {
    // Split and limit to exactly 6 lines
    let lines = rawText.split("\n");
    
    // If more than 6 lines, truncate (don't allow adding more)
    if (lines.length > 6) {
      lines = lines.slice(0, 6);
    }
    
    const newContents: string[] = [];
    const newAlignments: LineAlignment[] = [];
    
    for (let i = 0; i < 6; i++) {
      const line = lines[i] || "";
      const { alignment, content } = extractAlignment(line);
      newAlignments.push(alignment);
      newContents.push(content);
    }
    
    setTemplateLines(newContents);
    setLineAlignments(newAlignments);
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const linesWithAlignments = getTemplateWithAlignments();
      if (pageId) {
        // Update existing page
        const payload: PageUpdate = {
          name,
          template: linesWithAlignments,
        };
        return api.updatePage(pageId, payload);
      } else {
        // Create new page
        const payload: PageCreate = {
          name,
          type: "template" as PageType,
          template: linesWithAlignments,
        };
        return api.createPage(payload);
      }
    },
    onSuccess: (data) => {
      // Invalidate pages list
      queryClient.invalidateQueries({ queryKey: queryKeys.pages });
      
      // Invalidate the specific page and its preview to bust the cache
      // Use the returned page ID for new pages, or the existing pageId for updates
      const targetPageId = pageId || data.id;
      if (targetPageId) {
        queryClient.invalidateQueries({ queryKey: ["page", targetPageId] });
        queryClient.invalidateQueries({ queryKey: queryKeys.pagePreview(targetPageId) });
      }
      
      // If this page is currently active, refresh the active page data
      queryClient.invalidateQueries({ queryKey: queryKeys.activePage });
      queryClient.invalidateQueries({ queryKey: queryKeys.status });
      
      toast.success(pageId ? "Page updated" : "Page created");
      onSave?.();
      onClose();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => api.deletePage(pageId!),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pages });
      
      // Invalidate the specific page and its preview to bust the cache
      if (pageId) {
        queryClient.invalidateQueries({ queryKey: ["page", pageId] });
        queryClient.invalidateQueries({ queryKey: queryKeys.pagePreview(pageId) });
      }
      
      // Also invalidate active page if it was updated
      if (data.active_page_updated) {
        queryClient.invalidateQueries({ queryKey: queryKeys.activePage });
        queryClient.invalidateQueries({ queryKey: queryKeys.status });
      }
      
      // Show appropriate message
      if (data.default_page_created) {
        toast.success("Page deleted. A default welcome page was created.");
      } else if (data.active_page_updated) {
        toast.success("Page deleted. Active display updated.");
      } else {
        toast.success("Page deleted");
      }
      onClose();
    },
    onError: () => {
      toast.error("Failed to delete page");
    },
  });

  // Build template lines with alignment prefixes applied (using debounced state for preview)
  const getDebouncedTemplateWithAlignments = (): string[] => {
    return debouncedTemplateLines.map((content, i) => applyAlignment(debouncedLineAlignments[i], content));
  };

  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: () => api.renderTemplate(getDebouncedTemplateWithAlignments()),
    onSuccess: (data) => {
      setPreview(data.rendered);
      
      // If changes occurred while this preview was rendering, trigger another preview
      if (needsRePreview.current) {
        needsRePreview.current = false;
        previewMutation.mutate();
      }
    },
    onError: () => {
      setPreview(null);
      
      // Reset the flag on error too
      needsRePreview.current = false;
    },
  });

  // Auto-preview when debounced template lines or alignments change (debounced)
  useEffect(() => {
    // Only preview if at least one line has content
    const hasContent = debouncedTemplateLines.some(line => line.trim().length > 0);
    if (!hasContent) {
      setPreview(null);
      return;
    }

    // Debounce the preview (500ms after debounced state stabilizes)
    const timeoutId = setTimeout(() => {
      // Only start a new preview if there isn't one already pending
      // If one is pending, set a flag so it re-runs after completion
      if (!previewMutation.isPending) {
        previewMutation.mutate();
      } else {
        // Mark that we need to re-preview after the current mutation completes
        needsRePreview.current = true;
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedTemplateLines, debouncedLineAlignments]);


  if (pageId && loadingPage) {
    return (
      <Card>
        <CardContent className="p-4 sm:p-6">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="flex-1 min-h-0 w-full max-w-full overflow-x-hidden">
        {/* Main Editor */}
        <Card className="flex flex-col min-h-0 w-full max-w-full overflow-x-hidden">
          <CardHeader className="pb-3 flex-shrink-0 px-4 sm:px-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Wand2 className="h-4 w-4" />
                {pageId ? "Edit Page" : "Create Page"}
              </CardTitle>
              <div className="flex items-center gap-2">
                {/* Delete button - only show when editing */}
                {pageId && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Page</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete &quot;{name || "this page"}&quot;? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate()}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {deleteMutation.isPending ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex flex-col flex-1 min-h-0 space-y-4 overflow-y-auto overflow-x-hidden px-3 sm:px-4 md:px-6">
            {/* Page name */}
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-medium">Page Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Custom Page"
                className="w-full h-10 sm:h-9 px-3 text-sm rounded-md border bg-background"
              />
            </div>

            {/* Template line editors */}
            <div className="space-y-3">
              {/* Single 6-line template editor */}
              <TipTapTemplateEditor
                value={getTemplateWithAlignments().join('\n')}
                onChange={(newValue) => {
                  // Parse the template string back into lines and alignments
                  const lines = newValue.split('\n').slice(0, 6);
                  const newLines: string[] = [];
                  const newAlignments: LineAlignment[] = [];
                  
                  for (let i = 0; i < 6; i++) {
                    const line = lines[i] || '';
                    const { alignment, content } = extractAlignment(line);
                    newLines.push(content);
                    newAlignments.push(alignment);
                  }
                  
                  setTemplateLines(newLines);
                  setLineAlignments(newAlignments);
                }}
                lineAlignments={lineAlignments}
                onLineAlignmentChange={(lineIndex, alignment) => {
                  const newAlignments = [...lineAlignments];
                  newAlignments[lineIndex] = alignment;
                  setLineAlignments(newAlignments);
                }}
                placeholder="Type template syntax like {{weather.temp}} or {{red}} for color tiles"
                showAlignmentControls={true}
                showToolbar={true}
              />

              {/* Live preview */}
              <div className="mt-4">
                <label className="text-xs sm:text-sm font-medium mb-2 block">Preview</label>
                <div className="flex justify-center">
                  <BoardDisplay 
                    message={preview} 
                    isLoading={previewMutation.isPending}
                    size="md"
                    boardType={boardSettings?.board_type ?? "black"}
                  />
                </div>
              </div>

            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2 pb-4">
              <Button
                size="default"
                className="flex-1 h-10 sm:h-9"
                onClick={() => saveMutation.mutate()}
                disabled={!name.trim() || saveMutation.isPending}
              >
                <Save className="h-4 w-4 mr-1.5" />
                {saveMutation.isPending ? "Saving..." : "Save Page"}
              </Button>
              <Button size="default" variant="outline" className="h-10 sm:h-9" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </>
  );
}

