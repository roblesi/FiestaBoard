"use client";

import { DisplayPreview } from "@/components/display-preview";
import { LogsViewer } from "@/components/logs-viewer";
import { RotationStatus } from "@/components/rotation-status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Monitor your Vestaboard display and system activity
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Main content - Display & Logs */}
          <div className="space-y-6">
            <DisplayPreview />
            <LogsViewer />
          </div>

          {/* Sidebar - Status */}
          <div className="space-y-6">
            <RotationStatus />
            
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium">Running</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
