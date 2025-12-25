"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Copy, RefreshCw, Terminal, Search, Filter, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState, useRef, useCallback, useEffect } from "react";
import { api, LogLevel, LogEntry, LogsResponse } from "@/lib/api";

const LOG_LEVEL_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DEBUG: "secondary",
  INFO: "default",
  WARNING: "outline",
  ERROR: "destructive",
  CRITICAL: "destructive",
};

const LOG_LEVELS: (LogLevel | "ALL")[] = ["ALL", "DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"];

const PAGE_SIZE = 50;

export function LogsViewer() {
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [levelFilter, setLevelFilter] = useState<LogLevel | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const observerTarget = useRef<HTMLDivElement>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
    isRefetching,
  } = useInfiniteQuery<LogsResponse>({
    queryKey: ["logs", levelFilter, debouncedSearch],
    queryFn: async ({ pageParam }) => {
      const offset = (pageParam as number) ?? 0;
      return api.getLogs({
        limit: PAGE_SIZE,
        offset,
        level: levelFilter === "ALL" ? undefined : levelFilter,
        search: debouncedSearch || undefined,
      });
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (lastPage.has_more) {
        return lastPage.offset + lastPage.limit;
      }
      return undefined;
    },
    refetchInterval: autoRefresh ? 3000 : false,
  });

  // Intersection observer for infinite scroll
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  useEffect(() => {
    const element = observerTarget.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: "100px",
      threshold: 0,
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [handleObserver]);

  // Flatten all pages of logs
  const allLogs = data?.pages.flatMap((page) => page.logs) ?? [];
  const totalLogs = data?.pages[0]?.total ?? 0;

  const handleCopyLogs = () => {
    if (!allLogs.length) return;

    const logsText = allLogs
      .map((log) => `[${log.timestamp}] ${log.level} - ${log.logger} - ${log.message}`)
      .join("\n");

    navigator.clipboard.writeText(logsText);
    toast.success("Logs copied to clipboard");
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatFullTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
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
          <Skeleton className="h-[500px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="px-4 sm:px-6 pb-3">
        <div className="flex flex-col gap-3">
          {/* Title row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              <span>Logs</span>
              <Badge variant="secondary" className="text-xs">
                {totalLogs}
              </Badge>
            </CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                variant={autoRefresh ? "default" : "outline"}
                onClick={() => setAutoRefresh(!autoRefresh)}
                className="h-8 text-xs gap-1"
              >
                <RefreshCw className={`h-3 w-3 ${autoRefresh ? "animate-spin" : ""}`} />
                {autoRefresh ? "Auto" : "Manual"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => refetch()}
                disabled={isRefetching}
                className="h-8 text-xs gap-1"
              >
                {isRefetching ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyLogs}
                className="h-8 text-xs gap-1"
                disabled={!allLogs.length}
              >
                <Copy className="h-3 w-3" />
                <span className="hidden sm:inline">Copy</span>
              </Button>
            </div>
          </div>

          {/* Filters row */}
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Search input */}
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* Level filter */}
            <div className="relative">
              <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value as LogLevel | "ALL")}
                className="h-8 pl-8 pr-8 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring appearance-none cursor-pointer"
              >
                {LOG_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level === "ALL" ? "All Levels" : level}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 sm:px-6 pt-0">
        <div className="h-[500px] overflow-y-auto rounded-md border bg-muted/30">
          <div className="p-2 sm:p-3 space-y-0.5 font-mono text-[10px] sm:text-xs">
            {allLogs.length > 0 ? (
              <>
                {allLogs.map((log, idx) => (
                  <LogRow key={`${log.timestamp}-${idx}`} log={log} formatTimestamp={formatTimestamp} formatFullTimestamp={formatFullTimestamp} />
                ))}

                {/* Intersection observer target */}
                <div ref={observerTarget} className="h-4" />

                {/* Loading more indicator */}
                {isFetchingNextPage && (
                  <div className="flex items-center justify-center py-4 gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading more...</span>
                  </div>
                )}

                {/* End of logs indicator */}
                {!hasNextPage && allLogs.length > 0 && (
                  <div className="text-center py-4 text-muted-foreground text-xs">
                    End of logs
                  </div>
                )}
              </>
            ) : (
              <div className="text-muted-foreground text-center py-12">
                {debouncedSearch || levelFilter !== "ALL"
                  ? "No logs match your filters"
                  : "No logs available"}
              </div>
            )}
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground mt-2">
          Showing {allLogs.length} of {totalLogs} log entries
          {(debouncedSearch || levelFilter !== "ALL") && " (filtered)"}
        </p>
      </CardContent>
    </Card>
  );
}

// Separate component for log row to optimize rendering
function LogRow({
  log,
  formatTimestamp,
  formatFullTimestamp,
}: {
  log: LogEntry;
  formatTimestamp: (ts: string) => string;
  formatFullTimestamp: (ts: string) => string;
}) {
  return (
    <div
      className="flex flex-wrap sm:flex-nowrap gap-1 sm:gap-2 hover:bg-muted/50 px-1.5 py-1 sm:py-0.5 rounded group"
      title={formatFullTimestamp(log.timestamp)}
    >
      <span className="text-muted-foreground shrink-0 tabular-nums">
        {formatTimestamp(log.timestamp)}
      </span>
      <Badge
        variant={LOG_LEVEL_COLORS[log.level] || "secondary"}
        className="h-4 text-[10px] shrink-0 font-medium"
      >
        {log.level}
      </Badge>
      <span className="text-muted-foreground shrink-0 truncate max-w-[100px] sm:max-w-[180px] hidden sm:inline opacity-60">
        {log.logger}
      </span>
      <span className="break-all w-full sm:w-auto text-foreground/90">{log.message}</span>
    </div>
  );
}
