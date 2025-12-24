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

export default function Home() {
  const [showPageBuilder, setShowPageBuilder] = useState(false);
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
          </div>

          {/* Right column - Controls & Config */}
          <div className="space-y-6">
            <ServiceControls />
            <PageSelector
              onCreateNew={handleCreatePage}
              onEditPage={handleEditPage}
            />
            <TransitionSettingsComponent />
            <ConfigDisplay />
          </div>
        </div>
      </main>
    </div>
  );
}
