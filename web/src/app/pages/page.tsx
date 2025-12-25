"use client";

import { useState } from "react";
import { PageSelector } from "@/components/page-selector";
import { DisplayExplorer } from "@/components/display-explorer";

export default function PagesPage() {
  const [showDisplayExplorer, setShowDisplayExplorer] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Pages</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Create and manage content for your Vestaboard
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 sm:gap-6">
          {/* Main content area */}
          <div className="space-y-4 sm:space-y-6">
            {/* Display Explorer (when open) */}
            {showDisplayExplorer && (
              <DisplayExplorer onClose={() => setShowDisplayExplorer(false)} />
            )}

            {/* Page List */}
            <PageSelector />
          </div>

          {/* Sidebar */}
          <div className="space-y-4 sm:space-y-6">
            {/* Display Explorer Toggle */}
            {!showDisplayExplorer && (
              <button
                onClick={() => setShowDisplayExplorer(true)}
                className="w-full p-4 text-sm text-muted-foreground hover:text-foreground border border-dashed rounded-lg hover:border-primary/50 transition-colors min-h-[48px] active:bg-muted"
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

