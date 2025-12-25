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
  FileText,
  Braces,
  ChevronDown,
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
import { cn } from "@/lib/utils";

// Transition strategy display names
const STRATEGY_LABELS: Record<string, string> = {
  column: "Wave (Left to Right)",
  "reverse-column": "Drift (Right to Left)",
  "edges-to-center": "Curtain (Outside In)",
  row: "Row (Top to Bottom)",
  diagonal: "Diagonal (Corner to Corner)",
  random: "Random",
};

const AVAILABLE_STRATEGIES = [
  "column",
  "reverse-column",
  "edges-to-center",
  "row",
  "diagonal",
  "random",
];

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
  const [isRawMode, setIsRawMode] = useState(false);
  
  // Transition settings state
  const [transitionStrategy, setTransitionStrategy] = useState<string | null>(null);
  const [transitionIntervalMs, setTransitionIntervalMs] = useState<number | null>(null);
  const [transitionStepSize, setTransitionStepSize] = useState<number | null>(null);
  const [isTransitionOpen, setIsTransitionOpen] = useState(false);

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
      
      // Load transition settings
      setTransitionStrategy(existingPage.transition_strategy ?? null);
      setTransitionIntervalMs(existingPage.transition_interval_ms ?? null);
      setTransitionStepSize(existingPage.transition_step_size ?? null);
      // Open transition accordion if page has custom transition settings
      if (existingPage.transition_strategy) {
        setIsTransitionOpen(true);
      }
    }
  }, [existingPage]);

  // Build template lines with alignment prefixes applied
  const getTemplateWithAlignments = (): string[] => {
    return templateLines.map((content, i) => applyAlignment(lineAlignments[i], content));
  };

  // Get raw text representation (6 lines joined by newlines)
  const getRawText = (): string => {
    return getTemplateWithAlignments().join("\n");
  };

  // Parse raw text back into template lines and alignments
  // Enforces exactly 6 lines - truncates extras, pads if fewer
  const parseRawText = (rawText: string) => {
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
          transition_strategy: transitionStrategy,
          transition_interval_ms: transitionIntervalMs,
          transition_step_size: transitionStepSize,
        };
        return api.updatePage(pageId, payload);
      } else {
        // Create new page
        const payload: PageCreate = {
          name,
          type: "template" as PageType,
          template: linesWithAlignments,
          transition_strategy: transitionStrategy,
          transition_interval_ms: transitionIntervalMs,
          transition_step_size: transitionStepSize,
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
                {/* View mode toggle */}
                <div className="flex items-center gap-1.5 bg-muted/50 rounded-md p-0.5">
                  <button
                    type="button"
                    onClick={() => setIsRawMode(false)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors ${
                      !isRawMode
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title="Visual editor with badges"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Visual</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRawMode(true)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors ${
                      isRawMode
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title="Raw template syntax"
                  >
                    <Braces className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Raw</span>
                  </button>
                </div>
              </div>

              {/* Helper text */}
              <div className="p-2 sm:p-3 bg-muted/50 rounded-md text-xs space-y-1">
                <div className="flex items-start gap-2 text-muted-foreground">
                  <Info className="h-3 w-3 mt-0.5 shrink-0" />
                  {isRawMode ? (
                    <span>Edit raw template syntax. Use {"{{variable}}"} for variables and {"{color}"} for colors. Alignment prefixes: {"{center}"}, {"{right}"}.</span>
                  ) : (
                    <>
                      <span className="hidden sm:inline">Click or drag variables from the sidebar. Badges can be reordered by dragging.</span>
                      <span className="sm:hidden">Tap &quot;Variables&quot; button to insert template variables.</span>
                    </>
                  )}
                </div>
              </div>

              {/* Visual Editor - 6 template lines */}
              {!isRawMode && (
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
              )}

              {/* Raw Editor - textarea with line numbers */}
              {isRawMode && (
                <div className="w-full">
                  <div className="flex rounded-md border bg-background overflow-hidden focus-within:ring-1 focus-within:ring-primary">
                    {/* Line numbers */}
                    <div className="flex flex-col py-2 px-2 bg-muted/30 border-r text-xs font-mono text-muted-foreground select-none shrink-0">
                      {[1, 2, 3, 4, 5, 6].map((num) => (
                        <div key={num} className="h-[1.625rem] flex items-center justify-end pr-1 min-w-[1.5rem]">
                          {num}
                        </div>
                      ))}
                    </div>
                    {/* Textarea - no word wrap for proper line number alignment */}
                    <div className="flex-1 overflow-x-auto">
                      <textarea
                        value={getRawText()}
                        onChange={(e) => parseRawText(e.target.value)}
                        onKeyDown={(e) => {
                          // Prevent Enter if already at 6 lines
                          if (e.key === "Enter") {
                            const currentLines = getRawText().split("\n").length;
                            if (currentLines >= 6) {
                              e.preventDefault();
                            }
                          }
                        }}
                        placeholder={`Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6`}
                        rows={6}
                        spellCheck={false}
                        wrap="off"
                        className="w-full min-w-full px-3 py-2 text-sm font-mono bg-transparent resize-none focus:outline-none leading-[1.625rem] whitespace-pre overflow-x-auto"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Each line corresponds to a row on the Vestaboard (max 22 characters rendered).
                  </p>
                </div>
              )}

              {/* Live preview */}
              <div className="mt-4">
                <label className="text-xs sm:text-sm font-medium mb-2 block">Preview</label>
                <VestaboardDisplay 
                  message={preview} 
                  isLoading={previewMutation.isPending}
                  size="md"
                />
              </div>

              {/* Transition Settings - Collapsible */}
              <div className="mt-4 border rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsTransitionOpen(!isTransitionOpen)}
                  className="flex items-center justify-between w-full px-4 py-3 text-left bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Wand2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Transition Settings</span>
                    {transitionStrategy && (
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {STRATEGY_LABELS[transitionStrategy] || transitionStrategy}
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform duration-200",
                      isTransitionOpen && "rotate-180"
                    )}
                  />
                </button>
                
                <div
                  className={cn(
                    "overflow-hidden transition-all duration-200",
                    isTransitionOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                  )}
                >
                  <div className="p-4 space-y-4 border-t">
                    <p className="text-xs text-muted-foreground">
                      Control how the board animates when displaying this page. Leave empty to use instant updates.
                    </p>
                    
                    {/* Warning note */}
                    {transitionStrategy && (transitionIntervalMs ?? 0) > 500 && (
                      <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>
                          <strong>Heads up:</strong> Slow transitions (especially with delays) can cause a queue buildup if pages change faster than they animate. Consider using faster settings for rotations with short durations.
                        </span>
                      </div>
                    )}
                    
                    {/* Strategy selector */}
                    <div className="space-y-2">
                      <label className="text-xs sm:text-sm font-medium">Animation Style</label>
                      <select
                        value={transitionStrategy || ""}
                        onChange={(e) => setTransitionStrategy(e.target.value || null)}
                        className="w-full h-10 sm:h-9 px-3 text-sm rounded-md border bg-background"
                      >
                        <option value="">None (Instant)</option>
                        {AVAILABLE_STRATEGIES.map((s) => (
                          <option key={s} value={s}>
                            {STRATEGY_LABELS[s] || s}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Interval slider */}
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <label className="text-xs sm:text-sm font-medium">Step Interval</label>
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          {transitionIntervalMs ? `${transitionIntervalMs}ms` : "Fast"}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="2000"
                        step="100"
                        value={transitionIntervalMs || 0}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setTransitionIntervalMs(val === 0 ? null : val);
                        }}
                        className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-muted"
                        disabled={!transitionStrategy}
                      />
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        Delay between animation steps
                      </p>
                    </div>

                    {/* Step size */}
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <label className="text-xs sm:text-sm font-medium">Step Size</label>
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          {transitionStepSize || 1} {transitionStepSize === 1 || !transitionStepSize ? "column" : "columns"}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="11"
                        step="1"
                        value={transitionStepSize || 1}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setTransitionStepSize(val === 1 ? null : val);
                        }}
                        className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-muted"
                        disabled={!transitionStrategy}
                      />
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        Columns/rows animated at once
                      </p>
                    </div>
                  </div>
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

