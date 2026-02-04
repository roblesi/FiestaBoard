"use client";

import { useStatus } from "@/hooks/use-board";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ServiceStatus() {
  const { data, isLoading, isError } = useStatus();

  if (isLoading) {
    return <Skeleton className="h-3 w-3 rounded-full" />;
  }

  const statusText = isError || !data 
    ? "Disconnected" 
    : data.running 
    ? "Running" 
    : "Stopped";

  const statusColor = isError || !data
    ? "bg-fiesta-red shadow-[0_0_6px_rgba(235,64,52,0.5)] animate-pulse"
    : data.running
    ? "bg-fiesta-green shadow-[0_0_6px_rgba(126,211,33,0.5)]"
    : "bg-gray-400";

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className={`h-3 w-3 rounded-full ${statusColor} transition-all cursor-default`}
            aria-label={statusText}
          />
        </TooltipTrigger>
        <TooltipContent>
          <p>{statusText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}


