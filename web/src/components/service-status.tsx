"use client";

import { useStatus } from "@/hooks/use-vestaboard";
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
    ? "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)] animate-pulse"
    : data.running
    ? "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]"
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


