"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Wand2,
  X,
  Plus,
  Eye,
  Save,
  FileText,
  Grid3X3,
  Code2,
  Palette,
  Info,
  Trash2,
} from "lucide-react";
import { api, PageCreate, PageUpdate, PageType, RowConfig } from "@/lib/api";

// Page type configurations
const PAGE_TYPES = [
  {
    type: "single" as const,
    label: "Single Source",
    icon: FileText,
    description: "Display one data source",
  },
  {
    type: "template" as const,
    label: "Template",
    icon: Code2,
    description: "Custom text with variables",
  },
  {
    type: "composite" as const,
    label: "Composite",
    icon: Grid3X3,
    description: "Mix rows from sources",
  },
];

// Display types for single pages
const DISPLAY_TYPES = [
  { value: "weather", label: "Weather" },
  { value: "datetime", label: "Date/Time" },
  { value: "weather_datetime", label: "Weather + Time" },
  { value: "home_assistant", label: "Home Assistant" },
  { value: "apple_music", label: "Apple Music" },
  { value: "star_trek", label: "Star Trek Quote" },
  { value: "guest_wifi", label: "Guest WiFi" },
];

// Color palette for templates
const COLORS = [
  { name: "red", code: 63, className: "bg-red-500" },
  { name: "orange", code: 64, className: "bg-orange-500" },
  { name: "yellow", code: 65, className: "bg-yellow-400" },
  { name: "green", code: 66, className: "bg-green-500" },
  { name: "blue", code: 67, className: "bg-blue-500" },
  { name: "violet", code: 68, className: "bg-violet-500" },
  { name: "white", code: 69, className: "bg-white border" },
  { name: "black", code: 70, className: "bg-black" },
];

interface PageBuilderProps {
  pageId?: string; // If provided, edit existing page
  onClose: () => void;
  onSave?: () => void;
}

