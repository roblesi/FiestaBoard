"use client";

import { PageSelector } from "@/components/page-selector";

export default function PagesPage() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 max-w-full">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Pages
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Create and manage content for your Vestaboard
          </p>
        </div>

        {/* Page List */}
        <PageSelector />
      </div>
    </div>
  );
}

