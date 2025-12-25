"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { VariablePicker } from "@/components/variable-picker";
import { VestaboardDisplay } from "@/components/vestaboard-display";
import { TemplateLineEditor } from "@/components/template-line-editor";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  Wand2,
  X,
  Save,
  Info,
  Code2,
  AlertTriangle,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
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

// Calculate max possible rendered length of a template line
function calculateMaxLineLength(line: string, maxLengths: Record<string, number>): number {
  // If line has |wrap, it handles overflow automatically
  if (line.includes("|wrap}}") || line.includes("|wrap|")) {
    return 22;
  }

  let result = line;

  // Remove color markers (they become single tiles, count as 1 char each)
  result = result.replace(/\{(red|orange|yellow|green|blue|violet|purple|white|black|6[3-9]|70)\}/gi, "C");
  result = result.replace(/\{\/(red|orange|yellow|green|blue|violet|purple|white|black)?\}/gi, "");

  // Replace symbols with placeholder (1-2 chars)
  result = result.replace(/\{(sun|star|cloud|rain|snow|storm|fog|partly|heart|check|x)\}/gi, "XX");

  // Replace variables with their max length
  result = result.replace(/\{\{([^}]+)\}\}/g, (match, expr) => {
    const varPart = expr.split("|")[0].trim().toLowerCase();
    const maxLen = maxLengths[varPart] || 10;
    return "X".repeat(maxLen);
  });

  return result.length;
}

// Get line length warning info
function getLineLengthWarning(line: string, maxLengths: Record<string, number>): { hasWarning: boolean; maxLength: number } {
  const maxLength = calculateMaxLineLength(line, maxLengths);
  return {
    hasWarning: maxLength > 22,
    maxLength,
  };
}

interface PageBuilderProps {
  pageId?: string; // If provided, edit existing page
  onClose: () => void;
  onSave?: () => void;
}

