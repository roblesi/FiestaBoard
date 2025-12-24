"use client";

import { ServiceControls } from "@/components/service-controls";
import { TransitionSettingsComponent } from "@/components/transition-settings";
import { ConfigDisplay } from "@/components/config-display";
import { OutputTargetSelector } from "@/components/output-target-selector";

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

        <div className="grid gap-8 max-w-4xl">
          {/* Service Controls */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Service Control</h2>
            <ServiceControls />
          </section>

          {/* Output Settings */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Display Output</h2>
            <OutputTargetSelector />
          </section>

          {/* Transition Settings */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Transitions</h2>
            <TransitionSettingsComponent />
          </section>

          {/* Configuration Display */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Feature Configuration</h2>
            <ConfigDisplay />
          </section>
        </div>
      </div>
    </div>
  );
}

