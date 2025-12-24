"use client";

import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { ServiceStatus } from "@/components/service-status";
import { DisplayPreview } from "@/components/display-preview";
import { ServiceControls } from "@/components/service-controls";
import { ConfigDisplay } from "@/components/config-display";
import { TransitionSettingsComponent } from "@/components/transition-settings";
import { PageSelector } from "@/components/page-selector";
import { PageBuilder } from "@/components/page-builder";
import { RotationManager } from "@/components/rotation-manager";
import { DisplayExplorer } from "@/components/display-explorer";
import { LogsViewer } from "@/components/logs-viewer";

export default function Home() {
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
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold tracking-tight">SiestaBoard</h1>
            <ServiceStatus />
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Left column - Preview */}
          <div className="space-y-6">
            <DisplayPreview />
            
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

            {/* Logs Viewer */}
            <LogsViewer />
          </div>

          {/* Right column - Controls & Config */}
          <div className="space-y-6">
            <ServiceControls />
            <PageSelector
              onCreateNew={handleCreatePage}
              onEditPage={handleEditPage}
            />
            <RotationManager />
            {/* Display Explorer Toggle */}
            {!showDisplayExplorer && (
              <button
                onClick={() => setShowDisplayExplorer(true)}
                className="w-full p-2 text-xs text-muted-foreground hover:text-foreground border border-dashed rounded-lg hover:border-primary/50 transition-colors"
              >
                Open Display Explorer
              </button>
            )}
            <TransitionSettingsComponent />
            <ConfigDisplay />
          </div>
        </div>
      </main>
    </div>
  );
}
