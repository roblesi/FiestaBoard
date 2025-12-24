"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Monitor, Smartphone, Zap } from "lucide-react";

const OUTPUT_OPTIONS = [
  {
    value: "ui" as const,
    label: "UI Only",
    description: "Preview in web interface only",
    icon: Monitor,
  },
  {
    value: "board" as const,
    label: "Board Only",
    description: "Send directly to Vestaboard",
    icon: Zap,
  },
  {
    value: "both" as const,
    label: "UI + Board",
    description: "Show in UI and send to board",
    icon: Smartphone,
  },
];

export function OutputTargetSelector() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["output-settings"],
    queryFn: api.getOutputSettings,
  });

  const updateMutation = useMutation({
    mutationFn: (target: "ui" | "board" | "both") =>
      api.updateOutputSettings(target),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["output-settings"] });
      queryClient.invalidateQueries({ queryKey: ["status"] });
      toast.success("Output target updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Output Target</CardTitle>
          <CardDescription>
            Choose where content should be displayed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const currentTarget = settings?.target || "ui";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Output Target</CardTitle>
        <CardDescription>
          Choose where content should be displayed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {OUTPUT_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isActive = currentTarget === option.value;
          const isEffective = settings?.effective_target === option.value;

          return (
            <button
              key={option.value}
              onClick={() => updateMutation.mutate(option.value)}
              disabled={updateMutation.isPending}
              className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                isActive
                  ? "border-primary bg-primary/5"
                  : "border-muted hover:border-primary/50"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-md ${
                    isActive ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{option.label}</span>
                    {isActive && (
                      <Badge variant="default" className="text-xs">
                        Active
                      </Badge>
                    )}
                    {isEffective && !isActive && (
                      <Badge variant="secondary" className="text-xs">
                        Effective
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {option.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}

        {settings?.dev_mode && (
          <div className="pt-2 text-xs text-muted-foreground">
            <p>
              <strong>Note:</strong> Dev mode is enabled, so output target may be
              overridden. Effective target: <strong>{settings.effective_target}</strong>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

