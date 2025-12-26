"use client";

import { FeatureSettings } from "@/components/feature-settings";
import { VestaboardSettings } from "@/components/feature-settings/vestaboard-settings";
import { GeneralSettings } from "@/components/general-settings";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 max-w-full">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Configure your Vestaboard service and integrations
          </p>
        </div>

        <div className="space-y-6 sm:space-y-8 max-w-4xl">
          {/* General Settings & Service Control */}
          <section>
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">General Settings</h2>
            <GeneralSettings />
          </section>

          {/* Vestaboard Connection */}
          <section>
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Vestaboard Connection</h2>
            <VestaboardSettings />
          </section>

          {/* Feature Configuration */}
          <section>
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Features</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Enable and configure data sources for your Vestaboard display. 
              Click a feature to expand its settings.
            </p>
            <FeatureSettings />
          </section>
        </div>
      </div>
    </div>
  );
}
