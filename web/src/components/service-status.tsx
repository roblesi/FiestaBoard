"use client";

import { useStatus } from "@/hooks/use-vestaboard";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export function ServiceStatus() {
  const { data, isLoading, isError } = useStatus();

  if (isLoading) {
    return <Skeleton className="h-6 w-32" />;
  }

  if (isError || !data) {
    return (
      <Badge variant="destructive" className="gap-1.5">
        <span className="h-2 w-2 rounded-full bg-current animate-pulse" />
        Disconnected
      </Badge>
    );
  }

  return (
    <Badge
      variant={data.running ? "default" : "secondary"}
      className="gap-1.5"
    >
      <span
        className={`h-2 w-2 rounded-full ${
          data.running
            ? "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]"
            : "bg-muted-foreground"
        }`}
      />
      {data.running ? "Running" : "Stopped"}
    </Badge>
  );
}


