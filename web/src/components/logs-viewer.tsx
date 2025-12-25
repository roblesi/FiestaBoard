"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, RefreshCw, Terminal } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface LogEntry {
  timestamp: string;
  level: string;
  logger: string;
  message: string;
}

interface LogsResponse {
  logs: LogEntry[];
  total: number;
}

const LOG_LEVEL_COLORS: Record<string, string> = {
  DEBUG: "secondary",
  INFO: "default",
  WARNING: "outline",
  ERROR: "destructive",
  CRITICAL: "destructive",
};

export function LogsViewer() {
  const [autoRefresh, setAutoRefresh] = useState(false);

  const { data: logsData, isLoading, refetch } = useQuery<LogsResponse>({
    queryKey: ["logs"],
    queryFn: async () => {
      const res = await fetch(
        process.env.NEXT_PUBLIC_API_URL
          ? `${process.env.NEXT_PUBLIC_API_URL}/logs?limit=100`
          : typeof window !== "undefined" && window.location.hostname === "localhost"
          ? "http://localhost:8000/logs?limit=100"
          : "/api/logs?limit=100"
      );
      if (!res.ok) throw new Error("Failed to fetch logs");
      return res.json();
    },
    refetchInterval: autoRefresh ? 3000 : false,
  });

  const handleCopyLogs = () => {
    if (!logsData?.logs) return;
    
    const logsText = logsData.logs
      .map((log) => `[${log.timestamp}] ${log.level} - ${log.logger} - ${log.message}`)
      .join("\n");
    
    navigator.clipboard.writeText(logsText);
    toast.success("Logs copied to clipboard");
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            Application Logs
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            <span>Logs</span>
            {logsData && (
              <Badge variant="secondary" className="text-xs">
                {logsData.total}
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant={autoRefresh ? "default" : "outline"}
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="h-9 sm:h-7 text-xs gap-1 flex-1 sm:flex-none min-w-[80px]"
            >
              <RefreshCw className={`h-3 w-3 ${autoRefresh ? "animate-spin" : ""}`} />
              {autoRefresh ? "Auto" : "Manual"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => refetch()}
              className="h-9 sm:h-7 text-xs gap-1"
            >
              <RefreshCw className="h-3 w-3" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyLogs}
              className="h-9 sm:h-7 text-xs gap-1"
              disabled={!logsData?.logs?.length}
            >
              <Copy className="h-3 w-3" />
              <span className="hidden sm:inline">Copy</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        <ScrollArea className="h-64 sm:h-96 w-full rounded-md border bg-muted/30 p-2 sm:p-3">
          <div className="space-y-1 font-mono text-[10px] sm:text-xs">
            {logsData?.logs && logsData.logs.length > 0 ? (
              logsData.logs.map((log, idx) => (
                <div key={idx} className="flex flex-wrap sm:flex-nowrap gap-1 sm:gap-2 hover:bg-muted/50 px-1 py-1 sm:py-0.5 rounded">
                  <span className="text-muted-foreground shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <Badge
                    variant={LOG_LEVEL_COLORS[log.level] as "default" | "secondary" | "destructive" | "outline" || "secondary"}
                    className="h-4 text-[10px] shrink-0"
                  >
                    {log.level}
                  </Badge>
                  <span className="text-muted-foreground shrink-0 truncate max-w-[100px] sm:max-w-[150px] hidden sm:inline">
                    {log.logger}
                  </span>
                  <span className="break-all w-full sm:w-auto">{log.message}</span>
                </div>
              ))
            ) : (
              <div className="text-muted-foreground text-center py-8">
                No logs available
              </div>
            )}
          </div>
        </ScrollArea>
        <p className="text-[10px] text-muted-foreground mt-2">
          Showing last {logsData?.logs?.length || 0} of {logsData?.total || 0} log entries
        </p>
      </CardContent>
    </Card>
  );
}

