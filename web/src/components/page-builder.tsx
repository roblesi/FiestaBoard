"use client";

import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
function extractAlignment(line: string): { alignment: LineAlignment; wrapEnabled: boolean; content: string } {
  let remaining = line;
  let alignment: LineAlignment = "left";
  let wrapEnabled = false;
  
  // Extract wrap prefix
  if (remaining.startsWith("{wrap}")) {
    wrapEnabled = true;
    remaining = remaining.slice(6);
  }
  
  // Extract alignment prefix (can come after wrap)
  if (remaining.startsWith("{center}")) {
    alignment = "center";
    remaining = remaining.slice(8);
  } else if (remaining.startsWith("{right}")) {
    alignment = "right";
    remaining = remaining.slice(7);
  } else if (remaining.startsWith("{left}")) {
    alignment = "left";
    remaining = remaining.slice(6);
  }
  
  return { alignment, wrapEnabled, content: remaining };
}

// Apply alignment and wrap prefixes to content
function applyAlignment(alignment: LineAlignment, wrapEnabled: boolean, content: string): string {
  // Remove any existing prefixes first
  let cleanContent = content;
  if (cleanContent.startsWith("{wrap}")) cleanContent = cleanContent.slice(6);
  if (cleanContent.startsWith("{center}")) cleanContent = cleanContent.slice(8);
  else if (cleanContent.startsWith("{right}")) cleanContent = cleanContent.slice(7);
  else if (cleanContent.startsWith("{left}")) cleanContent = cleanContent.slice(6);
  
  // Don't add prefixes to empty lines - they need to stay empty for wrap to work
  if (cleanContent === "") {
    return "";
  }
  
  const prefixes: string[] = [];
  
  // Add wrap prefix first
  if (wrapEnabled) {
    prefixes.push("{wrap}");
  }
  
  // Add alignment prefix
  switch (alignment) {
    case "center":
      prefixes.push("{center}");
      break;
    case "right":
      prefixes.push("{right}");
      break;
    // left is default, no prefix needed
  }
  
  return prefixes.join("") + cleanContent;
}



interface PageBuilderProps {
  pageId?: string; // If provided, edit existing page
  onClose: () => void;
  onSave?: () => void;
}

// Draft storage key helper
function getDraftKey(pageId?: string): string {
  return `fiestaboard-page-draft-${pageId || 'new'}`;
}

interface DraftData {
  name: string;
  templateLines: string[];
  lineAlignments: LineAlignment[];
  lineWrapEnabled?: boolean[]; // Optional for backward compatibility
  timestamp: number;
}

