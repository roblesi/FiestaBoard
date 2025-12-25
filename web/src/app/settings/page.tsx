"use client";

import { ServiceControls } from "@/components/service-controls";
import { TransitionSettingsComponent } from "@/components/transition-settings";
import { FeatureSettings } from "@/components/feature-settings";
import { VestaboardSettings } from "@/components/feature-settings/vestaboard-settings";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Configure your Vestaboard service and integrations
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 sm:gap-8">
          {/* Main Settings */}
          <div className="space-y-6 sm:space-y-8">
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

          {/* Sidebar - Service & Display Settings */}
          <div className="space-y-4 sm:space-y-6">
            <section>
              <h2 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">Service Control</h2>
              <ServiceControls />
            </section>

            <section>
              <h2 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">Transitions</h2>
              <TransitionSettingsComponent />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
