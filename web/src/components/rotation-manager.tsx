"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  RotateCw,
  Plus,
  Play,
  Pause,
  Trash2,
  GripVertical,
  ChevronRight,
  Clock,
  FileText,
  X,
  Save,
  Edit2,
} from "lucide-react";
import {
  api,
  Rotation,
  RotationCreate,
  RotationUpdate,
  RotationEntry,
  Page,
} from "@/lib/api";

interface RotationManagerProps {
  onClose?: () => void;
}

// Rotation Form for Create/Edit
function RotationForm({
  rotation,
  pages,
  onSave,
  onCancel,
}: {
  rotation?: Rotation;
  pages: Page[];
  onSave: (data: RotationCreate | RotationUpdate) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(rotation?.name || "");
  const [defaultDuration, setDefaultDuration] = useState(
    rotation?.default_duration || 300
  );
  const [enabled, setEnabled] = useState(rotation?.enabled ?? true);
  const [entries, setEntries] = useState<RotationEntry[]>(
    rotation?.pages || []
  );

  const availablePages = pages.filter(
    (p) => !entries.some((e) => e.page_id === p.id)
  );

  const addPage = (pageId: string) => {
    setEntries([...entries, { page_id: pageId }]);
  };

  const removePage = (index: number) => {
    setEntries(entries.filter((_, i) => i !== index));
  };

  const updateDurationOverride = (index: number, duration: number | undefined) => {
    const newEntries = [...entries];
    newEntries[index] = {
      ...newEntries[index],
      duration_override: duration,
    };
    setEntries(newEntries);
  };

  const moveEntry = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= entries.length) return;
    const newEntries = [...entries];
    const [moved] = newEntries.splice(fromIndex, 1);
    newEntries.splice(toIndex, 0, moved);
    setEntries(newEntries);
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error("Rotation name is required");
      return;
    }
    if (entries.length === 0) {
      toast.error("Rotation must have at least one page");
      return;
    }

    const data: RotationCreate | RotationUpdate = {
      name,
      pages: entries,
      default_duration: defaultDuration,
      enabled,
    };
    onSave(data);
  };

  const getPageName = (pageId: string) => {
    return pages.find((p) => p.id === pageId)?.name || pageId;
  };

  return (
    <div className="space-y-4">
      {/* Name */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium">Rotation Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Rotation"
          className="w-full h-8 px-2 text-sm rounded-md border bg-background"
        />
      </div>

      {/* Default Duration */}
      <div className="space-y-1.5">
        <div className="flex justify-between">
          <label className="text-xs font-medium">Default Page Duration</label>
          <span className="text-xs text-muted-foreground">
            {Math.floor(defaultDuration / 60)}m {defaultDuration % 60}s
          </span>
        </div>
        <input
          type="range"
          min="30"
          max="600"
          step="30"
          value={defaultDuration}
          onChange={(e) => setDefaultDuration(parseInt(e.target.value))}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-muted"
        />
      </div>

      {/* Enabled */}
      <div className="flex items-center gap-2">
        <Switch checked={enabled} onCheckedChange={setEnabled} id="rotation-enabled" />
        <label htmlFor="rotation-enabled" className="text-xs cursor-pointer">
          Enabled
        </label>
      </div>

      {/* Pages in Rotation */}
      <div className="space-y-2">
        <label className="text-xs font-medium">Pages in Rotation</label>
        {entries.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">
            No pages added yet. Add pages below.
          </p>
        ) : (
          <div className="space-y-1">
            {entries.map((entry, index) => (
              <div
                key={`${entry.page_id}-${index}`}
                className="flex items-center gap-2 p-2 rounded-md border bg-muted/30"
              >
                <div className="flex flex-col gap-0.5">
                  <button
                    className="p-0.5 hover:bg-muted rounded"
                    onClick={() => moveEntry(index, index - 1)}
                    disabled={index === 0}
                  >
                    <ChevronRight className="h-3 w-3 -rotate-90" />
                  </button>
                  <button
                    className="p-0.5 hover:bg-muted rounded"
                    onClick={() => moveEntry(index, index + 1)}
                    disabled={index === entries.length - 1}
                  >
                    <ChevronRight className="h-3 w-3 rotate-90" />
                  </button>
                </div>
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium flex-1 truncate">
                  {getPageName(entry.page_id)}
                </span>
                <input
                  type="number"
                  placeholder="Duration"
                  value={entry.duration_override || ""}
                  onChange={(e) =>
                    updateDurationOverride(
                      index,
                      e.target.value ? parseInt(e.target.value) : undefined
                    )
                  }
                  className="w-16 h-6 px-1 text-xs rounded border bg-background"
                  title="Duration override (seconds)"
                />
                <button
                  onClick={() => removePage(index)}
                  className="p-1 text-destructive hover:bg-destructive/10 rounded"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add Page Dropdown */}
        {availablePages.length > 0 && (
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) addPage(e.target.value);
            }}
            className="w-full h-8 px-2 text-sm rounded-md border bg-background"
          >
            <option value="">Add a page...</option>
            {availablePages.map((page) => (
              <option key={page.id} value={page.id}>
                {page.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button size="sm" className="flex-1" onClick={handleSubmit}>
          <Save className="h-3.5 w-3.5 mr-1" />
          {rotation ? "Update" : "Create"} Rotation
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// Active Rotation Status Display
function ActiveRotationStatus() {
  const { data, isLoading } = useQuery({
    queryKey: ["rotation-active"],
    queryFn: () => api.getActiveRotation(),
    refetchInterval: 5000,
  });

  if (isLoading) {
    return <Skeleton className="h-16 w-full" />;
  }

  if (!data?.active) {
    return (
      <div className="p-3 rounded-md border border-dashed bg-muted/30 text-center">
        <p className="text-xs text-muted-foreground">No rotation active</p>
      </div>
    );
  }

  const timeRemaining = data.page_duration && data.time_on_page 
    ? Math.max(0, data.page_duration - data.time_on_page)
    : null;

  return (
    <div className="p-3 rounded-md border bg-primary/5 border-primary/20">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-primary">
          {data.rotation_name}
        </span>
        <Badge variant="default" className="text-[10px]">
          Active
        </Badge>
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <FileText className="h-3 w-3" />
          <span>
            Page {(data.current_page_index ?? 0) + 1}
            {data.total_pages ? ` of ${data.total_pages}` : ""}
          </span>
        </div>
        {timeRemaining !== null && (
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{timeRemaining}s remaining</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function RotationManager({ onClose }: RotationManagerProps) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingRotation, setEditingRotation] = useState<Rotation | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Fetch rotations
  const { data: rotationsData, isLoading: loadingRotations } = useQuery({
    queryKey: ["rotations"],
    queryFn: () => api.getRotations(),
    refetchInterval: 10000,
  });

  // Fetch pages for the form
  const { data: pagesData } = useQuery({
    queryKey: ["pages"],
    queryFn: () => api.getPages(),
  });

  // Create rotation
  const createMutation = useMutation({
    mutationFn: (data: RotationCreate) => api.createRotation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rotations"] });
      toast.success("Rotation created");
      setShowForm(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Update rotation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: RotationUpdate }) =>
      api.updateRotation(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rotations"] });
      toast.success("Rotation updated");
      setEditingRotation(null);
      setShowForm(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete rotation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteRotation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rotations"] });
      toast.success("Rotation deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Activate rotation
  const activateMutation = useMutation({
    mutationFn: (id: string) => api.activateRotation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rotations"] });
      queryClient.invalidateQueries({ queryKey: ["rotation-active"] });
      toast.success("Rotation activated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Deactivate rotation
  const deactivateMutation = useMutation({
    mutationFn: () => api.deactivateRotation(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rotations"] });
      queryClient.invalidateQueries({ queryKey: ["rotation-active"] });
      toast.success("Rotation deactivated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSave = (data: RotationCreate | RotationUpdate) => {
    if (editingRotation) {
      updateMutation.mutate({ id: editingRotation.id, data });
    } else {
      createMutation.mutate(data as RotationCreate);
    }
  };

  const handleEdit = (rotation: Rotation) => {
    setEditingRotation(rotation);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingRotation(null);
  };

  const rotations = rotationsData?.rotations || [];
  const activeRotationId = rotationsData?.active_rotation_id;
  const pages = pagesData?.pages || [];

  if (loadingRotations) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <RotateCw className="h-4 w-4" />
            Rotations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <RotateCw className="h-4 w-4" />
            Rotations
          </CardTitle>
          <div className="flex items-center gap-2">
            {!showForm && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowForm(true)}
                className="h-7 px-2 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                New
              </Button>
            )}
            {onClose && (
              <Button size="sm" variant="ghost" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Active Rotation Status */}
        <ActiveRotationStatus />

        {/* Create/Edit Form */}
        {showForm && (
          <div className="border rounded-lg p-3 bg-muted/20">
            <h4 className="text-sm font-medium mb-3">
              {editingRotation ? "Edit Rotation" : "Create Rotation"}
            </h4>
            <RotationForm
              rotation={editingRotation || undefined}
              pages={pages}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          </div>
        )}

        {/* Rotation List */}
        {!showForm && (
          <div className="space-y-2">
            {rotations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No rotations yet.
                <br />
                Create one to cycle through pages!
              </p>
            ) : (
              rotations.map((rotation) => {
                const isActive = rotation.id === activeRotationId;
                const isExpanded = expandedId === rotation.id;

                return (
                  <div
                    key={rotation.id}
                    className={`border rounded-lg overflow-hidden ${
                      isActive ? "border-primary/50 bg-primary/5" : ""
                    }`}
                  >
                    {/* Rotation header */}
                    <div
                      className="flex items-center gap-2 p-2 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : rotation.id)}
                    >
                      <span className="text-sm font-medium flex-1 truncate">
                        {rotation.name}
                      </span>
                      <Badge
                        variant={isActive ? "default" : "secondary"}
                        className="text-[10px] shrink-0"
                      >
                        {rotation.pages.length} pages
                      </Badge>
                      {isActive && (
                        <Badge variant="default" className="text-[10px] bg-green-600">
                          Active
                        </Badge>
                      )}
                      <ChevronRight
                        className={`h-4 w-4 text-muted-foreground transition-transform ${
                          isExpanded ? "rotate-90" : ""
                        }`}
                      />
                    </div>

                    {/* Expanded actions */}
                    {isExpanded && (
                      <div className="border-t p-2 bg-muted/30 space-y-2">
                        {/* Page list */}
                        <div className="text-xs text-muted-foreground">
                          <span className="font-medium">Pages:</span>{" "}
                          {rotation.pages
                            .map((e) => pages.find((p) => p.id === e.page_id)?.name || e.page_id)
                            .join(" → ")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <span className="font-medium">Duration:</span>{" "}
                          {rotation.default_duration}s per page
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-1">
                          {isActive ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 h-7 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                deactivateMutation.mutate();
                              }}
                              disabled={deactivateMutation.isPending}
                            >
                              <Pause className="h-3 w-3 mr-1" />
                              Deactivate
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="default"
                              className="flex-1 h-7 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                activateMutation.mutate(rotation.id);
                              }}
                              disabled={activateMutation.isPending}
                            >
                              <Play className="h-3 w-3 mr-1" />
                              Activate
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(rotation);
                            }}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Delete "${rotation.name}"?`)) {
                                deleteMutation.mutate(rotation.id);
                              }
                            }}
                            disabled={deleteMutation.isPending || isActive}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

