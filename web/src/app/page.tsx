"use client";

import { ActivePageDisplay } from "@/components/active-page-display";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Monitor your Vestaboard display and system activity
          </p>
        </div>

        <ActivePageDisplay />
      </div>
    </div>
  );
}
