"use client";

import { useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { PageGridSelector } from "@/components/page-grid-selector";
import { useViewTransition } from "@/hooks/use-view-transition";

export default function PagesPage() {
  const { push } = useViewTransition();

  const handleSelectPage = useCallback((pageId: string) => {
    push(`/pages/edit/${pageId}`, { transitionType: "slide-up" });
  }, [push]);

  const handleCreateNew = useCallback(() => {
    push("/pages/new", { transitionType: "slide-up" });
  }, [push]);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 max-w-full">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Pages
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Create and manage content for your board
          </p>
        </div>

        {/* Page Grid */}
        <Card>
          <CardHeader className="pb-3 px-4 sm:px-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg">
                Saved Pages
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCreateNew}
                className="h-9 sm:h-8 px-3 text-xs"
              >
                <Plus className="h-4 w-4 sm:h-3 sm:w-3 mr-1" />
                New
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <PageGridSelector
              onSelectPage={handleSelectPage}
              showActiveIndicator={false}
              label="SELECT PAGE TO EDIT"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

