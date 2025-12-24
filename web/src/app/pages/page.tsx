"use client";

import { useState } from "react";
import { PageSelector } from "@/components/page-selector";
import { PageBuilder } from "@/components/page-builder";
import { DisplayExplorer } from "@/components/display-explorer";
import { RotationManager } from "@/components/rotation-manager";

export default function PagesPage() {
  const [showPageBuilder, setShowPageBuilder] = useState(false);
  const [showDisplayExplorer, setShowDisplayExplorer] = useState(false);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);

  const handleCreatePage = () => {
    setEditingPageId(null);
    setShowPageBuilder(true);
  };

  const handleEditPage = (pageId: string) => {
    setEditingPageId(pageId);
    setShowPageBuilder(true);
  };

  const handleCloseBuilder = () => {
    setShowPageBuilder(false);
    setEditingPageId(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Pages</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage content for your Vestaboard
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Main content area */}
          <div className="space-y-6">
            {/* Page Builder (when open) */}
            {showPageBuilder && (
              <PageBuilder
                pageId={editingPageId ?? undefined}
                onClose={handleCloseBuilder}
                onSave={handleCloseBuilder}
              />
            )}

            {/* Display Explorer (when open) */}
            {showDisplayExplorer && (
              <DisplayExplorer onClose={() => setShowDisplayExplorer(false)} />
            )}

            {/* Page List */}
            <PageSelector
              onCreateNew={handleCreatePage}
              onEditPage={handleEditPage}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <RotationManager />
            
            {/* Display Explorer Toggle */}
            {!showDisplayExplorer && (
              <button
                onClick={() => setShowDisplayExplorer(true)}
                className="w-full p-4 text-sm text-muted-foreground hover:text-foreground border border-dashed rounded-lg hover:border-primary/50 transition-colors"
              >
                Browse Data Sources
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

