"use client";

import { ServiceControls } from "@/components/service-controls";
import { TransitionSettingsComponent } from "@/components/transition-settings";
import { OutputTargetSelector } from "@/components/output-target-selector";
import { FeatureSettings } from "@/components/feature-settings";
import { VestaboardSettings } from "@/components/feature-settings/vestaboard-settings";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure your Vestaboard service and integrations
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
          {/* Main Settings */}
          <div className="space-y-8">
            {/* Vestaboard Connection */}
            <section>
              <h2 className="text-xl font-semibold mb-4">Vestaboard Connection</h2>
              <VestaboardSettings />
            </section>

            {/* Feature Configuration */}
            <section>
              <h2 className="text-xl font-semibold mb-4">Features</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Enable and configure data sources for your Vestaboard display. 
                Click a feature to expand its settings.
              </p>
              <FeatureSettings />
            </section>
          </div>

          {/* Sidebar - Service & Display Settings */}
          <div className="space-y-6">
            <section>
              <h2 className="text-lg font-semibold mb-3">Service Control</h2>
              <ServiceControls />
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">Display Output</h2>
              <OutputTargetSelector />
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">Transitions</h2>
              <TransitionSettingsComponent />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
