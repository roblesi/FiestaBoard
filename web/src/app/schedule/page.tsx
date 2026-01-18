"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScheduleEntryForm } from "@/components/schedule-entry-form";
import { PagePickerDialog } from "@/components/page-picker-dialog";
import { Plus, Edit, Trash2, AlertCircle, Calendar, CheckCircle2, AlertTriangle } from "lucide-react";
import { api, type ScheduleEntry, type ScheduleCreate, type ScheduleUpdate } from "@/lib/api";
import { toast } from "sonner";

export default function SchedulePage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleEntry | null>(null);
  const [deleteScheduleId, setDeleteScheduleId] = useState<string | null>(null);
  const [showDefaultPageSelector, setShowDefaultPageSelector] = useState(false);

  // Fetch schedules
  const { data: schedulesData, isLoading } = useQuery({
    queryKey: ["schedules"],
    queryFn: api.getSchedules,
  });

  // Fetch pages for form
  const { data: pagesData } = useQuery({
    queryKey: ["pages"],
    queryFn: api.getPages,
  });

  // Fetch validation
  const { data: validation } = useQuery({
    queryKey: ["schedules", "validation"],
    queryFn: api.validateSchedules,
    enabled: (schedulesData?.schedules.length || 0) > 0,
  });

  // Toggle schedule mode
  const toggleSchedule = useMutation({
    mutationFn: (enabled: boolean) => api.setScheduleEnabled(enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      toast.success(schedulesData?.enabled ? "Schedule mode disabled" : "Schedule mode enabled");
    },
    onError: () => {
      toast.error("Failed to toggle schedule mode");
    },
  });

  // Create schedule
  const createSchedule = useMutation({
    mutationFn: (data: ScheduleCreate) => api.createSchedule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      queryClient.invalidateQueries({ queryKey: ["schedules", "validation"] });
      toast.success("Schedule created");
      setShowForm(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create schedule");
      throw error;
    },
  });

  // Update schedule
  const updateSchedule = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ScheduleUpdate }) =>
      api.updateSchedule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      queryClient.invalidateQueries({ queryKey: ["schedules", "validation"] });
      toast.success("Schedule updated");
      setShowForm(false);
      setEditingSchedule(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update schedule");
      throw error;
    },
  });

  // Delete schedule
  const deleteSchedule = useMutation({
    mutationFn: (id: string) => api.deleteSchedule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      queryClient.invalidateQueries({ queryKey: ["schedules", "validation"] });
      toast.success("Schedule deleted");
      setDeleteScheduleId(null);
    },
    onError: () => {
      toast.error("Failed to delete schedule");
    },
  });

  // Set default page
  const setDefaultPage = useMutation({
    mutationFn: (pageId: string | null) => api.setDefaultPage(pageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      toast.success("Default page updated");
      setShowDefaultPageSelector(false);
    },
    onError: () => {
      toast.error("Failed to set default page");
    },
  });

  const handleSubmit = async (data: ScheduleCreate | ScheduleUpdate) => {
    if (editingSchedule) {
      await updateSchedule.mutateAsync({ id: editingSchedule.id, data });
    } else {
      await createSchedule.mutateAsync(data as ScheduleCreate);
    }
  };

  const handleEdit = (schedule: ScheduleEntry) => {
    setEditingSchedule(schedule);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    setDeleteScheduleId(id);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingSchedule(null);
  };

  const formatDays = (schedule: ScheduleEntry): string => {
    if (schedule.day_pattern === "all") return "All days";
    if (schedule.day_pattern === "weekdays") return "Mon-Fri";
    if (schedule.day_pattern === "weekends") return "Sat-Sun";
    if (schedule.day_pattern === "custom" && schedule.custom_days) {
      return schedule.custom_days
        .map((d) => d.slice(0, 3).charAt(0).toUpperCase() + d.slice(1, 3))
        .join(", ");
    }
    return "";
  };

  const getPageName = (pageId: string): string => {
    return pagesData?.pages.find((p) => p.id === pageId)?.name || pageId;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 sm:p-6 md:p-8">
        <div className="container mx-auto max-w-6xl">
          <Skeleton className="h-10 w-48 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  const schedules = schedulesData?.schedules || [];
  const defaultPageId = schedulesData?.default_page_id;
  const scheduleEnabled = schedulesData?.enabled || false;
  const hasOverlaps = (validation?.overlaps?.length || 0) > 0;
  const hasGaps = (validation?.gaps?.length || 0) > 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Schedule</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Automate page rotation based on time and day
          </p>
          <p className="text-muted-foreground text-xs mt-1">
            Times shown in: {Intl.DateTimeFormat().resolvedOptions().timeZone}
          </p>
        </div>

        {/* Schedule Mode Toggle */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Schedule Mode</CardTitle>
                <CardDescription>
                  {scheduleEnabled
                    ? "Pages automatically rotate based on schedule"
                    : "Pages are controlled manually"}
                </CardDescription>
              </div>
              <Switch
                checked={scheduleEnabled}
                onCheckedChange={toggleSchedule.mutate}
                disabled={toggleSchedule.isPending}
              />
            </div>
          </CardHeader>
        </Card>

        {/* Validation Status */}
        {scheduleEnabled && (hasOverlaps || hasGaps) && (
          <Alert 
            variant={hasOverlaps ? "destructive" : "default"} 
            className={`mb-6 ${hasGaps && !hasOverlaps && defaultPageId ? "border-blue-500/50 bg-blue-500/10" : ""}`}
          >
            {hasOverlaps ? (
              <AlertCircle className="h-4 w-4" />
            ) : hasGaps && defaultPageId ? (
              <CheckCircle2 className="h-4 w-4 text-blue-500" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            <AlertDescription>
              {hasOverlaps && (
                <div className="font-semibold mb-2">Schedule Conflicts Detected</div>
              )}
              {validation?.overlaps?.map((overlap, i) => (
                <div key={i} className="text-sm">
                  {overlap?.conflict_description || "Unknown conflict"}
                </div>
              ))}
              {hasGaps && !hasOverlaps && (
                <div className="text-sm space-y-2">
                  <div>
                    {validation?.gaps?.length || 0} time gap(s) in schedule.{" "}
                    {defaultPageId ? (
                      <span className="text-blue-600 dark:text-blue-400">
                        Default page &quot;{getPageName(defaultPageId)}&quot; will be shown.
                      </span>
                    ) : (
                      <span>Consider setting a default page.</span>
                    )}
                  </div>
                  {validation?.gaps && validation.gaps.length > 0 && (
                    <div className="mt-2 space-y-1 text-xs opacity-90">
                      <div className="font-semibold">Time gaps:</div>
                      {validation.gaps.map((gap, i) => {
                        // Skip gaps with missing data
                        if (!gap?.day || !gap?.start_time || !gap?.end_time) return null;
                        
                        return (
                          <div key={i} className="pl-2">
                            • {gap.day.charAt(0).toUpperCase() + gap.day.slice(1)}: {gap.start_time} - {gap.end_time}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Default Page */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Default Page</CardTitle>
            <CardDescription>
              Page to display when no schedule matches (gaps)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-sm">
                {defaultPageId ? (
                  <Badge variant="secondary">{getPageName(defaultPageId)}</Badge>
                ) : (
                  <span className="text-muted-foreground">No default page set</span>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowDefaultPageSelector(true)}
              >
                Change
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Schedule List */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Schedule Entries</CardTitle>
              <Button size="sm" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Schedule
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {schedules.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No schedules created yet</p>
                <p className="text-sm mt-1">Click "Add Schedule" to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {schedules.map((schedule) => {
                  const page = pagesData?.pages.find((p) => p.id === schedule.page_id);
                  return (
                    <div
                      key={schedule.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{page?.name || schedule.page_id}</span>
                          {!schedule.enabled && (
                            <Badge variant="secondary">Disabled</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {schedule.start_time} - {schedule.end_time} • {formatDays(schedule)}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(schedule)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(schedule.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Form Dialog */}
        {showForm && pagesData && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle>{editingSchedule ? "Edit" : "Add"} Schedule</CardTitle>
              </CardHeader>
              <CardContent>
                <ScheduleEntryForm
                  schedule={editingSchedule || undefined}
                  pages={pagesData.pages.map((p) => ({ id: p.id, name: p.name }))}
                  onSubmit={handleSubmit}
                  onCancel={handleCloseForm}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Default Page Selector Dialog */}
        {showDefaultPageSelector && pagesData && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Set Default Page</CardTitle>
                <CardDescription>
                  This page will display during schedule gaps
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PagePickerDialog
                  pages={pagesData.pages}
                  selectedPageId={defaultPageId || null}
                  onSelect={(pageId) => {
                    setDefaultPage.mutate(pageId);
                  }}
                  allowNone={true}
                />
                <div className="flex justify-end gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowDefaultPageSelector(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteScheduleId} onOpenChange={() => setDeleteScheduleId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Schedule</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this schedule? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteScheduleId && deleteSchedule.mutate(deleteScheduleId)}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