export function PageBuilder({ pageId, onClose, onSave }: PageBuilderProps) {
  const queryClient = useQueryClient();

  // Form state
  const [name, setName] = useState("");
  const [pageType, setPageType] = useState<"single" | "template" | "composite">("single");
  const [displayType, setDisplayType] = useState("weather");
  const [templateLines, setTemplateLines] = useState<string[]>(["", "", "", "", "", ""]);
  const [rows, setRows] = useState<RowConfig[]>([]);
  const [duration, setDuration] = useState(300);
  const [preview, setPreview] = useState<string | null>(null);

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
      setPageType(existingPage.type);
      setDisplayType(existingPage.display_type || "weather");
      setTemplateLines(existingPage.template || ["", "", "", "", "", ""]);
      setRows(existingPage.rows || []);
      setDuration(existingPage.duration_seconds || 300);
    }
  }, [existingPage]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (pageId) {
        // Update existing page
        const payload: PageUpdate = {
          name,
          duration_seconds: duration,
        };
        if (pageType === "single") {
          payload.display_type = displayType;
        } else if (pageType === "template") {
          payload.template = templateLines;
        } else if (pageType === "composite") {
          payload.rows = rows;
        }
        return api.updatePage(pageId, payload);
      } else {
        // Create new page
        const payload: PageCreate = {
          name,
          type: pageType as PageType,
          duration_seconds: duration,
        };
        if (pageType === "single") {
          payload.display_type = displayType;
        } else if (pageType === "template") {
          payload.template = templateLines;
        } else if (pageType === "composite") {
          payload.rows = rows;
        }
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

  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: () => api.renderTemplate(templateLines),
    onSuccess: (data) => {
      setPreview(data.rendered);
    },
    onError: () => {
      toast.error("Failed to generate preview");
    },
  });

  // Insert variable helper
  const insertVariable = (variable: string, lineIndex: number) => {
    const newLines = [...templateLines];
    newLines[lineIndex] = newLines[lineIndex] + `{{${variable}}}`;
    setTemplateLines(newLines);
  };

  // Insert color helper
  const insertColor = (colorName: string, lineIndex: number) => {
    const newLines = [...templateLines];
    newLines[lineIndex] = newLines[lineIndex] + `{${colorName}}`;
    setTemplateLines(newLines);
  };

  if (pageId && loadingPage) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Wand2 className="h-4 w-4" />
            {pageId ? "Edit Page" : "Create Page"}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Page name */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium">Page Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Custom Page"
            className="w-full h-8 px-2 text-sm rounded-md border bg-background"
          />
        </div>

        {/* Page type selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium">Page Type</label>
          <div className="grid grid-cols-3 gap-2">
            {PAGE_TYPES.map((pt) => (
              <button
                key={pt.type}
                onClick={() => setPageType(pt.type)}
                className={`p-2 rounded-md border text-center transition-colors ${
                  pageType === pt.type
                    ? "border-primary bg-primary/10"
                    : "border-muted hover:border-primary/50"
                }`}
              >
                <pt.icon className="h-4 w-4 mx-auto mb-1" />
                <div className="text-xs font-medium">{pt.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Single page: source selector */}
        {pageType === "single" && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Display Source</label>
            <select
              value={displayType}
              onChange={(e) => setDisplayType(e.target.value)}
              className="w-full h-8 px-2 text-sm rounded-md border bg-background"
            >
              {DISPLAY_TYPES.map((dt) => (
                <option key={dt.value} value={dt.value}>
                  {dt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Template page: line editors */}
        {pageType === "template" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium">Template Lines</label>
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2 text-xs"
                onClick={() => previewMutation.mutate()}
                disabled={previewMutation.isPending}
              >
                <Eye className="h-3 w-3 mr-1" />
                Preview
              </Button>
            </div>

            {/* Helper: show available variables */}
            <div className="p-2 bg-muted/50 rounded-md text-[10px] space-y-1">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Info className="h-3 w-3" />
                Variables: {"{"}{"{"}<span className="text-primary">source.field</span>{"}"}{"}"}, e.g. {"{"}{"{"}<span className="text-primary">weather.temp</span>{"}"}{"}"}
              </div>
              <div className="flex gap-1 flex-wrap">
                {variablesData?.symbols?.slice(0, 6).map((s: string) => (
                  <Badge key={s} variant="outline" className="text-[10px]">
                    {"{"+s+"}"}
                  </Badge>
                ))}
              </div>
            </div>

            {/* 6 template lines */}
            {templateLines.map((line, i) => (
              <div key={i} className="flex gap-1">
                <span className="text-xs text-muted-foreground w-4 shrink-0 pt-2">
                  {i + 1}
                </span>
                <input
                  type="text"
                  value={line}
                  onChange={(e) => {
                    const newLines = [...templateLines];
                    newLines[i] = e.target.value;
                    setTemplateLines(newLines);
                  }}
                  maxLength={60}
                  placeholder={`Line ${i + 1}...`}
                  className="flex-1 h-7 px-2 text-xs font-mono rounded border bg-background"
                />
                {/* Quick insert buttons */}
                <div className="flex gap-0.5">
                  <button
                    className="p-1 text-muted-foreground hover:text-primary"
                    title="Insert variable"
                    onClick={() => {
                      const variable = prompt("Enter variable (e.g., weather.temp):");
                      if (variable) insertVariable(variable, i);
                    }}
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                  <button
                    className="p-1 text-muted-foreground hover:text-primary"
                    title="Insert color"
                    onClick={() => {
                      const color = prompt("Enter color (red, blue, green, etc.):");
                      if (color) insertColor(color, i);
                    }}
                  >
                    <Palette className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}

            {/* Color palette */}
            <div className="flex gap-1 pt-1">
              {COLORS.map((c) => (
                <button
                  key={c.name}
                  title={c.name}
                  onClick={() => {
                    const idx = templateLines.findIndex(l => l === "") || 0;
                    insertColor(c.name, Math.min(idx, 5));
                  }}
                  className={`w-5 h-5 rounded ${c.className}`}
                />
              ))}
            </div>

            {/* Live preview */}
            {preview && (
              <div className="mt-2 p-2 bg-black text-white font-mono text-xs rounded">
                <pre className="whitespace-pre-wrap">{preview}</pre>
              </div>
            )}
          </div>
        )}

        {/* Composite page: row configuration */}
        {pageType === "composite" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium">Row Configuration</label>
              <span className="text-[10px] text-muted-foreground">
                Map source rows to display rows
              </span>
            </div>

            {/* Info box */}
            <div className="p-2 bg-muted/50 rounded-md text-[10px] space-y-1">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Info className="h-3 w-3" />
                Select a source, pick which row from that source, and where to display it
              </div>
            </div>

            {/* Row configurations */}
            <div className="space-y-2">
              {rows.map((row, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 rounded-md border bg-muted/30"
                >
                  <span className="text-xs text-muted-foreground w-6 shrink-0">
                    #{index + 1}
                  </span>
                  
                  {/* Source selector */}
                  <select
                    value={row.source}
                    onChange={(e) => {
                      const newRows = [...rows];
                      newRows[index] = { ...row, source: e.target.value };
                      setRows(newRows);
                    }}
                    className="flex-1 h-7 px-2 text-xs rounded border bg-background"
                  >
                    <option value="">Select source...</option>
                    {DISPLAY_TYPES.map((dt) => (
                      <option key={dt.value} value={dt.value}>
                        {dt.label}
                      </option>
                    ))}
                  </select>

                  {/* Source row index */}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">Row</span>
                    <select
                      value={row.row_index}
                      onChange={(e) => {
                        const newRows = [...rows];
                        newRows[index] = { ...row, row_index: parseInt(e.target.value) };
                        setRows(newRows);
                      }}
                      className="w-12 h-7 px-1 text-xs rounded border bg-background"
                    >
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <option key={i} value={i}>
                          {i + 1}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Arrow */}
                  <span className="text-muted-foreground">→</span>

                  {/* Target row */}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">Display</span>
                    <select
                      value={row.target_row}
                      onChange={(e) => {
                        const newRows = [...rows];
                        newRows[index] = { ...row, target_row: parseInt(e.target.value) };
                        setRows(newRows);
                      }}
                      className="w-12 h-7 px-1 text-xs rounded border bg-background"
                    >
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <option key={i} value={i}>
                          {i + 1}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={() => {
                      const newRows = rows.filter((_, i) => i !== index);
                      setRows(newRows);
                    }}
                    className="p-1 text-destructive hover:bg-destructive/10 rounded"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}

              {/* Add row button */}
              {rows.length < 6 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-7 text-xs"
                  onClick={() => {
                    // Find first unused target row
                    const usedTargets = new Set(rows.map((r) => r.target_row));
                    let nextTarget = 0;
                    for (let i = 0; i < 6; i++) {
                      if (!usedTargets.has(i)) {
                        nextTarget = i;
                        break;
                      }
                    }
                    setRows([
                      ...rows,
                      { source: "weather", row_index: 0, target_row: nextTarget },
                    ]);
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Row Mapping
                </Button>
              )}
            </div>

            {/* Visual preview of mapping */}
            {rows.length > 0 && (
              <div className="mt-2 p-2 bg-black rounded">
                <div className="text-[10px] text-gray-400 mb-1">Preview Layout:</div>
                <div className="grid grid-cols-6 gap-0.5">
                  {[0, 1, 2, 3, 4, 5].map((targetRow) => {
                    const mapping = rows.find((r) => r.target_row === targetRow);
                    return (
                      <div
                        key={targetRow}
                        className={`h-4 rounded text-[8px] flex items-center justify-center ${
                          mapping
                            ? "bg-primary/30 text-primary"
                            : "bg-gray-800 text-gray-600"
                        }`}
                      >
                        {mapping ? mapping.source.slice(0, 3) : "—"}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Duration */}
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <label className="text-xs font-medium">Rotation Duration</label>
            <span className="text-xs text-muted-foreground">
              {Math.floor(duration / 60)}m {duration % 60}s
            </span>
          </div>
          <input
            type="range"
            min="30"
            max="600"
            step="30"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-muted"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            className="flex-1"
            onClick={() => saveMutation.mutate()}
            disabled={!name.trim() || saveMutation.isPending}
          >
            <Save className="h-3.5 w-3.5 mr-1" />
            {saveMutation.isPending ? "Saving..." : "Save Page"}
          </Button>
          <Button size="sm" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