export function PageBuilder({ pageId, onClose, onSave }: PageBuilderProps) {
  const queryClient = useQueryClient();

  // Form state
  const [name, setName] = useState("");
  const [templateLines, setTemplateLines] = useState<string[]>(["", "", "", "", "", ""]);
  const [lineAlignments, setLineAlignments] = useState<LineAlignment[]>(["left", "left", "left", "left", "left", "left"]);
  const [preview, setPreview] = useState<string | null>(null);
  const [showMobileVariablePicker, setShowMobileVariablePicker] = useState(false);
  const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null);

  // Fetch existing page if editing
  const { data: existingPage, isLoading: loadingPage } = useQuery({
    queryKey: ["page", pageId],
    queryFn: () => api.getPage(pageId!),
    enabled: !!pageId,
  });

  // Fetch template variables for helper
  const { data: variablesData } = useQuery({
    queryKey: ["template-variables"],
    queryFn: () => api.getTemplateVariables(),
  });

  // Load existing page data
  useEffect(() => {
    if (existingPage) {
      setName(existingPage.name);
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
    }
  }, [existingPage]);

  // Build template lines with alignment prefixes applied
  const getTemplateWithAlignments = (): string[] => {
    return templateLines.map((content, i) => applyAlignment(lineAlignments[i], content));
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pages"] });
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
      queryClient.invalidateQueries({ queryKey: ["pages"] });
      // Also invalidate active page if it was updated
      if (data.active_page_updated) {
        queryClient.invalidateQueries({ queryKey: ["active-page"] });
        queryClient.invalidateQueries({ queryKey: ["status"] });
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

  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: () => api.renderTemplate(getTemplateWithAlignments()),
    onSuccess: (data) => {
      setPreview(data.rendered);
    },
    onError: () => {
      setPreview(null);
    },
  });

  // Auto-preview when template lines or alignments change (debounced)
  useEffect(() => {
    // Only preview if at least one line has content
    const hasContent = templateLines.some(line => line.trim().length > 0);
    if (!hasContent) {
      setPreview(null);
      return;
    }

    // Debounce the preview
    const timeoutId = setTimeout(() => {
      previewMutation.mutate();
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [templateLines, lineAlignments]);

  // Insert variable/text - appends to the active line
  // Note: Drag-and-drop insertion is handled by TemplateLineEditor directly
  const insertAtEnd = (text: string) => {
    const lineIndex = activeLineIndex ?? 0;
    const newLines = [...templateLines];
    newLines[lineIndex] = newLines[lineIndex] + text;
    setTemplateLines(newLines);
  };

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
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-3 sm:gap-4 md:gap-6 flex-1 min-h-0 w-full max-w-full overflow-x-hidden">
        {/* Main Editor */}
        <Card className="flex flex-col min-h-0 w-full max-w-full overflow-x-hidden">
          <CardHeader className="pb-3 flex-shrink-0 px-4 sm:px-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Wand2 className="h-4 w-4" />
                {pageId ? "Edit Page" : "Create Page"}
              </CardTitle>
              <div className="flex items-center gap-2">
                {/* Mobile variable picker toggle */}
                <Button
                  variant="outline"
                  size="sm"
                  className="lg:hidden h-9 px-3"
                  onClick={() => setShowMobileVariablePicker(true)}
                >
                  <Code2 className="h-4 w-4 mr-1.5" />
                  <span className="text-xs">Variables</span>
                </Button>
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
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-medium">Template Lines</label>
              </div>

              {/* Helper text */}
              <div className="p-2 sm:p-3 bg-muted/50 rounded-md text-xs space-y-1">
                <div className="flex items-start gap-2 text-muted-foreground">
                  <Info className="h-3 w-3 mt-0.5 shrink-0" />
                  <span className="hidden sm:inline">Click or drag variables from the sidebar. Badges can be reordered by dragging.</span>
                  <span className="sm:hidden">Tap &quot;Variables&quot; button to insert template variables.</span>
                </div>
              </div>

              {/* 6 template lines */}
              <div className="flex flex-col gap-2 sm:gap-2 w-full">
                {templateLines.map((line, i) => {
                  const maxLengths = variablesData?.max_lengths || {};
                  const warning = getLineLengthWarning(line, maxLengths);
                  const alignment = lineAlignments[i];
                  
                  return (
                    <div key={i} className="flex items-stretch w-full min-w-0">
                      <span className="text-xs text-muted-foreground w-5 shrink-0 flex items-center justify-end pr-1.5">
                        {i + 1}
                      </span>
                      {/* Combined input + alignment buttons container */}
                      <div className="flex flex-1 min-w-0">
                        <div className="flex-1 relative min-w-0">
                          <TemplateLineEditor
                            value={line}
                            onChange={(newValue) => {
                              const newLines = [...templateLines];
                              newLines[i] = newValue;
                              setTemplateLines(newLines);
                            }}
                            onFocus={() => setActiveLineIndex(i)}
                            placeholder={`Line ${i + 1}`}
                            isActive={activeLineIndex === i}
                            hasWarning={warning.hasWarning}
                          />
                          {warning.hasWarning && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none" title={`Line may render up to ${warning.maxLength} chars (max 22)`}>
                              <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-vesta-yellow" />
                            </div>
                          )}
                        </div>
                        {/* Alignment toggle - joined to input */}
                        <div className="flex rounded-r border-y border-r bg-muted/30 overflow-hidden shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              const newAlignments = [...lineAlignments];
                              newAlignments[i] = "left";
                              setLineAlignments(newAlignments);
                            }}
                            className={`px-2 flex items-center justify-center transition-colors ${
                              alignment === "left" 
                                ? "bg-primary text-primary-foreground" 
                                : "hover:bg-muted text-muted-foreground"
                            }`}
                            title="Align left"
                          >
                            <AlignLeft className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const newAlignments = [...lineAlignments];
                              newAlignments[i] = "center";
                              setLineAlignments(newAlignments);
                            }}
                            className={`px-2 flex items-center justify-center border-x transition-colors ${
                              alignment === "center" 
                                ? "bg-primary text-primary-foreground border-primary" 
                                : "hover:bg-muted text-muted-foreground"
                            }`}
                            title="Align center"
                          >
                            <AlignCenter className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const newAlignments = [...lineAlignments];
                              newAlignments[i] = "right";
                              setLineAlignments(newAlignments);
                            }}
                            className={`px-2 flex items-center justify-center transition-colors ${
                              alignment === "right" 
                                ? "bg-primary text-primary-foreground" 
                                : "hover:bg-muted text-muted-foreground"
                            }`}
                            title="Align right"
                          >
                            <AlignRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Live preview */}
              <div className="mt-4">
                <label className="text-xs sm:text-sm font-medium mb-2 block">Preview</label>
                <VestaboardDisplay 
                  message={preview} 
                  isLoading={previewMutation.isPending}
                  size="md"
                />
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

        {/* Desktop Variable Picker Sidebar */}
        <div className="hidden lg:flex flex-col min-h-0">
          <VariablePicker 
            onInsert={insertAtEnd}
            showColors={true}
            showSymbols={false}
          />
        </div>
      </div>

      {/* Mobile Variable Picker Sheet */}
      <Sheet open={showMobileVariablePicker} onOpenChange={setShowMobileVariablePicker}>
        <SheetContent side="bottom" className="h-[70vh] p-0">
          <SheetHeader className="px-4 py-3 border-b">
            <SheetTitle>Template Variables</SheetTitle>
            <SheetDescription>
              Tap a variable to insert it at Line {(activeLineIndex ?? 0) + 1}
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-4">
            <VariablePicker 
              onInsert={(text) => {
                insertAtEnd(text);
                setShowMobileVariablePicker(false);
              }}
              showColors={true}
              showSymbols={false}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