export function PageBuilder({ pageId, onClose, onSave }: PageBuilderProps) {
  const queryClient = useQueryClient();

  // Fetch board settings for display type
  const { data: boardSettings } = useBoardSettings();

  // Form state (immediate - for UI responsiveness)
  const [name, setName] = useState("");
  const [templateLines, setTemplateLines] = useState<string[]>(["", "", "", "", "", ""]);
  const [lineAlignments, setLineAlignments] = useState<LineAlignment[]>(["left", "left", "left", "left", "left", "left"]);
  const [lineWrapEnabled, setLineWrapEnabled] = useState<boolean[]>([false, false, false, false, false, false]);
  const [preview, setPreview] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);

  // Debounced state (for expensive operations)
  const [debouncedTemplateLines, setDebouncedTemplateLines] = useState<string[]>(["", "", "", "", "", ""]);
  const [debouncedLineAlignments, setDebouncedLineAlignments] = useState<LineAlignment[]>(["left", "left", "left", "left", "left", "left"]);
  const [debouncedLineWrapEnabled, setDebouncedLineWrapEnabled] = useState<boolean[]>([false, false, false, false, false, false]);

  // Track if we need to re-preview after current mutation completes
  const needsRePreview = useRef(false);

  // Fetch existing page if editing
  const { data: existingPage, isLoading: loadingPage } = useQuery({
    queryKey: ["page", pageId],
    queryFn: () => api.getPage(pageId!),
    enabled: !!pageId,
  });


  // Load draft or existing page data
  useEffect(() => {
    if (existingPage) {
      // Clear draft when loading existing page
      const draftKey = getDraftKey(pageId);
      localStorage.removeItem(draftKey);
      
      const pageName = existingPage.name;
      setName(pageName);
      
      const rawLines = existingPage.template || ["", "", "", "", "", ""];
      // Extract alignments, wrap state, and clean content from stored lines
      const alignments: LineAlignment[] = [];
      const wrapStates: boolean[] = [];
      const contents: string[] = [];
      for (let i = 0; i < 6; i++) {
        const { alignment, wrapEnabled, content } = extractAlignment(rawLines[i] || "");
        alignments.push(alignment);
        wrapStates.push(wrapEnabled);
        contents.push(content);
      }
      setLineAlignments(alignments);
      setLineWrapEnabled(wrapStates);
      setTemplateLines(contents);
      // Initialize debounced state immediately when loading
      setDebouncedLineAlignments(alignments);
      setDebouncedLineWrapEnabled(wrapStates);
      setDebouncedTemplateLines(contents);
    } else if (!pageId && !loadingPage) {
      // Try to load draft for new page
      const draftKey = getDraftKey();
      try {
        const draftJson = localStorage.getItem(draftKey);
        if (draftJson) {
          const draft: DraftData = JSON.parse(draftJson);
            // Only restore if draft is less than 7 days old
            const draftAge = Date.now() - draft.timestamp;
            const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
            
            if (draftAge < maxAge) {
              setName(draft.name || "");
              setTemplateLines(draft.templateLines || ["", "", "", "", "", ""]);
              setLineAlignments(draft.lineAlignments || ["left", "left", "left", "left", "left", "left"]);
              setLineWrapEnabled(draft.lineWrapEnabled || [false, false, false, false, false, false]);
              setDebouncedTemplateLines(draft.templateLines || ["", "", "", "", "", ""]);
              setDebouncedLineAlignments(draft.lineAlignments || ["left", "left", "left", "left", "left", "left"]);
              setDebouncedLineWrapEnabled(draft.lineWrapEnabled || [false, false, false, false, false, false]);
              setDraftRestored(true);
              
              // Auto-dismiss the alert after 5 seconds
              setTimeout(() => setDraftRestored(false), 5000);
          } else {
            // Draft too old, remove it
            localStorage.removeItem(draftKey);
          }
        }
      } catch {
        // Invalid draft data, remove it
        localStorage.removeItem(draftKey);
      }
    }
  }, [existingPage, pageId, loadingPage]);


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

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedLineWrapEnabled(lineWrapEnabled);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [lineWrapEnabled]);

  // Auto-save draft to localStorage (debounced)
  useEffect(() => {
    const draftKey = getDraftKey(pageId);
    
    // Don't save draft if we just loaded an existing page
    if (existingPage) {
      return;
    }
    
    // Debounce draft saving
    const timeoutId = setTimeout(() => {
      try {
        const draft: DraftData = {
          name,
          templateLines,
          lineAlignments,
          lineWrapEnabled,
          timestamp: Date.now(),
        };
        localStorage.setItem(draftKey, JSON.stringify(draft));
      } catch (error) {
        // Ignore localStorage errors (quota exceeded, etc.)
        console.warn("Failed to save draft:", error);
      }
    }, 1000); // Save draft 1 second after last change
    
    return () => clearTimeout(timeoutId);
  }, [name, templateLines, lineAlignments, lineWrapEnabled, pageId, existingPage]);


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

  // Build template lines with alignment and wrap prefixes applied
  const getTemplateWithAlignments = (): string[] => {
    return templateLines.map((content, i) => applyAlignment(lineAlignments[i], lineWrapEnabled[i], content));
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
      const { alignment, wrapEnabled, content } = extractAlignment(line);
      newAlignments.push(alignment);
      newWrapStates.push(wrapEnabled);
      newContents.push(content);
    }
    
    setTemplateLines(newContents);
    setLineAlignments(newAlignments);
    setLineWrapEnabled(newWrapStates);
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
      // Clear draft on successful save
      const draftKey = getDraftKey(pageId || data.id);
      localStorage.removeItem(draftKey);
      // Also clear the 'new' draft if this was a new page
      if (!pageId) {
        localStorage.removeItem(getDraftKey());
      }
      
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
    return debouncedTemplateLines.map((content, i) => applyAlignment(debouncedLineAlignments[i], debouncedLineWrapEnabled[i], content));
  };

  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: () => {
      const template = getDebouncedTemplateWithAlignments();
      console.log('Sending template to API:', template);
      console.log('Wrap states:', debouncedLineWrapEnabled);
      return api.renderTemplate(template);
    },
    onSuccess: (data) => {
      console.log('Preview response:', data);
      console.log('Rendered string:', data.rendered);
      console.log('Rendered lines:', data.lines);
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
  }, [debouncedTemplateLines, debouncedLineAlignments, debouncedLineWrapEnabled]);


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
          <CardHeader className="pb-1 flex-shrink-0 px-4 sm:px-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Wand2 className="h-4 w-4" />
                {pageId ? "Edit Page" : "Create Page"}
              </CardTitle>
              <div className="flex items-center gap-1">
                {/* Save button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => saveMutation.mutate()}
                  disabled={!name.trim() || saveMutation.isPending}
                  title={saveMutation.isPending ? "Saving..." : "Save Page"}
                >
                  <Save className="h-4 w-4" />
                </Button>
                
                {/* Delete button - only show when editing */}
                {pageId && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Delete Page"
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
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9" 
                  onClick={onClose}
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex flex-col flex-1 min-h-0 space-y-4 overflow-y-auto overflow-x-hidden px-3 sm:px-4 md:px-6 pt-2">
            {/* Draft restored notification */}
            {draftRestored && (
              <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                <AlertDescription className="text-sm text-blue-900 dark:text-blue-100">
                  Draft restored from your previous session. Your work has been automatically saved.
                </AlertDescription>
              </Alert>
            )}
            
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
                  // Parse the template string back into lines, alignments, and wrap states
                  const lines = newValue.split('\n').slice(0, 6);
                  const newLines: string[] = [];
                  const newAlignments: LineAlignment[] = [];
                  const newWrapStates: boolean[] = [];
                  
                  for (let i = 0; i < 6; i++) {
                    const line = lines[i] || '';
                    const { alignment, wrapEnabled, content } = extractAlignment(line);
                    newLines.push(content);
                    newAlignments.push(alignment);
                    newWrapStates.push(wrapEnabled);
                  }
                  
                  setTemplateLines(newLines);
                  setLineAlignments(newAlignments);
                  setLineWrapEnabled(newWrapStates);
                }}
                lineAlignments={lineAlignments}
                lineWrapEnabled={lineWrapEnabled}
                onLineAlignmentChange={(lineIndex, alignment) => {
                  const newAlignments = [...lineAlignments];
                  newAlignments[lineIndex] = alignment;
                  setLineAlignments(newAlignments);
                }}
                onLineWrapChange={(lineIndex, wrapEnabled) => {
                  const newWrapStates = [...lineWrapEnabled];
                  newWrapStates[lineIndex] = wrapEnabled;
                  setLineWrapEnabled(newWrapStates);
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
                    isLoading={previewMutation.isPending && debouncedTemplateLines.some(line => line.trim().length > 0)}
                    size="md"
                    boardType={boardSettings?.board_type ?? "black"}
                  />
                </div>
              </div>

            </div>
          </CardContent>
        </Card>

      </div>
    </>
  );
}

