"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  LayoutGrid, 
  Plus, 
  Play, 
  Trash2, 
  FileText, 
  Grid3X3, 
  Code2,
  ChevronRight
} from "lucide-react";
import { useState } from "react";

// Page type icons
const PAGE_TYPE_ICONS: Record<string, typeof FileText> = {
  single: FileText,
  composite: Grid3X3,
  template: Code2,
};

interface PageSelectorProps {
  onCreateNew?: () => void;
  onEditPage?: (pageId: string) => void;
}

export function PageSelector({ onCreateNew, onEditPage }: PageSelectorProps) {
  const queryClient = useQueryClient();
  const [expandedPage, setExpandedPage] = useState<string | null>(null);

  // Fetch pages
  const { data, isLoading } = useQuery({
    queryKey: ["pages"],
    queryFn: () => api.getPages(),
    refetchInterval: 30000,
  });

  // Delete page mutation
  const deleteMutation = useMutation({
    mutationFn: (pageId: string) => api.deletePage(pageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pages"] });
      toast.success("Page deleted");
    },
    onError: () => {
      toast.error("Failed to delete page");
    },
  });

  // Send page mutation
  const sendMutation = useMutation({
    mutationFn: (pageId: string) => api.sendPage(pageId),
    onSuccess: (data) => {
      if (data.sent_to_board) {
        toast.success("Page sent to board");
      } else {
        toast.info("Page previewed (dev mode)");
      }
    },
    onError: () => {
      toast.error("Failed to send page");
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            Saved Pages
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  const pages = data?.pages || [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            Saved Pages
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={onCreateNew}
            className="h-7 px-2 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            New
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {pages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No saved pages yet.
            <br />
            Create one to get started!
          </p>
        ) : (
          pages.map((page) => {
            const TypeIcon = PAGE_TYPE_ICONS[page.type] || FileText;
            const isExpanded = expandedPage === page.id;

            return (
              <div
                key={page.id}
                className="border rounded-lg overflow-hidden"
              >
                {/* Page header */}
                <div
                  className="flex items-center gap-2 p-2 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setExpandedPage(isExpanded ? null : page.id)}
                >
                  <TypeIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium flex-1 truncate">
                    {page.name}
                  </span>
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    {page.type}
                  </Badge>
                  <ChevronRight
                    className={`h-4 w-4 text-muted-foreground transition-transform ${
                      isExpanded ? "rotate-90" : ""
                    }`}
                  />
                </div>

                {/* Expanded actions */}
                {isExpanded && (
                  <div className="border-t p-2 bg-muted/30 flex gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      className="flex-1 h-7 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        sendMutation.mutate(page.id);
                      }}
                      disabled={sendMutation.isPending}
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Send
                    </Button>
                    {onEditPage && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditPage(page.id);
                        }}
                      >
                        Edit
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete "${page.name}"?`)) {
                          deleteMutation.mutate(page.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

