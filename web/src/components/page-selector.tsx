"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  LayoutGrid, 
  Plus, 
  FileText, 
  Grid3X3, 
  Code2,
  ChevronRight,
  X
} from "lucide-react";
import { useState } from "react";
import type { PagePreviewResponse } from "@/lib/api";

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
  const router = useRouter();
  const queryClient = useQueryClient();
  const [expandedPage, _setExpandedPage] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<PagePreviewResponse | null>(null);

  // Fetch pages
  const { data, isLoading } = useQuery({
    queryKey: ["pages"],
    queryFn: () => api.getPages(),
    refetchInterval: 30000,
  });

  // Delete page mutation
  const _deleteMutation = useMutation({
    mutationFn: (pageId: string) => api.deletePage(pageId),
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
    },
    onError: () => {
      toast.error("Failed to delete page");
    },
  });

  // Send page mutation
  const _sendMutation = useMutation({
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

  // Preview page mutation
  const _previewMutation = useMutation({
    mutationFn: (pageId: string) => api.previewPage(pageId),
    onSuccess: (data) => {
      setPreviewData(data);
    },
    onError: () => {
      toast.error("Failed to preview page");
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            Saved Pages
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 px-4 sm:px-6">
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
      <CardHeader className="pb-3 px-4 sm:px-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            Saved Pages
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (onCreateNew) {
                onCreateNew();
              } else {
                router.push("/pages/new");
              }
            }}
            className="h-9 sm:h-8 px-3 text-xs"
          >
            <Plus className="h-4 w-4 sm:h-3 sm:w-3 mr-1" />
            New
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 px-4 sm:px-6">
        {/* Preview Panel */}
        {previewData && (
          <div className="mb-4 border rounded-lg overflow-hidden bg-black">
            <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
              <span className="text-xs font-medium truncate">
                Preview: {pages.find(p => p.id === previewData.page_id)?.name || "Page"}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 shrink-0"
                onClick={() => setPreviewData(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-3 sm:p-4 font-mono text-xs sm:text-sm text-vesta-green leading-relaxed overflow-x-auto">
              {previewData.lines.map((line, i) => (
                <div key={i} className="min-h-6 flex items-start">
                  <span className="text-gray-600 w-4 text-right mr-3 text-xs">{i + 1}</span>
                  <span className="tracking-wider whitespace-pre-wrap break-all">{line || "\u00A0"}</span>
                </div>
              ))}
            </div>
          </div>
        )}

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
                  className="flex items-center gap-2 p-3 sm:p-2 cursor-pointer hover:bg-muted/50 active:bg-muted/50 transition-colors min-h-[48px]"
                  onClick={() => {
                    // Navigate directly to edit page using query parameter
                    if (onEditPage) {
                      onEditPage(page.id);
                    } else {
                      router.push(`/pages/edit?id=${page.id}`);
                    }
                  }}
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

                {/* Expanded actions - removed since clicking item now navigates to edit */}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

